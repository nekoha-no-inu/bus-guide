// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================
console.log("transfer.js loaded");

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];
let routes      = [];
let schedules   = [];

let _allCandidates  = [];
let _allIndex       = 0;
let _lastMode       = "";
let _lastDayType    = "";
let _lastIsFromHome = true;

// ---- データ読み込み ----

async function loadHolidays() {
  const data = await fetch(HOLIDAY_API).then(r => r.json());
  holidayList = data.items.filter(ev => ev.start?.date).map(ev => ev.start.date);
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

// ---- 日付ユーティリティ ----

function isHoliday(date) {
  return holidayList.includes(date.toISOString().slice(0, 10));
}
function getDayType(date) {
  if (isHoliday(date)) return "休日";
  const d = date.getDay();
  if (d === 0) return "休日";
  if (d === 6) return "土曜";
  return "平日";
}
function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function fmtDTL(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function grp(line) { return line.replace(/-\d+$/, ""); }

// ---- 会話JSONからメッセージをランダム取得 ----

async function getTransferMsg(key1, key2, vars = {}) {
  // key1: "fromHome" | "toHome" | "noBus" | "walkLong"
  // key2: "hurry" | "normal" | "relax" | "next" | "prev" (省略可)
  const data = await _loadConversation();
  const section = data?.transfer?.[key1];
  if (!section) return { text: "", expression: "normal" };

  const list = key2 ? section[key2] : section;
  if (!Array.isArray(list) || list.length === 0) return { text: "", expression: "normal" };

  const item = list[Math.floor(Math.random() * list.length)];
  let text = item.text ?? item;
  const expression = item.expression ?? "normal";

  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{{${k}}}`, v);
  }
  return { text, expression };
}

// ---- urgency 判定 ----

function urgency(minutes) {
  if (minutes <= 5)  return "hurry";
  if (minutes <= 15) return "normal";
  return "relax";
}

// ---- セリフ発話 ----

async function speak(c, isFromHome, label) {
  const dt       = new Date(document.getElementById("datetime").value);
  const startMin = dt.getHours() * 60 + dt.getMinutes();
  const diff      = toMin(c.depart) - startMin;
  const leaveDiff = diff - c.walk;

  // 自宅到着時刻（バス降車時刻 + 徒歩時間）
  const homeArrive = toTime(toMin(c.arrive) + c.walk);

  const vars = {
    line:        c.line,
    stop:        c.stop,
    depart:      c.depart,
    arrive:      c.arrive,      // バス降車時刻（駅着 or バス停着）
    homeArrive,                 // 自宅到着時刻（toHome のみ使用）
    diff,
    leaveDiff,
  };

  let key2;
  if (label === "next" || label === "prev") {
    key2 = label;
  } else {
    key2 = urgency(isFromHome ? leaveDiff : diff);
  }

  const key1 = isFromHome ? "fromHome" : "toHome";
  const msg  = await getTransferMsg(key1, key2, vars);

  // 歩き時間が長い場合は補足
  const walkNote = c.walk >= 10
    ? (await getTransferMsg("walkLong", null)).text
    : "";

  const bubble = document.getElementById("bubble");
  bubble.innerHTML = msg.text + (walkNote ? `<br>${walkNote}` : "");
  setCharacterExpression(msg.expression);
}

// ---- 候補を全件取得 ----

function buildAllCandidates(mode, dayType, startMin) {
  console.log("=== buildAllCandidates START ===");
  console.log("mode:", mode, "dayType:", dayType, "startMin:", startMin);
  const isLate = startMin >= 23 * 60;
  return routes
    .filter(r => {
      const ok = (r.mode === mode && (r.line !== "深夜" || isLate));
      if (!ok) {
        console.log("SKIP route (mode mismatch or 深夜制限):", r);
      }
      return ok;
    })
    .flatMap(r => {
      console.log("---- checking route:", r);
      const walkArrive = startMin + Number(r.walk_min);
      console.log("walkArrive:", walkArrive);

      return schedules
        .filter(s =>
          s.route === r.line && s.stop === r.stop &&
          s.direction === r.direction && s.day_type === dayType &&
          toMin(s.depart_time) >= walkArrive
        )
        .map(s => ({
          line:   r.line, group: grp(r.line),
          stop:   r.stop, getoff: r.getoff,
          depart: s.depart_time,
          arrive: toTime(toMin(s.depart_time) + Number(r.ride_min)),
          walk:   Number(r.walk_min),
          ride:   Number(r.ride_min),
        }));
    })
    .sort((a, b) =>
      toMin(a.arrive) - toMin(b.arrive) || toMin(a.depart) - toMin(b.depart)
    );
}

// ---- 系統グループ別の最速1件 ----

function buildGroupBest(mode, dayType, startMin) {
  const isLate = startMin >= 23 * 60;
  const best   = {};
  routes
    .filter(r => r.mode === mode && (r.line !== "深夜" || isLate))
    .forEach(r => {
      const walkArrive = startMin + Number(r.walk_min);
      const hit = schedules.find(s =>
        s.route === r.line && s.stop === r.stop &&
        s.direction === r.direction && s.day_type === dayType &&
        toMin(s.depart_time) >= walkArrive
      );
      if (!hit) return;
      const g    = grp(r.line);
      const cand = {
        line:  r.line, group: g,
        stop:  r.stop, getoff: r.getoff,
        depart: hit.depart_time,
        arrive: toTime(toMin(hit.depart_time) + Number(r.ride_min)),
        walk:  Number(r.walk_min), ride: Number(r.ride_min),
      };
      if (!best[g] || toMin(cand.arrive) < toMin(best[g].arrive)) {
        best[g] = cand;
      }
    });
  return best;
}

// ---- ルートカード HTML ----

function routeCardHTML(c, isFromHome) {
  if (isFromHome) {
    const leave = toTime(toMin(c.depart) - c.walk);
    return `<b>自宅</b> ： ${leave}<br>↓ 徒歩 ${c.walk}分<br>`
         + `<b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>↓ 乗車 ${c.ride}分<br>`
         + `<b>${c.getoff}</b> ： ${c.arrive} 着`;
  } else {
    const homeArrive = toTime(toMin(c.arrive) + c.walk);
    return `<b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>↓ 乗車 ${c.ride}分<br>`
         + `<b>${c.getoff}</b> ： ${c.arrive} 着<br>↓ 徒歩 ${c.walk}分<br>`
         + `<b>自宅</b> ： ${homeArrive}`;
  }
}

// ---- 系統カード本文 ----

function groupCardBody(c, isFromHome) {
  if (isFromHome) {
    const leave = toTime(toMin(c.depart) - c.walk);
    return `<div class="group-line-name">${c.line}</div>
      <div class="group-detail">
        <span>🏃 家を出る：<b>${leave}</b></span>
        <span>🚏 乗車：<b>${c.stop}</b> <b>${c.depart}</b>発（徒歩${c.walk}分）</span>
        <span>🏁 降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着</span>
      </div>`;
  } else {
    const homeArrive = toTime(toMin(c.arrive) + c.walk);
    return `<div class="group-line-name">${c.line}</div>
      <div class="group-detail">
        <span>🚏 乗車：<b>${c.stop}</b> <b>${c.depart}</b>発</span>
        <span>🏁 降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着（乗車${c.ride}分）</span>
        <span>🏠 自宅着：<b>${homeArrive}</b>（徒歩${c.walk}分）</span>
      </div>`;
  }
}

// ---- 全体描画 ----

async function renderAll(focusCandidate, isFromHome, label) {
  // ルートカード
  const routeCard = document.getElementById("routeCard");
  routeCard.style.display = "block";
  routeCard.innerHTML = routeCardHTML(focusCandidate, isFromHome);

  // セリフ（JSON から取得）
  await speak(focusCandidate, isFromHome, label);

  // 前/次ボタン状態
  document.getElementById("prevBtn").disabled = (_allIndex <= 0);
  document.getElementById("nextBtn").disabled = (_allIndex >= _allCandidates.length - 1);

  // 系統グループカード：フォーカス便の出発時刻を基準に最速を再計算
  const focusMin  = toMin(focusCandidate.depart);
  const groupBest = buildGroupBest(_lastMode, _lastDayType, focusMin);

  const groupsEl = document.getElementById("groupCards");
  groupsEl.innerHTML = "";
  Object.keys(groupBest).sort().forEach(g => {
    const c    = groupBest[g];
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-header"><span class="group-title">${g} 系統</span></div>
      <div class="group-body">${groupCardBody(c, isFromHome)}</div>
    `;
    groupsEl.appendChild(card);
  });
}

