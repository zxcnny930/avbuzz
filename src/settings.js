import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

const DEFAULTS = {
  dailyPushEnabled: true,
  actressCheckEnabled: true,
};

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
    const raw = await readFile(SETTINGS_FILE, 'utf-8');
    cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

async function save() {
  await ensureDataDir();
  await writeFile(SETTINGS_FILE, JSON.stringify(cache, null, 2));
}

export async function get(key) {
  const data = await load();
  return data[key];
}

export async function set(key, value) {
  const data = await load();
  data[key] = value;
  await save();
}

export async function getAll() {
  return load();
}
