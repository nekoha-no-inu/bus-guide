// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];
let routes      = [];
let schedules   = [];

// 検索結果キャッシュ（前/次ボタン用）
let _allCandidates = [];   // 全候補（ソート済み）
let _currentIndex  = 0;   // 現在表示中のインデックス

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
  return holidayList.includes(date.toISOString().slice(0, 10));
}

function getDayType(date) {
  if (isHoliday(date)) return "休日";
  const day = date.getDay();
  if (day === 0) return "休日";
  if (day === 6) return "土曜";
  return "平日";
}

// ---- 時刻変換 ----

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function formatDateTimeLocal(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---- 系統グループ判定 ----
// "清61-1" → "清61"、"深夜" → "深夜"

function routeGroup(line) {
  return line.replace(/-\d+$/, "");
}

// ---- 検索コア：全候補（全時刻）を返す ----

function buildAllCandidates(mode, dayType, startMin) {
  const isLate = startMin >= 23 * 60; // 23:00以降なら深夜便も対象

  return routes
    .filter(r => {
      if (r.mode !== mode) return false;
      // 深夜便は23:00以降のみ表示
      if (r.line === "深夜" && !isLate) return false;
      return true;
    })
    .flatMap(r => {
      const walkArrive = startMin + Number(r.walk_min);

      // schedules から該当する全便を取得
      const list = schedules.filter(s =>
        s.route     === r.line      &&
        s.stop      === r.stop      &&
        s.direction === r.direction &&
        s.day_type  === dayType     &&
        toMinutes(s.depart_time) >= walkArrive
      );

      return list.map(s => {
        const busDepart = toMinutes(s.depart_time);
        const arrive    = minutesToTime(busDepart + Number(r.ride_min));
        return {
          line:   r.line,
          group:  routeGroup(r.line),
          stop:   r.stop,
          getoff: r.getoff,
          depart: s.depart_time,
          arrive,
          walk:   Number(r.walk_min),
          ride:   Number(r.ride_min),
        };
      });
    })
    // 到着時刻 → 出発時刻 → 系統名 の順でソート
    .sort((a, b) =>
      toMinutes(a.arrive) - toMinutes(b.arrive) ||
      toMinutes(a.depart) - toMinutes(b.depart) ||
      a.line.localeCompare(b.line)
    );
}

// ---- 表示 ----

function showCandidate(c, isFromHome, label) {
  const results = document.getElementById("results");
  results.innerHTML = "";

  if (!c) {
    results.innerHTML = "<p>この時間帯に乗れるバスはないよ。</p>";
    document.getElementById("bubble").innerHTML = "バスが見つからなかったよ…時間帯を変えてみてね。";
    setCharacterExpression("relax");
    _updateNavButtons();
    return;
  }

  const detailText = isFromHome ? _homeDetailText(c) : _stationDetailText(c);

  results.innerHTML = `
    <div class="result">
      <h3>${c.line}（${c.stop} 乗車）</h3>
      ${detailText}
    </div>
  `;

  // ルートカード
  const routeCard = document.getElementById("routeCard");
  routeCard.style.display = "block";
  const stationName = isFromHome
    ? (c.getoff.includes("清瀬") ? "清瀬駅北口" : "新座駅南口")
    : c.stop;
  routeCard.innerHTML = isFromHome
    ? _homeRouteCard(c)
    : _stationRouteCard(c);

  // ナビボタン更新
  _updateNavButtons();

  // セリフ
  const datetime = document.getElementById("datetime").value;
  const dt       = new Date(datetime);
  const startMin = dt.getHours() * 60 + dt.getMinutes();
  const diff      = toMinutes(c.depart) - startMin;
  const leaveDiff = diff - c.walk;
  const walkComment = c.walk >= 10 ? "<br>歩く時間が長いから気をつけてね。" : "";

  let message, expression;

  const labelMap = {
    next: "次のバスだよ🚌",
    prev: "前のバスだよ🚌",
    first: null,
  };
  const labelPrefix = labelMap[label] ? `<b>${labelMap[label]}</b><br>` : "";

  if (isFromHome) {
    if (leaveDiff <= 5) {
      message    = `${labelPrefix}急いで！あと<b>${leaveDiff}分</b>で家を出ないと<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れないよ！<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "hurry";
    } else if (leaveDiff <= 15) {
      message    = `${labelPrefix}<b>${leaveDiff}分後</b>に家を出れば<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に間に合うよ。<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `${labelPrefix}<b>${leaveDiff}分後</b>に家を出ればOK。<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れるよ。<br>のんびり準備してね🎵<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  } else {
    if (diff <= 5) {
      message    = `${labelPrefix}急いで！<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ！<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "hurry";
    } else if (diff <= 15) {
      message    = `${labelPrefix}<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `${labelPrefix}次の<b>${c.line}</b>は<b>${diff}分後</b>（<b>${c.stop}</b> <b>${c.depart}</b>発）だよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  }

  document.getElementById("bubble").innerHTML = message + walkComment;
  setCharacterExpression(expression);
}

// ---- 前/次ボタン表示制御 ----

function _updateNavButtons() {
  document.getElementById("prevBtn").disabled = (_currentIndex <= 0);
  document.getElementById("nextBtn").disabled = (_currentIndex >= _allCandidates.length - 1);
}

// ---- 検索メイン ----

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
  const isFromHome = mode.startsWith("自宅→");

  document.getElementById("dayTypeDisplay").innerText = `この日は「${dayType}」ダイヤです`;

  _allCandidates = buildAllCandidates(mode, dayType, startMin);

  if (_allCandidates.length === 0) {
    showCandidate(null, isFromHome, "first");
    return;
  }

  // 最初のインデックス：最速（到着が最も早い）便
  _currentIndex = 0;
  showCandidate(_allCandidates[0], isFromHome, "first");
}

// ---- 前/次ボタン ----

function showNextBus() {
  if (_currentIndex >= _allCandidates.length - 1) return;
  _currentIndex++;
  const mode = document.querySelector("#modeButtons .active").dataset.mode;
  showCandidate(_allCandidates[_currentIndex], mode.startsWith("自宅→"), "next");
}

function showPrevBus() {
  if (_currentIndex <= 0) return;
  _currentIndex--;
  const mode = document.querySelector("#modeButtons .active").dataset.mode;
  showCandidate(_allCandidates[_currentIndex], mode.startsWith("自宅→"), "prev");
}

// ---- カードHTML ----

function _homeDetailText(c) {
  const leaveTime = minutesToTime(toMinutes(c.depart) - c.walk);
  return `
    家を出る時刻：<b>${leaveTime}</b><br>
    乗車：<b>${c.stop}</b> <b>${c.depart}</b>発（徒歩${c.walk}分）<br>
    降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着（乗車${c.ride}分）
  `;
}

function _stationDetailText(c) {
  const finalArrive = minutesToTime(toMinutes(c.arrive) + c.walk);
  return `
    乗車：<b>${c.stop}</b> <b>${c.depart}</b>発<br>
    降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着（乗車${c.ride}分）<br>
    自宅到着：<b>${finalArrive}</b>（徒歩${c.walk}分）
  `;
}

function _homeRouteCard(c) {
  const leaveTime = minutesToTime(toMinutes(c.depart) - c.walk);
  return `
    <b>自宅</b> ： ${leaveTime}<br>
    ↓ 徒歩 ${c.walk}分<br>
    <b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>
    ↓ 乗車 ${c.ride}分<br>
    <b>${c.getoff}</b> ： ${c.arrive} 着
  `;
}

function _stationRouteCard(c) {
  const finalArrive = minutesToTime(toMinutes(c.arrive) + c.walk);
  return `
    <b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>
    ↓ 乗車 ${c.ride}分<br>
    <b>${c.getoff}</b> ： ${c.arrive} 着<br>
    ↓ 徒歩 ${c.walk}分<br>
    <b>自宅</b> ： ${finalArrive}
  `;
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

  document.getElementById("prevBtn").addEventListener("click", showPrevBus);
  document.getElementById("nextBtn").addEventListener("click", showNextBus);
});
