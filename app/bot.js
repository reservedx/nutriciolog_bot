import { Markup, Telegraf } from "telegraf";
import { getTelegramFileUrl } from "./services/telegram.js";

const goalOptions = {
  weight_loss: { label: "снижение веса", calorieFactor: 0.85, proteinPerKg: 1.8 },
  maintenance: { label: "поддержание", calorieFactor: 1, proteinPerKg: 1.6 },
  mass_gain: { label: "набор массы", calorieFactor: 1.1, proteinPerKg: 1.8 }
};

const sexOptions = {
  male: { label: "мужской", bmrOffset: 5 },
  female: { label: "женский", bmrOffset: -161 }
};

const activityOptions = {
  low: { label: "минимальная", factor: 1.2 },
  light: { label: "легкая", factor: 1.375 },
  medium: { label: "средняя", factor: 1.55 },
  high: { label: "высокая", factor: 1.725 }
};

const mealTypeOptions = {
  breakfast: "завтрак",
  lunch: "обед",
  dinner: "ужин",
  snack: "перекус"
};

const nextMealStyles = {
  balanced: "сбалансированный",
  protein: "белковый",
  quick: "быстрый",
  budget: "подешевле",
  light: "легкий"
};

function round(value) {
  return Math.round(Number(value) || 0);
}

function createHomeMenu(profile) {
  const rows = [];

  if (!profile?.daily_calories) {
    rows.push([Markup.button.callback("Начать", "guide:start")]);
  }

  rows.push([Markup.button.callback("Добавить еду", "guide:add_food"), Markup.button.callback("Мой кабинет", "guide:day")]);
  rows.push([Markup.button.callback("Анализ этикетки", "guide:label_photo"), Markup.button.callback("Еще", "guide:more")]);

  return Markup.inlineKeyboard(rows);
}

function createStartMenu(profile) {
  const rows = [[Markup.button.callback("Настроить профиль", "menu:setup")]];

  if (profile?.daily_calories) {
    rows.push([Markup.button.callback("Показать профиль", "menu:profile")]);
  }

  rows.push([Markup.button.callback("В меню", "menu:home")]);
  return Markup.inlineKeyboard(rows);
}

function createAddFoodMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Фото еды", "guide:add_food_photo")],
    [Markup.button.callback("Текстом", "menu:meal_text")],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createDayMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Сводка за сегодня", "menu:today")],
    [Markup.button.callback("Разбор питания", "menu:quality")],
    [Markup.button.callback("Моя норма КБЖУ", "menu:targets")],
    [Markup.button.callback("Что я могу съесть дальше?", "menu:next_meal")],
    [Markup.button.callback("Обновить вес", "menu:weight"), Markup.button.callback("Журнал веса", "menu:weight_history")],
    [Markup.button.callback("Добавить замеры", "menu:measure")],
    [Markup.button.callback("Прогресс", "menu:progress")],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createTargetsMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Изменить норму вручную", "menu:edit_targets")],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function getSuggestedNextMealTypes(summary) {
  const eatenTypes = new Set((summary?.meals || []).map((meal) => String(meal.meal_type || "").toLowerCase()));

  if (eatenTypes.has("завтрак") && !eatenTypes.has("обед")) {
    return ["lunch", "snack"];
  }

  if (eatenTypes.has("обед") && !eatenTypes.has("ужин")) {
    return ["dinner", "snack"];
  }

  if (!eatenTypes.has("завтрак")) {
    return ["breakfast", "snack"];
  }

  return ["dinner", "snack"];
}

function createNextMealTypeMenu(summary) {
  const suggestedTypes = getSuggestedNextMealTypes(summary);
  const labels = {
    breakfast: "Завтрак",
    lunch: "Обед",
    dinner: "Ужин",
    snack: "Перекус"
  };

  return Markup.inlineKeyboard([
    suggestedTypes.map((type) => Markup.button.callback(labels[type], `nextmealtype:${type}`)),
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createNextMealStyleMenu(nextMealType) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Сбалансированный", `nextmeal:${nextMealType}:balanced`)],
    [Markup.button.callback("Белковый", `nextmeal:${nextMealType}:protein`), Markup.button.callback("Легкий", `nextmeal:${nextMealType}:light`)],
    [Markup.button.callback("Быстрый", `nextmeal:${nextMealType}:quick`), Markup.button.callback("Подешевле", `nextmeal:${nextMealType}:budget`)],
    [Markup.button.callback("Сменить ужин/перекус", "menu:next_meal"), Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createNextMealResultMenu(nextMealType, style) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Еще варианты", `nextmeal:${nextMealType}:${style}`)],
    [Markup.button.callback("Выбрать другой формат", `nextmealtype:${nextMealType}`)],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createMoreMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Меню на день", "menu:mealplan")],
    [Markup.button.callback("История записей", "menu:history")],
    [Markup.button.callback("Задать вопрос нутрициологу", "menu:ask")],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createSubscriptionMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Оформить подписку", "menu:buy_subscription")],
    [Markup.button.callback("Что умеет бот", "menu:home")],
    [Markup.button.callback("В меню", "guide:more")]
  ]);
}

function createSexMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Мужской", "sex:male"), Markup.button.callback("Женский", "sex:female")],
    [Markup.button.callback("Отмена", "menu:cancel_setup")]
  ]);
}

function createActivityMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Минимальная", "activity:low")],
    [Markup.button.callback("Легкая 1-3 тренировки", "activity:light")],
    [Markup.button.callback("Средняя 3-5 тренировок", "activity:medium")],
    [Markup.button.callback("Высокая 6+ тренировок", "activity:high")],
    [Markup.button.callback("Отмена", "menu:cancel_setup")]
  ]);
}

function createGoalMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Снижение веса", "goal:weight_loss")],
    [Markup.button.callback("Поддержание", "goal:maintenance")],
    [Markup.button.callback("Набор массы", "goal:mass_gain")],
    [Markup.button.callback("Отмена", "menu:cancel_setup")]
  ]);
}

function createMealTypeMenu(entryId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Завтрак", `mealtype:${entryId}:breakfast`),
      Markup.button.callback("Обед", `mealtype:${entryId}:lunch`)
    ],
    [
      Markup.button.callback("Ужин", `mealtype:${entryId}:dinner`),
      Markup.button.callback("Перекус", `mealtype:${entryId}:snack`)
    ],
    [Markup.button.callback("Ошибка? Уточнить, что на тарелке", `mealfix:${entryId}`)],
    [Markup.button.callback("В меню", "menu:home")]
  ]);
}

function createHistoryMenu(meals) {
  const rows = meals.slice(0, 5).map((meal) => [
    Markup.button.callback(`Удалить #${meal.id} ${meal.dish_name.slice(0, 18)}`, `delete:${meal.id}`)
  ]);
  rows.push([Markup.button.callback("В меню", "menu:home")]);
  return Markup.inlineKeyboard(rows);
}

function formatNutritionReport(report, mealType = "не указано") {
  const ingredients = report.ingredients.length > 0 ? report.ingredients.join(", ") : "не удалось определить";
  const assumptions = report.assumptions.length > 0 ? report.assumptions.join("; ") : "нет";

  return [
    `Блюдо: ${report.dishName}`,
    `Тип приема пищи: ${mealType}`,
    `Вес порции: ~${round(report.estimatedWeightGrams)} г`,
    `Калории: ~${round(report.calories)} ккал`,
    `Белки: ~${round(report.protein)} г`,
    `Жиры: ~${round(report.fat)} г`,
    `Углеводы: ~${round(report.carbs)} г`,
    "",
    `Состав: ${ingredients}`,
    `Предположения: ${assumptions}`,
    "",
    `Совет: ${report.advice}`,
    "",
    "Важно: это ориентировочная оценка, а не медицинская рекомендация."
  ].join("\n");
}

