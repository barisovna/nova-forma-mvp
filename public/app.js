const state = {
  userId: localStorage.getItem("userId") || "",
  milestoneMemory: loadMilestoneMemory()
};

const LEMON_IMAGE_BY_STATE = {
  idle: "/assets/limon/limonfoto1.png",
  warmup: "/assets/limon/limonid3.png",
  progress: "/assets/limon/limonid2.png",
  champion: "/assets/limon/limonid1.png"
};

const LEMON_MILESTONES = {
  3: "/assets/limon/limon1.mp4",
  7: "/assets/limon/limon2.mp4",
  14: "/assets/limon/limon3.mp4"
};

const el = {
  healthStatus: document.getElementById("healthStatus"),
  providerStatus: document.getElementById("providerStatus"),
  activeUser: document.getElementById("activeUser"),
  onboardForm: document.getElementById("onboardForm"),
  planForm: document.getElementById("planForm"),
  mealForm: document.getElementById("mealForm"),
  subscriptionForm: document.getElementById("subscriptionForm"),
  refreshProgress: document.getElementById("refreshProgress"),
  refreshEvents: document.getElementById("refreshEvents"),
  planOutput: document.getElementById("planOutput"),
  progressOutput: document.getElementById("progressOutput"),
  eventsOutput: document.getElementById("eventsOutput"),
  lemonImage: document.getElementById("lemonImage"),
  lemonVideo: document.getElementById("lemonVideo"),
  lemonSpeech: document.getElementById("lemonSpeech"),
  lemonModeInfo: document.getElementById("lemonModeInfo")
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
    return {};
  } catch {
    return {};
  }
}

function saveMilestoneMemory() {
  localStorage.setItem("lemonMilestones", JSON.stringify(state.milestoneMemory));
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

function setActiveUser(userId) {
  state.userId = userId;
  if (userId) {
    localStorage.setItem("userId", userId);
  } else {
    localStorage.removeItem("userId");
  }
  el.activeUser.textContent = userId ? `Активный userId: ${userId}` : "Активный userId: не выбран";
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

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function hideLemonVideo() {
  el.lemonVideo.pause();
  el.lemonVideo.currentTime = 0;
  el.lemonVideo.classList.add("lemon-video-hidden");
}

function setLemonState({ stateKey, speech, info }) {
  const nextImage = LEMON_IMAGE_BY_STATE[stateKey] || LEMON_IMAGE_BY_STATE.idle;
  el.lemonImage.src = nextImage;
  el.lemonSpeech.textContent = speech;
  el.lemonModeInfo.textContent = info;
}

function buildLemonStatus(progressResponse) {
  const progress = progressResponse?.progress || {};
  const streak = Number(progress.streak || 0);
  const totalMeals = Number(progress.totalMeals || 0);

  if (!state.userId || totalMeals === 0) {
    return {
      streak,
      stateKey: "idle",
      speech: "Я живой лимон. Создай профиль и добавь первый лог питания.",
      info: "Режим: статичный лимон (ожидание старта)."
    };
  }

  if (streak >= 7) {
    return {
      streak,
      stateKey: "champion",
      speech: `🔥 Серия ${streak} дней! Ты в топ-форме, держим темп.`,
      info: "Режим: эмоция champion + реплики по streak."
    };
  }

  if (streak >= 3) {
    return {
      streak,
      stateKey: "progress",
      speech: `Отлично! Уже ${streak} дня подряд. Еще шаг и новая награда.`,
      info: "Режим: эмоция progress + milestone-триггеры."
    };
  }

  return {
    streak,
    stateKey: "warmup",
    speech: `Хороший старт: серия ${Math.max(1, streak)} день. Главное - без пропуска завтра.`,
    info: "Режим: warmup, разгон серии."
  };
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

  const videoSrc = LEMON_MILESTONES[nextMilestone];
  el.lemonVideo.src = videoSrc;
  el.lemonVideo.classList.remove("lemon-video-hidden");
  markMilestoneShown(state.userId, nextMilestone);

  try {
    await el.lemonVideo.play();
    el.lemonSpeech.textContent = `🎉 Milestone ${nextMilestone} дня! Лимон празднует с тобой.`;
    el.lemonModeInfo.textContent = `Режим: milestone-видео (${nextMilestone} дня streak).`;
  } catch {
    hideLemonVideo();
    el.lemonModeInfo.textContent = `Видео milestone ${nextMilestone} готово, но autoplay заблокирован браузером.`;
  }
}

function updateLemonByProgress(progressResponse) {
  const status = buildLemonStatus(progressResponse);
  setLemonState(status);
  maybePlayMilestoneVideo(status.streak);
}

async function loadHealthAndConfig() {
  try {
    const health = await api("/api/health");
    const config = await api("/api/config");
    el.healthStatus.textContent = `API: ${health.status} (${health.timestamp})`;
    el.providerStatus.textContent = `LLM provider: ${config.provider}, key configured: ${config.providerKeyConfigured}`;
  } catch (error) {
    el.healthStatus.textContent = `API error: ${error.message}`;
  }
}

async function refreshProgress() {
  if (!state.userId) {
    el.progressOutput.textContent = "Сначала создайте пользователя в онбординге.";
    updateLemonByProgress(null);
    return;
  }
  try {
    const data = await api(`/api/progress/${encodeURIComponent(state.userId)}`);
    el.progressOutput.textContent = pretty(data);
    updateLemonByProgress(data);
  } catch (error) {
    el.progressOutput.textContent = error.message;
  }
}

async function refreshEvents() {
  try {
    const data = await api("/api/events?limit=20");
    el.eventsOutput.textContent = pretty(data.events);
  } catch (error) {
    el.eventsOutput.textContent = error.message;
  }
}

el.onboardForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    name: form.querySelector("#name").value,
    goal: form.querySelector("#goal").value,
    caloriesTarget: Number(form.querySelector("#caloriesTarget").value)
  };

  try {
    const data = await api("/api/users/onboard", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setActiveUser(data.userId);
    hideLemonVideo();
    await refreshProgress();
    await refreshEvents();
  } catch (error) {
    alert(error.message);
  }
});

