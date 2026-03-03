import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import * as fanza from './fanza-client.js';
import * as tracker from './actress-tracker.js';
import * as settings from './settings.js';
import {
  buildContentEmbed,
  buildActressEmbed,
  buildTrackListEmbed,
  buildPaginationRow,
  buildStatusEmbed,
  buildWeeklyDigestEmbeds,
} from './embed-builder.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const SEARCH_SIZE = 5;

const commands = [
  new SlashCommandBuilder()
    .setName('new')
    .setDescription('今日（或指定日期）新片列表')
    .addStringOption(opt =>
      opt.setName('date').setDescription('日期 YYYY-MM-DD（預設今天）').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('today')
    .setDescription('今日熱門（按人氣排序）'),
  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('排行榜')
    .addStringOption(opt =>
      opt.setName('type').setDescription('排行類型')
        .setRequired(true)
        .addChoices(
          { name: '🔥 銷售', value: 'sales' },
          { name: '⭐ 評分', value: 'review' },
          { name: '❤️ 收藏', value: 'bookmark' },
        )
    ),
  new SlashCommandBuilder()
    .setName('search')
    .setDescription('搜尋（女優名或關鍵字）')
    .addStringOption(opt =>
      opt.setName('keyword').setDescription('關鍵字').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('track')
    .setDescription('追蹤女優')
    .addStringOption(opt =>
      opt.setName('name').setDescription('女優名').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('untrack')
    .setDescription('取消追蹤女優')
    .addStringOption(opt =>
      opt.setName('name').setDescription('女優名').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('tracklist')
    .setDescription('列出所有追蹤的女優'),
  new SlashCommandBuilder()
    .setName('random')
    .setDescription('隨機推薦一部影片'),
  new SlashCommandBuilder()
    .setName('notify')
    .setDescription('開關每日新片推送 / 女優追蹤提醒')
    .addStringOption(opt =>
      opt.setName('type').setDescription('推送類型')
        .setRequired(true)
        .addChoices(
          { name: '📅 每日新片', value: 'daily' },
          { name: '🎭 女優追蹤', value: 'actress' },
        )
    )
    .addStringOption(opt =>
      opt.setName('action').setDescription('開啟或關閉')
        .setRequired(true)
        .addChoices(
          { name: '✅ 開啟', value: 'on' },
          { name: '❌ 關閉', value: 'off' },
        )
    ),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('查看系統狀態與 API 健康'),
  new SlashCommandBuilder()
    .setName('code')
    .setDescription('番號查詢')
    .addStringOption(opt =>
      opt.setName('id').setDescription('番號（如 SSIS-001）').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('digest')
    .setDescription('本週精選摘要'),
];

export async function createBot(config) {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(config.token);
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.guildId),
        { body: commands.map(c => c.toJSON()) },
      );
      console.log('[Bot] Slash commands registered');
    } catch (err) {
      console.error('[Bot] Failed to register commands:', err.message);
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleCommand(interaction);
      } else if (interaction.isButton()) {
        await handleButton(interaction);
      }
    } catch (err) {
      console.error(`[Bot] Interaction error:`, err);
      // Best-effort error response — don't let this throw again
      try {
        const channel = await getChannel(interaction);
        if (channel) await channel.send({ content: `❌ 發生錯誤：${err.message}` });
      } catch {}
    }
  });

  await client.login(config.token);
  return client;
}

// Reliably get the channel — never depend on interaction.channel cache alone
async function getChannel(interaction) {
  if (interaction.channel) return interaction.channel;
  try {
    return await interaction.client.channels.fetch(interaction.channelId);
  } catch (err) {
    console.error('[Bot] Failed to fetch channel:', err.message);
    return null;
  }
}

async function handleCommand(interaction) {
  const { commandName } = interaction;

  switch (commandName) {
    case 'new': return cmdNew(interaction);
    case 'today': return cmdToday(interaction);
    case 'ranking': return cmdRanking(interaction);
    case 'search': return cmdSearch(interaction);
    case 'random': return cmdRandom(interaction);
    case 'track': return cmdTrack(interaction);
    case 'untrack': return cmdUntrack(interaction);
    case 'tracklist': return cmdTracklist(interaction);
    case 'notify': return cmdNotify(interaction);
    case 'status': return cmdStatus(interaction);
    case 'code': return cmdCode(interaction);
    case 'digest': return cmdDigest(interaction);
  }
}

