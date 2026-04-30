// ----------------------------
// 地域ごとの収集曜日設定
// ※あなたの地区に合わせて変更可能
// ----------------------------
const garbageSchedule = {
  burnable: ["月", "木"],      // 燃えるごみ
  plastic: ["金"],             // プラ
  recyclable: ["火"],          // 資源ごみ
  nonburnable: ["水"],      // 不燃（月1）
};

// ----------------------------
// 今日の曜日を取得
// ----------------------------
function getTodayWeekday() {
  const w = ["日","月","火","水","木","金","土"];
  return w[new Date().getDay()];
}

// ----------------------------
// 今日の収集物を判定
// ----------------------------
function getTodayGarbage() {
  const today = getTodayWeekday();
  const result = [];

  if (garbageSchedule.burnable.includes(today)) result.push("燃えるごみ");
  if (garbageSchedule.plastic.includes(today)) result.push("プラごみ");
  if (garbageSchedule.recyclable.includes(today)) result.push("資源ごみ");

  // 不燃ごみ（第◯週判定）
  const now = new Date();
  const weekNum = Math.ceil(now.getDate() / 7); // 第何週か
  const nonburn = garbageSchedule.nonburnable;

  if (nonburn.includes(`第${weekNum}${today}`)) {
    result.push("不燃ごみ");
  }

  return result;
}

// ----------------------------
// 今週のスケジュール一覧
// ----------------------------
function getWeekSchedule() {
  const w = ["日","月","火","水","木","金","土"];
  const list = [];

  for (let i = 0; i < 7; i++) {
    const day = w[i];
    const items = [];

    if (garbageSchedule.burnable.includes(day)) items.push("可燃ごみ");
    if (garbageSchedule.plastic.includes(day)) items.push("プラごみ・ペットボトル");
    if (garbageSchedule.recyclable.includes(day)) items.push("古紙・古着・びん・かん");
    if (garbageSchedule.nonburnable.includes(day)) items.push("不燃ごみ");

    list.push({ day, items });
  }

  return list;
}

// ----------------------------
// キャラのセリフ
// ----------------------------
async function loadGarbageMessage(todayItems) {
  let type = todayItems.length > 0 ? "has" : "none";
  const msg = await getMessage("garbage", type);

  document.getElementById("bubble").innerHTML = msg.text;
  document.getElementById("character").src = `img/character_${msg.expression}.png`;
}

// ----------------------------
// メイン処理
// ----------------------------
window.onload = async () => {
  const todayItems = getTodayGarbage();

  // 今日の収集
  document.getElementById("todayGarbage").innerHTML =
    todayItems.length > 0
      ? todayItems.join("・")
      : "今日は収集はありません";

  // 今週の一覧
  const week = getWeekSchedule();
  const weekDiv = document.getElementById("weekGarbage");
  weekDiv.innerHTML = "";

  week.forEach(d => {
    const div = document.createElement("div");
    div.className = "garbage-card";
    div.innerHTML = `
      <div class="garbage-title">${d.day}曜日</div>
      <div>${d.items.length > 0 ? d.items.join("・") : "なし"}</div>
    `;
    weekDiv.appendChild(div);
  });

  // キャラのセリフ
  await loadGarbageMessage(todayItems);
};
