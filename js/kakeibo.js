// ======================================
// kakeibo.js  ─  家計簿 共通ロジック
// ======================================
// Firebase は firebase.js で初期化済み（db を参照）

const KAKEIBO_STORAGE_KEYS = {
  LAST_INPUT_DATE: "kakeibo.lastInputDate",
  SELECTED_MONTH: "kakeibo.selectedMonth",
  DETAIL_INLINE_INPUT: "kakeibo.detailInlineInput",
  FIXED_COSTS: "kakeibo.fixedCosts",
};

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
  if (filters.series)      records = records.filter(r => getRecordSeries(r) === filters.series);

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
  "ボーナス": [],
  "臨時収入": []
};

const SPECIAL_EXPENSE_CATEGORIES = ["旅費", "臨時出費"];
const SPECIAL_INCOME_CATEGORIES = ["ボーナス"];
const EXPENSE_CATEGORIES = ["固定費", "変動費", "臨時出費", "旅費"];
const INCOME_CATEGORIES = ["給与", "ボーナス", "臨時収入"];

function getSeriesByCategory(type, category) {
  if (type === "支出" && SPECIAL_EXPENSE_CATEGORIES.includes(category)) return "特別費";
  if (type === "収入" && SPECIAL_INCOME_CATEGORIES.includes(category)) return "特別費";
  return "通常費";
}

function getRecordSeries(record) {
  if (!record) return "通常費";
  if (record.series) return record.series;
  return getSeriesByCategory(record.type, record.category);
}

function getAllSubcategories() {
  return [...new Set(Object.values(SUBCATEGORY_MAP).flat())];
}

function getStoredInputDate() {
  const v = localStorage.getItem(KAKEIBO_STORAGE_KEYS.LAST_INPUT_DATE);
  return v || null;
}

function saveInputDate(date) {
  if (!date) return;
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.LAST_INPUT_DATE, date);
}

function defaultInputDate() {
  return getStoredInputDate() || todayStr();
}

function populateSubcategorySelect(selectEl, values, withAllOption = false) {
  if (!selectEl) return;

  const selected = selectEl.value;
  const head = withAllOption ? ['<option value="">全小項目</option>'] : [];
  selectEl.innerHTML = head.concat(values.map(v => `<option value="${v}">${v}</option>`)).join("");
  if (selected && values.includes(selected)) {
    selectEl.value = selected;
  }
}

// ---- 大項目変更時：小項目を切り替え ----
function onFilterCategoryChange() {
  const subSel = document.getElementById("f-subcategory");
  if (!subSel) return;
  populateSubcategorySelect(subSel, getAllSubcategories(), true);
}

// ---- kakeibo input page ----

