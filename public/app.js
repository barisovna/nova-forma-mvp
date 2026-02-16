const state = {
  userId: localStorage.getItem("userId") || "",
  milestoneMemory: loadMilestoneMemory(),
  lastProgressResponse: null,
  currentAnchor: "step-onboard",
  lastAutoMoveAt: 0
};

const LEMON_IMAGE_BY_MOOD = {
  idle: "/assets/limon/limonfoto1.png",
  guide: "/assets/limon/limonid3.png",
  focus: "/assets/limon/limonid2.png",
  win: "/assets/limon/limonid1.png"
};

const LEMON_MILESTONES = {
  3: "/assets/limon/limon1.mp4",
  7: "/assets/limon/limon2.mp4",
  14: "/assets/limon/limon3.mp4"
};

const STEP_ORDER = [
  "step-onboard",
  "step-plan",
  "step-meal",
  "step-subscription",
  "step-progress"
];

const STEP_HINTS = {
  "step-onboard": "Создай профиль, чтобы я рассчитал тебе игровой маршрут.",
  "step-plan": "Теперь генерируем план питания. Это даст первые XP.",
  "step-meal": "Добавь прием пищи в лог. Серия начинается с первого дня.",
  "step-subscription": "Выбери тариф для доступа к расширенным режимам.",
  "step-progress": "Проверь прогресс и журнал. Я подскажу следующую цель."
};

const el = {
  healthBadge: document.getElementById("healthBadge"),
  providerBadge: document.getElementById("providerBadge"),
  activeUserBadge: document.getElementById("activeUserBadge"),
  statLevel: document.getElementById("statLevel"),
  statStreak: document.getElementById("statStreak"),
  statPoints: document.getElementById("statPoints"),
  statAchievements: document.getElementById("statAchievements"),
  xpText: document.getElementById("xpText"),
  xpFill: document.getElementById("xpFill"),
  questList: document.getElementById("questList"),
  onboardForm: document.getElementById("onboardForm"),
  planForm: document.getElementById("planForm"),
  mealForm: document.getElementById("mealForm"),
  subscriptionForm: document.getElementById("subscriptionForm"),
  refreshProgress: document.getElementById("refreshProgress"),
  refreshEvents: document.getElementById("refreshEvents"),
  planOutput: document.getElementById("planOutput"),
  progressOutput: document.getElementById("progressOutput"),
  eventsOutput: document.getElementById("eventsOutput"),
  lemonAgent: document.getElementById("lemonAgent"),
  lemonImage: document.getElementById("lemonImage"),
  lemonVideo: document.getElementById("lemonVideo"),
  agentBubble: document.getElementById("agentBubble")
};

function loadMilestoneMemory() {
  try {
    const raw = localStorage.getItem("lemonMilestones");
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore malformed local state
  }
  return {};
}

function saveMilestoneMemory() {
  localStorage.setItem("lemonMilestones", JSON.stringify(state.milestoneMemory));
}

