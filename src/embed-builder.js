import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const COLOR_PRIMARY = 0xe91e63;
const COLOR_RANKING = 0xffc107;
const COLOR_ACTRESS = 0x9c27b0;
const COLOR_SEARCH = 0x2196f3;

function vrTag(contentType) {
  return contentType === 'VR' ? ' 🥽' : '';
}

function formatActresses(actresses) {
  if (!actresses || actresses.length === 0) return '—';
  return actresses.map(a => a.name).join(', ');
}

function formatReview(review) {
  if (!review || !review.count) return '—';
  return `⭐ ${review.average.toFixed(1)} (${review.count})`;
}

export function buildContentEmbed(content, opts = {}) {
  const embed = new EmbedBuilder()
    .setColor(opts.color || COLOR_PRIMARY)
    .setTitle(`${content.title.slice(0, 200)}${vrTag(content.contentType)}`)
    .setURL(`https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${content.id}/`)
    .addFields(
      { name: '番號', value: `\`\`\`${content.id.toUpperCase()}\`\`\``, inline: true },
      { name: '女優', value: formatActresses(content.actresses), inline: true },
      { name: '片商', value: content.maker?.name || '—', inline: true },
      { name: '配信日', value: content.deliveryStartAt?.slice(0, 10) || '—', inline: true },
      { name: '評價', value: formatReview(content.review), inline: true },
      { name: '收藏', value: `${content.bookmarkCount ?? 0}`, inline: true },
    );

  if (content.packageImage?.largeUrl) {
    embed.setImage(content.packageImage.largeUrl);
  }

  if (opts.rank) {
    embed.setAuthor({ name: `#${opts.rank}` });
  }

  return embed;
}

export function buildListEmbed(contents, title, page, totalPages, totalCount) {
  const lines = contents.map((c, i) => {
    const num = (page - 1) * 10 + i + 1;
    const actresses = formatActresses(c.actresses);
    const vr = vrTag(c.contentType);
    const review = c.review?.count ? `⭐${c.review.average.toFixed(1)}` : '';
    const bookmark = c.bookmarkCount ? `♥${c.bookmarkCount}` : '';
    const stats = [review, bookmark].filter(Boolean).join(' ');
    const code = c.id.toUpperCase();
    return `**${num}.** ${c.title.slice(0, 50)}${vr}\n\`\`\`${code}\`\`\`${actresses} | ${c.maker?.name || '—'} ${stats}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR_PRIMARY)
    .setTitle(title)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `第 ${page}/${totalPages} 頁 · 共 ${totalCount} 筆` });

  return embed;
}

export function buildRankingEmbed(contents, rankingType) {
  const typeNames = {
    sales: '🔥 銷售排行榜 Top 10',
    review: '⭐ 評分排行榜 Top 10',
    bookmark: '❤️ 收藏排行榜 Top 10',
  };

  const lines = contents.map((c, i) => {
    const actresses = formatActresses(c.actresses);
    const vr = vrTag(c.contentType);
    const review = c.review?.count ? `⭐${c.review.average.toFixed(1)}(${c.review.count})` : '';
    const bookmark = c.bookmarkCount ? `♥${c.bookmarkCount}` : '';
    const stats = [review, bookmark].filter(Boolean).join(' ');
    const code = c.id.toUpperCase();
    return `**${i + 1}.** ${c.title.slice(0, 50)}${vr}\n\`\`\`${code}\`\`\`${actresses} | ${c.maker?.name || '—'} ${stats}`;
  });

  return new EmbedBuilder()
    .setColor(COLOR_RANKING)
    .setTitle(typeNames[rankingType] || `排行榜 Top ${contents.length}`)
    .setDescription(lines.join('\n\n'));
}

export function buildActressEmbed(actress, contents) {
  const lines = contents.slice(0, 5).map((c, i) => {
    const vr = vrTag(c.contentType);
    const code = c.id.toUpperCase();
    const date = c.deliveryStartAt?.slice(0, 10) || '';
    return `**${i + 1}.** ${c.title.slice(0, 50)}${vr}\n\`\`\`${code}\`\`\`${date} | ${c.maker?.name || '—'}`;
  });

  return new EmbedBuilder()
    .setColor(COLOR_ACTRESS)
    .setTitle(`🎭 ${actress.name}`)
    .setDescription(lines.join('\n\n') || '暫無作品')
    .setFooter({ text: `共 ${contents.length} 部作品` });
}

