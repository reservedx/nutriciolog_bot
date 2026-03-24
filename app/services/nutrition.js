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

export function createNutritionService({ apiKey, model }) {
  const client = new OpenAI({ apiKey });

  return {
    async analyzeMealImage(imageUrl) {
      const result = await client.responses.parse({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: `${russianSystemPrompt} Проанализируй фото еды и оцени калории, белки, жиры и углеводы всей видимой порции. Если на фото несколько продуктов, оцени суммарно.` }]
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Проанализируй фото еды и оцени КБЖУ всей порции. Если есть сомнения, прямо укажи это. Верни данные структурированно и только на русском языке." },
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
    }
  };
}
