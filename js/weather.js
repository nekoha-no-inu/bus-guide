const cities = {
  kiyose:  { name: "清瀬市",  lat: 35.779, lon: 139.514 },
  toyama:  { name: "富山市",  lat: 36.695, lon: 137.213 },
  fukuoka: { name: "福岡市",  lat: 33.590, lon: 130.401 }
};

let currentCity = "kiyose";

function changeCity(cityKey) {
  currentCity = cityKey;

  // ★ ボタンの active を付け替え
  const buttons = document.querySelectorAll("#cityButtons button");
  buttons.forEach(btn => btn.classList.remove("active"));

  // 押されたボタンに active を付ける
  const activeBtn = document.querySelector(`#cityButtons button[onclick="changeCity('${cityKey}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  loadWeather();
}


// ----------------------------
// 天気取得（Open-Meteo）
// ----------------------------
async function getWeatherData() {
  try {
    const city = cities[currentCity];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=Asia/Tokyo`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      cityName: city.name,
      current: data.current_weather,
      daily: data.daily
    };

  } catch (e) {
    document.getElementById("bubble").innerHTML =
      "…ネットワークが不安定みたい。もう一回読み込んでみて…。";
    throw e;
  }
}


// ----------------------------
// 天気アイコン
// ----------------------------
function getWeatherIcon(type) {
  return `img/weather/${type}.png`;
}

// ----------------------------
// 日付フォーマット
// ----------------------------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const w = ["日","月","火","水","木","金","土"];
  return `${d.getMonth()+1}/${d.getDate()}（${w[d.getDay()]}）`;
}

function toJapaneseWeather(type) {
  switch (type) {
    case "sunny": return "晴れ";
    case "cloudy": return "曇り";
    case "rain": return "雨";
    case "snow": return "雪";
    case "thunder": return "雷雨";
    default: return "不明";
  }
}

// ----------------------------
// メイン処理
// ----------------------------
async function loadWeather() {

  // ★ 読み込み中セリフ（ここに追加）
  const loadingLines = [
    "…ちょっと待って。今、天気見てるから…",
    "読み込み中…。眠くなる…",
    "…データ取ってくるね。少しだけ待って…",
    "うーん…。通信してる…。"
  ];
  document.getElementById("bubble").innerHTML =
    loadingLines[Math.floor(Math.random() * loadingLines.length)];

  const data = await getWeatherData();

    document.getElementById("cityTitle").innerText =
    `${data.cityName}の今日と明日の天気`;

    // ★ 週間天気予報タイトル
  document.getElementById("weekTitle").innerText =
    `${data.cityName}の週間天気予報`;

  // 今日
  const todayType = convertWeather(data.current.weathercode);
  const todayMsg = await getMessage("weather", "today", todayType);
  const cityPrefix = `今日の${data.cityName}は`;

  document.getElementById("bubble").innerHTML = cityPrefix + todayMsg.text;

    document.getElementById("todayCard").innerHTML = `
    <h3>今日</h3>
    <img src="${getWeatherIcon(todayType)}" class="weather-icon">
    <p><b>天気：</b>${toJapaneseWeather(todayType)}</p>
    <p><b>気温：</b>${data.current.temperature} ℃</p>
    <p><b>風速：</b>${data.current.windspeed} m/s</p>
    `;

  // 明日
  const tomorrowType = convertWeather(data.daily.weathercode[1]);
  const tomorrowMsg = await getMessage("weather", "tomorrow", tomorrowType);

  document.getElementById("tomorrowCard").innerHTML = `
    <h3>明日</h3>
    <img src="${getWeatherIcon(tomorrowType)}" class="weather-icon">
    <p><b>天気：</b>${toJapaneseWeather(tomorrowType)}</p>
    <p><b>最高気温：</b>${data.daily.temperature_2m_max[1]} ℃</p>
    <p><b>最低気温：</b>${data.daily.temperature_2m_min[1]} ℃</p>
  `;

  // ----------------------------
  // 週間天気予報
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

  // ----------------------------
  // 週間総評（中央値の天気）
  // ----------------------------
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
