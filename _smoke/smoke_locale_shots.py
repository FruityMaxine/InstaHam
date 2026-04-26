"""跑双语截图：home + running + settings，分别保存到 docs/screenshots/{zh,en}/

为保护用户隐私：
- 截图前临时把 server/data/users.json 替换成 dummy（仅含 1 个占位用户）
- settings 截图时切到「从浏览器读取」模式，避免 cookies textarea 显示真实 cookies
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

DEMO_USERS = {
    "groups": ["默认", "friends"],
    "users": [
        {
            "id": "demo01",
            "username": "your_username",
            "group": "默认",
            "note": "",
            "last_download": None,
            "created_at": "2026-01-01T00:00:00",
        }
    ],
}


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


def shoot(locale: str) -> None:
    out = OUT / locale
    out.mkdir(parents=True, exist_ok=True)

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

        # 3) settings 抽屉 — 切到「从浏览器读取」+ 启用并发，展示新功能
        settings_label = "设置" if locale == "zh" else "Settings"
        page.locator(f"button:has-text('{settings_label}')").click()
        page.wait_for_timeout(500)

        browser_label = "从浏览器读取" if locale == "zh" else "Read from browser"
        page.locator(f"button:has-text('{browser_label}')").click()
        page.wait_for_timeout(200)

        enable_label = "启用实验性并发" if locale == "zh" else "Enable experimental parallelism"
        page.locator(f"label:has-text('{enable_label}') input").click()
        page.wait_for_timeout(300)
        # 选 3 worker 演示
        page.locator("button:has-text('3')").last.click()
        page.wait_for_timeout(200)

        page.screenshot(path=str(out / "04-settings.png"), full_page=True)
        b.close()
    print(f"  ✓ {locale} 截图完成 → {out}")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    use_demo_users()
    try:
        for loc in ("zh", "en"):
            shoot(loc)
    finally:
        restore_users()
        print("  ✓ 已恢复 users.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
