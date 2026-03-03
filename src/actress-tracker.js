import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const TRACKED_FILE = join(DATA_DIR, 'tracked-actresses.json');

let cache = null;

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function load() {
  if (cache) return cache;
  await ensureDataDir();
  try {
    const raw = await readFile(TRACKED_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }
  return cache;
}

async function save() {
  await ensureDataDir();
  const tmp = TRACKED_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(cache, null, 2));
  await writeFile(TRACKED_FILE, JSON.stringify(cache, null, 2));
  // Clean up temp file — best effort
  try {
    const { unlink } = await import('node:fs/promises');
    await unlink(tmp);
  } catch {}
}

export async function track(actressId, name) {
  const data = await load();
  if (data[actressId]) return false; // already tracked
  data[actressId] = {
    name,
    lastCheck: new Date().toISOString(),
    seenIds: [],
  };
  await save();
  return true;
}

export async function untrack(actressId) {
  const data = await load();
  if (!data[actressId]) return false;
  delete data[actressId];
  await save();
  return true;
}

export async function untrackByName(name) {
  const data = await load();
  const entry = Object.entries(data).find(([, v]) => v.name === name);
  if (!entry) return null;
  delete data[entry[0]];
  await save();
  return entry[0];
}

export async function getTracked() {
  return load();
}

export async function getTrackedList() {
  const data = await load();
  return Object.entries(data).map(([id, v]) => ({ id, name: v.name }));
}

export async function findByName(name) {
  const data = await load();
  const entry = Object.entries(data).find(([, v]) => v.name === name);
  return entry ? { id: entry[0], ...entry[1] } : null;
}

export async function updateSeen(actressId, newIds) {
  const data = await load();
  if (!data[actressId]) return;
  const existing = new Set(data[actressId].seenIds);
  for (const id of newIds) existing.add(id);
  data[actressId].seenIds = [...existing];
  await save();
}

export async function updateLastCheck(actressId) {
  const data = await load();
  if (!data[actressId]) return;
  data[actressId].lastCheck = new Date().toISOString();
  await save();
}

export async function getSeenIds(actressId) {
  const data = await load();
  return data[actressId]?.seenIds || [];
}
