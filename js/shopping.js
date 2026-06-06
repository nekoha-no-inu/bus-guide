// ======================================
// shopping.js  ─  買い物リスト
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

// ---- カテゴリ定義 ----

const CATEGORY_ORDER = { urgent: 1, find: 2, later: 3 };

const CATEGORY_LABEL = {
  urgent: "すぐ必要",
  find:   "見つけたら買う",
  later:  "そのうち買う"
};

const CATEGORY_CLASS = {
  urgent: "cat-urgent",
  find:   "cat-find",
  later:  "cat-later"
};

const LOAD_MESSAGES = [
  "買い物リストを読み込んだよ！",
  "今日も買い物リストを確認しておくね。",
  "保存してあったリストを表示したよ。",
  "買い物リスト、準備できたよ〜！"
];

const ADD_MESSAGES = [
  "買い物リストに追加したよ！",
  "新しいアイテムを入れておいたよ！",
  "買い物リストを更新したよ〜！"
];

// ---- リスト読み込み ----

async function loadShoppingList() {
  const listArea = document.getElementById("shoppingList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("shopping").get();
  const items    = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (CATEGORY_ORDER[a.category] !== CATEGORY_ORDER[b.category])
      return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    return a.name.localeCompare(b.name);
  });

  setCharacterSpeech(randomMessage(LOAD_MESSAGES), "relax");
  items.forEach(item => listArea.appendChild(createShoppingCard(item)));
}

// ---- カード生成 ----

function createShoppingCard(item) {
  const card = document.createElement("div");
  card.className = `shopping-card ${CATEGORY_CLASS[item.category]}`;

  // チェックボックス（左端）
  const checkbox    = document.createElement("input");
  checkbox.type    = "checkbox";
  checkbox.checked = item.checked;

  // 右側コンテナ（縦2段）
  const right = document.createElement("div");
  right.className = "shopping-right";

  // 1段目：名称（折り返しあり・主役）
  const nameSpan     = document.createElement("span");
  nameSpan.className = "shopping-name";
  nameSpan.innerText = item.name;
  if (item.checked) nameSpan.classList.add("checked");

  // 2段目：分類＋操作ボタン
  const meta = document.createElement("div");
  meta.className = "shopping-meta";

  const categorySelect    = document.createElement("select");
  categorySelect.className = "shopping-category";
  ["urgent", "find", "later"].forEach(cat => {
    const opt     = document.createElement("option");
    opt.value     = cat;
    opt.innerText = CATEGORY_LABEL[cat];
    opt.selected  = item.category === cat;
    categorySelect.appendChild(opt);
  });

  const actions = document.createElement("div");
  actions.className = "shopping-actions";
  const editBtn     = document.createElement("button");
  editBtn.className = "shopping-edit";
  editBtn.innerText = "編集";
  const delBtn     = document.createElement("button");
  delBtn.className = "shopping-delete";
  delBtn.innerText = "削除";
  actions.append(editBtn, delBtn);

  meta.append(categorySelect, actions);
  right.append(nameSpan, meta);
  card.append(checkbox, right);

  // ---- イベント ----

  checkbox.addEventListener("change", () => {
    db.collection("shopping").doc(item.id).update({ checked: checkbox.checked });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });

  categorySelect.addEventListener("change", () => {
    const newCat = categorySelect.value;
    db.collection("shopping").doc(item.id).update({ category: newCat });
    card.classList.remove("cat-urgent", "cat-find", "cat-later");
    card.classList.add(CATEGORY_CLASS[newCat]);
  });

  editBtn.addEventListener("click", () => {
    const newName = prompt("名前を編集", item.name);
    if (newName?.trim()) {
      db.collection("shopping").doc(item.id).update({ name: newName.trim() });
      loadShoppingList();
    }
  });

  delBtn.addEventListener("click", () => {
    db.collection("shopping").doc(item.id).delete();
    loadShoppingList();
  });

  return card;
}

// ---- アイテム追加 ----

document.getElementById("addItemBtn").addEventListener("click", async () => {
  const input          = document.getElementById("itemInput");
  const categorySelect = document.getElementById("categorySelect");
  const name           = input.value.trim();

  if (!name) {
    setCharacterSpeech("買うものを入力してね。", "hurry");
    return;
  }

  await db.collection("shopping").add({ name, checked: false, category: categorySelect.value });
  input.value = "";
  setCharacterSpeech(randomMessage(ADD_MESSAGES), "normal");
  loadShoppingList();
});

// ---- 並べ替え ----

document.getElementById("sortBtn").addEventListener("click", loadShoppingList);

// 初回ロード
loadShoppingList();
