// ----------------------------
// Google 日本の祝日 API
// ----------------------------
const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];

async function loadHolidays() {
  const res = await fetch(HOLIDAY_API);
  const data = await res.json();

  holidayList = data.items
    .filter(ev => ev.start && ev.start.date)
    .map(ev => ev.start.date);
}

// ----------------------------
// CSV 読み込み
// ----------------------------
let routes = [];
let schedules = [];

async function loadCSV() {
  routes = await fetch("data/routes.csv").then(r => r.text()).then(parseCSV);
  schedules = await fetch("data/schedules.csv").then(r => r.text()).then(parseCSV);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    header.forEach((h,i)=> obj[h] = cols[i]);
    return obj;
  });
}

// ----------------------------
// 祝日判定
// ----------------------------
function isHoliday(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const key = `${y}-${m}-${d}`;
  return holidayList.includes(key);
}

function getDayType(date) {
  const day = date.getDay();
  if (isHoliday(date)) return "休日";
  if (day === 0) return "休日";
  if (day === 6) return "土曜";
  return "平日";
}

// ----------------------------
// datetime-local 用フォーマット
// ----------------------------
function formatDateTimeLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

// ----------------------------
// 時刻変換
// ----------------------------
function toMinutes(t) {
  const [h,m] = t.split(":").map(Number);
  return h*60 + m;
}
function minutesToTime(m) {
  const h = String(Math.floor(m/60)).padStart(2,"0");
  const mm = String(m%60).padStart(2,"0");
  return `${h}:${mm}`;
}

// ----------------------------
// 表情差分
// ----------------------------
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  if (type === "hurry") img.src = "img/character_hurry.png";
  else if (type === "relax") img.src = "img/character_relax.png";
  else img.src = "img/character_normal.png";
}

