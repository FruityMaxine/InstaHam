"""下载 WebSocket。

设计要点：
- ws 断开后**下载继续后台跑** —— 用户可以关浏览器，过会儿重开看结果
- 每条 event 同时写入 system.RECENT_EVENTS，前端重连时拉历史回放
- 支持 subscribe 模式：前端刷新后可重新接入正在运行的下载
- 同一时刻只允许一个下载任务，防止重复启动
- 仅熔断 (circuit breaker) 时才主动 abort
- 并发模式由 cfg.parallel_enabled / parallel_workers 控制（1-4）
"""

from __future__ import annotations

import asyncio
import re
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

# ---------------------------------------------------------------------------
# 全局下载状态：单用户桌面应用，同一时刻只有一个下载任务
# ---------------------------------------------------------------------------

_run_state: dict = {
    "running": False,
    "targets": [],
    "total": 0,
    "current_index": 0,
    "current_user": None,
    "subscribers": [],    # list of (WebSocket, ws_state_dict)
    "abort_event": None,
}


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


# ---- skip 原因分类 ----

_ID_RE = re.compile(r"^\d{15,20}$")
_archive_cache: set[str] = set()
_archive_cache_lock = threading.Lock()


def _refresh_archive_cache() -> None:
    from server.core.archive_sync import get_archive_entries
    global _archive_cache
    with _archive_cache_lock:
        _archive_cache = get_archive_entries(ARCHIVE_FILE)


def _classify_skip(file_path: str | None) -> str:
    if not file_path:
        return "unknown"
    name = Path(file_path).name
    with _archive_cache_lock:
        cache = _archive_cache
    for part in re.split(r"[._]", name):
        if _ID_RE.match(part) and f"instagram{part}" in cache:
            return "archive"
    return "disk"


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
            group_by_type=bool(cfg.get("group_by_type", True)),
        ):
            ev_dict = ev.to_dict()
            if ev_dict.get("type") == "skip":
                ev_dict["reason"] = _classify_skip(ev_dict.get("file_path"))
            q.put(ev_dict)
        if not is_url:
            _stamp_user_done(target)
    except Exception as e:
        q.put({"type": "error", "text": f"runner crash: {e}", "user": target})


# ---------------------------------------------------------------------------
# 广播：推事件给所有订阅者 + 写入历史缓存
# ---------------------------------------------------------------------------

async def _broadcast(ev: dict) -> None:
    push_recent(ev)
    if ev.get("type") == "user_start":
        _run_state["current_index"] = ev.get("index", 0)
        _run_state["current_user"] = ev.get("user")
    dead: list[int] = []
    for i, (sub_ws, sub_state) in enumerate(_run_state["subscribers"]):
        if not sub_state["alive"]:
            dead.append(i)
            continue
        try:
            await sub_ws.send_json(ev)
        except (WebSocketDisconnect, RuntimeError):
            sub_state["alive"] = False
            dead.append(i)
    for i in reversed(dead):
        _run_state["subscribers"].pop(i)


# ---------------------------------------------------------------------------
# 订阅者 receive loop：监听 stop 指令或断开
# ---------------------------------------------------------------------------

async def _subscriber_loop(ws: WebSocket, ws_state: dict) -> None:
    try:
        while _run_state["running"] and ws_state["alive"]:
            try:
                data = await asyncio.wait_for(ws.receive_json(), timeout=1.0)
                if data.get("action") == "stop" and _run_state["abort_event"]:
                    _run_state["abort_event"].set()
            except asyncio.TimeoutError:
                continue
    except (WebSocketDisconnect, RuntimeError):
        ws_state["alive"] = False


# ---------------------------------------------------------------------------
# 下载主逻辑（独立协程，不绑定任何单个 WS 连接）
# ---------------------------------------------------------------------------