function setInputTypeState(type) {
  const catSel = document.getElementById("f-category");
  const subBlk = document.getElementById("subcategory-block");
  if (!catSel || !subBlk) return;

  if (type === "収入") {
    catSel.innerHTML = INCOME_CATEGORIES.map(v => `<option value="${v}">${v}</option>`).join("");
    subBlk.style.display = "none";
    getMessage("kakeibo", "input_income").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
  } else {
    catSel.innerHTML = EXPENSE_CATEGORIES
      .map(v => `<option value="${v}">${v}</option>`).join("");
    subBlk.style.display = "block";
    const subSel = document.getElementById("f-subcategory");
    populateSubcategorySelect(subSel, getAllSubcategories(), false);
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
  const series = getSeriesByCategory(type, cat);

  if (!date || !desc || !amount || isNaN(amount)) {
    getMessage("kakeibo", "empty_input").then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
    return;
  }

  try {
    await addRecord({ type, date, series, category: cat, subcategory: subcat, description: desc, amount, person });
    saveInputDate(date);
    getMessage("kakeibo", "saved", null, {
      description: desc,
      amount: amount.toLocaleString()
    }).then(m => {
      setBubbleSpeech(m.text);
      setCharacterExpression(m.expression);
    });
    document.getElementById("f-description").value = "";
    document.getElementById("f-amount").value      = "";
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

  const dateEl = document.getElementById("f-date");
  if (dateEl) {
    dateEl.value = defaultInputDate();
    dateEl.addEventListener("change", () => saveInputDate(dateEl.value));
  }
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

function formatAxisAmount(value) {
  return `${Math.round(value).toLocaleString()}円`;
}

function getSpecialBalanceThroughMonth(records, yearMonth) {
  return records.reduce((balance, record) => {
    if (getRecordSeries(record) !== "特別費" || typeof record.date !== "string" ||
        record.date.slice(0, 7) > yearMonth) return balance;
    const amount = Number(record.amount) || 0;
    if (record.type === "収入") return balance + amount;
    if (record.type === "支出") return balance - amount;
    return balance;
  }, 0);
}

function createNormalExpensePieChart(records, label) {
  const totals = {};
  records.filter(r => r.type === "支出").forEach(r => {
    const key = (r.subcategory && r.subcategory.trim()) || (r.category && r.category.trim()) || "未分類";
    totals[key] = (totals[key] || 0) + Number(r.amount || 0);
  });

  const entries = Object.entries(totals).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `<div class="summary-chart-section"><div class="summary-chart-caption">${label}</div><div class="summary-chart-placeholder">データなし</div></div>`;
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const cx = 120;
  const cy = 110;
  const radius = 78;
  const outerRadius = 104;
  let startAngle = -Math.PI / 2;

  const segments = entries.map(([category, value], index) => {
    const sliceAngle = (value / total) * (Math.PI * 2);
    const endAngle = startAngle + sliceAngle;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const color = getChartColor(index);
    const segment = `
      <path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="2"></path>
    `;
    startAngle = endAngle;
    return { category, value, color, segment };
  });

  const legend = entries.map(([category, value], index) => {
    const color = getChartColor(index);
    const ratio = (value / total * 100);
    return `
      <div class="summary-chart-legend-item">
        <span><span class="summary-chart-color" style="background:${color}"></span> ${category}</span>
        <span class="summary-chart-percent">${ratio.toFixed(1)}%</span>
      </div>
    `;
  }).join("");

  return `
    <div class="summary-chart-section">
      <div class="summary-chart-caption">${label}</div>
      <svg viewBox="0 0 260 220" width="100%" height="220" aria-label="${label}の円グラフ">
        ${segments.map(s => s.segment).join("")}
        <circle cx="${cx}" cy="${cy}" r="34" fill="#ffffff"></circle>
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="7" fill="#666">支出合計</text>
        <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10.5" fill="#333" font-weight="bold">${Math.round(total).toLocaleString()}円</text>
      </svg>
      <div class="summary-chart-legend">${legend}</div>
    </div>
  `;
}

function createSpecialMonthlyLineChart(records, yearMonth, label) {
  const [year, month] = yearMonth.split("-").map(Number);
  const monthList = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(year, month - 1 - i, 1);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthList.push({ ym, label: `${date.getMonth() + 1}月` });
  }

  const values = monthList.map(({ ym }) => {
    return { ym, label: ym.split("-")[1] + "月", value: getSpecialBalanceThroughMonth(records, ym) };
  });

  const allValues = values.map(v => v.value);
  const minValue = Math.min(0, ...allValues);
  const maxValue = Math.max(0, ...allValues);
  const rawRange = maxValue - minValue;
  const niceStep = rawRange <= 0 ? 10000 : [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000].find(v => rawRange / v <= 4) || 10000;
  const roundedMin = Math.floor(minValue / niceStep) * niceStep;
  const roundedMax = Math.ceil(maxValue / niceStep) * niceStep;
  const chartMin = roundedMin;
  const chartMax = roundedMax;
  const chartRange = Math.max(chartMax - chartMin, niceStep);

  const width = 420;
  const height = 260;
  const left = 68;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const yForValue = value => top + plotHeight - ((value - chartMin) / chartRange) * plotHeight;
  const xForIndex = index => left + (index * plotWidth) / Math.max(values.length - 1, 1);
  const points = values.map((item, index) => `${xForIndex(index)},${yForValue(item.value)}`).join(" ");

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = chartMin + (chartRange * i) / 4;
    const y = yForValue(value);
    return { value, y };
  });

  const xLabels = values.map((item, index) => `
    <text x="${xForIndex(index)}" y="${height - 12}" text-anchor="middle" font-size="10" fill="#666">${item.label}</text>
  `).join("");

  const yLabels = yTicks.map(t => `
    <text x="${left - 10}" y="${t.y + 4}" text-anchor="end" font-size="9" fill="#666">${Math.round(t.value).toLocaleString()}円</text>
  `).join("");

  const gridLines = yTicks.filter(t => t.value !== 0).map(t => `
    <line class="summary-chart-gridline" x1="${left}" x2="${width - right}" y1="${t.y}" y2="${t.y}" stroke="#e5e7eb" stroke-width="1" />
  `).join("");

  const zeroY = yForValue(0);
  const zeroLine = `<line x1="${left}" x2="${width - right}" y1="${zeroY}" y2="${zeroY}" stroke="#d0d5db" stroke-width="1" stroke-dasharray="4 4" />`;

  const line = `
    <polyline points="${points}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
    ${values.map((item, index) => `<circle cx="${xForIndex(index)}" cy="${yForValue(item.value)}" r="3.5" fill="#f59e0b"><title>${ymLabel(item.ym)}末の残高: ${fmt(item.value)}</title></circle>`).join("")}
  `;

  return `
    <div class="summary-chart-section">
      <div class="summary-chart-caption">${label}</div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="260" aria-label="${label}の月別折れ線グラフ">
        ${gridLines}
        ${yLabels}
        <line x1="${left}" x2="${left}" y1="${top}" y2="${top + plotHeight}" stroke="#dfe7ef" stroke-width="1" />
        ${zeroLine}
        ${line}
        ${xLabels}
      </svg>
    </div>
  `;
}

