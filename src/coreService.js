const { randomUUID } = require("node:crypto");
const { readDb, writeDb } = require("./lib/db");
const { generatePlan, getProvider, hasProviderKey } = require("./lib/llmGateway");
const { toDayKey, dayDiff } = require("./lib/date");

function nowIso() {
  return new Date().toISOString();
}

function createProgress(userId) {
  return {
    userId,
    points: 0,
    streak: 0,
    longestStreak: 0,
    totalMeals: 0,
    lastMealDate: null,
    planGeneratedCount: 0,
    achievements: []
  };
}

function addEvent(db, type, payload) {
  db.events.push({
    id: randomUUID(),
    type,
    payload,
    timestamp: nowIso()
  });

  if (db.events.length > 2000) {
    db.events = db.events.slice(db.events.length - 2000);
  }
}

function unlockAchievements(progress) {
  const unlocked = [];
  const has = new Set(progress.achievements);

  const checks = [
    { id: "first_plan", ok: progress.planGeneratedCount >= 1 },
    { id: "first_meal", ok: progress.totalMeals >= 1 },
    { id: "streak_3", ok: progress.streak >= 3 },
    { id: "streak_7", ok: progress.streak >= 7 },
    { id: "meal_10", ok: progress.totalMeals >= 10 }
  ];

  for (const item of checks) {
    if (item.ok && !has.has(item.id)) {
      has.add(item.id);
      unlocked.push(item.id);
    }
  }

  progress.achievements = Array.from(has);
  return unlocked;
}

function mustUser(db, userId) {
  const user = db.users[userId];
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
}

function sanitizeTier(tier) {
  const value = String(tier || "").toLowerCase();
  if (!["free", "trial", "premium"].includes(value)) {
    const error = new Error("Invalid subscription tier");
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function onboardUser(payload) {
  const name = String(payload.name || "").trim();
  if (!name) {
    const error = new Error("name is required");
    error.statusCode = 400;
    throw error;
  }

  const goal = String(payload.goal || "balance").trim() || "balance";
  const caloriesTarget = Number(payload.caloriesTarget || 2000);
  if (!Number.isFinite(caloriesTarget) || caloriesTarget < 800 || caloriesTarget > 5000) {
    const error = new Error("caloriesTarget must be between 800 and 5000");
    error.statusCode = 400;
    throw error;
  }

  const db = readDb();
  const id = randomUUID();
  const createdAt = nowIso();

  db.users[id] = {
    id,
    name,
    goal,
    caloriesTarget,
    createdAt
  };

  db.progress[id] = createProgress(id);
  db.subscriptions[id] = {
    tier: "trial",
    updatedAt: createdAt
  };
  db.meals[id] = [];

  addEvent(db, "onboarding_completed", { userId: id, goal, caloriesTarget });
  writeDb(db);

  return {
    userId: id,
    user: db.users[id],
    subscription: db.subscriptions[id]
  };
}

async function createPlan(payload) {
  const userId = String(payload.userId || "").trim();
  if (!userId) {
    const error = new Error("userId is required");
    error.statusCode = 400;
    throw error;
  }

  const preferences = String(payload.preferences || "").trim();
  const db = readDb();
  const user = mustUser(db, userId);

  const plan = await generatePlan({ user, preferences });
  db.plans[userId] = {
    ...plan,
    generatedAt: nowIso()
  };

  const progress = db.progress[userId] || createProgress(userId);
  progress.planGeneratedCount += 1;
  progress.points += 5;
  const unlocked = unlockAchievements(progress);
  db.progress[userId] = progress;

  addEvent(db, "plan_generated", { userId, provider: plan.provider, usingStub: plan.usingStub });
  writeDb(db);

  return {
    plan: db.plans[userId],
    progress,
    unlockedAchievements: unlocked
  };
}

function logMeal(payload) {
  const userId = String(payload.userId || "").trim();
  const mealName = String(payload.mealName || "").trim();
  const calories = Number(payload.calories || 0);
  const date = payload.date;

  if (!userId) {
    const error = new Error("userId is required");
    error.statusCode = 400;
    throw error;
  }
  if (!mealName) {
    const error = new Error("mealName is required");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(calories) || calories < 0 || calories > 5000) {
    const error = new Error("calories must be between 0 and 5000");
    error.statusCode = 400;
    throw error;
  }

  const db = readDb();
  mustUser(db, userId);

  const progress = db.progress[userId] || createProgress(userId);
  const dayKey = toDayKey(date);
  const prevDay = progress.lastMealDate;

  if (!prevDay) {
    progress.streak = 1;
  } else if (prevDay === dayKey) {
    progress.streak = progress.streak || 1;
  } else {
    const diff = dayDiff(prevDay, dayKey);
    progress.streak = diff === 1 ? progress.streak + 1 : 1;
  }

  progress.longestStreak = Math.max(progress.longestStreak, progress.streak);
  progress.lastMealDate = dayKey;
  progress.totalMeals += 1;
  progress.points += 10;
  const unlocked = unlockAchievements(progress);

  db.progress[userId] = progress;
  db.meals[userId] = db.meals[userId] || [];
  db.meals[userId].push({
    id: randomUUID(),
    mealName,
    calories,
    loggedAt: nowIso(),
    dayKey
  });

  addEvent(db, "meal_logged", { userId, mealName, calories, dayKey });
  writeDb(db);

  return {
    progress,
    unlockedAchievements: unlocked,
    lastMeal: db.meals[userId][db.meals[userId].length - 1]
  };
}

function setSubscription(payload) {
  const userId = String(payload.userId || "").trim();
  if (!userId) {
    const error = new Error("userId is required");
    error.statusCode = 400;
    throw error;
  }
  const tier = sanitizeTier(payload.tier);

  const db = readDb();
  mustUser(db, userId);
  db.subscriptions[userId] = {
    tier,
    updatedAt: nowIso()
  };
  addEvent(db, "subscription_changed", { userId, tier });
  writeDb(db);

  return db.subscriptions[userId];
}

function getProgress(userId) {
  const db = readDb();
  const user = mustUser(db, userId);
  return {
    user,
    plan: db.plans[userId] || null,
    progress: db.progress[userId] || createProgress(userId),
    subscription: db.subscriptions[userId] || { tier: "free", updatedAt: null },
    meals: (db.meals[userId] || []).slice(-20).reverse()
  };
}

function listEvents(limit = 30) {
  const db = readDb();
  const normalized = Math.max(1, Math.min(Number(limit) || 30, 200));
  return db.events.slice(-normalized).reverse();
}

function getPublicConfig() {
  const provider = getProvider();
  return {
    provider,
    providerKeyConfigured: hasProviderKey(provider)
  };
}

module.exports = {
  onboardUser,
  createPlan,
  logMeal,
  setSubscription,
  getProgress,
  listEvents,
  getPublicConfig
};
