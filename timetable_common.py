import hashlib
import json
from pathlib import Path
from typing import TypedDict
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
ROUTES_FILE = ROOT / "routes.json"
SCREENSHOTS = ROOT / "screenshots"


class Route(TypedDict):
    route: str
    stop: str
    direction: str
    url: str


def load_routes() -> list[Route]:
    with ROUTES_FILE.open(encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, list) or not data:
        raise ValueError("routes.json は空でない配列にしてください")
    routes: list[Route] = []
    seen: set[tuple[str, str, str, str]] = set()
    for index, item in enumerate(data, 1):
        if not isinstance(item, dict):
            raise ValueError(f"{index}件目はオブジェクトにしてください")
        values = [item.get(key) for key in ("route", "stop", "direction", "url")]
        if any(not isinstance(value, str) or not value.strip() for value in values):
            raise ValueError(f"{index}件目の route, stop, direction, url は必須です")
        route, stop, direction, url = (value.strip() for value in values)
        if urlparse(url).scheme not in ("http", "https") or not urlparse(url).netloc:
            raise ValueError(f"{index}件目の URL が不正です: {url}")
        key = (route, stop, direction, url)
        if key in seen:
            print(f"重複する設定を省略: {route} / {stop} / {direction}")
            continue
        seen.add(key)
        routes.append({"route": route, "stop": stop, "direction": direction, "url": url})
    return routes


def screenshot_path(route: Route) -> Path:
    key = json.dumps(route, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return SCREENSHOTS / f"{hashlib.sha256(key).hexdigest()}.png"
