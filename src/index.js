import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBot } from './discord-bot.js';
import { createNotifier } from './notifier.js';
import { createTelegramNotifier } from './telegram-notifier.js';
import * as scheduler from './scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'config.json'), 'utf-8'));

console.log(`=== AVBUZZ v${pkg.version} Starting ===`);

// Start Discord bot first
const client = await createBot({
  token: config.discord.token,
  guildId: config.discord.guildId,
});

// Initialize notifiers (after bot is ready)
const notifiers = [];

const discordNotifier = createNotifier(client, config.discord.channelId);
notifiers.push(discordNotifier);
console.log(`[AVBUZZ] Discord notifier ready → channel ${config.discord.channelId}`);

if (config.telegram?.botToken && config.telegram?.chatId) {
  const tgNotifier = createTelegramNotifier(config.telegram.botToken, config.telegram.chatId);
  notifiers.push(tgNotifier);
  console.log('[AVBUZZ] Telegram notifier ready');
}

// Start scheduler
scheduler.start(notifiers, config.schedule);

// Graceful shutdown
function shutdown() {
  console.log('[AVBUZZ] Shutting down...');
  scheduler.stop();
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
