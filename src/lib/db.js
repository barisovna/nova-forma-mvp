const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "db.json");
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : DEFAULT_DB_PATH;

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

function ensureDb() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(cloneDefaultDb(), null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
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
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tempPath, DB_PATH);
}

module.exports = {
  DB_PATH,
  readDb,
  writeDb
};
