// ===============================
// アラーム機能（ブラウザ開いている間だけ）
// ===============================

let alarmInterval = null;

function setCharacterSpeech(text, expression = "normal") {
  const bubble = document.getElementById("bubble");
  const character = document.getElementById("character");

  if (bubble) bubble.textContent = text;
  if (character) character.src = `img/character_${expression}.png`;
}

document.getElementById("setAlarmBtn").addEventListener("click", async () => {

    const time = document.getElementById("alarmTime").value;
    if (!time) {
        const msg = await getMessage("alarm", "error");
        setCharacterSpeech(msg.text, msg.expression);
        return;
    }

    // 既存アラーム停止
    clearInterval(alarmInterval);

    // 現在時刻とアラーム時刻の差を計算
    const now = new Date();
    const [h, m] = time.split(":").map(Number);

    const alarmTime = new Date();
    alarmTime.setHours(h);
    alarmTime.setMinutes(m);
    alarmTime.setSeconds(0);

    // もし過ぎていたら翌日に設定
    if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const setMsg = await getMessage("alarm", "set", null, { time });
    setCharacterSpeech(setMsg.text, setMsg.expression);

    alarmInterval = setInterval(async () => {
        const now = new Date();
        const diff = alarmTime - now;

        if (diff <= 0) {
            clearInterval(alarmInterval);

            const ringMsg = await getMessage("alarm", "ring");
            setCharacterSpeech(ringMsg.text, ringMsg.expression);

            playAlarmSound();
            return;
        }

        const minutesLeft = Math.floor(diff / 1000 / 60);

        const countMsg = await getMessage("alarm", "count", null, {
            m: minutesLeft
        });
        setCharacterSpeech(countMsg.text, countMsg.expression);

    }, 60000); // 1分ごとに更新
});

// ===============================
// アラーム音
// ===============================
function playAlarmSound() {
    const audio = new Audio("alarm.mp3");
    audio.play().catch(() => {
        console.log("音声の自動再生がブロックされました");
    });
}
