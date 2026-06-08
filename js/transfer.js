// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";

let holidayList = [];
let routes      = [];
let schedules   = [];

// 系統グループ別の候補リスト { "清61": [...全便], "清62": [...], ... }
let _groupCandidates = {};
// 系統グループ別の現在インデックス { "清61": 0, "清62": 0, ... }
let _groupIndex = {};

// ---- データ読み込み ----

async function loadHolidays() {
  const data = await fetch(HOLIDAY_API).then(r => r.json());
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
  const d = date.getDay();
  if (d === 0) return "休日";
  if (d === 6) return "土曜";
  return "平日";
}

// ---- 時刻変換 ----

function toMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function fmtDateTimeLocal(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

// ---- 系統グループ："清61-1"→"清61"、"深夜"はそのまま ----

function grp(line) {
  return line.replace(/-\d+$/, "");
}

// ---- 検索コア：系統グループ別に全便リストを構築 ----

function buildGroupCandidates(mode, dayType, startMin) {
  const isLate = startMin >= 23 * 60;

  const result = {};

  routes
    .filter(r => {
      if (r.mode !== mode) return false;
      if (r.line === "深夜" && !isLate) return false;
      return true;
    })
    .forEach(r => {
      const walkArrive = startMin + Number(r.walk_min);
      const group = grp(r.line);

      const buses = schedules.filter(s =>
        s.route     === r.line      &&
        s.stop      === r.stop      &&
        s.direction === r.direction &&
        s.day_type  === dayType     &&
        toMin(s.depart_time) >= walkArrive
      );

      buses.forEach(s => {
        const busDepart = toMin(s.depart_time);
        const candidate = {
          line:   r.line,
          group,
          stop:   r.stop,
          getoff: r.getoff,
          depart: s.depart_time,
          arrive: toTime(busDepart + Number(r.ride_min)),
          walk:   Number(r.walk_min),
          ride:   Number(r.ride_min),
        };
        if (!result[group]) result[group] = [];
        result[group].push(candidate);
      });
    });

  // 各グループを到着→出発の順でソート
  Object.keys(result).forEach(g => {
    result[g].sort((a, b) =>
      toMin(a.arrive) - toMin(b.arrive) || toMin(a.depart) - toMin(b.depart)
    );
  });

  return result;
}

// ---- 1グループ分のカードを描画 ----

function renderGroupCard(group, idx, isFromHome) {
  const list = _groupCandidates[group];
  const c    = list ? list[idx] : null;
  const container = document.getElementById(`group-card-${group}`);
  if (!container) return;

  if (!c) {
    container.querySelector(".group-body").innerHTML =
      "<p style='color:#999;font-size:13px;'>この時間以降のバスはないよ</p>";
    container.querySelector(".group-nav-prev").disabled = true;
    container.querySelector(".group-nav-next").disabled = true;
    return;
  }

  const detail = isFromHome ? _homeDetail(c) : _stationDetail(c);
  container.querySelector(".group-body").innerHTML = `
    <div class="group-line-name">${c.line}</div>
    ${detail}
  `;
  container.querySelector(".group-nav-prev").disabled = (idx <= 0);
  container.querySelector(".group-nav-next").disabled = (idx >= list.length - 1);
}

// ---- 全グループカードを描画 ----

function renderAllGroups(isFromHome) {
  const resultsEl = document.getElementById("results");
  resultsEl.innerHTML = "";

  const groups = Object.keys(_groupCandidates).sort();

  if (groups.length === 0) {
    resultsEl.innerHTML = "<p>この時間帯に乗れるバスはないよ。</p>";
    document.getElementById("bubble").innerHTML = "バスが見つからなかったよ…時間帯を変えてみてね。";
    setCharacterExpression("relax");
    return;
  }

  groups.forEach(group => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.id = `group-card-${group}`;
    card.innerHTML = `
      <div class="group-header">
        <span class="group-title">${group} 系統</span>
        <div class="group-nav">
          <button class="group-nav-prev" onclick="shiftGroup('${group}', -1)" disabled>◀ 前</button>
          <button class="group-nav-next" onclick="shiftGroup('${group}', +1)">次 ▶</button>
        </div>
      </div>
      <div class="group-body"></div>
    `;
    resultsEl.appendChild(card);
    renderGroupCard(group, _groupIndex[group] ?? 0, isFromHome);
  });

  // キャラのセリフ：最速便（全グループ中で到着最早）を基準
  const bestList = Object.values(_groupCandidates)
    .map(list => list[0])
    .filter(Boolean)
    .sort((a, b) => toMin(a.arrive) - toMin(b.arrive));

  if (bestList.length > 0) {
    _speakAbout(bestList[0], isFromHome, "first");
  }
}

