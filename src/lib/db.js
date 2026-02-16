const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "db.json");

function resolveDbPath() {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }

  // Vercel serverless runtime does not allow writes under /var/task.
  // /tmp is the writable location during function execution.
  if (process.env.VERCEL) {
    return "/tmp/aisha-mvp-db.json";
  }

  return DEFAULT_DB_PATH;
}

const DB_PATH = resolveDbPath();

const DEFAULT_DB = {
  users: {},
  plans: {},
  progress: {},
  subscriptions: {},
  meals: {},
  events: []
};

function cloneDefaultDb() {
  return JSON.parse(JSON.stringify(DEFAULT_DB));
}

const STATE = {
  mode: "file",
  memoryDb: cloneDefaultDb()
};

function switchToMemory() {
  STATE.mode = "memory";
}

function ensureDb() {
  if (STATE.mode === "memory") {
    return;
  }

  const dbDir = path.dirname(DB_PATH);

  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(cloneDefaultDb(), null, 2), "utf8");
    }
  } catch {
    switchToMemory();
  }
}

function readDb() {
  ensureDb();

  if (STATE.mode === "memory") {
    return STATE.memoryDb;
  }

  const raw = fs.readFileSync(DB_PATH, "utf8");
  if (!raw.trim()) {
    return cloneDefaultDb();
  }

  try {
    const data = JSON.parse(raw);
    return {
      ...cloneDefaultDb(),
      ...data
    };
  } catch {
    return cloneDefaultDb();
  }
}

function writeDb(data) {
  ensureDb();

  if (STATE.mode === "memory") {
    STATE.memoryDb = data;
    return;
  }

  const tempPath = `${DB_PATH}.tmp`;

  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, DB_PATH);
  } catch {
    switchToMemory();
    STATE.memoryDb = data;
  }
}

module.exports = {
  DB_PATH,
  readDb,
  writeDb
};
