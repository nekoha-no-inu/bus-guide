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
  ({ urgent: "優先度：高", find: "普通", later: "低め" }[cat]);

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
// ToDo 読み込み
// ======================================
async function loadTodoList() {
  const listArea = document.getElementById("todoList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("todo").get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 並び替え：未完了 → 完了 → カテゴリ → 名前
  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (categoryOrder[a.category] !== categoryOrder[b.category])
      return categoryOrder[a.category] - categoryOrder[b.category];
    return a.name.localeCompare(b.name);
  });

  const messages = [
    "ToDoリストを読み込んだよ！",
    "今日もタスクを確認しておくね。",
    "保存してあったToDoを表示したよ。",
    "準備できたよ〜！"
  ];
  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("relax");

  items.forEach(item => listArea.appendChild(createTodoCard(item)));
}


// ======================================
// カード生成
// ======================================
function createTodoCard(item) {
  const card = document.createElement("div");
  card.className = `shopping-card ${categoryClass(item.category)}`;

  // 左端：チェックボックス
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;

  // 右側3段
  const right = document.createElement("div");
  right.className = "shopping-right";

  // 1段目：分類
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
  editBtn.innerText = "編集";

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

  // ===== イベント =====

  checkbox.addEventListener("change", () => {
    db.collection("todo").doc(item.id).update({
      checked: checkbox.checked
    });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });

  categorySelect.addEventListener("change", () => {
    const newCat = categorySelect.value;
    db.collection("todo").doc(item.id).update({ category: newCat });

    card.classList.remove("cat-urgent", "cat-find", "cat-later");
    card.classList.add(categoryClass(newCat));
  });

  editBtn.addEventListener("click", () => {
    const newName = prompt("タスク名を編集", item.name);
    if (newName && newName.trim() !== "") {
      db.collection("todo").doc(item.id).update({ name: newName.trim() });
      loadTodoList();
    }
  });

  delBtn.addEventListener("click", () => {
    db.collection("todo").doc(item.id).delete();
    loadTodoList();
  });

  return card;
}


// ======================================
// 追加
// ======================================
document.getElementById("addTodoBtn").addEventListener("click", async () => {
  const input = document.getElementById("todoInput");
  const categorySelect = document.getElementById("todoCategory");

  const name = input.value.trim();
  const category = categorySelect.value;

  if (!name) {
    document.getElementById("bubble").innerText = "タスクを入力してね。";
    setCharacterExpression("hurry");
    return;
  }

  await db.collection("todo").add({
    name,
    checked: false,
    category
  });

  input.value = "";

  const messages = [
    "ToDoを追加したよ！",
    "新しいタスクを入れておいたよ！",
    "ToDoリストを更新したよ〜！"
  ];
  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("normal");

  loadTodoList();
});


// ======================================
// 並べ替え（再読み込み）
// ======================================
document.getElementById("sortTodoBtn").addEventListener("click", loadTodoList);


// 初回ロード
loadTodoList();