// ---- 検索メイン ----

async function searchBus() {
  console.log("=== searchBus START ===");

  const datetime = document.getElementById("datetime").value;
  if (!datetime) {
    document.getElementById("bubble").innerHTML = "日時を入力してね。";
    return;
  }

  const dt         = new Date(datetime);
  const startMin   = dt.getHours() * 60 + dt.getMinutes();
  const mode       = document.querySelector("#modeButtons .active").dataset.mode;
  const dayType    = getDayType(dt);
  const isFromHome = mode.startsWith("自宅→");

  console.log("datetime:", datetime);
  console.log("dt:", dt);
  console.log("startMin:", startMin);
  console.log("mode:", mode);
  console.log("dayType:", dayType);
  console.log("isFromHome:", isFromHome);

  _lastMode       = mode;
  _lastDayType    = dayType;
  _lastIsFromHome = isFromHome;

  document.getElementById("dayTypeDisplay").innerText = `この日は「${dayType}」ダイヤです`;

  _allCandidates = buildAllCandidates(mode, dayType, startMin);
  _allIndex      = 0;

  console.log("allCandidates:", _allCandidates);
  console.log("count:", _allCandidates.length);

  if (_allCandidates.length === 0) {
    document.getElementById("routeCard").style.display = "none";
    document.getElementById("groupCards").innerHTML    = "";
    document.getElementById("prevBtn").disabled = true;
    document.getElementById("nextBtn").disabled = true;
    const msg = await getTransferMsg("noBus");
    document.getElementById("bubble").innerHTML = msg.text;
    setCharacterExpression(msg.expression);
    return;
  }

  await renderAll(_allCandidates[0], isFromHome, "first");
}

// ---- 前/次ボタン ----

async function showPrevBus() {
  if (_allIndex <= 0) return;
  _allIndex--;
  await renderAll(_allCandidates[_allIndex], _lastIsFromHome, "prev");
}

async function showNextBus() {
  if (_allIndex >= _allCandidates.length - 1) return;
  _allIndex++;
  await renderAll(_allCandidates[_allIndex], _lastIsFromHome, "next");
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  window.addEventListener("load", () => {
    console.log("window loaded");
  });
  document.getElementById("bubble").innerHTML = "行き先と日時を選んで検索してね！";
  await Promise.all([loadCSV(), loadHolidays()]);
  document.getElementById("datetime").value = fmtDTL(new Date());

  document.querySelectorAll("#modeButtons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeButtons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  document.getElementById("nowButton").addEventListener("click", () => {
    document.getElementById("datetime").value = fmtDTL(new Date());
  });
  document.getElementById("prevBtn").addEventListener("click", showPrevBus);
  document.getElementById("nextBtn").addEventListener("click", showNextBus);
});
