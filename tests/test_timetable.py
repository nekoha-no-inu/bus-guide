import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np
import pandas as pd

import ocr_to_csv
from fetch_timetable import normalize_route
from timetable_common import Route


class TimetableTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "table.png"
        image = np.full((160, 500, 3), 255, dtype=np.uint8)
        for y in (10, 50, 90, 130, 155):
            cv2.line(image, (0, y), (499, y), (100, 100, 100), 2)
        for x in (0, 40, 190, 340, 499):
            cv2.line(image, (x, 10), (x, 130), (100, 100, 100), 2)
        cv2.imencode(".png", image)[1].tofile(self.path)
        self.route: Route = {
            "route": "清63-1", "stop": "清瀬駅北口", "direction": "新座駅方向",
            "url": "https://example.com",
        }

    def test_extracts_days_and_skips_empty_24_hour_row(self):
        with patch.object(ocr_to_csv, "read_digits", side_effect=["23", "24"]), \
             patch.object(ocr_to_csv, "read_minutes", side_effect=[["00", "39"], ["18"], ["33"], [], [], []]):
            records = ocr_to_csv.parse_timetable(self.path, self.route)
        self.assertEqual(
            [(record["day_type"], record["depart_time"]) for record in records],
            [("平日", "23:00"), ("平日", "23:39"), ("土曜", "23:18"), ("休日", "23:33")],
        )

    def test_rejects_24_hour_departures(self):
        with patch.object(ocr_to_csv, "read_digits", side_effect=["23", "24"]), \
             patch.object(ocr_to_csv, "read_minutes", side_effect=[[], [], [], ["10"]]):
            with self.assertRaisesRegex(ValueError, "24時台"):
                ocr_to_csv.parse_timetable(self.path, self.route)

    def test_reads_blue_minutes_and_retries_single_digit_results(self):
        image = np.full((100, 300, 3), 255, dtype=np.uint8)
        for x in (20, 45, 100, 125):
            cv2.rectangle(image, (x, 20), (x + 10, 55), (187, 114, 0), -1)
        cv2.line(image, (85, 15), (85, 45), (187, 114, 0), 1)
        with patch.object(ocr_to_csv, "read_digits", side_effect=["55", "1", "1", "1"]):
            self.assertEqual(ocr_to_csv.read_minutes(image), ["55", "11"])

    def test_deduplicates_and_backs_up_previous_csv(self):
        record = {**{key: self.route[key] for key in ("route", "stop", "direction")},
                  "day_type": "平日", "depart_time": "06:00"}
        output = Path(self.directory.name) / "timetable.csv"
        output.write_text("old\n", encoding="utf-8")
        with patch.object(ocr_to_csv, "OUTPUT", output):
            self.assertEqual(ocr_to_csv.write_csv([record, record]), 1)
        self.assertEqual(len(pd.read_csv(output)), 1)
        backups = list(output.parent.glob("timetable_*.csv"))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].read_text(encoding="utf-8"), "old\n")

    def test_normalizes_site_route_labels(self):
        self.assertEqual(normalize_route("＜清６３－１＞"), "清63-1")


if __name__ == "__main__":
    unittest.main()
