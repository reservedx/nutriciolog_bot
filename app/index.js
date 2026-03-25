import { config } from "./config.js";
import { createBot } from "./bot.js";
import { createDatabaseService } from "./database.js";
import { createNutritionService } from "./services/nutrition.js";
import { createWebServer } from "./webServer.js";

async function main() {
  console.log(`Using database path: ${config.databasePath}`);
  const databaseService = await createDatabaseService({
    databasePath: config.databasePath
  });

  const nutritionService = createNutritionService({
    apiKey: config.openaiApiKey,
    model: config.openaiModel
  });

  const bot = createBot({
    telegramBotToken: config.telegramBotToken,
    nutritionService,
    databaseService,
    billingConfig: {
      subscriptionPriceXtr: config.subscriptionPriceXtr,
      subscriptionPeriodSeconds: config.subscriptionPeriodSeconds,
      subscriptionTitle: config.subscriptionTitle,
      subscriptionDescription: config.subscriptionDescription,
      paySupportText: config.paySupportText,
      termsText: config.termsText
    }
  });

  const webServer = createWebServer({
    port: config.port,
    databaseService,
    nutritionService,
    telegramBotToken: config.telegramBotToken,
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || null
  });

  await webServer.start();
  await bot.launch();
  console.log(`Bot is running in polling mode on port ${config.port}`);

  process.once("SIGINT", () => {
    webServer.stop();
    databaseService.close();
    bot.stop("SIGINT");
  });

  process.once("SIGTERM", () => {
    webServer.stop();
    databaseService.close();
    bot.stop("SIGTERM");
  });

  process.once("exit", () => {
    webServer.stop();
    databaseService.close();
  });
}

main().catch((error) => {
  console.error("Application failed to start:", error);
  process.exitCode = 1;
});
