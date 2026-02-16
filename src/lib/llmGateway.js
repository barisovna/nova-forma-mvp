const { config } = require("./env");

function getProvider() {
  const provider = (process.env.LLM_PROVIDER || config.llmProvider || "deepseek").toLowerCase();
  if (provider !== "deepseek" && provider !== "qwen") {
    return "deepseek";
  }
  return provider;
}

function hasProviderKey(provider) {
  if (provider === "deepseek") {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }
  if (provider === "qwen") {
    return Boolean(process.env.QWEN_API_KEY);
  }
  return false;
}

function buildStubPlan(user, preferences, provider) {
  const target = Math.max(1200, Number(user.caloriesTarget || 2000));
  const breakfast = Math.round(target * 0.3);
  const lunch = Math.round(target * 0.4);
  const dinner = Math.round(target * 0.3);

  return {
    provider,
    model: provider === "qwen" ? "qwen-stub-v1" : "deepseek-stub-v1",
    usingStub: true,
    summary: `План на день для цели "${user.goal}" на ~${target} ккал.`,
    preferences: preferences || "",
    days: [
      {
        day: 1,
        meals: [
          { name: "Завтрак", calories: breakfast, note: "Белок + сложные углеводы" },
          { name: "Обед", calories: lunch, note: "Овощи + источник белка" },
          { name: "Ужин", calories: dinner, note: "Легкий прием пищи, контроль порции" }
        ]
      }
    ],
    tips: [
      "Пейте воду равномерно в течение дня.",
      "Логируйте питание сразу после приема пищи для стабильного streak."
    ]
  };
}

async function generatePlan({ user, preferences }) {
  const provider = getProvider();
  const keyPresent = hasProviderKey(provider);

  // В тестовом проекте без внешних зависимостей используем локальный fallback.
  // Реальный вызов провайдера можно добавить здесь через fetch с API-ключом.
  const plan = buildStubPlan(user, preferences, provider);
  plan.usingStub = !keyPresent;
  return plan;
}

module.exports = {
  generatePlan,
  getProvider,
  hasProviderKey
};
