const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const http = require("node:http");
const { setTimeout: sleep } = require("node:timers/promises");

const PORT = 4311;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(process.cwd(), "data", "db.test.json");

process.env.DB_PATH = DB_PATH;

const { handleRequest } = require("../app");

async function waitForHealth(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // waiting for startup
    }
    await sleep(150);
  }
  return false;
}

function startServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: error.message || "Unhandled test server error" }));
        return;
      }
      res.end();
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function request(pathname, method = "GET", body) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed: ${payload.error || response.status}`);
  }
  return payload;
}

async function run() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const server = await startServer();
  try {
    const up = await waitForHealth();
    assert.equal(up, true, "Server did not start in time");

    const homeResponse = await fetch(`${BASE_URL}/`);
    assert.equal(homeResponse.ok, true, "Homepage is not available");
    const html = await homeResponse.text();
    assert.equal(html.includes('id="lemonImage"'), true, "Lemon avatar block is missing");

    const lemonVideo = await fetch(`${BASE_URL}/assets/limon/limon1.mp4`);
    assert.equal(lemonVideo.ok, true, "Milestone video is not available");
    assert.equal(
      (lemonVideo.headers.get("content-type") || "").includes("video/mp4"),
      true,
      "Milestone video has wrong content type"
    );

    const onboard = await request("/api/users/onboard", "POST", {
      name: "Test User",
      goal: "fat_loss",
      caloriesTarget: 1800
    });
    assert.ok(onboard.userId, "userId missing");

    const userId = onboard.userId;

    const plan = await request("/api/plans/generate", "POST", {
      userId,
      preferences: "high protein"
    });
    assert.equal(Boolean(plan.plan), true, "plan missing");
    assert.equal(Boolean(plan.progress), true, "progress missing");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await request("/api/meals/log", "POST", {
      userId,
      mealName: "Chicken salad",
      calories: 420,
      date: yesterday
    });

    const meal2 = await request("/api/meals/log", "POST", {
      userId,
      mealName: "Fish and rice",
      calories: 520
    });
    assert.equal(meal2.progress.streak >= 1, true, "streak was not updated");

    const sub = await request("/api/subscriptions/set", "POST", {
      userId,
      tier: "premium"
    });
    assert.equal(sub.tier, "premium", "subscription tier mismatch");

    const progress = await request(`/api/progress/${encodeURIComponent(userId)}`, "GET");
    assert.equal(progress.user.id, userId, "wrong user");
    assert.equal(progress.subscription.tier, "premium", "tier is not premium");
    assert.equal(progress.progress.totalMeals >= 2, true, "meal logs are missing");
    assert.equal(Array.isArray(progress.meals), true, "meals should be array");

    const events = await request("/api/events?limit=10", "GET");
    assert.equal(Array.isArray(events.events), true, "events should be array");
    assert.equal(events.events.length >= 4, true, "expected domain events were not created");

    console.log("Smoke test passed.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await sleep(100);
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
