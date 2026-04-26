"""下载 WebSocket。

协议：
  client -> {users: [...], mode: "all"|"group"|"selected"|"adhoc", group?, urls?}
  server -> {type: "started"|"log"|"file"|"skip"|"error"|"warning"|"done"|"meta", ...}

server 端线程跑 GalleryDLRunner，事件 put 到 asyncio.Queue 后由协程推给 ws，
主协程不会被阻塞。
"""

from __future__ import annotations

import asyncio
import json
import threading
from datetime import datetime
from pathlib import Path
from queue import Empty, Queue

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.core.gallery_dl import GalleryDLRunner, build_user_url

from .storage import (
    ARCHIVE_FILE,
    BIN_PATH,
    COOKIES_FILE,
    load_config,
    load_users,
    save_users,
)

router = APIRouter()


def _resolve_targets(req: dict) -> tuple[list[str], list[str]]:
    """根据请求决定要抓的 (用户名列表, 直接 URL 列表)。返回 (usernames, raw_urls)。"""
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

    # all
    return [u["username"] for u in all_users], []


def _stamp_user_done(username: str) -> None:
    data = load_users()
    now = datetime.utcnow().isoformat(timespec="seconds")
    for u in data["users"]:
        if u["username"].lower() == username.lower():
            u["last_download"] = now
    save_users(data)


def _drain_runner(runner: GalleryDLRunner, target: str, is_url: bool, cfg: dict, q: Queue) -> None:
    """后台线程：跑一个目标，把 Event 塞 queue。"""
    try:
        url = target if is_url else build_user_url(target)
        label = target if not is_url else url
        for ev in runner.iter_run(
            urls=[url],
            cookies_path=COOKIES_FILE,
            archive_path=ARCHIVE_FILE,
            download_dir=Path(cfg.get("download_dir", "downloads")).resolve(),
            include=cfg.get("include", ["posts"]),
            videos_mode=cfg.get("videos_mode", "true"),
            user_label=label,
        ):
            q.put(ev.to_dict())
        if not is_url:
            _stamp_user_done(target)
    except Exception as e:  # 防止线程异常吞掉
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
        await ws.send_json({"type": "error", "text": "没有目标可下载"})
        await ws.send_json({"type": "all_done", "text": "ok"})
        return

    await ws.send_json({"type": "meta", "total": len(targets), "targets": [t[0] for t in targets]})

    for idx, (target, is_url) in enumerate(targets, 1):
        await ws.send_json({"type": "user_start", "index": idx, "total": len(targets), "user": target})
        q: Queue = Queue()
        worker = threading.Thread(
            target=_drain_runner, args=(runner, target, is_url, cfg, q), daemon=True
        )
        worker.start()
        await _pipe_queue_to_ws(q, worker, ws)
    await ws.send_json({"type": "all_done", "text": "ok"})


async def _pipe_queue_to_ws(q: Queue, worker: threading.Thread, ws: WebSocket) -> None:
    """边运行边推送；worker 结束且 queue 清空才返回。"""
    while True:
        try:
            ev = q.get_nowait()
            try:
                await ws.send_json(ev)
            except WebSocketDisconnect:
                return
        except Empty:
            if not worker.is_alive() and q.empty():
                return
            await asyncio.sleep(0.05)
