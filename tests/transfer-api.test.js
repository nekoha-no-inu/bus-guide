const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup({ useTransitApi = false, apiCandidates = [], mockCandidates = true, mockRender = true, mode = "自宅→清瀬駅" } = {}) {
  const elements = {
    useTransitApi: { checked: useTransitApi },
    datetime: { value: "2026-11-16T08:00" },
    datetimeManual: { value: "2026/11/16 08:00", reportValidity() {} },
    routeDecisionLogOutput: { textContent: "" },
    dayTypeDisplay: { innerText: "" },
    routeCard: { style: {} },
    groupCards: {
      children: [],
      set innerHTML(value) { this.children = []; },
      appendChild(child) { this.children.push(child); },
    },
    prevBtn: { disabled: false },
    nextBtn: { disabled: false },
  };
  const context = vm.createContext({
    document: {
      readyState: "loading",
      addEventListener() {},
      getElementById: id => elements[id],
      createElement: () => ({ innerHTML: "", className: "" }),
      querySelector: () => ({ dataset: { mode } }),
      querySelectorAll: () => [],
    },
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "transfer.js"), "utf8"),
    context
  );
  let apiCalls = 0;
  context.syncDepartureDateTimeFromManual = () => true;
  context.getDayType = () => "平日";
  if (mockCandidates) context.buildAllCandidates = () => [];
  context.loadCandidatesFromTransitAPI = async () => {
    apiCalls++;
    return apiCandidates;
  };
  if (mockRender) context.renderAll = async () => {};
  context.speak = async () => {};
  context.getTransferMsg = async () => ({ text: "", expression: "normal" });
  context.setBubbleSpeech = () => {};
  context.setCharacterExpression = () => {};
  return { context, elements, apiCalls: () => apiCalls };
}

test("Transit API is not requested by default and CSV is selected", async () => {
  const app = setup();
  await app.context.searchBus();
  assert.equal(app.apiCalls(), 0);
  assert.equal(app.elements.dayTypeDisplay.innerText, 'この日は「平日」ダイヤです（データ: CSV）');
});

test("Transit API can be enabled explicitly", async () => {
  const app = setup({ useTransitApi: true });
  await app.context.searchBus();
  assert.equal(app.apiCalls(), 1);
  assert.equal(app.elements.dayTypeDisplay.innerText, 'この日は「平日」ダイヤです（データ: CSV）');
});

test("Transit API candidates are used when the option is enabled", async () => {
  const candidate = { line: "清63", stop: "清瀬駅北口", depart: "08:10", arrive: "08:20", finishMin: 500 };
  const app = setup({ useTransitApi: true, apiCandidates: [candidate] });
  await app.context.searchBus();
  assert.equal(app.apiCalls(), 1);
  assert.equal(app.elements.dayTypeDisplay.innerText, 'この日は「平日」ダイヤです（データ: Transit API）');
});

test("CSV search includes the newly added stops and directions", async () => {
  const app = setup({ mockCandidates: false });
  app.context.fetch = async file => ({
    text: async () => fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
  });
  await app.context.loadCSV();

  const expected = [
    ["自宅→清瀬駅", "下清戸二丁目", "清63-1", "05:41"],
    ["自宅→清瀬駅", "下清戸二丁目", "清63", "06:25"],
    ["自宅→清瀬駅", "下清戸二丁目", "清63-2", "08:37"],
    ["自宅→清瀬駅", "下戸", "清64", "05:58"],
    ["自宅→清瀬駅", "下戸", "清64-2", "06:18"],
    ["自宅→新座駅", "台田", "清62", "06:19"],
  ];
  for (const [mode, stop, line, depart] of expected) {
    const candidates = app.context.buildAllCandidates(mode, "平日", 0);
    assert.ok(
      candidates.some(c => c.stop === stop && c.line === line && c.depart === depart),
      `${mode}: ${stop} ${line} ${depart} not found`
    );
  }
});

