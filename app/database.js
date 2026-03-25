import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      persist();
      return getUserByTelegramId(telegramUserId);
    },

    getAccessStatus(telegramUserId) {
      const user = getUserByTelegramId(telegramUserId);
      if (!user) return null;

      const now = new Date();
      const trialEndsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
      const subscriptionEndsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
      const isSubscriptionActive = subscriptionEndsAt && subscriptionEndsAt > now;
      const isTrialActive = trialEndsAt && trialEndsAt > now;

      let status = "expired";
      if (isSubscriptionActive) {
        status = "active";
      } else if (isTrialActive) {
        status = "trial";
      }

      const activeUntil = isSubscriptionActive ? subscriptionEndsAt : isTrialActive ? trialEndsAt : trialEndsAt || subscriptionEndsAt;
      const remainingMs = activeUntil ? activeUntil.getTime() - now.getTime() : 0;

      return {
        user,
        status,
        isActive: status === "active" || status === "trial",
        isTrial: status === "trial",
        isPaid: status === "active",
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
