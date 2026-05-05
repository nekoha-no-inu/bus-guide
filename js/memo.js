// ★ Firebase 設定（あなたの値に置き換える）
const firebaseConfig = {
  apiKey: "AIzaSyBmeWvWTcre86zaZPUtS1kEAjpmzUNQ9mw",
  authDomain: "bus-guide-memo.firebaseapp.com",
  projectId: "bus-guide-memo",
  storageBucket: "bus-guide-memo.firebasestorage.app",
  messagingSenderId: "397468094339",
  appId: "1:397468094339:web:c756f470c304135316b0b6",
  measurementId: "G-D2NGR8TPSZ"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --------------------------------------
// キャラの表情変更
// --------------------------------------
function setCharacterExpression(type) {
  const img = document.getElementById("character");
  if (!img) return;

  if (type === "hurry") img.src = "img/character_hurry.png";
  else if (type === "relax") img.src = "img/character_relax.png";
  else img.src = "img/character_normal.png";
}

// --------------------------------------
// ランダムセリフ
// --------------------------------------
function randomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// --------------------------------------
// メモ読み込み
// --------------------------------------
async function loadMemo() {
  const doc = await db.collection("memo").doc("shared").get();

  const messages = [
    "前回のメモを読み込んだよ。",
    "メモ、ちゃんと残ってたよ。",
    "今日もメモを確認しておくね。",
    "保存してあったメモを表示したよ。"
  ];

  if (doc.exists) {
    document.getElementById("memoArea").value = doc.data().text;
    document.getElementById("bubble").innerText = randomMessage(messages);
    setCharacterExpression("relax");
  } else {
    document.getElementById("bubble").innerText = "まだメモは保存されていないみたい。";
  }
}

loadMemo();

// --------------------------------------
// メモ保存
// --------------------------------------
document.getElementById("saveBtn").addEventListener("click", async () => {
  const text = document.getElementById("memoArea").value;
  const password ="Pancake";

  if (!password) {
    document.getElementById("bubble").innerText = "パスワードを入力してね。";
    setCharacterExpression("hurry");
    return;
  }

  await db.collection("memo").doc("shared").set({
    text,
    password
  });

  const saveMessages = [
    "メモを保存したよ！",
    "ちゃんと保存できたよ！",
    "はい、保存完了〜！",
    "メモを更新しておいたよ。"
  ];

  document.getElementById("bubble").innerText = randomMessage(saveMessages);
  setCharacterExpression("relax");
});
