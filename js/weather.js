// ----------------------------
// 天気取得（Open-Meteo）
// ----------------------------
async function getWeatherData() {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=35.779&longitude=139.514&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=Asia/Tokyo";

  const res = await fetch(url);
  const data = await res.json();

  return {
    current: data.current_weather,
    daily: data.daily
  };
}

// weathercode → sunny / cloudy / rain
function convertWeather(code) {
  if ([0, 1].includes(code)) return "晴れ";
  if ([2, 3].includes(code)) return "曇り";
  if ([51, 61, 63, 65, 80, 81, 82].includes(code)) return "雨";
  return "曇り";
}

// 天気アイコン
function getWeatherIcon(type) {
  return `img/weather/${type}.png`;
}

// 日付を「月/日（曜）」に変換
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const w = ["日","月","火","水","木","金","土"];
  return `${d.getMonth()+1}/${d.getDate()}（${w[d.getDay()]}）`;
}

// ----------------------------
// 表情変更
// ----------------------------
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  img.src = `img/character_${type}.png`;
}

// ----------------------------
// メイン処理
// ----------------------------
async function loadWeather() {
  const data = await getWeatherData();

  // 今日
  const todayType = convertWeather(data.current.weathercode);
  const todayMsg = await getMessage("weather", "today", todayType);

  document.getElementById("bubble").innerHTML = todayMsg.text;
  setCharacterExpression(todayMsg.expression);

  document.getElementById("todayCard").innerHTML = `
    <h3>今日</h3>
    <img src="${getWeatherIcon(todayType)}" class="weather-icon">
    <p><b>天気：</b>${todayType}</p>
    <p><b>気温：</b>${data.current.temperature} ℃</p>
    <p><b>風速：</b>${data.current.windspeed} m/s</p>
  `;

  // 明日
  const tomorrowType = convertWeather(data.daily.weathercode[1]);
  const tomorrowMsg = await getMessage("weather", "tomorrow", tomorrowType);

  document.getElementById("tomorrowCard").innerHTML = `
    <h3>明日</h3>
    <img src="${getWeatherIcon(tomorrowType)}" class="weather-icon">
    <p><b>天気：</b>${tomorrowType}</p>
    <p><b>最高気温：</b>${data.daily.temperature_2m_max[1]} ℃</p>
    <p><b>最低気温：</b>${data.daily.temperature_2m_min[1]} ℃</p>
  `;

  // ----------------------------
  // 週間天気予報（横向き表）
  // ----------------------------
  const weekTable = document.getElementById("weekTable");

  weekTable.innerHTML = `
    <tr>
      <th>日付</th>
      <th>天気</th>
      <th>最高</th>
      <th>最低</th>
    </tr>
  `;

  for (let i = 0; i < data.daily.time.length; i++) {
    const wType = convertWeather(data.daily.weathercode[i]);

    weekTable.innerHTML += `
      <tr>
        <td>${formatDate(data.daily.time[i])}</td>
        <td><img src="${getWeatherIcon(wType)}" class="weather-icon"></td>
        <td>${data.daily.temperature_2m_max[i]} ℃</td>
        <td>${data.daily.temperature_2m_min[i]} ℃</td>
      </tr>
    `;
  }

  // 週間総評
  const weekSummaryType = convertWeather(
    data.daily.weathercode.slice(0, 7).sort()[3]
  );
  const weekMsg = await getMessage("weather", "week", weekSummaryType);

  document.getElementById("bubble").innerHTML += "<br><br>" + weekMsg.text;
}

// ----------------------------
// ページ読み込み時
// ----------------------------
window.onload = () => {
  loadWeather();
};
