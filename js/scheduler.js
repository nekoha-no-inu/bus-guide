// ======================================
// scheduler.js  ─  スケジュール管理
// ======================================

let currentMonthDate = new Date();
let selectedDate = null;
let allSchedules = [];

function getDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(value) {
  if (!value) return "日付未定";
  return `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
}

function formatShortDate(value) {
  const parsed = parseDateKey(value);
  if (!parsed) return "-";
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

function normalizeSchedule(item) {
  const startDate = item.startDate || item.date || getDateKey(new Date());
  const endDate = item.endDate || startDate;
  const allDay = item.allDay === true;
  const time = item.time || "";
  const person = item.person || "共通";
  const genre = item.genre || "予定";
  return { ...item, startDate, endDate, allDay, time, person, genre };
}

function getGenreClassName(genre) {
  const normalized = (genre || "予定").toLowerCase();
  if (normalized.includes("仕事")) return "schedule-genre-work";
  if (normalized.includes("学校")) return "schedule-genre-school";
  if (normalized.includes("用事")) return "schedule-genre-errand";
  if (normalized.includes("習い") || normalized.includes("勉強")) return "schedule-genre-study";
  if (normalized.includes("イベント") || normalized.includes("event")) return "schedule-genre-event";
  return "schedule-genre-default";
}

function getGenreIcon(genre) {
  const normalized = (genre || "予定").toLowerCase();
  if (normalized.includes("仕事")) return "💼";
  if (normalized.includes("学校")) return "🎓";
  if (normalized.includes("用事")) return "🛍️";
  if (normalized.includes("習い") || normalized.includes("勉強")) return "📚";
  if (normalized.includes("イベント") || normalized.includes("event")) return "🎉";
  return "🗓️";
}

function getCalendarCells(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(year, month, i - startOffset + 1);
    cells.push(cellDate);
  }

  return cells;
}

function isScheduleOnDate(item, dateKey) {
  const safeItem = normalizeSchedule(item);
  const current = parseDateKey(dateKey);
  const start = parseDateKey(safeItem.startDate);
  const end = parseDateKey(safeItem.endDate);

  if (!current || !start || !end) return false;
  return current >= start && current <= end;
}

function getSchedulesForDate(dateKey) {
  return allSchedules.filter(item => isScheduleOnDate(item, dateKey));
}

function getScheduleRangeText(item) {
  const safeItem = normalizeSchedule(item);
  const start = formatShortDate(safeItem.startDate);
  const end = safeItem.endDate && safeItem.endDate !== safeItem.startDate ? formatShortDate(safeItem.endDate) : null;
  return end ? `${start}〜${end}` : start;
}

function getScheduleTimeText(item) {
  const safeItem = normalizeSchedule(item);
  if (safeItem.allDay) return "終日";
  return safeItem.time || "-";
}

async function showScheduleReminder(items) {
  const now = new Date();
  const todayKey = getDateKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = getDateKey(tomorrow);

  const todayItems = items.filter(item => !item.checked && isScheduleOnDate(item, todayKey));
  const tomorrowItems = items.filter(item => !item.checked && isScheduleOnDate(item, tomorrowKey));

  let reminderType = null;
  let reminderItems = [];
  let reminderDate = null;

  if (todayItems.length > 0) {
    reminderType = "today";
    reminderItems = todayItems;
    reminderDate = now;
  } else if (tomorrowItems.length > 0) {
    reminderType = "tomorrow";
    reminderItems = tomorrowItems;
    reminderDate = tomorrow;
  }

  if (!reminderType || reminderItems.length === 0) {
    localStorage.removeItem("homeReminder");
    return;
  }

  const names = reminderItems.slice(0, 3).map(item => item.name).join("、");
  const suffix = reminderItems.length > 3 ? "など" : "";
  const msg = await getMessage("home", "schedulerReminder", reminderType, {
    month: String(reminderDate.getMonth() + 1),
    day: String(reminderDate.getDate()),
    count: String(reminderItems.length),
    names: `${names}${suffix}`
  });

  const payload = {
    text: msg.text,
    expression: msg.expression,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  };
  localStorage.setItem("homeReminder", JSON.stringify(payload));
  setCharacterSpeech(msg.text, msg.expression);
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const monthLabel = document.getElementById("currentMonthLabel");
  if (!grid || !monthLabel) return;

  monthLabel.textContent = `${currentMonthDate.getFullYear()}年${currentMonthDate.getMonth() + 1}月`;
  grid.innerHTML = "";

  const weekdayLabels = ["月", "火", "水", "木", "金", "土", "日"];
  weekdayLabels.forEach(label => {
    const cell = document.createElement("div");
    cell.className = "calendar-weekday";
    cell.textContent = label;
    grid.appendChild(cell);
  });

  const todayKey = getDateKey(new Date());
  const cells = getCalendarCells(currentMonthDate);

  cells.forEach(cellDate => {
    const dateKey = getDateKey(cellDate);
    const dayCell = document.createElement("button");
    dayCell.type = "button";
    dayCell.className = "calendar-day";

    if (cellDate.getMonth() !== currentMonthDate.getMonth()) {
      dayCell.classList.add("is-muted");
    }
    if (dateKey === todayKey) {
      dayCell.classList.add("is-today");
    }
    if (dateKey === selectedDate) {
      dayCell.classList.add("is-selected");
    }

    const dayNumber = document.createElement("span");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = cellDate.getDate();
    dayCell.appendChild(dayNumber);

    const itemsForDay = getSchedulesForDate(dateKey);
    if (itemsForDay.length > 0) {
      const preview = document.createElement("div");
      preview.className = "calendar-day-preview";

      itemsForDay.slice(0, 3).forEach(item => {
        const safeItem = normalizeSchedule(item);
        const row = document.createElement("span");
        row.className = `calendar-day-preview-item ${getGenreClassName(safeItem.genre)}`;
        row.textContent = `${safeItem.person}: ${safeItem.name}`;
        preview.appendChild(row);
      });

      if (itemsForDay.length > 3) {
        const more = document.createElement("span");
        more.className = "calendar-day-count";
        more.textContent = `他 ${itemsForDay.length - 3}件`;
        preview.appendChild(more);
      }

      const count = document.createElement("span");
      count.className = "calendar-day-count";
      count.textContent = `${itemsForDay.length}件`;
      dayCell.appendChild(count);
      dayCell.appendChild(preview);
    }

    dayCell.addEventListener("click", () => {
      selectedDate = dateKey;
      setScheduleDateInputs(dateKey);
      renderCalendar();
      renderSelectedDateList();
    });

    grid.appendChild(dayCell);
  });

  renderSelectedDateList();
}

function setScheduleDateInputs(dateKey) {
  const startInput = document.getElementById("scheduleStartDate");
  const endInput = document.getElementById("scheduleEndDate");
  if (startInput) startInput.value = dateKey;
  if (endInput) endInput.value = dateKey;
}

function renderSelectedDateList() {
  const selectedList = document.getElementById("selectedDateList");
  const selectedLabel = document.getElementById("selectedDateLabel");
  if (!selectedList || !selectedLabel) return;

  const targetDate = selectedDate || getDateKey(new Date());
  const items = getSchedulesForDate(targetDate);
  const parsedDate = parseDateKey(targetDate);

  selectedLabel.textContent = `${formatDateLabel(parsedDate)} の予定`;
  selectedList.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "calendar-empty";
    empty.textContent = "この日には予定がありません。";
    selectedList.appendChild(empty);
    return;
  }

  items.sort((a, b) => {
    const left = normalizeSchedule(a);
    const right = normalizeSchedule(b);
    if (left.startDate !== right.startDate) return left.startDate.localeCompare(right.startDate);
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
    if (left.time !== right.time) return left.time.localeCompare(right.time);
    return left.name.localeCompare(right.name);
  });

  items.forEach(item => selectedList.appendChild(createScheduleCard(item)));
}

function createScheduleCard(item) {
  const safeItem = normalizeSchedule(item);
  const card = document.createElement("div");
  card.className = `calendar-item ${getGenreClassName(safeItem.genre)}`;

  const body = document.createElement("div");
  body.className = "calendar-item-body";

  const top = document.createElement("div");
  top.className = "calendar-item-top";

  const titleWrap = document.createElement("div");
  titleWrap.className = "calendar-item-title-wrap";

  const marker = document.createElement("span");
  marker.className = "schedule-card-icon";
  marker.textContent = getGenreIcon(safeItem.genre);

  const nameSpan = document.createElement("span");
  nameSpan.className = "shopping-name calendar-item-title";
  nameSpan.textContent = safeItem.name;

  titleWrap.append(marker, nameSpan);

  const metaBadges = document.createElement("div");
  metaBadges.className = "calendar-item-badges";

  const personBadge = document.createElement("span");
  personBadge.className = "schedule-badge";
  personBadge.textContent = safeItem.person;

  const genreBadge = document.createElement("span");
  genreBadge.className = `schedule-badge schedule-badge-genre ${getGenreClassName(safeItem.genre)}`;
  genreBadge.textContent = safeItem.genre;
  metaBadges.append(personBadge, genreBadge);

  const detailRow = document.createElement("div");
  detailRow.className = "calendar-item-details";

  const rangeLabel = document.createElement("span");
  rangeLabel.className = "schedule-time-pill";
  rangeLabel.textContent = getScheduleRangeText(safeItem);

  const timeLabel = document.createElement("span");
  timeLabel.className = "schedule-time-pill";
  timeLabel.textContent = getScheduleTimeText(safeItem);

  const actions = document.createElement("div");
  actions.className = "calendar-item-actions";
  const editBtn = document.createElement("button");
  editBtn.className = "schedule-action-btn schedule-action-edit";
  editBtn.textContent = "✎ 編集";
  const delBtn = document.createElement("button");
  delBtn.className = "schedule-action-btn schedule-action-delete";
  delBtn.textContent = "🗑 削除";
  actions.append(editBtn, delBtn);

  const renderView = () => {
    body.innerHTML = "";
    top.innerHTML = "";
    top.append(titleWrap, metaBadges);
    detailRow.innerHTML = "";
    detailRow.append(rangeLabel, timeLabel, actions);
    body.append(top, detailRow);
  };

  const renderEditForm = () => {
    body.innerHTML = "";

    const form = document.createElement("form");
    form.className = "calendar-edit-form";

    const fieldName = document.createElement("label");
    fieldName.className = "calendar-edit-field";
    fieldName.innerHTML = '<span>予定名</span><input type="text" value="' + safeItem.name.replace(/"/g, '&quot;') + '">';

    const fieldDates = document.createElement("div");
    fieldDates.className = "calendar-edit-row";
    fieldDates.innerHTML = `
      <label class="calendar-edit-field"><span>開始日</span><input type="date" value="${safeItem.startDate}"></label>
      <label class="calendar-edit-field"><span>終了日</span><input type="date" value="${safeItem.endDate}"></label>
    `;

    const fieldTime = document.createElement("div");
    fieldTime.className = "calendar-edit-row";
    fieldTime.innerHTML = `
      <label class="calendar-edit-field"><span>時刻</span><input type="time" value="${safeItem.time || ""}" ${safeItem.allDay ? "disabled" : ""}></label>
      <label class="calendar-edit-field calendar-edit-inline"><span>終日</span><input type="checkbox" ${safeItem.allDay ? "checked" : ""}></label>
    `;

    const fieldMeta = document.createElement("div");
    fieldMeta.className = "calendar-edit-row";
    fieldMeta.innerHTML = `
      <label class="calendar-edit-field"><span>担当</span><select>
        <option value="共通" ${safeItem.person === "共通" ? "selected" : ""}>共通</option>
        <option value="みき" ${safeItem.person === "みき" ? "selected" : ""}>みき</option>
        <option value="みほ" ${safeItem.person === "みほ" ? "selected" : ""}>みほ</option>
      </select></label>
      <label class="calendar-edit-field"><span>ジャンル</span><input type="text" value="${safeItem.genre.replace(/"/g, '&quot;')}"></label>
    `;

    const actions = document.createElement("div");
    actions.className = "calendar-edit-actions";
    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "action-btn";
    saveBtn.textContent = "保存";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "schedule-action-btn schedule-action-delete";
    cancelBtn.textContent = "キャンセル";
    actions.append(saveBtn, cancelBtn);

    const nameInput = fieldName.querySelector("input");
    const startInput = fieldDates.querySelectorAll("input")[0];
    const endInput = fieldDates.querySelectorAll("input")[1];
    const timeInput = fieldTime.querySelector("input[type='time']");
    const allDayInput = fieldTime.querySelector("input[type='checkbox']");
    const personInput = fieldMeta.querySelector("select");
    const genreInput = fieldMeta.querySelector("input[type='text']");

    allDayInput.addEventListener("change", () => {
      timeInput.disabled = allDayInput.checked;
      if (allDayInput.checked) timeInput.value = "";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nextName = nameInput.value.trim();
      const nextStartDate = startInput.value || safeItem.startDate;
      const nextEndDate = endInput.value || nextStartDate;
      const nextAllDay = allDayInput.checked;
      const nextTime = nextAllDay ? "" : (timeInput.value || "");
      const nextPerson = personInput.value || safeItem.person;
      const nextGenre = genreInput.value.trim() || safeItem.genre;

      if (!nextName) return;

      await db.collection("schedule").doc(safeItem.id).update({
        name: nextName,
        startDate: nextStartDate,
        endDate: nextEndDate,
        time: nextTime,
        allDay: nextAllDay,
        person: nextPerson,
        genre: nextGenre,
        checked: safeItem.checked
      });
      await loadScheduleList();
    });

    cancelBtn.addEventListener("click", () => {
      renderView();
    });

    form.append(fieldName, fieldDates, fieldTime, fieldMeta, actions);
    body.append(form);
  };

  editBtn.addEventListener("click", renderEditForm);

  delBtn.addEventListener("click", async () => {
    if (!confirm("この予定を削除しますか？")) return;
    await db.collection("schedule").doc(safeItem.id).delete();
    await loadScheduleList();
  });

  renderView();
  card.append(body);
  return card;
}

async function loadScheduleList() {
  const snapshot = await db.collection("schedule").get();
  allSchedules = snapshot.docs.map(doc => normalizeSchedule({ id: doc.id, ...doc.data() }));

  allSchedules.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked - b.checked;
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    if (a.time !== b.time) return a.time.localeCompare(b.time);
    return a.name.localeCompare(b.name);
  });

  if (!selectedDate) {
    selectedDate = getDateKey(new Date());
  }
  currentMonthDate = parseDateKey(selectedDate) || new Date();

  const msg = await getMessage("scheduler", "load");
  setCharacterSpeech(msg.text, msg.expression);
  await showScheduleReminder(allSchedules);
  renderCalendar();
}

async function addSchedule() {
  const input = document.getElementById("scheduleInput");
  const startDateInput = document.getElementById("scheduleStartDate");
  const endDateInput = document.getElementById("scheduleEndDate");
  const timeInput = document.getElementById("scheduleTime");
  const allDayCheck = document.getElementById("allDayCheck");
  const personInput = document.getElementById("schedulePerson");
  const genreInput = document.getElementById("scheduleGenre");

  const name = input.value.trim();
  const startDate = (startDateInput.value || selectedDate || getDateKey(new Date())).trim();
  const endDate = (endDateInput.value || startDate).trim();
  const allDay = allDayCheck.checked;
  const time = allDay ? "" : (timeInput.value || "");
  const person = personInput.value || "共通";
  const genre = genreInput.value.trim() || "予定";

  if (!name || !startDate) {
    const msg = await getMessage("scheduler", "empty_input");
    setCharacterSpeech(msg.text, msg.expression);
    return;
  }

  await db.collection("schedule").add({
    name,
    startDate,
    endDate,
    time,
    allDay,
    person,
    genre,
    checked: false
  });
  input.value = "";
  startDateInput.value = startDate;
  endDateInput.value = endDate;
  timeInput.value = "";
  allDayCheck.checked = false;
  personInput.value = "共通";
  genreInput.value = "";
  selectedDate = startDate;
  const msg = await getMessage("scheduler", "add");
  setCharacterSpeech(msg.text, msg.expression);
  await loadScheduleList();
}

document.getElementById("addScheduleBtn").addEventListener("click", addSchedule);
document.getElementById("prevMonthBtn").addEventListener("click", () => {
  currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById("nextMonthBtn").addEventListener("click", () => {
  currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
  renderCalendar();
});

const allDayCheck = document.getElementById("allDayCheck");
const scheduleTime = document.getElementById("scheduleTime");
if (allDayCheck && scheduleTime) {
  allDayCheck.addEventListener("change", () => {
    scheduleTime.disabled = allDayCheck.checked;
  });
}

setScheduleDateInputs(getDateKey(new Date()));
loadScheduleList();
