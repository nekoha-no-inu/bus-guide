const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createContext() {
  const elements = Object.fromEntries(
    ["monthTitle", "summary", "breakdown", "summaryChart"].map(id => [
      id, { textContent: "", innerHTML: "", appendChild(child) { this.child = child; } }
    ])
  );
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: {
      getElementById: id => elements[id] || null,
      querySelector: () => null,
      createElement: () => ({ innerHTML: "", className: "" })
    },
    localStorage: { setItem() {} },
    getMessage: async () => ({ text: "確認", expression: "normal" }),
    setBubbleSpeech() {},
    setCharacterExpression() {},
    console
  });
  const script = fs.readFileSync(path.join(__dirname, "..", "js", "kakeibo.js"), "utf8");
  vm.runInContext(script, context);
  return { context, elements };
}

const records = [
  { date: "2025-12-10", type: "収入", category: "ボーナス", amount: 100000 },
  { date: "2026-01-03", type: "支出", category: "旅費", amount: 10000 },
  { date: "2026-05-01", type: "収入", category: "ボーナス", amount: 20000 },
  { date: "2026-06-30", type: "支出", category: "臨時出費", amount: 5000 },
  { date: "2026-10-10", type: "支出", category: "旅費", amount: 120000 },
  { date: "2026-11-30", type: "収入", category: "ボーナス", amount: 5000 },
  { date: "2026-12-01", type: "収入", category: "ボーナス", amount: 500000 },
  { date: "2026-11-01", type: "収入", category: "給与", amount: 900000 }
];

test("特別費は指定月末までの全期間を集計し、未来と通常費を除く", () => {
  const { context } = createContext();
  context.records = records;
  for (const [month, expected] of [
    ["2025-11", 0], ["2025-12", 100000], ["2026-06", 105000],
    ["2026-09", 105000], ["2026-10", -15000], ["2026-11", -10000],
    ["2026-12", 490000]
  ]) {
    context.month = month;
    assert.equal(vm.runInContext("getSpecialBalanceThroughMonth(records, month)", context), expected);
  }
});

test("表示月のカードとグラフの各点が月末残高を表示する", async () => {
  const { context, elements } = createContext();
  context.records = records;
  vm.runInContext(`
    currentYM = "2026-11";
    fetchRecords = async ym => records.filter(r => r.date.startsWith(ym));
    fetchAllRecords = async () => records;
  `, context);
  await vm.runInContext("renderKakeiboSummary()", context);

  assert.match(elements.summary.innerHTML, /残高<\/span><span class="summary-balance minus">-10,000円/);
  assert.match(elements.summaryChart.innerHTML, /2026年6月末の残高: 105,000円/);
  assert.match(elements.summaryChart.innerHTML, /2026年9月末の残高: 105,000円/);
  assert.match(elements.summaryChart.innerHTML, /2026年10月末の残高: -15,000円/);
  assert.match(elements.summaryChart.innerHTML, /2026年11月末の残高: -10,000円/);
  assert.doesNotMatch(elements.summaryChart.innerHTML, /490,000円/);
});

test("横方向の補助線は縦軸の目盛に揃い、0円線を維持する", () => {
  const { context } = createContext();
  context.records = records;
  for (const expression of [
    'createSpecialMonthlyLineChart(records, "2026-11", "特別費")',
    'createSpecialMonthlyLineChart([], "2026-11", "特別費")'
  ]) {
    const chart = vm.runInContext(expression, context);
    const labelPositions = [...chart.matchAll(/<text x="58" y="([^"]+)"/g)].map(match => Number(match[1]) - 4);
    const gridPositions = [...chart.matchAll(/class="summary-chart-gridline" x1="68" x2="402" y1="([^"]+)" y2="\1" stroke="#e5e7eb"/g)]
      .map(match => Number(match[1]));
    const zeroLine = chart.match(/<line x1="68" x2="402" y1="([^"]+)" y2="\1" stroke="#d0d5db" stroke-width="1" stroke-dasharray="4 4"/);
    assert.ok(zeroLine);
    const linePositions = [...gridPositions, Number(zeroLine[1])];
    assert.equal(labelPositions.length, 5);
    for (const position of labelPositions) assert.ok(linePositions.includes(position));
    assert.equal(gridPositions.length, labelPositions.filter(position => position !== Number(zeroLine[1])).length);
    assert.ok(chart.indexOf('class="summary-chart-gridline"') < chart.indexOf("<polyline"));
  }
});

test("月移動中に古い読み込み結果が新しい月の表示を上書きしない", async () => {
  const { context, elements } = createContext();
  context.records = records;
  const pending = {};
  context.pending = pending;
  vm.runInContext(`
    fetchRecords = ym => new Promise(resolve => { pending[ym] = resolve; });
    fetchAllRecords = async () => records;
    currentYM = "2026-10";
  `, context);
  const october = vm.runInContext("renderKakeiboSummary()", context);
  vm.runInContext('currentYM = "2026-11"', context);
  const november = vm.runInContext("renderKakeiboSummary()", context);
  pending["2026-11"](records.filter(r => r.date.startsWith("2026-11")));
  await november;
  pending["2026-10"](records.filter(r => r.date.startsWith("2026-10")));
  await october;

  assert.equal(elements.monthTitle.textContent, "2026年11月");
  assert.match(elements.summary.innerHTML, /残高<\/span><span class="summary-balance minus">-10,000円/);
  assert.match(elements.summaryChart.innerHTML, /2026年11月末の残高: -10,000円/);
});
