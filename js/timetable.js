// ======================================
// timetable.js  ─  時刻表
// ======================================

const STATION_STOPS = ["清瀬駅北口", "新座駅南口"];

// ---- CSV 読み込み ----

async function loadCSV(path) {
  const text    = await fetch(path).then(r => r.text());
  const lines   = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, cols[i]]));
  });
}

// ---- 曜日種別判定 ----

function getDayType(dateStr) {
  const day = new Date(dateStr).getDay();
  if (day === 0) return "休日";
  if (day === 6) return "土曜";
  return "平日";
}

// ---- 今日の日付をセット ----

function setToday() {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  document.getElementById("dateInput").value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// ---- プルダウン更新 ----

async function updateStops() {
  const routes = await loadCSV("data/routes.csv");

  const homeStops    = [...new Set(routes.filter(r => r.mode.startsWith("自宅→")).map(r => r.stop))];
  const stationStops = [...new Set(routes.filter(r => r.mode.endsWith("→自宅")).map(r => r.stop))];

  const sel = document.getElementById("stopSelect");
  sel.innerHTML = "";
  [...homeStops, ...stationStops].forEach(st => {
    const opt       = document.createElement("option");
    opt.value       = st;
    opt.textContent = st;
    sel.appendChild(opt);
  });

  await updateGetoff();
}

async function updateGetoff() {
  const routes   = await loadCSV("data/routes.csv");
  const stop     = document.getElementById("stopSelect").value;

  const homeStops    = [...new Set(routes.filter(r => r.mode.startsWith("自宅→")).map(r => r.stop))];
  const stationStops = [...new Set(routes.filter(r => r.mode.endsWith("→自宅")).map(r => r.stop))];

  const list = stationStops.includes(stop) ? homeStops : stationStops;

  const sel = document.getElementById("getoffSelect");
  sel.innerHTML = "";
  list.forEach(g => {
    const opt       = document.createElement("option");
    opt.value       = g;
    opt.textContent = g;
    sel.appendChild(opt);
  });
}

// ---- 時刻表表示 ----

async function loadTimetable() {
  const date   = document.getElementById("dateInput").value;
  const stop   = document.getElementById("stopSelect").value;
  const getoff = document.getElementById("getoffSelect").value;

  const [routes, schedules] = await Promise.all([
    loadCSV("data/routes.csv"),
    loadCSV("data/schedules.csv")
  ]);

  const dayType = getDayType(date);

  let line, direction, searchStop;

  if (STATION_STOPS.includes(stop)) {
    // 駅発 → 自宅方向
    const dirFromHome = stop === "清瀬駅北口" ? "清瀬駅方向" : "新座駅方向";
    const routeRow    = routes.find(r => r.stop === getoff && r.direction === dirFromHome);
    if (!routeRow) {
      console.warn("routeRow not found (station origin)", stop, getoff);
      return;
    }
    line       = routeRow.line;
    direction  = "自宅方向";
    searchStop = stop;
  } else {
    // 自宅発 → 駅方向
    const dirToStation = getoff === "清瀬駅北口" ? "清瀬駅方向" : "新座駅方向";
    const routeRow     = routes.find(r => r.stop === stop && r.direction === dirToStation);
    if (!routeRow) {
      console.warn("routeRow not found (home origin)", stop, getoff);
      return;
    }
    line       = routeRow.line;
    direction  = dirToStation;
    searchStop = stop;
  }

  const filtered = schedules.filter(s =>
    s.route     === line      &&
    s.direction === direction &&
    s.stop      === searchStop &&
    s.day_type  === dayType
  );

  const result = document.getElementById("result");
  result.innerHTML = "";

  if (filtered.length === 0) {
    const msg = await getMessage("timetable", "noBus");
    document.getElementById("bubble").innerHTML = msg.text;
    setCharacterExpression(msg.expression);
    return;
  }

  const msg = await getMessage("timetable", "found", null, {
    stop, getoff, line, count: filtered.length
  });
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);

  // 時刻表を「時」ごとにまとめて表示
  const byHour = {};
  filtered.forEach(s => {
    const [h, m] = s.depart_time.split(":");
    (byHour[h] ??= []).push(m);
  });

  for (const hour of Object.keys(byHour).sort()) {
    const card  = document.createElement("div");
    card.className = "time-card";
    card.innerHTML = `<h3>${hour}時</h3>`;

    const list = document.createElement("div");
    list.className = "time-list";
    byHour[hour].sort().forEach(min => {
      const item       = document.createElement("div");
      item.className   = "time-item";
      item.textContent = `${hour}:${min}`;
      list.appendChild(item);
    });

    card.appendChild(list);
    result.appendChild(card);
  }
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  setToday();
  await updateStops();
});
