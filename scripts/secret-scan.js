const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".vercel",
  "coverage",
  "dist"
]);

const ALLOWED_FILES = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".json",
  ".md",
  ".env",
  ".txt",
  ".yml",
  ".yaml",
  ".html",
  ".css",
  ".webmanifest"
]);

const SENSITIVE_LINE = /(api[_-]?key|token|secret|private[_-]?key)\s*[:=]\s*["']?([^\s"'`]+)["']?/i;
const SK_PREFIX = /\bsk-[A-Za-z0-9]{20,}\b/;

function isIgnoredFile(filePath) {
  const fileName = path.basename(filePath).toLowerCase();
  if (fileName.endsWith(".pdf")) {
    return true;
  }
  return false;
}

function placeholderValue(value) {
  const v = value.toLowerCase();
  return (
    v.includes("your_") ||
    v.includes("example") ||
    v.includes("placeholder") ||
    v.includes("<") ||
    v.includes("xxxx")
  );
}

function walk(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, list);
      continue;
    }
    if (isIgnoredFile(full)) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (ALLOWED_FILES.has(ext) || entry.name === ".env.example") {
      list.push(full);
    }
  }
  return list;
}

function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }
    if (line.trim().startsWith("#")) {
      continue;
    }
    if (line.includes("utm_source=chatgpt.com")) {
      continue;
    }

    const sensitive = line.match(SENSITIVE_LINE);
    if (sensitive) {
      const value = sensitive[2] || "";
      if (value.length >= 16 && !placeholderValue(value)) {
        findings.push(`${rel}:${i + 1} possible secret -> ${line.trim()}`);
      }
    }

    if (SK_PREFIX.test(line)) {
      findings.push(`${rel}:${i + 1} possible token -> ${line.trim()}`);
    }
  }

  return findings;
}

function main() {
  const files = walk(ROOT);
  const findings = files.flatMap(scanFile);

  if (findings.length > 0) {
    console.error("Secret scan failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
    return;
  }

  console.log(`Secret scan passed (${files.length} files checked).`);
}

main();