export function buildTrackListEmbed(trackedList) {
  if (trackedList.length === 0) {
    return new EmbedBuilder()
      .setColor(COLOR_ACTRESS)
      .setTitle('📋 追蹤女優列表')
      .setDescription('目前沒有追蹤任何女優。\n使用 `/track <女優名>` 開始追蹤。');
  }

  const lines = trackedList.map((a, i) => `**${i + 1}.** ${a.name} (ID: ${a.id})`);

  return new EmbedBuilder()
    .setColor(COLOR_ACTRESS)
    .setTitle('📋 追蹤女優列表')
    .setDescription(lines.join('\n'))
    .setFooter({ text: `共追蹤 ${trackedList.length} 位女優` });
}

export function buildNewContentAlert(actress, newContents) {
  const lines = newContents.map((c, i) => {
    const vr = vrTag(c.contentType);
    const code = c.id.toUpperCase();
    const date = c.deliveryStartAt?.slice(0, 10) || '';
    return `**${i + 1}.** ${c.title.slice(0, 60)}${vr}\n\`\`\`${code}\`\`\`${date} | ${c.maker?.name || '—'}`;
  });

  const embed = new EmbedBuilder()
    .setColor(COLOR_ACTRESS)
    .setTitle(`🔔 ${actress.name} 有新作品！`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: `${newContents.length} 部新作品` });

  if (newContents[0]?.packageImage?.largeUrl) {
    embed.setThumbnail(newContents[0].packageImage.largeUrl);
  }

  return embed;
}

export function buildStatusEmbed(stats, version) {
  const now = new Date();
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const healthy = stats.lastSuccess && (!stats.lastError || stats.lastSuccess > stats.lastError.time);
  const color = healthy ? 0x4caf50 : 0xf44336;
  const statusText = healthy ? '✅ 正常' : '❌ 異常';

  const lastSuccessText = stats.lastSuccess
    ? `<t:${Math.floor(stats.lastSuccess.getTime() / 1000)}:R>`
    : '—';
  const lastErrorText = stats.lastError
    ? `${stats.lastError.message}\n<t:${Math.floor(stats.lastError.time.getTime() / 1000)}:R>`
    : '—';

  return new EmbedBuilder()
    .setColor(color)
    .setTitle('📊 系統狀態')
    .addFields(
      { name: '版本', value: `v${version}`, inline: true },
      { name: 'API 狀態', value: statusText, inline: true },
      { name: '延遲', value: stats.lastLatencyMs ? `${stats.lastLatencyMs}ms` : '—', inline: true },
      { name: '最後成功', value: lastSuccessText, inline: true },
      { name: '運行時間', value: `${hours}h ${minutes}m`, inline: true },
      { name: '最後錯誤', value: lastErrorText, inline: false },
    )
    .setTimestamp(now);
}

export function buildWeeklyDigestEmbeds(digest) {
  function formatList(contents, emoji) {
    if (!contents || contents.length === 0) return '暫無資料';
    return contents.map((c, i) => {
      const code = c.id.toUpperCase();
      const actresses = formatActresses(c.actresses);
      const review = formatReview(c.review);
      const bookmark = c.bookmarkCount ? `♥${c.bookmarkCount}` : '';
      const stats = [review, bookmark].filter(Boolean).join(' ');
      return `**${i + 1}.** \`${code}\` ${c.title.slice(0, 50)}\n${actresses} ${stats}`;
    }).join('\n\n');
  }

  return [
    new EmbedBuilder()
      .setColor(0xffc107)
      .setTitle('⭐ 本週最高評分 Top 5')
      .setDescription(formatList(digest.topRated, '⭐')),
    new EmbedBuilder()
      .setColor(0xe91e63)
      .setTitle('❤️ 本週最多收藏 Top 5')
      .setDescription(formatList(digest.topBookmarked, '❤️')),
    new EmbedBuilder()
      .setColor(0xff5722)
      .setTitle('🔥 本週最暢銷 Top 5')
      .setDescription(formatList(digest.topSelling, '🔥')),
  ];
}

export function buildPaginationRow(currentPage, totalPages, prefix) {
  const row = new ActionRowBuilder();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`${prefix}_prev_${currentPage - 1}`)
      .setLabel('◀ 上一頁')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage <= 1),
    new ButtonBuilder()
      .setCustomId(`${prefix}_next_${currentPage + 1}`)
      .setLabel('下一頁 ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages),
  );

  return row;
}
