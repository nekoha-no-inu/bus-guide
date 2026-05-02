// ----------------------------
// 時刻・日付表示
// ----------------------------
function updateDateTime() {
  const now = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;

  // 秒が出ないように second を明示的に指定
  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: undefined
  });

  document.getElementById("currentDate").innerText = dateStr;
  document.getElementById("currentTime").innerText = timeStr;
}

// ----------------------------
// 現在の天気（home.js 用）
// ----------------------------
async function getWeather() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=35.779&longitude=139.514&current_weather=true&timezone=Asia/Tokyo";

  const res = await fetch(url);
  const data = await res.json();

  const code = data.current_weather.weathercode;
  return convertWeather(code); // ← 英語の sunny/cloudy/rain を返す
}

// ----------------------------
// 時間帯判定（朝・昼・夜）
// ----------------------------
function getTimeZone() {
  const h = new Date().getHours();
  if (h < 11) return "morning";
  if (h < 17) return "noon";
  return "night";
}

// ----------------------------
// 表情変更
// ----------------------------
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  img.src = `img/character_${type}.png`;
}

// ----------------------------
// セリフ表示（時間帯連動）
// ----------------------------
async function loadHomeMessage() {
  const zone = getTimeZone();        // morning / noon / night
  const weather = await getWeather(); // sunny / cloudy / rain / snow / thunder

  const msg = await getMessage("home", zone, weather);

  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}


// ----------------------------
// ページ読み込み時
// ----------------------------
// onload 上書き防止のため addEventListener を使用
window.addEventListener("load", () => {
  updateDateTime();
  setInterval(updateDateTime, 60000); // 1分ごと更新
  loadHomeMessage();
});
