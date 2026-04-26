"""验证 4 处修复：
1. TopBar 含「退出」按钮
2. 不定进度条横扫整宽
3. 设置抽屉点保存出现 banner
4. shutdown 端点真实终止后端（在脚本末尾验证）
"""
from __future__ import annotations

import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "shots"


def main() -> int:
    errs: list[str] = []
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1440, "height": 900})
        page.goto("http://127.0.0.1:8765", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(400)

        # 1) 退出按钮
        if page.locator("button:has-text('退出')").count() == 0:
            errs.append("顶部缺少『退出』按钮")
        page.screenshot(path=str(OUT / "10_topbar_with_exit.png"), full_page=True)

        # 3) 设置抽屉 → 保存 → banner
        page.locator("button:has-text('设置')").first.click()
        page.wait_for_timeout(400)
        page.locator("button:has-text('保存')").click()
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "11_save_banner.png"), full_page=True)
        if page.locator("text=已保存").count() == 0:
            errs.append("保存后未出现『已保存』反馈 banner")

        # 关抽屉
        page.locator("button[aria-label='退出']").wait_for(state="visible", timeout=2000)
        page.keyboard.press("Escape")  # 兜底
        page.mouse.click(50, 400)  # 点遮罩
        page.wait_for_timeout(300)

        # 2) 不定进度条横扫：截多张图采样位置
        page.locator("button:has-text('临时')").click()
        page.locator("input[placeholder*='IG 链接']").fill(
            "https://www.instagram.com/instagram/"
        )
        page.locator("button:has-text('开始下载')").click()
        # 采样 5 帧，间隔 250ms，看进度条 children 的 boundingBox.x 应大幅变化
        page.wait_for_timeout(800)
        bar_locator = page.locator(".animate-slide-x").first
        if bar_locator.count() == 0:
            errs.append("找不到 animate-slide-x 流动条元素")
        else:
            xs: list[float] = []
            for i in range(6):
                box = bar_locator.bounding_box()
                if box:
                    xs.append(box["x"])
                page.screenshot(path=str(OUT / f"12_bar_t{i}.png"), clip={"x": 360, "y": 175, "width": 1060, "height": 25})
                page.wait_for_timeout(250)
            print("条 x 采样:", [round(x, 1) for x in xs])
            # 期望：min~max 跨度大于容器宽度 50% (容器 ~ 1060px → 530px)
            if xs and (max(xs) - min(xs)) < 200:
                errs.append(f"流动条跨度太小（{round(max(xs)-min(xs),1)}px），可能仍局部跳动")

        # 停止
        if page.locator("button:has-text('停止')").count() > 0:
            page.locator("button:has-text('停止')").click()
            page.wait_for_timeout(500)

        b.close()

    # 4) shutdown 端点 — 真实关后端
    print("\n--- 验证 /api/system/shutdown ---")
    try:
        urllib.request.urlopen(
            urllib.request.Request("http://127.0.0.1:8765/api/system/shutdown", method="POST"),
            timeout=2,
        )
        print("  shutdown POST 已发送")
    except Exception as e:
        print(f"  shutdown POST 出错（可能进程已退）: {e}")
    time.sleep(2)
    try:
        urllib.request.urlopen("http://127.0.0.1:8765/api/config/version", timeout=2)
        errs.append("shutdown 后服务仍可访问 — 进程未真正退出")
    except (urllib.error.URLError, OSError) as e:
        print(f"  shutdown 后访问已失败 ✓ : {e}")

    if errs:
        print("\n--- ERRORS ---")
        for e in errs:
            print(" -", e)
        return 1
    print("\nALL OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
