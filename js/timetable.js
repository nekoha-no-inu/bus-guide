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

// ページ読み込み時に今日をセット
window.onload = setToday;

// 時刻表表示
async function loadTimetable() {
  const date = document.getElementById("dateInput").value;
  const line = document.getElementById("lineSelect").value;
  const direction = document.getElementById("directionSelect").value;

  const schedules = await loadCSV("data/schedules.csv");

  const dayType = getDayType(date);

  const filtered = schedules.filter(s =>
    s.route === line &&
    s.direction === direction &&
    s.day_type === dayType
  );

  const result = document.getElementById("result");
  result.innerHTML = "";

  // ★ JSON：バスがない場合
  if (filtered.length === 0) {
    const msg = await getMessage("timetable", "noBus");
    document.getElementById("bubble").innerHTML = msg.text;
    setCharacterExpression(msg.expression);
    return;
  }

  // ★ JSON：バスがある場合
  const msg = await getMessage("timetable", "found", null, {
    line,
    count: filtered.length
  });
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);

  // --- 以下は元の表示処理 ---
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

