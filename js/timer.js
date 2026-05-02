// ===============================
// タイマー機能（conversation.json 対応版）
// ===============================

let timerInterval = null;

document.getElementById("startTimerBtn").addEventListener("click", () => {
    console.log("ボタン押された！");
    setCharacterSpeech("ボタン押されたよ！");
});

function setCharacterSpeech(text, expression = "normal") {
  const bubble = document.getElementById("bubble");
  const character = document.getElementById("character");

  if (bubble) bubble.textContent = text;
  if (character) character.src = `img/character_${expression}.png`;
}

// タイマー開始ボタン
document.getElementById("startTimerBtn").addEventListener("click", async () => {
    const minutes = parseInt(document.getElementById("timerMinutes").value);

    if (isNaN(minutes) || minutes <= 0) {
        const msg = await getMessage("timer", "error");
        setCharacterSpeech(msg.text, msg.expression);
        return;
    }

    // 既存タイマー停止
    clearInterval(timerInterval);

    let remaining = minutes * 60;

    // 開始メッセージ
    const startMsg = await getMessage("timer", "start", null, { minutes });
    setCharacterSpeech(startMsg.text, startMsg.expression);

    timerInterval = setInterval(async () => {
        remaining--;

        const m = Math.floor(remaining / 60);
        const s = remaining % 60;

        // カウント中メッセージ
        const countMsg = await getMessage("timer", "count", null, { m, s });
        setCharacterSpeech(countMsg.text, countMsg.expression);

        if (remaining <= 0) {
            clearInterval(timerInterval);

            // 終了メッセージ
            const finishMsg = await getMessage("timer", "finish");
            setCharacterSpeech(finishMsg.text, finishMsg.expression);

            playAlarmSound();
        }
    }, 1000);
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
