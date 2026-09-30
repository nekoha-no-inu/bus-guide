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
let _routeDecisionLogs = [];
let _selectedDayType = null;

function addRouteDecisionLog(message, details = null) {
  const time = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const detailText = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  _routeDecisionLogs.push(`[${time}] ${message}${detailText}`);
  if (_routeDecisionLogs.length > 300) _routeDecisionLogs.shift();
  renderRouteDecisionLogs();
}

function renderRouteDecisionLogs() {
  const output = document.getElementById("routeDecisionLogOutput");
  if (output) output.textContent = _routeDecisionLogs.join("\n\n");
}

function toggleRouteDecisionLogs() {
  const panel = document.getElementById("routeDecisionLogPanel");
  const button = document.getElementById("routeDecisionLogButton");
  if (!panel || !button) return;
  panel.hidden = !panel.hidden;
  button.setAttribute("aria-expanded", String(!panel.hidden));
  button.textContent = panel.hidden ? "ルート決定ログを表示" : "ルート決定ログを隠す";
  renderRouteDecisionLogs();
}

function setSelectedDayType(dayType) {
  _selectedDayType = dayType;
  document.querySelectorAll("#timetableDayButtons button").forEach(button => {
    const selected = button.dataset.dayType === dayType;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function refreshDayTypeFromDate() {
  const datetimeValue = document.getElementById("datetime")?.value;
  if (!datetimeValue) return;
  setSelectedDayType(getDayType(new Date(datetimeValue)));
}

// ---- データ読み込み ----

async function loadHolidays() {
  try {
    const res = await fetch(HOLIDAY_API);
    if (!res.ok) {
      throw new Error(`Holiday API failed: ${res.status}`);
    }
    const data = await res.json();
    holidayList = Array.isArray(data?.items)
      ? data.items.filter(ev => ev.start?.date).map(ev => ev.start.date)
      : [];
  } catch (e) {
    console.error("loadHolidays failed, falling back to empty holiday list:", e);
    holidayList = [];
  }
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
    const normalizedStop = normalizeStopNameForLine(r.stop, r.line);
    const normalizedGetoff = normalizeStopNameForLine(r.getoff, r.line);
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
// 清62系統は「台田」発着（「下戸」は清64系統のバス停なので混同を防ぐ）
function normalizeStopNameForLine(name, line) {
  const normalized = normalizeStopName(name);

  // 清62系統かどうかを厳密に判定
  const isSeibu62 = /^清62(?:-|$)/.test(line);

  // CSV に存在する停留所名一覧
  const csvStops = routes.map(r => normalizeStopName(r.stop));
  const csvGetoffs = routes.map(r => normalizeStopName(r.getoff));
  const csvNames = new Set([...csvStops, ...csvGetoffs]);

  // 「下戸」補正は CSV に存在する場合のみ適用
  const isCsvExactMatch = csvNames.has(normalized);

  // 補正条件：
  // 1. 清62系統である
  // 2. normalized が「下戸」である
  // 3. CSV に「下戸」が存在する（誤変換防止）
  if (isSeibu62 && normalized === "下戸" && isCsvExactMatch) {
    return "台田";
  }

  return normalized;
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
  const dayMin = ((m % (24 * 60)) + (24 * 60)) % (24 * 60);
  return `${String(Math.floor(dayMin / 60)).padStart(2, "0")}:${String(dayMin % 60).padStart(2, "0")}`;
}
function fmtDTL(date) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function formatDepartureDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}` : "日時を選択";
}
function parseDepartureDateTime(value) {
  const match = String(value || "").trim().match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day) || date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute)) {
    return null;
  }
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
function setDepartureDateTime(value) {
  const input = document.getElementById("datetime");
  const manual = document.getElementById("datetimeManual");
  if (!input || !manual) return;
  input.value = value;
  manual.value = formatDepartureDateTime(value);
}
function syncDepartureDateTimeFromManual() {
  const manual = document.getElementById("datetimeManual");
  const input = document.getElementById("datetime");
  if (!manual || !input) return false;
  const parsed = parseDepartureDateTime(manual.value);
  manual.setCustomValidity(parsed ? "" : "日時を yyyy/mm/dd HH:mm の形式で入力してください。");
  if (!parsed) return false;
  input.value = parsed;
  return true;
}
function grp(line) { return line.replace(/-\d+$/, ""); }

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseApiTimeToMin(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 24 * 60 * 60) {
      const timestamp = new Date(value > 1e11 ? value : value * 1000);
      if (!Number.isNaN(timestamp.getTime())) return timestamp.getHours() * 60 + timestamp.getMinutes();
    }
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

function parseApiDateTimeOffsetMin(value, referenceDate) {
  let date = null;
  if (typeof value === "number" && Number.isFinite(value) && value > 24 * 60 * 60) {
    date = new Date(value > 1e11 ? value : value * 1000);
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    date = new Date(value);
  }
  if (!date || Number.isNaN(date.getTime())) return null;

  const referenceDay = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const targetDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOffset = Math.round((targetDay - referenceDay) / (24 * 60 * 60 * 1000));
  return dayOffset * 24 * 60 + date.getHours() * 60 + date.getMinutes();
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

function extractStopNameFromLeg(leg, payload) {
  const candidates = [
    leg?.from?.name,
    leg?.departure?.stop?.name,
    leg?.departure?.place?.name,
    leg?.origin?.name,
    leg?.from?.code,
    leg?.departure?.stop?.code,
    payload?.from?.name
  ];

  const raw = candidates.find(v => typeof v === "string" && v.trim().length > 0);
  return raw || "出発地";
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

// 系統（清62/清62-1 など）ごとに routes.csv の正しい停留所名・徒歩時間を引く
function findCsvRouteForLine(mode, line) {
  if (!line) return null;

  // 全角 → 半角
  const normalizedLine = line.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

  // 数字抽出（例：清61 → 61）
  const numMatch = normalizedLine.match(/\d+/);
  const apiNum = numMatch ? numMatch[0] : null;

  // CSV の系統名一覧
  const csvGroups = routes
    .filter(r => r.mode === mode)
    .map(r => grp(r.line));

  // 1. 数字一致（最優先）
  if (apiNum) {
    const matchedGroup = csvGroups.find(g => g.includes(apiNum));
    if (matchedGroup) {
      return routes.find(r => r.mode === mode && grp(r.line) === matchedGroup) || null;
    }
  }

  // 2. 部分一致（例：清61系統 → 清61）
  const partialMatch = csvGroups.find(g => normalizedLine.includes(g));
  if (partialMatch) {
    return routes.find(r => r.mode === mode && grp(r.line) === partialMatch) || null;
  }

  // 3. grp(line) が一致するもの
  const g = grp(normalizedLine);
  const fallback = routes.find(r => r.mode === mode && grp(r.line) === g);
  if (fallback) return fallback;

  return null;
}


// ---- Transit API の leg から停留所名を安定して抽出する ----
function extractStopNameFromLeg(leg, payload) {
  const candidates = [
    leg?.from?.name,
    leg?.departure?.stop?.name,
    leg?.departure?.place?.name,
    leg?.origin?.name,
    leg?.from?.code,
    leg?.departure?.stop?.code,
    payload?.from?.name
  ];

  // 最初に有効な文字列を採用
  const raw = candidates.find(v => typeof v === "string" && v.trim().length > 0);
  return raw || "出発地";
}


function toApiCandidates(payload, mode, dt, startMin, isFromHome) {
  const journeys = extractTransitJourneys(payload);
  if (journeys.length === 0) return [];

  const built = journeys.map(journey => {
    const legs = pickFirstArray(journey?.legs, journey?.sections, journey?.segments, journey?.trips);
    const transitLegs = legs.filter(isTransitLeg);
    const firstLeg = transitLegs[0] || null;
    const lastLeg = transitLegs[transitLegs.length - 1] || firstLeg;

    const departValue = firstLeg?.departureSecs ?? firstLeg?.departureTime ?? firstLeg?.departure?.time ??
      journey?.departureSecs ?? journey?.departureTime ?? journey?.departure?.time;
    const arriveValue = lastLeg?.arrivalSecs ?? lastLeg?.arrivalTime ?? lastLeg?.arrival?.time ??
      journey?.arrivalSecs ?? journey?.arrivalTime ?? journey?.arrival?.time;
    const departMin = parseApiTimeToMin(
      departValue
    );
    const arriveMin = parseApiTimeToMin(
      arriveValue
    );
    if (departMin === null || arriveMin === null) return null;

    let rideMin = arriveMin - departMin;
    if (rideMin <= 0) rideMin += 24 * 60;
    const timestampDepartMin = parseApiDateTimeOffsetMin(departValue, dt);
    const timestampArriveMin = parseApiDateTimeOffsetMin(arriveValue, dt);
    if (timestampDepartMin !== null && timestampArriveMin !== null) {
      rideMin = timestampArriveMin - timestampDepartMin;
      if (rideMin <= 0) rideMin += 24 * 60;
    }

    // -----------------------------
    // ★ 修正：line 名の抽出を強化
    // -----------------------------
    const rawLineCandidates = [
      firstLeg?.routeName,
      firstLeg?.route?.shortName,
      firstLeg?.route?.name,
      firstLeg?.line?.shortName,
      firstLeg?.line?.name,
      firstLeg?.headsign,
      firstLeg?.name
    ].filter(Boolean);

    // CSV の line 名一覧（清61 / 清62 / 清64）
    const csvLines = routes.map(r => grp(r.line));

    // CSV と一致する候補を探す
    const matchedCsvLine = rawLineCandidates.find(raw =>
      csvLines.some(csv => raw.includes(csv))
    );

    const line = matchedCsvLine || rawLineCandidates[0] || "不明系統";

    // -----------------------------
    // CSV の route が見つかればそれを優先
    // -----------------------------
    const csvRoute = findCsvRouteForLine(mode, line);

    const walkMin = csvRoute
      ? Number(csvRoute.walk_min)
      : estimateWalkMinutes(legs, isFromHome);

    const stop = csvRoute
      ? csvRoute.stop
      : normalizeStopNameForLine(
          extractStopNameFromLeg(firstLeg, payload),
          line
        );

    const getoff = csvRoute
      ? csvRoute.getoff
      : normalizeStopNameForLine(
          lastLeg?.to?.name ||
          lastLeg?.arrival?.stop?.name ||
          lastLeg?.destination?.name ||
          payload?.to?.name ||
          "到着地",
          line
        );

    let departAbsoluteMin = timestampDepartMin ?? departMin;
    while (departAbsoluteMin < startMin) departAbsoluteMin += 24 * 60;
    const arriveAbsoluteMin = departAbsoluteMin + rideMin;
    const finishMin = isFromHome ? arriveAbsoluteMin : arriveAbsoluteMin + walkMin;

    return {
      line,
      group: grp(line),
      stop,
      getoff,
      depart: toTime(departAbsoluteMin),
      arrive: toTime(arriveAbsoluteMin),
      departMin: departAbsoluteMin,
      arriveMin: arriveAbsoluteMin,
      walk: walkMin,
      ride: rideMin,
      finishMin,
    };
  }).filter(Boolean);

  const eligible = built.filter(c => c.departMin >= startMin);
  addRouteDecisionLog("Transit API候補を解析", {
    journeyCount: journeys.length,
    parsedCount: built.length,
    eligibleCount: eligible.length,
    candidates: eligible.map(c => ({ line: c.line, stop: c.stop, depart: c.depart, arrive: c.arrive, finishMin: c.finishMin })),
  });
  return eligible.sort((a, b) => a.finishMin - b.finishMin || a.departMin - b.departMin);
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

  console.log(`[resolvePlaceEndpointByName] query="${key}" candidates:`, places);

  if (places.length === 0) {
    throw new Error(`No endpoint for place: ${key}`);
  }

  // -----------------------------
  // 1. 完全一致（stop優先）
  // -----------------------------
  const exactStop = places.find(
    p => normalizeStopName(p?.name) === key && p?.kind === "stop"
  );

  if (exactStop) {
    console.log(`[resolvePlaceEndpointByName] "${key}" selected (exactStop):`, exactStop);
    _endpointCache.set(key, exactStop.endpoint);
    return exactStop.endpoint;
  }

  // -----------------------------
  // 2. 完全一致（kind問わず）
  // -----------------------------
  const exactAny = places.find(
    p => normalizeStopName(p?.name) === key
  );

  if (exactAny) {
    console.log(`[resolvePlaceEndpointByName] "${key}" selected (exactAny):`, exactAny);
    _endpointCache.set(key, exactAny.endpoint);
    return exactAny.endpoint;
  }

  // -----------------------------
  // 3. 部分一致（stop優先）
  // -----------------------------
  const partialStop = places.find(
    p => p?.kind === "stop" && normalizeStopName(p?.name).includes(key)
  );

  if (partialStop) {
    console.log(`[resolvePlaceEndpointByName] "${key}" selected (partialStop):`, partialStop);
    _endpointCache.set(key, partialStop.endpoint);
    return partialStop.endpoint;
  }

  // -----------------------------
  // 4. CSV に存在する停留所名と最も近い候補を選ぶ
  // -----------------------------
  const csvStops = routes.map(r => normalizeStopName(r.stop));
  const csvGetoffs = routes.map(r => normalizeStopName(r.getoff));
  const csvNames = new Set([...csvStops, ...csvGetoffs]);

  const csvMatch = places.find(
    p => csvNames.has(normalizeStopName(p?.name))
  );

  if (csvMatch) {
    console.log(`[resolvePlaceEndpointByName] "${key}" selected (csvMatch):`, csvMatch);
    _endpointCache.set(key, csvMatch.endpoint);
    return csvMatch.endpoint;
  }

  // -----------------------------
  // 5. fallback: 最初の候補
  // -----------------------------
  const preferred = places[0];
  console.log(`[resolvePlaceEndpointByName] "${key}" selected (fallback):`, preferred);

  const endpoint = preferred?.endpoint;
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
      const candidates = toApiCandidates(payload, mode, dt, startMin, isFromHome)
        .map(c => ({ ...c, stop: normalizeStopNameForLine(c.stop, c.line), getoff: normalizeStopNameForLine(c.getoff, c.line) }));
      allCandidates.push(...candidates);
    }

    const deduped = uniqueBy(
      allCandidates,
      c => `${c.line}|${c.stop}|${c.getoff}|${c.depart}|${c.arrive}`
    ).sort((a, b) => a.finishMin - b.finishMin || (a.departMin ?? toMin(a.depart)) - (b.departMin ?? toMin(b.depart)));

    return deduped;
  } catch (err) {
    addRouteDecisionLog("Transit API失敗、CSVへ切り替え", { error: String(err) });
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
  const departDiff = (c.departMin ?? toMin(c.depart)) - startMin;
  const boardDiff = isFromHome ? Math.max(0, departDiff - c.walk) : Math.max(0, departDiff);

  // 家に着く時刻（バス停到着時刻 + 家までの徒歩時間）
  const homeArrive = toTime((c.arriveMin ?? toMin(c.arrive)) + c.walk);

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
    departMin,
    arriveMin,
    walk:      walkMin,
    ride:      rideMin,
    finishMin,
  };
}

function buildAllCandidates(mode, dayType, startMin) {
  const isFromHome = mode.startsWith("自宅→");
  const modeRoutes = routes.filter(r => r.mode === mode);
  const candidates = modeRoutes.flatMap(r => {
      const departAfter = getDepartureThreshold(r, startMin, isFromHome);
      const matches = schedules.filter(s =>
          s.route === r.line && s.stop === r.stop &&
          s.direction === r.direction && s.day_type === dayType &&
          toMin(s.depart_time) >= departAfter
        );
      addRouteDecisionLog(`${r.line}: ${matches.length}件の時刻表候補`, {
        stop: r.stop,
        direction: r.direction,
        dayType,
        departAfter,
        departures: matches.map(s => s.depart_time),
      });
      return matches.map(s => buildCandidateFromRoute(r, s, isFromHome));
    });
  const sorted = candidates.sort((a, b) => a.finishMin - b.finishMin || a.departMin - b.departMin);
  addRouteDecisionLog("CSV候補の生成完了", { routeCount: modeRoutes.length, candidateCount: sorted.length });
  return sorted;
}

// ---- 系統グループ別の最速1件 ----
function buildGroupBestFromAll(allCandidates, baseMin, isFromHome) {
  const best = {};

  // メイン便が23:00以降かどうか
  const showMidnight = baseMin >= 23 * 60;

  allCandidates
    .filter(c => {
      // 家→駅の場合はバス停までの徒歩時間を考慮し、実際に乗車可能な便だけを対象にする
      const departThreshold = isFromHome ? baseMin + c.walk : baseMin;
      if ((c.departMin ?? toMin(c.depart)) < departThreshold) return false;

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

  addRouteDecisionLog("系統別候補を決定", Object.fromEntries(Object.entries(best).map(([group, c]) => [group, {
    line: c.line, depart: c.depart, arrive: c.arrive, finishMin: c.finishMin,
  }])));
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
    const homeArrive = toTime((c.arriveMin ?? toMin(c.arrive)) + c.walk);
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
    const homeArrive = toTime((c.arriveMin ?? toMin(c.arrive)) + c.walk);
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
  addRouteDecisionLog("表示便を決定", {
    reason: label,
    index: _allIndex + 1,
    total: _allCandidates.length,
    line: focusCandidate.line,
    stop: focusCandidate.stop,
    depart: focusCandidate.depart,
    arrive: focusCandidate.arrive,
    finishMin: focusCandidate.finishMin,
  });
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
  const focusMin  = focusCandidate.departMin ?? toMin(focusCandidate.depart);
  // const groupBest = buildGroupBest(_lastMode, _lastDayType, focusMin);
  // 初回表示は startMin を使う
  let baseMin;
  if (label === "first") {
    baseMin = _initialStartMin;
  } else {
    baseMin = focusCandidate.departMin ?? toMin(focusCandidate.depart);
  }

  const groupBest = buildGroupBestFromAll(_allCandidates, baseMin, isFromHome);

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
  _routeDecisionLogs = [];
  addRouteDecisionLog("検索開始");

  if (!syncDepartureDateTimeFromManual()) {
    addRouteDecisionLog("検索中止: 出発日時が未入力");
    document.getElementById("datetimeManual").reportValidity();
    setBubbleSpeech("出発日時を yyyy/mm/dd HH:mm の形式で入力してね。");
    return;
  }
  const datetime = document.getElementById("datetime").value;

  const dt         = new Date(datetime);
  const startMin   = dt.getHours() * 60 + dt.getMinutes();
  const mode       = document.querySelector("#modeButtons .active").dataset.mode;
  const calendarDayType = getDayType(dt);
  const dayType    = _selectedDayType || calendarDayType;
  const isFromHome = mode.startsWith("自宅→");

  addRouteDecisionLog("検索条件", { datetime, calendarDayType, selectedDayType: dayType, mode, dayType, startMin, isFromHome });

  _lastMode       = mode;
  _lastDayType    = dayType;
  _lastIsFromHome = isFromHome;
  _initialStartMin = startMin;

  const csvCandidates = buildAllCandidates(mode, dayType, startMin);
  const isDayTypeOverride = dayType !== calendarDayType;
  let apiCandidates = [];
  if (isDayTypeOverride) {
    addRouteDecisionLog("曜日ダイヤを手動指定したためTransit APIを使わず、選択したCSVダイヤを使用");
  } else {
    const loadingMessage = await getTransferMsg("loading");
    setBubbleSpeech(loadingMessage.text);
    setCharacterExpression(loadingMessage.expression);
    apiCandidates = await loadCandidatesFromTransitAPI(mode, dt, startMin, isFromHome);
  }

  if (apiCandidates.length > 0) {
    _allCandidates = apiCandidates;
    _lastDataSource = "Transit API";
  } else {
    _allCandidates = csvCandidates;
    _lastDataSource = "CSV（フォールバック）";
  }
  addRouteDecisionLog("候補データの選択", {
    source: _lastDataSource,
    apiCandidateCount: apiCandidates.length,
    csvCandidateCount: csvCandidates.length,
  });

  document.getElementById("dayTypeDisplay").innerText =
    `この日は「${dayType}」ダイヤです（データ: ${_lastDataSource}）`;

  _allIndex      = 0;

  addRouteDecisionLog("到着順に並べた候補", _allCandidates.map((c, index) => ({
    index: index + 1, line: c.line, stop: c.stop, depart: c.depart, arrive: c.arrive,
    finishMin: c.finishMin,
  })));

  if (_allCandidates.length === 0) {
    addRouteDecisionLog("該当する便なし", { source: _lastDataSource, mode, dayType, startMin });
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
  addRouteDecisionLog("前の便を表示", { index: _allIndex + 1, candidate: _allCandidates[_allIndex] });
  await renderAll(_allCandidates[_allIndex], _lastIsFromHome, "prev");
}

async function showNextBus() {
  if (_allIndex >= _allCandidates.length - 1) return;
  _allIndex++;
  addRouteDecisionLog("次の便を表示", { index: _allIndex + 1, candidate: _allCandidates[_allIndex] });
  await renderAll(_allCandidates[_allIndex], _lastIsFromHome, "next");
}

// ---- 初期化 ----

window.addEventListener("load", async () => {
  setBubbleSpeech("行き先と日時を選んで検索してね！");
  await Promise.all([loadCSV(), loadHolidays()]);
  const datetimeInput = document.getElementById("datetime");
  const datetimePicker = datetimeInput;
  const datetimeManual = document.getElementById("datetimeManual");
  const initialValue = fmtDTL(new Date());
  setDepartureDateTime(initialValue);
  datetimeManual.addEventListener("input", () => {
    if (syncDepartureDateTimeFromManual()) refreshDayTypeFromDate();
  });
  datetimeManual.addEventListener("change", () => {
    if (!syncDepartureDateTimeFromManual()) datetimeManual.reportValidity();
    else refreshDayTypeFromDate();
  });
  datetimePicker.addEventListener("change", () => {
    setDepartureDateTime(datetimePicker.value);
    refreshDayTypeFromDate();
  });
  refreshDayTypeFromDate();

  document.querySelectorAll("#modeButtons button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeButtons button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  document.querySelectorAll("#timetableDayButtons button").forEach(button => {
    button.addEventListener("click", () => setSelectedDayType(button.dataset.dayType));
  });
  document.getElementById("nowButton").addEventListener("click", () => {
    setDepartureDateTime(fmtDTL(new Date()));
  });
  document.getElementById("datetimePickerBtn").addEventListener("click", () => {
    if (typeof datetimePicker.showPicker === "function") datetimePicker.showPicker();
    else datetimePicker.click();
  });
  document.getElementById("searchBtn").addEventListener("click", searchBus);
  document.getElementById("prevBtn").addEventListener("click", showPrevBus);
  document.getElementById("nextBtn").addEventListener("click", showNextBus);
  document.getElementById("routeDecisionLogButton").addEventListener("click", toggleRouteDecisionLogs);
});
