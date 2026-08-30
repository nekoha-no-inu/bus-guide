// ======================================
// transfer.js  ─  バス乗り換え案内
// ======================================

const HOLIDAY_API =
  "https://www.googleapis.com/calendar/v3/calendars/japanese__ja@holiday.calendar.google.com/events?key=AIzaSyCCQB3KoCaFIvG1Wf8xy7y03d1ACHjqpsU";
const TRANSIT_API_BASE = "https://api.transit.ls8h.com";
const TRANSIT_API_TIMEOUT_MS = 4500;
const STOP_NAME_ALIAS = {
  "台田団地中央": "下戸",
};
const API_MODE_QUERY = {
  "自宅→清瀬駅": { station: "清瀬駅北口" },
  "自宅→新座駅": { station: "新座駅南口" },
  "清瀬駅→自宅": { station: "清瀬駅北口" },
  "新座駅→自宅": { station: "新座駅南口" },
};
const _endpointCache = new Map();

let holidayList = [];
let routes      = [];
let schedules   = [];

let _allCandidates  = [];
let _allIndex       = 0;
let _lastMode       = "";
let _lastDayType    = "";
let _lastIsFromHome = true;
let _initialStartMin = 0;
let _lastDataSource  = "CSV";

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

  // 旧停留所名を新しい表記へ寄せて、CSV間の一致と表示を揃える。
  routes = routes.map(r => {
    const normalizedStop = normalizeStopName(r.stop);
    const normalizedGetoff = normalizeStopName(r.getoff);
    const normalized = { ...r, stop: normalizedStop, getoff: normalizedGetoff };
    if ((normalized.stop === "下戸" || normalized.getoff === "下戸") && /^清64(?:-|$)/.test(normalized.line)) {
      normalized.walk_min = "6";
    }
    return normalized;
  });
  schedules = schedules.map(s => ({ ...s, stop: normalizeStopName(s.stop) }));
}

function normalizeStopName(name) {
  return STOP_NAME_ALIAS[name] || name;
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

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseApiTimeToMin(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const totalMin = Math.floor(value / 60);
    return ((totalMin % (24 * 60)) + (24 * 60)) % (24 * 60);
  }
  if (typeof value !== "string") return null;

  const hhmm = value.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
  }

  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.getHours() * 60 + d.getMinutes();
  }
  return null;
}

function fmtYmd(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
}

function fmtHm(date) {
  const p = n => String(n).padStart(2, "0");
  return `${p(date.getHours())}:${p(date.getMinutes())}`;
}

function pickFirstArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function isTransitLeg(leg) {
  const mode = String(leg?.mode || leg?.transportMode || leg?.type || "").toUpperCase();
  if (!mode) return !!(leg?.route || leg?.line);
  if (mode.includes("WALK")) return false;
  return true;
}

function estimateWalkMinutes(legs, isFromHome) {
  if (!Array.isArray(legs) || legs.length === 0) return isFromHome ? 6 : 6;

  const walkLegs = legs.filter(l => {
    const kind = String(l?.kind || "").toLowerCase();
    if (kind === "walk") return true;
    const mode = String(l?.mode || l?.transportMode || l?.type || "").toUpperCase();
    return mode.includes("WALK");
  });

  if (walkLegs.length === 0) return isFromHome ? 6 : 6;

  const total = walkLegs.reduce((sum, leg) => {
    const durationBySecs = (safeNum(leg?.arrivalSecs) !== null && safeNum(leg?.departureSecs) !== null)
      ? (safeNum(leg?.arrivalSecs) - safeNum(leg?.departureSecs))
      : null;
    if (durationBySecs !== null && durationBySecs > 0) return sum + durationBySecs;

    const durationSec = safeNum(leg?.durationSec) ?? safeNum(leg?.durationSeconds) ?? safeNum(leg?.duration);
    if (durationSec !== null) return sum + durationSec;
    const durationMin = safeNum(leg?.durationMin) ?? safeNum(leg?.durationMinutes);
    if (durationMin !== null) return sum + durationMin * 60;
    return sum;
  }, 0);

  if (total <= 0) return isFromHome ? 6 : 6;
  return Math.max(1, Math.round(total / 60));
}

