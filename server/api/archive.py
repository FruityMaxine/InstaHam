"""archive.sqlite 端点：统计 + 对齐 + 增删管理。"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from server.core.archive import stats as archive_stats
from server.core import archive_sync
from .storage import ARCHIVE_FILE, ROOT, load_config

router = APIRouter()


def _downloads_dir() -> Path:
    cfg = load_config()
    p = Path(cfg.get("download_dir", "downloads"))
    if not p.is_absolute():
        p = ROOT / p
    return p.resolve()


@router.get("/stats")
def stats() -> dict:
    return archive_stats(ARCHIVE_FILE)


@router.get("/summary")
def summary() -> dict:
    """archive 概览：总数、按 user 分组（基于磁盘 instagram/<user>/ 结构）、孤儿数。"""
    return archive_sync.archive_summary(ARCHIVE_FILE, _downloads_dir())


@router.post("/sync")
def sync() -> dict:
    """删 archive 里磁盘已没的孤儿 entries。返回 {removed: N}。"""
    n = archive_sync.sync_archive_to_disk(ARCHIVE_FILE, _downloads_dir())
    return {"removed": n}


@router.delete("/by-user/{username}")
def delete_by_user(username: str) -> dict:
    """删除某用户在 archive 里所有 entries。下次跑下载会重新拉这些。"""
    n = archive_sync.remove_by_user(ARCHIVE_FILE, _downloads_dir(), username)
    return {"removed": n, "username": username}


@router.delete("/all")
def delete_all() -> dict:
    """清空整个 archive。极度危险：下次跑会全量重下。"""
    n = archive_sync.remove_all(ARCHIVE_FILE)
    return {"removed": n}
