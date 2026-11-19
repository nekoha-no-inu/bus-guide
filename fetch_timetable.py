import sys
import unicodedata

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from timetable_common import SCREENSHOTS, load_routes, screenshot_path


def normalize_route(text: str) -> str:
    return unicodedata.normalize("NFKC", text).strip().strip("<>＜＞").strip()


def select_route(page, route: str) -> None:
    rows = page.locator("details table tbody tr")
    matches = []
    for index in range(rows.count()):
        row = rows.nth(index)
        label = row.locator("td label span").first
        if label.count() and normalize_route(label.inner_text()) == normalize_route(route):
            matches.append(row)
    if len(matches) != 1:
        raise ValueError(f"系統 {route} の選択肢が {len(matches)} 件見つかりました")
    label = matches[0].locator("td label").first
    course_id = label.get_attribute("for")
    if not course_id:
        raise ValueError(f"系統 {route} の識別子が見つかりません")

    checkboxes = page.locator("details table tbody tr input[type=checkbox]")
    if checkboxes.count():
        target = matches[0].locator("input[type=checkbox]")
        if target.count() != 1:
            raise ValueError(f"系統 {route} のチェックボックスが見つかりません")
        for index in range(checkboxes.count()):
            checkbox = checkboxes.nth(index)
            if checkbox.is_checked() and checkbox.get_attribute("id") != target.get_attribute("id"):
                checkbox.uncheck()
        target.check()
    elif rows.count() != 1:
        raise ValueError("複数系統の選択ができません")
    page.wait_for_function(
        """course => {
          const all = Array.from(document.querySelectorAll('a.trip-minute'));
          const visible = all.filter(a => a.getClientRects().length > 0);
          const isTarget = a => new URL(a.href).searchParams.get('course') === course;
          return visible.every(isTarget) && (!all.some(isTarget) || visible.length > 0);
        }""",
        arg=course_id.split("-")[0],
        timeout=10000,
    )


def main() -> int:
    try:
        routes = load_routes()
        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        for route in routes:
            screenshot_path(route).unlink(missing_ok=True)
    except (OSError, ValueError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 1

    errors = 0
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            context = browser.new_context(viewport={"width": 1200, "height": 900}, device_scale_factor=3)
            page = context.new_page()
            for index, route in enumerate(routes, 1):
                path = screenshot_path(route)
                print(f"[{index}/{len(routes)}] 取得中 {route['route']} / {route['stop']} ...", flush=True)
                try:
                    response = page.goto(route["url"], wait_until="load", timeout=60000)
                    if response is None or not response.ok:
                        raise ValueError(f"HTTPエラー: {response.status if response else '応答なし'}")
                    page.wait_for_load_state("networkidle", timeout=30000)
                    page.locator("table").filter(has=page.locator("ul[id^='weekday-']")).wait_for(timeout=30000)
                    page.wait_for_function("() => !!document.querySelector('#__nuxt')?.__vue_app__", timeout=30000)
                    page.evaluate("document.fonts.ready")
                    actual_stop = page.locator("h1 span.block").first.inner_text().strip()
                    if actual_stop != route["stop"]:
                        raise ValueError(f"停留所が一致しません: 設定={route['stop']}, ページ={actual_stop}")
                    select_route(page, route["route"])
                    table = page.locator("table").filter(has=page.locator("ul[id^='weekday-']"))
                    table.screenshot(path=str(path), timeout=60000)
                    print(f"[{index}/{len(routes)}] 保存完了 {path.name}", flush=True)
                except (PlaywrightError, OSError, ValueError) as exc:
                    errors += 1
                    print(f"[{index}/{len(routes)}] ページ取得失敗: {exc}", file=sys.stderr, flush=True)
            context.close()
            browser.close()
    except PlaywrightError as exc:
        print(f"ブラウザー起動失敗: {exc}", file=sys.stderr)
        return 1
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
