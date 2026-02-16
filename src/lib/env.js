function getEnv(name, fallback = "") {
  const value = process.env[name];
  if (typeof value === "undefined" || value === "") {
    return fallback;
  }
  return value;
}

const config = {
  port: Number(getEnv("PORT", "3000")),
  nodeEnv: getEnv("NODE_ENV", "development"),
  llmProvider: getEnv("LLM_PROVIDER", "deepseek").toLowerCase()
};

module.exports = {
  config,
  getEnv
};
