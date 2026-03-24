import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.join(__dirname, "..", "web");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendFile(res, filepath) {
  const ext = path.extname(filepath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };

  if (!fs.existsSync(filepath)) {
    sendText(res, 404, "Not found");
    return;
  }

  res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filepath).pipe(res);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function clampLimit(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
}

function getTelegramUserId(url) {
  return url.searchParams.get("telegram_user_id")?.trim();
}

export function createWebServer({ port, databaseService, nutritionService }) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (req.method === "GET" && pathname === "/health") {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "GET" && pathname === "/api/profile") {
        const telegramUserId = getTelegramUserId(url);
        if (!telegramUserId) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        const profile = databaseService.getUserByTelegramId(telegramUserId);
        if (!profile) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, { profile });
      }

      if (req.method === "GET" && pathname === "/api/dashboard") {
        const telegramUserId = getTelegramUserId(url);
        if (!telegramUserId) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        const dashboard = databaseService.getDashboard(telegramUserId);
        if (!dashboard) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, dashboard);
      }

      if (req.method === "GET" && pathname === "/api/history") {
        const telegramUserId = getTelegramUserId(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!telegramUserId) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        return sendJson(res, 200, databaseService.getRecentMeals(telegramUserId, limit) || { meals: [] });
      }

      if (req.method === "GET" && pathname === "/api/weights") {
        const telegramUserId = getTelegramUserId(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!telegramUserId) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        return sendJson(res, 200, databaseService.getWeightLogs(telegramUserId, limit) || { logs: [] });
      }

      if (req.method === "GET" && pathname === "/api/measurements") {
        const telegramUserId = getTelegramUserId(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!telegramUserId) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        return sendJson(res, 200, databaseService.getMeasurementLogs(telegramUserId, limit) || { logs: [] });
      }

      if (req.method === "POST" && pathname === "/api/weight") {
        const body = await readJsonBody(req);
        if (!body.telegram_user_id || body.weight === undefined || body.weight === null || body.weight === "") {
          return sendJson(res, 400, { error: "telegram_user_id and weight are required" });
        }

        const savedLog = databaseService.saveWeightLog(body.telegram_user_id, Number(body.weight), body.note || null);
        return sendJson(res, 200, { log: savedLog });
      }

      if (req.method === "POST" && pathname === "/api/measurements") {
        const body = await readJsonBody(req);
        if (!body.telegram_user_id) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        const savedLog = databaseService.saveMeasurementLog(body.telegram_user_id, {
          waist: body.waist,
          thigh: body.thigh,
          arm: body.arm,
          note: body.note || null
        });

        return sendJson(res, 200, { log: savedLog });
      }

      if (req.method === "POST" && pathname === "/api/ask") {
        const body = await readJsonBody(req);
        if (!body.telegram_user_id || !body.question) {
          return sendJson(res, 400, { error: "telegram_user_id and question are required" });
        }

        const profile = databaseService.getUserByTelegramId(body.telegram_user_id);
        const answer = await nutritionService.answerNutritionQuestion(body.question, profile);
        return sendJson(res, 200, { answer });
      }

      if (req.method === "POST" && pathname === "/api/meal-plan") {
        const body = await readJsonBody(req);
        if (!body.telegram_user_id) {
          return sendJson(res, 400, { error: "telegram_user_id is required" });
        }

        const profile = databaseService.getUserByTelegramId(body.telegram_user_id);
        const plan = await nutritionService.generateMealPlan(profile, body.period || "день");
        return sendJson(res, 200, { plan });
      }

      if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
        return sendFile(res, path.join(webDir, "index.html"));
      }

      if (req.method === "GET" && pathname.startsWith("/web/")) {
        return sendFile(res, path.join(webDir, pathname.replace("/web/", "")));
      }

      return sendText(res, 404, "Not found");
    } catch (error) {
      console.error("Web server error:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  });

  return {
    start() {
      server.listen(port, () => {
        console.log(`Web cabinet is running on port ${port}`);
      });
    },
    stop() {
      server.close();
    }
  };
}
