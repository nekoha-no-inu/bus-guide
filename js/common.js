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

// ---- 吹き出しタイプライター ----

const SPEECH_TYPING_MS = 35;
let _speechTypingTimer = null;
let _speechTypingToken = 0;
let _speechLastText = null;

function _speechHtmlToText(raw) {
  const withBreaks = String(raw ?? "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n");

  const withoutTags = withBreaks.replace(/<[^>]+>/g, "");
  const decoder = document.createElement("textarea");
  decoder.innerHTML = withoutTags;
  return decoder.value;
}

function _fixBubbleSizeForText(bubble, text) {
  if (!text || text.length === 0) {
    bubble.style.width = "";
    bubble.style.minHeight = "";
    return;
  }

  const probe = bubble.cloneNode(false);
  const computed = window.getComputedStyle(bubble);

  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.left = "-99999px";
  probe.style.top = "0";
  probe.style.width = "auto";
  probe.style.minHeight = "0";
  probe.style.height = "auto";
  probe.style.whiteSpace = computed.whiteSpace;
  probe.textContent = text;

  document.body.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  document.body.removeChild(probe);

  bubble.style.width = `${Math.ceil(rect.width)}px`;
  bubble.style.minHeight = `${Math.ceil(rect.height)}px`;
}

function _renderSpeechText(nextText, force = false, instant = false) {
  const bubble = document.getElementById("bubble");
  if (!bubble) return;

  if (!force && nextText === _speechLastText) return;
  _speechLastText = nextText;

  _speechTypingToken += 1;
  const token = _speechTypingToken;
  if (_speechTypingTimer) clearTimeout(_speechTypingTimer);

  const prefersReduce =
    !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  _fixBubbleSizeForText(bubble, nextText);

  if (instant || prefersReduce || nextText.length === 0) {
    bubble.textContent = nextText;
    return;
  }

  let i = 0;
  bubble.textContent = "";

  const step = () => {
    if (token !== _speechTypingToken) return;

    i += 1;
    bubble.textContent = nextText.slice(0, i);

    if (i < nextText.length) {
      _speechTypingTimer = setTimeout(step, SPEECH_TYPING_MS);
    } else {
      _speechTypingTimer = null;
    }
  };

  step();
}

function setBubbleSpeech(text, options = {}) {
  const nextText = _speechHtmlToText(text);
  _renderSpeechText(nextText, true, options.instant === true);
}

/** キャラクターのセリフと表情を同時に更新する */
function setCharacterSpeech(text, expression = "normal") {
  setBubbleSpeech(text);
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
  }

  if (!list && key2 && data[page]?.[key1]) {
    const fallback = data[page][key1];
    if (Array.isArray(fallback)) {
      list = fallback;
    } else if (fallback?.sunny) {
      list = fallback.sunny;
    } else {
      const values = Object.values(fallback).filter(Array.isArray);
      list = values.length > 0 ? values[0] : undefined;
    }
  }

  if (!list && data[page]?.[key1]) {
    const source = data[page][key1];
    if (Array.isArray(source)) {
      list = source;
    } else if (typeof source === "object" && source !== null) {
      const values = Object.values(source).filter(Array.isArray);
      list = values.length > 0 ? values[0] : undefined;
    }
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
  setBubbleSpeech(msg.text);
  setCharacterExpression(msg.expression);
  _homeTalkIndex = (_homeTalkIndex + 1) % talks.length;
}

function _showReaction(list) {
  const msg = list[Math.floor(Math.random() * list.length)];
  setBubbleSpeech(msg.text);
  setCharacterExpression(msg.expression);
}

// ---- Service Worker registration ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("SW registered"))
      .catch(err => console.error("SW registration failed:", err));
  });
}
