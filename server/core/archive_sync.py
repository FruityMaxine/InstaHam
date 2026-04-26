"""archive.sqlite 与磁盘文件对齐工具。

gallery-dl 的 archive 是纯记账表（只记 entry id），不验证磁盘文件是否还在。
本模块提供「以磁盘为准回填 archive」的能力，解决用户手动删除文件后
gallery-dl 仍跳过下载的问题。

核心操作：
- scan_disk_by_user: 按 username 分组扫描 downloads/instagram/<user>/ 提取 ID
- find_orphans: 列出 archive 有但磁盘没的 entry id
- sync_archive_to_disk: 自动删除所有 orphans
- remove_entries / remove_by_user / remove_all: 手动管理
"""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

# IG media id 是雪花算法生成的纯数字 17-19 位
# 文件名按 . 或 _ 分段后，纯数字段就是 entry id
# 这样能避开 DASH fragment id（出现在 *.fdash-XXXX.mp4 中）的误命中
_ID_PART_RE = re.compile(r"^\d{15,20}$")


def _ids_from_filename(name: str) -> list[str]:
    """从文件名按 . / _ 分段提取所有合法 IG media id 段。"""
    out = []
    for part in re.split(r"[._]", name):
        if _ID_PART_RE.match(part):
            out.append(part)
    return out


def scan_disk_ids(downloads_dir: Path) -> set[str]:
    """扫描 downloads/ 全部文件，返回 set of 'instagram{id}'。"""
    ids: set[str] = set()
    if not downloads_dir.exists():
        return ids
    for f in downloads_dir.rglob("*"):
        if f.is_file():
            for mid in _ids_from_filename(f.name):
                ids.add(f"instagram{mid}")
    return ids


def scan_disk_by_user(downloads_dir: Path) -> dict[str, set[str]]:
    """按 downloads/instagram/<username>/ 分组返回 {username: set of entry ids}。"""
    by_user: dict[str, set[str]] = {}
    instagram_dir = downloads_dir / "instagram"
    if not instagram_dir.exists():
        return by_user
    for user_dir in instagram_dir.iterdir():
        if not user_dir.is_dir():
            continue
        username = user_dir.name
        ids: set[str] = set()
        for f in user_dir.rglob("*"):
            if f.is_file():
                for mid in _ids_from_filename(f.name):
                    ids.add(f"instagram{mid}")
        if ids:
            by_user[username] = ids
    return by_user


def get_archive_entries(archive_path: Path) -> set[str]:
    """读 archive 里所有 entry。文件不存在返回空 set。"""
    if not archive_path.exists():
        return set()
    conn = sqlite3.connect(str(archive_path), timeout=10)
    try:
        # archive 表可能还没建（首次启动），处理这种 corner case
        try:
            rows = conn.execute("SELECT entry FROM archive").fetchall()
        except sqlite3.OperationalError:
            return set()
        return {r[0] for r in rows}
    finally:
        conn.close()


def find_orphans(archive_path: Path, downloads_dir: Path) -> list[str]:
    """返回 archive 有、磁盘已经没了的 entry id 列表（即"孤儿"）。"""
    in_archive = get_archive_entries(archive_path)
    on_disk = scan_disk_ids(downloads_dir)
    return sorted(in_archive - on_disk)


def remove_entries(archive_path: Path, entries: list[str]) -> int:
    """从 archive 删除指定 entries，返回删除数。"""
    if not entries or not archive_path.exists():
        return 0
    conn = sqlite3.connect(str(archive_path), timeout=10)
    try:
        cur = conn.executemany(
            "DELETE FROM archive WHERE entry = ?", [(e,) for e in entries]
        )
        conn.commit()
        return cur.rowcount or 0
    finally:
        conn.close()


def sync_archive_to_disk(archive_path: Path, downloads_dir: Path) -> int:
    """一键对齐：删掉所有孤儿 entries，返回清理数。"""
    orphans = find_orphans(archive_path, downloads_dir)
    return remove_entries(archive_path, orphans)


def remove_by_user(
    archive_path: Path, downloads_dir: Path, username: str
) -> int:
    """删除某用户名下所有 entries（基于磁盘上 instagram/<username>/ 推算）。"""
    by_user = scan_disk_by_user(downloads_dir)
    ids = list(by_user.get(username, set()))
    return remove_entries(archive_path, ids)


def remove_all(archive_path: Path) -> int:
    """清空 archive 全部 entries。"""
    in_archive = get_archive_entries(archive_path)
    return remove_entries(archive_path, list(in_archive))


def archive_summary(archive_path: Path, downloads_dir: Path) -> dict:
    """概览：总数、按 user 分组、孤儿数。"""
    in_archive = get_archive_entries(archive_path)
    by_user = scan_disk_by_user(downloads_dir)

    user_stats = []
    accounted: set[str] = set()
    for username, disk_ids in by_user.items():
        intersect = disk_ids & in_archive
        accounted |= intersect
        user_stats.append(
            {
                "username": username,
                "on_disk": len(disk_ids),
                "in_archive": len(intersect),
            }
        )
    user_stats.sort(key=lambda u: u["username"].lower())

    orphans = len(in_archive - accounted)
    return {
        "total": len(in_archive),
        "users": user_stats,
        "orphans": orphans,
    }