// Core send helper — always uses channel.send for reliable image rendering
async function sendToChannel(interaction, content, embeds, components = []) {
  const channel = await getChannel(interaction);
  if (!channel) {
    console.error('[Bot] Cannot send — channel unavailable');
    return;
  }

  // Clean up deferred/replied interaction state (best effort)
  if (interaction.deferred || interaction.replied) {
    await interaction.deleteReply().catch(() => {});
  }

  const msg = await channel.send({
    content: content || undefined,
    embeds,
    components,
  });
  console.log(`[Bot] Sent ${embeds.length} embeds to #${channel.name}`);
  return msg;
}

// Quick text reply via interaction (for simple responses without images)
async function quickReply(interaction, text) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: text }).catch(() => {});
  } else {
    await interaction.reply({ content: text, flags: 64 }).catch(() => {});
  }
}

async function cmdNew(interaction) {
  // deferReply is best-effort — if it fails, we still send via channel
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const date = interaction.options.getString('date') || fanza.getTodayJST();
  const page = 1;
  const result = await fanza.fetchTodayReleases(date, SEARCH_SIZE, 0);
  const totalPages = Math.ceil(result.totalCount / SEARCH_SIZE);

  const embeds = result.contents.map((c, i) =>
    buildContentEmbed(c, { rank: (page - 1) * SEARCH_SIZE + i + 1 })
  );
  const components = totalPages > 1 ? [buildPaginationRow(page, totalPages, `new_${date}`)] : [];

  await sendToChannel(interaction,
    `📅 **${date} 新片上架** — 共 ${result.totalCount} 部（第 ${page}/${totalPages} 頁）`,
    embeds, components);
}

async function cmdToday(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const date = fanza.getTodayJST();
  const page = 1;
  const result = await fanza.fetchTodayHot(date, SEARCH_SIZE, 0);
  const totalPages = Math.ceil(result.totalCount / SEARCH_SIZE);

  const embeds = result.contents.map((c, i) =>
    buildContentEmbed(c, { rank: (page - 1) * SEARCH_SIZE + i + 1 })
  );
  const components = totalPages > 1 ? [buildPaginationRow(page, totalPages, `today_${date}`)] : [];

  await sendToChannel(interaction,
    `🔥 **${date} 今日熱門** — 共 ${result.totalCount} 部（第 ${page}/${totalPages} 頁）`,
    embeds, components);
}

async function cmdRanking(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const type = interaction.options.getString('type');
  const result = await fanza.fetchRanking(type, SEARCH_SIZE);

  const typeNames = { sales: '🔥 銷售', review: '⭐ 評分', bookmark: '❤️ 收藏' };
  const embeds = result.contents.map((c, i) =>
    buildContentEmbed(c, { rank: i + 1, color: 0xffc107 })
  );

  await sendToChannel(interaction,
    `**${typeNames[type] || ''} 排行榜 Top ${result.contents.length}**`,
    embeds);
}

async function cmdSearch(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const keyword = interaction.options.getString('keyword');
  const page = 1;
  const result = await fanza.searchByKeyword(keyword, SEARCH_SIZE, 0);
  const totalPages = Math.ceil(result.totalCount / SEARCH_SIZE);

  if (result.totalCount === 0) {
    await quickReply(interaction, `🔍 找不到「${keyword}」的相關結果`);
    return;
  }

  const embeds = result.contents.map((c, i) =>
    buildContentEmbed(c, { rank: (page - 1) * SEARCH_SIZE + i + 1 })
  );
  const escapedKw = keyword.replace(/[^a-zA-Z0-9\u3000-\u9fff]/g, '');
  const components = totalPages > 1 ? [buildPaginationRow(page, totalPages, `search_${escapedKw}`)] : [];

  await sendToChannel(interaction,
    `🔍 **${keyword}** — 共 ${result.totalCount} 筆（第 ${page}/${totalPages} 頁）`,
    embeds, components);
}

async function cmdRandom(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const result = await fanza.fetchRandom();

  if (result.contents.length === 0) {
    await quickReply(interaction, '❌ 找不到任何影片');
    return;
  }

  const embed = buildContentEmbed(result.contents[0]);
  await sendToChannel(interaction, '🎲 **隨機推薦**', [embed]);
}

