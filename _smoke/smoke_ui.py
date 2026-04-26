"""端到端冒烟：加载首页 → 截屏 → 校验关键控件存在 → 触发临时下载流验证 WS。"""
from __future__ import annotations

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "shots"
OUT.mkdir(exist_ok=True)


def main() -> int:
    errs: list[str] = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1440, "height": 900})
        console_msgs: list[str] = []
        page.on("console", lambda m: console_msgs.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_msgs.append(f"[pageerror] {e}"))

        page.goto("http://127.0.0.1:8765", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT / "01_home.png"), full_page=True)

        # 关键控件存在性
        for sel in [
            "text=InstaHam",
            "text=用户列表",
            "text=实时日志",
            "text=开始下载",
            "text=已归档",
        ]:
            cnt = page.locator(sel).count()
            if cnt == 0:
                errs.append(f"未找到选择器: {sel}")

        # 打开设置抽屉
        page.locator("button:has-text('设置')").first.click()
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "02_drawer.png"), full_page=True)
        if page.locator("text=Cookies (Netscape").count() == 0:
            errs.append("抽屉未出现 cookies 字段")

        # 关闭抽屉（点遮罩）
        page.mouse.click(50, 400)
        page.wait_for_timeout(300)

        # 切到「临时」模式
        page.locator("button:has-text('临时')").click()
        page.wait_for_timeout(200)
        page.locator("input[placeholder*='IG 链接']").fill("https://www.instagram.com/instagram/")
        page.screenshot(path=str(OUT / "03_adhoc_mode.png"), full_page=True)

        # 点开始下载，等几秒看是否有日志
        page.locator("button:has-text('开始下载')").click()
        page.wait_for_timeout(6000)
        page.screenshot(path=str(OUT / "04_running.png"), full_page=True)

        # 必须出现至少一条日志或者 streaming 标记
        log_count_text = page.locator("text=streaming").count()
        if log_count_text == 0:
            errs.append("启动后未看到 streaming 标记")

        # 停止
        if page.locator("button:has-text('停止')").count() > 0:
            page.locator("button:has-text('停止')").click()
            page.wait_for_timeout(800)

        page.screenshot(path=str(OUT / "05_after_stop.png"), full_page=True)

        b.close()

    print("--- console ---")
    for m in console_msgs[-30:]:
        print(m)
    if errs:
        print("\n--- ERRORS ---")
        for e in errs:
            print(" -", e)
        return 1
    print("\nOK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
