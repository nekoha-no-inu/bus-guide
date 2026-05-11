// ======================================
// Firebase 初期化
// ======================================
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


// ======================================
// ユーティリティ
// ======================================
const categoryOrder = { urgent: 1, find: 2, later: 3 };

const categoryLabel = (cat) =>
  ({ urgent: "すぐ必要", find: "見つけたら買う", later: "そのうち買う" }[cat]);

const categoryClass = (cat) =>
  ({ urgent: "cat-urgent", find: "cat-find", later: "cat-later" }[cat]);

const randomMessage = (list) =>
  list[Math.floor(Math.random() * list.length)];

function setCharacterExpression(type) {
  const img = document.getElementById("character");
  if (!img) return;

  const map = {
    hurry: "img/character_hurry.png",
    relax: "img/character_relax.png",
    normal: "img/character_normal.png"
  };

  img.src = map[type] || map.normal;
}


// ======================================
// Firestore → DOM 生成
// ======================================
async function loadShoppingList() {
  const listArea = document.getElementById("shoppingList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("shopping").get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // --- 並び替え（チェック状態 → カテゴリ → 名前） ---
  items.sort((a, b) => {
    // 1. 未チェックを先に、チェック済みを後ろに
    if (a.checked !== b.checked) {
      return a.checked - b.checked; // false(0) → true(1)
    }

    // 2. 同じチェック状態の中ではカテゴリ順
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }

    // 3. 最後に名前順
    return a.name.localeCompare(b.name);
  });


  // メッセージ
  const messages = [
    "買い物リストを読み込んだよ！",
    "今日も買い物リストを確認しておくね。",
    "保存してあったリストを表示したよ。",
    "買い物リスト、準備できたよ〜！"
  ];
  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("relax");

  // DOM 生成
  items.forEach(item => listArea.appendChild(createShoppingCard(item)));
}


// ======================================
// カード生成（1アイテム）
// ======================================
function createShoppingCard(item) {
  const card = document.createElement("div");
  card.className = `shopping-card ${categoryClass(item.category)}`;

  // 左端：チェックボックス
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;

  // 右側3段コンテナ
  const right = document.createElement("div");
  right.className = "shopping-right";

  // 1段目：分類プルダウン
  const categorySelect = document.createElement("select");
  categorySelect.className = "shopping-category";

  ["urgent", "find", "later"].forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.innerText = categoryLabel(cat);
    if (item.category === cat) opt.selected = true;
    categorySelect.appendChild(opt);
  });

  // 2段目：名称
  const nameSpan = document.createElement("span");
  nameSpan.className = "shopping-name";
  nameSpan.innerText = item.name;
  if (item.checked) nameSpan.classList.add("checked");

  // 3段目：編集＋削除
  const actions = document.createElement("div");
  actions.className = "shopping-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "shopping-edit";
  editBtn.innerText = "✏️";

  const delBtn = document.createElement("button");
  delBtn.className = "shopping-delete";
  delBtn.innerText = "削除";

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  right.appendChild(categorySelect);
  right.appendChild(nameSpan);
  right.appendChild(actions);

  card.appendChild(checkbox);
  card.appendChild(right);

  // ===== ここからイベント設定 =====

  // チェックボックス：チェック状態更新＋見た目
checkbox.addEventListener("change", () => {
  db.collection("shopping").doc(item.id).update({
    checked: checkbox.checked
  });

  // 見た目だけ更新
  nameSpan.classList.toggle("checked", checkbox.checked);
});


  // カテゴリ変更：Firestore更新＋色だけ即反映
  categorySelect.addEventListener("change", () => {
    const newCat = categorySelect.value;

    db.collection("shopping").doc(item.id).update({
      category: newCat
    });

    card.classList.remove("cat-urgent", "cat-find", "cat-later");
    card.classList.add(categoryClass(newCat));
  });

  // 編集ボタン：名前編集
  editBtn.addEventListener("click", () => {
    const newName = prompt("名前を編集", item.name);
    if (newName && newName.trim() !== "") {
      db.collection("shopping").doc(item.id).update({
        name: newName.trim()
      });
      loadShoppingList();
    }
  });

  // 削除ボタン：削除＋再読み込み
  delBtn.addEventListener("click", () => {
    db.collection("shopping").doc(item.id).delete();
    loadShoppingList();
  });

  return card;
}




// ======================================
// アイテム追加
// ======================================
document.getElementById("addItemBtn").addEventListener("click", async () => {
  const input = document.getElementById("itemInput");
  const categorySelect = document.getElementById("categorySelect");

  const name = input.value.trim();
  const category = categorySelect.value;

  if (!name) {
    document.getElementById("bubble").innerText = "買うものを入力してね。";
    setCharacterExpression("hurry");
    return;
  }

  await db.collection("shopping").add({
    name,
    checked: false,
    category
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


// ======================================
// 並べ替え（＝再読み込み）
// ======================================
document.getElementById("sortBtn").addEventListener("click", loadShoppingList);


// 初回ロード
loadShoppingList();
