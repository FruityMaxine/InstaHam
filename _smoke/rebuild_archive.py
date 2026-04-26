"""根据 downloads/ 里实际存在的文件，重建 server/data/archive.sqlite。

用法：
    py _smoke/rebuild_archive.py

机制：
- 扫描 downloads/ 下所有文件
- 用正则从文件名提取所有 15-20 位连续数字（IG media id 一般是 19 位）
- 每个数字生成一个 archive entry: instagram{id}
- 备份旧 archive 到 archive.sqlite.bak，写入新 archive

跑完之后，磁盘上还在的文件 → archive 里有记录 → gallery-dl 不重下；
磁盘上被你删掉的文件 → archive 里也没有 → gallery-dl 下次会重下回来。
"""
from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOWNLOADS = ROOT / "downloads"
ARCHIVE = ROOT / "server" / "data" / "archive.sqlite"

# IG media id 是雪花算法生成的纯数字。文件名格式：
#   {post_id}.jpg                       单文件 post
#   {post_id}_{child_id}.mp4            carousel 子文件
#   {post_id}.fdash-XXXX.mp4            DASH 视频（XXXX 是 fragment id，不是 IG entry！）
# 因此正则要求「按 . 或 _ 分隔后，整段都是 15-20 位纯数字」，避开 DASH fragment 误命中。
ID_RE = re.compile(r"^\d{15,20}$")


def main() -> int:
    if not DOWNLOADS.exists():
        print(f"[!] {DOWNLOADS} 不存在")
        return 1

    t0 = time.perf_counter()

    files = [f for f in DOWNLOADS.rglob("*") if f.is_file()]
    print(f"[+] 扫描到 {len(files)} 个文件")

    ids: set[str] = set()
    for f in files:
        for part in re.split(r"[._]", f.name):
            if ID_RE.match(part):
                ids.add(f"instagram{part}")

    print(f"[+] 提取出 {len(ids)} 个唯一 entry id")

    # 用 sqlite 自带 backup API 备份（即使 server 进程持有锁也能工作）
    # 用时间戳命名，保留每次跑的历史版本，避免被覆盖
    if ARCHIVE.exists():
        ts = time.strftime("%Y%m%d_%H%M%S")
        backup = ARCHIVE.with_name(f"archive.{ts}.sqlite.bak")
        src = sqlite3.connect(f"file:{ARCHIVE}?mode=ro", uri=True, timeout=10)
        dst = sqlite3.connect(str(backup))
        src.backup(dst)
        dst.close()
        src.close()
        print(f"[+] 旧 archive 备份到 {backup.name}")

    # 用事务清空 + 重建（不动文件本身，避开 server 锁）
    conn = sqlite3.connect(str(ARCHIVE), timeout=10)
    conn.execute("CREATE TABLE IF NOT EXISTS archive (entry TEXT PRIMARY KEY)")
    conn.execute("DELETE FROM archive")
    conn.executemany("INSERT OR IGNORE INTO archive VALUES (?)", [(i,) for i in ids])
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM archive").fetchone()[0]
    conn.close()

    dt_ms = (time.perf_counter() - t0) * 1000
    print(f"[+] 新 archive 写入 {n} 条 ({dt_ms:.0f} ms)")
    print(f"[+] 完成。下次跑下载时，被你删掉的文件会被重新下回来。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