el.planForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    alert("Сначала создайте пользователя.");
    return;
  }
  const preferences = event.currentTarget.querySelector("#preferences").value;
  try {
    const data = await api("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify({ userId: state.userId, preferences })
    });
    el.planOutput.textContent = pretty(data.plan);
    await refreshProgress();
    await refreshEvents();
  } catch (error) {
    alert(error.message);
  }
});

el.mealForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    alert("Сначала создайте пользователя.");
    return;
  }
  const form = event.currentTarget;
  const mealDate = form.querySelector("#mealDate").value;
  const payload = {
    userId: state.userId,
    mealName: form.querySelector("#mealName").value,
    calories: Number(form.querySelector("#mealCalories").value),
    ...(mealDate ? { date: mealDate } : {})
  };
  try {
    await api("/api/meals/log", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    await refreshProgress();
    await refreshEvents();
  } catch (error) {
    alert(error.message);
  }
});

el.subscriptionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.userId) {
    alert("Сначала создайте пользователя.");
    return;
  }
  const tier = event.currentTarget.querySelector("#subscriptionTier").value;
  try {
    await api("/api/subscriptions/set", {
      method: "POST",
      body: JSON.stringify({
        userId: state.userId,
        tier
      })
    });
    await refreshProgress();
    await refreshEvents();
  } catch (error) {
    alert(error.message);
  }
});

el.refreshProgress.addEventListener("click", refreshProgress);
el.refreshEvents.addEventListener("click", refreshEvents);
el.lemonVideo.addEventListener("ended", hideLemonVideo);
el.lemonVideo.addEventListener("error", hideLemonVideo);

if ("serviceWorker" in navigator) {
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (isLocal) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => caches.keys())
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch((error) => {
        console.warn("Local cache cleanup failed:", error);
      });
  } else {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }
}

setActiveUser(state.userId);
hideLemonVideo();
loadHealthAndConfig();
refreshProgress();
refreshEvents();