// ----------------------------
// メイン処理（transfer.html 専用）
// ----------------------------
async function searchBus() {
  const datetime = document.getElementById("datetime").value;

  if (!datetime) {
    document.getElementById("bubble").innerHTML = "日時を入力してね。";
    return;
  }

  // datetime-local → Date
  const dt = new Date(datetime);
  const startMin = dt.getHours() * 60 + dt.getMinutes();

  const mode = document.querySelector("#modeButtons .active").dataset.mode;
  const dayType = getDayType(dt);

  const isFromHome = mode.startsWith("自宅→");
  const isToHome   = mode.endsWith("→自宅");

  document.getElementById("dayTypeDisplay").innerText =
    `この日は「${dayType}」ダイヤです`;

  const candidates = [];

  // ----------------------------
  // ★ 旧版のロジックを完全復元
  // ----------------------------
  routes.filter(r => r.mode === mode).forEach(r => {
    const walkArrive = startMin + Number(r.walk_min);

    const list = schedules.filter(s =>
      s.route === r.line &&
      s.stop === r.stop &&
      s.direction === r.direction &&
      s.day_type === dayType &&
      toMinutes(s.depart_time) >= walkArrive
    );

    if (list.length === 0) return;

    const nextBus = list[0];
    const busDepart = toMinutes(nextBus.depart_time);
    const arrive = busDepart + Number(r.ride_min);

    // ★ 降車バス停の自動判定（旧版のまま）
    let getoffStop = "";

    if (isFromHome) {
      const pair = routes.find(r2 =>
        r2.line === r.line &&
        r2.mode.endsWith("→自宅")
      );
      if (pair) getoffStop = pair.stop;
    }

    if (isToHome) {
      const pair = routes.find(r2 =>
        r2.line === r.line &&
        r2.mode.startsWith("自宅→")
      );
      if (pair) getoffStop = pair.stop;
    }

    candidates.push({
      line: r.line,
      stop: r.stop,
      getoff: getoffStop,
      depart: nextBus.depart_time,
      arrive: minutesToTime(arrive),
      walk: r.walk_min,
      ride: r.ride_min
    });
  });

  candidates.sort((a,b)=> toMinutes(a.arrive)-toMinutes(b.arrive));

  const results = document.getElementById("results");
  results.innerHTML = "";

  // ----------------------------
  // ★ 旧版の結果カード生成を完全復元
  // ----------------------------
  candidates.forEach((c,i)=>{
    let detailText = "";

    if (isFromHome) {
      const departMin = toMinutes(c.depart);
      const leaveMin = departMin - Number(c.walk);
      const leaveTime = minutesToTime(leaveMin);

      detailText =
        `家を出る時刻：<b>${leaveTime}</b><br>` +
        `バス発車時刻：<b>${c.depart}</b><br>` +
        `駅到着時刻：<b>${c.arrive}</b><br>` +
        `徒歩 ${c.walk}分 + 乗車 ${c.ride}分`;
    }

    if (isToHome) {
      const arriveMin = toMinutes(c.arrive);
      const finalArriveMin = arriveMin + Number(c.walk);
      const finalArrive = minutesToTime(finalArriveMin);

      detailText =
        `バス到着時刻：<b>${c.arrive}</b>（${c.getoff}）<br>` +
        `自宅到着時刻：<b>${finalArrive}</b><br>` +
        `乗車 ${c.ride}分 + 徒歩 ${c.walk}分`;
    }

    results.innerHTML += `
      <div class="result">
        <h3>${i===0 ? "【最速】" : ""}${c.line}（${c.stop}）</h3>
        ${detailText}
      </div>
    `;
  });

  // ----------------------------
  // ★ 旧版のルートカード生成を完全復元
  // ----------------------------
  const routeCard = document.getElementById("routeCard");
  routeCard.style.display = "block";

  const best = candidates[0];

  let stationName = "";
  if (mode.includes("清瀬駅")) stationName = "清瀬駅";
  if (mode.includes("新座駅")) stationName = "新座駅";

  if (isFromHome) {
    const departMin = toMinutes(best.depart);
    const leaveMin = departMin - Number(best.walk);
    const leaveTime = minutesToTime(leaveMin);

    routeCard.innerHTML =
      `<b>自宅</b> ： ${leaveTime}<br>` +
      `↓ 徒歩 ${best.walk}分<br>` +
      `<b>${best.stop}</b> ： ${best.depart}<br>` +
      `↓ 乗車 ${best.ride}分<br>` +
      `<b>${stationName}</b> ： ${best.arrive}`;
  }

  if (isToHome) {
    const arriveMin = toMinutes(best.arrive);
    const finalArriveMin = arriveMin + Number(best.walk);
    const finalArrive = minutesToTime(finalArriveMin);

    routeCard.innerHTML =
      `<b>${stationName}</b> ： ${best.depart}<br>` +
      `↓ 乗車 ${best.ride}分<br>` +
      `<b>${best.getoff}</b> ： ${best.arrive}<br>` +
      `↓ 徒歩 ${best.walk}分<br>` +
      `<b>自宅</b> ： ${finalArrive}`;
  }

  // ----------------------------
  // ★ セリフ（旧版のロジックを維持）
  // ----------------------------
  const baseMin = startMin;
  const departMin = toMinutes(best.depart);
  const diff = departMin - baseMin;

  let message = "";
  let expression = "normal";
  let walkComment = "";

  if (Number(best.walk) >= 10) {
    walkComment = "<br>歩く時間が長いから気をつけてね。";
  }

  if (isFromHome) {
    const leaveDiff = diff - Number(best.walk);

    if (leaveDiff <= 10) {
      message =
        `あと<b>${leaveDiff}分</b>で家を出て、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に乗ってね。`+
        `<br>急げば間に合うよ！` +
        `<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "hurry";
    } else if (leaveDiff <= 20) {
      message =
        `<b>${leaveDiff}分後</b>に家を出れば、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に余裕で間に合うよ。`+
        `<br>ちょうどいいタイミングだよ。` +
        `<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message =
        `<b>${leaveDiff}分後</b>に家を出れば、<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に間に合うよ。`+
        `<br>のんびり準備して大丈夫だよ。` +
        `<br>駅に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  }

  if (isToHome) {
    if (diff <= 10) {
      message =
        `<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統に乗れば、早く家に帰れるよ。`+
        `<br>ちょうどいいタイミングだよ！` +
        `<br>家に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message =
        `<b>${diff}分後</b>に「<b>${best.stop}</b>」から出る<b>${best.line}</b>系統が一番早いよ。`+
        `<br>ちょっと待ち時間が長いね…` +
        `<br>家に着くのは<b>${best.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  }

  document.getElementById("bubble").innerHTML = message + walkComment;
  setCharacterExpression(expression);
}


// ----------------------------
// 初期化（現在時刻セット + CSV/祝日読み込み）
// ----------------------------
window.onload = async () => {
  document.getElementById("bubble").innerHTML =
    "行き先と日時を選んで検索してね！";

  await loadCSV();
  await loadHolidays();

  const now = new Date();
  document.getElementById("datetime").value = formatDateTimeLocal(now);

  // 行き先ボタンの選択処理
  document.querySelectorAll("#modeButtons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeButtons button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // 「現在時刻に更新」ボタン
  document.getElementById("nowButton").addEventListener("click", () => {
    const now = new Date();
    document.getElementById("datetime").value = formatDateTimeLocal(now);
  });
};
