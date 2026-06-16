// ======================================
// places.js  ─  行きたいところリスト
// ======================================

// カテゴリの並び順
const CATEGORY_ORDER = { near: 1, trip: 2, someday: 3 };

// 表示ラベル
const CATEGORY_LABEL = {
  near: "近場",
  trip: "旅行で行きたい",
  someday: "いつか行きたい"
};

// カード色分けクラス
const CATEGORY_CLASS = {
  near: "cat-urgent",
  trip: "cat-find",
  someday: "cat-later"
};

// --------------------------------------
// リスト読み込み
// --------------------------------------
async function loadPlacesList() {
  const listArea = document.getElementById("placesList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("places").get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 並び順：未チェック → カテゴリ順 → 名前順
  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (CATEGORY_ORDER[a.category] !== CATEGORY_ORDER[b.category])
      return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    return a.name.localeCompare(b.name);
  });

  // キャラの吹き出し
  const msg = await getMessage("places", "load");
  setCharacterSpeech(msg.text, msg.expression);

  items.forEach(item => listArea.appendChild(createPlaceCard(item)));
}

// --------------------------------------
// カード生成
// --------------------------------------
function createPlaceCard(item) {
  const card = document.createElement("div");
  card.className = `shopping-card ${CATEGORY_CLASS[item.category]}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;

  const right = document.createElement("div");
  right.className = "shopping-right";

  const nameSpan = document.createElement("span");
  nameSpan.className = "shopping-name";
  nameSpan.innerText = item.name;
  if (item.checked) nameSpan.classList.add("checked");

  const meta = document.createElement("div");
  meta.className = "shopping-meta";

  // カテゴリ選択
  const categorySelect = document.createElement("select");
  categorySelect.className = "shopping-category";
  ["near", "trip", "someday"].forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.innerText = CATEGORY_LABEL[cat];
    opt.selected = item.category === cat;
    categorySelect.appendChild(opt);
  });

  // 編集・削除ボタン
  const actions = document.createElement("div");
  actions.className = "shopping-actions";
  const editBtn = document.createElement("button");
  editBtn.className = "shopping-edit";
  editBtn.innerText = "編集";
  const delBtn = document.createElement("button");
  delBtn.className = "shopping-delete";
  delBtn.innerText = "削除";
  actions.append(editBtn, delBtn);

  meta.append(categorySelect, actions);
  right.append(nameSpan, meta);
  card.append(checkbox, right);

  // --------------------------------------
  // イベント
  // --------------------------------------

  // チェック変更
  checkbox.addEventListener("change", () => {
    db.collection("places").doc(item.id).update({ checked: checkbox.checked });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });

  // カテゴリ変更
  categorySelect.addEventListener("change", () => {
    const newCat = categorySelect.value;
    db.collection("places").doc(item.id).update({ category: newCat });

    card.classList.remove("cat-urgent", "cat-find", "cat-later");
    card.classList.add(CATEGORY_CLASS[newCat]);
  });

  // 編集
  editBtn.addEventListener("click", () => {
    const newName = prompt("名前を編集", item.name);
    if (newName?.trim()) {
      db.collection("places").doc(item.id).update({ name: newName.trim() });
      loadPlacesList();
    }
  });

  // 削除
  delBtn.addEventListener("click", () => {
    db.collection("places").doc(item.id).delete();
    loadPlacesList();
  });

  return card;
}

// --------------------------------------
// 追加ボタン
// --------------------------------------
document.getElementById("addPlaceBtn").addEventListener("click", async () => {
  const input = document.getElementById("placeInput");
  const categorySelect = document.getElementById("categorySelect");
  const name = input.value.trim();

  if (!name) {
    const msg = await getMessage("places", "empty_input");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  await db.collection("places").add({
    name,
    checked: false,
    category: categorySelect.value
  });

  input.value = "";

  const msg = await getMessage("places", "add");
  setCharacterSpeech(msg.text, msg.expression);

  loadPlacesList();
});

// 並べ替えボタン
document.getElementById("sortBtn").addEventListener("click", loadPlacesList);

// 初回読み込み
loadPlacesList();