function setActiveUser(userId) {
  state.userId = userId || "";
  if (state.userId) {
    localStorage.setItem("userId", state.userId);
    el.activeUserBadge.textContent = `Профиль: ${state.userId.slice(0, 8)}...`;
  } else {
    localStorage.removeItem("userId");
    el.activeUserBadge.textContent = "Профиль не создан";
  }
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

function getProgressModel(progressResponse) {
  const response = progressResponse || {};
  const progress = response.progress || {};
  const subscription = response.subscription || {};
  const user = response.user || null;

  return {
    user,
    points: Number(progress.points || 0),
    streak: Number(progress.streak || 0),
    totalMeals: Number(progress.totalMeals || 0),
    planGeneratedCount: Number(progress.planGeneratedCount || 0),
    achievements: Array.isArray(progress.achievements) ? progress.achievements : [],
    lastMealDate: progress.lastMealDate || null,
    tier: subscription.tier || "free"
  };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function buildQuests(model) {
  return [
    { id: "profile", text: "Создать профиль", done: Boolean(model.user) },
    { id: "plan", text: "Сгенерировать первый план", done: model.planGeneratedCount > 0 },
    { id: "meal_today", text: "Добавить лог питания сегодня", done: model.lastMealDate === getTodayKey() },
    { id: "streak_3", text: "Собрать серию 3 дня", done: model.streak >= 3 },
    { id: "premium", text: "Активировать premium", done: model.tier === "premium" }
  ];
}

function getNextStepFromQuests(quests) {
  if (!quests[0].done) {
    return "step-onboard";
  }
  if (!quests[1].done) {
    return "step-plan";
  }
  if (!quests[2].done || !quests[3].done) {
    return "step-meal";
  }
  if (!quests[4].done) {
    return "step-subscription";
  }
  return "step-progress";
}

function computeLevel(points) {
  const xpPerLevel = 50;
  const level = Math.floor(points / xpPerLevel) + 1;
  const currentXp = points % xpPerLevel;
  return {
    level,
    currentXp,
    xpPerLevel
  };
}

function renderGameCenter(progressResponse) {
  const model = getProgressModel(progressResponse);
  const levelInfo = computeLevel(model.points);
  const quests = buildQuests(model);

  el.statLevel.textContent = String(levelInfo.level);
  el.statStreak.textContent = String(model.streak);
  el.statPoints.textContent = String(model.points);
  el.statAchievements.textContent = String(model.achievements.length);
  el.xpText.textContent = `${levelInfo.currentXp} / ${levelInfo.xpPerLevel} XP`;
  el.xpFill.style.width = `${(levelInfo.currentXp / levelInfo.xpPerLevel) * 100}%`;

  el.questList.innerHTML = "";
  for (const quest of quests) {
    const item = document.createElement("li");
    item.className = `quest-item${quest.done ? " done" : ""}`;
    item.innerHTML = `
      <span class="quest-mark">${quest.done ? "✓" : "•"}</span>
      <span>${quest.text}</span>
    `;
    el.questList.appendChild(item);
  }

  return {
    model,
    quests
  };
}

function setLemonMood(mood) {
  const nextImage = LEMON_IMAGE_BY_MOOD[mood] || LEMON_IMAGE_BY_MOOD.idle;
  if (el.lemonImage.src.endsWith(nextImage)) {
    return;
  }
  el.lemonImage.src = nextImage;
}

function setAgentBubble(text) {
  el.agentBubble.textContent = text;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAnchorPosition(stepId) {
  const node = document.getElementById(stepId);
  if (!node) {
    return { x: 24, y: 100 };
  }

  const rect = node.getBoundingClientRect();
  const agentWidth = 108;
  const edge = 20;

  let x = rect.right + 14;
  if (x + agentWidth > window.innerWidth - edge) {
    x = rect.left - agentWidth - 14;
  }
  if (x < edge) {
    x = window.innerWidth - agentWidth - edge;
  }

  const y = clamp(rect.top + Math.min(42, rect.height * 0.3), 88, window.innerHeight - 140);
  return { x, y };
}

function placeAgentAt(stepId, options = {}) {
  const { mood = "guide", speech = STEP_HINTS[stepId] || STEP_HINTS["step-onboard"] } = options;
  const { x, y } = getAnchorPosition(stepId);
  state.currentAnchor = stepId;
  state.lastAutoMoveAt = Date.now();

  setLemonMood(mood);
  setAgentBubble(speech);

  el.lemonAgent.style.left = `${x}px`;
  el.lemonAgent.style.top = `${y}px`;

  const bubbleX = clamp(x - 220, 12, window.innerWidth - 270);
  const bubbleY = clamp(y - 18, 12, window.innerHeight - 130);
  el.agentBubble.style.left = `${bubbleX}px`;
  el.agentBubble.style.top = `${bubbleY}px`;
}

function hideLemonVideo() {
  el.lemonVideo.pause();
  el.lemonVideo.currentTime = 0;
  el.lemonVideo.classList.add("lemon-video-hidden");
}

function getShownMilestones(userId) {
  return Array.isArray(state.milestoneMemory[userId]) ? state.milestoneMemory[userId] : [];
}

function markMilestoneShown(userId, milestone) {
  const current = new Set(getShownMilestones(userId));
  current.add(Number(milestone));
  state.milestoneMemory[userId] = Array.from(current).sort((a, b) => a - b);
  saveMilestoneMemory();
}

async function maybePlayMilestoneVideo(streak) {
  if (!state.userId) {
    return;
  }

  const shown = getShownMilestones(state.userId);
  const milestones = Object.keys(LEMON_MILESTONES)
    .map((item) => Number(item))
    .sort((a, b) => a - b);
  const nextMilestone = milestones.find((milestone) => streak >= milestone && !shown.includes(milestone));
  if (!nextMilestone) {
    return;
  }

  markMilestoneShown(state.userId, nextMilestone);
  el.lemonVideo.src = LEMON_MILESTONES[nextMilestone];
  el.lemonVideo.classList.remove("lemon-video-hidden");
  setAgentBubble(`Награда! Серия ${nextMilestone} дня. Ты в ритме.`);
  setLemonMood("win");

  try {
    await el.lemonVideo.play();
  } catch {
    hideLemonVideo();
  }
}

function chooseMood(model, nextStep) {
  if (model.streak >= 7) {
    return "win";
  }
  if (nextStep === "step-onboard") {
    return "idle";
  }
  if (nextStep === "step-meal") {
    return "focus";
  }
  return "guide";
}

function findClosestStepInView() {
  const center = window.innerHeight * 0.42;
  let winner = state.currentAnchor;
  let winnerDistance = Number.POSITIVE_INFINITY;

  for (const stepId of STEP_ORDER) {
    const node = document.getElementById(stepId);
    if (!node) {
      continue;
    }
    const rect = node.getBoundingClientRect();
    const point = rect.top + rect.height * 0.35;
    const dist = Math.abs(center - point);
    if (dist < winnerDistance) {
      winnerDistance = dist;
      winner = stepId;
    }
  }
  return winner;
}

function syncAgentFromProgress(progressResponse, reason = "progress") {
  const { model, quests } = renderGameCenter(progressResponse);
  const nextStep = getNextStepFromQuests(quests);
  const mood = chooseMood(model, nextStep);

  const speechByReason = {
    onboard: "Профиль создан. Отлично, теперь генерируем первый план.",
    plan: "План готов. Добавь прием пищи, чтобы начать серию.",
    meal: model.streak > 0
      ? `Лог добавлен! Серия: ${model.streak}. Продолжаем без пропусков.`
      : "Лог добавлен. Следующая цель - закрепить серию.",
    subscription: `Тариф обновлен: ${model.tier}. Дальше держим прогресс.`,
    error: "Есть техническая ошибка. Я рядом, сейчас поправим.",
    progress: STEP_HINTS[nextStep]
  };

  placeAgentAt(nextStep, {
    mood,
    speech: speechByReason[reason] || speechByReason.progress
  });

  maybePlayMilestoneVideo(model.streak);
}

function showError(message) {
  setLemonMood("focus");
  setAgentBubble(`Ошибка: ${message}`);
  alert(message);
}

async function loadHealthAndConfig() {
  try {
    const health = await api("/api/health");
    const config = await api("/api/config");
    el.healthBadge.textContent = `API: ${health.status}`;
    el.providerBadge.textContent = `LLM: ${config.provider}${config.providerKeyConfigured ? "" : " (stub)"}`;
  } catch (error) {
    el.healthBadge.textContent = `API: ошибка (${error.message})`;
    showError(error.message);
  }
}

async function refreshProgress(reason = "progress") {
  if (!state.userId) {
    el.progressOutput.textContent = "Профиль еще не создан.";
    renderGameCenter(null);
    placeAgentAt("step-onboard", {
      mood: "idle",
      speech: "Начнем с простого шага: создай профиль."
    });
    return;
  }

  try {
    const data = await api(`/api/progress/${encodeURIComponent(state.userId)}`);
    state.lastProgressResponse = data;
    el.progressOutput.textContent = pretty(data);
    syncAgentFromProgress(data, reason);
  } catch (error) {
    showError(error.message);
  }
}

async function refreshEvents() {
  try {
    const data = await api("/api/events?limit=20");
    el.eventsOutput.textContent = pretty(data.events);
  } catch (error) {
    showError(error.message);
  }
}

el.onboardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    name: form.querySelector("#name").value.trim(),
    goal: form.querySelector("#goal").value.trim(),
    caloriesTarget: Number(form.querySelector("#caloriesTarget").value)
  };

  try {
    const data = await api("/api/users/onboard", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setActiveUser(data.userId);
    hideLemonVideo();
    await refreshProgress("onboard");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  }
});

el.planForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("Сначала создай профиль.");
    return;
  }

  const preferences = event.currentTarget.querySelector("#preferences").value.trim();
  try {
    const data = await api("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, preferences })
    });
    el.planOutput.textContent = pretty(data.plan);
    await refreshProgress("plan");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  }
});

