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

// ---- セリフ表示 ----

async function loadHomeMessage() {
  const zone    = getTimeZone();
  const weather = await getWeather();
  const msg     = await getMessage("home", zone, weather);

  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}

// ---- ページ読み込み ----

window.addEventListener("load", () => {
  initCharacterImage();
  updateDateTime();
  setInterval(updateDateTime, 60_000);
  loadHomeMessage();
});
