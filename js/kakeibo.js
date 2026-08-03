// ======================================
// kakeibo.js  ─  家計簿 共通ロジック
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

// ---- レコード取得（月別） ----
async function fetchRecords(yearMonth) {
  const [y, m] = yearMonth.split("-");
  const from = `${y}-${m}-01`;
  const toY  = m === "12" ? String(Number(y)+1) : y;
  const toM  = m === "12" ? "01" : String(Number(m)+1).padStart(2,"0");
  const to   = `${toY}-${toM}-01`;

  const snap = await db.collection("kakeibo")
    .where("date", ">=", from)
    .where("date", "<",  to)
    .orderBy("date")
    .get();

  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
}

// ---- 全レコード取得（明細用） ----
async function fetchAllRecords(filters = {}) {
  let q = db.collection("kakeibo").orderBy("date", "desc");

  // 月だけ Firestore で絞る
  if (filters.yearMonth) {
    const [y, m] = filters.yearMonth.split("-");
    const from = `${y}-${m}-01`;
    const toY  = m === "12" ? String(Number(y)+1) : y;
    const toM  = m === "12" ? "01" : String(Number(m)+1).padStart(2,"0");
    q = q.where("date", ">=", from).where("date", "<", `${toY}-${toM}-01`);
  }

  const snap = await q.get();
  let records = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));

  // ここから下は JS 側で絞り込み
  if (filters.type)        records = records.filter(r => r.type === filters.type);
  if (filters.person)      records = records.filter(r => r.person === filters.person);
  if (filters.category)    records = records.filter(r => r.category === filters.category);
  if (filters.subcategory) records = records.filter(r => r.subcategory === filters.subcategory);

  return records;
}


// ---- レコード追加 ----
async function addRecord(record) {
  const ref = await db.collection("kakeibo").add(record);
  return ref.id;
}

// ---- レコード更新 ----
async function updateRecord(firestoreId, data) {
  await db.collection("kakeibo").doc(firestoreId).update(data);
}

// ---- レコード削除 ----
async function deleteRecordById(firestoreId) {
  await db.collection("kakeibo").doc(firestoreId).delete();
}

// ---- 数値フォーマット ----
function fmt(n) { return Number(n).toLocaleString() + "円"; }

// ---- 今日の日付（yyyy-mm-dd） ----
function todayStr() {
  const now = new Date();
  const p   = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
}