async def _run_download(
    runner: GalleryDLRunner,
    cfg: dict,
    targets: list[tuple[str, bool]],
    abort_event: asyncio.Event,
) -> None:
    try:
        if cfg.get("archive_auto_sync", True):
            try:
                from server.core import archive_sync
                dl_dir = Path(cfg.get("download_dir", "downloads"))
                if not dl_dir.is_absolute():
                    from .storage import ROOT as _ROOT
                    dl_dir = _ROOT / dl_dir
                removed = archive_sync.sync_archive_to_disk(ARCHIVE_FILE, dl_dir.resolve())
                if removed > 0:
                    await _broadcast({"type": "log", "text": f"[archive] auto-sync: removed {removed} orphan entries (will be re-downloaded)"})
            except Exception as e:
                await _broadcast({"type": "warning", "text": f"[archive] auto-sync failed: {e}"})

        _refresh_archive_cache()

        meta_ev = {"type": "meta", "total": len(targets), "targets": [t[0] for t in targets]}
        await _broadcast(meta_ev)

        parallel = bool(cfg.get("parallel_enabled"))
        workers = max(1, min(4, int(cfg.get("parallel_workers", 1)))) if parallel else 1
        breaker_on = bool(cfg.get("parallel_circuit_breaker", True))

        if workers <= 1:
            for idx, (target, is_url) in enumerate(targets, 1):
                if abort_event.is_set():
                    break
                await _run_one(runner, cfg, target, is_url, idx, len(targets), abort_event, breaker_on)
        else:
            sem = asyncio.Semaphore(workers)

            async def _wrapped(idx: int, target: str, is_url: bool) -> None:
                async with sem:
                    if abort_event.is_set():
                        return
                    await _run_one(runner, cfg, target, is_url, idx, len(targets), abort_event, breaker_on)

            await asyncio.gather(
                *[_wrapped(i, t, u) for i, (t, u) in enumerate(targets, 1)],
                return_exceptions=True,
            )

        await _broadcast({"type": "all_done", "text": "aborted" if abort_event.is_set() else "ok"})
    finally:
        _run_state.update({
            "running": False,
            "targets": [],
            "total": 0,
            "current_index": 0,
            "current_user": None,
            "subscribers": [],
            "abort_event": None,
        })


# ---------------------------------------------------------------------------
# WebSocket 端点
# ---------------------------------------------------------------------------

@router.websocket("/ws/download")
async def download_ws(ws: WebSocket) -> None:
    await ws.accept()
    try:
        req = await ws.receive_json()
    except Exception:
        await ws.close(code=1003)
        return

    ws_state = {"alive": True}

    # ---- subscribe 模式：挂载到正在运行的下载 ----
    if req.get("mode") == "subscribe":
        if not _run_state["running"]:
            await ws.send_json({"type": "all_done", "text": "not_running"})
            return
        _run_state["subscribers"].append((ws, ws_state))
        await _subscriber_loop(ws, ws_state)
        return

    # ---- download 模式：启动新下载 ----
    if _run_state["running"]:
        await ws.send_json({"type": "error", "text": "download already running"})
        await ws.close(code=1008)
        return

    usernames, raw_urls = _resolve_targets(req)
    targets: list[tuple[str, bool]] = [(u, False) for u in usernames] + [(u, True) for u in raw_urls]

    if not targets:
        await ws.send_json({"type": "error", "text": "no targets"})
        await ws.send_json({"type": "all_done", "text": "ok"})
        return

    clear_recent()

    cfg = load_config()
    runner = GalleryDLRunner(BIN_PATH, ffmpeg_location=cfg.get("ffmpeg_location"))
    abort_event = asyncio.Event()

    _run_state.update({
        "running": True,
        "targets": [t[0] for t in targets],
        "total": len(targets),
        "current_index": 0,
        "current_user": None,
        "subscribers": [(ws, ws_state)],
        "abort_event": abort_event,
    })

    asyncio.create_task(_run_download(runner, cfg, targets, abort_event))
    await _subscriber_loop(ws, ws_state)


async def _run_one(
    runner: GalleryDLRunner,
    cfg: dict,
    target: str,
    is_url: bool,
    idx: int,
    total: int,
    abort_event: asyncio.Event,
    breaker_on: bool,
) -> None:
    await _broadcast({"type": "user_start", "index": idx, "total": total, "user": target})

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

        if breaker_on and ev.get("type") == "error" and is_circuit_breaker_trigger(ev.get("text", "")):
            abort_event.set()
            await _broadcast(ev)
            killed = runner.terminate_all()
            await _broadcast({
                "type": "circuit_breaker",
                "text": f"circuit breaker triggered: {ev.get('text', '')[:120]}",
                "killed": killed,
            })
            return

        await _broadcast(ev)
