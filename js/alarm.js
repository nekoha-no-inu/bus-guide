// ======================================
// alarm.js  ─  アラーム機能
// ======================================
// setCharacterSpeech は common.js で定義済み

let _alarmInterval = null;

document.getElementById("setAlarmBtn").addEventListener("click", async () => {
  const time = document.getElementById("alarmTime").value;

  if (!time) {
    const msg = await getMessage("alarm", "error");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  clearInterval(_alarmInterval);

  const [h, m] = time.split(":").map(Number);
  const alarmTime = new Date();
  alarmTime.setHours(h, m, 0, 0);

  // 過ぎていたら翌日に設定
  if (alarmTime <= new Date()) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }

  const setMsg = await getMessage("alarm", "set", null, { time });
  setCharacterSpeech(setMsg.text, setMsg.expression);

  _alarmInterval = setInterval(async () => {
    const diff = alarmTime - new Date();

    if (diff <= 0) {
      clearInterval(_alarmInterval);
      const ringMsg = await getMessage("alarm", "ring");
      setCharacterSpeech(ringMsg.text, ringMsg.expression);
      playAlarmSound();
      return;
    }

    const minutesLeft = Math.floor(diff / 1000 / 60);
    const countMsg    = await getMessage("alarm", "count", null, { m: minutesLeft });
    setCharacterSpeech(countMsg.text, countMsg.expression);

  }, 60_000);
});

function playAlarmSound() {
  new Audio("alarm.mp3").play().catch(() => {
    console.log("音声の自動再生がブロックされました");
  });
}
