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
// スケジュール読み込み
// ======================================
async function loadScheduleList() {
  const listArea = document.getElementById("scheduleList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("schedule").get();
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 並べ替え：未完了 → 日付 → 名前 → 完了
  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;

    if (a.date !== b.date) return a.date.localeCompare(b.date);

    return a.name.localeCompare(b.name);
  });

  const messages = [
    "予定を読み込んだよ！",
    "今日の予定を確認しておくね。",
    "保存してあった予定を表示したよ。",
    "スケジュール、準備できたよ〜！"
  ];
  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("relax");

  items.forEach(item => listArea.appendChild(createScheduleCard(item)));
}


// ======================================
// カード生成
// ======================================
function createScheduleCard(item) {
  const card = document.createElement("div");
  card.className = "shopping-card"; // 同じデザインを流用

  // 左端：チェックボックス
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;

  // 右側3段
  const right = document.createElement("div");
  right.className = "shopping-right";

  // 1段目：日付
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "shopping-category";
  dateInput.value = item.date;

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

  right.appendChild(dateInput);
  right.appendChild(nameSpan);
  right.appendChild(actions);

  card.appendChild(checkbox);
  card.appendChild(right);

  // ===== イベント =====

  // チェック
  checkbox.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({
      checked: checkbox.checked
    });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });

  // 日付変更
  dateInput.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({
      date: dateInput.value
    });
  });

  // 編集
  editBtn.addEventListener("click", () => {
    const newName = prompt("予定名を編集", item.name);
    if (newName && newName.trim() !== "") {
      db.collection("schedule").doc(item.id).update({
        name: newName.trim()
      });
      loadScheduleList();
    }
  });

  // 削除
  delBtn.addEventListener("click", () => {
    db.collection("schedule").doc(item.id).delete();
    loadScheduleList();
  });

  return card;
}


// ======================================
// 追加
// ======================================
document.getElementById("addScheduleBtn").addEventListener("click", async () => {
  const input = document.getElementById("scheduleInput");
  const dateInput = document.getElementById("scheduleDate");

  const name = input.value.trim();
  const date = dateInput.value;

  if (!name || !date) {
    document.getElementById("bubble").innerText = "予定名と日付を入力してね。";
    setCharacterExpression("hurry");
    return;
  }

  await db.collection("schedule").add({
    name,
    date,
    checked: false
  });

  input.value = "";
  dateInput.value = "";

  const messages = [
    "予定を追加したよ！",
    "新しい予定を入れておいたよ！",
    "スケジュールを更新したよ〜！"
  ];
  document.getElementById("bubble").innerText = randomMessage(messages);
  setCharacterExpression("normal");

  loadScheduleList();
});


// ======================================
// 並べ替え（再読み込み）
// ======================================
document.getElementById("sortScheduleBtn").addEventListener("click", loadScheduleList);


// 初回ロード
loadScheduleList();
