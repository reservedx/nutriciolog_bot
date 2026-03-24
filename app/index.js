import { config } from "./config.js";
import { createBot } from "./bot.js";
import { createDatabaseService } from "./database.js";
import { createNutritionService } from "./services/nutrition.js";

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

  await bot.launch();
  console.log(`Bot is running in polling mode on port hint ${config.port}`);

  process.once("SIGINT", () => {
    databaseService.close();
    bot.stop("SIGINT");
  });

  process.once("SIGTERM", () => {
    databaseService.close();
    bot.stop("SIGTERM");
  });

  process.once("exit", () => databaseService.close());
}

main().catch((error) => {
  console.error("Application failed to start:", error);
  process.exitCode = 1;
});
