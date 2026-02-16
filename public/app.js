/* ── State ── */
const state = {
  userId: localStorage.getItem("userId") || "",
  milestoneMemory: loadMilestoneMemory(),
  lastProgressResponse: null,
  goalType: localStorage.getItem("goalType") || "balance",
  activeStep: localStorage.getItem("activeStep") || "step-onboard",
  unlockedStepIds: ["step-onboard"],
  currentAnchor: "step-onboard",
  lastAutoMoveAt: 0,
  lastEmotionImage: "",
  prevPoints: 0,
  prevLevel: 1,
  prevStreak: 0,
  prevAchievements: [],
  prevQuestsDone: new Set(),
  recovering: false,
  clickPhrases: [
    "Хей, не щекотись!",
    "Лимончик бодр и готов!",
    "Жми дальше — мы в ритме!",
    "Я слежу за твоей серией!",
    "Вперёд к новому уровню!",
    "Кислый, но мотивированный!",
    "Не сдавайся, ты в топе!"
  ]
};

const IS_LOCAL = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const DEV_MODE = IS_LOCAL || new URLSearchParams(location.search).get("dev") === "1";

if (!DEV_MODE) {
  document.querySelectorAll("[data-dev-only]").forEach((node) => {
    node.hidden = true;
  });
}

/* ── Emotion Library ── */
const LEMON_EMOTION_LIBRARY = {
  balance: {
    idle: [
      "/assets/limon/limonfoto1.png",
      "/assets/limon/limonid-okay.png",
      "/assets/limon/limonid-love.png"
    ],
    guide: [
      "/assets/limon/limonid-with-a-book.png",
      "/assets/limon/limonid-class.png",
      "/assets/limon/limonid-question.png"
    ],
    focus: ["/assets/limon/limonid-keen.png", "/assets/limon/limonid-language.png"],
    win: [
      "/assets/limon/limonid-class-star.png",
      "/assets/limon/limonid-muscle-strength.png",
      "/assets/limon/limonid-love2.png",
      "/assets/limon/limonid-laughter.png"
    ],
    error: ["/assets/limon/limonid-get-angry.png", "/assets/limon/limonid-steaming-screaming.png"]
  },
  loss: {
    idle: ["/assets/limon/limonid-okay.png", "/assets/limon/limonid-question.png"],
    guide: ["/assets/limon/limonid-with-a-book.png", "/assets/limon/limonid-class.png"],
    focus: ["/assets/limon/limonid-keen.png", "/assets/limon/limonid-language.png"],
    win: [
      "/assets/limon/limonid-class-star.png",
      "/assets/limon/limonid-muscle-strength.png",
      "/assets/limon/limonid-laughter.png"
    ],
    error: ["/assets/limon/limonid-get-angry.png", "/assets/limon/limonid-steaming-screaming.png"]
  },
  maintain: {
    idle: ["/assets/limon/limonfoto1.png", "/assets/limon/limonid-love.png", "/assets/limon/limonid-okay.png"],
    guide: ["/assets/limon/limonid-class.png", "/assets/limon/limonid-with-a-book.png"],
    focus: ["/assets/limon/limonid-question.png", "/assets/limon/limonid-language.png"],
    win: ["/assets/limon/limonid-love2.png", "/assets/limon/limonid-laughter.png", "/assets/limon/limonid-class-star.png"],
    error: ["/assets/limon/limonid-get-angry.png", "/assets/limon/limonid-steaming-screaming.png"]
  },
  gain: {
    idle: ["/assets/limon/limonfoto2.png", "/assets/limon/limonid-love2.png"],
    guide: ["/assets/limon/limonid-class-star.png", "/assets/limon/limonid-with-a-book.png"],
    focus: ["/assets/limon/limonid-muscle-strength.png", "/assets/limon/limonid-keen.png"],
    win: [
      "/assets/limon/limonid-muscle-strength.png",
      "/assets/limon/limonid-class-star.png",
      "/assets/limon/limonid-laughter.png"
    ],
    error: ["/assets/limon/limonid-get-angry.png", "/assets/limon/limonid-steaming-screaming.png"]
  }
};

const LEMON_DEFAULT_IMAGE = "/assets/limon/limonfoto1.png";

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

const STEP_MOOD_BY_STEP = {
  "step-onboard": "idle",
  "step-plan": "guide",
  "step-meal": "focus",
  "step-subscription": "guide",
  "step-progress": "win"
};

const LEADERBOARD_RIVALS = [
  { name: "Citrus Flash", score: 340 },
  { name: "Mint Rocket", score: 290 },
  { name: "Nova Bee", score: 245 },
  { name: "Pulse Fox", score: 210 }
];

