// ======================================
// scheduler.js  ─  スケジュール管理
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

const SCHED_LOAD_MESSAGES = [
  "予定を読み込んだよ！",
  "今日の予定を確認しておくね。",
  "保存してあった予定を表示したよ。",
  "スケジュール、準備できたよ〜！"
];

const SCHED_ADD_MESSAGES = [
  "予定を追加したよ！",
  "新しい予定を入れておいたよ！",
  "スケジュールを更新したよ〜！"
];

// ---- スケジュール読み込み ----

async function loadScheduleList() {
  const listArea = document.getElementById("scheduleList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("schedule").get();
  const items    = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 未完了 → 日付 → 名前 → 完了
  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.name.localeCompare(b.name);
  });

  setCharacterSpeech(randomMessage(SCHED_LOAD_MESSAGES), "relax");
  items.forEach(item => listArea.appendChild(createScheduleCard(item)));
}

// ---- カード生成 ----

function createScheduleCard(item) {
  const card = document.createElement("div");
  card.className = "shopping-card";

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

  // 2段目：日付＋操作ボタン
  const meta = document.createElement("div");
  meta.className = "shopping-meta";

  const dateInput     = document.createElement("input");
  dateInput.type      = "date";
  dateInput.className = "shopping-category";
  dateInput.value     = item.date;

  const actions = document.createElement("div");
  actions.className = "shopping-actions";
  const editBtn     = document.createElement("button");
  editBtn.className = "shopping-edit";
  editBtn.innerText = "✏️";
  const delBtn     = document.createElement("button");
  delBtn.className = "shopping-delete";
  delBtn.innerText = "削除";
  actions.append(editBtn, delBtn);

  meta.append(dateInput, actions);
  right.append(nameSpan, meta);
  card.append(checkbox, right);

  // ---- イベント ----

  checkbox.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({ checked: checkbox.checked });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });

  dateInput.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({ date: dateInput.value });
  });

  editBtn.addEventListener("click", () => {
    const newName = prompt("予定名を編集", item.name);
    if (newName?.trim()) {
      db.collection("schedule").doc(item.id).update({ name: newName.trim() });
      loadScheduleList();
    }
  });

  delBtn.addEventListener("click", () => {
    db.collection("schedule").doc(item.id).delete();
    loadScheduleList();
  });

  return card;
}

// ---- 予定追加 ----

document.getElementById("addScheduleBtn").addEventListener("click", async () => {
  const input     = document.getElementById("scheduleInput");
  const dateInput = document.getElementById("scheduleDate");
  const name      = input.value.trim();
  const date      = dateInput.value;

  if (!name || !date) {
    setCharacterSpeech("予定名と日付を入力してね。", "hurry");
    return;
  }

  await db.collection("schedule").add({ name, date, checked: false });
  input.value     = "";
  dateInput.value = "";
  setCharacterSpeech(randomMessage(SCHED_ADD_MESSAGES), "normal");
  loadScheduleList();
});

// ---- 並べ替え ----

document.getElementById("sortScheduleBtn").addEventListener("click", loadScheduleList);

// 初回ロード
loadScheduleList();
