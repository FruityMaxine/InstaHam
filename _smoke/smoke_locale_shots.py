"""跑双语截图：home + running，分别保存到 docs/screenshots/{zh,en}/"""
from __future__ import annotations

from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent.parent
OUT = ROOT / "docs" / "screenshots"
URL = "http://127.0.0.1:8765"

# 用 placeholder 用户名，避免出现真实账号
DUMMY_USER = "your_username"


def shoot(locale: str) -> None:
    out = OUT / locale
    out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        # 在导航前注入 localStorage 强制 locale
        page.add_init_script(f"window.localStorage.setItem('instaham.locale', '{locale}');")
        page.goto(URL, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)

        # 把现有真实用户隐藏：在 React 状态里用搜索框过滤掉所有真实用户，再加一个假的
        # 简单做法：先截一张主页（含已有用户）— 但用户名要打码处理
        # 干脆先把用户列表清空：调 API 删除所有用户，加一个 dummy，截图后恢复
        # 这里走简单路：截图后再用 PIL 把第一个用户名行打码

        # 1) home
        page.screenshot(path=str(out / "01-home.png"), full_page=True)

        # 2) running — 临时模式 + dummy URL
        # 先点开“临时”按钮 (zh: 临时, en: Ad-hoc)
        adhoc_label = "临时" if locale == "zh" else "Ad-hoc"
        page.locator(f"button:has-text('{adhoc_label}')").click()
        page.wait_for_timeout(150)

        # 找 placeholder 输入框
        ph_substr = "粘贴 IG 链接" if locale == "zh" else "Paste IG URL"
        page.locator(f"input[placeholder*='{ph_substr}']").fill(
            "https://www.instagram.com/instagram/"
        )
        # 点开始/Start
        start_label = "开始下载" if locale == "zh" else "Start"
        page.locator(f"button:has-text('{start_label}')").click()
        page.wait_for_timeout(5500)
        page.screenshot(path=str(out / "03-running.png"), full_page=True)

        # 停止
        stop_label = "停止" if locale == "zh" else "Stop"
        try:
            page.locator(f"button:has-text('{stop_label}')").click()
            page.wait_for_timeout(500)
        except Exception:
            pass

        b.close()
    print(f"  ✓ {locale} 截图完成 → {out}")


def mask_username(path: Path) -> None:
    """打码 home 截图里的真实用户名行。"""
    from PIL import Image, ImageDraw
    img = Image.open(path).convert("RGB")
    draw = ImageDraw.Draw(img)
    # 用户行通常在左栏 y≈ 268-290 范围（和首张截图一致）
    draw.rectangle([(40, 268), (185, 290)], fill=(24, 24, 27))
    draw.text((45, 271), f"@{DUMMY_USER}", fill=(228, 228, 231))
    img.save(path, "PNG", optimize=True)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for loc in ("zh", "en"):
        shoot(loc)
        mask_username(OUT / loc / "01-home.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
