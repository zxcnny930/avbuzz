import { buildContentEmbed, buildListEmbed, buildNewContentAlert } from './embed-builder.js';

const MAX_EMBEDS_PER_MESSAGE = 10;

export function createNotifier(client, channelId) {
  async function getChannel() {
    const ch = client.channels.cache.get(channelId);
    if (ch) return ch;
    return client.channels.fetch(channelId);
  }

  async function sendDailyDigest(contents, totalCount, date) {
    const channel = await getChannel();

    const totalPages = Math.ceil(totalCount / 10);
    const summaryEmbed = buildListEmbed(
      contents.slice(0, 10),
      `📅 ${date} 新片上架`,
      1,
      totalPages,
      totalCount,
    );

    await channel.send({
      content: `**📅 ${date} 新片上架** — 共 ${totalCount} 部`,
      embeds: [summaryEmbed],
    });

    // Send top individual content embeds (up to 5)
    const topContents = contents.slice(0, 5);
    if (topContents.length > 0) {
      const embeds = topContents.map((c, i) =>
        buildContentEmbed(c, { rank: i + 1 })
      );
      // Batch send (max 10 embeds per message)
      for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
        await channel.send({ embeds: embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE) });
      }
    }
  }

  async function sendActressAlert(actress, newContents) {
    const channel = await getChannel();

    const embed = buildNewContentAlert(actress, newContents);
    await channel.send({
      content: `🔔 **${actress.name}** 有 ${newContents.length} 部新作品！`,
      embeds: [embed],
    });

    // Send individual embeds for each new content (batched)
    for (let i = 0; i < newContents.length; i += MAX_EMBEDS_PER_MESSAGE) {
      const batch = newContents.slice(i, i + MAX_EMBEDS_PER_MESSAGE);
      const embeds = batch.map(c => buildContentEmbed(c, { color: 0x9c27b0 }));
      await channel.send({ embeds });
    }
  }

  return { sendDailyDigest, sendActressAlert };
}