function renderSeriesChart(currentYM, monthRecords, allRecords) {
  const chartRoot = document.getElementById("summaryChart");
  if (!chartRoot) return;

  const normalRecords = monthRecords.filter(r => getRecordSeries(r) === "通常費");
  const specialRecords = allRecords.filter(r => getRecordSeries(r) === "特別費");

  const normalChart = createNormalExpensePieChart(normalRecords, "通常費");
  const specialChart = createSpecialMonthlyLineChart(specialRecords, currentYM, "特別費");

  chartRoot.innerHTML = `${normalChart}${specialChart}`;
}

function changeMonth(delta) {
  let [y, m] = currentYM.split("-").map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1)  { m = 12; y--; }
  currentYM = `${y}-${String(m).padStart(2, "0")}`;
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.SELECTED_MONTH, currentYM);
  renderKakeiboSummary();
}

function updateDetailLink() {
  const detailLink = document.querySelector('.page-links a[href="kakeibo-detail.html"]');
  if (!detailLink) return;
  detailLink.href = `kakeibo-detail.html?month=${encodeURIComponent(currentYM)}`;
}

let summaryRenderVersion = 0;

async function renderKakeiboSummary() {
  const monthTitle = document.getElementById("monthTitle");
  const summary    = document.getElementById("summary");
  const breakdown  = document.getElementById("breakdown");

  if (!monthTitle || !summary || !breakdown) return;

  const renderVersion = ++summaryRenderVersion;
  const selectedYM = currentYM;
  monthTitle.textContent = ymLabel(selectedYM);
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.SELECTED_MONTH, selectedYM);
  updateDetailLink();
  summary.innerHTML = '<div id="loading">読み込み中…</div>';
  breakdown.innerHTML = "";
  const chartRoot = document.getElementById("summaryChart");
  if (chartRoot) chartRoot.innerHTML = '<div class="summary-chart-placeholder">読み込み中…</div>';

  const records = await fetchRecords(selectedYM);
  const allRecords = await fetchAllRecords({});
  if (renderVersion !== summaryRenderVersion) return;
  const [, m]   = selectedYM.split("-");
  const month   = parseInt(m, 10);

  const seriesSummary = {
    "通常費": { income: 0, expense: 0 },
    "特別費": { income: 0, expense: 0 }
  };

  records.forEach(r => {
    const series = getRecordSeries(r);
    if (!seriesSummary[series]) return;
    if (r.type === "収入") {
      seriesSummary[series].income += Number(r.amount) || 0;
    }
    if (r.type === "支出") {
      seriesSummary[series].expense += Number(r.amount) || 0;
    }
  });

  const normal = seriesSummary["通常費"];
  const special = seriesSummary["特別費"];
  const normalBalance = normal.income - normal.expense;
  const specialBalance = getSpecialBalanceThroughMonth(allRecords, selectedYM);
  const monthNetBalance = normalBalance;

  summary.innerHTML = `
    <div class="summary-series-grid">
      <div class="summary-series-card">
        <div class="summary-series-title">通常費</div>
        <div class="summary-row"><span>収入</span><span class="summary-income">${fmt(normal.income)}</span></div>
        <div class="summary-row"><span>支出</span><span class="summary-expense">${fmt(normal.expense)}</span></div>
        <div class="summary-row summary-total-row"><span>合計収支</span><span class="summary-balance ${monthNetBalance >= 0 ? 'plus' : 'minus'}">${monthNetBalance >= 0 ? '+' : '-'}${fmt(Math.abs(monthNetBalance))}</span></div>
      </div>
      <div class="summary-series-card summary-series-card--special">
        <div class="summary-series-title">特別費</div>
        <div class="summary-row"><span>収入</span><span class="summary-income">${fmt(special.income)}</span></div>
        <div class="summary-row"><span>支出</span><span class="summary-expense">${fmt(special.expense)}</span></div>
        <div class="summary-row"><span>残高</span><span class="summary-balance ${specialBalance >= 0 ? 'plus' : 'minus'}">${specialBalance >= 0 ? '+' : '-'}${fmt(Math.abs(specialBalance))}</span></div>
      </div>
    </div>
  `;

  renderSeriesChart(selectedYM, records, allRecords);

  breakdown.innerHTML = `<h3 style="margin:12px 0 6px;font-size:15px;">系列別の内訳</h3>`;

  const sec = document.createElement("div");
  sec.className = "sub-section";
  [
    ["通常費 収入", normal.income],
    ["通常費 支出", normal.expense],
    ["特別費 収入", special.income],
    ["特別費 支出", special.expense],
    ["特別費 残高", specialBalance]
  ].forEach(([label, amount]) => {
    const sign = amount >= 0 ? "+" : "-";
    const amountClass = label.includes("支出") || (label.includes("残高") && amount < 0) ? "summary-expense" : "summary-income";
    const displayValue = label.includes("残高")
      ? `${sign}${fmt(Math.abs(amount))}`
      : `${label.includes("支出") ? '−' : '+'}${fmt(Math.abs(amount))}`;
    sec.innerHTML += `<div class="sub-item"><span>${label}</span><span class="sub-amount ${amountClass}">${displayValue}</span></div>`;
  });
  breakdown.appendChild(sec);

  let msg;
  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (records.length === 0) {
    msg = await getMessage("kakeibo", "no_data", null, { month });
  } else if (selectedYM === thisYM) {
    msg = await getMessage("kakeibo", "balance_neutral", null, { month });
  } else {
    if (monthNetBalance >= 0) {
      msg = await getMessage("kakeibo", "balance_plus", null, { month, balance: fmt(monthNetBalance) });
    } else {
      msg = await getMessage("kakeibo", "balance_minus", null, { month, balance: fmt(Math.abs(monthNetBalance)) });
    }
  }

  if (renderVersion !== summaryRenderVersion) return;
  if (!msg || !msg.text) {
    setBubbleSpeech("家計簿を確認しよう。");
    setCharacterExpression("normal");
    return;
  }

  setBubbleSpeech(msg.text);
  setCharacterExpression(msg.expression || "normal");
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
  const monthInput = document.getElementById("f-month");
  if (!monthInput) return;

  const qMonth = new URLSearchParams(window.location.search).get("month");
  const initial = qMonth || thisMonth();
  monthInput.value = initial;
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.SELECTED_MONTH, initial);
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
    renderMonthlyExpenseChart(records, filters.yearMonth);
    renderFixedCostTemplates();
    list.innerHTML = "";

    const expense = records.filter(r => r.type === "支出").reduce((s, r) => s + Number(r.amount), 0);
    const income = records.filter(r => r.type === "収入").reduce((s, r) => s + Number(r.amount), 0);
    const totalEl = document.getElementById("detailTotal");
    if (totalEl) {
      totalEl.innerHTML = `<span>収入 ${fmt(income)}</span><span>支出 ${fmt(expense)}</span><span>収支 ${fmt(income - expense)}</span>`;
    }

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
            <div class="detail-date">${formatDateJapanese(r.date)}　${r.person}</div>
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

