const reminderMessages = {
  breakfast: "Не забудь добавить свой завтрак.",
  lunch: "Не забудь добавить свой обед.",
  dinner: "Не забудь добавить свой ужин."
};

export function startNotificationScheduler({ bot, databaseService, intervalMs = 60_000 }) {
  if (!bot?.telegram || !databaseService?.getDueNotifications) {
    throw new Error("Notification scheduler requires bot.telegram and databaseService");
  }

  let isRunning = false;

  async function tick() {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const dueNotifications = databaseService.getDueNotifications(new Date());

      for (const reminder of dueNotifications) {
        const text = reminderMessages[reminder.mealKey];
        if (!text) {
          continue;
        }

        try {
          await bot.telegram.sendMessage(
            reminder.telegramUserId,
            [
              text,
              "",
              "Когда добавишь прием пищи, я учту его в дневнике и прогрессе."
            ].join("\n")
          );
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
