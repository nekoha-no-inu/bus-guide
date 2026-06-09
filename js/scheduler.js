// ======================================
// scheduler.js  ─  スケジュール管理
// ======================================

async function loadScheduleList() {
  const listArea = document.getElementById("scheduleList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("schedule").get();
  const items    = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.name.localeCompare(b.name);
  });

  const msg = await getMessage("scheduler", "load");
  setCharacterSpeech(msg.text, msg.expression);
  items.forEach(item => listArea.appendChild(createScheduleCard(item)));
}

function createScheduleCard(item) {
  const card = document.createElement("div");
  card.className = "shopping-card";

  const checkbox    = document.createElement("input");
  checkbox.type    = "checkbox";
  checkbox.checked = item.checked;

  const right = document.createElement("div");
  right.className = "shopping-right";

  const nameSpan     = document.createElement("span");
  nameSpan.className = "shopping-name";
  nameSpan.innerText = item.name;
  if (item.checked) nameSpan.classList.add("checked");

  const meta = document.createElement("div");
  meta.className = "shopping-meta";

  const dateInput     = document.createElement("input");
  dateInput.type      = "date";
  dateInput.className = "shopping-category";
  dateInput.value     = item.date;

  const actions = document.createElement("div");
  actions.className = "shopping-actions";
  const editBtn = document.createElement("button"); editBtn.className = "shopping-edit"; editBtn.innerText = "✏️";
  const delBtn  = document.createElement("button"); delBtn.className  = "shopping-delete"; delBtn.innerText  = "削除";
  actions.append(editBtn, delBtn);

  meta.append(dateInput, actions);
  right.append(nameSpan, meta);
  card.append(checkbox, right);

  checkbox.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({ checked: checkbox.checked });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });
  dateInput.addEventListener("change", () => {
    db.collection("schedule").doc(item.id).update({ date: dateInput.value });
  });
  editBtn.addEventListener("click", () => {
    const newName = prompt("予定名を編集", item.name);
    if (newName?.trim()) { db.collection("schedule").doc(item.id).update({ name: newName.trim() }); loadScheduleList(); }
  });
  delBtn.addEventListener("click", () => { db.collection("schedule").doc(item.id).delete(); loadScheduleList(); });

  return card;
}

document.getElementById("addScheduleBtn").addEventListener("click", async () => {
  const input     = document.getElementById("scheduleInput");
  const dateInput = document.getElementById("scheduleDate");
  const name      = input.value.trim();
  const date      = dateInput.value;

  if (!name || !date) {
    const msg = await getMessage("scheduler", "empty_input");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  await db.collection("schedule").add({ name, date, checked: false });
  input.value     = "";
  dateInput.value = "";
  const msg = await getMessage("scheduler", "add");
  setCharacterSpeech(msg.text, msg.expression);
  loadScheduleList();
});

document.getElementById("sortScheduleBtn").addEventListener("click", loadScheduleList);

loadScheduleList();