function formatLabelReport(report) {
  const pros = report.pros.length > 0 ? report.pros.map((item) => `- ${item}`).join("\n") : "- явных плюсов не выделил";
  const cons = report.cons.length > 0 ? report.cons.map((item) => `- ${item}`).join("\n") : "- явных минусов не выделил";

  return [
    `Продукт: ${report.productName}`,
    `Порция / база расчета: ${report.servingSize}`,
    `Калории: ~${round(report.calories)} ккал`,
    `Белки: ~${round(report.protein)} г`,
    `Жиры: ~${round(report.fat)} г`,
    `Углеводы: ~${round(report.carbs)} г`,
    `Сахар: ${report.sugar}`,
    "",
    `Коротко о составе: ${report.ingredientsSummary}`,
    "",
    "Плюсы:",
    pros,
    "",
    "Минусы:",
    cons,
    "",
    `Вердикт: ${report.verdict}`
  ].join("\n");
}

function formatProfile(profile) {
  return [
    `Профиль: ${profile.display_name || "не указан"}`,
    `Цель: ${profile.goal || "не указана"}`,
    `Норма калорий: ${profile.daily_calories ?? "не задана"}`,
    `Белки: ${profile.daily_protein ?? "не заданы"} г`,
    `Жиры: ${profile.daily_fat ?? "не заданы"} г`,
    `Углеводы: ${profile.daily_carbs ?? "не заданы"} г`
  ].join("\n");
}

function formatTargets(profile) {
  return [
    "Моя норма КБЖУ",
    "",
    `Калории: ${profile.daily_calories ?? "не заданы"} ккал`,
    `Белки: ${profile.daily_protein ?? "не заданы"} г`,
    `Жиры: ${profile.daily_fat ?? "не заданы"} г`,
    `Углеводы: ${profile.daily_carbs ?? "не заданы"} г`,
    "",
    `Цель: ${profile.goal || "не указана"}`
  ].join("\n");
}

function formatDate(iso) {
  if (!iso) return "не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(iso));
}

function formatJournalDate(iso) {
  return formatDate(iso);
}

function formatAccessStatus(access) {
  if (!access) {
    return "Статус доступа пока не определен.";
  }

  if (access.isPaid) {
    return [
      "Подписка активна",
      `Тариф: 300 ₽ в месяц`,
      `Действует до: ${formatDate(access.subscriptionEndsAt)}`,
      `Осталось дней: ${access.remainingDays}`
    ].join("\n");
  }

  if (access.isTrial) {
    return "Доступ активен.";
  }

  return [
    "Доступ к боту приостановлен.",
    "Чтобы продолжить пользоваться ботом, нужна подписка 300 ₽ в месяц.",
    "",
    "Оплатить можно внутри Telegram через Stars."
  ].join("\n");
}

function formatTodaySummary(summary) {
  if (!summary || summary.meals.length === 0) {
    return "Сегодня записей пока нет. Нажми «Добавить еду» и пришли фото или описание блюда.";
  }

  const lines = [
    `За сегодня записей: ${summary.meals.length}`,
    `Калории: ${round(summary.totals.calories)} ккал`,
    `Белки: ${round(summary.totals.protein)} г`,
    `Жиры: ${round(summary.totals.fat)} г`,
    `Углеводы: ${round(summary.totals.carbs)} г`
  ];

  if (summary.user.daily_calories) {
    lines.push(`Остаток по калориям: ${summary.user.daily_calories - round(summary.totals.calories)} ккал`);
  }

  lines.push("");
  lines.push("Последние приемы пищи:");
  for (const meal of summary.meals.slice(0, 5)) {
    lines.push(`- ${meal.meal_type || "не указано"}: ${meal.dish_name}, ${round(meal.calories)} ккал`);
  }
  return lines.join("\n");
}

function formatRemainingForNextMeal(summary) {
  if (!summary?.user?.daily_calories) {
    return "Сначала лучше настроить профиль, чтобы я точнее считал остаток по дню и подбирал ужин или перекус.";
  }

  const remainingCalories = round(summary.user.daily_calories) - round(summary.totals.calories);
  const remainingProtein = round(summary.user.daily_protein) - round(summary.totals.protein);
  const remainingFat = round(summary.user.daily_fat) - round(summary.totals.fat);
  const remainingCarbs = round(summary.user.daily_carbs) - round(summary.totals.carbs);

  return [
    `Остаток на сегодня: ~${remainingCalories} ккал`,
    `Белки: ~${remainingProtein} г`,
    `Жиры: ~${remainingFat} г`,
    `Углеводы: ~${remainingCarbs} г`
  ].join("\n");
}

function formatRecentMeals(history) {
  if (!history || history.meals.length === 0) {
    return "История пока пустая.";
  }

  return [
    "Последние записи:",
    ...history.meals.map(
      (meal) => `${formatJournalDate(meal.created_at)} — ${meal.meal_type || "не указано"}, ${meal.dish_name}, ${round(meal.calories)} ккал`
    ),
    "",
    "Ниже можно удалить ненужные записи."
  ].join("\n");
}

function formatWeightHistory(history) {
  if (!history || history.logs.length === 0) {
    return "Лог веса пока пустой. Нажми «Вес» и отправь текущее значение, например 76.4";
  }

  return [
    "Последние записи веса:",
    ...history.logs.map((log) => `${formatJournalDate(log.created_at)} — ${Number(log.weight).toFixed(1)} кг${log.note ? ` (${log.note})` : ""}`)
  ].join("\n");
}

function formatWeightProgress(progress) {
  if (!progress || progress.logs.length === 0) {
    return "Вес пока не записывался.";
  }

  const direction = progress.change > 0 ? "плюс" : progress.change < 0 ? "минус" : "без изменений";
  const delta = Math.abs(progress.change).toFixed(1);

  return [
    `Текущий вес: ${Number(progress.latest.weight).toFixed(1)} кг`,
    `Первая запись: ${Number(progress.oldest.weight).toFixed(1)} кг`,
    `Изменение: ${direction === "без изменений" ? direction : `${direction} ${delta} кг`}`,
    `Записей всего: ${progress.logs.length}`
  ].join("\n");
}

function formatMeasurementHistory(history) {
  if (!history || history.logs.length === 0) {
    return "Журнал замеров пока пустой. Нажми «Замеры» и отправь, например: талия 82, нога 56, рука 31";
  }

  return [
    "Последние замеры:",
    ...history.logs.map((log) => {
      const parts = [];
      if (log.waist != null) parts.push(`талия ${Number(log.waist).toFixed(1)} см`);
      if (log.thigh != null) parts.push(`нога ${Number(log.thigh).toFixed(1)} см`);
      if (log.arm != null) parts.push(`рука ${Number(log.arm).toFixed(1)} см`);
      return `${formatJournalDate(log.created_at)} — ${parts.join(", ")}${log.note ? ` (${log.note})` : ""}`;
    })
  ].join("\n");
}

function formatProgress(weightProgress, measurementProgress) {
  const sections = [];

  if (weightProgress && weightProgress.logs.length > 0) {
    const direction = weightProgress.change > 0 ? "плюс" : weightProgress.change < 0 ? "минус" : "без изменений";
    const delta = Math.abs(weightProgress.change).toFixed(1);

    sections.push("Вес");
    sections.push(`Текущий: ${Number(weightProgress.latest.weight).toFixed(1)} кг`);
    sections.push(`Старт: ${Number(weightProgress.oldest.weight).toFixed(1)} кг`);
    sections.push(`Изменение: ${direction === "без изменений" ? direction : `${direction} ${delta} кг`}`);
    sections.push(`Записей: ${weightProgress.logs.length}`);
  } else {
    sections.push("Вес");
    sections.push("Пока нет данных по весу.");
  }

  sections.push("");
  sections.push("Замеры");

  if (measurementProgress && measurementProgress.logs.length > 0) {
    const latest = measurementProgress.latest;
    const oldest = measurementProgress.oldest;
    const measurementLines = [
      { label: "Талия", key: "waist" },
      { label: "Нога", key: "thigh" },
      { label: "Рука", key: "arm" }
    ];

    let hasAnyMeasurement = false;
    for (const item of measurementLines) {
      if (latest[item.key] == null || oldest[item.key] == null) {
        continue;
      }
      hasAnyMeasurement = true;
      const change = Number(latest[item.key]) - Number(oldest[item.key]);
      const direction = change > 0 ? "+" : change < 0 ? "-" : "0";
      sections.push(
        `${item.label}: ${Number(latest[item.key]).toFixed(1)} см (${direction === "0" ? "без изменений" : `${direction}${Math.abs(change).toFixed(1)} см`})`
      );
    }

    sections.push(`Записей: ${measurementProgress.logs.length}`);

    if (!hasAnyMeasurement) {
      sections.push("Пока недостаточно полных данных для сравнения замеров.");
    }
  } else {
    sections.push("Пока нет данных по замерам.");
  }

  return sections.join("\n");
}

