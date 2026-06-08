// ======================================
// timetable.js  ─  バス時刻表
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

// ---- 系統グループ ----

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

function setToday() {
  const now = new Date();
  const p   = n => String(n).padStart(2, "0");
  document.getElementById("dateInput").value =
    `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
}

// ---- ルートボタンを生成 ----
// routes.csv の (stop → getoff) の組み合わせをユニークに列挙してボタン化

function buildRouteButtons() {
  // stop→getoff の重複を除いた組み合わせリスト
  const seen = new Set();
  const combos = [];

  _routes.forEach(r => {
    if (!r.getoff) return;
    const key = `${r.stop}→${r.getoff}`;
    if (!seen.has(key)) {
      seen.add(key);
      combos.push({ stop: r.stop, getoff: r.getoff, direction: r.direction });
    }
  });

  const container = document.getElementById("routeButtons");
  container.innerHTML = "";

  combos.forEach(({ stop, getoff, direction }) => {
    const btn = document.createElement("button");
    btn.className   = "route-select-btn";
    btn.textContent = `${stop} → ${getoff}`;
    btn.dataset.stop      = stop;
    btn.dataset.getoff    = getoff;
    btn.dataset.direction = direction;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".route-select-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadTimetable(stop, direction);
    });
    container.appendChild(btn);
  });
}

// ---- 時刻表表示 ----

function loadTimetable(stop, direction) {
  const dateStr = document.getElementById("dateInput").value;
  if (!dateStr) {
    alert("日付を選んでね。");
    return;
  }

  const dayType = getDayType(dateStr);
  const result  = document.getElementById("result");
  result.innerHTML = "";

  // 該当するすべての系統・時刻を収集してグループ化
  const groupMap = {};  // { "清61": { "清61": [times], "清61-1": [times] }, ... }

  _schedules
    .filter(s => s.stop === stop && s.direction === direction && s.day_type === dayType)
    .forEach(s => {
      const g = routeGroup(s.route);
      if (!groupMap[g]) groupMap[g] = {};
      if (!groupMap[g][s.route]) groupMap[g][s.route] = [];
      groupMap[g][s.route].push(s.depart_time);
    });

  document.getElementById("timetableHeader").innerHTML =
    `<b>${stop} → （${direction === "清瀬駅方向" ? "清瀬駅行き" : "新座駅行き"}）</b>　${dayType}ダイヤ`;

  if (Object.keys(groupMap).length === 0) {
    result.innerHTML = "<p>この条件での時刻表はないよ。</p>";
    document.getElementById("bubble").innerHTML = "バスが見つからなかったよ…日付を確認してね。";
    setCharacterExpression("relax");
    return;
  }

  document.getElementById("bubble").innerHTML =
    `${stop}（${direction === "清瀬駅方向" ? "清瀬駅行き" : "新座駅行き"}）<br>${dayType}ダイヤの時刻表だよ📋`;
  setCharacterExpression("normal");

  Object.keys(groupMap).sort().forEach(grp => {
    const lines    = groupMap[grp];
    const mainLine = grp;

    // 時ごとに { min, line } を集める
    const byHour = {};
    Object.entries(lines).forEach(([line, times]) => {
      times.forEach(t => {
        const [hRaw, mRaw] = t.split(":");
        const h = hRaw.padStart(2, "0");
        const m = mRaw.padStart(2, "0");
        if (!byHour[h]) byHour[h] = [];
        byHour[h].push({ min: m, line });
      });
    });

    // dedup & sort
    Object.keys(byHour).forEach(h => {
      const seen = new Set();
      byHour[h] = byHour[h]
        .filter(item => {
          const k = `${item.min}-${item.line}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .sort((a, b) => a.min.localeCompare(b.min));
    });

    // セクション
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
      legend.innerHTML = subLines.map(l => {
        const suffix = l.replace(mainLine, "");
        return `<span class="sub-badge sub-badge-${l.replace(/[^a-zA-Z0-9]/g, "")}">${suffix}</span> = ${l}系統`;
      }).join("　");
      section.appendChild(legend);
    }

    // グリッド
    const table = document.createElement("div");
    table.className = "timetable-grid";

    Object.keys(byHour).sort().forEach(hour => {
      const row = document.createElement("div");
      row.className = "timetable-row";

      const hourCell = document.createElement("div");
      hourCell.className   = "timetable-hour";
      hourCell.textContent = String(parseInt(hour));
      row.appendChild(hourCell);

      const minsCell = document.createElement("div");
      minsCell.className = "timetable-mins";

      byHour[hour].forEach(({ min, line }) => {
        const item = document.createElement("span");
        item.className = "time-item";

        const timeSpan       = document.createElement("span");
        timeSpan.textContent = min;
        item.appendChild(timeSpan);

        if (line !== mainLine) {
          const badge       = document.createElement("sup");
          const suffix      = line.replace(mainLine, "");
          badge.className   = `sub-badge sub-badge-${line.replace(/[^a-zA-Z0-9]/g, "")}`;
          badge.textContent = suffix;
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
  buildRouteButtons();
});
