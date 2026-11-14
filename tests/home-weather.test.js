const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup(fetch, reminder = null) {
  const elements = Object.fromEntries(
    ["homeWeather", "currentDate", "currentTime", "lastUpdate", "character"].map(id => [
      id, { textContent: "", innerHTML: "", addEventListener() {} }
    ])
  );
  const messages = [];
  const listeners = {};
  const context = vm.createContext({
    document: { getElementById: id => elements[id] },
    window: { addEventListener: (event, callback) => { listeners[event] = callback; } },
    navigator: {},
    localStorage: { getItem: () => reminder, removeItem() {} },
    fetch,
    setInterval() {},
    setTimeout() {},
    console,
  });
  for (const file of ["common.js", "home.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8"), context);
  }
  context.initCharacterImage = () => {};
  context.setBubbleSpeech = text => { messages.push(text); };
  context.setCharacterExpression = () => {};
  context.getMessage = async (page, zone, weather) => ({ text: `${page}:${zone}:${weather}`, expression: "normal" });
  return { context, elements, listeners, messages };
}

const weatherData = {
  current_weather: { weathercode: 61, temperature: 12.5 },
  daily: { temperature_2m_max: [16], temperature_2m_min: [7] }
};

test("天気概要とセリフに同じ清瀬市のデータを利用する", async () => {
  const calls = [];
  const app = setup(async url => {
    calls.push(url);
    if (url.includes("open-meteo")) return { ok: true, json: async () => weatherData };
    return { ok: true, json: async () => ({ commit: { committer: { date: "2026-01-01T00:00:00Z" } } }) };
  });
  await app.listeners.load();
  assert.equal(calls.filter(url => url.includes("open-meteo")).length, 1);
  assert.match(calls.find(url => url.includes("open-meteo")), /latitude=35\.779&longitude=139\.514/);
  assert.match(app.elements.homeWeather.innerHTML, /img\/weather\/rain\.png/);
  assert.match(app.elements.homeWeather.innerHTML, /雨.*現在 12\.5℃/);
  assert.match(app.elements.homeWeather.innerHTML, /最高 16℃ ／ 最低 7℃/);
  assert.match(app.messages.at(-1), /:rain$/);
});

test("リマインダーがある場合も天気を表示する", async () => {
  const reminder = JSON.stringify({ text: "お知らせ", expression: "normal", expiresAt: Date.now() + 60000 });
  const app = setup(async url => url.includes("open-meteo")
    ? { ok: true, json: async () => weatherData }
    : { ok: true, json: async () => ({ commit: { committer: { date: "2026-01-01T00:00:00Z" } } }) }, reminder);
  await app.listeners.load();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.messages[0], "お知らせ");
  assert.match(app.elements.homeWeather.innerHTML, /現在 12\.5℃/);
});

test("HTTPエラーや不正なデータは取得失敗と表示し、セリフを維持する", async () => {
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, json: async () => ({ current_weather: { weathercode: 0, temperature: null }, daily: {} }) }
  ]) {
    const app = setup(async url => url.includes("open-meteo")
      ? response
      : { ok: true, json: async () => ({ commit: { committer: { date: "2026-01-01T00:00:00Z" } } }) });
    await app.listeners.load();
    assert.equal(app.elements.homeWeather.textContent, "天気を取得できませんでした。");
    assert.match(app.messages.at(-1), /:null$/);
  }
});
