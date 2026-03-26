import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appTimeZone = process.env.APP_TIMEZONE || "Europe/Moscow";

function startOfDayIso(date = new Date()) {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  const hours = String(local.getHours()).padStart(2, "0");
  const minutes = String(local.getMinutes()).padStart(2, "0");
  const seconds = String(local.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function mapRow(columns, values) {
  return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
}

function addDaysIso(days, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function toSqliteDateTime(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getTimeZoneParts(dateInput = new Date(), timeZone = appTimeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return Object.fromEntries(
    formatter
      .formatToParts(new Date(dateInput))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
}

function toLocalDateKey(dateInput = new Date(), timeZone = appTimeZone) {
  const parts = getTimeZoneParts(dateInput, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function toLocalTimeKey(dateInput = new Date(), timeZone = appTimeZone) {
  const parts = getTimeZoneParts(dateInput, timeZone);
  return `${parts.hour}:${parts.minute}`;
}

function parseSqliteDateTime(value) {
  if (!value) return null;

  const stringValue = String(value).trim();
  const match = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?)?$/
  );

  if (!match) {
    const parsed = new Date(stringValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
}

function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || "").trim());
}

export async function createDatabaseService({ databasePath }) {
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(__dirname, "..", "node_modules", "sql.js", "dist", file)
  });

  const resolvedPath = path.resolve(process.cwd(), databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const fileBuffer = fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath) : null;
  const db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  function persist() {
    const data = db.export();
    fs.writeFileSync(resolvedPath, Buffer.from(data));
  }

  function getOne(sql, params = []) {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      if (!statement.step()) {
        return null;
      }
      return statement.getAsObject();
    } finally {
      statement.free();
    }
  }

  function getMany(sql, params = []) {
    const statement = db.prepare(sql);
    try {
      statement.bind(params);
      const rows = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_user_id TEXT NOT NULL UNIQUE,
      telegram_username TEXT,
      first_name TEXT,
      last_name TEXT,
      display_name TEXT,
      goal TEXT DEFAULT 'поддержание',
      daily_calories INTEGER,
      daily_protein INTEGER,
      daily_fat INTEGER,
      daily_carbs INTEGER,
      access_status TEXT NOT NULL DEFAULT 'trial',
      subscription_plan TEXT DEFAULT 'monthly_300_rub',
      trial_started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      trial_ends_at TEXT,
      subscription_ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      telegram_message_id INTEGER,
      image_file_id TEXT,
      dish_name TEXT NOT NULL,
      meal_type TEXT DEFAULT 'не указано',
      estimated_weight_grams REAL NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      fat REAL NOT NULL,
      carbs REAL NOT NULL,
      confidence TEXT,
      ingredients_json TEXT NOT NULL,
      assumptions_json TEXT NOT NULL,
      advice TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS weight_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS measurement_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      waist REAL,
      thigh REAL,
      arm REAL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'telegram_stars',
      payment_type TEXT NOT NULL DEFAULT 'subscription',
      invoice_payload TEXT,
      telegram_payment_charge_id TEXT,
      currency TEXT,
      amount INTEGER,
      subscription_until TEXT,
      raw_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      breakfast_time TEXT NOT NULL DEFAULT '10:00',
      lunch_time TEXT NOT NULL DEFAULT '13:00',
      dinner_time TEXT NOT NULL DEFAULT '18:00',
      last_breakfast_sent_at TEXT,
      last_lunch_sent_at TEXT,
      last_dinner_sent_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const mealColumns = getMany("PRAGMA table_info(meal_entries)");
  if (!mealColumns.some((column) => column.name === "meal_type")) {
    db.exec("ALTER TABLE meal_entries ADD COLUMN meal_type TEXT DEFAULT 'не указано'");
  }

  const userColumns = getMany("PRAGMA table_info(users)");
  if (!userColumns.some((column) => column.name === "access_status")) {
    db.exec("ALTER TABLE users ADD COLUMN access_status TEXT NOT NULL DEFAULT 'trial'");
  }
  if (!userColumns.some((column) => column.name === "subscription_plan")) {
    db.exec("ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'monthly_300_rub'");
  }
  if (!userColumns.some((column) => column.name === "trial_started_at")) {
    db.exec("ALTER TABLE users ADD COLUMN trial_started_at TEXT");
  }
  if (!userColumns.some((column) => column.name === "trial_ends_at")) {
    db.exec("ALTER TABLE users ADD COLUMN trial_ends_at TEXT");
  }
  if (!userColumns.some((column) => column.name === "subscription_ends_at")) {
    db.exec("ALTER TABLE users ADD COLUMN subscription_ends_at TEXT");
  }

  const notificationColumns = getMany("PRAGMA table_info(notification_settings)");
  if (!notificationColumns.some((column) => column.name === "enabled")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!notificationColumns.some((column) => column.name === "breakfast_time")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN breakfast_time TEXT NOT NULL DEFAULT '10:00'");
  }
  if (!notificationColumns.some((column) => column.name === "lunch_time")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN lunch_time TEXT NOT NULL DEFAULT '13:00'");
  }
  if (!notificationColumns.some((column) => column.name === "dinner_time")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN dinner_time TEXT NOT NULL DEFAULT '18:00'");
  }
  if (!notificationColumns.some((column) => column.name === "last_breakfast_sent_at")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN last_breakfast_sent_at TEXT");
  }
  if (!notificationColumns.some((column) => column.name === "last_lunch_sent_at")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN last_lunch_sent_at TEXT");
  }
  if (!notificationColumns.some((column) => column.name === "last_dinner_sent_at")) {
    db.exec("ALTER TABLE notification_settings ADD COLUMN last_dinner_sent_at TEXT");
  }

  db.run(
    `
      UPDATE users
      SET
        trial_started_at = COALESCE(trial_started_at, created_at, CURRENT_TIMESTAMP),
        trial_ends_at = COALESCE(trial_ends_at, datetime(COALESCE(created_at, CURRENT_TIMESTAMP), '+14 days')),
        subscription_plan = COALESCE(subscription_plan, 'monthly_300_rub'),
        access_status = COALESCE(access_status, 'trial')
    `
  );

  persist();

  function ensureNotificationSettingsForUser(userId) {
    db.run(
      `
        INSERT INTO notification_settings (
          user_id,
          enabled,
          breakfast_time,
          lunch_time,
          dinner_time,
          updated_at
        ) VALUES (?, 1, '10:00', '13:00', '18:00', CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO NOTHING
      `,
      [userId]
    );
  }

  function getUserByTelegramId(telegramUserId) {
    return getOne("SELECT * FROM users WHERE telegram_user_id = ?", [String(telegramUserId)]);
  }

  function normalizeIdentifier(identifier) {
    return String(identifier || "").trim();
  }

  function getUserByIdentifier(identifier) {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) {
      return null;
    }

    if (/^\d+$/.test(normalized)) {
      return getUserByTelegramId(normalized);
    }

    const username = normalized.replace(/^@+/, "").toLowerCase();
    return getOne("SELECT * FROM users WHERE LOWER(telegram_username) = ?", [username]);
  }

  return {
    getUserByTelegramId(telegramUserId) {
      return getUserByTelegramId(telegramUserId);
    },

    getUserByIdentifier(identifier) {
      return getUserByIdentifier(identifier);
    },

    ensureUser(telegramUser) {
      const telegramUserId = String(telegramUser.id);
      const displayName =
        [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") ||
        telegramUser.username ||
        `user-${telegramUser.id}`;

      db.run(
        `
          INSERT INTO users (
            telegram_user_id,
            telegram_username,
            first_name,
            last_name,
            display_name,
            access_status,
            subscription_plan,
            trial_started_at,
            trial_ends_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, 'trial', 'monthly_300_rub', CURRENT_TIMESTAMP, datetime(CURRENT_TIMESTAMP, '+14 days'), CURRENT_TIMESTAMP)
          ON CONFLICT(telegram_user_id) DO UPDATE SET
            telegram_username = excluded.telegram_username,
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            display_name = excluded.display_name,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          telegramUserId,
          telegramUser.username || null,
          telegramUser.first_name || null,
          telegramUser.last_name || null,
          displayName
        ]
      );

      const user = getUserByTelegramId(telegramUserId);
      ensureNotificationSettingsForUser(user.id);
      persist();
      return user;
    },

    getAccessStatus(telegramUserId) {
      const user = getUserByTelegramId(telegramUserId);
      if (!user) return null;

      const now = new Date();
      const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
      const subscriptionEndsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      const activeUntil = subscriptionEndsAt || trialEndsAt || null;
      const remainingMs = activeUntil ? activeUntil.getTime() - now.getTime() : 0;

      return {
        user,
        status: "free",
        isActive: true,
        isTrial: false,
        isPaid: false,
        isFree: true,
        activeUntil: activeUntil ? activeUntil.toISOString() : null,
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        subscriptionEndsAt: subscriptionEndsAt ? subscriptionEndsAt.toISOString() : null,
        remainingDays: Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))
      };
    },

    activateSubscription(telegramUserId, days = 30, plan = "monthly_300_rub") {
      const user = getUserByTelegramId(telegramUserId);
      if (!user) return null;

      const now = new Date();
      const currentEnd = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      const startDate = currentEnd && currentEnd > now ? currentEnd : now;
      const nextEnd = addDaysIso(days, startDate);

      db.run(
        `
          UPDATE users
          SET
            access_status = 'active',
            subscription_plan = ?,
            subscription_ends_at = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_user_id = ?
        `,
        [plan, nextEnd, String(telegramUserId)]
      );

      persist();
      return getUserByTelegramId(telegramUserId);
    },

    syncSubscriptionFromTelegramPayment(telegramUserId, payment) {
      const user = getUserByTelegramId(telegramUserId);
      if (!user) return null;

      const subscriptionUntil = payment.subscription_expiration_date
        ? new Date(payment.subscription_expiration_date * 1000).toISOString()
        : addDaysIso(30);

      db.run(
        `
          INSERT INTO payment_logs (
            user_id,
            invoice_payload,
            telegram_payment_charge_id,
            currency,
            amount,
            subscription_until,
            raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user.id,
          payment.invoice_payload || null,
          payment.telegram_payment_charge_id || null,
          payment.currency || null,
          payment.total_amount ?? null,
          subscriptionUntil,
          JSON.stringify(payment)
        ]
      );

      db.run(
        `
          UPDATE users
          SET
            access_status = 'active',
            subscription_plan = 'monthly_300_rub',
            subscription_ends_at = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_user_id = ?
        `,
        [subscriptionUntil, String(telegramUserId)]
      );

      persist();
      return {
        user: getUserByTelegramId(telegramUserId),
        subscriptionUntil
      };
    },

    updateUserProfile(profile) {
      db.run(
        `
          UPDATE users
          SET
            display_name = ?,
            goal = ?,
            daily_calories = ?,
            daily_protein = ?,
            daily_fat = ?,
            daily_carbs = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE telegram_user_id = ?
        `,
        [
          profile.display_name,
          profile.goal,
          profile.daily_calories,
          profile.daily_protein,
          profile.daily_fat,
          profile.daily_carbs,
          String(profile.telegram_user_id)
        ]
      );

      persist();
      return getUserByTelegramId(profile.telegram_user_id);
    },

    getNotificationSettings(telegramUserId) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      ensureNotificationSettingsForUser(user.id);
      persist();

      const settings = getOne("SELECT * FROM notification_settings WHERE user_id = ?", [user.id]);
      return { user, settings };
    },

    updateNotificationSettings(telegramUserId, updates = {}) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      ensureNotificationSettingsForUser(user.id);
      const current = getOne("SELECT * FROM notification_settings WHERE user_id = ?", [user.id]);
      const next = {
        enabled: typeof updates.enabled === "boolean" ? (updates.enabled ? 1 : 0) : Number(current.enabled ?? 1),
        breakfast_time: isValidTimeString(updates.breakfast_time) ? updates.breakfast_time : current.breakfast_time || "10:00",
        lunch_time: isValidTimeString(updates.lunch_time) ? updates.lunch_time : current.lunch_time || "13:00",
        dinner_time: isValidTimeString(updates.dinner_time) ? updates.dinner_time : current.dinner_time || "18:00"
      };

      db.run(
        `
          UPDATE notification_settings
          SET
            enabled = ?,
            breakfast_time = ?,
            lunch_time = ?,
            dinner_time = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `,
        [next.enabled, next.breakfast_time, next.lunch_time, next.dinner_time, user.id]
      );

      persist();
      return {
        user,
        settings: getOne("SELECT * FROM notification_settings WHERE user_id = ?", [user.id])
      };
    },

    toggleNotificationSettings(telegramUserId, enabled) {
      return this.updateNotificationSettings(telegramUserId, { enabled: Boolean(enabled) });
    },

    getDueNotifications(now = new Date()) {
      const todayKey = toLocalDateKey(now, appTimeZone);
      const currentTime = toLocalTimeKey(now, appTimeZone);
      const settingsRows = getMany(
        `
          SELECT
            notification_settings.*,
            users.telegram_user_id,
            users.display_name
          FROM notification_settings
          JOIN users ON users.id = notification_settings.user_id
          WHERE notification_settings.enabled = 1
        `
      );

      const mealColumns = {
        breakfast: "last_breakfast_sent_at",
        lunch: "last_lunch_sent_at",
        dinner: "last_dinner_sent_at"
      };
      const mealTimes = {
        breakfast: "breakfast_time",
        lunch: "lunch_time",
        dinner: "dinner_time"
      };
      const mealLabels = {
        breakfast: "завтрак",
        lunch: "обед",
        dinner: "ужин"
      };

      const due = [];

      for (const row of settingsRows) {
        const loggedMeals = new Set(
          getMany(
            `
              SELECT meal_type, created_at
              FROM meal_entries
              WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-2 days')
            `,
            [row.user_id]
          )
            .filter((entry) => {
              const entryDate = parseSqliteDateTime(entry.created_at);
              return entryDate && toLocalDateKey(entryDate, appTimeZone) === todayKey;
            })
            .map((entry) => String(entry.meal_type || "").toLowerCase())
        );

        for (const mealKey of ["breakfast", "lunch", "dinner"]) {
          const scheduledTime = row[mealTimes[mealKey]];
          const lastSentAt = row[mealColumns[mealKey]];
          const alreadyLogged = loggedMeals.has(mealLabels[mealKey]);
          const lastSentDate = parseSqliteDateTime(lastSentAt);
          const alreadySentToday = lastSentDate && toLocalDateKey(lastSentDate, appTimeZone) === todayKey;

          if (!isValidTimeString(scheduledTime) || alreadyLogged || alreadySentToday) {
            continue;
          }

          if (currentTime >= scheduledTime) {
            due.push({
              userId: row.user_id,
              telegramUserId: row.telegram_user_id,
              displayName: row.display_name,
              mealKey,
              scheduledTime
            });
          }
        }
      }

      return due;
    },

    markNotificationSent(telegramUserId, mealKey, sentAt = new Date()) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return false;

      ensureNotificationSettingsForUser(user.id);

      const columnMap = {
        breakfast: "last_breakfast_sent_at",
        lunch: "last_lunch_sent_at",
        dinner: "last_dinner_sent_at"
      };
      const column = columnMap[mealKey];
      if (!column) return false;

      db.run(
        `
          UPDATE notification_settings
          SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `,
        [toSqliteDateTime(sentAt), user.id]
      );

      persist();
      return true;
    },

    saveMealEntry(entry) {
      db.run(
        `
          INSERT INTO meal_entries (
            user_id,
            telegram_message_id,
            image_file_id,
            dish_name,
            meal_type,
            estimated_weight_grams,
            calories,
            protein,
            fat,
            carbs,
            confidence,
            ingredients_json,
            assumptions_json,
            advice
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          entry.user_id,
          entry.telegram_message_id,
          entry.image_file_id,
          entry.dish_name,
          entry.meal_type || "не указано",
          entry.estimated_weight_grams,
          entry.calories,
          entry.protein,
          entry.fat,
          entry.carbs,
          entry.confidence,
          JSON.stringify(entry.ingredients),
          JSON.stringify(entry.assumptions),
          entry.advice
        ]
      );

      const savedEntry = getOne("SELECT * FROM meal_entries WHERE id = last_insert_rowid()", []);
      persist();
      return savedEntry;
    },

    saveWeightLog(telegramUserId, weight, note = null) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      db.run(`INSERT INTO weight_logs (user_id, weight, note) VALUES (?, ?, ?)`, [user.id, weight, note]);
      const savedLog = getOne("SELECT * FROM weight_logs WHERE id = last_insert_rowid()", []);
      persist();
      return savedLog;
    },

    saveMeasurementLog(telegramUserId, measurement) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      db.run(
        `INSERT INTO measurement_logs (user_id, waist, thigh, arm, note) VALUES (?, ?, ?, ?, ?)`,
        [user.id, measurement.waist ?? null, measurement.thigh ?? null, measurement.arm ?? null, measurement.note ?? null]
      );

      const savedLog = getOne("SELECT * FROM measurement_logs WHERE id = last_insert_rowid()", []);
      persist();
      return savedLog;
    },

    getWeightLogs(telegramUserId, limit = 20) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const logs = getMany(`SELECT * FROM weight_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`, [user.id, limit]);
      console.log(`Weight logs for user ${telegramUserId}: ${logs.length}`);
      return { user, logs };
    },

    getMeasurementLogs(telegramUserId, limit = 20) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const logs = getMany(`SELECT * FROM measurement_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ?`, [user.id, limit]);
      console.log(`Measurement logs for user ${telegramUserId}: ${logs.length}`);
      return { user, logs };
    },

    getWeightProgress(telegramUserId) {
      const history = this.getWeightLogs(telegramUserId, 30);
      if (!history || history.logs.length === 0) return null;

      const latest = history.logs[0];
      const oldest = history.logs[history.logs.length - 1];
      return { ...history, latest, oldest, change: Number(latest.weight) - Number(oldest.weight) };
    },

    getMeasurementProgress(telegramUserId) {
      const history = this.getMeasurementLogs(telegramUserId, 30);
      if (!history || history.logs.length === 0) return null;

      const latest = history.logs[0];
      const oldest = history.logs[history.logs.length - 1];

      function delta(field) {
        const a = Number(latest[field]);
        const b = Number(oldest[field]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
        return a - b;
      }

      return {
        ...history,
        latest,
        oldest,
        waistChange: delta("waist"),
        thighChange: delta("thigh"),
        armChange: delta("arm")
      };
    },

    getMealEntryForUser(telegramUserId, entryId) {
      return getOne(
        `
          SELECT meal_entries.*
          FROM meal_entries
          JOIN users ON users.id = meal_entries.user_id
          WHERE users.telegram_user_id = ? AND meal_entries.id = ?
        `,
        [String(telegramUserId), Number(entryId)]
      );
    },

    updateMealType(telegramUserId, entryId, mealType) {
      const entry = this.getMealEntryForUser(telegramUserId, entryId);
      if (!entry) return null;

      db.run("UPDATE meal_entries SET meal_type = ? WHERE id = ?", [mealType, Number(entryId)]);
      persist();
      return this.getMealEntryForUser(telegramUserId, entryId);
    },

    deleteMealEntry(telegramUserId, entryId) {
      const entry = this.getMealEntryForUser(telegramUserId, entryId);
      if (!entry) return false;

      db.run("DELETE FROM meal_entries WHERE id = ?", [Number(entryId)]);
      persist();
      return true;
    },

    clearUserJournal(telegramUserId) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const mealCount = getOne("SELECT COUNT(*) AS count FROM meal_entries WHERE user_id = ?", [user.id])?.count || 0;
      const weightCount = getOne("SELECT COUNT(*) AS count FROM weight_logs WHERE user_id = ?", [user.id])?.count || 0;
      const measurementCount = getOne("SELECT COUNT(*) AS count FROM measurement_logs WHERE user_id = ?", [user.id])?.count || 0;

      db.run("DELETE FROM meal_entries WHERE user_id = ?", [user.id]);
      db.run("DELETE FROM weight_logs WHERE user_id = ?", [user.id]);
      db.run("DELETE FROM measurement_logs WHERE user_id = ?", [user.id]);
      persist();

      return {
        mealsDeleted: Number(mealCount),
        weightsDeleted: Number(weightCount),
        measurementsDeleted: Number(measurementCount)
      };
    },

    getTodaySummary(telegramUserId) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const meals = getMany(
        `
          SELECT *
          FROM meal_entries
          WHERE user_id = ? AND created_at >= ?
          ORDER BY datetime(created_at) DESC
        `,
        [user.id, startOfDayIso()]
      );
      console.log(`Today meals for user ${telegramUserId}: ${meals.length}`);

      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + Number(meal.calories),
          protein: acc.protein + Number(meal.protein),
          fat: acc.fat + Number(meal.fat),
          carbs: acc.carbs + Number(meal.carbs)
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );

      return { user, meals, totals };
    },

    getRecentMeals(telegramUserId, limit = 5) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const meals = getMany(
        `
          SELECT *
          FROM meal_entries
          WHERE user_id = ?
          ORDER BY datetime(created_at) DESC
          LIMIT ?
        `,
        [user.id, limit]
      );
      console.log(`Recent meals for user ${telegramUserId}: ${meals.length}`);

      return { user, meals };
    },

    getDashboard(telegramUserId) {
      const profile = getUserByIdentifier(telegramUserId);
      if (!profile) return null;

      return {
        profile,
        today: this.getTodaySummary(telegramUserId),
        recentMeals: this.getRecentMeals(telegramUserId, 20),
        weightLogs: this.getWeightLogs(telegramUserId, 30),
        measurementLogs: this.getMeasurementLogs(telegramUserId, 30),
        weightProgress: this.getWeightProgress(telegramUserId),
        measurementProgress: this.getMeasurementProgress(telegramUserId)
      };
    },

    getAdminStats() {
      const todayFrom = startOfDayIso();
      const totalUsers = Number(getOne("SELECT COUNT(*) AS count FROM users")?.count || 0);
      const usersWithProfile = Number(
        getOne("SELECT COUNT(*) AS count FROM users WHERE daily_calories IS NOT NULL")?.count || 0
      );
      const newUsersToday = Number(
        getOne("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?", [todayFrom])?.count || 0
      );
      const activeTrials = Number(
        getOne(
          "SELECT COUNT(*) AS count FROM users WHERE trial_ends_at IS NOT NULL AND datetime(trial_ends_at) > datetime('now')",
          []
        )?.count || 0
      );
      const paidUsers = Number(
        getOne(
          "SELECT COUNT(*) AS count FROM users WHERE subscription_ends_at IS NOT NULL AND datetime(subscription_ends_at) > datetime('now')",
          []
        )?.count || 0
      );
      const mealsToday = Number(
        getOne("SELECT COUNT(*) AS count FROM meal_entries WHERE created_at >= ?", [todayFrom])?.count || 0
      );
      const totalMeals = Number(getOne("SELECT COUNT(*) AS count FROM meal_entries")?.count || 0);
      const totalWeightLogs = Number(getOne("SELECT COUNT(*) AS count FROM weight_logs")?.count || 0);
      const totalMeasurementLogs = Number(getOne("SELECT COUNT(*) AS count FROM measurement_logs")?.count || 0);
      const totalPayments = Number(getOne("SELECT COUNT(*) AS count FROM payment_logs")?.count || 0);

      const latestUsers = getMany(
        `
          SELECT
            telegram_user_id,
            telegram_username,
            display_name,
            created_at,
            access_status
          FROM users
          ORDER BY datetime(created_at) DESC
          LIMIT 5
        `
      );

      return {
        totalUsers,
        usersWithProfile,
        newUsersToday,
        activeTrials,
        paidUsers,
        mealsToday,
        totalMeals,
        totalWeightLogs,
        totalMeasurementLogs,
        totalPayments,
        latestUsers
      };
    },

    getAdminDashboard() {
      const stats = this.getAdminStats();
      const registrations = getMany(
        `
          SELECT
            strftime('%Y-%m-%d', created_at) AS day,
            COUNT(*) AS registrations
          FROM users
          WHERE datetime(created_at) >= datetime('now', '-29 days')
          GROUP BY strftime('%Y-%m-%d', created_at)
          ORDER BY day ASC
        `
      );

      const meals = getMany(
        `
          SELECT
            strftime('%Y-%m-%d', created_at) AS day,
            COUNT(*) AS meals
          FROM meal_entries
          WHERE datetime(created_at) >= datetime('now', '-29 days')
          GROUP BY strftime('%Y-%m-%d', created_at)
          ORDER BY day ASC
        `
      );

      const weights = getMany(
        `
          SELECT
            strftime('%Y-%m-%d', created_at) AS day,
            COUNT(*) AS weights
          FROM weight_logs
          WHERE datetime(created_at) >= datetime('now', '-29 days')
          GROUP BY strftime('%Y-%m-%d', created_at)
          ORDER BY day ASC
        `
      );

      const activeUsers = getMany(
        `
          SELECT
            users.telegram_user_id,
            users.telegram_username,
            users.display_name,
            users.goal,
            COUNT(meal_entries.id) AS meals_count,
            ROUND(COALESCE(SUM(meal_entries.calories), 0), 0) AS calories_logged,
            MAX(meal_entries.created_at) AS last_meal_at
          FROM users
          LEFT JOIN meal_entries ON meal_entries.user_id = users.id
          GROUP BY users.id
          ORDER BY meals_count DESC, datetime(last_meal_at) DESC
          LIMIT 10
        `
      );

      const recentPayments = getMany(
        `
          SELECT
            users.display_name,
            users.telegram_username,
            payment_logs.amount,
            payment_logs.currency,
            payment_logs.subscription_until,
            payment_logs.created_at
          FROM payment_logs
          JOIN users ON users.id = payment_logs.user_id
          ORDER BY datetime(payment_logs.created_at) DESC
          LIMIT 10
        `
      );

      return {
        ...stats,
        registrations,
        mealsByDay: meals,
        weightsByDay: weights,
        activeUsers,
        recentPayments
      };
    },

    seedDemoData(telegramUserId) {
      const user = getUserByIdentifier(telegramUserId);
      if (!user) return null;

      const existingWeights = getMany(
        "SELECT * FROM weight_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 30",
        [user.id]
      );
      const existingMeasurements = getMany(
        "SELECT * FROM measurement_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 30",
        [user.id]
      );
      const existingMeals = getMany(
        "SELECT * FROM meal_entries WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 30",
        [user.id]
      );

      let seededWeights = 0;
      let seededMeasurements = 0;
      let seededMeals = 0;

      const now = new Date();
      const latestWeight = existingWeights[0] ? Number(existingWeights[0].weight) : null;
      const currentWeight = Number.isFinite(latestWeight) ? latestWeight : 76.4;

      if (existingWeights.length < 8) {
        const targetCount = 8 - existingWeights.length;
        for (let index = targetCount; index >= 1; index -= 1) {
          const daysAgo = index * 4;
          const createdAt = toSqliteDateTime(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000));
          const weight = Number((currentWeight - index * 0.35).toFixed(1));
          db.run("INSERT INTO weight_logs (user_id, weight, note, created_at) VALUES (?, ?, ?, ?)", [
            user.id,
            weight,
            "demo history",
            createdAt
          ]);
          seededWeights += 1;
        }
      }

      const latestMeasurement = existingMeasurements[0] || {};
      const baseWaist = Number.isFinite(Number(latestMeasurement.waist)) ? Number(latestMeasurement.waist) : 84;
      const baseThigh = Number.isFinite(Number(latestMeasurement.thigh)) ? Number(latestMeasurement.thigh) : 56;
      const baseArm = Number.isFinite(Number(latestMeasurement.arm)) ? Number(latestMeasurement.arm) : 32;

      if (existingMeasurements.length < 6) {
        const targetCount = 6 - existingMeasurements.length;
        for (let index = targetCount; index >= 1; index -= 1) {
          const daysAgo = index * 6;
          const createdAt = toSqliteDateTime(new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000));
          db.run(
            "INSERT INTO measurement_logs (user_id, waist, thigh, arm, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              user.id,
              Number((baseWaist - index * 0.4).toFixed(1)),
              Number((baseThigh - index * 0.15).toFixed(1)),
              Number((baseArm - index * 0.05).toFixed(1)),
              "demo history",
              createdAt
            ]
          );
          seededMeasurements += 1;
        }
      }

      if (existingMeals.length < 10) {
        const mealTemplates = [
          { dish: "Овсянка с бананом и орехами", type: "завтрак", calories: 430, protein: 16, fat: 14, carbs: 58 },
          { dish: "Творог с ягодами", type: "перекус", calories: 210, protein: 23, fat: 6, carbs: 14 },
          { dish: "Курица с рисом и овощами", type: "обед", calories: 620, protein: 46, fat: 18, carbs: 63 },
          { dish: "Йогурт и яблоко", type: "перекус", calories: 180, protein: 9, fat: 5, carbs: 24 },
          { dish: "Лосось с картофелем", type: "ужин", calories: 560, protein: 38, fat: 22, carbs: 41 },
          { dish: "Омлет и тосты", type: "завтрак", calories: 390, protein: 24, fat: 20, carbs: 28 }
        ];

        const targetCount = Math.min(6, 10 - existingMeals.length);
        for (let index = targetCount; index >= 1; index -= 1) {
          const template = mealTemplates[(targetCount - index) % mealTemplates.length];
          const hoursAgo = index * 10;
          const createdAt = toSqliteDateTime(new Date(now.getTime() - hoursAgo * 60 * 60 * 1000));
          db.run(
            `
              INSERT INTO meal_entries (
                user_id,
                telegram_message_id,
                image_file_id,
                dish_name,
                meal_type,
                estimated_weight_grams,
                calories,
                protein,
                fat,
                carbs,
                confidence,
                ingredients_json,
                assumptions_json,
                advice,
                created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              user.id,
              null,
              null,
              template.dish,
              template.type,
              260,
              template.calories,
              template.protein,
              template.fat,
              template.carbs,
              "high",
              JSON.stringify([]),
              JSON.stringify(["demo history"]),
              "Демо-запись для графиков и теста кабинета.",
              createdAt
            ]
          );
          seededMeals += 1;
        }
      }

      persist();

      return {
        seededWeights,
        seededMeasurements,
        seededMeals
      };
    },

    close() {
      persist();
      db.close();
    }
  };
}
