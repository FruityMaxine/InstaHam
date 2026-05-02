"""系统级端点：进程关闭、浏览器探测、最近事件回放。"""

from __future__ import annotations

import os
import subprocess
import threading
from collections import deque
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()


# ---------------------------------------------------------------------------
# 全局事件缓存：ws 每推一条 event 也写到这里；前端重连后能拉历史
# ---------------------------------------------------------------------------

RECENT_EVENTS: deque[dict] = deque(maxlen=5000)


def push_recent(ev: dict) -> None:
    RECENT_EVENTS.append(ev)


def clear_recent() -> None:
    RECENT_EVENTS.clear()


@router.get("/recent-events")
def recent_events() -> dict:
    """前端 mount 时拉一次填充 logs，用于关浏览器后重新打开恢复进度。"""
    return {"events": list(RECENT_EVENTS)}


@router.get("/download-status")
def download_status() -> dict:
    """前端 mount 时查询是否有下载正在进行，用于断线重连。"""
    from server.api.ws import _run_state
    return {
        "running": _run_state["running"],
        "targets": _run_state["targets"],
        "total": _run_state["total"],
        "current_index": _run_state["current_index"],
        "current_user": _run_state["current_user"],
    }


@router.post("/recent-events/clear")
def clear_events() -> dict:
    """清空内存事件缓存。仅供测试/截图脚本使用。"""
    RECENT_EVENTS.clear()
    return {"ok": True}


# ---------------------------------------------------------------------------
# 浏览器探测：进程是否在跑 + cookies 文件是否存在
# ---------------------------------------------------------------------------

# Windows 上各浏览器的进程名 + cookies 文件位置
LOCALAPPDATA = os.environ.get("LOCALAPPDATA", "")
APPDATA = os.environ.get("APPDATA", "")

BROWSER_INFO: dict[str, dict] = {
    "edge": {
        "process": "msedge",
        "cookies_paths": [
            Path(LOCALAPPDATA) / "Microsoft/Edge/User Data/Default/Network/Cookies",
        ],
    },
    "chrome": {
        "process": "chrome",
        "cookies_paths": [
            Path(LOCALAPPDATA) / "Google/Chrome/User Data/Default/Network/Cookies",
        ],
    },
    "firefox": {
        "process": "firefox",
        # Firefox 的 profile 名带随机后缀，用 glob 找
        "cookies_glob": (Path(APPDATA) / "Mozilla/Firefox/Profiles", "*/cookies.sqlite"),
    },
    "brave": {
        "process": "brave",
        "cookies_paths": [
            Path(LOCALAPPDATA) / "BraveSoftware/Brave-Browser/User Data/Default/Network/Cookies",
        ],
    },
    "vivaldi": {
        "process": "vivaldi",
        "cookies_paths": [
            Path(LOCALAPPDATA) / "Vivaldi/User Data/Default/Network/Cookies",
        ],
    },
    "opera": {
        "process": "opera",
        "cookies_paths": [
            Path(APPDATA) / "Opera Software/Opera Stable/Network/Cookies",
        ],
    },
    "chromium": {
        "process": "chromium",
        "cookies_paths": [
            Path(LOCALAPPDATA) / "Chromium/User Data/Default/Network/Cookies",
        ],
    },
}


def _is_running(process_name: str) -> bool:
    """用 PowerShell Get-Process 检测；进程名不含 .exe。"""
    try:
        proc = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"@(Get-Process -Name {process_name} -ErrorAction SilentlyContinue).Count",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return int((proc.stdout or "0").strip() or "0") > 0
    except Exception:
        return False


def _cookies_exist(info: dict) -> bool:
    if "cookies_paths" in info:
        return any(p.exists() for p in info["cookies_paths"])
    if "cookies_glob" in info:
        base, pattern = info["cookies_glob"]
        if not base.exists():
            return False
        return any(base.glob(pattern))
    return False


@router.get("/browser-status")
def browser_status(name: str) -> dict:
    info = BROWSER_INFO.get(name.lower())
    if not info:
        return {"ok": False, "unknown": True, "running": False, "cookies_exists": False}
    return {
        "ok": True,
        "running": _is_running(info["process"]),
        "cookies_exists": _cookies_exist(info),
    }


# ---------------------------------------------------------------------------
# 关闭整个后端
# ---------------------------------------------------------------------------


@router.post("/shutdown")
def shutdown() -> dict:
    threading.Timer(0.3, lambda: os._exit(0)).start()
    return {"ok": True, "message": "服务即将关闭"}
