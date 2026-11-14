// ======================================
// timer.js  ─  タイマー機能
// ======================================
// setCharacterSpeech は common.js、playAlarmSound は alarm.js で定義済み

let _timerInterval = null;
let _timerEnd = 0;
let _timerStarted = 0;
let _timerLastSpokenMinute = 0;
let _timerSpeechVersion = 0;

const timerMinutes = document.getElementById("timerMinutes");
const timerDisplay = document.getElementById("timerDisplay");

async function speakTimerMessage(key, vars, fallback) {
  const version = ++_timerSpeechVersion;
  try {
    const message = await getMessage("timer", key, null, vars);
    if (version !== _timerSpeechVersion) return;
    setCharacterSpeech(message.text || fallback, message.expression || "normal");
  } catch (error) {
    console.error("タイマーのメッセージを取得できませんでした。", error);
    if (version === _timerSpeechVersion) setCharacterSpeech(fallback, "normal");
  }
}

function updateTimer() {
  if (_timerInterval === null) return;

  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((_timerEnd - now) / 1000));
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerDisplay.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  if (remaining === 0) {
    clearInterval(_timerInterval);
    _timerInterval = null;
    playAlarmSound();
    speakTimerMessage("finish", {}, "時間になったよ。");
    return;
  }

  const elapsedMinutes = Math.floor((now - _timerStarted) / 60_000);
  if (elapsedMinutes > _timerLastSpokenMinute) {
    _timerLastSpokenMinute = elapsedMinutes;
    speakTimerMessage("count", { m, s }, `あと ${m} 分 ${s} 秒だよ。`);
  }
}

document.getElementById("startTimerBtn").addEventListener("click", () => {
  const minutes = Number(timerMinutes.value);
  const duration = minutes * 60_000;
  if (!Number.isSafeInteger(minutes) || minutes <= 0 ||
      !Number.isSafeInteger(duration) || !Number.isSafeInteger(Date.now() + duration)) {
    speakTimerMessage("error", {}, "時間を正しく入力してね。");
    return;
  }

  clearInterval(_timerInterval);
  _timerStarted = Date.now();
  _timerEnd = _timerStarted + duration;
  _timerLastSpokenMinute = 0;
  _timerInterval = setInterval(updateTimer, 1_000);
  updateTimer();
  speakTimerMessage("start", { minutes }, `タイマーを${minutes}分で始めるね。`);
});

document.querySelectorAll("[data-timer-minutes]").forEach(button => {
  button.addEventListener("click", () => {
    timerMinutes.value = button.dataset.timerMinutes;
  });
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateTimer();
});
