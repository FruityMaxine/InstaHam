"""验证：在 UI 上重跑同一目标，跳过计数应递增、双层进度条与日志稳定流出。"""
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "shots"
OUT.mkdir(exist_ok=True)


def main() -> int:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:8765", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(400)

        page.locator("button:has-text('临时')").click()
        page.locator("input[placeholder*='IG 链接']").fill(
            "https://www.instagram.com/instagram/"
        )
        page.locator("button:has-text('开始下载')").click()

        # 等 12s，让 gallery-dl 跑过头像 + 一些 stories（archive 已存在大概率全部 skip）
        page.wait_for_timeout(12000)
        page.screenshot(path=str(OUT / "06_skip_run.png"), full_page=True)

        # 抓「跳过」计数文本
        text = page.locator("text=跳过").first.text_content() or ""
        print("当前用户行:", text)

        # 抓日志行数
        log_count = page.locator("text=streaming").count()
        print("streaming 标记:", log_count)

        # 停止
        if page.locator("button:has-text('停止')").count() > 0:
            page.locator("button:has-text('停止')").click()
            page.wait_for_timeout(1000)

        b.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
