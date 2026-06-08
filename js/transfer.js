// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];
let routes      = [];
let schedules   = [];

// ─ 全系統横断の候補リスト（前/次ボタン用）
let _allCandidates = [];
let _allIndex      = 0;

// 直近の検索条件（前/次ボタンで系統カード再描画に使う）
let _lastMode    = "";
let _lastDayType = "";
let _lastIsFromHome = true;

// ---- CSV 読み込み ----

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

// ---- 日付・時刻ユーティリティ ----

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

// ---- 候補を全件取得（startMin 以降） ----

function buildAllCandidates(mode, dayType, startMin) {
  const isLate = startMin >= 23 * 60;
  return routes
    .filter(r => r.mode === mode && (r.line !== "深夜" || isLate))
    .flatMap(r => {
      const walkArrive = startMin + Number(r.walk_min);
      return schedules
        .filter(s =>
          s.route === r.line && s.stop === r.stop &&
          s.direction === r.direction && s.day_type === dayType &&
          toMin(s.depart_time) >= walkArrive
        )
        .map(s => ({
          line:  r.line, group: grp(r.line),
          stop:  r.stop, getoff: r.getoff,
          depart: s.depart_time,
          arrive: toTime(toMin(s.depart_time) + Number(r.ride_min)),
          walk: Number(r.walk_min), ride: Number(r.ride_min),
        }));
    })
    .sort((a, b) =>
      toMin(a.arrive) - toMin(b.arrive) || toMin(a.depart) - toMin(b.depart)
    );
}

// ---- 各系統の「startMin 以降の最速1件」を取得 ----

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

      const g   = grp(r.line);
      const cand = {
        line:  r.line, group: g,
        stop:  r.stop, getoff: r.getoff,
        depart: hit.depart_time,
        arrive: toTime(toMin(hit.depart_time) + Number(r.ride_min)),
        walk: Number(r.walk_min), ride: Number(r.ride_min),
      };
      // 同グループ内で到着が最も早いものだけ残す
      if (!best[g] || toMin(cand.arrive) < toMin(best[g].arrive)) {
        best[g] = cand;
      }
    });

  return best; // { "清61": candidate, "清62": candidate, ... }
}

// ---- ルートカード HTML ----

function routeCardHTML(c, isFromHome) {
  if (isFromHome) {
    const leave = toTime(toMin(c.depart) - c.walk);
    return `<b>自宅</b> ： ${leave}<br>↓ 徒歩 ${c.walk}分<br>`
         + `<b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>↓ 乗車 ${c.ride}分<br>`
         + `<b>${c.getoff}</b> ： ${c.arrive} 着`;
  } else {
    const home = toTime(toMin(c.arrive) + c.walk);
    return `<b>${c.stop}</b> ： ${c.depart} 発（${c.line}）<br>↓ 乗車 ${c.ride}分<br>`
         + `<b>${c.getoff}</b> ： ${c.arrive} 着<br>↓ 徒歩 ${c.walk}分<br>`
         + `<b>自宅</b> ： ${home}`;
  }
}

// ---- 系統グループカード1枚の内容 ----

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
    const home = toTime(toMin(c.arrive) + c.walk);
    return `<div class="group-line-name">${c.line}</div>
      <div class="group-detail">
        <span>🚏 乗車：<b>${c.stop}</b> <b>${c.depart}</b>発</span>
        <span>🏁 降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着（乗車${c.ride}分）</span>
        <span>🏠 自宅着：<b>${home}</b>（徒歩${c.walk}分）</span>
      </div>`;
  }
}

// ---- キャラクターセリフ ----

