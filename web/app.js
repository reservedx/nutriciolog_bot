const state = {
  profile: null,
  dashboard: null,
  adminDashboard: null,
  activeTab: "overview",
  chartRange: 30,
  isAdmin: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const el = {
  telegramUserId: $("#telegramUserId"),
  loadDashboard: $("#loadDashboard"),
  logoutButton: $("#logoutButton"),
  seedDemoButton: $("#seedDemoButton"),
  dashboard: $("#dashboard"),
  summaryGrid: $("#summaryGrid"),
  profileHeadline: $("#profileHeadline"),
  profileSubline: $("#profileSubline"),
  profileBlock: $("#profileBlock"),
  todayBlock: $("#todayBlock"),
  macroBars: $("#macroBars"),
  progressBlock: $("#progressBlock"),
  progressTimeline: $("#progressTimeline"),
  progressSpotlight: $("#progressSpotlight"),
  periodCompare: $("#periodCompare"),
  historyBlock: $("#historyBlock"),
  weightBlock: $("#weightBlock"),
  measurementBlock: $("#measurementBlock"),
  answerBlock: $("#answerBlock"),
  mealPlanBlock: $("#mealPlanBlock"),
  weightChart: $("#weightChart"),
  measurementChart: $("#measurementChart"),
  weightChartRangeLabel: $("#weightChartRangeLabel"),
  progressRangeLabel: $("#progressRangeLabel"),
  miniWeightValue: $("#miniWeightValue"),
  miniWeightDelta: $("#miniWeightDelta"),
  miniWeightChart: $("#miniWeightChart"),
  miniCaloriesValue: $("#miniCaloriesValue"),
  miniCaloriesCaption: $("#miniCaloriesCaption"),
  miniCaloriesChart: $("#miniCaloriesChart"),
  miniWaistValue: $("#miniWaistValue"),
  miniWaistDelta: $("#miniWaistDelta"),
  miniMeasurementChart: $("#miniMeasurementChart"),
  weightForm: $("#weightForm"),
  measurementForm: $("#measurementForm"),
  mealForm: $("#mealForm"),
  askForm: $("#askForm"),
  loadMealPlan: $("#loadMealPlan"),
  weightValue: $("#weightValue"),
  waistValue: $("#waistValue"),
  chestValue: $("#chestValue"),
  hipsValue: $("#hipsValue"),
  armValue: $("#armValue"),
  mealDescription: $("#mealDescription"),
  mealType: $("#mealType"),
  questionValue: $("#questionValue"),
  statusLine: $("#statusLine"),
  telegramLoginWidget: $("#telegramLoginWidget"),
  adminTabButton: $("#adminTabButton"),
  adminSummaryGrid: $("#adminSummaryGrid"),
  adminActivityChart: $("#adminActivityChart"),
  adminUsersBlock: $("#adminUsersBlock"),
  adminPaymentsBlock: $("#adminPaymentsBlock"),
  adminActiveUsersBlock: $("#adminActiveUsersBlock"),
  tabButtons: $$(".tab-button"),
  tabPanels: $$(".tab-panel"),
  rangeButtons: $$(".range-button")
};

const fmtDate = (value) =>
  value ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(value)) : "без даты";

const fmtDateLong = (value) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
    : "без даты";

const fmtDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "без даты";

const fmtNum = (value, digits = 1) => (Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "0");
const fmtSigned = (value, suffix = "") => (Number.isFinite(Number(value)) ? `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)}${suffix}` : "—");
const rangeLabel = (days) => (days === 7 ? "За неделю" : "За месяц");

function iconSvg(kind) {
  const icons = {
    profile:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M4 20a8 8 0 0 1 16 0"></path></svg>',
    today:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v18"></path><path d="M3 12h18"></path></svg>',
    weight:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v5"></path><path d="M6.2 7.2 12 10"></path><path d="M5 14a7 7 0 1 0 14 0 7 7 0 0 0-14 0Z"></path></svg>',
    trend:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 16 5-5 4 4 7-8"></path><path d="M20 7v5h-5"></path></svg>',
    measure:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16"></path><path d="M7 7v10"></path><path d="M12 7v10"></path><path d="M17 7v10"></path><path d="M4 17h16"></path></svg>',
    calories:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c2 3 5 5.5 5 9a5 5 0 1 1-10 0c0-2.8 1.7-4.9 5-9Z"></path></svg>',
    protein:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7c0-2 1.5-3 3-3h6c1.5 0 3 1 3 3s-1 3-3 3H9c-2 0-3 1-3 3s1.5 3 3 3h6c1.5 0 3 1 3 3"></path></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 19a4 4 0 0 0-8 0"></path><circle cx="12" cy="11" r="3"></circle><path d="M5 19a4 4 0 0 1 2-3.5"></path><path d="M19 19a4 4 0 0 0-2-3.5"></path></svg>',
    revenue:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v20"></path><path d="M17 6.5c0-1.9-2.2-3.5-5-3.5S7 4.6 7 6.5 9.2 10 12 10s5 1.6 5 3.5S14.8 17 12 17s-5-1.6-5-3.5"></path></svg>',
    admin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 4 7v5c0 5 3.4 7.8 8 9 4.6-1.2 8-4 8-9V7l-8-4Z"></path><path d="m9.5 12 1.7 1.7 3.8-4.2"></path></svg>'
  };
  return icons[kind] || icons.trend;
}

