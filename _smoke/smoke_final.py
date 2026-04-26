"""最终冒烟：验证日志友好显示 + 完整流程截屏。"""
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "shots"


def main() -> int:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:8765", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)

        page.locator("button:has-text('临时')").click()
        page.locator("input[placeholder*='IG 链接']").fill(
            "https://www.instagram.com/instagram/"
        )
        page.locator("button:has-text('开始下载')").click()
        page.wait_for_timeout(5000)
        page.screenshot(path=str(OUT / "07_final_running.png"), full_page=True)

        # 验证日志里出现友好的 user_start 文本
        text = page.content()
        ok = "第 1/1 个目标" in text or "第 1/1" in text
        print("user_start 友好显示:", ok)

        if page.locator("button:has-text('停止')").count() > 0:
            page.locator("button:has-text('停止')").click()

        b.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
