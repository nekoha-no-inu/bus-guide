// ======================================
// 共通ユーティリティ
// ======================================

// ---- Firebase 設定（1箇所に集約）----
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBmeWvWTcre86zaZPUtS1kEAjpmzUNQ9mw",
  authDomain: "bus-guide-memo.firebaseapp.com",
  projectId: "bus-guide-memo",
  storageBucket: "bus-guide-memo.firebasestorage.app",
  messagingSenderId: "397468094339",
  appId: "1:397468094339:web:c756f470c304135316b0b6",
  measurementId: "G-D2NGR8TPSZ"
};

// ---- キャラクター表情 ----

/** キャラクター画像のフォールバックを初期化する（onload時に1度だけ呼ぶ） */
function initCharacterImage() {
  const img = document.getElementById("character");
  if (!img) return;

  img.onerror = () => {
    console.warn("画像が見つからないため normal に戻します:", img.src);
    img.onerror = null;
    img.src = "img/character_normal.png";
    setTimeout(initCharacterImage, 0);
  };
}

/** キャラクターの表情を変更する */
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  if (!img) return;
  const VALID = ["normal", "hurry", "relax"];
  img.src = `img/character_${VALID.includes(type) ? type : "normal"}.png`;
}

/** キャラクターのセリフと表情を同時に更新する */
function setCharacterSpeech(text, expression = "normal") {
  const bubble = document.getElementById("bubble");
  if (bubble) bubble.textContent = text;
  setCharacterExpression(expression);
}

// ---- メッセージ取得 ----

// conversation.json のキャッシュ（同一ページ内では再 fetch しない）
let _conversationCache = null;

async function _loadConversation() {
  if (!_conversationCache) {
    const res = await fetch("data/conversation.json");
    _conversationCache = await res.json();
  }
  return _conversationCache;
}

/**
 * conversation.json からランダムなメッセージを取得する。
 * @param {string}  page  - ページキー（"home", "weather", "garbage" など）
 * @param {string}  key1  - 第1キー
 * @param {string}  [key2] - 第2キー（3階層の場合）
 * @param {Object}  [vars] - テンプレート変数 {{ key }} を置換するマップ
 * @returns {{ text: string, expression: string }}
 */
async function getMessage(page, key1, key2 = null, vars = {}) {
  const data = await _loadConversation();
  let list;

  if (key2 && data[page]?.[key1]?.[key2]) {
    list = data[page][key1][key2];
  } else if (data[page]?.[key1]) {
    list = data[page][key1];
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.warn("Message list empty:", page, key1, key2);
    return { text: "", expression: "normal" };
  }

  const item = list[Math.floor(Math.random() * list.length)];
  let text = item.text ?? item;
  const expression = item.expression ?? "normal";

  for (const [key, val] of Object.entries(vars)) {
    text = text.replaceAll(`{{${key}}}`, val);
  }

  return { text, expression };
}

/** リストからランダムな要素を返す */
function randomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// ---- 天気コード変換 ----

/**
 * Open-Meteo の weathercode を内部キーに変換する。
 * @param {number} code
 * @returns {"sunny"|"cloudy"|"rain"|"snow"|"thunder"}
 */
function convertWeather(code) {
  if ([0, 1].includes(code))                              return "sunny";
  if ([2, 3, 45, 48].includes(code))                      return "cloudy";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code))            return "snow";
  if ([95, 96, 99].includes(code))                        return "thunder";
  return "cloudy";
}

// ---- ホーム画面：タップ反応 ----

let _tapCount = 0;
let _homeTalkIndex = 0;

/** キャラクターをタップしたときの反応 */
async function nextHomeTalk() {
  _tapCount++;
  const data = await _loadConversation();
  if (!data.home) return;

  const reactions = data.home.tapReactions;

  if      (_tapCount > 40) return _showReaction(reactions.rare);
  else if (_tapCount > 30) return _showReaction(reactions.angry);
  else if (_tapCount > 20) return _showReaction(reactions.blush);
  else if (_tapCount > 10) return _showReaction(reactions.tickle);

  const talks = data.home.homeTalk;
  const msg   = talks[_homeTalkIndex];
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
  _homeTalkIndex = (_homeTalkIndex + 1) % talks.length;
}

function _showReaction(list) {
  const msg = list[Math.floor(Math.random() * list.length)];
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}
