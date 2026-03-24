const state = {
  telegramUserId: ""
};

const elements = {
  telegramUserId: document.querySelector("#telegramUserId"),
  loadDashboard: document.querySelector("#loadDashboard"),
  dashboard: document.querySelector("#dashboard"),
  profileBlock: document.querySelector("#profileBlock"),
  todayBlock: document.querySelector("#todayBlock"),
  progressBlock: document.querySelector("#progressBlock"),
  historyBlock: document.querySelector("#historyBlock"),
  weightBlock: document.querySelector("#weightBlock"),
  measurementBlock: document.querySelector("#measurementBlock"),
  answerBlock: document.querySelector("#answerBlock"),
  mealPlanBlock: document.querySelector("#mealPlanBlock"),
  weightForm: document.querySelector("#weightForm"),
  measurementForm: document.querySelector("#measurementForm"),
  askForm: document.querySelector("#askForm"),
  loadMealPlan: document.querySelector("#loadMealPlan"),
  weightValue: document.querySelector("#weightValue"),
  waistValue: document.querySelector("#waistValue"),
  thighValue: document.querySelector("#thighValue"),
  armValue: document.querySelector("#armValue"),
  questionValue: document.querySelector("#questionValue"),
  statusLine: document.querySelector("#statusLine")
};

function formatDate(dateString) {
  if (!dateString) return "без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(dateString));
}

function formatDateTime(dateString) {
  if (!dateString) return "без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function formatNumber(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(digits);
}

function formatKgLine(log) {
  return `${formatDate(log.created_at)} — ${formatNumber(log.weight)} кг`;
}

function createMetric(label, value) {
  const item = document.createElement("div");
  item.className = "metric";
  item.innerHTML = `<strong>${label}</strong><div>${value}</div>`;
  return item;
}

function createListItem(title, subtitle = "") {
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = subtitle ? `<strong>${title}</strong><div class="status">${subtitle}</div>` : `<strong>${title}</strong>`;
  return item;
}

function fillBlock(block, items) {
  block.innerHTML = "";
  if (!items.length) {
    block.append(createListItem("Пока пусто"));
    return;
  }

  items.forEach((item) => block.append(item));
}

async function request(pathname, options = {}) {
  const response = await fetch(pathname, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Не удалось выполнить запрос");
  }

  return payload;
}

function setStatus(text, tone = "muted") {
  elements.statusLine.textContent = text;
  elements.statusLine.dataset.tone = tone;
}

function renderProfile(profile) {
  fillBlock(elements.profileBlock, [
    createMetric("Профиль", profile.display_name || "Не настроен"),
    createMetric("Цель", profile.goal || "Не указана"),
    createMetric("Калории", `${profile.daily_calories || 0} ккал`),
    createMetric("Белки / жиры / углеводы", `${profile.daily_protein || 0} / ${profile.daily_fat || 0} / ${profile.daily_carbs || 0} г`)
  ]);
}

function renderToday(today) {
  const meals = today?.meals || [];
  const totals = today?.totals || {};
  const items = [
    createMetric("Калории", `${Math.round(Number(totals.calories || 0))} ккал`),
    createMetric("БЖУ", `${formatNumber(totals.protein || 0)} / ${formatNumber(totals.fat || 0)} / ${formatNumber(totals.carbs || 0)} г`)
  ];

  if (meals.length) {
    meals.slice(0, 5).forEach((meal) => {
      items.push(
        createListItem(
          `${meal.meal_type || "Прием пищи"}: ${meal.dish_name}`,
          `${Math.round(Number(meal.calories || 0))} ккал, ${formatDateTime(meal.created_at)}`
        )
      );
    });
  } else {
    items.push(createListItem("Сегодня пока нет приемов пищи"));
  }

  fillBlock(elements.todayBlock, items);
}

function renderProgress(weightProgress, measurementProgress) {
  const items = [];

  if (weightProgress?.latest && weightProgress?.oldest) {
    items.push(
      createMetric(
        "Вес",
        `${formatNumber(weightProgress.oldest.weight)} кг -> ${formatNumber(weightProgress.latest.weight)} кг`
      )
    );
    items.push(createMetric("Изменение веса", `${formatNumber(weightProgress.change)} кг`));
  } else {
    items.push(createListItem("Вес пока не добавлен"));
  }

  if (measurementProgress?.latest && measurementProgress?.oldest) {
    items.push(
      createMetric(
        "Талия",
        measurementProgress.waistChange === null ? "нет данных" : `${formatNumber(measurementProgress.waistChange)} см`
      )
    );
    items.push(
      createMetric(
        "Нога",
        measurementProgress.thighChange === null ? "нет данных" : `${formatNumber(measurementProgress.thighChange)} см`
      )
    );
    items.push(
      createMetric(
        "Рука",
        measurementProgress.armChange === null ? "нет данных" : `${formatNumber(measurementProgress.armChange)} см`
      )
    );
  } else {
    items.push(createListItem("Замеры пока не добавлены"));
  }

  fillBlock(elements.progressBlock, items);
}