function speak(c, isFromHome, label) {
  const dt       = new Date(document.getElementById("datetime").value);
  const startMin = dt.getHours() * 60 + dt.getMinutes();
  const diff      = toMin(c.depart) - startMin;
  const leaveDiff = diff - c.walk;
  const walkNote  = c.walk >= 10 ? "<br>歩く時間が長いから気をつけてね。" : "";

  const prefix = label === "next" ? `<b>次のバスだよ🚌</b><br>`
               : label === "prev" ? `<b>前のバスだよ🚌</b><br>`
               : "";

  let msg, expr;
  if (isFromHome) {
    if (leaveDiff <= 5) {
      msg  = `${prefix}急いで！あと<b>${leaveDiff}分</b>で家を出ないと<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れないよ！<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "hurry";
    } else if (leaveDiff <= 15) {
      msg  = `${prefix}<b>${leaveDiff}分後</b>に家を出れば<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に間に合うよ。<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "normal";
    } else {
      msg  = `${prefix}<b>${leaveDiff}分後</b>に家を出ればOK。<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れるよ。<br>のんびり準備してね🎵<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "relax";
    }
  } else {
    if (diff <= 5) {
      msg  = `${prefix}急いで！<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ！<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "hurry";
    } else if (diff <= 15) {
      msg  = `${prefix}<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "normal";
    } else {
      msg  = `${prefix}次の<b>${c.line}</b>は<b>${diff}分後</b>（<b>${c.stop}</b> <b>${c.depart}</b>発）だよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expr = "relax";
    }
  }
  document.getElementById("bubble").innerHTML = msg + walkNote;
  setCharacterExpression(expr);
}

// ---- 全体を一括描画 ----

function renderAll(focusCandidate, isFromHome, label) {
  // ルートカード（フォーカス中の1件）
  const routeCard = document.getElementById("routeCard");
  routeCard.style.display = "block";
  routeCard.innerHTML = routeCardHTML(focusCandidate, isFromHome);

  // セリフ
  speak(focusCandidate, isFromHome, label);

  // 前/次ボタン状態
  document.getElementById("prevBtn").disabled = (_allIndex <= 0);
  document.getElementById("nextBtn").disabled = (_allIndex >= _allCandidates.length - 1);

  // 系統グループカード：focusCandidate の出発時刻を基準に各系統の最速を再計算
  const focusMin  = toMin(focusCandidate.depart);
  // walk_minが0と仮定した基準時刻（バス出発時刻 = バス停到着時刻）
  const groupBest = buildGroupBest(_lastMode, _lastDayType, focusMin);

  const groupsEl = document.getElementById("groupCards");
  groupsEl.innerHTML = "";

  Object.keys(groupBest).sort().forEach(g => {
    const c = groupBest[g];
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-header">
        <span class="group-title">${g} 系統</span>
      </div>
      <div class="group-body">${groupCardBody(c, isFromHome)}</div>
    `;
    groupsEl.appendChild(card);
  });
}

// ---- 検索メイン ----

async function searchBus() {
  const datetime = document.getElementById("datetime").value;
  if (!datetime) { document.getElementById("bubble").innerHTML = "日時を入力してね。"; return; }

  const dt         = new Date(datetime);
  const startMin   = dt.getHours() * 60 + dt.getMinutes();
  const mode       = document.querySelector("#modeButtons .active").dataset.mode;
  const dayType    = getDayType(dt);
  const isFromHome = mode.startsWith("自宅→");

  _lastMode        = mode;
  _lastDayType     = dayType;
  _lastIsFromHome  = isFromHome;

  document.getElementById("dayTypeDisplay").innerText = `この日は「${dayType}」ダイヤです`;

  _allCandidates = buildAllCandidates(mode, dayType, startMin);
  _allIndex      = 0;

  if (_allCandidates.length === 0) {
    document.getElementById("routeCard").style.display = "none";
    document.getElementById("groupCards").innerHTML = "";
    document.getElementById("prevBtn").disabled = true;
    document.getElementById("nextBtn").disabled = true;
    document.getElementById("bubble").innerHTML = "この時間帯に乗れるバスはないよ…時間を変えてみてね。";
    setCharacterExpression("relax");
    return;
  }

  renderAll(_allCandidates[0], isFromHome, "first");
}

// ---- 前/次ボタン ----

function showPrevBus() {
  if (_allIndex <= 0) return;
  _allIndex--;
  renderAll(_allCandidates[_allIndex], _lastIsFromHome, "prev");
}

function showNextBus() {
  if (_allIndex >= _allCandidates.length - 1) return;
  _allIndex++;
  renderAll(_allCandidates[_allIndex], _lastIsFromHome, "next");
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
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
