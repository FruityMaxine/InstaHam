"""配置 API + cookie 测试。

GET  /api/config              -> 当前配置 + cookies 文本
PUT  /api/config              -> 更新配置（部分字段）
PUT  /api/config/cookies      -> 单独更新 cookies 文本
POST /api/config/test-cookies -> 用一个公开账号跑一次 simulate 验证 cookies
GET  /api/config/version      -> gallery-dl 版本
"""

from __future__ import annotations

import subprocess
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .storage import (
    BIN_PATH,
    COOKIES_FILE,
    load_config,
    read_cookies,
    save_config,
    write_cookies,
)

router = APIRouter()


class ConfigPatch(BaseModel):
    cookies_path: Optional[str] = None
    download_dir: Optional[str] = None
    concurrency: Optional[int] = None
    include: Optional[list[str]] = None
    videos_mode: Optional[str] = None
    ffmpeg_location: Optional[str] = None
    cookies_source: Optional[str] = None  # "manual" | "browser"
    cookies_browser: Optional[str] = None  # edge | chrome | firefox | brave | vivaldi | opera
    parallel_enabled: Optional[bool] = None
    parallel_workers: Optional[int] = None
    parallel_sleep_seconds: Optional[float] = None
    parallel_jitter: Optional[bool] = None
    parallel_circuit_breaker: Optional[bool] = None


class CookiesIn(BaseModel):
    text: str


@router.get("")
def get_config() -> dict:
    cfg = load_config()
    return {**cfg, "cookies": read_cookies()}


@router.put("")
def patch_config(payload: ConfigPatch) -> dict:
    cfg = load_config()
    for k, v in payload.model_dump(exclude_unset=True).items():
        cfg[k] = v
    save_config(cfg)
    return cfg


@router.put("/cookies")
def update_cookies(payload: CookiesIn) -> dict:
    write_cookies(payload.text)
    return {"ok": True, "bytes": len(payload.text)}


@router.get("/version")
def gallery_dl_version() -> dict:
    if not BIN_PATH.exists():
        raise HTTPException(500, "gallery-dl.exe not found")
    proc = subprocess.run(
        [str(BIN_PATH), "--version"], capture_output=True, text=True, timeout=10
    )
    return {"version": proc.stdout.strip(), "code": proc.returncode}


@router.post("/test-cookies")
def test_cookies(target: str = "instagram") -> dict:
    """用 --simulate 拉一个公开账号头像，验证 cookies 是否被识别。
    根据 cfg.cookies_source 决定走 --cookies 文件还是 --cookies-from-browser。
    """
    if not BIN_PATH.exists():
        raise HTTPException(500, "gallery-dl.exe not found")

    cfg = load_config()
    source = cfg.get("cookies_source", "manual")

    args = [str(BIN_PATH)]
    if source == "browser":
        browser = cfg.get("cookies_browser", "edge")
        args += ["--cookies-from-browser", browser]
    else:
        if not COOKIES_FILE.exists():
            raise HTTPException(400, "cookies.txt 不存在，请先在抽屉粘贴并保存")
        args += ["--cookies", str(COOKIES_FILE)]

    args += [
        "--simulate",
        "--range", "1-1",
        "-o", "extractor.instagram.include=avatar",
        f"https://www.instagram.com/{target}/",
    ]
    proc = subprocess.run(
        args, capture_output=True, text=True, timeout=30, encoding="utf-8", errors="replace"
    )
    ok = proc.returncode == 0
    return {
        "ok": ok,
        "code": proc.returncode,
        "stdout": (proc.stdout or "")[-2000:],
        "stderr": (proc.stderr or "")[-2000:],
    }