const STEP_HINTS = {
  "step-onboard": "Создай профиль, чтобы я рассчитал тебе игровой маршрут.",
  "step-plan": "Теперь генерируем план питания. Это даст первые XP.",
  "step-meal": "Добавь прием пищи в лог. Серия начинается с первого дня.",
  "step-subscription": "Выбери тариф для доступа к расширенным режимам.",
  "step-progress": "Проверь прогресс и журнал. Я подскажу следующую цель."
};

const ACHIEVEMENT_NAMES = {
  first_plan: "Первый план",
  first_meal: "Первый приём",
  streak_3: "Серия 3 дня",
  streak_7: "Серия 7 дней",
  meal_10: "10 приёмов"
};

/* ── DOM Cache ── */
const el = {
  healthBadge: document.getElementById("healthBadge"),
  providerBadge: document.getElementById("providerBadge"),
  activeUserBadge: document.getElementById("activeUserBadge"),
  stepNav: document.getElementById("stepNav"),
  menuSteps: Array.from(document.querySelectorAll(".menu-step[data-step-target]")),
  questSteps: Array.from(document.querySelectorAll(".quest-step")),
  missionTitle: document.getElementById("missionTitle"),
  missionText: document.getElementById("missionText"),
  missionAction: document.getElementById("missionAction"),
  journeyPercent: document.getElementById("journeyPercent"),
  journeyFill: document.getElementById("journeyFill"),
  journeyHint: document.getElementById("journeyHint"),
  leaderboardList: document.getElementById("leaderboardList"),
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
  agentBubble: document.getElementById("agentBubble"),
  toastContainer: document.getElementById("toastContainer"),
  confettiCanvas: document.getElementById("confettiCanvas"),
  agentMinimize: document.getElementById("agentMinimize")
};

/* ── Toast System ── */
const MAX_TOASTS = 3;

