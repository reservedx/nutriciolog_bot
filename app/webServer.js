import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.join(__dirname, "..", "web");
const sessionCookieName = "nutriciolog_session";

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    ...headers
  });
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

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separatorIndex = item.indexOf("=");
        if (separatorIndex === -1) {
          return [item, ""];
        }

        const key = item.slice(0, separatorIndex);
        const value = item.slice(separatorIndex + 1);
        return [key, decodeURIComponent(value)];
      })
  );
}

function toBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function createSessionToken(payload, secret) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token, secret) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return null;
  }
}

function buildSessionCookie(token) {
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function buildExpiredSessionCookie() {
  return `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function verifyTelegramLogin(payload, botToken) {
  const authData = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

  const hash = authData.hash;
  if (!hash || !authData.id || !authData.auth_date) {
    return false;
  }

  const authTimestamp = Number(authData.auth_date);
  const ageSeconds = Math.floor(Date.now() / 1000) - authTimestamp;
  if (!Number.isFinite(authTimestamp) || ageSeconds > 86400) {
    return false;
  }

  const dataCheckString = Object.keys(authData)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${authData[key]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const provided = Buffer.from(hash);
  const expected = Buffer.from(expectedHash);
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}

async function resolveBotUsername(botToken, fallbackUsername) {
  if (fallbackUsername) {
    return fallbackUsername.replace(/^@+/, "");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  if (!response.ok) {
    throw new Error(`Failed to resolve bot username: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok || !payload.result?.username) {
    throw new Error("Failed to resolve bot username from Telegram API");
  }

  return payload.result.username;
}

function getRequestedIdentifier(url) {
  return (url.searchParams.get("telegram_user_id") || url.searchParams.get("identifier"))?.trim() || null;
}

function getSessionIdentifier(req, sessionSecret) {
  const cookies = parseCookies(req);
  const session = verifySessionToken(cookies[sessionCookieName], sessionSecret);
  return session?.telegram_user_id ? String(session.telegram_user_id) : null;
}

function getEffectiveIdentifier(req, url, sessionSecret) {
  return getRequestedIdentifier(url) || getSessionIdentifier(req, sessionSecret);
}

function getIdentifierFromBody(body, req, sessionSecret) {
  return body.telegram_user_id || body.identifier || getSessionIdentifier(req, sessionSecret);
}

