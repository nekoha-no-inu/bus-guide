
let conversation = {};
let tapCount = 0;
let homeTalkIndex = 0;

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


// 初期化時に一度だけ設定する
function initCharacterImage() {
  const img = document.getElementById("character");

  img.onerror = () => {
    console.warn("画像が見つからないため normal に戻します:", img.src);
    img.onerror = null; // 無限ループ防止
    img.src = "img/character_normal.png";

    // onerror を復活させる（次の表情変更のため）
    setTimeout(() => {
      initCharacterImage();
    }, 0);
  };
}

// 表情変更は src を変えるだけ
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  img.src = `img/character_${type}.png`;
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

async function loadConversation() {
  const res = await fetch("data/conversation.json");
  conversation = await res.json();
}

async function initHome() {
  await loadConversation();
}

function nextHomeTalk() {
  tapCount++;

  // conversation がまだなら終了
  if (!conversation.home) return;

  // 反応カテゴリ
  const reactions = conversation.home.tapReactions;

  // しつこいタップの段階的反応
  if (tapCount > 40) {
    showReaction(reactions.rare);
    return;
  }
  if (tapCount > 30) {
    showReaction(reactions.angry);
    return;
  }
  if (tapCount > 20) {
    showReaction(reactions.blush);
    return;
  }
  if (tapCount > 10) {
    showReaction(reactions.tickle);
    return;
  }

  // 通常の homeTalk
  const talks = conversation.home.homeTalk;
  const msg = talks[homeTalkIndex];

  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);

  homeTalkIndex = (homeTalkIndex + 1) % talks.length;
}

function showReaction(list) {
  const msg = list[Math.floor(Math.random() * list.length)];

  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}
