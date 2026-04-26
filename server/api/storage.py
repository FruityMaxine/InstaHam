"""集中负责 data/*.json 的读写。

把 JSON IO 收拢到一处，路由层只用纯 dict，方便后续替换为 sqlite/其他。
所有路径都基于项目根目录解析（main.py 计算 ROOT）。
"""

from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "server" / "data"
USERS_FILE = DATA_DIR / "users.json"
CONFIG_FILE = DATA_DIR / "config.json"
ARCHIVE_FILE = DATA_DIR / "archive.sqlite"
COOKIES_FILE = DATA_DIR / "cookies.txt"
BIN_PATH = ROOT / "bin" / "gallery-dl.exe"

_lock = Lock()


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    with _lock:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_users() -> dict:
    data = read_json(USERS_FILE)
    data.setdefault("groups", ["默认"])
    data.setdefault("users", [])
    return data


def save_users(data: dict) -> None:
    write_json(USERS_FILE, data)


_CONFIG_DEFAULTS = {
    "cookies_path": "server/data/cookies.txt",
    "download_dir": "downloads",
    "concurrency": 2,
    "include": ["posts", "stories", "highlights", "reels"],
    "videos_mode": "true",
    "ffmpeg_location": "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "group_by_type": True,
    "cookies_source": "manual",
    "cookies_browser": "edge",
    "parallel_enabled": False,
    "parallel_workers": 2,
    "parallel_sleep_seconds": 2.0,
    "parallel_jitter": True,
    "parallel_circuit_breaker": True,
}


def load_config() -> dict:
    """读 config.json 并把缺失字段补上默认值（旧配置兼容）。"""
    cfg = read_json(CONFIG_FILE)
    for k, v in _CONFIG_DEFAULTS.items():
        cfg.setdefault(k, v)
    return cfg


def save_config(data: dict) -> None:
    write_json(CONFIG_FILE, data)


def write_cookies(text: str) -> None:
    with _lock:
        COOKIES_FILE.write_text(text, encoding="utf-8")


def read_cookies() -> str:
    if not COOKIES_FILE.exists():
        return ""
    return COOKIES_FILE.read_text(encoding="utf-8")