function showToast(message, type = "xp", icon = "") {
  const icons = {
    xp: "\u2B50",
    level: "\u{1F680}",
    achievement: "\u{1F3C6}",
    streak: "\u{1F525}",
    quest: "\u2705",
    error: "\u26A0\uFE0F"
  };
  // Remove oldest toasts if at capacity
  const existing = el.toastContainer.querySelectorAll(".toast:not(.toast-out)");
  if (existing.length >= MAX_TOASTS) {
    for (let i = 0; i <= existing.length - MAX_TOASTS; i++) {
      dismissToast(existing[i]);
    }
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon || icons[type] || icons.xp}</span><span>${message}</span>`;
  toast.addEventListener("click", () => dismissToast(toast));
  el.toastContainer.appendChild(toast);
  setTimeout(() => dismissToast(toast), 3000);
}

function dismissToast(toast) {
  if (toast.classList.contains("toast-out")) return;
  toast.classList.add("toast-out");
  toast.addEventListener("animationend", () => toast.remove());
}

/* ── Confetti System ── */
function launchConfetti(duration = 2000) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = el.confettiCanvas;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#f59e0b", "#22c55e", "#8b5cf6", "#ef4444", "#0ea5e9", "#f97316", "#ec4899"];
  const startTime = Date.now();

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 40,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      spin: (Math.random() - 0.5) * 0.2,
      angle: Math.random() * Math.PI * 2
    });
  }

  function frame() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const alpha = elapsed > duration - 500 ? Math.max(0, (duration - elapsed) / 500) : 1;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.angle += p.spin;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < duration) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(frame);
}

/* ── Floating XP Numbers ── */
function floatXP(amount, sourceEl) {
  const rect = sourceEl ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };
  const floater = document.createElement("div");
  floater.className = "float-xp";
  floater.textContent = `+${amount} XP`;
  floater.style.left = `${rect.left + 10}px`;
  floater.style.top = `${rect.top}px`;
  document.body.appendChild(floater);
  floater.addEventListener("animationend", () => floater.remove());
}

/* ── Level-Up Overlay ── */
function showLevelUp(level) {
  const overlay = document.createElement("div");
  overlay.className = "levelup-overlay";
  overlay.innerHTML = `
    <div class="levelup-badge">
      <h2>LEVEL UP!</h2>
      <div class="level-num">${level}</div>
      <p>Новый уровень достигнут</p>
    </div>
  `;
  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);
  launchConfetti(2500);
  setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 4000);
}

/* ── Agent Reactions ── */
function agentReact(type) {
  el.lemonAgent.classList.remove("react-bounce", "react-shake");
  void el.lemonAgent.offsetWidth;
  el.lemonAgent.classList.add(type === "error" ? "react-shake" : "react-bounce");
  setTimeout(() => el.lemonAgent.classList.remove("react-bounce", "react-shake"), 600);
}

/* ── Stat Pop Animation ── */
function popStat(element) {
  element.classList.remove("pop");
  void element.offsetWidth;
  element.classList.add("pop");
  setTimeout(() => element.classList.remove("pop"), 400);
}

/* ── Button Loading State ── */
function setButtonLoading(button, loading) {
  if (loading) {
    button.classList.add("is-loading");
    button.dataset.originalText = button.textContent;
    button.textContent = "Загрузка...";
  } else {
    button.classList.remove("is-loading");
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

/* ── Debounce Utility ── */
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ── Milestone Memory ── */
function loadMilestoneMemory() {
  try {
    const raw = localStorage.getItem("lemonMilestones");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // ignore
  }
  return {};
}

function saveMilestoneMemory() {
  localStorage.setItem("lemonMilestones", JSON.stringify(state.milestoneMemory));
}

/* ── Goal Detection ── */
function detectGoalType(goalRaw) {
  const value = String(goalRaw || "").toLowerCase().trim();
  if (["loss", "maintain", "gain"].includes(value)) return value;
  return "balance";
}

function setGoalType(goalRaw) {
  state.goalType = detectGoalType(goalRaw);
  localStorage.setItem("goalType", state.goalType);
}

function setActiveUser(userId) {
  state.userId = userId || "";
  if (state.userId) {
    localStorage.setItem("userId", state.userId);
    el.activeUserBadge.textContent = `\u041f\u0440\u043e\u0444\u0438\u043b\u044c: ${state.userId.slice(0, 8)}...`;
  } else {
    localStorage.removeItem("userId");
    el.activeUserBadge.textContent = "\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d";
  }
}

function saveUserProfile(name, goal, caloriesTarget) {
  localStorage.setItem("userProfile", JSON.stringify({ name, goal, caloriesTarget }));
}

function getSavedProfile() {
  try {
    const raw = localStorage.getItem("userProfile");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function autoRecoverUser() {
  if (state.recovering) return false;
  const profile = getSavedProfile();
  if (!profile || !profile.name) return false;

  state.recovering = true;
  try {
    const data = await api("/api/users/onboard", {
      method: "POST",
      body: JSON.stringify(profile)
    });
    setActiveUser(data.userId);
    showToast("\u0421\u0435\u0441\u0441\u0438\u044f \u0432\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0430", "quest", "\u{1F504}");
    return true;
  } catch {
    return false;
  } finally {
    state.recovering = false;
  }
}

setGoalType(state.goalType);

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

/* ── API with Request Deduplication + Auto-Recovery ── */
const pendingRequests = new Map();

async function api(path, options = {}, _retried = false) {
  const key = options.method === "POST" ? null : path;
  if (key && pendingRequests.has(key)) return pendingRequests.get(key);

  const promise = (async () => {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const isUserNotFound = response.status === 404 && /user not found/i.test(payload.error || "");
      if (isUserNotFound && !_retried) {
        const recovered = await autoRecoverUser();
        if (recovered) {
          let retryPath = path;
          if (path.includes("/api/progress/")) {
            retryPath = `/api/progress/${encodeURIComponent(state.userId)}`;
          }
          let retryOpts = options;
          if (options.body && typeof options.body === "string") {
            try {
              const parsed = JSON.parse(options.body);
              if (parsed.userId) {
                parsed.userId = state.userId;
                retryOpts = { ...options, body: JSON.stringify(parsed) };
              }
            } catch { /* keep original */ }
          }
          return api(retryPath, retryOpts, true);
        }
      }
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  })();

  if (key) {
    pendingRequests.set(key, promise);
    promise.finally(() => pendingRequests.delete(key));
  }
  return promise;
}

/* ── Progress Model ── */
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
    { id: "profile", text: "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c", done: Boolean(model.user) },
    { id: "plan", text: "\u0421\u0433\u0435\u043d\u0435\u0440\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u043f\u0435\u0440\u0432\u044b\u0439 \u043f\u043b\u0430\u043d", done: model.planGeneratedCount > 0 },
    { id: "meal_today", text: "\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043b\u043e\u0433 \u043f\u0438\u0442\u0430\u043d\u0438\u044f \u0441\u0435\u0433\u043e\u0434\u043d\u044f", done: model.lastMealDate === getTodayKey() },
    { id: "streak_3", text: "\u0421\u043e\u0431\u0440\u0430\u0442\u044c \u0441\u0435\u0440\u0438\u044e 3 \u0434\u043d\u044f", done: model.streak >= 3 },
    { id: "premium", text: "\u0410\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c premium", done: model.tier === "premium" }
  ];
}

function getNextStepFromQuests(quests) {
  if (!quests[0].done) return "step-onboard";
  if (!quests[1].done) return "step-plan";
  if (!quests[2].done) return "step-meal";
  if (!quests[4].done) return "step-subscription";
  return "step-progress";
}

function getStepNode(stepId) {
  return document.getElementById(stepId);
}

function getStepTitle(stepId) {
  const node = getStepNode(stepId);
  return (node && node.dataset.stepTitle) || "\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u0448\u0430\u0433";
}

function getStepCallToAction(stepId) {
  const node = getStepNode(stepId);
  return (node && node.dataset.stepCta) || STEP_HINTS[stepId] || STEP_HINTS["step-onboard"];
}

function getUnlockedStepsFromQuests(quests) {
  const nextStep = getNextStepFromQuests(quests);
  const nextIndex = Math.max(0, STEP_ORDER.indexOf(nextStep));
  return STEP_ORDER.slice(0, nextIndex + 1);
}

const LOCK_HINTS = {
  "step-plan": "Сначала создайте профиль",
  "step-meal": "Сначала сгенерируйте план",
  "step-subscription": "Сначала добавьте приём пищи",
  "step-progress": "Сначала выберите тариф"
};

function setUnlockedSteps(stepIds) {
  const normalized = STEP_ORDER.filter((stepId) => stepIds.includes(stepId));
  state.unlockedStepIds = normalized.length ? normalized : ["step-onboard"];

  for (const button of el.menuSteps) {
    const target = button.dataset.stepTarget;
    const unlocked = state.unlockedStepIds.includes(target);
    button.disabled = !unlocked;
    button.classList.toggle("is-locked", !unlocked);
    button.title = unlocked ? "" : (LOCK_HINTS[target] || "Пройдите предыдущие шаги");
  }
}

function renderJourney(quests, nextStep) {
  const total = quests.length || 1;
  const completed = quests.filter((quest) => quest.done).length;
  const percent = Math.round((completed / total) * 100);
  el.journeyPercent.textContent = `${percent}%`;
  el.journeyFill.style.width = `${percent}%`;
  el.journeyHint.textContent = getStepCallToAction(nextStep);
}

function renderLeaderboard(model) {
  const me = {
    name: (model.user && model.user.name ? model.user.name : "Вы"),
    score:
      Number(model.points || 0) +
      Number(model.streak || 0) * 14 +
      Number(model.achievements.length || 0) * 24 +
      Number(model.planGeneratedCount || 0) * 8,
    isUser: true
  };

  el.leaderboardList.innerHTML = "";

  // If user has no score yet, show motivational placeholder
  if (me.score === 0) {
    const placeholder = document.createElement("li");
    placeholder.className = "leaderboard-row is-user";
    placeholder.innerHTML = `
      <span class="leader-rank">?</span>
      <span>
        <strong class="leader-name">Пройдите первые шаги</strong>
        <small class="leader-score">чтобы попасть в таблицу лидеров</small>
      </span>
      <strong>0 XP</strong>
    `;
    el.leaderboardList.appendChild(placeholder);
    return;
  }

  const rows = [...LEADERBOARD_RIVALS, me].sort((a, b) => b.score - a.score);
  const top = rows.slice(0, 5);
  if (!top.some((row) => row.isUser)) {
    top[top.length - 1] = me;
  }

  top.forEach((row, index) => {
    const item = document.createElement("li");
    item.className = `leaderboard-row${row.isUser ? " is-user" : ""}`;
    const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
    const rankDisplay = index < 3 ? medals[index] : String(index + 1);
    item.innerHTML = `
      <span class="leader-rank">${rankDisplay}</span>
      <span>
        <strong class="leader-name">${row.name}</strong>
        <small class="leader-score">${row.isUser ? "ваш результат" : "игрок лиги"}</small>
      </span>
      <strong>${row.score} XP</strong>
    `;
    item.style.animationDelay = `${index * 60}ms`;
    el.leaderboardList.appendChild(item);
  });
}

function setActiveStep(stepId, options = {}) {
  const { force = false } = options;
  if (!STEP_ORDER.includes(stepId)) return;
  if (!force && !state.unlockedStepIds.includes(stepId)) return;

  state.activeStep = stepId;
  localStorage.setItem("activeStep", stepId);

  for (const section of el.questSteps) {
    const isActive = section.id === stepId;
    section.hidden = !isActive;
    section.classList.toggle("is-active", isActive);
  }

  for (const button of el.menuSteps) {
    button.classList.toggle("is-active", button.dataset.stepTarget === stepId);
  }

  el.missionTitle.textContent = getStepTitle(stepId);
  el.missionText.textContent = getStepCallToAction(stepId);
}

function focusCurrentStepAction() {
  const section = getStepNode(state.activeStep);
  if (!section) return;
  if (state.activeStep === "step-progress") {
    refreshProgress("progress");
    refreshEvents();
  }
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  const control = section.querySelector("input, textarea, select, button");
  if (control) control.focus();
}

function computeLevel(points) {
  const xpPerLevel = 50;
  const level = Math.floor(points / xpPerLevel) + 1;
  const currentXp = points % xpPerLevel;
  return { level, currentXp, xpPerLevel };
}

/* ── Gamification Delta Detection ── */
function detectChanges(model, quests) {
  const changes = {
    xpGained: 0,
    leveledUp: false,
    newLevel: 0,
    newAchievements: [],
    streakChanged: false,
    newStreak: 0,
    newQuestsDone: []
  };

  const pointsDiff = model.points - state.prevPoints;
  if (pointsDiff > 0 && state.prevPoints > 0) {
    changes.xpGained = pointsDiff;
  }

  const levelInfo = computeLevel(model.points);
  if (levelInfo.level > state.prevLevel && state.prevLevel > 0) {
    changes.leveledUp = true;
    changes.newLevel = levelInfo.level;
  }

  if (model.streak > state.prevStreak && state.prevStreak > 0) {
    changes.streakChanged = true;
    changes.newStreak = model.streak;
  }

  for (const ach of model.achievements) {
    if (!state.prevAchievements.includes(ach)) {
      changes.newAchievements.push(ach);
    }
  }

  const currentDone = new Set(quests.filter((q) => q.done).map((q) => q.id));
  for (const id of currentDone) {
    if (!state.prevQuestsDone.has(id)) {
      changes.newQuestsDone.push(id);
    }
  }

  // Update previous state
  state.prevPoints = model.points;
  state.prevLevel = levelInfo.level;
  state.prevStreak = model.streak;
  state.prevAchievements = [...model.achievements];
  state.prevQuestsDone = currentDone;

  return changes;
}

/* ── Apply Gamification Effects ── */
function applyGamificationEffects(changes) {
  if (changes.xpGained > 0) {
    showToast(`+${changes.xpGained} XP \u0437\u0430\u0440\u0430\u0431\u043e\u0442\u0430\u043d\u043e!`, "xp");
    floatXP(changes.xpGained, el.statPoints);
    popStat(el.statPoints);
    agentReact("win");
  }

  if (changes.leveledUp) {
    setTimeout(() => showLevelUp(changes.newLevel), 500);
    popStat(el.statLevel);
  }

  if (changes.streakChanged) {
    showToast(`\u0421\u0435\u0440\u0438\u044f ${changes.newStreak} \u0434\u043d\u0435\u0439! \u041d\u0435 \u043e\u0441\u0442\u0430\u043d\u0430\u0432\u043b\u0438\u0432\u0430\u0439\u0441\u044f!`, "streak");
    popStat(el.statStreak);
  }

  for (const ach of changes.newAchievements) {
    const name = ACHIEVEMENT_NAMES[ach] || ach;
    showToast(`\u0410\u0447\u0438\u0432\u043a\u0430: ${name}!`, "achievement");
    popStat(el.statAchievements);
    launchConfetti(1800);
    agentReact("win");
  }

  for (const questId of changes.newQuestsDone) {
    const questItem = el.questList.querySelector(`[data-quest-id="${questId}"]`);
    if (questItem) questItem.classList.add("just-completed");
    showToast(`\u041a\u0432\u0435\u0441\u0442 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d!`, "quest");
  }
}

/* ── Render Game Center ── */
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
    item.dataset.questId = quest.id;
    item.innerHTML = `
      <span class="quest-mark">${quest.done ? "\u2713" : "\u2022"}</span>
      <span>${quest.text}</span>
    `;
    el.questList.appendChild(item);
  }

  // Detect and apply gamification effects
  const changes = detectChanges(model, quests);
  if (progressResponse) {
    applyGamificationEffects(changes);
  }

  return { model, quests };
}

/* ── Lemon Emotion System ── */
function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
}

function pickEmotionImage(mood, emotionKey = "") {
  const goalPool = LEMON_EMOTION_LIBRARY[state.goalType] || LEMON_EMOTION_LIBRARY.balance;
  const defaultPool = LEMON_EMOTION_LIBRARY.balance;
  const variants = (goalPool && goalPool[mood]) || (defaultPool && defaultPool[mood]) || [LEMON_DEFAULT_IMAGE];
  if (!variants.length) return LEMON_DEFAULT_IMAGE;
  const seed = `${state.userId || "guest"}|${state.goalType}|${mood}|${emotionKey}`;
  const index = hashString(seed) % variants.length;
  return variants[index];
}

function setLemonMood(mood, emotionKey = "") {
  const nextImage = pickEmotionImage(mood, emotionKey);
  if (state.lastEmotionImage === nextImage) return;
  state.lastEmotionImage = nextImage;

  // Animate emotion swap
  el.lemonImage.classList.add("emotion-swap");
  setTimeout(() => {
    el.lemonImage.src = nextImage;
    el.lemonImage.addEventListener("animationend", () => {
      el.lemonImage.classList.remove("emotion-swap");
    }, { once: true });
  }, 150);
}

function setAgentBubble(text) {
  el.agentBubble.classList.remove("is-hidden");
  // Preserve the minimize button when updating text
  const minBtn = el.agentMinimize;
  el.agentBubble.textContent = text;
  el.agentBubble.appendChild(minBtn);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAnchorPosition(stepId) {
  const node = document.getElementById(stepId);
  if (!node) return { x: 24, y: 100 };

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
  const {
    mood = "guide",
    speech = STEP_HINTS[stepId] || STEP_HINTS["step-onboard"],
    emotionKey = stepId
  } = options;
  const { x, y } = getAnchorPosition(stepId);
  state.currentAnchor = stepId;
  state.lastAutoMoveAt = Date.now();

  setLemonMood(mood, emotionKey);
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
  if (!state.userId) return;

  const shown = getShownMilestones(state.userId);
  const milestones = Object.keys(LEMON_MILESTONES).map((item) => Number(item)).sort((a, b) => a - b);
  const nextMilestone = milestones.find((m) => streak >= m && !shown.includes(m));
  if (!nextMilestone) return;

  markMilestoneShown(state.userId, nextMilestone);
  el.lemonVideo.src = LEMON_MILESTONES[nextMilestone];
  el.lemonVideo.classList.remove("lemon-video-hidden");
  setAgentBubble(`\u041d\u0430\u0433\u0440\u0430\u0434\u0430! \u0421\u0435\u0440\u0438\u044f ${nextMilestone} \u0434\u043d\u044f. \u0422\u044b \u0432 \u0440\u0438\u0442\u043c\u0435.`);
  setLemonMood("win", `milestone-${nextMilestone}`);
  launchConfetti(3000);
  showToast(`\u041c\u0430\u0439\u043b\u0441\u0442\u043e\u0443\u043d: \u0441\u0435\u0440\u0438\u044f ${nextMilestone} \u0434\u043d\u0435\u0439!`, "achievement", "\u{1F3AC}");
  agentReact("win");

  try {
    await el.lemonVideo.play();
  } catch {
    hideLemonVideo();
  }
}

function chooseMood(model, nextStep) {
  if (model.streak >= 7) return "win";
  if (nextStep === "step-onboard") return "idle";
  if (nextStep === "step-meal") return "focus";
  return "guide";
}

function getMoodByReason(reason, model, nextStep) {
  if (reason === "error") return "error";
  if (reason === "onboard" || reason === "plan") return "win";
  if (reason === "meal") return model.streak >= 3 ? "win" : "focus";
  if (reason === "subscription") return model.tier === "premium" ? "win" : "guide";
  return chooseMood(model, nextStep);
}

function syncAgentFromProgress(progressResponse, reason = "progress") {
  const { model, quests } = renderGameCenter(progressResponse);
  setGoalType(model.user && model.user.goal ? model.user.goal : "");
  const nextStep = getNextStepFromQuests(quests);
  const unlockedSteps = getUnlockedStepsFromQuests(quests);
  const mood = getMoodByReason(reason, model, nextStep);

  setUnlockedSteps(unlockedSteps);
  setActiveStep(nextStep, { force: true });
  renderJourney(quests, nextStep);
  renderLeaderboard(model);

  const speechByReason = {
    onboard: "\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0441\u043e\u0437\u0434\u0430\u043d. \u041e\u0442\u043b\u0438\u0447\u043d\u043e, \u0442\u0435\u043f\u0435\u0440\u044c \u0433\u0435\u043d\u0435\u0440\u0438\u0440\u0443\u0435\u043c \u043f\u0435\u0440\u0432\u044b\u0439 \u043f\u043b\u0430\u043d.",
    plan: "\u041f\u043b\u0430\u043d \u0433\u043e\u0442\u043e\u0432. \u0414\u043e\u0431\u0430\u0432\u044c \u043f\u0440\u0438\u0435\u043c \u043f\u0438\u0449\u0438, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \u0441\u0435\u0440\u0438\u044e.",
    meal: model.streak > 0
      ? `\u041b\u043e\u0433 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d! \u0421\u0435\u0440\u0438\u044f: ${model.streak}. \u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0430\u0435\u043c \u0431\u0435\u0437 \u043f\u0440\u043e\u043f\u0443\u0441\u043a\u043e\u0432.`
      : "\u041b\u043e\u0433 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d. \u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f \u0446\u0435\u043b\u044c - \u0437\u0430\u043a\u0440\u0435\u043f\u0438\u0442\u044c \u0441\u0435\u0440\u0438\u044e.",
    subscription: `\u0422\u0430\u0440\u0438\u0444 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d: ${model.tier}. \u0414\u0430\u043b\u044c\u0448\u0435 \u0434\u0435\u0440\u0436\u0438\u043c \u043f\u0440\u043e\u0433\u0440\u0435\u0441\u0441.`,
    error: "\u0415\u0441\u0442\u044c \u0442\u0435\u0445\u043d\u0438\u0447\u0435\u0441\u043a\u0430\u044f \u043e\u0448\u0438\u0431\u043a\u0430. \u042f \u0440\u044f\u0434\u043e\u043c, \u0441\u0435\u0439\u0447\u0430\u0441 \u043f\u043e\u043f\u0440\u0430\u0432\u0438\u043c.",
    progress: STEP_HINTS[nextStep]
  };

  placeAgentAt(nextStep, {
    mood,
    speech: speechByReason[reason] || speechByReason.progress,
    emotionKey: `${reason}:${nextStep}:${model.streak}:${model.tier}:${model.points}`
  });

  if (reason !== "progress" && reason !== "error") {
    agentReact("win");
  }

  maybePlayMilestoneVideo(model.streak);
}

function showError(message) {
  setLemonMood("error", `error:${message}`);
  setAgentBubble(`\u041e\u0448\u0438\u0431\u043a\u0430: ${message}`);
  showToast(message, "error");
  agentReact("error");
}

async function loadHealthAndConfig() {
  try {
    const [health, config] = await Promise.all([api("/api/health"), api("/api/config")]);
    el.healthBadge.textContent = `API: ${health.status}`;
    el.providerBadge.textContent = `LLM: ${config.provider}${config.providerKeyConfigured ? "" : " (stub)"}`;
  } catch (error) {
    el.healthBadge.textContent = `API: \u043e\u0448\u0438\u0431\u043a\u0430 (${error.message})`;
    showError(error.message);
  }
}

async function refreshProgress(reason = "progress") {
  if (!state.userId) {
    el.progressOutput.textContent = "Profile has not been created yet.";
    const { model, quests } = renderGameCenter(null);
    setUnlockedSteps(["step-onboard"]);
    setActiveStep("step-onboard", { force: true });
    renderJourney(quests, "step-onboard");
    renderLeaderboard(model);
    placeAgentAt("step-onboard", {
      mood: "idle",
      speech: "\u041d\u0430\u0447\u043d\u0438 \u0441 \u043f\u0435\u0440\u0432\u043e\u0433\u043e \u0448\u0430\u0433\u0430: \u0441\u043e\u0437\u0434\u0430\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c.",
      emotionKey: "empty:onboard"
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

/* ── Form Handlers ── */
el.onboardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submitBtn = form.querySelector("button[type=submit]");
  const payload = {
    name: form.querySelector("#name").value.trim(),
    goal: form.querySelector("#goal").value.trim(),
    caloriesTarget: Number(form.querySelector("#caloriesTarget").value)
  };
  setGoalType(payload.goal);

  setButtonLoading(submitBtn, true);
  try {
    const data = await api("/api/users/onboard", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setActiveUser(data.userId);
    saveUserProfile(payload.name, payload.goal, payload.caloriesTarget);
    hideLemonVideo();
    showToast("\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u0441\u043e\u0437\u0434\u0430\u043d! \u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c!", "quest");
    await refreshProgress("onboard");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

el.planForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c.");
    return;
  }

  const form = event.currentTarget;
  const submitBtn = form.querySelector("button[type=submit]");
  const preferences = form.querySelector("#preferences").value.trim();

  setButtonLoading(submitBtn, true);
  try {
    const data = await api("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, preferences })
    });
    el.planOutput.textContent = pretty(data.plan);
    showToast("\u041f\u043b\u0430\u043d \u043f\u0438\u0442\u0430\u043d\u0438\u044f \u0433\u043e\u0442\u043e\u0432!", "quest");
    await refreshProgress("plan");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

el.mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c.");
    return;
  }

  const form = event.currentTarget;
  const submitBtn = form.querySelector("button[type=submit]");
  const mealDate = form.querySelector("#mealDate").value;
  const payload = {
    userId: state.userId,
    mealName: form.querySelector("#mealName").value.trim(),
    calories: Number(form.querySelector("#mealCalories").value),
    ...(mealDate ? { date: mealDate } : {})
  };

  setButtonLoading(submitBtn, true);
  try {
    await api("/api/meals/log", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast(`${payload.mealName} \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0432 \u043b\u043e\u0433!`, "quest", "\u{1F37D}\uFE0F");
    await refreshProgress("meal");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

el.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    showError("\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439 \u043f\u0440\u043e\u0444\u0438\u043b\u044c.");
    return;
  }
  const form = event.currentTarget;
  const submitBtn = form.querySelector("button[type=submit]");
  const tier = form.querySelector("#subscriptionTier").value;

  setButtonLoading(submitBtn, true);
  try {
    await api("/api/subscriptions/set", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, tier })
    });
    showToast(`\u0422\u0430\u0440\u0438\u0444 ${tier} \u0430\u043a\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u043d!`, tier === "premium" ? "achievement" : "quest");
    if (tier === "premium") launchConfetti(2000);
    await refreshProgress("subscription");
    await refreshEvents();
  } catch (error) {
    showError(error.message);
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

/* ── Event Listeners ── */
el.refreshProgress.addEventListener("click", () => refreshProgress("progress"));
el.refreshEvents.addEventListener("click", refreshEvents);
el.lemonVideo.addEventListener("ended", hideLemonVideo);
el.lemonVideo.addEventListener("error", hideLemonVideo);

for (const button of el.menuSteps) {
  button.addEventListener("click", () => {
    const stepId = button.dataset.stepTarget;
    setActiveStep(stepId);
    if (state.activeStep !== stepId) return;
    placeAgentAt(stepId, {
      mood: STEP_MOOD_BY_STEP[stepId] || "guide",
      speech: getStepCallToAction(stepId),
      emotionKey: `menu:${stepId}:${Date.now()}`
    });
  });
}

el.missionAction.addEventListener("click", focusCurrentStepAction);

// Minimize agent bubble
el.agentMinimize.addEventListener("click", (e) => {
  e.stopPropagation();
  el.agentBubble.classList.add("is-hidden");
});

// Tap lemon to re-show bubble (on mobile)


// Lemon click interaction — also re-shows bubble if hidden
el.lemonAgent.addEventListener("click", () => {
  const phrases = state.clickPhrases;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  setAgentBubble(phrase);
  agentReact("win");
  const moods = ["idle", "guide", "focus", "win"];
  const mood = moods[Math.floor(Math.random() * moods.length)];
  setLemonMood(mood, `click:${Date.now()}`);
});

// Debounced resize handler
window.addEventListener("resize", debounce(() => {
  placeAgentAt(state.activeStep, {
    mood: STEP_MOOD_BY_STEP[state.activeStep] || "guide",
    speech: getStepCallToAction(state.activeStep),
    emotionKey: `resize:${state.activeStep}`
  });
}, 200));

/* ── Service Worker ── */
if ("serviceWorker" in navigator) {
  if (IS_LOCAL) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  } else {
    let refreshedByServiceWorker = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshedByServiceWorker) return;
      refreshedByServiceWorker = true;
      location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {});
  }
}

/* ── Bootstrap ── */
setActiveUser(state.userId);
hideLemonVideo();

// Show skeleton loading
document.getElementById("step-game").classList.add("is-loading");
document.getElementById("step-leaderboard").classList.add("is-loading");

const bootstrap = renderGameCenter(null);
setUnlockedSteps(["step-onboard"]);
renderJourney(bootstrap.quests, "step-onboard");
renderLeaderboard(bootstrap.model);
setActiveStep("step-onboard", { force: true });
placeAgentAt(state.activeStep, {
  mood: STEP_MOOD_BY_STEP[state.activeStep] || "idle",
  speech: getStepCallToAction(state.activeStep),
  emotionKey: `boot:${state.activeStep}`
});
loadHealthAndConfig();
refreshProgress("progress").then(() => {
  document.getElementById("step-game").classList.remove("is-loading");
  document.getElementById("step-leaderboard").classList.remove("is-loading");
});
refreshEvents();
