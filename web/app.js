const state = {
  profile: null,
  activeTab: "overview"
};

const elements = {
  telegramUserId: document.querySelector("#telegramUserId"),
  loadDashboard: document.querySelector("#loadDashboard"),
  logoutButton: document.querySelector("#logoutButton"),
  seedDemoButton: document.querySelector("#seedDemoButton"),
  dashboard: document.querySelector("#dashboard"),
  summaryGrid: document.querySelector("#summaryGrid"),
  profileHeadline: document.querySelector("#profileHeadline"),
  profileSubline: document.querySelector("#profileSubline"),
  profileBlock: document.querySelector("#profileBlock"),
  todayBlock: document.querySelector("#todayBlock"),
  macroBars: document.querySelector("#macroBars"),
  progressBlock: document.querySelector("#progressBlock"),
  progressTimeline: document.querySelector("#progressTimeline"),
  historyBlock: document.querySelector("#historyBlock"),
  weightBlock: document.querySelector("#weightBlock"),
  measurementBlock: document.querySelector("#measurementBlock"),
  answerBlock: document.querySelector("#answerBlock"),
  mealPlanBlock: document.querySelector("#mealPlanBlock"),
  weightChart: document.querySelector("#weightChart"),
  measurementChart: document.querySelector("#measurementChart"),
  miniWeightValue: document.querySelector("#miniWeightValue"),
  miniWeightDelta: document.querySelector("#miniWeightDelta"),
  miniWeightChart: document.querySelector("#miniWeightChart"),
  miniCaloriesValue: document.querySelector("#miniCaloriesValue"),
  miniCaloriesCaption: document.querySelector("#miniCaloriesCaption"),
  miniCaloriesChart: document.querySelector("#miniCaloriesChart"),
  miniWaistValue: document.querySelector("#miniWaistValue"),
  miniWaistDelta: document.querySelector("#miniWaistDelta"),
  miniMeasurementChart: document.querySelector("#miniMeasurementChart"),
  weightForm: document.querySelector("#weightForm"),
  measurementForm: document.querySelector("#measurementForm"),
  askForm: document.querySelector("#askForm"),
  loadMealPlan: document.querySelector("#loadMealPlan"),
  weightValue: document.querySelector("#weightValue"),
  waistValue: document.querySelector("#waistValue"),
  thighValue: document.querySelector("#thighValue"),
  armValue: document.querySelector("#armValue"),
  questionValue: document.querySelector("#questionValue"),
  statusLine: document.querySelector("#statusLine"),
  telegramLoginWidget: document.querySelector("#telegramLoginWidget"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabPanels: [...document.querySelectorAll(".tab-panel")]
};

function formatDate(dateString) {
  if (!dateString) return "без даты";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(dateString));
}

