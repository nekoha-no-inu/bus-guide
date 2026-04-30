async function getMessage(page, category, type = null, vars = {}) {
  const res = await fetch("data/conversation.json");
  const data = await res.json();

  let list;

  if (type) {
    list = data[page][category][type];
  } else {
    list = data[page][category];
  }

  // ランダムに1つ選ぶ
  let item = list[Math.floor(Math.random() * list.length)];

  // item が文字列の場合（古い形式） → オブジェクトに変換
  if (typeof item === "string") {
    item = { text: item, expression: "normal" };
  }

  let text = item.text;

  // テンプレート変数を埋め込む
  for (const key in vars) {
    const regex = new RegExp(`{{${key}}}`, "g");
    text = text.replace(regex, vars[key]);
  }

  return {
    text,
    expression: item.expression || "normal"
  };
}

function setCharacterExpression(type) {
  const img = document.getElementById("character");
  if (!img) return; // timetable にキャラがいない場合の保険

  if (type === "hurry") img.src = "img/character_hurry.png";
  else if (type === "relax") img.src = "img/character_relax.png";
  else img.src = "img/character_normal.png";
}

