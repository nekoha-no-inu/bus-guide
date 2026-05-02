// --------------------------------------
// Firebase 設定
// --------------------------------------
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
// ランダムメッセージ
// --------------------------------------
function randomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// --------------------------------------
// 買い物リスト読み込み
// --------------------------------------
async function loadShoppingList() {
  const listArea = document.getElementById("shoppingList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("shopping").orderBy("name").get();

  const messages = [
    "買い物リストを読み込んだよ！",
    "今日も買い物リストを確認しておくね。",
    "保存してあったリストを表示したよ。",
    "買い物リスト、準備できたよ〜！"
  ];

  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("relax");

  snapshot.forEach(doc => {
    const item = doc.data();

    const card = document.createElement("div");
    card.className = "item-card";

    const left = document.createElement("div");
    left.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked;

    checkbox.addEventListener("change", () => {
      db.collection("shopping").doc(doc.id).update({
        checked: checkbox.checked
      });
      nameSpan.classList.toggle("checked", checkbox.checked);
    });

    const nameSpan = document.createElement("span");
    nameSpan.className = "item-name";
    nameSpan.innerText = item.name;
    if (item.checked) nameSpan.classList.add("checked");

    left.appendChild(checkbox);
    left.appendChild(nameSpan);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.innerText = "削除";

    delBtn.addEventListener("click", () => {
      db.collection("shopping").doc(doc.id).delete();
      loadShoppingList();
    });

    card.appendChild(left);
    card.appendChild(delBtn);

    listArea.appendChild(card);
  });
}

loadShoppingList();

// --------------------------------------
// アイテム追加
// --------------------------------------
document.getElementById("addItemBtn").addEventListener("click", async () => {
  const input = document.getElementById("itemInput");
  const name = input.value.trim();

  if (!name) {
    document.getElementById("bubble").innerText = "買うものを入力してね。";
    setCharacterExpression("hurry");
    return;
  }

  await db.collection("shopping").add({
    name,
    checked: false
  });

  input.value = "";

  const messages = [
    "買い物リストに追加したよ！",
    "新しいアイテムを入れておいたよ！",
    "買い物リストを更新したよ〜！"
  ];

  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("normal");

  loadShoppingList();
});
