"""读取 gallery-dl 的 download-archive sqlite 文件做统计。

gallery-dl 的 archive schema：单表 `archive(entry TEXT PRIMARY KEY)`，
entry 形如 `instagram<sep>id`。我们只关心总条数与按 extractor 分组数。
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


def stats(archive_path: Path) -> dict:
    """返回 {total: int, by_extractor: {name: count}}。文件不存在返回 0。"""
    p = Path(archive_path)
    if not p.exists():
        return {"total": 0, "by_extractor": {}}
    try:
        conn = sqlite3.connect(str(p))
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM archive")
        total = cur.fetchone()[0]
        # extractor 名字一般是 entry 的前缀（无分隔符约定，先拿前 9 字符 'instagram' 简单粗暴）
        cur.execute("SELECT entry FROM archive LIMIT 5000")
        by: dict[str, int] = {}
        for (entry,) in cur.fetchall():
            key = entry.split("_", 1)[0] if "_" in entry else entry[:9]
            by[key] = by.get(key, 0) + 1
        conn.close()
        return {"total": total, "by_extractor": by}
    except sqlite3.Error as e:
        return {"total": 0, "by_extractor": {}, "error": str(e)}
