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
    "https://api.open-meteo.com/v1/forecast?latitude=35.779&longitude=139.514&current_weather=true&timezone=Asia/Tokyo";
  const res  = await fetch(url);
  const data = await res.json();
  return convertWeather(data.current_weather.weathercode);
}

// ---- 時間帯判定 ----

function getTimeZone() {
  const h = new Date().getHours();
  if (h < 11) return "morning";
  if (h < 17) return "noon";
  return "night";
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

async function loadHomeMessage() {
  const reminder = getStoredHomeReminder();
  if (reminder) {
    document.getElementById("bubble").innerHTML = reminder.text;
    setCharacterExpression(reminder.expression);
    return;
  }

  const zone    = getTimeZone();
  const weather = await getWeather();
  const msg     = await getMessage("home", zone, weather);

  document.getElementById("bubble").innerHTML = msg.text;
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

  try {
    await loadLastUpdate();
  } catch (e) {
    console.error("Failed to load last update:", e);
  }

  try {
    await loadHomeMessage();
  } catch (e) {
    console.error("Failed to load home message:", e);
    document.getElementById("bubble").innerText = "メッセージを取得できませんでした。";
    setCharacterExpression("normal");
  }
});
