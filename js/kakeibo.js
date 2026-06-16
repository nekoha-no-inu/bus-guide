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
