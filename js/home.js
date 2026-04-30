// ----------------------------
// 天気取得（Open-Meteo）
// ----------------------------
async function getWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=35.779&longitude=139.514&current_weather=true";
  const res = await fetch(url);
  const data = await res.json();

  const code = data.current_weather.weathercode;

  // weathercode → sunny / cloudy / rain に変換
  if ([0, 1].includes(code)) return "sunny";
  if ([2, 3].includes(code)) return "cloudy";
  if ([51, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";

  return "cloudy";
}

// ----------------------------
// 時刻・日付表示
// ----------------------------
function updateDateTime() {
  const now = new Date();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;
  const timeStr = now.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit"
  });

  document.getElementById("currentDate").innerText = dateStr;
  document.getElementById("currentTime").innerText = timeStr;
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
  const zone = getTimeZone();
  const msg = await getMessage("home", zone);

  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}

// ----------------------------
// ページ読み込み時
// ----------------------------
window.onload = () => {
  updateDateTime();
  setInterval(updateDateTime, 60000); // 1分ごと更新
  loadHomeMessage();
}
