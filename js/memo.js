// ======================================
// memo.js  ─  メモ機能
// ======================================

async function loadMemo() {
  const doc = await db.collection("memo").doc("shared").get();
  if (doc.exists) {
    document.getElementById("memoArea").value = doc.data().text;
    const msg = await getMessage("memo", "load");
    setCharacterSpeech(msg.text, msg.expression);
  } else {
    const msg = await getMessage("memo", "empty");
    setCharacterSpeech(msg.text, msg.expression);
  }
}

loadMemo();

document.getElementById("saveBtn").addEventListener("click", async () => {
  const text     = document.getElementById("memoArea").value;
  const password = "Pancake";
  await db.collection("memo").doc("shared").set({ text, password });
  const msg = await getMessage("memo", "save");
  setCharacterSpeech(msg.text, msg.expression);
});
