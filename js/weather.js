// ======================================
// weather.js  ─  天気予報
// ======================================

const CITIES = {
  kiyose:  { name: "清瀬市",  lat: 35.779, lon: 139.514 },
  toyama:  { name: "富山市",  lat: 36.695, lon: 137.213 },
  fukuoka: { name: "福岡市",  lat: 33.590, lon: 130.401 }
};

const WEATHER_LABELS = {
  sunny:   "晴れ",
  cloudy:  "曇り",
  rain:    "雨",
  snow:    "雪",
  thunder: "雷雨"
};

const LOADING_LINES = [
  "…ちょっと待って。今、天気見てるから…",
  "読み込み中…。眠くなる…",
  "…データ取ってくるね。少しだけ待って…",
  "うーん…。通信してる…。"
];

let currentCity = "kiyose";

// ---- 都市切替 ----

function changeCity(cityKey) {
  currentCity = cityKey;

  document.querySelectorAll("#cityButtons button").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.querySelector(`#cityButtons button[onclick="changeCity('${cityKey}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  loadWeather();
}

// ---- 天気データ取得 ----

async function getWeatherData() {
  try {
    const { lat, lon, name } = CITIES[currentCity];
    const url  = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=Asia/Tokyo`;
    const data = await fetch(url).then(r => r.json());

    return { cityName: name, current: data.current_weather, daily: data.daily };
  } catch (e) {
    document.getElementById("bubble").innerHTML = "…ネットワークが不安定みたい。もう一回読み込んでみて…。";
    throw e;
  }
}

// ---- ユーティリティ ----

const getWeatherIcon = type => `img/weather/${type}.png`;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const w = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}/${d.getDate()}（${w[d.getDay()]}）`;
}

// ---- メイン処理 ----

async function loadWeather() {
  document.getElementById("bubble").innerHTML = LOADING_LINES[Math.floor(Math.random() * LOADING_LINES.length)];

  const data = await getWeatherData();

  document.getElementById("cityTitle").innerText = `${data.cityName}の今日と明日の天気`;
  document.getElementById("weekTitle").innerText = `${data.cityName}の週間天気予報`;

  // 今日
  const todayType = convertWeather(data.current.weathercode);
  const todayMsg  = await getMessage("weather", "today", todayType);
  document.getElementById("bubble").innerHTML = `今日の${data.cityName}は` + todayMsg.text;
  document.getElementById("todayCard").innerHTML = `
    <h3>今日</h3>
    <img src="${getWeatherIcon(todayType)}" class="weather-icon">
    <p><b>天気：</b>${WEATHER_LABELS[todayType] ?? "不明"}</p>
    <p><b>気温：</b>${data.current.temperature} ℃</p>
    <p><b>風速：</b>${data.current.windspeed} m/s</p>
  `;

  // 明日
  const tomorrowType = convertWeather(data.daily.weathercode[1]);
  const tomorrowMsg  = await getMessage("weather", "tomorrow", tomorrowType);
  document.getElementById("tomorrowCard").innerHTML = `
    <h3>明日</h3>
    <img src="${getWeatherIcon(tomorrowType)}" class="weather-icon">
    <p><b>天気：</b>${WEATHER_LABELS[tomorrowType] ?? "不明"}</p>
    <p><b>最高気温：</b>${data.daily.temperature_2m_max[1]} ℃</p>
    <p><b>最低気温：</b>${data.daily.temperature_2m_min[1]} ℃</p>
  `;

  // 週間天気予報
  const weekTable = document.getElementById("weekTable");
  weekTable.innerHTML = `
    <tr><th>日付</th><th>天気</th><th>最高</th><th>最低</th></tr>
  `;

  data.daily.time.forEach((dateStr, i) => {
    const wType = convertWeather(data.daily.weathercode[i]);
    weekTable.innerHTML += `
      <tr>
        <td>${formatDate(dateStr)}</td>
        <td><img src="${getWeatherIcon(wType)}" class="weather-icon"></td>
        <td>${data.daily.temperature_2m_max[i]} ℃</td>
        <td>${data.daily.temperature_2m_min[i]} ℃</td>
      </tr>
    `;
  });

  // 週間総評
  const weekSummaryType = convertWeather(
    [...data.daily.weathercode].slice(0, 7).sort()[3]
  );
  const weekMsg = await getMessage("weather", "week", weekSummaryType);
  document.getElementById("bubble").innerHTML += "<br><br>" + weekMsg.text;
}

// ---- 初期化 ----

window.addEventListener("load", loadWeather);
