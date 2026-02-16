const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const {
  sendJson,
  sendText,
  sendError,
  readJson
} = require("./src/lib/http");
const core = require("./src/coreService");

const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4"
};

function setCommonHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
}

async function handleApi(req, res, pathname, searchParams) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/config") {
    sendJson(res, 200, core.getPublicConfig());
    return;
  }

  if (req.method === "GET" && pathname === "/api/events") {
    const limit = searchParams.get("limit");
    sendJson(res, 200, { events: core.listEvents(limit) });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/progress/")) {
    const userId = decodeURIComponent(pathname.split("/").pop() || "");
    if (!userId) {
      sendError(res, 400, "userId is required");
      return;
    }
    sendJson(res, 200, core.getProgress(userId));
    return;
  }

  if (req.method === "POST" && pathname === "/api/users/onboard") {
    const payload = await readJson(req);
    sendJson(res, 201, core.onboardUser(payload));
    return;
  }

  if (req.method === "POST" && pathname === "/api/plans/generate") {
    const payload = await readJson(req);
    const result = await core.createPlan(payload);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/meals/log") {
    const payload = await readJson(req);
    sendJson(res, 200, core.logMeal(payload));
    return;
  }

  if (req.method === "POST" && pathname === "/api/subscriptions/set") {
    const payload = await readJson(req);
    sendJson(res, 200, core.setSubscription(payload));
    return;
  }

  sendError(res, 404, "API route not found");
}

function safePublicPath(urlPathname) {
  const requested = urlPathname === "/" ? "index.html" : urlPathname.replace(/^\/+/, "");
  const normalized = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(PUBLIC_DIR, normalized);
  if (!fullPath.startsWith(PUBLIC_DIR)) {
    return null;
  }
  return fullPath;
}

function serveStatic(req, res, pathname) {
  if (!["GET", "HEAD"].includes(req.method)) {
    sendError(res, 405, "Method not allowed");
    return;
  }

  const fullPath = safePublicPath(pathname);
  if (!fullPath) {
    sendError(res, 400, "Invalid path");
    return;
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    sendError(res, 404, "File not found");
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const body = fs.readFileSync(fullPath);

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  if (path.basename(fullPath) === "sw.js") {
    res.setHeader("Cache-Control", "no-cache");
  }
  res.end(body);
}

async function handleRequest(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, url.searchParams);
      return;
    }

    serveStatic(req, res, pathname);
  } catch (error) {
    const statusCode = Number(error.statusCode) || 500;
    const message = error.message || "Internal server error";
    if (!res.headersSent) {
      sendError(res, statusCode, message);
    } else {
      sendText(res, statusCode, message);
    }
  }
}

module.exports = {
  handleRequest
};