function formatAdminStats(stats) {
  const latestUsersLines =
    stats.latestUsers.length > 0
      ? stats.latestUsers.map((user) => {
          const username = user.telegram_username ? `@${user.telegram_username}` : "без username";
          const name = user.display_name || "без имени";
          return `- ${formatJournalDate(user.created_at)} — ${name}, ${username}, ${user.access_status || "unknown"}`;
        })
      : ["- пока нет пользователей"];

  return [
    "Статистика бота",
    "",
    `Пользователей всего: ${stats.totalUsers}`,
    `Новых сегодня: ${stats.newUsersToday}`,
    `С заполненным профилем: ${stats.usersWithProfile}`,
    `Активный триал: ${stats.activeTrials}`,
    `Платных пользователей: ${stats.paidUsers}`,
    "",
    `Приемов пищи всего: ${stats.totalMeals}`,
    `Приемов пищи сегодня: ${stats.mealsToday}`,
    `Записей веса: ${stats.totalWeightLogs}`,
    `Записей замеров: ${stats.totalMeasurementLogs}`,
    `Платежей: ${stats.totalPayments}`,
    "",
    "Последние пользователи:",
    ...latestUsersLines
  ].join("\n");
}

function parseProfileCommand(text) {
  const payload = text.replace("/setprofile", "").trim();
  const parts = payload.split("|").map((part) => part.trim());
  if (parts.length !== 6) {
    return null;
  }

  const [displayName, goal, dailyCalories, dailyProtein, dailyFat, dailyCarbs] = parts;
  return {
    display_name: displayName,
    goal,
    daily_calories: Number(dailyCalories),
    daily_protein: Number(dailyProtein),
    daily_fat: Number(dailyFat),
    daily_carbs: Number(dailyCarbs)
  };
}

function parseTargetsCommand(text) {
  const payload = String(text || "").trim();
  const parts = payload.split("|").map((part) => part.trim());
  if (parts.length !== 4) {
    return null;
  }

  const [dailyCalories, dailyProtein, dailyFat, dailyCarbs] = parts.map((value) => Number(value));
  if ([dailyCalories, dailyProtein, dailyFat, dailyCarbs].some((value) => Number.isNaN(value))) {
    return null;
  }

  return {
    daily_calories: dailyCalories,
    daily_protein: dailyProtein,
    daily_fat: dailyFat,
    daily_carbs: dailyCarbs
  };
}

function createWizardPrompt(step, draft) {
  switch (step) {
    case "display_name":
      return "Шаг 1 из 6. Напиши имя или удобное название профиля.";
    case "sex":
      return "Шаг 2 из 6. Выбери пол кнопками ниже.";
    case "age":
      return `Шаг 3 из 6. Отлично, ${draft.display_name}. Теперь напиши возраст полными годами.`;
    case "height":
      return "Шаг 4 из 6. Напиши рост в сантиметрах. Например: 178.";
    case "weight":
      return "Шаг 5 из 6. Напиши текущий вес в килограммах. Например: 76.";
    case "activity":
      return "Шаг 6 из 6. Выбери уровень активности.";
    case "goal":
      return "Финальный шаг. Выбери цель, и я рассчитаю ориентировочную норму.";
    default:
      return "Продолжаем настройку профиля.";
  }
}

function buildProfileFromDraft(userId, draft, targets) {
  return {
    telegram_user_id: String(userId),
    display_name: draft.display_name,
    goal: goalOptions[draft.goal].label,
    daily_calories: targets.calories,
    daily_protein: targets.protein,
    daily_fat: targets.fat,
    daily_carbs: targets.carbs
  };
}

function calculateTargets(draft) {
  const sex = sexOptions[draft.sex];
  const activity = activityOptions[draft.activity];
  const goal = goalOptions[draft.goal];

  const bmr = 10 * draft.weight + 6.25 * draft.height - 5 * draft.age + sex.bmrOffset;
  const calories = Math.max(1200, round(bmr * activity.factor * goal.calorieFactor));
  const protein = round(draft.weight * goal.proteinPerKg);
  const fat = round(draft.weight * 0.8);
  const carbs = Math.max(50, round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, fat, carbs };
}

function numericFromText(text) {
  return Number(text.replace(",", ".").trim());
}

function parseMeasurementText(text) {
  const normalized = text.toLowerCase().replace(/ё/g, "е");
  const patterns = [
    { key: "waist", aliases: ["талия", "талию", "waist"] },
    { key: "thigh", aliases: ["нога", "нога", "бедро", "бедра", "бедро/нога", "thigh"] },
    { key: "arm", aliases: ["рука", "руку", "бицепс", "предплечье", "arm"] }
  ];

  const result = {};

  for (const pattern of patterns) {
    for (const alias of pattern.aliases) {
      const match = normalized.match(new RegExp(`${alias}\\s*[:=]?\\s*(\\d+(?:[\\.,]\\d+)?)`, "i"));
      if (match) {
        result[pattern.key] = Number(match[1].replace(",", "."));
        break;
      }
    }
  }

  return result;
}

