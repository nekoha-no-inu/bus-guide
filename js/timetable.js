// ======================================
// timetable.js  ─  バス時刻表（リメイク版）
// ======================================

let _routes    = [];
let _schedules = [];

// ---- CSV 読み込み ----

async function loadAllCSV() {
  const parse = text => {
    const lines  = text.trim().split("\n");
    const header = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim());
      return Object.fromEntries(header.map((h, i) => [h, cols[i]]));
    });
  };

  [_routes, _schedules] = await Promise.all([
    fetch("data/routes.csv").then(r => r.text()).then(parse),
    fetch("data/schedules.csv").then(r => r.text()).then(parse)
  ]);
}

// ---- 系統グループ："清61-1" → "清61"、"深夜" はそのまま ----

function routeGroup(line) {
  return line.replace(/-\d+$/, "");
}

// ---- 曜日判定 ----

function getDayType(dateStr) {
  const d = new Date(dateStr);
  if (d.getDay() === 0) return "休日";
  if (d.getDay() === 6) return "土曜";
  return "平日";
}

// ---- 今日の日付をセット ----

function setToday() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  document.getElementById("dateInput").value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ---- 乗車バス停プルダウンを構築 ----

function buildStopSelect() {
  // 自宅周辺バス停（routes.csvの自宅→ or 駅→自宅の乗車バス停）
  const fromHome    = [...new Set(_routes.filter(r => r.mode.startsWith("自宅→")).map(r => r.stop))];
  const fromStation = [...new Set(_routes.filter(r => r.mode.endsWith("→自宅")).map(r => r.stop))];

  const sel = document.getElementById("stopSelect");
  sel.innerHTML = "";

  const addGroup = (label, stops) => {
    const grp = document.createElement("optgroup");
    grp.label = label;
    stops.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  };

  addGroup("自宅周辺バス停", fromHome);
  addGroup("駅", fromStation);

  updateDirection();
}

// ---- 方向プルダウンを更新 ----

function updateDirection() {
  const stop = document.getElementById("stopSelect").value;
  const sel  = document.getElementById("directionSelect");
  sel.innerHTML = "";

  // このバス停が routes.csv に登場するすべての方向を列挙
  const directions = [...new Set(
    _routes.filter(r => r.stop === stop).map(r => r.direction)
  )];

  directions.forEach(dir => {
    const opt = document.createElement("option");
    opt.value = dir;

    // 表示名：「清瀬駅方向 → 清瀬駅行き」のように変換
    const label = dir === "清瀬駅方向" ? "清瀬駅行き（清瀬駅北口方向）"
                : dir === "新座駅方向" ? "新座駅行き（新座駅南口方向）"
                : dir;
    opt.textContent = label;
    sel.appendChild(opt);
  });
}

// ---- 時刻表表示 ----

function loadTimetable() {
  const dateStr   = document.getElementById("dateInput").value;
  const stop      = document.getElementById("stopSelect").value;
  const direction = document.getElementById("directionSelect").value;

  if (!dateStr || !stop || !direction) return;

  const dayType = getDayType(dateStr);
  const result  = document.getElementById("result");
  result.innerHTML = "";

  // このバス停・この方向を通るすべての系統をグループ化して取得
  // グループキー = routeGroup(line)
  const groupMap = {};   // { "清61": { "清61": [...], "清61-1": [...], ... }, ... }

  _schedules
    .filter(s => s.stop === stop && s.direction === direction && s.day_type === dayType)
    .forEach(s => {
      const grp = routeGroup(s.route);
      if (!groupMap[grp]) groupMap[grp] = {};
      if (!groupMap[grp][s.route]) groupMap[grp][s.route] = [];
      groupMap[grp][s.route].push(s.depart_time);
    });

  if (Object.keys(groupMap).length === 0) {
    result.innerHTML = "<p>この条件での時刻表は見つからなかったよ。</p>";
    document.getElementById("bubble").innerHTML = "バスが見つからなかったよ…日付や方向を確認してね。";
    setCharacterExpression("relax");
    return;
  }

  document.getElementById("bubble").innerHTML =
    `${stop}（${direction === "清瀬駅方向" ? "清瀬駅行き" : "新座駅行き"}）<br>${dayType}ダイヤだよ📋`;
  setCharacterExpression("normal");

  // グループ順（清61 → 清62 → …）でテーブルを生成
  Object.keys(groupMap).sort().forEach(grp => {
    const lines    = groupMap[grp];
    const mainLine = grp;

    // 全系統の全時刻を「時:分 + 系統タグ」で収集
    // { "06": [ {min:"15", line:"清61"}, {min:"25", line:"清61-1"}, ... ] }
    const byHour = {};

    Object.entries(lines).forEach(([line, times]) => {
      times.forEach(t => {
        const [h, m] = t.split(":");
        const hour   = h.padStart(2, "0");
        const min    = m.padStart(2, "0");
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push({ min, line });
      });
    });

    // 同じ時刻で複数系統が重なる場合を整理
    // 同時刻は「出発時刻+系統」で dedup してから分ごとにソート
    Object.keys(byHour).forEach(h => {
      const seen = new Set();
      byHour[h] = byHour[h]
        .filter(item => {
          const key = `${item.min}-${item.line}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.min.localeCompare(b.min));
    });

    // ---- テーブル描画 ----
    const section = document.createElement("div");
    section.className = "timetable-section";

    const title = document.createElement("h3");
    title.className = "timetable-title";
    title.textContent = `${grp} 系統`;
    section.appendChild(title);

    // 枝番の凡例
    const subLines = Object.keys(lines).filter(l => l !== mainLine);
    if (subLines.length > 0) {
      const legend = document.createElement("div");
      legend.className = "timetable-legend";
      legend.innerHTML = subLines.map(l =>
        `<span class="sub-badge sub-badge-${l.replace(/[^a-zA-Z0-9]/g, "")}">${l}</span> = ${l}系統`
      ).join("　");
      section.appendChild(legend);
    }

    // 時刻グリッド
    const table = document.createElement("div");
    table.className = "timetable-grid";

    Object.keys(byHour).sort().forEach(hour => {
      const row = document.createElement("div");
      row.className = "timetable-row";

      const hourCell = document.createElement("div");
      hourCell.className = "timetable-hour";
      hourCell.textContent = `${parseInt(hour)}`;
      row.appendChild(hourCell);

      const minsCell = document.createElement("div");
      minsCell.className = "timetable-mins";

      byHour[hour].forEach(({ min, line }) => {
        const item = document.createElement("span");
        item.className = "time-item";

        const timeSpan = document.createElement("span");
        timeSpan.textContent = min;
        item.appendChild(timeSpan);

        // 枝番バッジ
        if (line !== mainLine) {
          const badge = document.createElement("sup");
          badge.className = `sub-badge sub-badge-${line.replace(/[^a-zA-Z0-9]/g, "")}`;
          badge.textContent = line.replace(mainLine, "");  // "-1", "-3" などだけ表示
          item.appendChild(badge);
        }

        minsCell.appendChild(item);
      });

      row.appendChild(minsCell);
      table.appendChild(row);
    });

    section.appendChild(table);
    result.appendChild(section);
  });
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  await loadAllCSV();
  setToday();
  buildStopSelect();
});