// ---- 今月（yyyy-mm） ----
function thisMonth() {
  const now = new Date();
  const p   = n => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth()+1)}`;
}

// ---- 大項目 → 小項目マップ ----
const SUBCATEGORY_MAP = {
  "固定費": ["住居費","水道光熱費","通信費","保険料"],
  "変動費": ["食費","日用品費","被服費","美容費","交際費","趣味費","交通費","教育費","医療費","特別費","雑費"],
  "臨時出費": ["特別費","雑費"],
  "旅費": ["交通費","宿泊費","食費","雑費"],
  "給与": [],
  "臨時収入": []
};

// ---- 大項目変更時：小項目を切り替え ----
function onFilterCategoryChange() {
  const cat = document.getElementById("f-category").value;
  const subSel = document.getElementById("f-subcategory");

  subSel.innerHTML = `<option value="">全小項目</option>`;

  if (!cat || !SUBCATEGORY_MAP[cat]) return;

  SUBCATEGORY_MAP[cat].forEach(sc => {
    const op = document.createElement("option");
    op.value = sc;
    op.textContent = sc;
    subSel.appendChild(op);
  });
}

// ---- kakeibo input page ----

function setInputTypeState(type) {
  const catSel = document.getElementById("f-category");
  const subBlk = document.getElementById("subcategory-block");
  if (!catSel || !subBlk) return;

  if (type === "収入") {
    catSel.innerHTML = `<option value="給与">給与</option><option value="臨時収入">臨時収入</option>`;
    subBlk.style.display = "none";
    getMessage("kakeibo", "input_income").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
  } else {
    catSel.innerHTML = ["固定費", "変動費", "臨時出費", "旅費"]
      .map(v => `<option value="${v}">${v}</option>`).join("");
    subBlk.style.display = "block";
    getMessage("kakeibo", "input_expense").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
  }
}

function onKakeiboInputTypeChange() {
  const type = document.getElementById("f-type").value;
  setInputTypeState(type);
}

async function submitKakeiboForm() {
  const date   = document.getElementById("f-date").value;
  const type   = document.getElementById("f-type").value;
  const cat    = document.getElementById("f-category").value;
  const subcat = type === "支出" ? document.getElementById("f-subcategory").value : "";
  const desc   = document.getElementById("f-description").value.trim();
  const amount = parseInt(document.getElementById("f-amount").value, 10);
  const person = document.getElementById("f-person").value;

  if (!date || !desc || !amount || isNaN(amount)) {
    getMessage("kakeibo", "empty_input").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
    return;
  }

  try {
    await addRecord({ type, date, category: cat, subcategory: subcat, description: desc, amount, person });
    getMessage("kakeibo", "saved", null, {
      description: desc,
      amount: amount.toLocaleString()
    }).then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
    document.getElementById("f-description").value = "";
    document.getElementById("f-amount").value      = "";
    document.getElementById("f-date").value        = todayStr();
  } catch (e) {
    getMessage("kakeibo", "save_error").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
    console.error(e);
  }
}

function initKakeiboInputPage() {
  const typeEl    = document.getElementById("f-type");
  const submitBtn = document.getElementById("submitBtn");
  const backBtn   = document.getElementById("backBtn");

  if (!typeEl || !submitBtn) return;

  typeEl.addEventListener("change", onKakeiboInputTypeChange);
  submitBtn.addEventListener("click", submitKakeiboForm);
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "kakeibo.html";
    });
  }

  document.getElementById("f-date").value = todayStr();
  onKakeiboInputTypeChange();
}

// ---- kakeibo summary page ----

let currentYM = thisMonth();

function ymLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

function getChartColor(index) {
  const palette = [
    "#4a90e2", "#2a9d8f", "#f4a261", "#e76f51", "#6a4c93", "#3a86ff",
    "#43aa8b", "#f94144", "#f8961e", "#577590", "#8ac926", "#ff595e"
  ];
  return palette[index % palette.length];
}

function renderSubcategoryChart(bySubcat) {
  const chartRoot = document.getElementById("summaryChart");
  if (!chartRoot) return;

  const entries = Object.entries(bySubcat)
    .filter(([, amount]) => Number(amount) > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    chartRoot.innerHTML = '<div class="summary-chart-placeholder">支出データがありません</div>';
    return;
  }

  const total = entries.reduce((sum, [, amount]) => sum + Number(amount), 0);
  let acc = 0;

  const radius = 62;
  const center = 80;

  const slices = entries.map(([label, amount], idx) => {
    const value = Number(amount);
    const ratio = value / total;
    const start = acc;
    const end = acc + ratio;
    acc = end;

    const startAngle = start * Math.PI * 2 - Math.PI / 2;
    const endAngle = end * Math.PI * 2 - Math.PI / 2;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;
    const color = getChartColor(idx);

    const path = ratio >= 0.9999
      ? `<circle cx="${center}" cy="${center}" r="${radius}" fill="${color}"></circle>`
      : `<path d="M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}"></path>`;

    return { label, value, ratio, color, path };
  });

  const svg = `
    <svg viewBox="0 0 160 160" width="160" height="160" aria-label="小項目別の支出円グラフ">
      ${slices.map(s => s.path).join("")}
      <circle cx="${center}" cy="${center}" r="34" fill="#fff"></circle>
      <text x="${center}" y="${center - 2}" text-anchor="middle" font-size="11" fill="#666">支出合計</text>
      <text x="${center}" y="${center + 14}" text-anchor="middle" font-size="12" fill="#333" font-weight="bold">${fmt(total)}</text>
    </svg>
  `;

  const legend = slices.map(s => `
    <div class="summary-chart-legend-item">
      <span class="summary-chart-color" style="background:${s.color}"></span>
      <span>${s.label}</span>
      <span class="summary-chart-percent">${Math.round(s.ratio * 100)}%</span>
    </div>
  `).join("");

  chartRoot.innerHTML = `${svg}<div class="summary-chart-legend">${legend}</div>`;
}

function changeMonth(delta) {
  let [y, m] = currentYM.split("-").map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1)  { m = 12; y--; }
  currentYM = `${y}-${String(m).padStart(2, "0")}`;
  renderKakeiboSummary();
}

async function renderKakeiboSummary() {
  const monthTitle = document.getElementById("monthTitle");
  const summary    = document.getElementById("summary");
  const breakdown  = document.getElementById("breakdown");

  if (!monthTitle || !summary || !breakdown) return;

  monthTitle.textContent = ymLabel(currentYM);
  summary.innerHTML = '<div id="loading">読み込み中…</div>';
  breakdown.innerHTML = "";

  const records = await fetchRecords(currentYM);
  const [, m]   = currentYM.split("-");
  const month   = parseInt(m, 10);

  const income  = records.filter(r => r.type === "収入").reduce((s, r) => s + Number(r.amount), 0);
  const expense = records.filter(r => r.type === "支出").reduce((s, r) => s + Number(r.amount), 0);
  const balance = income - expense;

  summary.innerHTML = `
    <div class="summary-row"><span>収入</span><span class="summary-income">${fmt(income)}</span></div>
    <div class="summary-row"><span>支出</span><span class="summary-expense">${fmt(expense)}</span></div>
    <div class="summary-row"><span>収支</span><span class="summary-balance ${balance >= 0 ? 'plus' : 'minus'}">${balance >= 0 ? '+' : ''}${fmt(balance)}</span></div>
  `;

  const bySubcat = {};
  records.filter(r => r.type === "支出").forEach(r => {
    const k = r.subcategory || r.category;
    bySubcat[k] = (bySubcat[k] || 0) + Number(r.amount);
  });

  renderSubcategoryChart(bySubcat);

  breakdown.innerHTML = `<h3 style="margin:12px 0 6px;font-size:15px;">小項目別の支出</h3>`;

  if (Object.keys(bySubcat).length === 0) {
    breakdown.innerHTML += `<p style="color:#999;font-size:14px;"></p>`;
  } else {
    const sec = document.createElement("div");
    sec.className = "sub-section";
    Object.entries(bySubcat)
      .sort((a, b) => b[1] - a[1])
      .forEach(([label, amount]) => {
        sec.innerHTML += `<div class="sub-item"><span>${label}</span><span class="sub-amount">${fmt(amount)}</span></div>`;
      });
    breakdown.appendChild(sec);
  }

  let msg;
  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (income === 0 && expense === 0) {
    msg = await getMessage("kakeibo", "no_data", null, { month });
  } else if (currentYM === thisYM) {
    msg = await getMessage("kakeibo", "balance_neutral", null, { month });
  } else {
    if (balance >= 0) {
      msg = await getMessage("kakeibo", "balance_plus", null, { month, balance: fmt(balance) });
    } else {
      msg = await getMessage("kakeibo", "balance_minus", null, { month, balance: fmt(Math.abs(balance)) });
    }
  }

  setBubbleSpeech(msg.text);
  setCharacterExpression(msg.expression);
}

function initKakeiboSummaryPage() {
  const prevBtn = document.getElementById("prevMonthBtn");
  const nextBtn = document.getElementById("nextMonthBtn");

  if (!prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", () => changeMonth(-1));
  nextBtn.addEventListener("click", () => changeMonth(1));
  renderKakeiboSummary();
}

// ---- kakeibo detail page ----

let editingFirestoreId = null;

function setDefaultMonth() {
  const now = new Date();
  const p   = n => String(n).padStart(2, "0");
  const monthInput = document.getElementById("f-month");
  if (monthInput) {
    monthInput.value = `${now.getFullYear()}-${p(now.getMonth() + 1)}`;
  }
}

async function loadKakeiboDetailList() {
  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = '<div id="loading">読み込み中…</div>';

  const filters = {
    yearMonth:  document.getElementById("f-month").value || null,
    type:       document.getElementById("f-type").value || null,
    person:     document.getElementById("f-person").value || null,
    category:   document.getElementById("f-category").value || null,
    subcategory:document.getElementById("f-subcategory").value || null,
  };

  try {
    const records = await fetchAllRecords(filters);
    list.innerHTML = "";

    if (records.length === 0) {
      list.innerHTML = "<p style='color:#999;font-size:14px;text-align:center;margin:20px 0;'>該当するデータはないよ。</p>";
      const msg = await getMessage("kakeibo", "detail_empty");
      setBubbleSpeech(msg.text);
      setCharacterExpression("relax");
      return;
    }

    const msg = await getMessage("kakeibo", "detail_show", null, { count: records.length });
    setBubbleSpeech(msg.text);
    setCharacterExpression("normal");

    records.forEach(r => {
      const isExp = r.type === "支出";
      const div = document.createElement("div");
      div.className = "detail-item";
      div.innerHTML = `
        <div class="detail-top">
          <div>
            <div class="detail-date">${r.date}　${r.person}</div>
            <div class="detail-desc">${r.description}</div>
            <div class="detail-meta">${r.category}${r.subcategory ? " › " + r.subcategory : ""}</div>
          </div>
          <div class="detail-right">
            <div class="detail-amount ${isExp ? 'expense' : 'income'}">${isExp ? '−' : '+'}${Number(r.amount).toLocaleString()}円</div>
            <button class="edit-btn" data-id="${r.firestoreId}">✏️ 編集</button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = "<p style='color:#e74c3c;'>読み込みに失敗したよ。</p>";
    console.error(e);
  }
}