async function cmdTrack(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const name = interaction.options.getString('name');
  const result = await fanza.searchActress(name);

  if (result.actresses.length === 0) {
    await quickReply(interaction, `❌ 找不到女優「${name}」`);
    return;
  }

  const actress = result.actresses[0];
  const added = await tracker.track(actress.id, actress.name);

  if (!added) {
    await quickReply(interaction, `⚠️ 已經在追蹤「${actress.name}」了`);
    return;
  }

  // Mark current works as seen so we don't alert for existing ones
  const allResults = await fanza.fetchByActress(actress.id, 50);
  const existingIds = allResults.contents.map(c => c.id);
  await tracker.updateSeen(actress.id, existingIds);

  const embed = buildActressEmbed(actress, allResults.contents);
  await sendToChannel(interaction,
    `✅ 開始追蹤「${actress.name}」— 有新片會自動通知！`,
    [embed]);
}

async function cmdUntrack(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const name = interaction.options.getString('name');
  const removedId = await tracker.untrackByName(name);

  if (!removedId) {
    await quickReply(interaction, `❌ 沒有追蹤「${name}」`);
    return;
  }

  await quickReply(interaction, `✅ 已取消追蹤「${name}」`);
}

async function cmdTracklist(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const list = await tracker.getTrackedList();
  const embed = buildTrackListEmbed(list);
  await sendToChannel(interaction, null, [embed]);
}

async function cmdNotify(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const type = interaction.options.getString('type');
  const action = interaction.options.getString('action');
  const enabled = action === 'on';

  const settingKey = type === 'daily' ? 'dailyPushEnabled' : 'actressCheckEnabled';
  await settings.set(settingKey, enabled);

  const typeLabel = type === 'daily' ? '📅 每日新片推送' : '🎭 女優追蹤提醒';
  const statusLabel = enabled ? '✅ 已開啟' : '❌ 已關閉';

  await quickReply(interaction, `${typeLabel} — ${statusLabel}`);
}

async function cmdStatus(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const stats = fanza.getApiStats();
  const embed = buildStatusEmbed(stats, pkg.version);
  await sendToChannel(interaction, null, [embed]);
}

async function cmdCode(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const code = interaction.options.getString('id');
  const result = await fanza.fetchByCode(code);

  if (result.contents.length === 0) {
    await quickReply(interaction, `❌ 找不到番號「${code}」`);
    return;
  }

  const embed = buildContentEmbed(result.contents[0]);
  await sendToChannel(interaction, `🔎 **${code.toUpperCase()}**`, [embed]);
}

async function cmdDigest(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const digest = await fanza.fetchWeeklyDigest();
  const embeds = buildWeeklyDigestEmbeds(digest);
  await sendToChannel(interaction, '📊 **本週精選摘要**', embeds);
}

// Button pagination handler
async function handleButton(interaction) {
  await interaction.deferReply().catch(e => console.log('[Bot] deferReply failed:', e.message));

  const parts = interaction.customId.split('_');
  const page = parseInt(parts[parts.length - 1]);

  const prefix = parts.slice(0, -2).join('_');
  const prefixParts = prefix.split('_');
  const commandType = prefixParts[0];
  const param = prefixParts.slice(1).join('_');

  const offset = (page - 1) * SEARCH_SIZE;
  let result, label;

  switch (commandType) {
    case 'new':
      result = await fanza.fetchTodayReleases(param, SEARCH_SIZE, offset);
      label = `📅 **${param} 新片上架**`;
      break;
    case 'today':
      result = await fanza.fetchTodayHot(param, SEARCH_SIZE, offset);
      label = `🔥 **${param} 今日熱門**`;
      break;
    case 'search':
      result = await fanza.searchByKeyword(param, SEARCH_SIZE, offset);
      label = `🔍 **${param}**`;
      break;
    default:
      return;
  }

  const totalPages = Math.ceil(result.totalCount / SEARCH_SIZE);
  const components = totalPages > 1 ? [buildPaginationRow(page, totalPages, prefix)] : [];

  const embeds = result.contents.map((c, i) =>
    buildContentEmbed(c, { rank: (page - 1) * SEARCH_SIZE + i + 1 })
  );

  // Delete the old message with buttons
  try { await interaction.message.delete(); } catch {}

  await sendToChannel(interaction,
    `${label} — 共 ${result.totalCount} 筆（第 ${page}/${totalPages} 頁）`,
    embeds, components);
}
