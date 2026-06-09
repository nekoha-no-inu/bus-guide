// ======================================
// todo.js  ─  ToDoリスト
// ======================================

const CATEGORY_ORDER = { urgent: 1, find: 2, later: 3 };
const CATEGORY_LABEL = { urgent: "優先度：高", find: "普通", later: "低め" };
const CATEGORY_CLASS = { urgent: "cat-urgent", find: "cat-find", later: "cat-later" };

async function loadTodoList() {
  const listArea = document.getElementById("todoList");
  listArea.innerHTML = "";

  const snapshot = await db.collection("todo").get();
  const items    = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  items.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (CATEGORY_ORDER[a.category] !== CATEGORY_ORDER[b.category])
      return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    return a.name.localeCompare(b.name);
  });

  const msg = await getMessage("todo", "load");
  setCharacterSpeech(msg.text, msg.expression);
  items.forEach(item => listArea.appendChild(createTodoCard(item)));
}

function createTodoCard(item) {
  const card = document.createElement("div");
  card.className = `shopping-card ${CATEGORY_CLASS[item.category]}`;

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

  const categorySelect    = document.createElement("select");
  categorySelect.className = "shopping-category";
  ["urgent", "find", "later"].forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat; opt.innerText = CATEGORY_LABEL[cat]; opt.selected = item.category === cat;
    categorySelect.appendChild(opt);
  });

  const actions = document.createElement("div");
  actions.className = "shopping-actions";
  const editBtn = document.createElement("button"); editBtn.className = "shopping-edit"; editBtn.innerText = "編集";
  const delBtn  = document.createElement("button"); delBtn.className  = "shopping-delete"; delBtn.innerText  = "削除";
  actions.append(editBtn, delBtn);

  meta.append(categorySelect, actions);
  right.append(nameSpan, meta);
  card.append(checkbox, right);

  checkbox.addEventListener("change", () => {
    db.collection("todo").doc(item.id).update({ checked: checkbox.checked });
    nameSpan.classList.toggle("checked", checkbox.checked);
  });
  categorySelect.addEventListener("change", () => {
    const newCat = categorySelect.value;
    db.collection("todo").doc(item.id).update({ category: newCat });
    card.classList.remove("cat-urgent","cat-find","cat-later");
    card.classList.add(CATEGORY_CLASS[newCat]);
  });
  editBtn.addEventListener("click", () => {
    const newName = prompt("タスク名を編集", item.name);
    if (newName?.trim()) { db.collection("todo").doc(item.id).update({ name: newName.trim() }); loadTodoList(); }
  });
  delBtn.addEventListener("click", () => { db.collection("todo").doc(item.id).delete(); loadTodoList(); });

  return card;
}

document.getElementById("addTodoBtn").addEventListener("click", async () => {
  const input          = document.getElementById("todoInput");
  const categorySelect = document.getElementById("todoCategory");
  const name           = input.value.trim();

  if (!name) {
    const msg = await getMessage("todo", "empty_input");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  await db.collection("todo").add({ name, checked: false, category: categorySelect.value });
  input.value = "";
  const msg = await getMessage("todo", "add");
  setCharacterSpeech(msg.text, msg.expression);
  loadTodoList();
});

document.getElementById("sortTodoBtn").addEventListener("click", loadTodoList);

loadTodoList();
