import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const requiredKeys = ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY"];

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const railwayVolumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "nutrition-bot.sqlite")
  : null;

export const config = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  port: Number(process.env.PORT || 3000),
  databasePath: process.env.DATABASE_PATH || railwayVolumePath || "./nutrition-bot.sqlite",
  subscriptionPriceXtr: Number(process.env.SUBSCRIPTION_PRICE_XTR || 300),
  subscriptionPeriodSeconds: Number(process.env.SUBSCRIPTION_PERIOD_SECONDS || 2592000),
  subscriptionTitle: process.env.SUBSCRIPTION_TITLE || "Подписка на бота-нутрициолога",
  subscriptionDescription:
    process.env.SUBSCRIPTION_DESCRIPTION ||
    "30 дней доступа к анализу еды, дневнику, прогрессу, меню и вопросам по питанию.",
  paySupportText:
    process.env.PAY_SUPPORT_TEXT ||
    "Если возник вопрос по оплате, напиши владельцу бота или в поддержку проекта.",
  termsText:
    process.env.TERMS_TEXT ||
    "Пользователь получает доступ к функциям бота на оплаченный период. Подписка продлевается через Telegram Stars. Возвраты и спорные ситуации обрабатываются владельцем бота, а не поддержкой Telegram."
};