function openEdit(firestoreId) {
  editingFirestoreId = firestoreId;
  db.collection("kakeibo").doc(firestoreId).get().then(doc => {
    if (!doc.exists) return;
    const r = doc.data();
    document.getElementById("m-date").value        = r.date;
    document.getElementById("m-type").value        = r.type;
    document.getElementById("m-category").value    = r.category;
    document.getElementById("m-subcategory").value = r.subcategory || "";
    document.getElementById("m-description").value = r.description;
    document.getElementById("m-amount").value      = r.amount;
    document.getElementById("m-person").value      = r.person;
    document.getElementById("modal-overlay").style.display = "block";
  });
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
  editingFirestoreId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById("modal-overlay")) closeModal();
}

async function saveEdit() {
  if (!editingFirestoreId) return;
  const data = {
    date:        document.getElementById("m-date").value,
    type:        document.getElementById("m-type").value,
    category:    document.getElementById("m-category").value,
    subcategory: document.getElementById("m-subcategory").value,
    description: document.getElementById("m-description").value,
    amount:      parseInt(document.getElementById("m-amount").value, 10),
    person:      document.getElementById("m-person").value,
  };
  try {
    await updateRecord(editingFirestoreId, data);
    closeModal();
    const msg = await getMessage("kakeibo", "edit_saved");
    setBubbleSpeech(msg.text);
    setCharacterExpression("relax");
    loadKakeiboDetailList();
  } catch (e) {
    const msg = await getMessage("kakeibo", "edit_error");
    setBubbleSpeech(msg.text);
    setCharacterExpression("hurry");
    console.error(e);
  }
}

