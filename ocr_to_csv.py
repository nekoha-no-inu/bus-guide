import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import pytesseract

from timetable_common import ROOT, Route, load_routes, screenshot_path


OUTPUT = ROOT / "timetable.csv"
COLUMNS = ["route", "stop", "direction", "day_type", "depart_time"]
DAY_TYPES = ("平日", "土曜", "休日")


def line_positions(mask: np.ndarray, axis: int, minimum: int) -> list[int]:
    counts = np.count_nonzero(mask, axis=axis)
    indices = np.flatnonzero(counts >= minimum)
    groups = np.split(indices, np.where(np.diff(indices) > 1)[0] + 1)
    return [int(np.mean(group)) for group in groups if len(group)]


def grid_positions(image: np.ndarray) -> tuple[list[int], list[int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    dark = cv2.threshold(gray, 160, 255, cv2.THRESH_BINARY_INV)[1]
    height, width = dark.shape
    horizontal = cv2.morphologyEx(
        dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (width // 2, 1))
    )
    ys = line_positions(horizontal, axis=1, minimum=int(width * 0.8))
    if len(ys) < 3:
        raise ValueError("表の横罫線を検出できません")
    vertical = cv2.morphologyEx(
        dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(10, (ys[-1] - ys[0]) // 2)))
    )
    xs = line_positions(vertical, axis=0, minimum=int((ys[-1] - ys[0]) * 0.7))
    if len(xs) != 5:
        raise ValueError(f"表の縦罫線が5本ではありません: {len(xs)}本")
    return xs, ys


def read_digits(image: np.ndarray, psm: int) -> str:
    return pytesseract.image_to_string(
        image, lang="eng", config=f"--psm {psm} -c tessedit_char_whitelist=0123456789"
    ).strip()


def read_minutes(image: np.ndarray) -> list[str]:
    blue, green, red = (channel.astype(np.int16) for channel in cv2.split(image))
    ink = ((blue - red > 60) & (blue - green > 30)).astype(np.uint8)
    _, _, stats, _ = cv2.connectedComponentsWithStats(ink, 8)
    components = [
        tuple(int(value) for value in stat[:4])
        for stat in stats[1:]
        if stat[2] >= 5 and stat[3] >= 20 and stat[4] >= 35
    ]
    if not components and np.count_nonzero(ink) > 20:
        raise ValueError("数字の輪郭を検出できません")
    lines: list[list[tuple[int, int, int, int]]] = []
    for component in sorted(components, key=lambda item: (item[1], item[0])):
        x, y, width, height = component
        matching = next((line for line in lines if abs(line[0][1] - y) < 15), None)
        if matching is None:
            lines.append([component])
        else:
            matching.append(component)
    result: list[str] = []
    for line in sorted(lines, key=lambda items: items[0][1]):
        line.sort(key=lambda item: item[0])
        if len(line) % 2:
            raise ValueError(f"数字の輪郭が奇数です: {len(line)}")
        for first, second in zip(line[::2], line[1::2]):
            x1 = first[0]
            x2 = second[0] + second[2]
            y1 = min(first[1], second[1])
            y2 = max(first[1] + first[3], second[1] + second[3])
            crop = (1 - ink[y1:y2, x1:x2]) * 255
            crop = cv2.copyMakeBorder(crop, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
            text = read_digits(crop, 8)
            if not re.fullmatch(r"\d{2}", text) or int(text) > 59:
                digits = []
                for x, y, width, height in (first, second):
                    digit = (1 - ink[y:y + height, x:x + width]) * 255
                    digit = cv2.copyMakeBorder(digit, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
                    digits.append(read_digits(digit, 8))
                text = "".join(digits)
            if not re.fullmatch(r"\d{2}", text) or int(text) > 59:
                raise ValueError(f"分を認識できません: {text!r}")
            result.append(text)
    return result


def parse_timetable(path: Path, route: Route) -> list[dict[str, str]]:
    image = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"画像を読み込めません: {path}")
    xs, ys = grid_positions(image)
    records: list[dict[str, str]] = []
    hours: list[int] = []
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    for top, bottom in zip(ys[1:-1], ys[2:]):
        if any(np.count_nonzero(gray[top + 3:bottom - 3, x] < 160) < (bottom - top) * 0.7 for x in xs[1:-1]):
            break
        if bottom - top < 12:
            raise ValueError("時刻表の行が小さすぎます")
        hour_text = read_digits(image[top + 3:bottom - 3, xs[0] + 3:xs[1] - 3], 7)
        if not re.fullmatch(r"\d{1,2}", hour_text) or int(hour_text) > 24:
            raise ValueError(f"時間を認識できません: {hour_text!r}")
        hour = int(hour_text)
        if hours and hour != hours[-1] + 1:
            raise ValueError(f"時間の並びが不正です: {hours[-1]} -> {hour}")
        hours.append(hour)
        for column, day in enumerate(DAY_TYPES, 1):
            cell = image[top + 3:bottom - 3, xs[column] + 3:xs[column + 1] - 3]
            try:
                minutes = read_minutes(cell)
            except ValueError as exc:
                raise ValueError(f"{day} {hour:02d}時: {exc}") from exc
            for minute in minutes:
                if hour == 24:
                    raise ValueError(f"{day} 24時台の時刻は日付をまたぐため要確認: {minute}")
                records.append({
                    "route": route["route"],
                    "stop": route["stop"],
                    "direction": route["direction"],
                    "day_type": day,
                    "depart_time": f"{hour:02d}:{minute}",
                })
    if not hours:
        raise ValueError("時刻表の行がありません")
    if not records:
        raise ValueError("時刻を1件も認識できません")
    return records


def write_csv(records: list[dict[str, str]]) -> int:
    frame = pd.DataFrame(records, columns=COLUMNS).drop_duplicates()
    frame = frame.sort_values(["depart_time", "stop", "direction", "route", "day_type"], kind="stable")
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="", dir=OUTPUT.parent, delete=False) as file:
            temp_path = Path(file.name)
            frame.to_csv(file, index=False, lineterminator="\n")
        if OUTPUT.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            backup = OUTPUT.with_name(f"{OUTPUT.stem}_{timestamp}{OUTPUT.suffix}")
            shutil.copy2(OUTPUT, backup)
            print(f"旧CSVを保存: {backup.name}")
        os.replace(temp_path, OUTPUT)
        temp_path = None
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    return len(frame)


def main() -> int:
    try:
        routes = load_routes()
        pytesseract.get_tesseract_version()
    except (OSError, ValueError, pytesseract.TesseractNotFoundError) as exc:
        print(f"設定エラー: {exc}", file=sys.stderr)
        return 1
    records: list[dict[str, str]] = []
    errors = 0
    for index, route in enumerate(routes, 1):
        path = screenshot_path(route)
        print(f"[{index}/{len(routes)}] OCR解析中 {route['route']} / {route['stop']} ...", flush=True)
        try:
            records.extend(parse_timetable(path, route))
        except (OSError, ValueError, cv2.error, pytesseract.TesseractError) as exc:
            errors += 1
            print(f"[{index}/{len(routes)}] OCR失敗: {exc}", file=sys.stderr, flush=True)
    if errors:
        print(f"{errors}件のOCR失敗があるためCSVを更新しません", file=sys.stderr)
        return 1
    try:
        count = write_csv(records)
    except (OSError, ValueError) as exc:
        print(f"CSV出力失敗: {exc}", file=sys.stderr)
        return 1
    print(f"CSV生成完了\n総件数 {count} 件")
    return 0


if __name__ == "__main__":
    sys.exit(main())
