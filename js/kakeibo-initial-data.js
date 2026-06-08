// 初期インポート用データ
const INITIAL_KAKEIBO_DATA = [
  {
    "id": 1,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ダイニングテーブル",
    "amount": 32900,
    "person": "みき"
  },
  {
    "id": 2,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "布団",
    "amount": 14990,
    "person": "みき"
  },
  {
    "id": 3,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ゲーミングチェア",
    "amount": 29900,
    "person": "みき"
  },
  {
    "id": 4,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "デスク",
    "amount": 11990,
    "person": "みき"
  },
  {
    "id": 5,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ソファ",
    "amount": 14990,
    "person": "みき"
  },
  {
    "id": 6,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "テレビ台",
    "amount": 9990,
    "person": "みき"
  },
  {
    "id": 7,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "送料",
    "amount": 4950,
    "person": "みき"
  },
  {
    "id": 8,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "棚",
    "amount": 10990,
    "person": "みき"
  },
  {
    "id": 9,
    "type": "支出",
    "date": "2026-05-01",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "送料",
    "amount": 1650,
    "person": "みき"
  },
  {
    "id": 10,
    "type": "支出",
    "date": "2026-05-02",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 105,
    "person": "みほ"
  },
  {
    "id": 11,
    "type": "支出",
    "date": "2026-05-02",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "シーリングライト",
    "amount": 2717,
    "person": "みき"
  },
  {
    "id": 12,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "Mr.MAX",
    "amount": 5276,
    "person": "みき"
  },
  {
    "id": 13,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 4307,
    "person": "みき"
  },
  {
    "id": 14,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "BigA",
    "amount": 660,
    "person": "みき"
  },
  {
    "id": 15,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "傘立て",
    "amount": 799,
    "person": "みき"
  },
  {
    "id": 16,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ルームサンダル",
    "amount": 999,
    "person": "みき"
  },
  {
    "id": 17,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "棚",
    "amount": 1649,
    "person": "みき"
  },
  {
    "id": 18,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "棚",
    "amount": 3299,
    "person": "みき"
  },
  {
    "id": 19,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "製氷皿",
    "amount": 878,
    "person": "みき"
  },
  {
    "id": 20,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ソーダフレッシュ",
    "amount": 549,
    "person": "みき"
  },
  {
    "id": 21,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "アクロン",
    "amount": 252,
    "person": "みき"
  },
  {
    "id": 22,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "歯ブラシ",
    "amount": 549,
    "person": "みき"
  },
  {
    "id": 23,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "歯ブラシ",
    "amount": 549,
    "person": "みき"
  },
  {
    "id": 24,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "キレイキレイ",
    "amount": 384,
    "person": "みき"
  },
  {
    "id": 25,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "トイレクリーナー",
    "amount": 196,
    "person": "みき"
  },
  {
    "id": 26,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "seria",
    "amount": 990,
    "person": "みき"
  },
  {
    "id": 27,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 28,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 29,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 30,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 31,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 32,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みほ"
  },
  {
    "id": 33,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みほ"
  },
  {
    "id": 34,
    "type": "支出",
    "date": "2026-05-03",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 35,
    "type": "支出",
    "date": "2026-05-03",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "seria",
    "amount": 110,
    "person": "みき"
  },
  {
    "id": 36,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "夜のあしあと",
    "amount": 1980,
    "person": "みほ"
  },
  {
    "id": 37,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "夜の帰り道",
    "amount": 3630,
    "person": "みほ"
  },
  {
    "id": 38,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "KALDI",
    "amount": 2935,
    "person": "みほ"
  },
  {
    "id": 39,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "ティッシュ",
    "amount": 218,
    "person": "みほ"
  },
  {
    "id": 40,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "タマゴ",
    "amount": 277,
    "person": "みほ"
  },
  {
    "id": 41,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "DailyYamazaki",
    "amount": 1185,
    "person": "みき"
  },
  {
    "id": 42,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "被服費",
    "description": "シャツ",
    "amount": 2496,
    "person": "みき"
  },
  {
    "id": 43,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "ファミマ",
    "amount": 901,
    "person": "みき"
  },
  {
    "id": 44,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "特別費",
    "description": "アクアパーク品川",
    "amount": 5600,
    "person": "みき"
  },
  {
    "id": 45,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "特別費",
    "description": "メリーゴーラウンド",
    "amount": 1000,
    "person": "みほ"
  },
  {
    "id": 46,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "食費",
    "description": "売店",
    "amount": 2900,
    "person": "みき"
  },
  {
    "id": 47,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 48,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 49,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 402,
    "person": "みき"
  },
  {
    "id": 50,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 341,
    "person": "みき"
  },
  {
    "id": 51,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 341,
    "person": "みき"
  },
  {
    "id": 52,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 323,
    "person": "みき"
  },
  {
    "id": 53,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 54,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 55,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 207,
    "person": "みほ"
  },
  {
    "id": 56,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 402,
    "person": "みほ"
  },
  {
    "id": 57,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 341,
    "person": "みほ"
  },
  {
    "id": 58,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 341,
    "person": "みほ"
  },
  {
    "id": 59,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 323,
    "person": "みほ"
  },
  {
    "id": 60,
    "type": "支出",
    "date": "2026-05-04",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "交通費",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 61,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "シナモンガチャ",
    "amount": 400,
    "person": "みき"
  },
  {
    "id": 62,
    "type": "支出",
    "date": "2026-05-04",
    "category": "変動費",
    "subcategory": "特別費",
    "description": "母の日ギフト",
    "amount": 4880,
    "person": "みき"
  },
  {
    "id": 63,
    "type": "支出",
    "date": "2026-05-05",
    "category": "変動費",
    "subcategory": "食費",
    "description": "セブンイレブン",
    "amount": 709,
    "person": "みき"
  },
  {
    "id": 64,
    "type": "支出",
    "date": "2026-05-05",
    "category": "変動費",
    "subcategory": "特別費",
    "description": "結婚式二次会参加費",
    "amount": 8000,
    "person": "みき"
  },
  {
    "id": 65,
    "type": "支出",
    "date": "2026-05-05",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 7893,
    "person": "みき"
  },
  {
    "id": 66,
    "type": "支出",
    "date": "2026-05-05",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 105,
    "person": "みき"
  },
  {
    "id": 67,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "ドトール",
    "amount": 1120,
    "person": "みき"
  },
  {
    "id": 68,
    "type": "支出",
    "date": "2026-05-06",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "西友",
    "amount": 6190,
    "person": "みき"
  },
  {
    "id": 69,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "ジョナサン",
    "amount": 3804,
    "person": "みき"
  },
  {
    "id": 70,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "宝登山ロープウェイ",
    "amount": 2400,
    "person": "みき"
  },
  {
    "id": 71,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "被服費",
    "description": "ジャケット",
    "amount": 3582,
    "person": "みほ"
  },
  {
    "id": 72,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "猪鹿串焼き",
    "amount": 1600,
    "person": "みき"
  },
  {
    "id": 73,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "シュウマイ",
    "amount": 700,
    "person": "みき"
  },
  {
    "id": 74,
    "type": "支出",
    "date": "2026-05-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "わらび餅ドリンク",
    "amount": 1300,
    "person": "みき"
  },
  {
    "id": 75,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "雑費",
    "description": "動物の餌",
    "amount": 200,
    "person": "みき"
  },
  {
    "id": 76,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "雑費",
    "description": "宝登山小動物園",
    "amount": 1000,
    "person": "みき"
  },
  {
    "id": 77,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "雑費",
    "description": "謎ガチャ",
    "amount": 300,
    "person": "みほ"
  },
  {
    "id": 78,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "雑費",
    "description": "チーズのお菓子",
    "amount": 650,
    "person": "みき"
  },
  {
    "id": 79,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "ラビュー",
    "amount": 1200,
    "person": "みき"
  },
  {
    "id": 80,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 81,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "清瀬→西武秩父",
    "amount": 683,
    "person": "みき"
  },
  {
    "id": 82,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "御花畑→長瀞",
    "amount": 550,
    "person": "みき"
  },
  {
    "id": 83,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "長瀞→御花畑",
    "amount": 550,
    "person": "みき"
  },
  {
    "id": 84,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "西武秩父→清瀬",
    "amount": 683,
    "person": "みき"
  },
  {
    "id": 85,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 86,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 87,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "清瀬→西武秩父",
    "amount": 683,
    "person": "みほ"
  },
  {
    "id": 88,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "御花畑→長瀞",
    "amount": 550,
    "person": "みほ"
  },
  {
    "id": 89,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "長瀞→御花畑",
    "amount": 550,
    "person": "みほ"
  },
  {
    "id": 90,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "西武秩父→清瀬",
    "amount": 683,
    "person": "みほ"
  },
  {
    "id": 91,
    "type": "支出",
    "date": "2026-05-06",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みほ"
  },
  {
    "id": 92,
    "type": "支出",
    "date": "2026-05-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "アイス",
    "amount": 492,
    "person": "みき"
  },
  {
    "id": 93,
    "type": "支出",
    "date": "2026-05-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 814,
    "person": "みき"
  },
  {
    "id": 94,
    "type": "支出",
    "date": "2026-05-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 3019,
    "person": "みき"
  },
  {
    "id": 95,
    "type": "支出",
    "date": "2026-05-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 96,
    "type": "支出",
    "date": "2026-05-07",
    "category": "変動費",
    "subcategory": "雑費",
    "description": "会社飲み物",
    "amount": 320,
    "person": "みき"
  },
  {
    "id": 97,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "ダニ殺虫剤",
    "amount": 1800,
    "person": "みき"
  },
  {
    "id": 98,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "ブラックキャップ",
    "amount": 882,
    "person": "みき"
  },
  {
    "id": 99,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "食費",
    "description": "久兵衛屋",
    "amount": 1078,
    "person": "みき"
  },
  {
    "id": 100,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 101,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "雑費",
    "description": "会社飲み物",
    "amount": 570,
    "person": "みき"
  },
  {
    "id": 102,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 103,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→武蔵藤沢",
    "amount": 284,
    "person": "みき"
  },
  {
    "id": 104,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "音ゲー",
    "amount": 1800,
    "person": "みき"
  },
  {
    "id": 105,
    "type": "支出",
    "date": "2026-05-08",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "武蔵藤沢→清瀬",
    "amount": 284,
    "person": "みき"
  },
  {
    "id": 106,
    "type": "支出",
    "date": "2026-05-09",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 2017,
    "person": "みほ"
  },
  {
    "id": 107,
    "type": "支出",
    "date": "2026-05-09",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "BigA",
    "amount": 660,
    "person": "みき"
  },
  {
    "id": 108,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "食費",
    "description": "KALDI",
    "amount": 3148,
    "person": "みき"
  },
  {
    "id": 109,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "食費",
    "description": "チーズケーキ",
    "amount": 1690,
    "person": "みき"
  },
  {
    "id": 110,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 949,
    "person": "みき"
  },
  {
    "id": 111,
    "type": "支出",
    "date": "2026-05-10",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "Mr.MAX",
    "amount": 6595,
    "person": "みき"
  },
  {
    "id": 112,
    "type": "支出",
    "date": "2026-05-10",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "ニトリ",
    "amount": 4097,
    "person": "みき"
  },
  {
    "id": 113,
    "type": "支出",
    "date": "2026-05-10",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "seria",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 114,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "食費",
    "description": "サミット",
    "amount": 2008,
    "person": "みき"
  },
  {
    "id": 115,
    "type": "支出",
    "date": "2026-05-10",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "3coins",
    "amount": 1430,
    "person": "みき"
  },
  {
    "id": 116,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "食費",
    "description": "はま寿司",
    "amount": 4499,
    "person": "みき"
  },
  {
    "id": 117,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 118,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→所沢",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 119,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "所沢→清瀬",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 120,
    "type": "支出",
    "date": "2026-05-10",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 121,
    "type": "支出",
    "date": "2026-05-11",
    "category": "変動費",
    "subcategory": "食費",
    "description": "みき昼食",
    "amount": 450,
    "person": "みき"
  },
  {
    "id": 122,
    "type": "支出",
    "date": "2026-05-11",
    "category": "変動費",
    "subcategory": "食費",
    "description": "鶏肉",
    "amount": 411,
    "person": "みき"
  },
  {
    "id": 123,
    "type": "支出",
    "date": "2026-05-11",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 889,
    "person": "みき"
  },
  {
    "id": 124,
    "type": "支出",
    "date": "2026-05-11",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "ココフォリアブックス",
    "amount": 1070,
    "person": "みほ"
  },
  {
    "id": 125,
    "type": "支出",
    "date": "2026-05-11",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 1411,
    "person": "みき"
  },
  {
    "id": 126,
    "type": "支出",
    "date": "2026-05-12",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 780,
    "person": "みき"
  },
  {
    "id": 127,
    "type": "支出",
    "date": "2026-05-12",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 128,
    "type": "支出",
    "date": "2026-05-13",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 530,
    "person": "みき"
  },
  {
    "id": 129,
    "type": "支出",
    "date": "2026-05-13",
    "category": "固定費",
    "subcategory": "通信費",
    "description": "Jcom モバイル",
    "amount": 770,
    "person": "みき"
  },
  {
    "id": 130,
    "type": "支出",
    "date": "2026-05-14",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マクドナルド",
    "amount": 670,
    "person": "みき"
  },
  {
    "id": 131,
    "type": "支出",
    "date": "2026-05-14",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 305,
    "person": "みき"
  },
  {
    "id": 132,
    "type": "支出",
    "date": "2026-05-14",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "綿棒",
    "amount": 270,
    "person": "みき"
  },
  {
    "id": 133,
    "type": "支出",
    "date": "2026-05-14",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 145,
    "person": "みき"
  },
  {
    "id": 134,
    "type": "支出",
    "date": "2026-05-15",
    "category": "変動費",
    "subcategory": "食費",
    "description": "西友",
    "amount": 466,
    "person": "みき"
  },
  {
    "id": 135,
    "type": "支出",
    "date": "2026-05-15",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "西友",
    "amount": 548,
    "person": "みき"
  },
  {
    "id": 136,
    "type": "支出",
    "date": "2026-05-15",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "seria",
    "amount": 335,
    "person": "みき"
  },
  {
    "id": 137,
    "type": "支出",
    "date": "2026-05-15",
    "category": "変動費",
    "subcategory": "水道光熱費",
    "description": "電気",
    "amount": 2943,
    "person": "みき"
  },
  {
    "id": 138,
    "type": "支出",
    "date": "2026-05-15",
    "category": "固定費",
    "subcategory": "趣味費",
    "description": "Youtubeプレミアム",
    "amount": 1280,
    "person": "みき"
  },
  {
    "id": 139,
    "type": "支出",
    "date": "2026-05-16",
    "category": "変動費",
    "subcategory": "食費",
    "description": "タマゴ",
    "amount": 278,
    "person": "みほ"
  },
  {
    "id": 140,
    "type": "支出",
    "date": "2026-05-16",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 431,
    "person": "みき"
  },
  {
    "id": 141,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "清掃用具",
    "amount": 4126,
    "person": "みき"
  },
  {
    "id": 142,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "食費",
    "description": "ミスド",
    "amount": 1793,
    "person": "みき"
  },
  {
    "id": 143,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "皿等",
    "amount": 880,
    "person": "みき"
  },
  {
    "id": 144,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "食費",
    "description": "mio",
    "amount": 625,
    "person": "みき"
  },
  {
    "id": 145,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "食費",
    "description": "淡雪",
    "amount": 439,
    "person": "みき"
  },
  {
    "id": 146,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "バスタオル",
    "amount": 1363,
    "person": "みき"
  },
  {
    "id": 147,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "秋津→清瀬",
    "amount": 169,
    "person": "みき"
  },
  {
    "id": 148,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 149,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "秋津→清瀬",
    "amount": 169,
    "person": "みほ"
  },
  {
    "id": 150,
    "type": "支出",
    "date": "2026-05-17",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 151,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "所沢→清瀬",
    "amount": 207,
    "person": "みき"
  },
  {
    "id": 152,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 153,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 154,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→池袋",
    "amount": 323,
    "person": "みほ"
  },
  {
    "id": 155,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "池袋→所沢",
    "amount": 402,
    "person": "みほ"
  },
  {
    "id": 156,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "所沢→清瀬",
    "amount": 207,
    "person": "みほ"
  },
  {
    "id": 157,
    "type": "支出",
    "date": "2026-05-18",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 158,
    "type": "支出",
    "date": "2026-05-19",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 2992,
    "person": "みき"
  },
  {
    "id": 159,
    "type": "支出",
    "date": "2026-05-19",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 530,
    "person": "みき"
  },
  {
    "id": 160,
    "type": "支出",
    "date": "2026-05-19",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 161,
    "type": "支出",
    "date": "2026-05-20",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 530,
    "person": "みき"
  },
  {
    "id": 162,
    "type": "支出",
    "date": "2026-05-20",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 163,
    "type": "支出",
    "date": "2026-05-20",
    "category": "固定費",
    "subcategory": "住居費",
    "description": "家賃",
    "amount": 94600,
    "person": "みき"
  },
  {
    "id": 164,
    "type": "支出",
    "date": "2026-05-20",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "U-FRET",
    "amount": 580,
    "person": "みき"
  },
  {
    "id": 165,
    "type": "支出",
    "date": "2026-05-21",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 491,
    "person": "みき"
  },
  {
    "id": 166,
    "type": "支出",
    "date": "2026-05-21",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 630,
    "person": "みき"
  },
  {
    "id": 167,
    "type": "支出",
    "date": "2026-05-21",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 168,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "フライングガーデン",
    "amount": 1978,
    "person": "みき"
  },
  {
    "id": 169,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "海南鶏飯食堂",
    "amount": 1529,
    "person": "みほ"
  },
  {
    "id": 170,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 1175,
    "person": "みほ"
  },
  {
    "id": 171,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "PartyRico",
    "amount": 2618,
    "person": "みほ"
  },
  {
    "id": 172,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "サミット",
    "amount": 628,
    "person": "みほ"
  },
  {
    "id": 173,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "被服費",
    "description": "パジャマ",
    "amount": 2990,
    "person": "みほ"
  },
  {
    "id": 174,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "被服費",
    "description": "ハンカチ",
    "amount": 660,
    "person": "みほ"
  },
  {
    "id": 175,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "KALDI",
    "amount": 1001,
    "person": "みほ"
  },
  {
    "id": 176,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 177,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→所沢往復",
    "amount": 414,
    "person": "みほ"
  },
  {
    "id": 178,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みほ"
  },
  {
    "id": 179,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 180,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→武蔵藤沢往復",
    "amount": 568,
    "person": "みき"
  },
  {
    "id": 181,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オンゲキ",
    "amount": 1700,
    "person": "みき"
  },
  {
    "id": 182,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 530,
    "person": "みき"
  },
  {
    "id": 183,
    "type": "支出",
    "date": "2026-05-22",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 184,
    "type": "支出",
    "date": "2026-05-23",
    "category": "固定費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 740,
    "person": "みき"
  },
  {
    "id": 185,
    "type": "支出",
    "date": "2026-05-23",
    "category": "臨時出費",
    "subcategory": "日用品費",
    "description": "エアコン",
    "amount": 199206,
    "person": "みき"
  },
  {
    "id": 186,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "ピーラー",
    "amount": 1290,
    "person": "みき"
  },
  {
    "id": 187,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "Mr.MAX",
    "amount": 1754,
    "person": "みき"
  },
  {
    "id": 188,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "seria",
    "amount": 550,
    "person": "みき"
  },
  {
    "id": 189,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 1272,
    "person": "みき"
  },
  {
    "id": 190,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オレカバトル",
    "amount": 600,
    "person": "みほ"
  },
  {
    "id": 191,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オンゲキ",
    "amount": 200,
    "person": "みき"
  },
  {
    "id": 192,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みき"
  },
  {
    "id": 193,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→所沢往復",
    "amount": 414,
    "person": "みき"
  },
  {
    "id": 194,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 195,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 199,
    "person": "みほ"
  },
  {
    "id": 196,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→所沢往復",
    "amount": 414,
    "person": "みほ"
  },
  {
    "id": 197,
    "type": "支出",
    "date": "2026-05-23",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→家",
    "amount": 220,
    "person": "みほ"
  },
  {
    "id": 198,
    "type": "支出",
    "date": "2026-05-24",
    "category": "変動費",
    "subcategory": "食費",
    "description": "セブンイレブン",
    "amount": 490,
    "person": "みき"
  },
  {
    "id": 199,
    "type": "支出",
    "date": "2026-05-25",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 530,
    "person": "みき"
  },
  {
    "id": 200,
    "type": "支出",
    "date": "2026-05-25",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 110,
    "person": "みき"
  },
  {
    "id": 201,
    "type": "支出",
    "date": "2026-05-26",
    "category": "変動費",
    "subcategory": "水道光熱費",
    "description": "水道料金",
    "amount": 1650,
    "person": "みき"
  },
  {
    "id": 202,
    "type": "支出",
    "date": "2026-05-26",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 203,
    "type": "支出",
    "date": "2026-05-26",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 204,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 619,
    "person": "みほ"
  },
  {
    "id": 205,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "ニトリ",
    "amount": 999,
    "person": "みほ"
  },
  {
    "id": 206,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "被服費",
    "description": "ユニクロ",
    "amount": 2990,
    "person": "みほ"
  },
  {
    "id": 207,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 197,
    "person": "みき"
  },
  {
    "id": 208,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→所沢往復",
    "amount": 833,
    "person": "みほ"
  },
  {
    "id": 209,
    "type": "支出",
    "date": "2026-05-27",
    "category": "固定費",
    "subcategory": "教育費",
    "description": "奨学金",
    "amount": 26171,
    "person": "みき"
  },
  {
    "id": 210,
    "type": "支出",
    "date": "2026-05-27",
    "category": "固定費",
    "subcategory": "保険料",
    "description": "積み立てNISA",
    "amount": 40000,
    "person": "みき"
  },
  {
    "id": 211,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 730,
    "person": "みき"
  },
  {
    "id": 212,
    "type": "支出",
    "date": "2026-05-27",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 120,
    "person": "みき"
  },
  {
    "id": 213,
    "type": "支出",
    "date": "2026-05-28",
    "category": "変動費",
    "subcategory": "食費",
    "description": "BigA",
    "amount": 955,
    "person": "みき"
  },
  {
    "id": 214,
    "type": "支出",
    "date": "2026-05-28",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 215,
    "type": "支出",
    "date": "2026-05-28",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 120,
    "person": "みき"
  },
  {
    "id": 216,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "食費",
    "description": "バーミヤン",
    "amount": 1428,
    "person": "みき"
  },
  {
    "id": 217,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 218,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "清瀬→武蔵藤沢往復",
    "amount": 568,
    "person": "みき"
  },
  {
    "id": 219,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オンゲキ",
    "amount": 1800,
    "person": "みき"
  },
  {
    "id": 220,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 221,
    "type": "支出",
    "date": "2026-05-29",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 222,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "食費",
    "description": "西友",
    "amount": 917,
    "person": "みき"
  },
  {
    "id": 223,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 233,
    "person": "みき"
  },
  {
    "id": 224,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→所沢往復",
    "amount": 833,
    "person": "みき"
  },
  {
    "id": 225,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オンゲキ",
    "amount": 600,
    "person": "みき"
  },
  {
    "id": 226,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "美容費",
    "description": "美容院",
    "amount": 3700,
    "person": "みき"
  },
  {
    "id": 227,
    "type": "支出",
    "date": "2026-05-30",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "Seria",
    "amount": 220,
    "person": "みき"
  },
  {
    "id": 228,
    "type": "支出",
    "date": "2026-05-31",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 3396,
    "person": "みき"
  },
  {
    "id": 229,
    "type": "支出",
    "date": "2026-06-01",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 4777,
    "person": "みき"
  },
  {
    "id": 230,
    "type": "支出",
    "date": "2026-06-01",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 680,
    "person": "みき"
  },
  {
    "id": 231,
    "type": "支出",
    "date": "2026-06-01",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 110,
    "person": "みき"
  },
  {
    "id": 232,
    "type": "支出",
    "date": "2026-06-02",
    "category": "変動費",
    "subcategory": "雑費",
    "description": "ごみ処理費",
    "amount": 700,
    "person": "みき"
  },
  {
    "id": 233,
    "type": "支出",
    "date": "2026-06-02",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 780,
    "person": "みき"
  },
  {
    "id": 234,
    "type": "支出",
    "date": "2026-06-02",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 120,
    "person": "みき"
  },
  {
    "id": 235,
    "type": "支出",
    "date": "2026-06-03",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 630,
    "person": "みき"
  },
  {
    "id": 236,
    "type": "支出",
    "date": "2026-06-03",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 237,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "ジョナサン",
    "amount": 4176,
    "person": "みき"
  },
  {
    "id": 238,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "西友",
    "amount": 2988,
    "person": "みき"
  },
  {
    "id": 239,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "日用品費",
    "description": "西友",
    "amount": 3704,
    "person": "みき"
  },
  {
    "id": 240,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "西友",
    "amount": 1559,
    "person": "みき"
  },
  {
    "id": 241,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 630,
    "person": "みき"
  },
  {
    "id": 242,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 120,
    "person": "みき"
  },
  {
    "id": 243,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬往復",
    "amount": 398,
    "person": "みき"
  },
  {
    "id": 244,
    "type": "支出",
    "date": "2026-06-04",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→清瀬往復",
    "amount": 398,
    "person": "みほ"
  },
  {
    "id": 245,
    "type": "支出",
    "date": "2026-06-05",
    "category": "変動費",
    "subcategory": "食費",
    "description": "サイゼリヤ",
    "amount": 1840,
    "person": "みほ"
  },
  {
    "id": 246,
    "type": "支出",
    "date": "2026-06-05",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→東京",
    "amount": 731,
    "person": "みき"
  },
  {
    "id": 247,
    "type": "支出",
    "date": "2026-06-05",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "三越前→家",
    "amount": 731,
    "person": "みき"
  },
  {
    "id": 248,
    "type": "支出",
    "date": "2026-06-05",
    "category": "変動費",
    "subcategory": "交通費",
    "description": "家→所沢往復",
    "amount": 812,
    "person": "みほ"
  },
  {
    "id": 249,
    "type": "支出",
    "date": "2026-06-05",
    "category": "変動費",
    "subcategory": "趣味費",
    "description": "オレカバトル",
    "amount": 3000,
    "person": "みほ"
  },
  {
    "id": 250,
    "type": "支出",
    "date": "2026-06-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 3749,
    "person": "みき"
  },
  {
    "id": 251,
    "type": "支出",
    "date": "2026-06-06",
    "category": "変動費",
    "subcategory": "食費",
    "description": "マルエツ",
    "amount": 319,
    "person": "みき"
  },
  {
    "id": 252,
    "type": "支出",
    "date": "2026-06-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "コンビニ",
    "amount": 906,
    "person": "みき"
  },
  {
    "id": 253,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "家→国際展示場",
    "amount": 1110,
    "person": "みき"
  },
  {
    "id": 254,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "家→国際展示場",
    "amount": 1110,
    "person": "みほ"
  },
  {
    "id": 255,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "ビッグサイト→家",
    "amount": 1025,
    "person": "みき"
  },
  {
    "id": 256,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "交通費",
    "description": "ビッグサイト→家",
    "amount": 1025,
    "person": "みほ"
  },
  {
    "id": 257,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "趣味費",
    "description": "コミティアカタログ",
    "amount": 1500,
    "person": "みき"
  },
  {
    "id": 258,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "趣味費",
    "description": "コミティアカタログ",
    "amount": 1500,
    "person": "みほ"
  },
  {
    "id": 259,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "趣味費",
    "description": "コミティア",
    "amount": 10000,
    "person": "みき"
  },
  {
    "id": 260,
    "type": "支出",
    "date": "2026-06-07",
    "category": "旅費",
    "subcategory": "趣味費",
    "description": "コミティア",
    "amount": 20000,
    "person": "みほ"
  },
  {
    "id": 261,
    "type": "支出",
    "date": "2026-06-07",
    "category": "変動費",
    "subcategory": "食費",
    "description": "旭寿司",
    "amount": 3300,
    "person": "みき"
  },
  {
    "id": 262,
    "type": "支出",
    "date": "2026-06-08",
    "category": "変動費",
    "subcategory": "食費",
    "description": "社食",
    "amount": 730,
    "person": "みき"
  },
  {
    "id": 263,
    "type": "支出",
    "date": "2026-06-08",
    "category": "変動費",
    "subcategory": "食費",
    "description": "飲み物",
    "amount": 180,
    "person": "みき"
  },
  {
    "id": 264,
    "type": "収入",
    "date": "2026-05-25",
    "category": "給与",
    "subcategory": "",
    "description": "給与",
    "amount": 415192,
    "person": "みき"
  },
  {
    "id": 265,
    "type": "収入",
    "date": "2026-06-07",
    "category": "臨時収入",
    "subcategory": "",
    "description": "臨時収入",
    "amount": 30000,
    "person": "みき"
  }
];