async function confirmDelete() {
  if (!editingFirestoreId) return;
  if (!confirm("この項目を削除してもいい？")) return;
  try {
    await deleteRecordById(editingFirestoreId);
    closeModal();
    const msg = await getMessage("kakeibo", "edit_deleted");
    setBubbleSpeech(msg.text);
    setCharacterExpression("normal");
    loadKakeiboDetailList();
  } catch (e) {
    const msg = await getMessage("kakeibo", "edit_error");
    setBubbleSpeech(msg.text);
    setCharacterExpression("hurry");
    console.error(e);
  }
}

function initKakeiboDetailPage() {
  const filterBtn = document.getElementById("filterBtn");
  const fCategory = document.getElementById("f-category");
  const listEl = document.getElementById("list");
  const modalOverlay = document.getElementById("modal-overlay");
  const saveBtn = document.getElementById("saveEditBtn");
  const deleteBtn = document.getElementById("confirmDeleteBtn");
  const closeBtn = document.getElementById("closeModalBtn");

  if (!filterBtn || !listEl) return;

  filterBtn.addEventListener("click", loadKakeiboDetailList);
  if (fCategory) fCategory.addEventListener("change", onFilterCategoryChange);
  listEl.addEventListener("click", e => {
    const btn = e.target.closest(".edit-btn");
    if (btn) {
      openEdit(btn.dataset.id);
    }
  });
  if (modalOverlay) modalOverlay.addEventListener("click", handleOverlayClick);
  if (saveBtn) saveBtn.addEventListener("click", saveEdit);
  if (deleteBtn) deleteBtn.addEventListener("click", confirmDelete);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  setDefaultMonth();
  loadKakeiboDetailList();
}

window.addEventListener("load", () => {
  initKakeiboInputPage();
  initKakeiboSummaryPage();
  initKakeiboDetailPage();
});
