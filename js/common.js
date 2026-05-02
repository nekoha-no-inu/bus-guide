async function getMessage(page, key1, key2, vars = {}) {
  const res = await fetch("data/conversation.json");
  const data = await res.json();

  let list;

  // 3階層（home, weather）
  if (data[page] && data[page][key1] && data[page][key1][key2]) {
    list = data[page][key1][key2];
  }
  // 2階層（garbage, timetable, transfer）
  else if (data[page] && data[page][key1]) {
    list = data[page][key1];
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.warn("Message list empty:", page, key1, key2);
    return { text: "", expression: "normal" };
  }

  const item = list[Math.floor(Math.random() * list.length)];
  let text = item.text || item;
  const expression = item.expression || "normal";

  // ----------------------------
  // 🔥 テンプレート変数の置換
  // ----------------------------
  for (const key in vars) {
    const regex = new RegExp(`{{${key}}}`, "g");
    text = text.replace(regex, vars[key]);
  }

  return { text, expression };
}


function setCharacterExpression(type) {
  const img = document.getElementById("character");
  const path = `img/character_${type}.png`;

  img.onerror = () => {
    img.src = "img/character_normal.png";
  };

  img.src = path;
}

// ----------------------------
// weathercode → sunny / cloudy / rain / snow / thunder
// ----------------------------
function convertWeather(code) {
  if ([0, 1].includes(code)) return "sunny";     // 晴れ
  if ([2, 3, 45, 48].includes(code)) return "cloudy"; // 曇り・霧
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain"; // 雨
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow"; // 雪
  if ([95, 96, 99].includes(code)) return "thunder"; // 雷雨

  return "cloudy";
}
