const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const elements = {};
  for (const id of ["timerMinutes", "timerDisplay", "startTimerBtn"]) {
    elements[id] = { value: "", textContent: "", addEventListener(event, callback) { this[event] = callback; } };
  }
  const presets = Array.from({ length: 6 }, (_, index) => ({
    dataset: { timerMinutes: String(index + 1) },
    addEventListener(event, callback) { this[event] = callback; }
  }));
  const listeners = {};
  const messages = [];
  const speech = [];
  let now = 0;
  let interval = null;
  let sounds = 0;
  const context = vm.createContext({
    document: {
      hidden: false,
      getElementById: id => elements[id],
      querySelectorAll: () => presets,
      addEventListener: (event, callback) => { listeners[event] = callback; }
    },
    Date: { now: () => now },
    setInterval: callback => { interval = callback; return 1; },
    clearInterval: () => { interval = null; },
    getMessage: async (page, key, key2, vars) => {
      messages.push({ page, key, vars });
      return { text: key, expression: "normal" };
    },
    setCharacterSpeech: text => speech.push(text),
    playAlarmSound: () => { sounds++; },
    console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "timer.js"), "utf8"), context);
  return {
    context, elements, presets, listeners, messages, speech,
    setTime: value => { now = value; },
    tick: () => { if (interval) interval(); },
    soundCount: () => sounds,
    running: () => interval !== null
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test("プリセットは1～6分を入力し、開始ボタンを押すまでは動かない", () => {
  const timer = setup();
  timer.presets.forEach((button, index) => {
    button.click();
    assert.equal(timer.elements.timerMinutes.value, String(index + 1));
    assert.equal(timer.running(), false);
  });
});

test("残り時間を毎秒表示し、セリフは開始・1分ごと・終了時に更新する", async () => {
  const timer = setup();
  timer.elements.timerMinutes.value = "3";
  timer.elements.startTimerBtn.click();
  await flush();
  assert.equal(timer.elements.timerDisplay.textContent, "03:00");
  timer.setTime(1_000);
  timer.tick();
  assert.equal(timer.elements.timerDisplay.textContent, "02:59");
  timer.setTime(59_000);
  timer.tick();
  assert.deepEqual(timer.messages.map(message => message.key), ["start"]);
  timer.setTime(60_000);
  timer.tick();
  timer.setTime(120_000);
  timer.tick();
  await flush();
  assert.deepEqual(timer.messages.map(message => message.key), ["start", "count", "count"]);
  assert.equal(timer.messages[1].vars.m, 2);
  assert.equal(timer.messages[1].vars.s, 0);
  timer.setTime(180_000);
  timer.tick();
  timer.tick();
  await flush();
  assert.equal(timer.elements.timerDisplay.textContent, "00:00");
  assert.equal(timer.running(), false);
  assert.equal(timer.soundCount(), 1);
  assert.deepEqual(timer.messages.map(message => message.key), ["start", "count", "count", "finish"]);
});

test("処理の遅延や画面復帰後も実際の経過時間で終了する", async () => {
  const timer = setup();
  timer.elements.timerMinutes.value = "1";
  timer.elements.startTimerBtn.click();
  timer.setTime(65_000);
  timer.listeners.visibilitychange();
  await flush();
  assert.equal(timer.elements.timerDisplay.textContent, "00:00");
  assert.equal(timer.soundCount(), 1);
  assert.deepEqual(timer.messages.map(message => message.key), ["start", "finish"]);
});

test("無効な入力は動作中のタイマーを停止しない", async () => {
  const timer = setup();
  timer.elements.timerMinutes.value = "2";
  timer.elements.startTimerBtn.click();
  timer.elements.timerMinutes.value = "1.5";
  timer.elements.startTimerBtn.click();
  await flush();
  assert.equal(timer.running(), true);
  assert.deepEqual(timer.messages.map(message => message.key), ["start", "error"]);
  timer.setTime(1_000);
  timer.tick();
  assert.equal(timer.elements.timerDisplay.textContent, "01:59");
});

test("遅れて返った古いセリフは新しいタイマーを上書きしない", async () => {
  const timer = setup();
  const pending = [];
  timer.context.getMessage = (page, key) => new Promise(resolve => pending.push({ key, resolve }));
  timer.elements.timerMinutes.value = "1";
  timer.elements.startTimerBtn.click();
  timer.elements.timerMinutes.value = "2";
  timer.elements.startTimerBtn.click();
  pending[1].resolve({ text: "新しい", expression: "normal" });
  await flush();
  pending[0].resolve({ text: "古い", expression: "normal" });
  await flush();
  assert.deepEqual(timer.speech, ["新しい"]);
});