// ---- グループ内で前/次に移動 ----

function shiftGroup(group, delta) {
  const list = _groupCandidates[group];
  if (!list) return;
  const newIdx = Math.max(0, Math.min(list.length - 1, (_groupIndex[group] ?? 0) + delta));
  _groupIndex[group] = newIdx;

  const mode = document.querySelector("#modeButtons .active").dataset.mode;
  renderGroupCard(group, newIdx, mode.startsWith("自宅→"));

  // 移動した系統についてセリフを言う
  _speakAbout(list[newIdx], mode.startsWith("自宅→"), delta > 0 ? "next" : "prev", group);
}

// ---- セリフ生成 ----

function _speakAbout(c, isFromHome, label, group) {
  const datetime = document.getElementById("datetime").value;
  const dt       = new Date(datetime);
  const startMin = dt.getHours() * 60 + dt.getMinutes();
  const diff      = toMin(c.depart) - startMin;
  const leaveDiff = diff - c.walk;
  const walkComment = c.walk >= 10 ? "<br>歩く時間が長いから気をつけてね。" : "";

  const labelText = label === "next" ? `<b>${c.group ?? grp(c.line)}系統、次のバスだよ🚌</b><br>`
                  : label === "prev" ? `<b>${c.group ?? grp(c.line)}系統、前のバスだよ🚌</b><br>`
                  : "";

  let message, expression;

  if (isFromHome) {
    if (leaveDiff <= 5) {
      message    = `${labelText}急いで！あと<b>${leaveDiff}分</b>で家を出ないと<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れないよ！`;
      expression = "hurry";
    } else if (leaveDiff <= 15) {
      message    = `${labelText}<b>${leaveDiff}分後</b>に家を出れば<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に間に合うよ。<br>着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `${labelText}<b>${leaveDiff}分後</b>に家を出ればOK。<b>${c.depart}</b>発の<b>${c.line}</b>（<b>${c.stop}</b>）に乗れるよ。<br>のんびり準備してね🎵`;
      expression = "relax";
    }
  } else {
    if (diff <= 5) {
      message    = `${labelText}急いで！<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ！`;
      expression = "hurry";
    } else if (diff <= 15) {
      message    = `${labelText}<b>${diff}分後</b>に「<b>${c.stop}</b>」から<b>${c.line}</b>が出るよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "normal";
    } else {
      message    = `${labelText}次の<b>${c.line}</b>は<b>${diff}分後</b>（<b>${c.stop}</b> <b>${c.depart}</b>発）だよ。<br>家に着くのは<b>${c.arrive}</b>頃だよ。`;
      expression = "relax";
    }
  }

  document.getElementById("bubble").innerHTML = message + walkComment;
  setCharacterExpression(expression);
}

// ---- カード本文 ----

function _homeDetail(c) {
  const leaveTime = toTime(toMin(c.depart) - c.walk);
  return `
    <div class="group-detail">
      <span>🏃 家を出る：<b>${leaveTime}</b></span>
      <span>🚏 乗車：<b>${c.stop}</b> <b>${c.depart}</b>発</span>
      <span>🏁 降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着</span>
    </div>
  `;
}

function _stationDetail(c) {
  const finalArrive = toTime(toMin(c.arrive) + c.walk);
  return `
    <div class="group-detail">
      <span>🚏 乗車：<b>${c.stop}</b> <b>${c.depart}</b>発</span>
      <span>🏁 降車：<b>${c.getoff}</b> <b>${c.arrive}</b>着</span>
      <span>🏠 自宅着：<b>${finalArrive}</b></span>
    </div>
  `;
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

  _groupCandidates = buildGroupCandidates(mode, dayType, startMin);
  _groupIndex = {};
  Object.keys(_groupCandidates).forEach(g => { _groupIndex[g] = 0; });

  renderAllGroups(isFromHome);
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  document.getElementById("bubble").innerHTML = "行き先と日時を選んで検索してね！";
  await Promise.all([loadCSV(), loadHolidays()]);
  document.getElementById("datetime").value = fmtDateTimeLocal(new Date());

  document.querySelectorAll("#modeButtons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeButtons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("nowButton").addEventListener("click", () => {
    document.getElementById("datetime").value = fmtDateTimeLocal(new Date());
  });
});
