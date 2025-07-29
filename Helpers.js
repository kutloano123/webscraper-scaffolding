// helpers.js
import fs from "fs";
import path from "path";

export function sanitizeUrl(url) {
  return url.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

export function generateTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function buildFilePath(url, timestamp, folder = ".") {
  const safeName = sanitizeUrl(url);
  return path.join(folder, `${safeName}_${timestamp}.json`);
}