el.mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("Сначала создай профиль.");
    return;
  }

  const form = event.currentTarget;
  const mealDate = form.querySelector("#mealDate").value;
  const payload = {
    userId: state.userId,
    mealName: form.querySelector("#mealName").value.trim(),
    calories: Number(form.querySelector("#mealCalories").value),
    ...(mealDate ? { date: mealDate } : {})
  };

  try {
    await api("/api/meals/log", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await refreshProgress("meal");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  }
});

el.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("Сначала создай профиль.");
    return;
  }
  const tier = event.currentTarget.querySelector("#subscriptionTier").value;

  try {
    await api("/api/subscriptions/set", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, tier })
    });
    await refreshProgress("subscription");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  }
});

el.refreshProgress.addEventListener("click", () => refreshProgress("progress"));
el.refreshEvents.addEventListener("click", refreshEvents);
el.lemonVideo.addEventListener("ended", hideLemonVideo);
el.lemonVideo.addEventListener("error", hideLemonVideo);

let scrollTimer = null;
window.addEventListener(
  "scroll",
  () => {
    if (scrollTimer) {
      return;
    }
    scrollTimer = window.setTimeout(() => {
      scrollTimer = null;
      if (Date.now() - state.lastAutoMoveAt < 900) {
        return;
      }
      const nearStep = findClosestStepInView();
      placeAgentAt(nearStep, {
        mood: "guide",
        speech: STEP_HINTS[nearStep]
      });
    }, 180);
  },
  { passive: true }
);

window.addEventListener("resize", () => {
  placeAgentAt(state.currentAnchor, {
    mood: "guide",
    speech: STEP_HINTS[state.currentAnchor]
  });
});

if ("serviceWorker" in navigator) {
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (isLocal) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  } else {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

setActiveUser(state.userId);
hideLemonVideo();
renderGameCenter(null);
placeAgentAt("step-onboard", {
  mood: "idle",
  speech: "Я живой AI-агент. Давай начнем с профиля."
});
loadHealthAndConfig();
refreshProgress("progress");
refreshEvents();
