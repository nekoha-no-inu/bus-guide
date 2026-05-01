// CSV 読み込み
async function loadCSV(path) {
  const res = await fetch(path);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i]);
    return obj;
  });
}

// 平日/土曜/休日の判定
function getDayType(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  if (day === 0) return "休日";
  if (day === 6) return "土曜";
  return "平日";
}

// 今日に設定
function setToday() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  document.getElementById("dateInput").value = `${yyyy}-${mm}-${dd}`;
}

// 時刻表表示
async function loadTimetable() {
  const date   = document.getElementById("dateInput").value;
  const stop   = document.getElementById("stopSelect").value;     // 出発バス停
  const getoff = document.getElementById("getoffSelect").value;   // 到着バス停

  const routes    = await loadCSV("data/routes.csv");
  const schedules = await loadCSV("data/schedules.csv");
  const dayType   = getDayType(date);

  const STATION_STOPS = ["清瀬駅北口", "新座駅南口"];
  const HOME_STOPS   = ["下清戸", "台田", "下清戸二丁目", "台田団地中央"];

  let line;       // 清61〜清64
  let direction;  // 清瀬駅方向 / 新座駅方向 / 自宅方向
  let searchStop; // schedules.csv の stop に入る値

  // ★ 駅発（清瀬駅北口 / 新座駅南口）のとき
  if (STATION_STOPS.includes(stop)) {
    // 到着バス停（自宅側）から route（line）を決める
    const dirFromHome =
      stop === "清瀬駅北口" ? "清瀬駅方向" : "新座駅方向";

    const routeRow = routes.find(r =>
      r.stop === getoff && r.direction === dirFromHome
    );
    if (!routeRow) {
      console.warn("routeRow not found (station origin)", stop, getoff);
      return;
    }

    line      = routeRow.line;     // 清61〜清64
    direction = "自宅方向";        // 駅 → 自宅
    searchStop = stop;             // schedules の stop は「駅」

  } else {
    // ★ 自宅発（下清戸 / 台田 / 下清戸二丁目 / 台田団地中央）のとき
    const dirToStation =
      getoff === "清瀬駅北口" ? "清瀬駅方向" : "新座駅方向";

    const routeRow = routes.find(r =>
      r.stop === stop && r.direction === dirToStation
    );
    if (!routeRow) {
      console.warn("routeRow not found (home origin)", stop, getoff);
      return;
    }

    line       = routeRow.line;      // 清61〜清64
    direction  = dirToStation;       // 自宅 → 駅
    searchStop = stop;               // schedules の stop は「自宅側」
  }

  // ★ schedules.csv を検索
  const filtered = schedules.filter(s =>
    s.route     === line &&
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
    stop,
    getoff,
    line,
    count: filtered.length
  });
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);

  const byHour = {};
  filtered.forEach(s => {
    const [h, m] = s.depart_time.split(":");
    if (!byHour[h]) byHour[h] = [];
    byHour[h].push(m);
  });

  for (const hour of Object.keys(byHour).sort()) {
    const card = document.createElement("div");
    card.className = "time-card";
    card.innerHTML = `<h3>${hour}時</h3>`;

    const list = document.createElement("div");
    list.className = "time-list";

    byHour[hour].sort().forEach(min => {
      const item = document.createElement("div");
      item.className = "time-item";
      item.textContent = `${hour}:${min}`;
      list.appendChild(item);
    });

    card.appendChild(list);
    result.appendChild(card);
  }
}


async function updateStops() {
  const routes = await loadCSV("data/routes.csv");

  // 自宅側の停留所
  const homeStops = [...new Set(
    routes.filter(r => r.mode.startsWith("自宅→"))
          .map(r => r.stop)
  )];

  // 駅側の停留所
  const stationStops = [...new Set(
    routes.filter(r => r.mode.endsWith("→自宅"))
          .map(r => r.stop)
  )];

  const sel = document.getElementById("stopSelect");
  sel.innerHTML = "";

  // 自宅側 + 駅側をまとめて表示
  [...homeStops, ...stationStops].forEach(st => {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    sel.appendChild(opt);
  });

  updateGetoff();
}

async function updateGetoff() {
  const routes = await loadCSV("data/routes.csv");
  const stop = document.getElementById("stopSelect").value;

  // 自宅側
  const homeStops = [...new Set(
    routes.filter(r => r.mode.startsWith("自宅→"))
          .map(r => r.stop)
  )];

  // 駅側
  const stationStops = [...new Set(
    routes.filter(r => r.mode.endsWith("→自宅"))
          .map(r => r.stop)
  )];

  const sel = document.getElementById("getoffSelect");
  sel.innerHTML = "";

  let list = [];

  if (stationStops.includes(stop)) {
    // 駅発 → 自宅側へ
    list = homeStops;
  } else {
    // 自宅発 → 駅側へ
    list = stationStops;
  }

  list.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    sel.appendChild(opt);
  });
}



function buildGetoffMap(routes) {
  const map = {}; // { 出発バス停: [行先バス停] }

  routes.forEach(r => {
    const from = r.stop;

    // ★ 自宅 → 駅方向
    if (r.mode.startsWith("自宅→")) {
      // 行先は駅のバス停（同じ line で 駅→自宅 の stop）
      const pair = routes.find(p =>
        p.line === r.line &&
        p.mode.endsWith("→自宅")
      );
      if (!pair) return;

      const to = pair.stop;

      if (!map[from]) map[from] = [];
      if (!map[from].includes(to)) map[from].push(to);
    }

    // ★ 駅 → 自宅方向
    if (r.mode.endsWith("→自宅")) {
      // 行先は自宅側のバス停（同じ line で 自宅→駅 の stop）
      const pair = routes.find(p =>
        p.line === r.line &&
        p.mode.startsWith("自宅→")
      );
      if (!pair) return;

      const to = pair.stop;

      if (!map[from]) map[from] = [];
      if (!map[from].includes(to)) map[from].push(to);
    }
  });

  return map;
}



// ページ読み込み時に今日をセット

window.onload = async () => {
  setToday();
  await updateStops();   // ★ これがないと stopSelect が空のまま
  await updateGetoff();   // ★ これがないと getoffSelect が空のまま
};
