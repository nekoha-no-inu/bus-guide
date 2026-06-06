// ======================================
// garbage.js  ─  ゴミ収集案内
// ======================================

// ---- 地域ごとの収集曜日設定（お住まいの地区に合わせて変更） ----
const GARBAGE_SCHEDULE = {
  burnable:    ["月", "木"],  // 燃えるごみ
  plastic:     ["金"],        // プラ
  recyclable:  ["火"],        // 資源ごみ
  nonburnable: ["水"],        // 不燃（月1）
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getTodayWeekday() {
  return WEEKDAYS[new Date().getDay()];
}

// ---- 今日の収集物を判定 ----

function getTodayGarbage() {
  const today   = getTodayWeekday();
  const result  = [];
  const { burnable, plastic, recyclable, nonburnable } = GARBAGE_SCHEDULE;

  if (burnable.includes(today))   result.push("燃えるごみ");
  if (plastic.includes(today))    result.push("プラごみ");
  if (recyclable.includes(today)) result.push("資源ごみ");

  const weekNum = Math.ceil(new Date().getDate() / 7);
  if (nonburnable.includes(`第${weekNum}${today}`)) result.push("不燃ごみ");

  return result;
}

// ---- 今週のスケジュール一覧 ----

function getWeekSchedule() {
  return WEEKDAYS.map(day => {
    const items = [];
    if (GARBAGE_SCHEDULE.burnable.includes(day))    items.push("可燃ごみ");
    if (GARBAGE_SCHEDULE.plastic.includes(day))     items.push("プラごみ・ペットボトル");
    if (GARBAGE_SCHEDULE.recyclable.includes(day))  items.push("古紙・古着・びん・かん");
    if (GARBAGE_SCHEDULE.nonburnable.includes(day)) items.push("不燃ごみ");
    return { day, items };
  });
}

// ---- キャラのセリフ ----

async function loadGarbageMessage(todayItems) {
  const type = todayItems.length > 0 ? "has" : "none";
  const msg  = await getMessage("garbage", type);
  document.getElementById("bubble").innerHTML = msg.text;
  setCharacterExpression(msg.expression);
}

// ---- メイン処理 ----

window.addEventListener("load", async () => {
  const todayItems = getTodayGarbage();

  document.getElementById("todayGarbage").innerHTML =
    todayItems.length > 0 ? todayItems.join("・") : "今日は収集はありません";

  const weekDiv = document.getElementById("weekGarbage");
  weekDiv.innerHTML = "";

  getWeekSchedule().forEach(({ day, items }) => {
    const div = document.createElement("div");
    div.className = "garbage-card";
    div.innerHTML = `
      <div class="garbage-title">${day}曜日</div>
      <div>${items.length > 0 ? items.join("・") : "なし"}</div>
    `;
    weekDiv.appendChild(div);
  });

  await loadGarbageMessage(todayItems);
});
