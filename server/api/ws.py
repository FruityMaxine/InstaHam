"""下载 WebSocket。

设计要点：
- ws 断开后**下载继续后台跑** —— 用户可以关浏览器，过会儿重开看结果
- 每条 event 同时写入 system.RECENT_EVENTS，前端重连时拉历史回放
- 仅熔断 (circuit breaker) 时才主动 abort
- 并发模式由 cfg.parallel_enabled / parallel_workers 控制（1-4）
"""

from __future__ import annotations

import asyncio
import threading
from datetime import datetime
from pathlib import Path
from queue import Empty, Queue

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.core.gallery_dl import (
    GalleryDLRunner,
    build_user_url,
    is_circuit_breaker_trigger,
)

from .storage import (
    ARCHIVE_FILE,
    BIN_PATH,
    COOKIES_FILE,
    load_config,
    load_users,
    save_users,
)
from .system import push_recent, clear_recent

router = APIRouter()


def _resolve_targets(req: dict) -> tuple[list[str], list[str]]:
    mode = req.get("mode", "all")
    data = load_users()
    all_users = data.get("users", [])

    if mode == "adhoc":
        urls = req.get("urls") or []
        return [], [u for u in urls if u.strip()]

    if mode == "selected":
        ids = set(req.get("users") or [])
        return [u["username"] for u in all_users if u["id"] in ids], []

    if mode == "group":
        g = req.get("group")
        return [u["username"] for u in all_users if u["group"] == g], []

    return [u["username"] for u in all_users], []


def _stamp_user_done(username: str) -> None:
    data = load_users()
    now = datetime.utcnow().isoformat(timespec="seconds")
    for u in data["users"]:
        if u["username"].lower() == username.lower():
            u["last_download"] = now
    save_users(data)


def _drain_runner(
    runner: GalleryDLRunner,
    target: str,
    is_url: bool,
    cfg: dict,
    q: Queue,
) -> None:
    try:
        url = target if is_url else build_user_url(target)
        label = target if not is_url else url
        for ev in runner.iter_run(
            urls=[url],
            archive_path=ARCHIVE_FILE,
            download_dir=Path(cfg.get("download_dir", "downloads")).resolve(),
            include=cfg.get("include", ["posts"]),
            videos_mode=cfg.get("videos_mode", "true"),
            user_label=label,
            cookies_source=cfg.get("cookies_source", "manual"),
            cookies_path=COOKIES_FILE,
            cookies_browser=cfg.get("cookies_browser", "edge"),
            sleep_seconds=float(cfg.get("parallel_sleep_seconds", 0.0))
            if cfg.get("parallel_enabled")
            else 0.0,
            jitter=bool(cfg.get("parallel_jitter", True)),
        ):
            q.put(ev.to_dict())
        if not is_url:
            _stamp_user_done(target)
    except Exception as e:
        q.put({"type": "error", "text": f"runner crash: {e}", "user": target})


@router.websocket("/ws/download")
async def download_ws(ws: WebSocket) -> None:
    await ws.accept()
    try:
        req = await ws.receive_json()
    except Exception:
        await ws.close(code=1003)
        return

    cfg = load_config()
    runner = GalleryDLRunner(BIN_PATH, ffmpeg_location=cfg.get("ffmpeg_location"))
    usernames, raw_urls = _resolve_targets(req)
    targets: list[tuple[str, bool]] = [(u, False) for u in usernames] + [(u, True) for u in raw_urls]

    if not targets:
        await ws.send_json({"type": "error", "text": "no targets"})
        await ws.send_json({"type": "all_done", "text": "ok"})
        return

    # 新一次下载开始 → 清空历史 events 缓存
    clear_recent()

    meta_ev = {"type": "meta", "total": len(targets), "targets": [t[0] for t in targets]}
    push_recent(meta_ev)
    await ws.send_json(meta_ev)

    parallel = bool(cfg.get("parallel_enabled"))
    workers = max(1, min(4, int(cfg.get("parallel_workers", 1)))) if parallel else 1
    breaker_on = bool(cfg.get("parallel_circuit_breaker", True))

    abort_event = asyncio.Event()
    ws_state = {"alive": True}  # 闭包内可变标记，ws 断开后所有 _run_one 共享

    async def safe_send(ev: dict) -> None:
        """统一 push 历史 + 尽力推 ws；ws 断开不影响历史记录。"""
        push_recent(ev)
        if not ws_state["alive"]:
            return
        try:
            await ws.send_json(ev)
        except (WebSocketDisconnect, RuntimeError):
            ws_state["alive"] = False

    if workers <= 1:
        for idx, (target, is_url) in enumerate(targets, 1):
            if abort_event.is_set():
                break
            await _run_one(
                ws, runner, cfg, target, is_url, idx, len(targets),
                abort_event, breaker_on, safe_send,
            )
    else:
        sem = asyncio.Semaphore(workers)

        async def _wrapped(idx: int, target: str, is_url: bool) -> None:
            async with sem:
                if abort_event.is_set():
                    return
                await _run_one(
                    ws, runner, cfg, target, is_url, idx, len(targets),
                    abort_event, breaker_on, safe_send,
                )

        await asyncio.gather(
            *[_wrapped(i, t, u) for i, (t, u) in enumerate(targets, 1)],
            return_exceptions=True,
        )

    final_ev = {"type": "all_done", "text": "aborted" if abort_event.is_set() else "ok"}
    await safe_send(final_ev)


async def _run_one(
    ws: WebSocket,
    runner: GalleryDLRunner,
    cfg: dict,
    target: str,
    is_url: bool,
    idx: int,
    total: int,
    abort_event: asyncio.Event,
    breaker_on: bool,
    safe_send,
) -> None:
    await safe_send({"type": "user_start", "index": idx, "total": total, "user": target})

    q: Queue = Queue()
    worker = threading.Thread(
        target=_drain_runner, args=(runner, target, is_url, cfg, q), daemon=True
    )
    worker.start()

    while True:
        try:
            ev = q.get_nowait()
        except Empty:
            if not worker.is_alive() and q.empty():
                return
            await asyncio.sleep(0.05)
            if abort_event.is_set():
                return
            continue

        # 熔断检测
        if breaker_on and ev.get("type") == "error" and is_circuit_breaker_trigger(ev.get("text", "")):
            abort_event.set()
            await safe_send(ev)
            killed = runner.terminate_all()
            await safe_send({
                "type": "circuit_breaker",
                "text": f"circuit breaker triggered: {ev.get('text', '')[:120]}",
                "killed": killed,
            })
            return

        await safe_send(ev)
