// ======================================
// timer.js  ─  タイマー機能
// ======================================
// setCharacterSpeech / playAlarmSound は common.js / alarm.js で定義済み
// ※ timer.html では alarm.js も読み込む（playAlarmSound を共用）

let _timerInterval = null;

document.getElementById("startTimerBtn").addEventListener("click", async () => {
  const minutes = parseInt(document.getElementById("timerMinutes").value, 10);

  if (!minutes || minutes <= 0) {
    const msg = await getMessage("timer", "error");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  clearInterval(_timerInterval);

  let remaining = minutes * 60;

  const startMsg = await getMessage("timer", "start", null, { minutes });
  setCharacterSpeech(startMsg.text, startMsg.expression);

  _timerInterval = setInterval(async () => {
    remaining--;

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    const countMsg = await getMessage("timer", "count", null, { m, s });
    setCharacterSpeech(countMsg.text, countMsg.expression);

    if (remaining <= 0) {
      clearInterval(_timerInterval);
      const finishMsg = await getMessage("timer", "finish");
      setCharacterSpeech(finishMsg.text, finishMsg.expression);
      playAlarmSound();
    }
  }, 1_000);
});