function renderHistory(meals) {
  fillBlock(
    elements.historyBlock,
    meals.length
      ? meals.map((meal) =>
          createListItem(
            `${formatDate(meal.created_at)} — ${meal.dish_name}`,
            `${meal.meal_type || "Прием пищи"} · ${Math.round(Number(meal.calories || 0))} ккал · БЖУ ${formatNumber(meal.protein)} / ${formatNumber(meal.fat)} / ${formatNumber(meal.carbs)}`
          )
        )
      : [createListItem("История питания пока пустая")]
  );
}

function renderWeightLogs(logs) {
  fillBlock(
    elements.weightBlock,
    logs.length ? logs.map((log) => createListItem(formatKgLine(log))) : [createListItem("Журнал веса пока пуст")]
  );
}

function renderMeasurementLogs(logs) {
  fillBlock(
    elements.measurementBlock,
    logs.length
      ? logs.map((log) =>
          createListItem(
            `${formatDate(log.created_at)} — талия ${log.waist ?? "-"} · нога ${log.thigh ?? "-"} · рука ${log.arm ?? "-"}`,
            log.note || ""
          )
        )
      : [createListItem("Журнал замеров пока пуст")]
  );
}

async function loadDashboard() {
  const telegramUserId = elements.telegramUserId.value.trim();
  if (!telegramUserId) {
    setStatus("Введи Telegram ID, чтобы открыть кабинет.", "error");
    return;
  }

  state.telegramUserId = telegramUserId;
  setStatus("Загружаю кабинет...", "muted");

  try {
    const dashboard = await request(`/api/dashboard?telegram_user_id=${encodeURIComponent(telegramUserId)}`);
    elements.dashboard.classList.remove("hidden");
    renderProfile(dashboard.profile);
    renderToday(dashboard.today);
    renderProgress(dashboard.weightProgress, dashboard.measurementProgress);
    renderHistory(dashboard.recentMeals?.meals || []);
    renderWeightLogs(dashboard.weightLogs?.logs || []);
    renderMeasurementLogs(dashboard.measurementLogs?.logs || []);
    setStatus("Кабинет обновлен.", "success");
  } catch (error) {
    elements.dashboard.classList.add("hidden");
    setStatus(error.message, "error");
  }
}

async function submitWeight(event) {
  event.preventDefault();
  if (!state.telegramUserId) {
    setStatus("Сначала открой кабинет по Telegram ID.", "error");
    return;
  }

  const weight = elements.weightValue.value.trim();
  if (!weight) {
    setStatus("Введи вес, чтобы сохранить запись.", "error");
    return;
  }

  try {
    await request("/api/weight", {
      method: "POST",
      body: JSON.stringify({
        telegram_user_id: state.telegramUserId,
        weight
      })
    });
    elements.weightForm.reset();
    await loadDashboard();
    setStatus("Вес сохранен.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitMeasurements(event) {
  event.preventDefault();
  if (!state.telegramUserId) {
    setStatus("Сначала открой кабинет по Telegram ID.", "error");
    return;
  }

  try {
    await request("/api/measurements", {
      method: "POST",
      body: JSON.stringify({
        telegram_user_id: state.telegramUserId,
        waist: elements.waistValue.value || null,
        thigh: elements.thighValue.value || null,
        arm: elements.armValue.value || null
      })
    });
    elements.measurementForm.reset();
    await loadDashboard();
    setStatus("Замеры сохранены.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitQuestion(event) {
  event.preventDefault();
  if (!state.telegramUserId) {
    setStatus("Сначала открой кабинет по Telegram ID.", "error");
    return;
  }

  const question = elements.questionValue.value.trim();
  if (!question) {
    setStatus("Напиши вопрос, чтобы получить ответ.", "error");
    return;
  }

  try {
    const result = await request("/api/ask", {
      method: "POST",
      body: JSON.stringify({
        telegram_user_id: state.telegramUserId,
        question
      })
    });
    fillBlock(elements.answerBlock, [createListItem("Ответ нутрициолога", result.answer)]);
    setStatus("Ответ готов.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadMealPlan() {
  if (!state.telegramUserId) {
    setStatus("Сначала открой кабинет по Telegram ID.", "error");
    return;
  }

  try {
    const result = await request("/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({
        telegram_user_id: state.telegramUserId,
        period: "день"
      })
    });
    fillBlock(elements.mealPlanBlock, [createListItem("Меню на день", result.plan)]);
    setStatus("Меню на день готово.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

elements.loadDashboard.addEventListener("click", loadDashboard);
elements.weightForm.addEventListener("submit", submitWeight);
elements.measurementForm.addEventListener("submit", submitMeasurements);
elements.askForm.addEventListener("submit", submitQuestion);
elements.loadMealPlan.addEventListener("click", loadMealPlan);
elements.telegramUserId.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadDashboard();
  }
});