test("CSV candidates and group cards exclude routes for each direction", () => {
  const app = setup({ mockCandidates: false });
  const modes = ["自宅→清瀬駅", "清瀬駅→自宅", "自宅→新座駅", "新座駅→自宅"];
  const lines = ["清61", "清61-1", "清62", "清63", "清63-2", "清64", "清64-2"];
  app.context.testRoutes = modes.flatMap(mode => lines.map(line => ({
    mode, line, stop: "停留所", getoff: "降車", direction: mode, walk_min: "0", ride_min: "10",
  })));
  app.context.testSchedules = app.context.testRoutes.map(r => ({
    route: r.line, stop: r.stop, direction: r.direction, day_type: "平日", depart_time: "08:00",
  }));
  vm.runInContext("routes = testRoutes; schedules = testSchedules", app.context);

  for (const mode of modes) {
    const toKiyose = mode.includes("清瀬駅");
    const expected = toKiyose ? ["清62", "清63", "清63-2", "清64", "清64-2"] : ["清61", "清61-1", "清62"];
    const candidates = app.context.buildAllCandidates(mode, "平日", 0);
    assert.deepEqual(Array.from(candidates, c => c.line).sort(), expected.sort(), mode);

    const allLines = lines.map(line => ({ line, departMin: 480, finishMin: 490, walk: 0 }));
    const groups = app.context.buildGroupBestFromAll(mode, [], 0, true, allLines);
    assert.deepEqual(
      Object.keys(groups).sort(),
      (toKiyose ? ["清62", "清63", "清64"] : ["清61", "清62"]).sort(),
      mode
    );
  }
});

test("excluded Transit API routes fall back to CSV instead of appearing", async () => {
  const excluded = { line: "清６１－１系統", depart: "08:10", arrive: "08:20", finishMin: 500 };
  const csv = { line: "清62", stop: "台田", depart: "08:15", arrive: "08:23", finishMin: 503 };
  const app = setup({ useTransitApi: true, apiCandidates: [excluded] });
  app.context.buildAllCandidates = () => [csv];
  let shown;
  app.context.renderAll = async candidate => { shown = candidate; };

  await app.context.searchBus();
  assert.equal(app.apiCalls(), 1);
  assert.equal(shown, csv);
  assert.equal(app.elements.dayTypeDisplay.innerText, 'この日は「平日」ダイヤです（データ: CSV）');
});

test("Transit API candidates are filtered for both Niiza directions", async () => {
  for (const mode of ["自宅→新座駅", "新座駅→自宅"]) {
    const candidates = [
      { line: "清６３－２系統", depart: "08:10", arrive: "08:20", finishMin: 500 },
      { line: "清64", depart: "08:12", arrive: "08:22", finishMin: 502 },
      { line: "清61", depart: "08:15", arrive: "08:25", finishMin: 505 },
    ];
    const app = setup({ mode, useTransitApi: true, apiCandidates: candidates });
    let shown;
    app.context.renderAll = async candidate => { shown = candidate; };
    await app.context.searchBus();
    assert.equal(shown.line, "清61", mode);
    assert.equal(vm.runInContext("_allCandidates.length", app.context), 1, mode);
  }
});

test("no departures shows empty cards only for routes serving the selected direction", async () => {
  const cases = [
    ["自宅→清瀬駅", ["清62", "清63", "清64"]],
    ["清瀬駅→自宅", ["清62", "清63", "清64"]],
    ["自宅→新座駅", ["清61", "清62"]],
    ["新座駅→自宅", ["清61", "清62"]],
  ];
  for (const [mode, groups] of cases) {
    const app = setup({ mode });
    await app.context.searchBus();
    const cards = app.elements.groupCards.children;
    assert.equal(cards.length, groups.length, mode);
    for (const [index, group] of groups.entries()) {
      assert.match(cards[index].innerHTML, new RegExp(`${group} 系統`));
      assert.match(cards[index].innerHTML, /この方向・時刻の候補はありません/);
    }
    assert.equal(app.elements.routeCard.style.display, "none");
    assert.equal(app.elements.prevBtn.disabled, true);
    assert.equal(app.elements.nextBtn.disabled, true);
  }
});

test("a route without departures shows an empty card when another route has a candidate", async () => {
  const app = setup({ mockRender: false });
  app.context.buildAllCandidates = () => [{
    line: "清62", stop: "台田", getoff: "清瀬駅北口", depart: "08:10", arrive: "08:18",
    departMin: 490, arriveMin: 498, finishMin: 498, walk: 1, ride: 8,
  }];
  await app.context.searchBus();
  const cards = app.elements.groupCards.children;
  assert.equal(cards.length, 3);
  assert.match(cards[0].innerHTML, /清62 系統/);
  assert.match(cards[0].innerHTML, /08:10/);
  for (const card of cards.slice(1)) {
    assert.match(card.innerHTML, /この方向・時刻の候補はありません/);
  }
});