export function createBot({ telegramBotToken, nutritionService, databaseService, billingConfig }) {
  const bot = new Telegraf(telegramBotToken);
  const profileWizard = new Map();
  const pendingMode = new Map();
  const pendingContext = new Map();
  const adminIds = new Set(
    String(process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID || "742896049")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  function getProfileAndAccess(ctx) {
    const profile = databaseService.ensureUser(ctx.from);
    const access = databaseService.getAccessStatus(ctx.from.id);
    return { profile, access };
  }

  async function requireActiveAccess(ctx) {
    const { access } = getProfileAndAccess(ctx);
    if (access?.isActive) {
      return access;
    }

    await ctx.reply(
      [
        "Доступ к боту приостановлен.",
        "Полный доступ к анализу еды, дневнику, меню и вопросам стоит 300 ₽ в месяц.",
        "",
        formatAccessStatus(access)
      ].join("\n"),
      createSubscriptionMenu()
    );

    return null;
  }

  function isAdmin(ctx) {
    return adminIds.has(String(ctx.from?.id || ""));
  }

  async function showAdminStats(ctx) {
    databaseService.ensureUser(ctx.from);

    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только владельцу.");
    }

    const stats = databaseService.getAdminStats();
    return ctx.reply(formatAdminStats(stats), createHomeMenu(databaseService.getUserByTelegramId(ctx.from.id)));
  }

  async function createSubscriptionInvoiceLink(ctx) {
    const payload = `sub:${ctx.from.id}:${Date.now()}`;

    return ctx.telegram.createInvoiceLink({
      title: billingConfig.subscriptionTitle,
      description: billingConfig.subscriptionDescription,
      payload,
      currency: "XTR",
      prices: [
        {
          label: "Подписка на 30 дней",
          amount: billingConfig.subscriptionPriceXtr
        }
      ],
      subscription_period: billingConfig.subscriptionPeriodSeconds
    });
  }

  async function showHome(ctx) {
    const { profile, access } = getProfileAndAccess(ctx);
    return ctx.reply(
      [
        "Привет! 👋",
        "Я — твой персональный нутрициолог в Telegram 🥑",
        "",
        "Помогу тебе легко контролировать питание, считать калории и БЖУ, отслеживать вес и видеть реальный прогресс — без жестких диет и заморочек.",
        "",
        "Вот что я умею:",
        "📸 Анализировать еду по фото или описанию",
        "📊 Считать калории и БЖУ по фото тарелки или текстом, вести дневник",
        "📈 Показывать сводку за день и давать разбор",
        "⚖️ Отслеживать вес и замеры тела",
        "🧠 Отвечать на вопросы по питанию",
        "🍽 Подбирать меню на день",
        "🛒 Проверять состав продуктов в магазине",
        "",
        "🚀 С чего начать:",
        "",
        "Нажми «Настроить профиль» — я рассчитаю твою норму",
        "Добавь первый прием пищи",
        "Загляни в «Мой кабинет», чтобы увидеть результат",
        "",
        "👇 Начни прямо сейчас — добавь свою первую еду",
        "",
        `Текущий профиль: ${profile.display_name}`
      ].join("\n"),
      createHomeMenu(profile)
    );
  }

  async function showStartGuide(ctx) {
    const profile = databaseService.ensureUser(ctx.from);
    return ctx.reply(
      [
        "С чего лучше начать:",
        "",
        "1. Настроить профиль. Я спрошу рост, вес, возраст, активность и цель.",
        "2. После этого смогу лучше оценивать дневник и давать советы.",
        "",
        profile.daily_calories
          ? `Похоже, профиль уже настроен. Текущая норма: ${profile.daily_calories} ккал.`
          : "Профиль пока не настроен. Это лучший первый шаг."
      ].join("\n"),
      createStartMenu(profile)
    );
  }

  async function showAddFoodGuide(ctx) {
    return ctx.reply(
      [
        "Как добавить еду:",
        "",
        "Фото еды: если хочешь, чтобы бот сам распознал блюдо по изображению.",
        "Текстом: если проще написать, что ты съел, например «курица, рис и салат»."
      ].join("\n"),
      createAddFoodMenu()
    );
  }

  async function showDayGuide(ctx) {
    return ctx.reply(
      [
        "Раздел «Мой кабинет» поможет быстро понять, что происходит сегодня.",
        "",
        "Сводка за сегодня: сколько уже съедено калорий и БЖУ.",
        "Разбор питания: короткая оценка качества дневника.",
        "Вес: чтобы добавить новое значение.",
        "Журнал веса: чтобы посмотреть все последние записи.",
        "Замеры: чтобы регулярно вести журнал объемов.",
        "Прогресс: чтобы видеть изменения по весу и объемам."
      ].join("\n"),
      createDayMenu()
    );
  }

  async function showMoreGuide(ctx) {
    return ctx.reply(
      [
        "Здесь дополнительные полезные функции:",
        "",
        "Меню на день: готовый рацион под твой профиль.",
        "История записей: последние приемы пищи и возможность удалить лишнее.",
        "Подписка: статус доступа и информация по тарифу.",
        "Задать вопрос нутрициологу: можно спросить про питание, белок, дефицит, продукты и т.д."
      ].join("\n"),
      createMoreMenu()
    );
  }

  async function showSubscription(ctx) {
    const { access } = getProfileAndAccess(ctx);
    return ctx.reply(
      [
        formatAccessStatus(access),
        "",
        `Оплата в Telegram: ${billingConfig.subscriptionPriceXtr} Stars за ${Math.round(billingConfig.subscriptionPeriodSeconds / 86400)} дней.`,
        billingConfig.paySupportText
      ].join("\n"),
      createSubscriptionMenu()
    );
  }

  async function sendSubscriptionLink(ctx) {
    const invoiceLink = await createSubscriptionInvoiceLink(ctx);
    return ctx.reply(
      [
        "Готово, вот ссылка на оформление подписки.",
        `Стоимость: ${billingConfig.subscriptionPriceXtr} Stars.`,
        "",
        "После успешной оплаты доступ продлится автоматически."
      ].join("\n"),
      Markup.inlineKeyboard([
        [Markup.button.url("Оплатить подписку", invoiceLink)],
        [Markup.button.callback("Проверить статус", "menu:subscription")]
      ])
    );
  }

  async function showProfile(ctx) {
    const { profile, access } = getProfileAndAccess(ctx);
    return ctx.reply([formatProfile(profile), "", formatAccessStatus(access)].join("\n"), createStartMenu(profile));
  }

  async function showTargets(ctx) {
    const { profile } = getProfileAndAccess(ctx);
    return ctx.reply(formatTargets(profile), createTargetsMenu());
  }

  async function promptTargetsMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "targets");
    pendingContext.delete(String(ctx.from.id));
    return ctx.reply(
      [
        "Отправь норму в формате:",
        "калории | белки | жиры | углеводы",
        "",
        "Пример:",
        "2200 | 150 | 70 | 220"
      ].join("\n"),
      createTargetsMenu()
    );
  }

  async function showToday(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const summary = databaseService.getTodaySummary(ctx.from.id);
    return ctx.reply(formatTodaySummary(summary), createDayMenu());
  }

  async function showHistory(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const history = databaseService.getRecentMeals(ctx.from.id, 10);
    return ctx.reply(formatRecentMeals(history), createHistoryMenu(history?.meals || []));
  }

  async function showWeight(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const history = databaseService.getWeightLogs(ctx.from.id, 10);
    return ctx.reply(formatWeightHistory(history), createDayMenu());
  }

  async function showProgress(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const weightProgress = databaseService.getWeightProgress(ctx.from.id);
    const measurementProgress = databaseService.getMeasurementProgress(ctx.from.id);
    return ctx.reply(formatProgress(weightProgress, measurementProgress), createDayMenu());
  }

  async function showMeasure(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const history = databaseService.getMeasurementLogs(ctx.from.id, 10);
    return ctx.reply(formatMeasurementHistory(history), createDayMenu());
  }

