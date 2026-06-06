// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];
let routes      = [];
let schedules   = [];

// ---- データ読み込み ----

async function loadHolidays() {
  const data  = await fetch(HOLIDAY_API).then(r => r.json());
  holidayList = data.items
    .filter(ev => ev.start?.date)
    .map(ev => ev.start.date);
}

async function loadCSV() {
  const parse = text => {
    const lines  = text.trim().split("\n");
    const header = lines[0].split(",").map(h => h.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim());
      return Object.fromEntries(header.map((h, i) => [h, cols[i]]));
    });
  };

  [routes, schedules] = await Promise.all([
    fetch("data/routes.csv").then(r => r.text()).then(parse),
    fetch("data/schedules.csv").then(r => r.text()).then(parse)
  ]);
}

// ---- 祝日・曜日判定 ----

function isHoliday(date) {
  const key = date.toISOString().slice(0, 10);
  return holidayList.includes(key);
}

function getDayType(date) {
  if (isHoliday(date)) return "休日";
  const day = date.getDay();
  if (day === 0) return "休日";
  if (day === 6) return "土曜";
  return "平日";
}

// ---- 時刻変換ユーティリティ ----

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// ---- datetime-local フォーマット ----

function formatDateTimeLocal(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---- バス検索メイン ----

async function searchBus() {
  const datetime = document.getElementById("datetime").value;

  if (!datetime) {
    document.getElementById("bubble").innerHTML = "日時を入力してね。";
    return;
  }

  const dt       = new Date(datetime);
  const startMin = dt.getHours() * 60 + dt.getMinutes();
  const mode     = document.querySelector("#modeButtons .active").dataset.mode;
  const dayType  = getDayType(dt);

  document.getElementById("dayTypeDisplay").innerText = `この日は「${dayType}」ダイヤです`;

  const isFromHome = mode.startsWith("自宅→");
  const isToHome   = mode.endsWith("→自宅");

  // 各ルートで乗れる最初のバスを探す
  const candidates = routes
    .filter(r => r.mode === mode)
    .flatMap(r => {
      const walkArrive = startMin + Number(r.walk_min);

      const list = schedules.filter(s =>
        s.route     === r.line      &&
        s.stop      === r.stop      &&
        s.direction === r.direction &&
        s.day_type  === dayType     &&
        toMinutes(s.depart_time) >= walkArrive
      );

      if (list.length === 0) return [];

      const nextBus  = list[0];
      const busDepart = toMinutes(nextBus.depart_time);
      const arrive   = busDepart + Number(r.ride_min);

      const pairMode = isFromHome ? (p => p.mode.endsWith("→自宅")) : (p => p.mode.startsWith("自宅→"));
      const pair     = routes.find(r2 => r2.line === r.line && pairMode(r2));
      const getoffStop = pair?.stop ?? "";

      return [{
        line: r.line, stop: r.stop, getoff: getoffStop,
        depart: nextBus.depart_time, arrive: minutesToTime(arrive),
        walk: r.walk_min, ride: r.ride_min
      }];
    });

  candidates.sort((a, b) => toMinutes(a.arrive) - toMinutes(b.arrive));

  // ---- 結果カード ----
  const results = document.getElementById("results");
  results.innerHTML = "";

  candidates.forEach((c, i) => {
    const detailText = isFromHome
      ? _homeDetailText(c)
      : _stationDetailText(c);

    results.innerHTML += `
      <div class="result">
        <h3>${i === 0 ? "【最速】" : ""}${c.line}（${c.stop}）</h3>
        ${detailText}
      </div>
    `;
  });

  if (candidates.length === 0) return;

  // ---- ルートカード ----
  const best        = candidates[0];
  const routeCard   = document.getElementById("routeCard");
  routeCard.style.display = "block";

  const stationName = mode.includes("清瀬駅") ? "清瀬駅" : "新座駅";
  routeCard.innerHTML = isFromHome
    ? _homeRouteCard(best, stationName)
    : _stationRouteCard(best, stationName);

  // ---- セリフ ----
  const departMin = toMinutes(best.depart);
  const diff      = departMin - startMin;
  const leaveDiff = diff - Number(best.walk);
  const walkComment = Number(best.walk) >= 10 ? "<br>歩く時間が長いから気をつけてね。" : "";

  let message, expression;

  if (isFromHome) {
    if (leaveDiff <= 10) {
      message    = `あと<b>${leaveDiff}分</b>で家を出て、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に乗ってね。<br>急げば間に合うよ！<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "hurry";
    } else if (leaveDiff <= 20) {
      message    = `<b>${leaveDiff}分後</b>に家を出れば、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に余裕で間に合うよ。<br>ちょうどいいタイミングだよ。<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `<b>${leaveDiff}分後</b>に家を出れば、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に間に合うよ。<br>のんびり準備して大丈夫だよ。<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  } else {
    if (diff <= 10) {
      message    = `<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に乗れば、早く家に帰れるよ。<br>ちょうどいいタイミングだよ！<br>家に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統が一番早いよ。<br>ちょっと待ち時間が長いね…<br>家に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  }

  document.getElementById("bubble").innerHTML = message + walkComment;
  setCharacterExpression(expression);
}

// ---- カードHTML生成ヘルパー ----

function _homeDetailText(c) {
  const leaveTime = minutesToTime(toMinutes(c.depart) - Number(c.walk));
  return `家を出る時刻：<b>${leaveTime}</b><br>バス発車時刻：<b>${c.depart}</b><br>駅到着時刻：<b>${c.arrive}</b><br>徒歩 ${c.walk}分 + 乗車 ${c.ride}分`;
}

function _stationDetailText(c) {
  const finalArrive = minutesToTime(toMinutes(c.arrive) + Number(c.walk));
  return `バス到着時刻：<b>${c.arrive}</b>（${c.getoff}）<br>自宅到着時刻：<b>${finalArrive}</b><br>乗車 ${c.ride}分 + 徒歩 ${c.walk}分`;
}

function _homeRouteCard(best, stationName) {
  const leaveTime = minutesToTime(toMinutes(best.depart) - Number(best.walk));
  return `<b>自宅</b> ： ${leaveTime}<br>↓ 徒歩 ${best.walk}分<br><b>${best.stop}</b> ： ${best.depart}<br>↓ 乗車 ${best.ride}分<br><b>${stationName}</b> ： ${best.arrive}`;
}

function _stationRouteCard(best, stationName) {
  const finalArrive = minutesToTime(toMinutes(best.arrive) + Number(best.walk));
  return `<b>${stationName}</b> ： ${best.depart}<br>↓ 乗車 ${best.ride}分<br><b>${best.getoff}</b> ： ${best.arrive}<br>↓ 徒歩 ${best.walk}分<br><b>自宅</b> ： ${finalArrive}`;
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  document.getElementById("bubble").innerHTML = "行き先と日時を選んで検索してね！";

  await Promise.all([loadCSV(), loadHolidays()]);

  document.getElementById("datetime").value = formatDateTimeLocal(new Date());

  document.querySelectorAll("#modeButtons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeButtons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("nowButton").addEventListener("click", () => {
    document.getElementById("datetime").value = formatDateTimeLocal(new Date());
  });
});
