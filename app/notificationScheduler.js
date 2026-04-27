const reminderMessages = {
  breakfast: "Доброе утро! Не забудь добавить свой завтрак.",
  lunch: "Напоминаю про обед. Добавь прием пищи, чтобы дневник был точнее.",
  dinner: "Время ужина. Если уже поел, добавь прием пищи в дневник.",
  profile_setup:
    "Профиль пока не заполнен. Заполни его, и я начну считать твою норму калорий и помогу вести дневник питания."
};

function buildReminderPayload(reminder) {
  if (reminder.mealKey === "profile_setup") {
    return {
      text: reminderMessages.profile_setup,
      extra: {
        reply_markup: {
          inline_keyboard: [[{ text: "Заполнить профиль", callback_data: "menu:setup" }]]
        }
      }
    };
  }

  return {
    text: [
      reminderMessages[reminder.mealKey],
      "",
      "Я сразу учту его в дневнике, КБЖУ и прогрессе за день."
    ].join("\n"),
    extra: undefined
  };
}

export function startNotificationScheduler({ bot, databaseService, intervalMs = 15_000 }) {
  if (!bot?.telegram || !databaseService?.getDueNotifications) {
    throw new Error("Notification scheduler requires bot.telegram and databaseService");
  }

  console.log(`Notification scheduler started with interval ${intervalMs}ms`);
  let isRunning = false;
  let tickCount = 0;

  async function tick() {
    if (isRunning) {
      console.log("Notification scheduler skipped tick because previous tick is still running");
      return;
    }

    isRunning = true;
    try {
      tickCount += 1;
      const now = new Date();
      console.log(`Notification scheduler tick #${tickCount} at ${now.toISOString()}`);
      const dueNotifications = databaseService.getDueNotifications(now);
      if (dueNotifications.length > 0) {
        console.log(`Notification scheduler found ${dueNotifications.length} due reminder(s).`);
      } else {
        console.log("Notification scheduler found no due reminders.");
      }

      for (const reminder of dueNotifications) {
        if (!reminderMessages[reminder.mealKey]) {
          console.warn(`Notification scheduler skipped unknown mealKey: ${reminder.mealKey}`);
          continue;
        }

        try {
          const payload = buildReminderPayload(reminder);
          console.log(`Sending ${reminder.mealKey} reminder to ${reminder.telegramUserId} at ${reminder.scheduledTime}`);
          await bot.telegram.sendMessage(reminder.telegramUserId, payload.text, payload.extra);
          databaseService.markNotificationSent(reminder.telegramUserId, reminder.mealKey, new Date());
        } catch (error) {
          console.error(`Failed to send ${reminder.mealKey} reminder to ${reminder.telegramUserId}:`, error);
        }
      }
    } catch (error) {
      console.error("Notification scheduler tick failed:", error);
    } finally {
      isRunning = false;
    }
  }

  const timer = setInterval(() => {
    tick().catch((error) => {
      console.error("Notification scheduler unhandled tick error:", error);
    });
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  tick().catch((error) => {
    console.error("Notification scheduler initial tick failed:", error);
  });

  return {
    stop() {
      clearInterval(timer);
    }
  };
}
