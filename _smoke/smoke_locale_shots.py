"""跑双语截图：home + running + settings，分别保存到 docs/screenshots/{zh,en}/

为保护用户隐私：
- 截图前临时把 server/data/users.json 替换成 dummy（仅含 1 个占位用户）
- 截图前把 server/data/cookies.txt 替换成空 dummy（settings textarea 显示空）
- 截图后立即恢复
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent.parent
OUT = ROOT / "docs" / "screenshots"
URL = "http://127.0.0.1:8765"

USERS_FILE = ROOT / "server" / "data" / "users.json"
USERS_BACKUP = Path(__file__).parent / ".users_backup.json"
CONFIG_FILE = ROOT / "server" / "data" / "config.json"
CONFIG_BACKUP = Path(__file__).parent / ".config_backup.json"
COOKIES_FILE = ROOT / "server" / "data" / "cookies.txt"
COOKIES_BACKUP = Path(__file__).parent / ".cookies_backup.txt"
ARCHIVE_FILE = ROOT / "server" / "data" / "archive.sqlite"
ARCHIVE_BACKUP = Path(__file__).parent / ".archive_backup.sqlite"
INSTAGRAM_DIR = ROOT / "downloads" / "instagram"
INSTAGRAM_BACKUP = ROOT / "downloads" / ".instagram.demo_backup"
COOKIES_FILE = ROOT / "server" / "data" / "cookies.txt"
COOKIES_BACKUP = Path(__file__).parent / ".cookies_backup.txt"

DEMO_USERS = {
    "groups": ["默认", "friends"],
    "users": [
        {
            "id": "demo01",
            "username": "username",
            "group": "默认",
            "note": "",
            "last_download": None,
            "created_at": "2026-01-01T00:00:00",
        }
    ],
}

DEMO_COOKIES = "# Netscape HTTP Cookie File\n"


def use_demo_users() -> None:
    if USERS_FILE.exists():
        shutil.copy(USERS_FILE, USERS_BACKUP)
    USERS_FILE.write_text(
        json.dumps(DEMO_USERS, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def restore_users() -> None:
    if USERS_BACKUP.exists():
        shutil.copy(USERS_BACKUP, USERS_FILE)
        USERS_BACKUP.unlink()


def use_demo_cookies() -> None:
    if COOKIES_FILE.exists():
        shutil.copy(COOKIES_FILE, COOKIES_BACKUP)
    COOKIES_FILE.write_text(DEMO_COOKIES, encoding="utf-8")


def restore_cookies() -> None:
    if COOKIES_BACKUP.exists():
        shutil.copy(COOKIES_BACKUP, COOKIES_FILE)
        COOKIES_BACKUP.unlink()


def force_manual_cookies() -> None:
    """截图时强制 cookies_source=manual + parallel_enabled=False（默认状态）。"""
    if CONFIG_FILE.exists():
        shutil.copy(CONFIG_FILE, CONFIG_BACKUP)
        cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        cfg["cookies_source"] = "manual"
        CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def restore_config() -> None:
    if CONFIG_BACKUP.exists():
        shutil.copy(CONFIG_BACKUP, CONFIG_FILE)
        CONFIG_BACKUP.unlink()


# ---- archive + downloads/instagram dummy（保护 Archive Manager 截图隐私）----

DEMO_USER_DIRS = {
    "username":      ["1834567890123456701.jpg", "1834567890123456702.mp4"],
    "friend_acct":   ["1834567890123456710.jpg"],
    "creator_demo":  ["1834567890123456720.jpg", "1834567890123456721.jpg", "1834567890123456722.mp4"],
}


def use_demo_archive_and_downloads() -> None:
    import sqlite3 as _sql
    # archive: 备份原文件
    if ARCHIVE_FILE.exists():
        if ARCHIVE_BACKUP.exists():
            ARCHIVE_BACKUP.unlink()
        # 用 sqlite backup API 即使 server 持有锁也能复制
        src = _sql.connect(f"file:{ARCHIVE_FILE}?mode=ro", uri=True, timeout=10)
        dst = _sql.connect(str(ARCHIVE_BACKUP))
        src.backup(dst)
        dst.close()
        src.close()
    # 写 dummy archive（事务方式，不动文件本身，避开 server 读锁）
    conn = _sql.connect(str(ARCHIVE_FILE), timeout=10)
    conn.execute("CREATE TABLE IF NOT EXISTS archive (entry TEXT PRIMARY KEY)")
    conn.execute("DELETE FROM archive")
    demo_ids = []
    for files in DEMO_USER_DIRS.values():
        for f in files:
            mid = f.split(".")[0]
            demo_ids.append((f"instagram{mid}",))
    conn.executemany("INSERT OR IGNORE INTO archive VALUES (?)", demo_ids)
    conn.commit()
    conn.close()

    # downloads/instagram：rename 真实目录为 backup
    if INSTAGRAM_DIR.exists():
        if INSTAGRAM_BACKUP.exists():
            shutil.rmtree(INSTAGRAM_BACKUP)
        INSTAGRAM_DIR.rename(INSTAGRAM_BACKUP)
    # 创建 dummy downloads/instagram/<user>/<file>
    for user, files in DEMO_USER_DIRS.items():
        d = INSTAGRAM_DIR / user
        d.mkdir(parents=True, exist_ok=True)
        for f in files:
            (d / f).touch()


def reset_demo_only() -> None:
    """重新刷成 dummy 状态（不动备份）。用于 running 截图后、archive 截图前清掉残留。"""
    import sqlite3 as _sql
    conn = _sql.connect(str(ARCHIVE_FILE), timeout=10)
    conn.execute("CREATE TABLE IF NOT EXISTS archive (entry TEXT PRIMARY KEY)")
    conn.execute("DELETE FROM archive")
    demo_ids = []
    for files in DEMO_USER_DIRS.values():
        for f in files:
            mid = f.split(".")[0]
            demo_ids.append((f"instagram{mid}",))
    conn.executemany("INSERT OR IGNORE INTO archive VALUES (?)", demo_ids)
    conn.commit()
    conn.close()
    if INSTAGRAM_DIR.exists():
        for d in INSTAGRAM_DIR.iterdir():
            if d.is_dir() and d.name not in DEMO_USER_DIRS:
                shutil.rmtree(d, ignore_errors=True)
        for user, files in DEMO_USER_DIRS.items():
            ud = INSTAGRAM_DIR / user
            ud.mkdir(parents=True, exist_ok=True)
            for f in files:
                (ud / f).touch()


def restore_archive_and_downloads() -> None:
    import sqlite3 as _sql
    # 恢复 archive：用 sqlite backup 反向覆盖
    if ARCHIVE_BACKUP.exists():
        # 清空当前 + 从 backup 写回
        conn = _sql.connect(str(ARCHIVE_FILE), timeout=10)
        conn.execute("CREATE TABLE IF NOT EXISTS archive (entry TEXT PRIMARY KEY)")
        conn.execute("DELETE FROM archive")
        bak = _sql.connect(f"file:{ARCHIVE_BACKUP}?mode=ro", uri=True, timeout=10)
        rows = bak.execute("SELECT entry FROM archive").fetchall()
        bak.close()
        conn.executemany("INSERT OR IGNORE INTO archive VALUES (?)", rows)
        conn.commit()
        conn.close()
        ARCHIVE_BACKUP.unlink()

    # 恢复 downloads/instagram
    if INSTAGRAM_BACKUP.exists():
        if INSTAGRAM_DIR.exists():
            shutil.rmtree(INSTAGRAM_DIR)
        INSTAGRAM_BACKUP.rename(INSTAGRAM_DIR)


def shoot(locale: str) -> None:
    out = OUT / locale
    out.mkdir(parents=True, exist_ok=True)

    # 截图前清空 server 端事件缓存，避免 home 截图显示上次残留日志
    import urllib.request
    try:
        urllib.request.urlopen(
            urllib.request.Request(f"{URL}/api/system/recent-events/clear", method="POST"),
            timeout=3,
        )
    except Exception:
        pass


    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.add_init_script(f"window.localStorage.setItem('instaham.locale', '{locale}');")
        page.goto(URL, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)

        # 1) home
        page.screenshot(path=str(out / "01-home.png"), full_page=True)

        # 2) running — 临时模式 + dummy URL
        adhoc_label = "临时" if locale == "zh" else "Ad-hoc"
        page.locator(f"button:has-text('{adhoc_label}')").click()
        page.wait_for_timeout(150)

        ph_substr = "粘贴 IG 链接" if locale == "zh" else "Paste IG URL"
        page.locator(f"input[placeholder*='{ph_substr}']").fill(
            "https://www.instagram.com/instagram/"
        )
        start_label = "开始下载" if locale == "zh" else "Start"
        page.locator(f"button:has-text('{start_label}')").click()
        page.wait_for_timeout(5500)
        page.screenshot(path=str(out / "03-running.png"), full_page=True)

        stop_label = "停止" if locale == "zh" else "Stop"
        try:
            page.locator(f"button:has-text('{stop_label}')").click()
            page.wait_for_timeout(500)
        except Exception:
            pass

        # 3) settings 抽屉 — 启用并发演示
        settings_label = "设置" if locale == "zh" else "Settings"
        page.locator(f"button:has-text('{settings_label}')").click()
        page.wait_for_timeout(500)

        enable_label = "启用实验性并发" if locale == "zh" else "Enable experimental parallelism"
        page.locator(f"label:has-text('{enable_label}') input").click()
        page.wait_for_timeout(300)
        # 选 3 worker 演示
        page.locator("button:has-text('3')").last.click()
        page.wait_for_timeout(200)

        page.screenshot(path=str(out / "04-settings.png"), full_page=True)

        # 4) Archive Manager — 关 drawer + kill gallery-dl 子进程 + 重置 dummy
        page.mouse.click(50, 400)
        page.wait_for_timeout(400)
        # gallery-dl 子进程还在持有文件句柄，先 kill 再清目录
        import subprocess as _sp
        _sp.run(["taskkill", "/F", "/IM", "gallery-dl.exe"], capture_output=True)
        page.wait_for_timeout(800)
        reset_demo_only()
        page.locator("button[aria-label='archive']").click()
        page.wait_for_timeout(900)
        page.screenshot(path=str(out / "05-archive.png"), full_page=True)

        b.close()
    print(f"  ✓ {locale} 截图完成 → {out}")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    use_demo_users()
    use_demo_cookies()
    force_manual_cookies()
    use_demo_archive_and_downloads()
    try:
        for loc in ("zh", "en"):
            shoot(loc)
    finally:
        restore_users()
        restore_cookies()
        restore_config()
        restore_archive_and_downloads()
        print("  ✓ 已恢复 users.json / cookies.txt / config.json / archive.sqlite / downloads/instagram")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