function renderMonthlyExpenseChart(records, yearMonth) {
  const chart = document.getElementById("monthlyExpenseChart");
  const title = document.getElementById("monthlyExpenseTitle");
  if (!chart || !yearMonth) return;

  if (title) title.textContent = `${yearMonth.replace("-", "年")}月の日別支出`;
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyExpenses = Array(daysInMonth).fill(0);
  records.filter(record => record.type === "支出").forEach(record => {
    const day = Number(record.date.slice(-2));
    if (day >= 1 && day <= daysInMonth) dailyExpenses[day - 1] += Number(record.amount) || 0;
  });

  const maxExpense = Math.max(...dailyExpenses);
  if (maxExpense <= 0) {
    chart.innerHTML = '<div class="chart-empty">この月の支出データはありません。</div>';
    return;
  }

  const rawStep = maxExpense / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalizedStep = rawStep / magnitude;
  const stepFactor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  const tickStep = Math.max(1, stepFactor * magnitude);
  const axisMaximum = Math.ceil(maxExpense / tickStep) * tickStep;
  const tickCount = Math.round(axisMaximum / tickStep);

  const width = 720;
  const height = 220;
  const left = 62;
  const right = 12;
  const top = 12;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const pointX = day => left + ((day - 1) / Math.max(daysInMonth - 1, 1)) * plotWidth;
  const pointY = amount => top + plotHeight - (amount / axisMaximum) * plotHeight;
  const grid = Array.from({ length: tickCount + 1 }, (_, index) => {
    const amount = axisMaximum - tickStep * index;
    const y = top + plotHeight * index / tickCount;
    return `<line class="chart-grid" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"></line><text class="chart-axis-label" x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(amount).toLocaleString()}</text>`;
  }).join("");
  const points = dailyExpenses.map((amount, index) => `${pointX(index + 1)},${pointY(amount)}`).join(" ");
  const markers = dailyExpenses.map((amount, index) =>
    `<circle class="chart-point" cx="${pointX(index + 1)}" cy="${pointY(amount)}" r="3"><title>${index + 1}日: ${fmt(amount)}</title></circle>`
  ).join("");
  const dayLabels = Array.from({ length: daysInMonth }, (_, index) => index + 1)
    .filter(day => day === 1 || day % 5 === 0 || day === daysInMonth)
    .map(day => `<text class="chart-axis-label" x="${pointX(day)}" y="${height - 10}" text-anchor="middle">${day}日</text>`)
    .join("");

  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${yearMonth}の日別支出額の折れ線グラフ">${grid}<polyline class="chart-line" points="${points}"></polyline>${markers}${dayLabels}</svg>`;
}

