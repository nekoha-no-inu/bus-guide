// ======================================
// memo.js  ─  メモ機能
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

const MEMO_LOAD_MESSAGES = [
  "前回のメモを読み込んだよ。",
  "メモ、ちゃんと残ってたよ。",
  "今日もメモを確認しておくね。",
  "保存してあったメモを表示したよ。"
];

const MEMO_SAVE_MESSAGES = [
  "メモを保存したよ！",
  "ちゃんと保存できたよ！",
  "はい、保存完了〜！",
  "メモを更新しておいたよ。"
];

// ---- メモ読み込み ----

async function loadMemo() {
  const doc = await db.collection("memo").doc("shared").get();

  if (doc.exists) {
    document.getElementById("memoArea").value = doc.data().text;
    setCharacterSpeech(randomMessage(MEMO_LOAD_MESSAGES), "relax");
  } else {
    document.getElementById("bubble").innerText = "まだメモは保存されていないみたい。";
  }
}

loadMemo();

// ---- メモ保存 ----

document.getElementById("saveBtn").addEventListener("click", async () => {
  const text     = document.getElementById("memoArea").value;
  const password = "Pancake";

  await db.collection("memo").doc("shared").set({ text, password });
  setCharacterSpeech(randomMessage(MEMO_SAVE_MESSAGES), "relax");
});
