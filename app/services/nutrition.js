import OpenAI from "openai";

const mealSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dishName: { type: "string" },
    estimatedWeightGrams: { type: "number" },
    calories: { type: "number" },
    protein: { type: "number" },
    fat: { type: "number" },
    carbs: { type: "number" },
    confidence: { type: "string" },
    ingredients: {
      type: "array",
      items: { type: "string" }
    },
    assumptions: {
      type: "array",
      items: { type: "string" }
    },
    advice: { type: "string" }
  },
  required: [
    "dishName",
    "estimatedWeightGrams",
    "calories",
    "protein",
    "fat",
    "carbs",
    "confidence",
    "ingredients",
    "assumptions",
    "advice"
  ]
};

const productLabelSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    productName: { type: "string" },
    servingSize: { type: "string" },
    calories: { type: "number" },
    protein: { type: "number" },
    fat: { type: "number" },
    carbs: { type: "number" },
    sugar: { type: "string" },
    ingredientsSummary: { type: "string" },
    pros: {
      type: "array",
      items: { type: "string" }
    },
    cons: {
      type: "array",
      items: { type: "string" }
    },
    verdict: { type: "string" },
    confidence: { type: "string" }
  },
  required: [
    "productName",
    "servingSize",
    "calories",
    "protein",
    "fat",
    "carbs",
    "sugar",
    "ingredientsSummary",
    "pros",
    "cons",
    "verdict",
    "confidence"
  ]
};

const russianSystemPrompt = [
  "Ты ИИ-нутрициолог и помощник по питанию.",
  "Всегда отвечай только на русском языке.",
  "Никогда не переходи на английский, если пользователь сам явно не попросил об этом.",
  "Если данных мало, честно указывай допущения и не притворяйся полностью уверенным."
].join(" ");

function profileToText(profile) {
  if (!profile) {
    return "Профиль пользователя не заполнен.";
  }

  return [
    `Имя профиля: ${profile.display_name || "не указано"}`,
    `Цель: ${profile.goal || "не указана"}`,
    `Калории: ${profile.daily_calories ?? "не заданы"}`,
    `Белки: ${profile.daily_protein ?? "не заданы"}`,
    `Жиры: ${profile.daily_fat ?? "не заданы"}`,
    `Углеводы: ${profile.daily_carbs ?? "не заданы"}`
  ].join("\n");
}

function mealsToText(summary) {
  if (!summary || !summary.meals || summary.meals.length === 0) {
    return "Сегодня записей о питании пока нет.";
  }

  return [
    `Итого за сегодня: ${Math.round(summary.totals.calories)} ккал, Б ${Math.round(summary.totals.protein)}, Ж ${Math.round(summary.totals.fat)}, У ${Math.round(summary.totals.carbs)}`,
    ...summary.meals.map(
      (meal) =>
        `- ${meal.meal_type || "не указано"}: ${meal.dish_name}, ${Math.round(meal.calories)} ккал, Б ${Math.round(meal.protein)}, Ж ${Math.round(meal.fat)}, У ${Math.round(meal.carbs)}`
    )
  ].join("\n");
}

function remainingToText(profile, summary) {
  const totals = summary?.totals || {};
  const remainingCalories = Number(profile?.daily_calories || 0) - Number(totals.calories || 0);
  const remainingProtein = Number(profile?.daily_protein || 0) - Number(totals.protein || 0);
  const remainingFat = Number(profile?.daily_fat || 0) - Number(totals.fat || 0);
  const remainingCarbs = Number(profile?.daily_carbs || 0) - Number(totals.carbs || 0);

  return [
    `Остаток калорий: ${Math.round(remainingCalories)}`,
    `Остаток белка: ${Math.round(remainingProtein)}`,
    `Остаток жиров: ${Math.round(remainingFat)}`,
    `Остаток углеводов: ${Math.round(remainingCarbs)}`
  ].join("\n");
}

