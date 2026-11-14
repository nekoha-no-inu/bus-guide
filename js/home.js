// ======================================
// home.js  ─  ホーム画面
// ======================================

// ---- 時刻・日付表示 ----

function updateDateTime() {
  const now      = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  document.getElementById("currentDate").innerText =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;

  document.getElementById("currentTime").innerText =
    now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// ---- 天気取得 ----

async function getWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=35.779&longitude=139.514&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=Asia/Tokyo";
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`天気の取得に失敗しました: HTTP ${res.status}`);
  const data = await res.json();
  const current = data.current_weather;
  const daily = data.daily;
  if (!current || !Number.isFinite(current.weathercode) || !Number.isFinite(current.temperature) ||
      !daily || !Number.isFinite(daily.temperature_2m_max?.[0]) ||
      !Number.isFinite(daily.temperature_2m_min?.[0])) {
    throw new Error("天気データの形式が正しくありません");
  }
  return {
    type: convertWeather(current.weathercode),
    temperature: current.temperature,
    max: daily.temperature_2m_max[0],
    min: daily.temperature_2m_min[0]
  };
}

async function loadHomeWeather() {
  const container = document.getElementById("homeWeather");
  try {
    const weather = await getWeather();
    container.innerHTML = `
      <img src="img/weather/${weather.type}.png" alt="">
      <p><strong>${WEATHER_LABELS[weather.type]}</strong>　現在 ${weather.temperature}℃<br>
      最高 ${weather.max}℃ ／ 最低 ${weather.min}℃</p>
    `;
    return weather.type;
  } catch (error) {
    console.warn("清瀬市の天気を取得できませんでした:", error);
    container.textContent = "天気を取得できませんでした。";
    return null;
  }
}

// ---- 時間帯判定 ----

function getApproxSunTimes(date = new Date()) {
  // 東京近辺を想定した月別のざっくり時刻（分）
  const month = date.getMonth(); // 0-11
  const table = [
    { sunrise: 6 * 60 + 50, sunset: 16 * 60 + 45 }, // 1月
    { sunrise: 6 * 60 + 25, sunset: 17 * 60 + 20 }, // 2月
    { sunrise: 5 * 60 + 45, sunset: 17 * 60 + 45 }, // 3月
    { sunrise: 5 * 60 + 5,  sunset: 18 * 60 + 10 }, // 4月
    { sunrise: 4 * 60 + 35, sunset: 18 * 60 + 35 }, // 5月
    { sunrise: 4 * 60 + 25, sunset: 18 * 60 + 55 }, // 6月
    { sunrise: 4 * 60 + 40, sunset: 18 * 60 + 50 }, // 7月
    { sunrise: 5 * 60 + 0,  sunset: 18 * 60 + 20 }, // 8月
    { sunrise: 5 * 60 + 25, sunset: 17 * 60 + 40 }, // 9月
    { sunrise: 5 * 60 + 50, sunset: 16 * 60 + 55 }, // 10月
    { sunrise: 6 * 60 + 20, sunset: 16 * 60 + 30 }, // 11月
    { sunrise: 6 * 60 + 45, sunset: 16 * 60 + 30 }, // 12月
  ];
  return table[month];
}

function getTimeZone() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const nowMin = h * 60 + m;
  const { sunrise, sunset } = getApproxSunTimes(now);

  // 夜は「日没〜翌日の日の出」
  if (nowMin < sunrise || nowMin >= sunset) return "night";

  // 昼間は従来の morning/noon を維持
  if (h < 11) return "morning";
  return "noon";
}

// ---- 最終更新取得 ----

async function loadLastUpdate() {
  try {
    const res = await fetch("https://api.github.com/repos/nekoha-no-inu/bus-guide/commits/main");
    const data = await res.json();

    const date = new Date(data.commit.committer.date);
    const formatted =
      `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 `
      + `${date.getHours()}時${date.getMinutes()}分`;

    document.getElementById("lastUpdate").innerText =
      `最終更新：${formatted}`;
  } catch (e) {
    document.getElementById("lastUpdate").innerText =
      "最終更新：取得できませんでした";
  }
}

// ---- セリフ表示 ----

function getStoredHomeReminder() {
  try {
    const raw = localStorage.getItem("homeReminder");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || Date.now() > data.expiresAt) {
      localStorage.removeItem("homeReminder");
      return null;
    }
    return data;
  } catch (e) {
    console.warn("Failed to read stored home reminder:", e);
    return null;
  }
}

async function loadHomeMessage(weatherPromise) {
  const reminder = getStoredHomeReminder();
  if (reminder) {
    setBubbleSpeech(reminder.text);
    setCharacterExpression(reminder.expression);
    return;
  }

  setBubbleSpeech("こんにちは。ちょっと待ってね…。", { instant: true });
  setCharacterExpression("normal");

  const zone = getTimeZone();
  const weather = await weatherPromise;

  const msg = await getMessage("home", zone, weather);
  setBubbleSpeech(msg.text || "おはようございます。今日もよろしくね。");
  setCharacterExpression(msg.expression);
}

// ---- ページ読み込み ----

window.addEventListener("load", async () => {
  initCharacterImage();
  updateDateTime();
  setInterval(updateDateTime, 60_000);

  const character = document.getElementById("character");
  if (character) {
    character.addEventListener("click", nextHomeTalk);
  }

  loadLastUpdate();
  const weatherPromise = loadHomeWeather();

  try {
    await loadHomeMessage(weatherPromise);
  } catch (e) {
    console.error("Failed to load home message:", e);
    setBubbleSpeech("メッセージを取得できませんでした。", { instant: true });
    setCharacterExpression("normal");
  }
});