function formatDateJapanese(date) {
  const match = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : String(date || "日付を選択");
}

function updateLocalizedDateDisplay(input) {
  const display = document.getElementById(`${input.id}-display`);
  if (!display) return;
  display.textContent = formatDateJapanese(input.value);
}

function initLocalizedDateDisplays() {
  ["d-date", "m-date"].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("input", () => updateLocalizedDateDisplay(input));
    input.addEventListener("change", () => updateLocalizedDateDisplay(input));
    updateLocalizedDateDisplay(input);
  });
}

function getFixedCostTemplates() {
  try {
    const templates = JSON.parse(localStorage.getItem(KAKEIBO_STORAGE_KEYS.FIXED_COSTS) || "[]");
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    return [];
  }
}

function saveFixedCostTemplates(templates) {
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.FIXED_COSTS, JSON.stringify(templates));
}

let fixedCostRenderSeq = 0;

async function getEnteredFixedCostDescriptions() {
  const yearMonth = (document.getElementById("f-month") || {}).value;
  if (!yearMonth) return new Set();
  try {
    const records = await fetchAllRecords({ yearMonth, type: null, person: null, category: "固定費", subcategory: null });
    return new Set(records.filter(r => r.type === "支出").map(r => String(r.description || "").trim()));
  } catch (error) {
    console.error(error);
    return new Set();
  }
}