export function createWebServer({ port, databaseService, nutritionService, telegramBotToken, telegramBotUsername }) {
  const sessionSecret = process.env.WEB_SESSION_SECRET || telegramBotToken;
  let resolvedBotUsername = telegramBotUsername || null;

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (req.method === "GET" && pathname === "/health") {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === "GET" && pathname === "/api/web-config") {
        return sendJson(res, 200, {
          botUsername: resolvedBotUsername,
          authUrl: "/auth/telegram/callback"
        });
      }

      if (req.method === "GET" && pathname === "/auth/telegram/callback") {
        const payload = Object.fromEntries(url.searchParams.entries());
        if (!verifyTelegramLogin(payload, telegramBotToken)) {
          res.writeHead(302, { Location: "/?auth_error=telegram_verification_failed" });
          res.end();
          return;
        }

        databaseService.ensureUser({
          id: payload.id,
          username: payload.username || null,
          first_name: payload.first_name || null,
          last_name: payload.last_name || null
        });

        const token = createSessionToken(
          {
            telegram_user_id: String(payload.id),
            telegram_username: payload.username || null,
            authenticated_at: new Date().toISOString()
          },
          sessionSecret
        );

        res.writeHead(302, {
          Location: "/?auth_success=1",
          "Set-Cookie": buildSessionCookie(token)
        });
        res.end();
        return;
      }

      if (req.method === "GET" && pathname === "/api/me") {
        const identifier = getSessionIdentifier(req, sessionSecret);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
        if (!profile) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, { profile });
      }

      if (req.method === "POST" && pathname === "/api/auth/telegram") {
        const body = await readJsonBody(req);
        if (!verifyTelegramLogin(body, telegramBotToken)) {
          return sendJson(res, 401, { error: "Telegram auth verification failed" });
        }

        const user = databaseService.ensureUser({
          id: body.id,
          username: body.username || null,
          first_name: body.first_name || null,
          last_name: body.last_name || null
        });

        const token = createSessionToken(
          {
            telegram_user_id: String(body.id),
            telegram_username: body.username || null,
            authenticated_at: new Date().toISOString()
          },
          sessionSecret
        );

        return sendJson(
          res,
          200,
          { ok: true, profile: user },
          {
            "Set-Cookie": buildSessionCookie(token)
          }
        );
      }

      if (req.method === "POST" && pathname === "/api/logout") {
        return sendJson(
          res,
          200,
          { ok: true },
          {
            "Set-Cookie": buildExpiredSessionCookie()
          }
        );
      }

      if (req.method === "GET" && pathname === "/api/profile") {
        const identifier = getEffectiveIdentifier(req, url, sessionSecret);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
        if (!profile) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, { profile });
      }

      if (req.method === "GET" && pathname === "/api/dashboard") {
        const identifier = getEffectiveIdentifier(req, url, sessionSecret);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        const dashboard = databaseService.getDashboard(identifier);
        if (!dashboard) {
          return sendJson(res, 404, { error: "Profile not found" });
        }

        return sendJson(res, 200, dashboard);
      }

      if (req.method === "GET" && pathname === "/api/history") {
        const identifier = getEffectiveIdentifier(req, url, sessionSecret);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        return sendJson(res, 200, databaseService.getRecentMeals(identifier, limit) || { meals: [] });
      }

      if (req.method === "GET" && pathname === "/api/weights") {
        const identifier = getEffectiveIdentifier(req, url, sessionSecret);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        return sendJson(res, 200, databaseService.getWeightLogs(identifier, limit) || { logs: [] });
      }

      if (req.method === "GET" && pathname === "/api/measurements") {
        const identifier = getEffectiveIdentifier(req, url, sessionSecret);
        const limit = clampLimit(url.searchParams.get("limit"), 20);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }

        return sendJson(res, 200, databaseService.getMeasurementLogs(identifier, limit) || { logs: [] });
      }

      if (req.method === "POST" && pathname === "/api/weight") {
        const body = await readJsonBody(req);
        const identifier = getIdentifierFromBody(body, req, sessionSecret);
        if (!identifier || body.weight === undefined || body.weight === null || body.weight === "") {
          return sendJson(res, 400, { error: "Weight is required" });
        }

        const savedLog = databaseService.saveWeightLog(identifier, Number(body.weight), body.note || null);
        return sendJson(res, 200, { log: savedLog });
      }

      if (req.method === "POST" && pathname === "/api/measurements") {
        const body = await readJsonBody(req);
        const identifier = getIdentifierFromBody(body, req, sessionSecret);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
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
        const identifier = getIdentifierFromBody(body, req, sessionSecret);
        if (!identifier || !body.question) {
          return sendJson(res, 400, { error: "Question is required" });
        }

        const profile = databaseService.getUserByIdentifier(identifier);
        const answer = await nutritionService.answerNutritionQuestion(body.question, profile);
        return sendJson(res, 200, { answer });
      }

      if (req.method === "POST" && pathname === "/api/meal-plan") {
        const body = await readJsonBody(req);
        const identifier = getIdentifierFromBody(body, req, sessionSecret);
        if (!identifier) {
          return sendJson(res, 401, { error: "Unauthorized" });
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
    async start() {
      resolvedBotUsername = await resolveBotUsername(telegramBotToken, telegramBotUsername);
      await new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`Web cabinet is running on port ${port}`);
          console.log(`Telegram Login bot username: ${resolvedBotUsername}`);
          resolve();
        });
      });
    },
    stop() {
      server.close();
    }
  };
}