export function createNutritionService({ apiKey, model }) {
  const client = new OpenAI({ apiKey });

  return {
    async analyzeMealImage(imageUrl, clarification = "") {
      const result = await client.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `${russianSystemPrompt} Проанализируй фото еды и оцени калории, белки, жиры и углеводы всей видимой порции. Если на фото несколько продуктов, оцени суммарно. Если пользователь дал пояснение к фото, обязательно учитывай его как важную подсказку.`
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: clarification
                  ? `Проанализируй фото еды и оцени КБЖУ всей порции. Уточнение от пользователя: ${clarification}. Если есть сомнения, прямо укажи это. Верни данные структурированно и только на русском языке.`
                  : "Проанализируй фото еды и оцени КБЖУ всей порции. Если есть сомнения, прямо укажи это. Верни данные структурированно и только на русском языке."
              },
              { type: "input_image", image_url: imageUrl, detail: "high" }
            ]
          }
        ],
        text: { format: { type: "json_schema", name: "meal_analysis", schema: mealSchema, strict: true } }
      });

      return result.output_parsed;
    },

    async analyzeMealText(description) {
      const result = await client.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${russianSystemPrompt} Пользователь описывает еду текстом. Оцени примерную порцию и КБЖУ, если масса не указана, делай разумные допущения и явно отмечай их.` }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Вот описание еды: ${description}` }]
          }
        ],
        text: { format: { type: "json_schema", name: "meal_text_analysis", schema: mealSchema, strict: true } }
      });

      return result.output_parsed;
    },

    async analyzeProductLabel(imageUrl, profile) {
      const result = await client.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `${russianSystemPrompt} Пользователь прислал фото этикетки продукта из магазина. Вытащи из фото название продукта, примерное КБЖУ, кратко оцени состав и дай короткий вердикт: стоит покупать или лучше поискать замену. Если данных на фото не хватает, честно укажи это.`
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Профиль пользователя:\n${profileToText(profile)}\n\nПосмотри на фото этикетки и дай очень короткий практический разбор для покупки в магазине.`
              },
              { type: "input_image", image_url: imageUrl, detail: "high" }
            ]
          }
        ],
        text: { format: { type: "json_schema", name: "product_label_analysis", schema: productLabelSchema, strict: true } }
      });

      return result.output_parsed;
    },

    async answerNutritionQuestion(question, profile) {
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${russianSystemPrompt} Отвечай кратко, полезно и по делу. Если вопрос про питание, рацион, дефицит, белок, похудение или продукты, дай практический совет. Если нужен расчет, опирайся на профиль пользователя, если он заполнен.` }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Профиль пользователя:\n${profileToText(profile)}\n\nВопрос пользователя: ${question}` }]
          }
        ]
      });

      return response.output_text.trim();
    },

    async generateMealPlan(profile, period = "день") {
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${russianSystemPrompt} Составь реалистичное, простое и полезное меню. Используй понятные продукты и короткие рецепты. Если профиль неполный, укажи, что меню ориентировочное.` }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Профиль пользователя:\n${profileToText(profile)}\n\nСоставь меню на ${period}. Для каждого приема пищи укажи блюдо, примерную порцию, калории и короткий рецепт или способ приготовления. В конце дай список простых замен продуктов.` }]
          }
        ]
      });

      return response.output_text.trim();
    },

    async evaluateDietQuality(profile, summary) {
      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${russianSystemPrompt} Оцени качество питания по дневнику. Напиши сильно по делу: что хорошо, что проседает, что поправить сегодня. Используй формулировки вроде 'мало белка', 'перебор жиров', 'не хватает овощей', если это обосновано.` }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: `Профиль пользователя:\n${profileToText(profile)}\n\nДневник за сегодня:\n${mealsToText(summary)}\n\nСделай короткий разбор качества питания и дай 3 понятные рекомендации.` }]
          }
        ]
      });

      return response.output_text.trim();
    },

    async suggestNextMeal(profile, summary, options = {}) {
      const nextMealType = options.nextMealType || "ужин";
      const style = options.style || "сбалансированный";

      const response = await client.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `${russianSystemPrompt} Ты помогаешь подобрать следующий прием пищи на сегодня. Учитывай норму пользователя, уже съеденное за день и остаток по калориям и БЖУ. Ответ должен быть очень практичным: сначала коротко скажи, сколько примерно осталось по калориям и на что сделать упор, затем предложи 3 варианта следующего приема пищи. Для каждого варианта укажи примерное КБЖУ. Отвечай компактно, структурированно и без воды.`
              }
            ]
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Профиль пользователя:\n${profileToText(profile)}`,
                  `Дневник за сегодня:\n${mealsToText(summary)}`,
                  `Остаток на сегодня:\n${remainingToText(profile, summary)}`,
                  `Нужно подобрать: ${nextMealType}`,
                  `Желаемый формат: ${style}`,
                  "",
                  "Сделай ответ в таком духе:",
                  "1. Короткая сводка остатка.",
                  "2. Три варианта еды.",
                  "3. Кому какой вариант лучше подходит.",
                  "4. Если лимит по жирам или углеводам уже почти выбран, явно предупреди."
                ].join("\n\n")
              }
            ]
          }
        ]
      });

      return response.output_text.trim();
    }
  };
}
