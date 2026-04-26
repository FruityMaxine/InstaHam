"""InstaHam FastAPI 入口。

职责仅做装配：注册路由、挂载静态资源、CORS、首启时初始化 data 文件。
业务实现在 server/api 与 server/core。
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.api import config as api_config
from server.api import users as api_users
from server.api import archive as api_archive
from server.api import ws as api_ws
from server.api import system as api_system

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "server" / "data"
WEB_DIR = ROOT / "web" / "dist"

# data 目录与必要文件首启检查（防御缺失）
DATA_DIR.mkdir(parents=True, exist_ok=True)
if not (DATA_DIR / "users.json").exists():
    (DATA_DIR / "users.json").write_text(
        json.dumps({"groups": ["默认"], "users": []}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
if not (DATA_DIR / "config.json").exists():
    (DATA_DIR / "config.json").write_text(
        json.dumps(
            {
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
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
if not (DATA_DIR / "cookies.txt").exists():
    (DATA_DIR / "cookies.txt").write_text(
        "# Netscape HTTP Cookie File\n", encoding="utf-8"
    )

app = FastAPI(title="InstaHam", version="1.0.0")

# 同源部署不需要 CORS，但前端 dev (vite 5173) 调试时需要
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(api_config.router, prefix="/api/config", tags=["config"])
app.include_router(api_users.router, prefix="/api/users", tags=["users"])
app.include_router(api_archive.router, prefix="/api/archive", tags=["archive"])
app.include_router(api_system.router, prefix="/api/system", tags=["system"])
app.include_router(api_ws.router)  # /ws/download

# 前端构建产物（Phase 4 之后才有内容；先用 check_dir=False 容错）
if (WEB_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
