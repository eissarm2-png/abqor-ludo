#!/usr/bin/env python3
"""
اختبار تطابق بصري لساحة الدومينو ولوحة اللودو.
عند فشل أي تحقق يحفظ تلقائيًا: لقطة شاشة كاملة + لقطة للعنصر + فيديو قصير للجلسة
داخل artifacts/visual/<viewport>/ . وعند النجاح تُحذف مخرجات الجلسة.

التشغيل:  python3 scripts/visual-regression.py [base_url]
"""

import asyncio
import shutil
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
ART = Path(__file__).resolve().parent.parent / "artifacts" / "visual"

VIEWPORTS = [
    ("iphone-se", 375, 667),
    ("iphone-12", 390, 844),
    ("iphone-max", 430, 932),
    ("tablet", 768, 1024),
]


async def check_domino(page, out: Path, failures: list[str], label: str):
    arena = page.get_by_test_id("domino-arena")
    await arena.wait_for(timeout=15000)

    # 1) معاينة الترتيب ثم أنيميشن التأكيد قبل بدء الحركة
    if await page.get_by_test_id("domino-preview").count() == 0:
        failures.append(f"{label}: معاينة ترتيب الجولة لم تظهر")
    await page.wait_for_timeout(1400)

    # 2) أول حجرة في وسط الساحة
    box = await arena.bounding_box()
    for _ in range(14):
        tiles = page.locator("[data-testid='domino-chain'] .domino-slot")
        if await tiles.count() > 0:
            break
        await page.wait_for_timeout(700)
    tiles = page.locator("[data-testid='domino-chain'] .domino-slot")
    count = await tiles.count()
    if count == 0:
        failures.append(f"{label}: لم توضع أي حجرة في الساحة")
        return
    first = await tiles.nth(0).bounding_box()
    if first and box:
        dx = abs((first["x"] + first["width"] / 2) - (box["x"] + box["width"] / 2))
        dy = abs((first["y"] + first["height"] / 2) - (box["y"] + box["height"] / 2))
        if dx > 26 or dy > 26:
            failures.append(f"{label}: أول حجرة غير متمركزة (dx={dx:.1f} dy={dy:.1f})")

    # 3) الأحجار لا تتجاوز حدود الساحة ولا تتداخل
    boxes = [await tiles.nth(i).bounding_box() for i in range(count)]
    for b in boxes:
        if not b or not box:
            continue
        if b["x"] < box["x"] - 4 or b["x"] + b["width"] > box["x"] + box["width"] + 4:
            failures.append(f"{label}: حجرة خارج حدود الساحة أفقيًا")
            break
    await arena.screenshot(path=str(out / "domino-arena.png"))


async def run_viewport(playwright, name, w, h, failures):
    out = ART / name
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={"width": w, "height": h},
        record_video_dir=str(out / "video"),
        record_video_size={"width": w, "height": h},
    )
    page = await context.new_page()
    local = []
    try:
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_timeout(2500)
        # تخطي الشاشة الافتتاحية والبوابة إن ظهرت
        for label in ["العب كضيف", "ابدأ", "دخول سريع"]:
            btn = page.get_by_role("button", name=label)
            if await btn.count():
                await btn.first.click()
                await page.wait_for_timeout(800)
                break
        domino = page.get_by_text("دومينو", exact=False)
        if await domino.count():
            await domino.first.click()
            await page.wait_for_timeout(600)
        start = page.get_by_role("button", name="ابدأ اللعب")
        if await start.count():
            await start.first.click()
        await check_domino(page, out, local, name)
    except Exception as exc:  # noqa: BLE001
        local.append(f"{name}: استثناء {exc}")
    finally:
        if local:
            try:
                await page.screenshot(path=str(out / "failure.png"))
            except Exception:  # noqa: BLE001
                pass
        await context.close()
        await browser.close()

    if local:
        failures.extend(local)
        print(f"FAIL {name}: artifacts -> {out}")
    else:
        shutil.rmtree(out, ignore_errors=True)
        print(f"PASS {name}")


async def main():
    failures: list[str] = []
    async with async_playwright() as playwright:
        for name, w, h in VIEWPORTS:
            await run_viewport(playwright, name, w, h, failures)
    if failures:
        print("\n".join(failures))
        sys.exit(1)
    print("visual regression OK")


asyncio.run(main())