function extractTransitJourneys(payload) {
  return pickFirstArray(
    payload?.journeys,
    payload?.itineraries,
    payload?.plans,
    payload?.routes,
    payload?.results,
    payload?.data?.journeys,
    payload?.data?.itineraries,
    payload?.data?.plans,
    payload?.data?.routes,
    payload?.data?.results
  );
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getModeStopNames(mode, isFromHome) {
  const modeRoutes = routes.filter(r => r.mode === mode);
  if (modeRoutes.length === 0) return [];

  if (isFromHome) {
    return uniqueBy(modeRoutes.map(r => normalizeStopName(r.stop)), n => n).filter(Boolean);
  }
  return uniqueBy(modeRoutes.map(r => normalizeStopName(r.getoff)), n => n).filter(Boolean);
}

function toApiCandidates(payload, mode, startMin, isFromHome) {
  const journeys = extractTransitJourneys(payload);
  if (journeys.length === 0) return [];

  const built = journeys.map(journey => {
    const legs = pickFirstArray(journey?.legs, journey?.sections, journey?.segments, journey?.trips);
    const transitLegs = legs.filter(isTransitLeg);
    const firstLeg = transitLegs[0] || null;
    const lastLeg = transitLegs[transitLegs.length - 1] || firstLeg;

    const departMin = parseApiTimeToMin(
      firstLeg?.departureSecs ?? firstLeg?.departureTime ?? firstLeg?.departure?.time ?? journey?.departureSecs ?? journey?.departureTime ?? journey?.departure?.time
    );
    const arriveMin = parseApiTimeToMin(
      lastLeg?.arrivalSecs ?? lastLeg?.arrivalTime ?? lastLeg?.arrival?.time ?? journey?.arrivalSecs ?? journey?.arrivalTime ?? journey?.arrival?.time
    );
    if (departMin === null || arriveMin === null) return null;

    let rideMin = arriveMin - departMin;
    if (rideMin <= 0) rideMin += 24 * 60;

    const walkMin = estimateWalkMinutes(legs, isFromHome);
    const line =
      firstLeg?.routeName ||
      firstLeg?.route?.shortName ||
      firstLeg?.route?.name ||
      firstLeg?.line?.shortName ||
      firstLeg?.line?.name ||
      firstLeg?.headsign ||
      firstLeg?.name ||
      "API経路";

    const stop = normalizeStopName(
      firstLeg?.from?.name || firstLeg?.departure?.stop?.name || firstLeg?.origin?.name || payload?.from?.name || "出発地"
    );
    const getoff = normalizeStopName(
      lastLeg?.to?.name || lastLeg?.arrival?.stop?.name || lastLeg?.destination?.name || payload?.to?.name || "到着地"
    );

    const finishMin = isFromHome ? arriveMin : arriveMin + walkMin;
    return {
      line,
      group: grp(line),
      stop,
      getoff,
      depart: toTime(departMin),
      arrive: toTime(arriveMin),
      walk: walkMin,
      ride: rideMin,
      finishMin,
    };
  }).filter(Boolean);

  return built
    .filter(c => toMin(c.depart) >= startMin)
    .sort((a, b) => a.finishMin - b.finishMin || toMin(a.depart) - toMin(b.depart));
}

async function resolvePlaceEndpointByName(name) {
  const key = normalizeStopName(name);
  if (_endpointCache.has(key)) return _endpointCache.get(key);

  const url = `${TRANSIT_API_BASE}/api/v1/places/suggest?q=${encodeURIComponent(key)}&limit=8`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Place suggest failed: ${res.status}`);
  }

  const data = await res.json();
  const places = Array.isArray(data?.places) ? data.places : [];
  if (places.length === 0) {
    throw new Error(`No endpoint for place: ${key}`);
  }

  const exact = places.find(p => normalizeStopName(p?.name) === key && (p?.kind === "stop" || p?.kind === "station"));
  const preferred = exact || places.find(p => p?.kind === "stop" || p?.kind === "station") || places[0];
  const endpoint = preferred?.endpoint || null;
  if (!endpoint) {
    throw new Error(`No endpoint field for place: ${key}`);
  }

  _endpointCache.set(key, endpoint);
  return endpoint;
}

async function loadCandidatesFromTransitAPI(mode, dt, startMin, isFromHome) {
  const q = API_MODE_QUERY[mode];
  if (!q) return [];

  const stationName = q.station;
  const homeStops = getModeStopNames(mode, isFromHome);
  if (!stationName || homeStops.length === 0) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRANSIT_API_TIMEOUT_MS);

  try {
    const stationEndpoint = await resolvePlaceEndpointByName(stationName);
    const stopEndpoints = await Promise.all(homeStops.map(name => resolvePlaceEndpointByName(name)));

    const allCandidates = [];
    for (let i = 0; i < homeStops.length; i++) {
      const stopName = homeStops[i];
      const stopEndpoint = stopEndpoints[i];
      const fromEndpoint = isFromHome ? stopEndpoint : stationEndpoint;
      const toEndpoint = isFromHome ? stationEndpoint : stopEndpoint;
      const fromLabel = isFromHome ? stopName : stationName;
      const toLabel = isFromHome ? stationName : stopName;

      const params = new URLSearchParams({
        from: fromEndpoint,
        to: toEndpoint,
        fromLabel,
        toLabel,
        date: fmtYmd(dt),
        time: fmtHm(dt),
        type: "departure",
        allowModes: "bus",
        numItineraries: "6",
      });

      const res = await fetch(`${TRANSIT_API_BASE}/api/v1/plan?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Transit API failed: ${res.status}`);
      }

      const payload = await res.json();
      const candidates = toApiCandidates(payload, mode, startMin, isFromHome)
        .map(c => ({ ...c, stop: normalizeStopName(c.stop), getoff: normalizeStopName(c.getoff) }));
      allCandidates.push(...candidates);
    }

    const deduped = uniqueBy(
      allCandidates,
      c => `${c.line}|${c.stop}|${c.getoff}|${c.depart}|${c.arrive}`
    ).sort((a, b) => a.finishMin - b.finishMin || toMin(a.depart) - toMin(b.depart));

    return deduped;
  } catch (err) {
    console.warn("Transit API unavailable, fallback to CSV", err);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

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
  const departDiff = toMin(c.depart) - startMin;
  const boardDiff = isFromHome ? Math.max(0, departDiff - c.walk) : Math.max(0, departDiff);

  // 家に着く時刻（バス停到着時刻 + 家までの徒歩時間）
  const homeArrive = toTime(toMin(c.arrive) + c.walk);

  const vars = {
    line:        c.line,
    stop:        c.stop,
    depart:      c.depart,
    arrive:      c.arrive,
    homeArrive,
    diff: departDiff,
    leaveDiff: boardDiff,
  };

  let key2;
  if (label === "next" || label === "prev") {
    key2 = label;
  } else {
    key2 = urgency(boardDiff);
  }

  const key1 = isFromHome ? "fromHome" : "toHome";
  const msg  = await getTransferMsg(key1, key2, vars);

  // 歩き時間が長い場合は補足
  const walkNote = c.walk >= 10
    ? (await getTransferMsg("walkLong", null)).text
    : "";

  setBubbleSpeech(msg.text + (walkNote ? `<br>${walkNote}` : ""));
  setCharacterExpression(msg.expression);
}

// ---- 候補を全件取得 ----

function getDepartureThreshold(route, startMin, isFromHome) {
  // 家→駅: 家からバス停までの徒歩時間を考慮して候補化
  // 駅→家: バス停での発車時刻だけを基準に候補化
  return isFromHome ? startMin + Number(route.walk_min) : startMin;
}

function buildCandidateFromRoute(route, schedule, isFromHome) {
  const departMin = toMin(schedule.depart_time);
  const rideMin   = Number(route.ride_min);
  const walkMin   = Number(route.walk_min);
  const arriveMin = departMin + rideMin;
  const finishMin = isFromHome ? arriveMin : arriveMin + walkMin;

  return {
    line:      route.line,
    group:     grp(route.line),
    stop:      route.stop,
    getoff:    route.getoff,
    depart:    schedule.depart_time,
    arrive:    toTime(arriveMin),
    walk:      walkMin,
    ride:      rideMin,
    finishMin,
  };
}

function buildAllCandidates(mode, dayType, startMin) {
  console.log("=== buildAllCandidates START ===");
  console.log("mode:", mode, "dayType:", dayType, "startMin:", startMin);

  const isFromHome = mode.startsWith("自宅→");

  return routes
    .filter(r => r.mode === mode)
    .flatMap(r => {
      console.log("---- checking route:", r);
      const departAfter = getDepartureThreshold(r, startMin, isFromHome);
      console.log("departAfter:", departAfter);

      return schedules
        .filter(s =>
          s.route === r.line && s.stop === r.stop &&
          s.direction === r.direction && s.day_type === dayType &&
          toMin(s.depart_time) >= departAfter
        )
        .map(s => buildCandidateFromRoute(r, s, isFromHome));
    })
    .sort((a, b) =>
      a.finishMin - b.finishMin || toMin(a.depart) - toMin(b.depart)
    );
}

// ---- 系統グループ別の最速1件 ----
function buildGroupBestFromAll(allCandidates, baseMin) {
  const best = {};

  // メイン便が23:00以降かどうか
  const showMidnight = baseMin >= 23 * 60;

  allCandidates
    .filter(c => {
      // baseMin 以降の便だけ
      if (toMin(c.depart) < baseMin) return false;

      // 深夜便は「メイン便が23:00以降のときだけ」表示
      if (c.line === "深夜" && !showMidnight) return false;

      return true;
    })
    .forEach(c => {
      const g = grp(c.line);
      if (!best[g] || c.finishMin < best[g].finishMin) {
        best[g] = c;
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
  // const groupBest = buildGroupBest(_lastMode, _lastDayType, focusMin);
  // 初回表示は startMin を使う
  let baseMin;
  if (label === "first") {
    baseMin = _initialStartMin;
  } else {
    baseMin = toMin(focusCandidate.depart);
  }

  const groupBest = buildGroupBestFromAll(_allCandidates, baseMin);

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
    setBubbleSpeech("日時を入力してね。");
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
  _initialStartMin = startMin;

  const csvCandidates = buildAllCandidates(mode, dayType, startMin);
  const apiCandidates = await loadCandidatesFromTransitAPI(mode, dt, startMin, isFromHome);

  if (apiCandidates.length > 0) {
    _allCandidates = apiCandidates;
    _lastDataSource = "Transit API";
  } else {
    _allCandidates = csvCandidates;
    _lastDataSource = "CSV（フォールバック）";
  }

  document.getElementById("dayTypeDisplay").innerText =
    `この日は「${dayType}」ダイヤです（データ: ${_lastDataSource}）`;

  _allIndex      = 0;

  console.log("allCandidates:", _allCandidates);
  console.log("count:", _allCandidates.length);

  if (_allCandidates.length === 0) {
    document.getElementById("routeCard").style.display = "none";
    document.getElementById("groupCards").innerHTML    = "";
    document.getElementById("prevBtn").disabled = true;
    document.getElementById("nextBtn").disabled = true;
    const msg = await getTransferMsg("noBus");
    setBubbleSpeech(msg.text);
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
  setBubbleSpeech("行き先と日時を選んで検索してね！");
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
  document.getElementById("searchBtn").addEventListener("click", searchBus);
  document.getElementById("prevBtn").addEventListener("click", showPrevBus);
  document.getElementById("nextBtn").addEventListener("click", showNextBus);
});