function iconFor(label) {
  const value = String(label).toLowerCase();
  if (value.includes("проф")) return "profile";
  if (value.includes("сегодня") || value.includes("кбжу")) return "today";
  if (value.includes("вес")) return "weight";
  if (value.includes("замер") || value.includes("талия") || value.includes("груд") || value.includes("бедр") || value.includes("рука")) return "measure";
  if (value.includes("калор")) return "calories";
  if (value.includes("бел")) return "protein";
  if (value.includes("польз")) return "users";
  if (value.includes("оплат") || value.includes("выруч")) return "revenue";
  if (value.includes("бот") || value.includes("админ")) return "admin";
  return "trend";
}

function metric(label, value) {
  const item = document.createElement("div");
  item.className = "metric";
  item.innerHTML = `<span class="metric-icon">${iconSvg(iconFor(label))}</span><strong>${label}</strong><div>${value}</div>`;
  return item;
}

function listItem(title, subtitle = "") {
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = subtitle ? `<strong>${title}</strong><div class="status">${subtitle}</div>` : `<strong>${title}</strong>`;
  return item;
}

function summaryCard(label, value, caption = "") {
  const item = document.createElement("article");
  item.className = "summary-card";
  item.innerHTML = `<span class="summary-icon">${iconSvg(iconFor(label))}</span><span class="summary-label">${label}</span><div class="summary-value">${value}</div><div class="summary-caption">${caption}</div>`;
  return item;
}

function fill(node, items) {
  node.innerHTML = "";
  (items.length ? items : [listItem("Пока пусто")]).forEach((item) => node.append(item));
}

async function request(pathname, options = {}) {
  const response = await fetch(pathname, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Не удалось выполнить запрос");
  }
  return payload;
}

function setStatus(text, tone = "muted") {
  el.statusLine.textContent = text;
  el.statusLine.dataset.tone = tone;
}

function setAuthUi(isAuthorized) {
  el.logoutButton.classList.toggle("hidden", !isAuthorized);
  el.seedDemoButton.classList.toggle("hidden", !isAuthorized);
}

function setAdminUi(isAdmin) {
  state.isAdmin = Boolean(isAdmin);
  el.adminTabButton.classList.toggle("hidden", !state.isAdmin);
  if (!state.isAdmin && state.activeTab === "admin") {
    setActiveTab("overview");
  }
}

function setActiveTab(tabName) {
  if (tabName === "admin" && !state.isAdmin) {
    tabName = "overview";
  }

  state.activeTab = tabName;
  el.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  el.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tabName));
}

function setChartRange(days) {
  state.chartRange = days;
  el.rangeButtons.forEach((button) => button.classList.toggle("active", Number(button.dataset.range) === days));
  renderDashboardSections();
}

function filterLogs(logs = [], days = 30) {
  if (!logs.length) return [];
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const filtered = logs.filter((log) => new Date(log.created_at) >= cutoff);
  return filtered.length ? filtered : logs.slice(0, Math.min(logs.length, days));
}

function coords(points, width, height, min, max, accessor) {
  return points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const raw = accessor(point);
    const normalized = max === min ? 0.5 : (raw - min) / (max - min);
    return { x, y: height - normalized * height, point };
  });
}

function linePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function areaPath(points, height) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x.toFixed(2)} ${height} L ${first.x.toFixed(2)} ${height} Z`;
}

function emptyChart(node, message) {
  node.innerHTML = `<div class="chart-empty">${message}</div>`;
}

function renderGhostSpark(node, color) {
  const values = [42, 44, 43, 47, 46, 49, 51];
  const width = 220;
  const height = 76;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const chartPoints = coords(values, width, height, min, max, (point) => point);
  const line = linePath(chartPoints);
  const area = areaPath(chartPoints, height);
  const gradientId = `ghost-${Math.random().toString(36).slice(2, 8)}`;

  node.innerHTML = `
    <svg class="sparkline-svg ghost-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.18"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gradientId})"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function spark(node, values, color) {
  const points = values.filter((value) => Number.isFinite(value));
  if (!points.length) {
    renderGhostSpark(node, color);
    return;
  }

  const width = 220;
  const height = 76;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const chartPoints = coords(points, width, height, min, max, (point) => point);
  const line = linePath(chartPoints);
  const area = areaPath(chartPoints, height);
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  node.innerHTML = `
    <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.34"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#${gradientId})"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;
}

function lineChart(node, logs, options) {
  const { title, accessor, color, suffix, precision = 1, rangeText, emptyMessage } = options;
  if (!logs?.length) return emptyChart(node, emptyMessage);

  const points = [...logs].reverse();
  const values = points.map(accessor).filter((value) => Number.isFinite(value));
  if (!values.length) return emptyChart(node, emptyMessage);

  const width = 760;
  const height = 240;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const chartPoints = coords(points, width, height, min, max, accessor);
  const line = linePath(chartPoints);
  const area = areaPath(chartPoints, height);
  const gradientId = `line-${Math.random().toString(36).slice(2, 8)}`;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => `<line x1="0" y1="${(height * ratio).toFixed(2)}" x2="${width}" y2="${(height * ratio).toFixed(2)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />`)
    .join("");

  node.innerHTML = `
    <div class="chart-meta">
      <span>${rangeText} · диапазон ${fmtNum(min, precision)}–${fmtNum(max, precision)} ${suffix}</span>
      <span>${fmtDateLong(points[0].created_at)} — ${fmtDateLong(points[points.length - 1].created_at)}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height + 34}" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.34"></stop>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${area}" fill="url(#${gradientId})"></path>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      ${chartPoints.map((point) => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4.5" fill="${color}" />`).join("")}
      ${chartPoints
        .map(
          (point) =>
            `<text x="${point.x.toFixed(2)}" y="${height + 24}" text-anchor="middle" font-size="12" fill="rgba(156,175,192,0.86)">${fmtDate(point.point.created_at)}</text>`
        )
        .join("")}
    </svg>
  `;
}

function multiLineChart(node, logs, rangeText) {
  if (!logs?.length) {
    return emptyChart(node, "Добавь замеры или подгрузи демо-данные, чтобы увидеть график.");
  }

  const points = [...logs]
    .reverse()
    .map((log) => ({
      ...log,
      waist: Number(log.waist),
      chest: Number(log.chest),
      hips: Number(log.hips ?? log.thigh),
      arm: Number(log.arm)
    }))
    .filter((log) => [log.waist, log.chest, log.hips, log.arm].some((value) => Number.isFinite(value)));

  if (!points.length) {
    return emptyChart(node, "Замеров пока недостаточно для графика.");
  }

  const width = 760;
  const height = 240;
  const allValues = points.flatMap((point) => [point.waist, point.chest, point.hips, point.arm]).filter((value) => Number.isFinite(value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const series = [
    ["waist", "#25d0a5"],
    ["chest", "#f0bc66"],
    ["hips", "#56b6ff"],
    ["arm", "#c78bff"]
  ];
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => `<line x1="0" y1="${(height * ratio).toFixed(2)}" x2="${width}" y2="${(height * ratio).toFixed(2)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />`)
    .join("");

  const paths = series
    .map(([key, color]) => {
      if (!points.some((point) => Number.isFinite(point[key]))) return "";
      const chartPoints = coords(points, width, height, min, max, (point) => (Number.isFinite(Number(point[key])) ? Number(point[key]) : min));
      return `<path d="${linePath(chartPoints)}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>`;
    })
    .join("");

  node.innerHTML = `
    <div class="chart-meta">
      <span>${rangeText} · диапазон ${fmtNum(min)}–${fmtNum(max)} см</span>
      <span>${fmtDateLong(points[0].created_at)} — ${fmtDateLong(points[points.length - 1].created_at)}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height + 34}" role="img" aria-label="График замеров">
      ${grid}
      ${paths}
      ${points
        .map((point, index) => {
          const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
          return `<text x="${x.toFixed(2)}" y="${height + 24}" text-anchor="middle" font-size="12" fill="rgba(156,175,192,0.86)">${fmtDate(point.created_at)}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderMacroBars(profile, today) {
  const totals = today?.totals || {};
  const items = [
    ["Калории", Number(totals.calories || 0), Number(profile.daily_calories || 0), "ккал", "calories"],
    ["Белки", Number(totals.protein || 0), Number(profile.daily_protein || 0), "г", "protein"],
    ["Жиры", Number(totals.fat || 0), Number(profile.daily_fat || 0), "г", "fat"],
    ["Углеводы", Number(totals.carbs || 0), Number(profile.daily_carbs || 0), "г", "carbs"]
  ];

  el.macroBars.innerHTML = items
    .map(([label, value, goal, unit, className]) => {
      const ratio = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
      return `
        <div class="macro-row">
          <div class="macro-top">
            <span>${label}</span>
            <strong>${fmtNum(value)} / ${goal || 0} ${unit}</strong>
          </div>
          <div class="macro-track">
            <div class="macro-fill ${className}" style="width:${ratio}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSummary(dashboard) {
  const profile = dashboard.profile;
  const meals = dashboard.today?.meals || [];
  const totals = dashboard.today?.totals || {};
  const weight = dashboard.weightLogs?.logs?.[0];
  const measurement = dashboard.measurementLogs?.logs?.[0];

  el.profileHeadline.textContent = profile.display_name || "Твой кабинет";
  el.profileSubline.textContent = profile.telegram_username ? `@${profile.telegram_username} · цель: ${profile.goal || "не указана"}` : `цель: ${profile.goal || "не указана"}`;
  el.summaryGrid.innerHTML = "";

  [
    summaryCard("Сегодня", `${Math.round(Number(totals.calories || 0))} ккал`, `${meals.length} приемов пищи`),
    summaryCard("Текущий вес", weight ? `${fmtNum(weight.weight)} кг` : "—", weight ? fmtDateLong(weight.created_at) : "нет записей"),
    summaryCard(
      "Динамика веса",
      dashboard.weightProgress?.change !== undefined ? fmtSigned(dashboard.weightProgress.change, " кг") : "—",
      dashboard.weightProgress?.change > 0 ? "рост" : dashboard.weightProgress?.change < 0 ? "снижение" : "без изменений"
    ),
    summaryCard(
      "Последние замеры",
      measurement ? `${measurement.waist ?? "-"} / ${measurement.chest ?? "-"} / ${measurement.hips ?? measurement.thigh ?? "-"} / ${measurement.arm ?? "-"}` : "—",
      measurement ? "талия / грудь / бедра / рука" : "нет записей"
    )
  ].forEach((card) => el.summaryGrid.append(card));
}

function renderHeroCards(dashboard, weightLogs, measurementLogs) {
  const totals = dashboard.today?.totals || {};
  const meals = dashboard.recentMeals?.meals || [];
  const latestWeight = dashboard.weightLogs?.logs?.[0];
  const latestMeasurement = dashboard.measurementLogs?.logs?.[0];
  const earliestWeight = weightLogs[weightLogs.length - 1];
  const earliestMeasurement = measurementLogs[measurementLogs.length - 1];
  const weightDelta = latestWeight && earliestWeight ? Number(latestWeight.weight) - Number(earliestWeight.weight) : Number.NaN;
  const waistDelta =
    latestMeasurement && earliestMeasurement && latestMeasurement.waist !== null && earliestMeasurement.waist !== null
      ? Number(latestMeasurement.waist) - Number(earliestMeasurement.waist)
      : Number.NaN;

  el.miniWeightValue.textContent = latestWeight ? `${fmtNum(latestWeight.weight)} кг` : "—";
  el.miniWeightDelta.textContent = Number.isFinite(weightDelta) ? fmtSigned(weightDelta, " кг") : "нет данных";
  el.miniCaloriesValue.textContent = `${Math.round(Number(totals.calories || 0))} ккал`;
  el.miniCaloriesCaption.textContent = meals.length ? `${meals.length} приемов пищи` : "сегодня";
  el.miniWaistValue.textContent = latestMeasurement?.waist ? `${fmtNum(latestMeasurement.waist)} см` : "—";
  el.miniWaistDelta.textContent = Number.isFinite(waistDelta) ? fmtSigned(waistDelta, " см") : "нет данных";

  spark(el.miniWeightChart, [...weightLogs].reverse().map((log) => Number(log.weight)), "#25d0a5");
  spark(el.miniCaloriesChart, [...meals].reverse().slice(-8).map((meal) => Number(meal.calories)), "#f0bc66");
  spark(el.miniMeasurementChart, [...measurementLogs].reverse().map((log) => Number(log.waist)), "#56b6ff");
}

function renderProfile(profile) {
  fill(el.profileBlock, [
    metric("Профиль", profile.display_name || "Не настроен"),
    metric("Telegram", profile.telegram_username ? `@${profile.telegram_username}` : profile.telegram_user_id),
    metric("Цель", profile.goal || "Не указана"),
    metric("Калории", `${profile.daily_calories || 0} ккал`),
    metric("Белки", `${profile.daily_protein || 0} г`),
    metric("Жиры / углеводы", `${profile.daily_fat || 0} / ${profile.daily_carbs || 0} г`)
  ]);
}

function renderToday(today) {
  const meals = today?.meals || [];
  const totals = today?.totals || {};
  const items = [
    metric("Калории", `${Math.round(Number(totals.calories || 0))} ккал`),
    metric("БЖУ", `${fmtNum(totals.protein || 0)} / ${fmtNum(totals.fat || 0)} / ${fmtNum(totals.carbs || 0)} г`)
  ];

  if (meals.length) {
    meals.slice(0, 6).forEach((meal) => {
      items.push(listItem(`${meal.meal_type || "Прием пищи"} · ${meal.dish_name}`, `${Math.round(Number(meal.calories || 0))} ккал · ${fmtDateTime(meal.created_at)}`));
    });
  } else {
    items.push(listItem("Сегодня пока нет приемов пищи"));
  }

  fill(el.todayBlock, items);
}

function renderProgress(weightLogs, measurementLogs) {
  const latestWeight = weightLogs[0];
  const earliestWeight = weightLogs[weightLogs.length - 1];
  const latestMeasurement = measurementLogs[0];
  const earliestMeasurement = measurementLogs[measurementLogs.length - 1];
  const items = [];

  if (latestWeight && earliestWeight) {
    items.push(metric("Вес", `${fmtNum(earliestWeight.weight)} → ${fmtNum(latestWeight.weight)} кг`));
    items.push(metric("Изменение веса", fmtSigned(Number(latestWeight.weight) - Number(earliestWeight.weight), " кг")));
  } else {
    items.push(metric("Вес", "Недостаточно данных"));
  }

  if (latestMeasurement && earliestMeasurement) {
    const waist = latestMeasurement.waist !== null && earliestMeasurement.waist !== null ? Number(latestMeasurement.waist) - Number(earliestMeasurement.waist) : null;
    const chest = latestMeasurement.chest !== null && earliestMeasurement.chest !== null ? Number(latestMeasurement.chest) - Number(earliestMeasurement.chest) : null;
    const hips = (latestMeasurement.hips ?? latestMeasurement.thigh) !== null && (earliestMeasurement.hips ?? earliestMeasurement.thigh) !== null
      ? Number(latestMeasurement.hips ?? latestMeasurement.thigh) - Number(earliestMeasurement.hips ?? earliestMeasurement.thigh)
      : null;
    const arm = latestMeasurement.arm !== null && earliestMeasurement.arm !== null ? Number(latestMeasurement.arm) - Number(earliestMeasurement.arm) : null;
    items.push(metric("Талия", waist === null ? "нет данных" : fmtSigned(waist, " см")));
    items.push(metric("Грудь", chest === null ? "нет данных" : fmtSigned(chest, " см")));
    items.push(metric("Бедра", hips === null ? "нет данных" : fmtSigned(hips, " см")));
    items.push(metric("Обхват руки", arm === null ? "нет данных" : fmtSigned(arm, " см")));
  } else {
    items.push(metric("Замеры", "Пока нет динамики"));
  }

  fill(el.progressBlock, items);
}

function compareDelta(logs, key, days) {
  const filtered = filterLogs(logs, days);
  const latest = filtered[0];
  const earliest = filtered[filtered.length - 1];
  if (!latest || !earliest) return null;
  const latestValue = Number(latest[key]);
  const earliestValue = Number(earliest[key]);
  if (!Number.isFinite(latestValue) || !Number.isFinite(earliestValue)) return null;
  return latestValue - earliestValue;
}

function renderProgressPremium(weightLogs, measurementLogs) {
  const weekWeight = compareDelta(weightLogs, "weight", 7);
  const monthWeight = compareDelta(weightLogs, "weight", 30);
  const weekWaist = compareDelta(measurementLogs, "waist", 7);
  const monthWaist = compareDelta(measurementLogs, "waist", 30);
  const latestWeight = weightLogs[0];
  const latestMeasurement = measurementLogs[0];

  el.progressSpotlight.innerHTML = `
    <article class="spotlight-card">
      <span class="spotlight-label">Прогресс тела</span>
      <div class="spotlight-value">${latestWeight ? `${fmtNum(latestWeight.weight)} кг` : "—"}</div>
      <div class="spotlight-caption">Текущий вес и живая динамика по выбранному периоду. Последняя запись${latestWeight ? ` от ${fmtDateLong(latestWeight.created_at)}` : " пока отсутствует"}.</div>
    </article>
    <article class="spotlight-card">
      <span class="spotlight-label">Ключевой замер</span>
      <div class="spotlight-value">${latestMeasurement?.waist ? `${fmtNum(latestMeasurement.waist)} см` : "—"}</div>
      <div class="spotlight-caption">Фокус на талии как главном индикаторе композиции тела. ${Number.isFinite(monthWaist) ? `За месяц ${fmtSigned(monthWaist, " см")}.` : "Пока мало данных для сравнения."}</div>
    </article>
  `;

  el.periodCompare.innerHTML = [
    { label: "Вес · 7 дней", value: weekWeight, suffix: " кг", meta: "Сравнение внутри короткого периода" },
    { label: "Вес · 30 дней", value: monthWeight, suffix: " кг", meta: "Показывает общую месячную тенденцию" },
    { label: "Талия · 30 дней", value: monthWaist, suffix: " см", meta: Number.isFinite(weekWaist) ? `За 7 дней ${fmtSigned(weekWaist, " см")}` : "Недельных данных пока мало" }
  ]
    .map(
      (item) => `
        <article class="compare-card">
          <span class="compare-label">${item.label}</span>
          <div class="compare-value">${Number.isFinite(item.value) ? fmtSigned(item.value, item.suffix) : "—"}</div>
          <div class="compare-caption">${item.meta}</div>
        </article>
      `
    )
    .join("");
}

function renderTimeline(weightLogs, measurementLogs) {
  const items = [];
  weightLogs.forEach((log) => items.push({ date: log.created_at, title: `Вес обновлен: ${fmtNum(log.weight)} кг`, subtitle: fmtDateLong(log.created_at) }));
  measurementLogs.forEach((log) =>
    items.push({
      date: log.created_at,
      title: `Замеры: талия ${log.waist ?? "-"} · грудь ${log.chest ?? "-"} · бедра ${log.hips ?? log.thigh ?? "-"} · рука ${log.arm ?? "-"}`,
      subtitle: fmtDateLong(log.created_at)
    })
  );

  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  el.progressTimeline.innerHTML = items.length
    ? items
        .slice(0, 12)
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
    : '<div class="chart-empty">История прогресса появится после первых записей.</div>';
}

function renderHistory(meals) {
  fill(
    el.historyBlock,
    meals.length
      ? meals.map((meal) =>
          listItem(
            `${fmtDateLong(meal.created_at)} — ${meal.dish_name}`,
            `${meal.meal_type || "Прием пищи"} · ${Math.round(Number(meal.calories || 0))} ккал · БЖУ ${fmtNum(meal.protein)} / ${fmtNum(meal.fat)} / ${fmtNum(meal.carbs)}`
          )
        )
      : [listItem("История питания пока пустая")]
  );
}

function renderWeightLogs(logs) {
  fill(
    el.weightBlock,
    logs.length ? logs.slice(0, 12).map((log) => listItem(`${fmtDateLong(log.created_at)} — ${fmtNum(log.weight)} кг`)) : [listItem("Журнал веса пока пуст")]
  );
}

function renderMeasurementLogs(logs) {
  fill(
    el.measurementBlock,
    logs.length
      ? logs.slice(0, 12).map((log) => listItem(`${fmtDateLong(log.created_at)} — талия ${log.waist ?? "-"} · грудь ${log.chest ?? "-"} · бедра ${log.hips ?? log.thigh ?? "-"} · рука ${log.arm ?? "-"}`, log.note || ""))
      : [listItem("Журнал замеров пока пуст")]
  );
}

function renderDashboardSections() {
  if (!state.dashboard) return;

  const dashboard = state.dashboard;
  const weightLogs = dashboard.weightLogs?.logs || [];
  const measurementLogs = dashboard.measurementLogs?.logs || [];
  const recentMeals = dashboard.recentMeals?.meals || [];
  const filteredWeight = filterLogs(weightLogs, state.chartRange);
  const filteredMeasurements = filterLogs(measurementLogs, state.chartRange);
  const currentRangeLabel = rangeLabel(state.chartRange);

  el.dashboard.classList.remove("hidden");
  setAuthUi(true);
  el.weightChartRangeLabel.textContent = currentRangeLabel;
  el.progressRangeLabel.textContent = currentRangeLabel;

  renderHeroCards(dashboard, filteredWeight, filteredMeasurements);
  renderSummary(dashboard);
  renderProfile(dashboard.profile);
  renderToday(dashboard.today);
  renderMacroBars(dashboard.profile, dashboard.today);
  renderProgressPremium(weightLogs, measurementLogs);
  renderProgress(filteredWeight, filteredMeasurements);
  renderTimeline(filteredWeight, filteredMeasurements);
  renderHistory(recentMeals);
  renderWeightLogs(weightLogs);
  renderMeasurementLogs(measurementLogs);

  lineChart(el.weightChart, filteredWeight, {
    title: "График веса",
    accessor: (point) => Number(point.weight),
    color: "#25d0a5",
    suffix: "кг",
    precision: 1,
    rangeText: currentRangeLabel,
    emptyMessage: "Добавь несколько записей веса или подгрузи демо-данные, чтобы увидеть график."
  });

  multiLineChart(el.measurementChart, filteredMeasurements, currentRangeLabel);
}

function renderDashboard(dashboard) {
  state.profile = dashboard.profile;
  state.dashboard = dashboard;
  renderDashboardSections();
}

function seriesChart(node, seriesMap, title) {
  const merged = new Map();

  for (const [seriesName, points] of Object.entries(seriesMap)) {
    points.forEach((point) => {
      const day = point.day;
      if (!merged.has(day)) merged.set(day, { day });
      merged.get(day)[seriesName] = Number(point[seriesName] || 0);
    });
  }

  const rows = [...merged.values()].sort((a, b) => new Date(a.day) - new Date(b.day));
  if (!rows.length) {
    return emptyChart(node, "Статистика появится, когда пользователи начнут активнее заполнять данные.");
  }

  const width = 760;
  const height = 240;
  const definitions = [
    ["registrations", "#56b6ff", "Регистрации"],
    ["meals", "#25d0a5", "Приемы пищи"],
    ["weights", "#f0bc66", "Записи веса"]
  ];
  const values = rows.flatMap((row) => definitions.map(([key]) => Number(row[key] || 0)));
  const min = 0;
  const max = Math.max(...values, 1);

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((ratio) => `<line x1="0" y1="${(height * ratio).toFixed(2)}" x2="${width}" y2="${(height * ratio).toFixed(2)}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />`)
    .join("");

  const paths = definitions
    .map(([key, color]) => {
      const points = coords(rows, width, height, min, max, (row) => Number(row[key] || 0));
      return `<path d="${linePath(points)}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>`;
    })
    .join("");

  const legend = definitions
    .map(([, color, label]) => `<span class="legend-item"><i class="dot" style="background:${color}"></i>${label}</span>`)
    .join("");

  node.innerHTML = `
    <div class="chart-meta">
      <span>${title}</span>
      <span class="legend">${legend}</span>
    </div>
    <svg class="chart-svg" viewBox="0 0 ${width} ${height + 34}" role="img" aria-label="${title}">
      ${grid}
      ${paths}
      ${rows
        .map((row, index) => {
          const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
          return `<text x="${x.toFixed(2)}" y="${height + 24}" text-anchor="middle" font-size="12" fill="rgba(156,175,192,0.86)">${fmtDate(row.day)}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderAdminDashboard(adminDashboard) {
  state.adminDashboard = adminDashboard;
  setAdminUi(true);

  el.adminSummaryGrid.innerHTML = "";
  [
    summaryCard("Пользователи", String(adminDashboard.totalUsers), `${adminDashboard.newUsersToday} новых сегодня`),
    summaryCard("Профили", String(adminDashboard.usersWithProfile), "с заполненной нормой"),
    summaryCard("Триал", String(adminDashboard.activeTrials), "активный бесплатный доступ"),
    summaryCard("Платные", String(adminDashboard.paidUsers), `${adminDashboard.totalPayments} платежей всего`),
    summaryCard("Еда", String(adminDashboard.totalMeals), `${adminDashboard.mealsToday} приемов пищи сегодня`),
    summaryCard("Вес", String(adminDashboard.totalWeightLogs), "записей в журнале"),
    summaryCard("Замеры", String(adminDashboard.totalMeasurementLogs), "записей в журнале"),
    summaryCard("Админка", "Online", "данные в реальном времени")
  ].forEach((card) => el.adminSummaryGrid.append(card));

  seriesChart(
    el.adminActivityChart,
    {
      registrations: adminDashboard.registrations || [],
      meals: adminDashboard.mealsByDay || [],
      weights: adminDashboard.weightsByDay || []
    },
    "Регистрации, приемы пищи и вес за 30 дней"
  );

  fill(
    el.adminUsersBlock,
    (adminDashboard.latestUsers || []).map((user) =>
      listItem(
        `${fmtDateLong(user.created_at)} — ${user.display_name || "Без имени"}`,
        `${user.telegram_username ? `@${user.telegram_username}` : "без username"} · ${user.access_status || "unknown"}`
      )
    )
  );

  fill(
    el.adminPaymentsBlock,
    (adminDashboard.recentPayments || []).length
      ? adminDashboard.recentPayments.map((payment) =>
          listItem(
            `${payment.display_name || "Без имени"} · ${payment.amount || 0} ${payment.currency || ""}`.trim(),
            `${payment.telegram_username ? `@${payment.telegram_username}` : "без username"} · ${fmtDateLong(payment.created_at)}`
          )
        )
      : [listItem("Оплат пока нет")]
  );

  fill(
    el.adminActiveUsersBlock,
    (adminDashboard.activeUsers || []).map((user) =>
      listItem(
        `${user.display_name || "Без имени"} · ${user.meals_count || 0} приемов пищи`,
        `${user.telegram_username ? `@${user.telegram_username}` : "без username"} · ${user.calories_logged || 0} ккал суммарно${user.last_meal_at ? ` · последний прием ${fmtDateLong(user.last_meal_at)}` : ""}`
      )
    )
  );
}

async function loadAdminDashboard() {
  if (!state.isAdmin) return;
  const adminDashboard = await request("/api/admin/dashboard");
  renderAdminDashboard(adminDashboard);
}

async function loadDashboardBySession() {
  setStatus("Загружаю кабинет...", "muted");
  renderDashboard(await request("/api/dashboard"));
  if (state.isAdmin) {
    await loadAdminDashboard();
  }
  setStatus("Кабинет открыт.", "success");
}

async function loadDashboardByFallback() {
  const identifier = el.telegramUserId.value.trim();
  if (!identifier) {
    return setStatus("Введи Telegram ID или @username, чтобы открыть кабинет.", "error");
  }

  setStatus("Загружаю кабинет...", "muted");
  renderDashboard(await request(`/api/dashboard?identifier=${encodeURIComponent(identifier)}`));
  setStatus("Кабинет открыт.", "success");
}

async function submitWeight(event) {
  event.preventDefault();
  const weight = el.weightValue.value.trim();
  if (!weight) return setStatus("Введи вес, чтобы сохранить запись.", "error");

  try {
    await request("/api/weight", { method: "POST", body: JSON.stringify({ weight }) });
    el.weightForm.reset();
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
        waist: el.waistValue.value || null,
        chest: el.chestValue.value || null,
        hips: el.hipsValue.value || null,
        arm: el.armValue.value || null
      })
    });
    el.measurementForm.reset();
    await loadDashboardBySession();
    setStatus("Замеры сохранены.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitMeal(event) {
  event.preventDefault();
  const description = el.mealDescription.value.trim();
  if (!description) return setStatus("Опиши еду, чтобы добавить прием пищи.", "error");

  try {
    await request("/api/meal", {
      method: "POST",
      body: JSON.stringify({ description, meal_type: el.mealType.value || "не указано" })
    });
    el.mealForm.reset();
    await loadDashboardBySession();
    setActiveTab("nutrition");
    setStatus("Прием пищи добавлен в дневник.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitQuestion(event) {
  event.preventDefault();
  const question = el.questionValue.value.trim();
  if (!question) return setStatus("Напиши вопрос, чтобы получить ответ.", "error");

  try {
    const result = await request("/api/ask", { method: "POST", body: JSON.stringify({ question }) });
    fill(el.answerBlock, [listItem("Ответ нутрициолога", result.answer)]);
    setStatus("Ответ готов.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadMealPlan() {
  try {
    const result = await request("/api/meal-plan", { method: "POST", body: JSON.stringify({ period: "день" }) });
    fill(el.mealPlanBlock, [listItem("Меню на день", result.plan)]);
    setStatus("Меню на день готово.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function seedDemoData() {
  try {
    setStatus("Добавляю демо-историю для графиков...", "muted");
    const result = await request("/api/demo/seed", { method: "POST", body: JSON.stringify({}) });
    await loadDashboardBySession();
    setStatus(`Готово: вес ${result.seededWeights}, замеры ${result.seededMeasurements}, питание ${result.seededMeals}.`, "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function logout() {
  await request("/api/logout", { method: "POST", body: JSON.stringify({}) });
  state.profile = null;
  state.dashboard = null;
  state.adminDashboard = null;
  state.isAdmin = false;
  el.dashboard.classList.add("hidden");
  setAdminUi(false);
  setAuthUi(false);
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

    el.telegramLoginWidget.innerHTML = "";
    el.telegramLoginWidget.append(script);
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
  return { authSuccess: authSuccess === "1", authError };
}

async function restoreSession() {
  try {
    const me = await request("/api/me");
    setAdminUi(me.isAdmin);
    await loadDashboardBySession();
  } catch {
    setAuthUi(false);
    setAdminUi(false);
  }
}

el.loadDashboard.addEventListener("click", () => loadDashboardByFallback().catch((error) => setStatus(error.message, "error")));
el.logoutButton.addEventListener("click", () => logout().catch((error) => setStatus(error.message, "error")));
el.seedDemoButton.addEventListener("click", () => seedDemoData().catch((error) => setStatus(error.message, "error")));
el.weightForm.addEventListener("submit", submitWeight);
el.measurementForm.addEventListener("submit", submitMeasurements);
el.mealForm.addEventListener("submit", submitMeal);
el.askForm.addEventListener("submit", submitQuestion);
el.loadMealPlan.addEventListener("click", loadMealPlan);
el.telegramUserId.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadDashboardByFallback().catch((error) => setStatus(error.message, "error"));
  }
});
el.tabButtons.forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.tab)));
el.rangeButtons.forEach((button) => button.addEventListener("click", () => setChartRange(Number(button.dataset.range))));

bootstrapTelegramLogin();
renderGhostSpark(el.miniWeightChart, "#25d0a5");
renderGhostSpark(el.miniCaloriesChart, "#f0bc66");
renderGhostSpark(el.miniMeasurementChart, "#56b6ff");
const authFlags = consumeAuthResultFlags();
restoreSession().then(() => {
  if (authFlags.authError) {
    setStatus("Не удалось подтвердить вход через Telegram.", "error");
  } else if (authFlags.authSuccess) {
    setStatus("Вход через Telegram выполнен.", "success");
  }
});