function formatDateLong(dateString) {
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
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function formatNumber(value, digits = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(digits);
}

function formatSigned(value, suffix = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${numeric.toFixed(1)}${suffix}`;
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

function createSummaryCard(label, value, caption = "") {
  const card = document.createElement("article");
  card.className = "summary-card";
  card.innerHTML = `
    <span class="summary-label">${label}</span>
    <div class="summary-value">${value}</div>
    <div class="summary-caption">${caption}</div>
  `;
  return card;
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
    credentials: "include",
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

function setAuthenticatedUI(isAuthenticated) {
  elements.logoutButton.classList.toggle("hidden", !isAuthenticated);
  elements.seedDemoButton.classList.toggle("hidden", !isAuthenticated);
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  elements.tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
}

function buildPath(points, width, height, min, max, accessor) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const y = height / 2;
    return `M 0 ${y} L ${width} ${y}`;
  }

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const raw = accessor(point);
      const normalized = max === min ? 0.5 : (raw - min) / (max - min);
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderEmptyChart(container, message) {
  container.innerHTML = `<div class="chart-empty">${message}</div>`;
}

function renderSparkline(container, values, color) {
  const points = values.filter((value) => Number.isFinite(value));
  if (!points.length) {
    container.innerHTML = `<div class="sparkline-empty"></div>`;
    return;
  }

  const width = 220;
  const height = 64;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const path = buildPath(points, width, height, min, max, (point) => point);
  container.innerHTML = `
    <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function renderLineChart(container, logs, options) {
  if (!logs?.length) {
    renderEmptyChart(container, options.emptyMessage);
    return;
  }

  const points = [...logs].reverse();
  const values = points.map(options.accessor).filter((value) => Number.isFinite(value));
  if (!values.length) {
    renderEmptyChart(container, options.emptyMessage);
    return;
  }

  const width = 720;
  const height = 220;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = buildPath(points, width, height, min, max, options.accessor);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = (height * ratio).toFixed(2);
      return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(21,33,43,0.08)" stroke-width="1" />`;
    })
    .join("");

  const circles = points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const raw = options.accessor(point);
      const normalized = max === min ? 0.5 : (raw - min) / (max - min);
      const y = height - normalized * height;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${options.color}" />`;
    })
    .join("");

  container.innerHTML = `
    <div class="chart-meta">
      <span>Диапазон: ${formatNumber(min, options.precision || 1)} - ${formatNumber(max, options.precision || 1)} ${options.suffix}</span>
      <span>Последнее: ${formatNumber(options.accessor(points[points.length - 1]), options.precision || 1)} ${options.suffix}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height + 34}" role="img" aria-label="${options.title}">
      ${grid}
      <path d="${path}" fill="none" stroke="${options.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${circles}
      ${points
        .map((point, index) => {
          const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
          return `<text x="${x.toFixed(2)}" y="${height + 24}" text-anchor="middle" font-size="12" fill="#64707b">${formatDate(point.created_at)}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderMultiLineChart(container, logs) {
  if (!logs?.length) {
    renderEmptyChart(container, "Добавь замеры или подгрузи демо-данные, чтобы увидеть график.");
    return;
  }

  const points = [...logs]
    .reverse()
    .map((log) => ({
      ...log,
      waist: Number(log.waist),
      thigh: Number(log.thigh),
      arm: Number(log.arm)
    }))
    .filter((log) => [log.waist, log.thigh, log.arm].some((value) => Number.isFinite(value)));

  if (!points.length) {
    renderEmptyChart(container, "Замеров пока недостаточно для графика.");
    return;
  }

  const width = 720;
  const height = 220;
  const allValues = points.flatMap((point) => [point.waist, point.thigh, point.arm]).filter((value) => Number.isFinite(value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const series = [
    { key: "waist", color: "#0f8a6b" },
    { key: "thigh", color: "#d8a44a" },
    { key: "arm", color: "#1d3244" }
  ];

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const y = (height * ratio).toFixed(2);
      return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(21,33,43,0.08)" stroke-width="1" />`;
    })
    .join("");

  const paths = series
    .map((seriesItem) => {
      const hasAny = points.some((point) => Number.isFinite(point[seriesItem.key]));
      if (!hasAny) return "";
      const path = buildPath(points, width, height, min, max, (point) => {
        const value = Number(point[seriesItem.key]);
        return Number.isFinite(value) ? value : min;
      });
      return `<path d="${path}" fill="none" stroke="${seriesItem.color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>`;
    })
    .join("");

  container.innerHTML = `
    <div class="chart-meta">
      <span>Диапазон: ${formatNumber(min)} - ${formatNumber(max)} см</span>
      <span>${points.length} точек</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height + 34}" role="img" aria-label="График замеров">
      ${grid}
      ${paths}
      ${points
        .map((point, index) => {
          const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
          return `<text x="${x.toFixed(2)}" y="${height + 24}" text-anchor="middle" font-size="12" fill="#64707b">${formatDate(point.created_at)}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderMacroBars(profile, today) {
  const totals = today?.totals || {};
  const items = [
    { label: "Калории", value: Number(totals.calories || 0), goal: Number(profile.daily_calories || 0), unit: "ккал", className: "calories" },
    { label: "Белки", value: Number(totals.protein || 0), goal: Number(profile.daily_protein || 0), unit: "г", className: "protein" },
    { label: "Жиры", value: Number(totals.fat || 0), goal: Number(profile.daily_fat || 0), unit: "г", className: "fat" },
    { label: "Углеводы", value: Number(totals.carbs || 0), goal: Number(profile.daily_carbs || 0), unit: "г", className: "carbs" }
  ];

  elements.macroBars.innerHTML = items
    .map((item) => {
      const ratio = item.goal > 0 ? Math.min(100, (item.value / item.goal) * 100) : 0;
      return `
        <div class="macro-row">
          <div class="macro-top">
            <span>${item.label}</span>
            <strong>${formatNumber(item.value)} / ${item.goal || 0} ${item.unit}</strong>
          </div>
          <div class="macro-track">
            <div class="macro-fill ${item.className}" style="width:${ratio}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSummary(dashboard) {
  const profile = dashboard.profile;
  const todayMeals = dashboard.today?.meals || [];
  const todayTotals = dashboard.today?.totals || {};
  const latestWeight = dashboard.weightLogs?.logs?.[0];
  const latestMeasurement = dashboard.measurementLogs?.logs?.[0];

  elements.profileHeadline.textContent = profile.display_name || "Твой кабинет";
  elements.profileSubline.textContent = profile.telegram_username
    ? `@${profile.telegram_username} · цель: ${profile.goal || "не указана"}`
    : `цель: ${profile.goal || "не указана"}`;

  elements.summaryGrid.innerHTML = "";
  [
    createSummaryCard("Сегодня", `${Math.round(Number(todayTotals.calories || 0))} ккал`, `${todayMeals.length} приемов пищи`),
    createSummaryCard("Текущий вес", latestWeight ? `${formatNumber(latestWeight.weight)} кг` : "—", latestWeight ? formatDateLong(latestWeight.created_at) : "нет записей"),
    createSummaryCard(
      "Динамика веса",
      dashboard.weightProgress?.change !== undefined ? `${formatSigned(dashboard.weightProgress.change, " кг")}` : "—",
      dashboard.weightProgress?.change > 0 ? "рост" : dashboard.weightProgress?.change < 0 ? "снижение" : "без изменений"
    ),
    createSummaryCard(
      "Последние замеры",
      latestMeasurement ? `${latestMeasurement.waist ?? "-"} / ${latestMeasurement.thigh ?? "-"} / ${latestMeasurement.arm ?? "-"}` : "—",
      latestMeasurement ? "талия / нога / рука" : "нет записей"
    )
  ].forEach((card) => elements.summaryGrid.append(card));
}

function renderHeroCards(dashboard) {
  const weightLogs = dashboard.weightLogs?.logs || [];
  const measurementLogs = dashboard.measurementLogs?.logs || [];
  const todayTotals = dashboard.today?.totals || {};
  const recentMeals = dashboard.recentMeals?.meals || [];

  const latestWeight = weightLogs[0];
  const latestMeasurement = measurementLogs[0];
  const weightChange = dashboard.weightProgress?.change;
  const waistChange = dashboard.measurementProgress?.waistChange;

  elements.miniWeightValue.textContent = latestWeight ? `${formatNumber(latestWeight.weight)} кг` : "—";
  elements.miniWeightDelta.textContent = Number.isFinite(weightChange) ? formatSigned(weightChange, " кг") : "нет данных";
  elements.miniCaloriesValue.textContent = `${Math.round(Number(todayTotals.calories || 0))} ккал`;
  elements.miniCaloriesCaption.textContent = recentMeals.length ? `${recentMeals.length} приемов пищи` : "сегодня";
  elements.miniWaistValue.textContent = latestMeasurement?.waist ? `${formatNumber(latestMeasurement.waist)} см` : "—";
  elements.miniWaistDelta.textContent = Number.isFinite(waistChange) ? formatSigned(waistChange, " см") : "нет данных";

  renderSparkline(elements.miniWeightChart, [...weightLogs].reverse().map((log) => Number(log.weight)), "#0f8a6b");
  renderSparkline(elements.miniCaloriesChart, [...recentMeals].reverse().slice(-8).map((meal) => Number(meal.calories)), "#d8a44a");
  renderSparkline(elements.miniMeasurementChart, [...measurementLogs].reverse().map((log) => Number(log.waist)), "#1d3244");
}

function renderProfile(profile) {
  fillBlock(elements.profileBlock, [
    createMetric("Профиль", profile.display_name || "Не настроен"),
    createMetric("Telegram", profile.telegram_username ? `@${profile.telegram_username}` : profile.telegram_user_id),
    createMetric("Цель", profile.goal || "Не указана"),
    createMetric("Калории", `${profile.daily_calories || 0} ккал`),
    createMetric("Белки", `${profile.daily_protein || 0} г`),
    createMetric("Жиры / углеводы", `${profile.daily_fat || 0} / ${profile.daily_carbs || 0} г`)
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
    meals.slice(0, 6).forEach((meal) => {
      items.push(
        createListItem(
          `${meal.meal_type || "Прием пищи"} · ${meal.dish_name}`,
          `${Math.round(Number(meal.calories || 0))} ккал · ${formatDateTime(meal.created_at)}`
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
    items.push(createMetric("Вес", `${formatNumber(weightProgress.oldest.weight)} → ${formatNumber(weightProgress.latest.weight)} кг`));
    items.push(createMetric("Изменение веса", `${formatSigned(weightProgress.change, " кг")}`));
  } else {
    items.push(createMetric("Вес", "Недостаточно данных"));
  }

  if (measurementProgress?.latest && measurementProgress?.oldest) {
    items.push(createMetric("Талия", measurementProgress.waistChange === null ? "нет данных" : `${formatSigned(measurementProgress.waistChange, " см")}`));
    items.push(createMetric("Нога", measurementProgress.thighChange === null ? "нет данных" : `${formatSigned(measurementProgress.thighChange, " см")}`));
    items.push(createMetric("Рука", measurementProgress.armChange === null ? "нет данных" : `${formatSigned(measurementProgress.armChange, " см")}`));
  } else {
    items.push(createMetric("Замеры", "Пока нет динамики"));
  }

  fillBlock(elements.progressBlock, items);
}

function renderProgressTimeline(weightLogs, measurementLogs) {
  const items = [];

  [...weightLogs].slice(0, 8).forEach((log) => {
    items.push({
      date: log.created_at,
      title: `Вес обновлен: ${formatNumber(log.weight)} кг`,
      subtitle: formatDateLong(log.created_at)
    });
  });

  [...measurementLogs].slice(0, 8).forEach((log) => {
    items.push({
      date: log.created_at,
      title: `Замеры: талия ${log.waist ?? "-"} · нога ${log.thigh ?? "-"} · рука ${log.arm ?? "-"}`,
      subtitle: formatDateLong(log.created_at)
    });
  });

  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  elements.progressTimeline.innerHTML = items.length
    ? items
        .slice(0, 10)
        .map(
          (item) => `
            <article class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-body">
                <strong>${item.title}</strong>
                <div class="status">${item.subtitle}</div>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="chart-empty">История прогресса появится после первых записей.</div>`;
}

function renderHistory(meals) {
  fillBlock(
    elements.historyBlock,
    meals.length
      ? meals.map((meal) =>
          createListItem(
            `${formatDateLong(meal.created_at)} — ${meal.dish_name}`,
            `${meal.meal_type || "Прием пищи"} · ${Math.round(Number(meal.calories || 0))} ккал · БЖУ ${formatNumber(meal.protein)} / ${formatNumber(meal.fat)} / ${formatNumber(meal.carbs)}`
          )
        )
      : [createListItem("История питания пока пустая")]
  );
}

function renderWeightLogs(logs) {
  fillBlock(
    elements.weightBlock,
    logs.length
      ? logs.slice(0, 12).map((log) => createListItem(`${formatDateLong(log.created_at)} — ${formatNumber(log.weight)} кг`))
      : [createListItem("Журнал веса пока пуст")]
  );
}

function renderMeasurementLogs(logs) {
  fillBlock(
    elements.measurementBlock,
    logs.length
      ? logs.slice(0, 12).map((log) =>
          createListItem(
            `${formatDateLong(log.created_at)} — талия ${log.waist ?? "-"} · нога ${log.thigh ?? "-"} · рука ${log.arm ?? "-"}`,
            log.note || ""
          )
        )
      : [createListItem("Журнал замеров пока пуст")]
  );
}

function renderDashboard(dashboard) {
  state.profile = dashboard.profile;
  const weightLogs = dashboard.weightLogs?.logs || [];
  const measurementLogs = dashboard.measurementLogs?.logs || [];
  const recentMeals = dashboard.recentMeals?.meals || [];

  elements.dashboard.classList.remove("hidden");
  setAuthenticatedUI(true);
  renderHeroCards(dashboard);
  renderSummary(dashboard);
  renderProfile(dashboard.profile);
  renderToday(dashboard.today);
  renderMacroBars(dashboard.profile, dashboard.today);
  renderProgress(dashboard.weightProgress, dashboard.measurementProgress);
  renderProgressTimeline(weightLogs, measurementLogs);
  renderHistory(recentMeals);
  renderWeightLogs(weightLogs);
  renderMeasurementLogs(measurementLogs);
  renderLineChart(elements.weightChart, weightLogs, {
    title: "График веса",
    accessor: (point) => Number(point.weight),
    color: "#0f8a6b",
    suffix: "кг",
    precision: 1,
    emptyMessage: "Добавь несколько записей веса или подгрузи демо-данные, чтобы увидеть график."
  });
  renderMultiLineChart(elements.measurementChart, measurementLogs);
}

async function loadDashboardBySession() {
  setStatus("Загружаю кабинет...", "muted");
  const dashboard = await request("/api/dashboard");
  renderDashboard(dashboard);
  setStatus("Кабинет открыт.", "success");
}

async function loadDashboardByFallback() {
  const identifier = elements.telegramUserId.value.trim();
  if (!identifier) {
    setStatus("Введи Telegram ID или @username, чтобы открыть кабинет.", "error");
    return;
  }

  setStatus("Загружаю кабинет...", "muted");
  const dashboard = await request(`/api/dashboard?identifier=${encodeURIComponent(identifier)}`);
  renderDashboard(dashboard);
  setStatus("Кабинет открыт.", "success");
}

async function submitWeight(event) {
  event.preventDefault();
  const weight = elements.weightValue.value.trim();
  if (!weight) {
    setStatus("Введи вес, чтобы сохранить запись.", "error");
    return;
  }

  try {
    await request("/api/weight", {
      method: "POST",
      body: JSON.stringify({ weight })
    });
    elements.weightForm.reset();
    await loadDashboardBySession();
    setStatus("Вес сохранен.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitMeasurements(event) {
  event.preventDefault();

  try {
    await request("/api/measurements", {
      method: "POST",
      body: JSON.stringify({
        waist: elements.waistValue.value || null,
        thigh: elements.thighValue.value || null,
        arm: elements.armValue.value || null
      })
    });
    elements.measurementForm.reset();
    await loadDashboardBySession();
    setStatus("Замеры сохранены.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitQuestion(event) {
  event.preventDefault();
  const question = elements.questionValue.value.trim();
  if (!question) {
    setStatus("Напиши вопрос, чтобы получить ответ.", "error");
    return;
  }

  try {
    const result = await request("/api/ask", {
      method: "POST",
      body: JSON.stringify({ question })
    });
    fillBlock(elements.answerBlock, [createListItem("Ответ нутрициолога", result.answer)]);
    setStatus("Ответ готов.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadMealPlan() {
  try {
    const result = await request("/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ period: "день" })
    });
    fillBlock(elements.mealPlanBlock, [createListItem("Меню на день", result.plan)]);
    setStatus("Меню на день готово.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function seedDemoData() {
  try {
    setStatus("Добавляю демо-историю для графиков...", "muted");
    const result = await request("/api/demo/seed", {
      method: "POST",
      body: JSON.stringify({})
    });
    await loadDashboardBySession();
    setStatus(
      `Готово: вес ${result.seededWeights}, замеры ${result.seededMeasurements}, питание ${result.seededMeals}.`,
      "success"
    );
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function logout() {
  await request("/api/logout", {
    method: "POST",
    body: JSON.stringify({})
  });
  state.profile = null;
  elements.dashboard.classList.add("hidden");
  setAuthenticatedUI(false);
  setStatus("Ты вышел из кабинета.", "success");
}

async function bootstrapTelegramLogin() {
  try {
    const config = await request("/api/web-config");
    if (!config.botUsername) {
      throw new Error("Не удалось определить username бота для Telegram Login.");
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", config.botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-auth-url", config.authUrl || "/auth/telegram/callback");

    elements.telegramLoginWidget.innerHTML = "";
    elements.telegramLoginWidget.append(script);
    setStatus("Вход через Telegram готов.", "muted");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function consumeAuthResultFlags() {
  const url = new URL(window.location.href);
  const authSuccess = url.searchParams.get("auth_success");
  const authError = url.searchParams.get("auth_error");
  if (!authSuccess && !authError) {
    return { authSuccess: false, authError: null };
  }

  url.searchParams.delete("auth_success");
  url.searchParams.delete("auth_error");
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  return {
    authSuccess: authSuccess === "1",
    authError
  };
}

async function restoreSession() {
  try {
    await request("/api/me");
    await loadDashboardBySession();
  } catch {
    setAuthenticatedUI(false);
  }
}

elements.loadDashboard.addEventListener("click", () => {
  loadDashboardByFallback().catch((error) => setStatus(error.message, "error"));
});
elements.logoutButton.addEventListener("click", () => {
  logout().catch((error) => setStatus(error.message, "error"));
});
elements.seedDemoButton.addEventListener("click", () => {
  seedDemoData().catch((error) => setStatus(error.message, "error"));
});
elements.weightForm.addEventListener("submit", submitWeight);
elements.measurementForm.addEventListener("submit", submitMeasurements);
elements.askForm.addEventListener("submit", submitQuestion);
elements.loadMealPlan.addEventListener("click", loadMealPlan);
elements.telegramUserId.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadDashboardByFallback().catch((error) => setStatus(error.message, "error"));
  }
});
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

bootstrapTelegramLogin();
const authFlags = consumeAuthResultFlags();
restoreSession().then(() => {
  if (authFlags.authError) {
    setStatus("Не удалось подтвердить вход через Telegram.", "error");
  } else if (authFlags.authSuccess) {
    setStatus("Вход через Telegram выполнен.", "success");
  }
});