async function renderFixedCostTemplates() {
  const list = document.getElementById("fixedCostList");
  if (!list) return;

  const seq = ++fixedCostRenderSeq;
  const templates = getFixedCostTemplates();
  const entered = await getEnteredFixedCostDescriptions();
  if (seq !== fixedCostRenderSeq) return;

  list.replaceChildren();

  if (templates.length === 0) {
    const empty = document.createElement("p");
    empty.className = "fixed-cost-empty";
    empty.textContent = "固定費を登録してください。";
    list.appendChild(empty);
  } else {
    const total = templates.reduce((s, t) => s + Number(t.amount || 0), 0);
    const remaining = templates
      .filter(t => !entered.has(String(t.description).trim()))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalEl = document.createElement("p");
    totalEl.className = "fixed-cost-total";
    totalEl.textContent = `固定費合計：${total.toLocaleString()}円（未入力：${remaining.toLocaleString()}円）`;
    list.appendChild(totalEl);
  }

  templates.forEach((template, index) => {
    const isEntered = entered.has(String(template.description).trim());
    const row = document.createElement("div");
    row.className = "fixed-cost-item";
    const label = document.createElement("span");
    label.textContent = `${template.description} / ${template.subcategory} / ${template.day || "?"}日 / ${Number(template.amount).toLocaleString()}円 / ${template.person}${isEntered ? " / 入力済" : ""}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "削除";
    remove.setAttribute("aria-label", `${template.description}を固定費リストから削除`);
    remove.addEventListener("click", () => {
      templates.splice(index, 1);
      saveFixedCostTemplates(templates);
      renderFixedCostTemplates();
    });
    row.append(label, remove);
    list.appendChild(row);
  });
}

function saveFixedCostTemplate() {
  const description = document.getElementById("fixedCostDescription").value.trim();
  const subcategory = document.getElementById("fixedCostSubcategory").value;
  const day = parseInt(document.getElementById("fixedCostDay").value, 10);
  const amount = parseInt(document.getElementById("fixedCostAmount").value, 10);
  const person = document.getElementById("fixedCostPerson").value;
  if (!description || !Number.isInteger(day) || day < 1 || day > 31 || !Number.isFinite(amount) || amount <= 0) {
    setBubbleSpeech("内容・日付・金額を入力してね。");
    return;
  }

  const templates = getFixedCostTemplates();
  templates.push({ description, category: "固定費", subcategory, day, amount, person });
  saveFixedCostTemplates(templates);
  document.getElementById("fixedCostDescription").value = "";
  document.getElementById("fixedCostDay").value = "";
  document.getElementById("fixedCostAmount").value = "";
  renderFixedCostTemplates();
}

async function transferSelectedFixedCost() {
  const month = document.getElementById("f-month").value;
  if (!month) {
    setBubbleSpeech("対象月を選んでね。");
    return;
  }
  const entered = await getEnteredFixedCostDescriptions();
  const pending = getFixedCostTemplates().filter(t => !entered.has(String(t.description).trim()));
  if (pending.length === 0) {
    setBubbleSpeech("追加する固定費はないよ。");
    return;
  }

  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const total = pending.reduce((s, t) => s + Number(t.amount || 0), 0);
  if (!confirm(`${month}の固定費${pending.length}件（合計${total.toLocaleString()}円）をまとめて追加しますか？`)) return;

  try {
    for (const t of pending) {
      const day = Math.min(Number(t.day) || 1, lastDay);
      await addRecord({
        type: "支出",
        date: `${month}-${String(day).padStart(2, "0")}`,
        series: "通常費",
        category: "固定費",
        subcategory: t.subcategory,
        description: t.description,
        amount: Number(t.amount),
        person: t.person,
      });
    }
    setBubbleSpeech(`固定費${pending.length}件をまとめて追加したよ。`);
  } catch (e) {
    setBubbleSpeech("固定費の追加に失敗したよ。");
    console.error(e);
  }
  loadKakeiboDetailList();
}

function openEdit(firestoreId) {
  editingFirestoreId = firestoreId;
  db.collection("kakeibo").doc(firestoreId).get().then(doc => {
    if (!doc.exists) return;
    const r = doc.data();
    document.getElementById("m-date").value        = r.date;
    updateLocalizedDateDisplay(document.getElementById("m-date"));
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
    series:      getSeriesByCategory(document.getElementById("m-type").value, document.getElementById("m-category").value),
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
  const monthEl = document.getElementById("f-month");
  const inlineToggle = document.getElementById("detailInlineInputToggle");
  const inlineSubmitBtn = document.getElementById("d-submitBtn");
  const inlineClearBtn = document.getElementById("d-clearBtn");
  const inlineTypeEl = document.getElementById("d-type");
  const fixedCostSaveBtn = document.getElementById("fixedCostSaveBtn");
  const fixedCostTransferBtn = document.getElementById("fixedCostTransferBtn");

  if (!filterBtn || !listEl) return;

  filterBtn.addEventListener("click", loadKakeiboDetailList);
  if (fCategory) fCategory.addEventListener("change", onFilterCategoryChange);
  onFilterCategoryChange();

  if (monthEl) {
    monthEl.addEventListener("change", () => {
      localStorage.setItem(KAKEIBO_STORAGE_KEYS.SELECTED_MONTH, monthEl.value);
    });
  }

  if (inlineToggle) {
    inlineToggle.checked = localStorage.getItem(KAKEIBO_STORAGE_KEYS.DETAIL_INLINE_INPUT) === "1";
    inlineToggle.addEventListener("change", () => {
      setDetailInlineLayout(inlineToggle.checked);
    });
    setDetailInlineLayout(inlineToggle.checked);
  }

  if (inlineTypeEl) {
    inlineTypeEl.addEventListener("change", onDetailInlineTypeChange);
    onDetailInlineTypeChange();
  }

  const inlineDateEl = document.getElementById("d-date");
  if (inlineDateEl) {
    inlineDateEl.value = defaultInputDate();
    inlineDateEl.addEventListener("change", () => saveInputDate(inlineDateEl.value));
  }

  if (inlineSubmitBtn) inlineSubmitBtn.addEventListener("click", submitDetailInlineForm);
  if (fixedCostSaveBtn) fixedCostSaveBtn.addEventListener("click", saveFixedCostTemplate);
  if (fixedCostTransferBtn) fixedCostTransferBtn.addEventListener("click", transferSelectedFixedCost);
  populateSubcategorySelect(document.getElementById("fixedCostSubcategory"), getAllSubcategories(), false);
  if (inlineClearBtn) {
    inlineClearBtn.addEventListener("click", () => {
      const dDesc = document.getElementById("d-description");
      const dAmount = document.getElementById("d-amount");
      if (dDesc) dDesc.value = "";
      if (dAmount) dAmount.value = "";
    });
  }
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
  initLocalizedDateDisplays();
  loadKakeiboDetailList();
}

function setDetailInlineLayout(enabled) {
  const layout = document.getElementById("detailLayout");
  const pane = document.getElementById("detailInputPane");
  if (!layout || !pane) return;

  if (enabled) {
    layout.classList.add("split");
    pane.style.display = "block";
  } else {
    layout.classList.remove("split");
    pane.style.display = "none";
  }

  localStorage.setItem(KAKEIBO_STORAGE_KEYS.DETAIL_INLINE_INPUT, enabled ? "1" : "0");
}

function setDetailInlineTypeState(type) {
  const catSel = document.getElementById("d-category");
  const subBlk = document.getElementById("d-subcategory-block");
  const subSel = document.getElementById("d-subcategory");
  if (!catSel || !subBlk || !subSel) return;

  if (type === "収入") {
    catSel.innerHTML = INCOME_CATEGORIES.map(v => `<option value="${v}">${v}</option>`).join("");
    subBlk.style.display = "none";
    subSel.innerHTML = "";
  } else {
    catSel.innerHTML = EXPENSE_CATEGORIES.map(v => `<option value="${v}">${v}</option>`).join("");
    subBlk.style.display = "block";
    populateSubcategorySelect(subSel, getAllSubcategories(), false);
  }
}

function onDetailInlineTypeChange() {
  const typeEl = document.getElementById("d-type");
  if (!typeEl) return;
  setDetailInlineTypeState(typeEl.value);
}

async function submitDetailInlineForm() {
  const dateEl = document.getElementById("d-date");
  const typeEl = document.getElementById("d-type");
  const catEl = document.getElementById("d-category");
  const subEl = document.getElementById("d-subcategory");
  const descEl = document.getElementById("d-description");
  const amountEl = document.getElementById("d-amount");
  const personEl = document.getElementById("d-person");

  if (!dateEl || !typeEl || !catEl || !descEl || !amountEl || !personEl) return;

  const date = dateEl.value;
  const type = typeEl.value;
  const category = catEl.value;
  const subcategory = type === "支出" && subEl ? subEl.value : "";
  const description = descEl.value.trim();
  const amount = parseInt(amountEl.value, 10);
  const person = personEl.value;

  if (!date || !description || !amount || isNaN(amount)) {
    const msg = await getMessage("kakeibo", "empty_input");
    setBubbleSpeech(msg.text);
    setCharacterExpression(msg.expression);
    return;
  }

  try {
    await addRecord({
      type,
      date,
      series: getSeriesByCategory(type, category),
      category,
      subcategory,
      description,
      amount,
      person,
    });
    saveInputDate(date);

    descEl.value = "";
    amountEl.value = "";

    const msg = await getMessage("kakeibo", "saved", null, {
      description,
      amount: amount.toLocaleString(),
    });
    setBubbleSpeech(msg.text);
    setCharacterExpression(msg.expression);

    loadKakeiboDetailList();
  } catch (e) {
    const msg = await getMessage("kakeibo", "save_error");
    setBubbleSpeech(msg.text);
    setCharacterExpression(msg.expression);
    console.error(e);
  }
}

window.addEventListener("load", () => {
  initCharacterImage();
  currentYM = thisMonth();
  localStorage.setItem(KAKEIBO_STORAGE_KEYS.SELECTED_MONTH, currentYM);
  initKakeiboInputPage();
  initKakeiboSummaryPage();
  initKakeiboDetailPage();
});
