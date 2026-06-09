// ======================================
// kakeibo.js  ─  家計簿 共通ロジック
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

// ---- 初期データのインポート（初回のみ） ----

async function importInitialDataIfNeeded() {
  const flag = localStorage.getItem("kakeibo_imported");
  if (flag) return;

  const snap = await db.collection("kakeibo").limit(1).get();
  if (!snap.empty) {
    localStorage.setItem("kakeibo_imported", "1");
    return;
  }

  // バッチ書き込み（500件上限なので分割）
  const BATCH_SIZE = 400;
  for (let i = 0; i < INITIAL_KAKEIBO_DATA.length; i += BATCH_SIZE) {
    const batch = db.batch();
    INITIAL_KAKEIBO_DATA.slice(i, i + BATCH_SIZE).forEach(r => {
      const ref = db.collection("kakeibo").doc(String(r.id));
      batch.set(ref, r);
    });
    await batch.commit();
  }
  localStorage.setItem("kakeibo_imported", "1");
  console.log("Initial kakeibo data imported.");
}

// ---- レコード取得 ----

async function fetchRecords(yearMonth) {
  // yearMonth: "2026-05" 形式
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
  if (filters.yearMonth) {
    const [y, m] = filters.yearMonth.split("-");
    const from = `${y}-${m}-01`;
    const toY  = m === "12" ? String(Number(y)+1) : y;
    const toM  = m === "12" ? "01" : String(Number(m)+1).padStart(2,"0");
    q = q.where("date", ">=", from).where("date", "<", `${toY}-${toM}-01`);
  }
  const snap = await q.get();
  let records = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));

  if (filters.type)   records = records.filter(r => r.type   === filters.type);
  if (filters.person) records = records.filter(r => r.person === filters.person);
  return records;
}

// ---- レコード追加 ----

async function addRecord(record) {
  // id は Firestore の自動IDを使う
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

