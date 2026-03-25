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

function getUserIdentifier(url) {
  return (url.searchParams.get("telegram_user_id") || url.searchParams.get("identifier"))?.trim();
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
        const identifier = getUserIdentifier(url);
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
        if (!profile) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, { profile });
      }

      if (req.method === "GET" && pathname === "/api/dashboard") {
        const identifier = getUserIdentifier(url);
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        const dashboard = databaseService.getDashboard(identifier);
        if (!dashboard) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, dashboard);
      }

      if (req.method === "GET" && pathname === "/api/history") {
        const identifier = getUserIdentifier(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        return sendJson(res, 200, databaseService.getRecentMeals(identifier, limit) || { meals: [] });
      }

      if (req.method === "GET" && pathname === "/api/weights") {
        const identifier = getUserIdentifier(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        return sendJson(res, 200, databaseService.getWeightLogs(identifier, limit) || { logs: [] });
      }

      if (req.method === "GET" && pathname === "/api/measurements") {
        const identifier = getUserIdentifier(url);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        return sendJson(res, 200, databaseService.getMeasurementLogs(identifier, limit) || { logs: [] });
      }

      if (req.method === "POST" && pathname === "/api/weight") {
        const body = await readJsonBody(req);
        const identifier = body.telegram_user_id || body.identifier;
        if (!identifier || body.weight === undefined || body.weight === null || body.weight === "") {
          return sendJson(res, 400, { error: "telegram_user_id or identifier and weight are required" });
        }

        const savedLog = databaseService.saveWeightLog(identifier, Number(body.weight), body.note || null);
        return sendJson(res, 200, { log: savedLog });
      }

      if (req.method === "POST" && pathname === "/api/measurements") {
        const body = await readJsonBody(req);
        const identifier = body.telegram_user_id || body.identifier;
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        const savedLog = databaseService.saveMeasurementLog(identifier, {
          waist: body.waist,
          thigh: body.thigh,
          arm: body.arm,
          note: body.note || null
        });

        return sendJson(res, 200, { log: savedLog });
      }

      if (req.method === "POST" && pathname === "/api/ask") {
        const body = await readJsonBody(req);
        const identifier = body.telegram_user_id || body.identifier;
        if (!identifier || !body.question) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier and question are required" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
        const answer = await nutritionService.answerNutritionQuestion(body.question, profile);
        return sendJson(res, 200, { answer });
      }

      if (req.method === "POST" && pathname === "/api/meal-plan") {
        const body = await readJsonBody(req);
        const identifier = body.telegram_user_id || body.identifier;
        if (!identifier) {
          return sendJson(res, 400, { error: "telegram_user_id or identifier is required" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
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