async function promptNextMeal(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const summary = databaseService.getTodaySummary(ctx.from.id);
    return ctx.reply(
      [
        "Подберу, что ты еще можешь съесть сегодня, по твоему дневнику.",
        "",
        formatRemainingForNextMeal(summary),
        "",
        "Сначала выбери, что именно тебе нужно."
      ].join("\n"),
      createNextMealTypeMenu(summary)
    );
  }

  async function sendNextMealSuggestion(ctx, nextMealType, style) {
    if (!(await requireActiveAccess(ctx))) return;
    const profile = databaseService.ensureUser(ctx.from);
    const summary = databaseService.getTodaySummary(ctx.from.id);

    if (!profile.daily_calories) {
      return ctx.reply(
        "Чтобы я мог точно подобрать следующий прием пищи, сначала настрой профиль и дневную норму.",
        createStartMenu(profile)
      );
    }

    if (!summary || summary.meals.length === 0) {
      return ctx.reply(
        "Пока не из чего подбирать следующий прием пищи. Сначала добавь хотя бы один прием пищи за сегодня.",
        createAddFoodMenu()
      );
    }

    await ctx.reply(`Считаю остаток по дню и подбираю ${mealTypeOptions[nextMealType] || "следующий прием пищи"}...`);
    const answer = await nutritionService.suggestNextMeal(profile, summary, {
      nextMealType: mealTypeOptions[nextMealType] || "прием пищи",
      style: nextMealStyles[style] || nextMealStyles.balanced
    });

    return ctx.reply(answer, createNextMealResultMenu(nextMealType, style));
  }

  async function startProfileSetup(ctx) {
    databaseService.ensureUser(ctx.from);
    pendingMode.delete(String(ctx.from.id));
    profileWizard.set(String(ctx.from.id), { step: "display_name", draft: {} });

    await ctx.reply(
      [
        "Запускаю настройку профиля.",
        "Я задам несколько простых вопросов и сам посчитаю ориентировочную норму калорий и БЖУ."
      ].join("\n"),
      Markup.inlineKeyboard([[Markup.button.callback("Отмена", "menu:cancel_setup")]])
    );

    return ctx.reply(createWizardPrompt("display_name", {}));
  }

  async function promptQuestionMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "ask");
    pendingContext.delete(String(ctx.from.id));
    return ctx.reply("Напиши свой вопрос по питанию. Например: «как добрать белок без протеина?»", createMoreMenu());
  }

  async function promptMealTextMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "meal_text");
    pendingContext.delete(String(ctx.from.id));
    return ctx.reply("Опиши, что ты съел. Например: «съел курицу, рис и салат».", createAddFoodMenu());
  }

  async function promptLabelMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "label_photo");
    pendingContext.delete(String(ctx.from.id));
    return ctx.reply(
      "Пришли фото этикетки или состава продукта, и я коротко разберу КБЖУ, состав и скажу, стоит ли покупать.",
      createAddFoodMenu()
    );
  }

  async function promptWeightMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "weight");
    pendingContext.delete(String(ctx.from.id));
    return ctx.reply("Отправь текущий вес числом в килограммах. Например: 76.4", createDayMenu());
  }

  async function promptMeasurementMode(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    profileWizard.delete(String(ctx.from.id));
    pendingMode.set(String(ctx.from.id), "measurement");
    pendingContext.delete(String(ctx.from.id));
    const history = databaseService.getMeasurementLogs(ctx.from.id, 5);
    return ctx.reply(
      [
        formatMeasurementHistory(history),
        "",
        "Чтобы добавить новые замеры, отправь одним сообщением. Пример: талия 82, нога 56, рука 31"
      ].join("\n"),
      createDayMenu()
    );
  }

  async function saveTextMeal(ctx, description) {
    if (!(await requireActiveAccess(ctx))) return;
    const profile = databaseService.ensureUser(ctx.from);
    const report = await nutritionService.analyzeMealText(description);
    const savedEntry = databaseService.saveMealEntry({
      user_id: profile.id,
      telegram_message_id: ctx.message.message_id,
      image_file_id: null,
      dish_name: report.dishName,
      meal_type: "не указано",
      estimated_weight_grams: report.estimatedWeightGrams,
      calories: report.calories,
      protein: report.protein,
      fat: report.fat,
      carbs: report.carbs,
      confidence: report.confidence,
      ingredients: report.ingredients,
      assumptions: report.assumptions,
      advice: report.advice
    });

    await ctx.reply(
      [
        formatNutritionReport(report, savedEntry.meal_type || "не указано"),
        "",
        `Запись #${savedEntry.id} добавлена в дневник.`,
        "Теперь выбери тип приема пищи."
      ].join("\n"),
      createMealTypeMenu(savedEntry.id)
    );
  }

  async function answerQuestion(ctx, question) {
    if (!(await requireActiveAccess(ctx))) return;
    const profile = databaseService.ensureUser(ctx.from);
    const answer = await nutritionService.answerNutritionQuestion(question, profile);
    await ctx.reply(answer, createMoreMenu());
  }

  async function sendMealPlan(ctx, period) {
    if (!(await requireActiveAccess(ctx))) return;
    const profile = databaseService.ensureUser(ctx.from);
    await ctx.reply(`Составляю меню на ${period}...`);
    const plan = await nutritionService.generateMealPlan(profile, period);
    await ctx.reply(plan, createMoreMenu());
  }

  async function sendDietQuality(ctx) {
    if (!(await requireActiveAccess(ctx))) return;
    const profile = databaseService.ensureUser(ctx.from);
    const summary = databaseService.getTodaySummary(ctx.from.id);

    if (!summary || summary.meals.length === 0) {
      return ctx.reply("Пока не из чего делать разбор. Сначала добавь хотя бы один прием пищи за сегодня.", createDayMenu());
    }

    await ctx.reply("Смотрю на твой дневник за сегодня и готовлю разбор...");
    const review = await nutritionService.evaluateDietQuality(profile, summary);
    await ctx.reply(review, createDayMenu());
  }

  async function continueWizardWithText(ctx) {
    const state = profileWizard.get(String(ctx.from.id));
    if (!state) {
      return false;
    }

    const text = ctx.message.text.trim();

    if (state.step === "display_name") {
      state.draft.display_name = text;
      state.step = "sex";
      profileWizard.set(String(ctx.from.id), state);
      await ctx.reply(createWizardPrompt(state.step, state.draft), createSexMenu());
      return true;
    }

    if (state.step === "sex") {
      await ctx.reply("Для этого шага используй кнопки выбора пола ниже.", createSexMenu());
      return true;
    }

    if (state.step === "activity") {
      await ctx.reply("Для этого шага используй кнопки выбора активности ниже.", createActivityMenu());
      return true;
    }

    if (state.step === "goal") {
      await ctx.reply("Для этого шага используй кнопки выбора цели ниже.", createGoalMenu());
      return true;
    }

    const numericValue = numericFromText(text);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      await ctx.reply("Нужно отправить число больше 0. Попробуй еще раз.");
      return true;
    }

    if (state.step === "age") {
      if (numericValue < 10 || numericValue > 100) {
        await ctx.reply("Возраст должен быть в разумных пределах, например 25.");
        return true;
      }
      state.draft.age = round(numericValue);
      state.step = "height";
      profileWizard.set(String(ctx.from.id), state);
      await ctx.reply(createWizardPrompt(state.step, state.draft));
      return true;
    }

    if (state.step === "height") {
      if (numericValue < 120 || numericValue > 250) {
        await ctx.reply("Рост лучше указать в сантиметрах, например 178.");
        return true;
      }
      state.draft.height = numericValue;
      state.step = "weight";
      profileWizard.set(String(ctx.from.id), state);
      await ctx.reply(createWizardPrompt(state.step, state.draft));
      return true;
    }

    if (state.step === "weight") {
      if (numericValue < 30 || numericValue > 300) {
        await ctx.reply("Вес лучше указать в килограммах, например 76.");
        return true;
      }
      state.draft.weight = numericValue;
      state.step = "activity";
      profileWizard.set(String(ctx.from.id), state);
      await ctx.reply(createWizardPrompt(state.step, state.draft), createActivityMenu());
      return true;
    }

    return false;
  }

  bot.start(showHome);

  bot.help((ctx) =>
    ctx.reply(
      [
        "Я постарался упростить навигацию.",
        "",
        "Начать: настройка профиля и нормы, если профиль еще не заполнен.",
        "Добавить еду: фото, этикетка или текст.",
        "Мой кабинет: сводка, вес, замеры и прогресс.",
        "Еще: меню на день, история, подписка и вопросы.",
        "",
        "Команды по оплате: /subscription, /buy, /support, /terms"
      ].join("\n"),
      createHomeMenu(databaseService.ensureUser(ctx.from))
    )
  );

  bot.command("profile", showProfile);
  bot.command("targets", showTargets);
  bot.command("settargets", async (ctx) => {
    if (!(await requireActiveAccess(ctx))) return;
    const payload = ctx.message.text.replace("/settargets", "").trim();
    if (!payload) {
      return promptTargetsMode(ctx);
    }

    const parsed = parseTargetsCommand(payload);
    if (!parsed) {
      return ctx.reply(
        [
          "Формат команды:",
          "/settargets калории | белки | жиры | углеводы",
          "Пример:",
          "/settargets 2200 | 150 | 70 | 220"
        ].join("\n"),
        createTargetsMenu()
      );
    }

    const profile = databaseService.ensureUser(ctx.from);
    const updatedProfile = databaseService.updateUserProfile({
      telegram_user_id: String(ctx.from.id),
      display_name: profile.display_name,
      goal: profile.goal,
      ...parsed
    });

    return ctx.reply(`Норма КБЖУ обновлена.\n\n${formatTargets(updatedProfile)}`, createTargetsMenu());
  });
  bot.command("today", showToday);
  bot.command("history", showHistory);
  bot.command("setup", startProfileSetup);
  bot.command("progress", showProgress);
  bot.command("quality", sendDietQuality);
  bot.command("adminstats", showAdminStats);
  bot.command("nextmeal", async (ctx) => {
    if (!(await requireActiveAccess(ctx))) return;
    const payload = ctx.message.text.replace("/nextmeal", "").trim().toLowerCase();

    if (!payload) {
      return promptNextMeal(ctx);
    }

    let nextMealType = "dinner";
    if (payload.includes("завт")) nextMealType = "breakfast";
    if (payload.includes("обед")) nextMealType = "lunch";
    if (payload.includes("ужин")) nextMealType = "dinner";
    if (payload.includes("перекус")) nextMealType = "snack";
    let style = "balanced";
    if (payload.includes("белк")) style = "protein";
    if (payload.includes("быстр")) style = "quick";
    if (payload.includes("деш")) style = "budget";
    if (payload.includes("легк")) style = "light";

    return sendNextMealSuggestion(ctx, nextMealType, style);
  });
  bot.command("subscription", showSubscription);
  bot.command("buy", sendSubscriptionLink);
  bot.command("paysupport", (ctx) => ctx.reply(billingConfig.paySupportText, createSubscriptionMenu()));
  bot.command("support", (ctx) => ctx.reply(billingConfig.paySupportText, createSubscriptionMenu()));
  bot.command("terms", (ctx) => ctx.reply(billingConfig.termsText, createSubscriptionMenu()));
  bot.command("measurelog", showMeasure);
  bot.command("measure", async (ctx) => {
    const payload = ctx.message.text.replace("/measure", "").trim();
    if (!payload) {
      return promptMeasurementMode(ctx);
    }

    if (!(await requireActiveAccess(ctx))) return;

    const measurement = parseMeasurementText(payload);
    if (!measurement.waist && !measurement.thigh && !measurement.arm) {
      return ctx.reply("Не смог понять замеры. Пример: `/measure талия 82, нога 56, рука 31`", createDayMenu());
    }

    const log = databaseService.saveMeasurementLog(ctx.from.id, measurement);
    if (!log) {
      return ctx.reply("Не удалось сохранить замеры. Попробуй еще раз.", createDayMenu());
    }

    return ctx.reply("Замеры сохранены в журнал.", createDayMenu());
  });

  bot.command("menu", async (ctx) => {
    if (!(await requireActiveAccess(ctx))) return;
    const period = ctx.message.text.replace("/menu", "").trim() || "день";
    return sendMealPlan(ctx, period);
  });

  bot.command("weight", async (ctx) => {
    const payload = ctx.message.text.replace("/weight", "").trim();
    if (!payload) {
      return promptWeightMode(ctx);
    }

    if (!(await requireActiveAccess(ctx))) return;

    const weightValue = numericFromText(payload.split(" ")[0]);
    if (Number.isNaN(weightValue) || weightValue < 30 || weightValue > 300) {
      return ctx.reply("Вес нужно указать числом в килограммах. Например: `/weight 76.4`", createDayMenu());
    }

    const log = databaseService.saveWeightLog(ctx.from.id, weightValue);
    return ctx.reply(`Вес сохранен: ${Number(log.weight).toFixed(1)} кг`, createDayMenu());
  });

  bot.command("meal", async (ctx) => {
    const description = ctx.message.text.replace("/meal", "").trim();
    if (!description) {
      return promptMealTextMode(ctx);
    }

    if (!(await requireActiveAccess(ctx))) return;
    pendingMode.delete(String(ctx.from.id));
    await ctx.reply("Разбираю текстовое описание еды и считаю КБЖУ...");
    return saveTextMeal(ctx, description);
  });

  bot.command("ask", async (ctx) => {
    const question = ctx.message.text.replace("/ask", "").trim();
    if (!question) {
      return promptQuestionMode(ctx);
    }

    if (!(await requireActiveAccess(ctx))) return;
    pendingMode.delete(String(ctx.from.id));
    await ctx.reply("Думаю над ответом...");
    return answerQuestion(ctx, question);
  });

  bot.command("clearme", (ctx) => {
    const payload = ctx.message.text.replace("/clearme", "").trim();

    if (payload !== "CONFIRM") {
      return ctx.reply(
        [
          "Эта команда очистит только твои тестовые данные:",
          "- приемы пищи",
          "- вес",
          "- замеры",
          "",
          "Профиль останется на месте.",
          "Если точно хочешь очистить журнал, отправь:",
          "/clearme CONFIRM"
        ].join("\n"),
        createDayMenu()
      );
    }

    const result = databaseService.clearUserJournal(ctx.from.id);
    if (!result) {
      return ctx.reply("Не удалось найти профиль для очистки.", createDayMenu());
    }

    return ctx.reply(
      [
        "Твои тестовые данные очищены.",
        `Приемы пищи: ${result.mealsDeleted}`,
        `Вес: ${result.weightsDeleted}`,
        `Замеры: ${result.measurementsDeleted}`
      ].join("\n"),
      createDayMenu()
    );
  });

  bot.command("setprofile", (ctx) => {
    databaseService.ensureUser(ctx.from);
    const parsed = parseProfileCommand(ctx.message.text);

    if (!parsed || [parsed.daily_calories, parsed.daily_protein, parsed.daily_fat, parsed.daily_carbs].some((value) => Number.isNaN(value))) {
      return ctx.reply(
        [
          "Формат команды:",
          "/setprofile Имя | цель | калории | белки | жиры | углеводы",
          "Пример:",
          "/setprofile Евгений | снижение веса | 2200 | 150 | 70 | 220"
        ].join("\n"),
        createStartMenu(databaseService.ensureUser(ctx.from))
      );
    }

    const updatedProfile = databaseService.updateUserProfile({ telegram_user_id: String(ctx.from.id), ...parsed });
    return ctx.reply(`Профиль обновлен вручную.\n\n${formatProfile(updatedProfile)}`, createStartMenu(updatedProfile));
  });

  bot.action("menu:home", async (ctx) => { await ctx.answerCbQuery(); await showHome(ctx); });
  bot.action("guide:start", async (ctx) => { await ctx.answerCbQuery(); await showStartGuide(ctx); });
  bot.action("guide:add_food", async (ctx) => { await ctx.answerCbQuery(); await showAddFoodGuide(ctx); });
  bot.action("guide:day", async (ctx) => { await ctx.answerCbQuery(); await showDayGuide(ctx); });
  bot.action("guide:more", async (ctx) => { await ctx.answerCbQuery(); await showMoreGuide(ctx); });
  bot.action("guide:add_food_photo", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "Теперь пришли фото еды следующим сообщением. Перед отправкой фото рекомендуем добавить комментарий-уточнение, что именно на тарелке, если продукт неочевиден — так результат будет точнее.",
      createAddFoodMenu()
    );
  });
  bot.action("guide:label_photo", async (ctx) => {
    await ctx.answerCbQuery();
    await promptLabelMode(ctx);
  });

  bot.action("menu:profile", async (ctx) => { await ctx.answerCbQuery(); await showProfile(ctx); });
  bot.action("menu:targets", async (ctx) => { await ctx.answerCbQuery(); await showTargets(ctx); });
  bot.action("menu:edit_targets", async (ctx) => { await ctx.answerCbQuery(); await promptTargetsMode(ctx); });
  bot.action("menu:today", async (ctx) => { await ctx.answerCbQuery(); await showToday(ctx); });
  bot.action("menu:history", async (ctx) => { await ctx.answerCbQuery(); await showHistory(ctx); });
  bot.action("menu:subscription", async (ctx) => { await ctx.answerCbQuery(); await showSubscription(ctx); });
  bot.action("menu:buy_subscription", async (ctx) => { await ctx.answerCbQuery(); await sendSubscriptionLink(ctx); });
  bot.action("menu:setup", async (ctx) => { await ctx.answerCbQuery(); await startProfileSetup(ctx); });
  bot.action("menu:meal_text", async (ctx) => { await ctx.answerCbQuery(); await promptMealTextMode(ctx); });
  bot.action("menu:ask", async (ctx) => { await ctx.answerCbQuery(); await promptQuestionMode(ctx); });
  bot.action("menu:weight", async (ctx) => { await ctx.answerCbQuery(); await promptWeightMode(ctx); });
  bot.action("menu:weight_history", async (ctx) => { await ctx.answerCbQuery(); await showWeight(ctx); });
  bot.action("menu:measure", async (ctx) => { await ctx.answerCbQuery(); await promptMeasurementMode(ctx); });
  bot.action("menu:progress", async (ctx) => { await ctx.answerCbQuery(); await showProgress(ctx); });
  bot.action("menu:mealplan", async (ctx) => { await ctx.answerCbQuery(); await sendMealPlan(ctx, "день"); });
  bot.action("menu:quality", async (ctx) => { await ctx.answerCbQuery(); await sendDietQuality(ctx); });
  bot.action("menu:next_meal", async (ctx) => { await ctx.answerCbQuery(); await promptNextMeal(ctx); });

  bot.action(/nextmealtype:(.+)/, async (ctx) => {
    const nextMealType = ctx.match[1];
    if (!["breakfast", "lunch", "dinner", "snack"].includes(nextMealType)) {
      await ctx.answerCbQuery("Неизвестный вариант");
      return;
    }

    await ctx.answerCbQuery(`Подберем: ${mealTypeOptions[nextMealType] || "прием пищи"}`);
    await ctx.reply(
      [
        `Выбрано: ${mealTypeOptions[nextMealType] || "прием пищи"}.`,
        "Теперь выбери, в каком стиле подобрать варианты."
      ].join("\n"),
      createNextMealStyleMenu(nextMealType)
    );
  });

  bot.action(/nextmeal:(.+):(.+)/, async (ctx) => {
    const nextMealType = ctx.match[1];
    const style = ctx.match[2];

    if (!["breakfast", "lunch", "dinner", "snack"].includes(nextMealType) || !nextMealStyles[style]) {
      await ctx.answerCbQuery("Неизвестный вариант");
      return;
    }

    await ctx.answerCbQuery("Подбираю варианты");
    await sendNextMealSuggestion(ctx, nextMealType, style);
  });

  bot.action("menu:cancel_setup", async (ctx) => {
    profileWizard.delete(String(ctx.from.id));
    pendingMode.delete(String(ctx.from.id));
    await ctx.answerCbQuery("Настройка отменена");
    await ctx.reply("Ок, текущий сценарий остановил.", createHomeMenu(databaseService.ensureUser(ctx.from)));
  });

  bot.action(/sex:(.+)/, async (ctx) => {
    const state = profileWizard.get(String(ctx.from.id));
    const selectedSex = sexOptions[ctx.match[1]];
    if (!state || state.step !== "sex") {
      await ctx.answerCbQuery("Сначала запусти настройку профиля");
      return;
    }
    if (!selectedSex) {
      await ctx.answerCbQuery("Неизвестный вариант");
      return;
    }

    state.draft.sex = ctx.match[1];
    state.step = "age";
    profileWizard.set(String(ctx.from.id), state);
    await ctx.answerCbQuery(`Пол: ${selectedSex.label}`);
    await ctx.reply(createWizardPrompt(state.step, state.draft));
  });

  bot.action(/activity:(.+)/, async (ctx) => {
    const state = profileWizard.get(String(ctx.from.id));
    const selectedActivity = activityOptions[ctx.match[1]];
    if (!state || state.step !== "activity") {
      await ctx.answerCbQuery("Сначала запусти настройку профиля");
      return;
    }
    if (!selectedActivity) {
      await ctx.answerCbQuery("Неизвестный вариант");
      return;
    }

    state.draft.activity = ctx.match[1];
    state.step = "goal";
    profileWizard.set(String(ctx.from.id), state);
    await ctx.answerCbQuery(`Активность: ${selectedActivity.label}`);
    await ctx.reply(createWizardPrompt(state.step, state.draft), createGoalMenu());
  });

  bot.action(/goal:(.+)/, async (ctx) => {
    const state = profileWizard.get(String(ctx.from.id));
    const selectedGoal = goalOptions[ctx.match[1]];
    if (!state || state.step !== "goal") {
      await ctx.answerCbQuery("Сначала запусти настройку профиля");
      return;
    }
    if (!selectedGoal) {
      await ctx.answerCbQuery("Неизвестная цель");
      return;
    }

    state.draft.goal = ctx.match[1];
    const targets = calculateTargets(state.draft);
    const updatedProfile = databaseService.updateUserProfile(buildProfileFromDraft(ctx.from.id, state.draft, targets));
    profileWizard.delete(String(ctx.from.id));

    await ctx.answerCbQuery(`Цель: ${selectedGoal.label}`);
    await ctx.reply(
      [
        "Готово, я рассчитал твою ориентировочную норму.",
        `Пол: ${sexOptions[state.draft.sex].label}`,
        `Возраст: ${state.draft.age}`,
        `Рост: ${state.draft.height} см`,
        `Вес: ${state.draft.weight} кг`,
        `Активность: ${activityOptions[state.draft.activity].label}`,
        "",
        formatProfile(updatedProfile)
      ].join("\n"),
      createStartMenu(updatedProfile)
    );
  });

  bot.action(/mealtype:(\d+):(.+)/, async (ctx) => {
    const entryId = Number(ctx.match[1]);
    const mealType = mealTypeOptions[ctx.match[2]];
    if (!mealType) {
      await ctx.answerCbQuery("Неизвестный тип приема пищи");
      return;
    }

    const updatedEntry = databaseService.updateMealType(ctx.from.id, entryId, mealType);
    if (!updatedEntry) {
      await ctx.answerCbQuery("Запись не найдена");
      return;
    }

    await ctx.answerCbQuery(`Тип: ${mealType}`);
    await ctx.reply(`Запись #${updatedEntry.id} обновлена. Тип приема пищи: ${mealType}.`, createAddFoodMenu());
  });

  bot.action(/mealfix:(\d+)/, async (ctx) => {
    const entryId = Number(ctx.match[1]);
    const entry = databaseService.getMealEntryForUser(ctx.from.id, entryId);
    if (!entry) {
      await ctx.answerCbQuery("Запись не найдена");
      return;
    }

    const deleted = databaseService.deleteMealEntry(ctx.from.id, entryId);
    if (!deleted) {
      await ctx.answerCbQuery("Не удалось удалить запись");
      return;
    }

    pendingMode.set(String(ctx.from.id), "meal_correction");
    pendingContext.set(String(ctx.from.id), { imageFileId: entry.image_file_id });
    await ctx.answerCbQuery("Запись удалена");
    await ctx.reply(
      "Ошибочную запись убрал из журнала. Теперь напиши уточнение, что именно было на тарелке, и я пересчитаю по тому же фото.",
      createAddFoodMenu()
    );
  });

  bot.action(/delete:(\d+)/, async (ctx) => {
    const entryId = Number(ctx.match[1]);
    const deleted = databaseService.deleteMealEntry(ctx.from.id, entryId);
    if (!deleted) {
      await ctx.answerCbQuery("Запись не найдена");
      return;
    }

    await ctx.answerCbQuery("Запись удалена");
    await ctx.reply(`Запись #${entryId} удалена из дневника.`, createMoreMenu());
  });

  bot.on("pre_checkout_query", async (ctx) => {
    try {
      await ctx.answerPreCheckoutQuery(true);
    } catch (error) {
      console.error("Failed to answer pre_checkout_query:", error);
    }
  });

  bot.on("photo", async (ctx) => {
    if (!(await requireActiveAccess(ctx))) return;
    const currentMode = pendingMode.get(String(ctx.from.id));
    pendingMode.delete(String(ctx.from.id));
    pendingContext.delete(String(ctx.from.id));
    const profile = databaseService.ensureUser(ctx.from);

    try {
      const photo = ctx.message.photo.at(-1);
      if (!photo?.file_id) {
        throw new Error("Missing photo file_id");
      }

      const imageUrl = await getTelegramFileUrl(telegramBotToken, photo.file_id);

      if (currentMode === "label_photo") {
        await ctx.reply("Смотрю на этикетку и готовлю короткий разбор...");
        const report = await nutritionService.analyzeProductLabel(imageUrl, profile);
        await ctx.reply(formatLabelReport(report), createAddFoodMenu());
        return;
      }

      const clarification = ctx.message.caption?.trim() || "";
      await ctx.reply("Смотрю на фото, считаю КБЖУ и записываю прием пищи...");
      const report = await nutritionService.analyzeMealImage(imageUrl, clarification);
      const savedEntry = databaseService.saveMealEntry({
        user_id: profile.id,
        telegram_message_id: ctx.message.message_id,
        image_file_id: photo.file_id,
        dish_name: report.dishName,
        meal_type: "не указано",
        estimated_weight_grams: report.estimatedWeightGrams,
        calories: report.calories,
        protein: report.protein,
        fat: report.fat,
        carbs: report.carbs,
        confidence: report.confidence,
        ingredients: report.ingredients,
        assumptions: report.assumptions,
        advice: report.advice
      });

      await ctx.reply(
        [
          formatNutritionReport(report, savedEntry.meal_type || "не указано"),
          "",
          `Запись #${savedEntry.id} добавлена в дневник.`,
          "Теперь выбери тип приема пищи."
        ].join("\n"),
        createMealTypeMenu(savedEntry.id)
      );
    } catch (error) {
      console.error("Failed to analyze meal photo:", error);
      await ctx.reply("Не получилось обработать фото. Попробуй отправить более четкий снимок или проверь токены в `.env`.", createAddFoodMenu());
    }
  });

  bot.on("text", async (ctx) => {
    const handledByWizard = await continueWizardWithText(ctx);
    if (handledByWizard) {
      return;
    }

    const currentMode = pendingMode.get(String(ctx.from.id));

    if (currentMode === "meal_text") {
      if (!(await requireActiveAccess(ctx))) return;
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));
      await ctx.reply("Разбираю текстовое описание еды и считаю КБЖУ...");
      return saveTextMeal(ctx, ctx.message.text.trim());
    }

    if (currentMode === "ask") {
      if (!(await requireActiveAccess(ctx))) return;
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));
      await ctx.reply("Думаю над ответом...");
      return answerQuestion(ctx, ctx.message.text.trim());
    }

    if (currentMode === "weight") {
      if (!(await requireActiveAccess(ctx))) return;
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));
      const weightValue = numericFromText(ctx.message.text.trim());
      if (Number.isNaN(weightValue) || weightValue < 30 || weightValue > 300) {
        return ctx.reply("Вес нужно отправить числом в килограммах. Например: 76.4", createDayMenu());
      }

      const log = databaseService.saveWeightLog(ctx.from.id, weightValue);
      return ctx.reply(`Вес сохранен: ${Number(log.weight).toFixed(1)} кг`, createDayMenu());
    }

    if (currentMode === "measurement") {
      if (!(await requireActiveAccess(ctx))) return;
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));
      const measurement = parseMeasurementText(ctx.message.text.trim());
      if (!measurement.waist && !measurement.thigh && !measurement.arm) {
        return ctx.reply(
          "Не смог разобрать замеры. Напиши, например: талия 82, нога 56, рука 31",
          createDayMenu()
        );
      }

      databaseService.saveMeasurementLog(ctx.from.id, measurement);
      return ctx.reply("Замеры сохранены в журнал.", createDayMenu());
    }

    if (currentMode === "targets") {
      if (!(await requireActiveAccess(ctx))) return;
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));
      const parsed = parseTargetsCommand(ctx.message.text.trim());
      if (!parsed) {
        return ctx.reply(
          [
            "Не смог разобрать норму.",
            "Используй формат:",
            "калории | белки | жиры | углеводы",
            "",
            "Пример: 2200 | 150 | 70 | 220"
          ].join("\n"),
          createTargetsMenu()
        );
      }

      const profile = databaseService.ensureUser(ctx.from);
      const updatedProfile = databaseService.updateUserProfile({
        telegram_user_id: String(ctx.from.id),
        display_name: profile.display_name,
        goal: profile.goal,
        ...parsed
      });

      return ctx.reply(`Норма КБЖУ обновлена.\n\n${formatTargets(updatedProfile)}`, createTargetsMenu());
    }

    if (currentMode === "meal_correction") {
      if (!(await requireActiveAccess(ctx))) return;
      const context = pendingContext.get(String(ctx.from.id));
      pendingMode.delete(String(ctx.from.id));
      pendingContext.delete(String(ctx.from.id));

      if (!context?.imageFileId) {
        return ctx.reply("Не нашел фото для повторного разбора. Пришли фото еды заново.", createAddFoodMenu());
      }

      await ctx.reply("Уточнение получил, пересчитываю блюдо...");
      try {
        const profile = databaseService.ensureUser(ctx.from);
        const imageUrl = await getTelegramFileUrl(telegramBotToken, context.imageFileId);
        const report = await nutritionService.analyzeMealImage(imageUrl, ctx.message.text.trim());
        const savedEntry = databaseService.saveMealEntry({
          user_id: profile.id,
          telegram_message_id: ctx.message.message_id,
          image_file_id: context.imageFileId,
          dish_name: report.dishName,
          meal_type: "не указано",
          estimated_weight_grams: report.estimatedWeightGrams,
          calories: report.calories,
          protein: report.protein,
          fat: report.fat,
          carbs: report.carbs,
          confidence: report.confidence,
          ingredients: report.ingredients,
          assumptions: report.assumptions,
          advice: report.advice
        });

        return ctx.reply(
          [
            formatNutritionReport(report, savedEntry.meal_type || "не указано"),
            "",
            `Запись #${savedEntry.id} добавлена в дневник.`,
            "Теперь выбери тип приема пищи."
          ].join("\n"),
          createMealTypeMenu(savedEntry.id)
        );
      } catch (error) {
        console.error("Failed to re-analyze corrected meal photo:", error);
        return ctx.reply("Не получилось пересчитать блюдо. Попробуй прислать фото еще раз с уточнением в подписи.", createAddFoodMenu());
      }
    }

    const profile = databaseService.ensureUser(ctx.from);
    return ctx.reply(
      [
        "Чтобы было проще, начни с одной из кнопок ниже.",
        "",
        profile.daily_calories ? "Профиль уже настроен, так что можно сразу добавлять еду или смотреть свой день." : "Начать: настройка профиля.",
        "Добавить еду: фото или текст.",
        "Мой кабинет: сводка, вес, замеры и прогресс.",
        "Еще: меню, история, подписка и вопросы."
      ].join("\n"),
      createHomeMenu(profile)
    );
  });

  bot.on("successful_payment", async (ctx) => {
    const syncResult = databaseService.syncSubscriptionFromTelegramPayment(ctx.from.id, ctx.message.successful_payment);
    const access = databaseService.getAccessStatus(ctx.from.id);

    await ctx.reply(
      [
        "Оплата прошла успешно.",
        `Подписка активна до: ${formatDate(syncResult?.subscriptionUntil || access?.subscriptionEndsAt)}`,
        "",
        "Теперь тебе снова доступны анализ еды, дневник, прогресс, меню и вопросы."
      ].join("\n"),
      createMoreMenu()
    );
  });

  bot.on("message", (ctx) =>
    ctx.reply(
      "Используй кнопки ниже, и я проведу тебя по нужному сценарию.",
      createHomeMenu(databaseService.ensureUser(ctx.from))
    )
  );

  return bot;
}
