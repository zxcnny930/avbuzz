const API_BASE = 'https://api.telegram.org/bot';

export function createTelegramNotifier(botToken, chatId) {
  const baseUrl = `${API_BASE}${botToken}`;

  async function callApi(method, body, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          const wait = (data.parameters?.retry_after || 5) * 1000;
          console.warn(`[Telegram] Rate limited, waiting ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        const data = await res.json();
        if (!data.ok) {
          throw new Error(`Telegram API error: ${data.description}`);
        }
        return data.result;
      } catch (err) {
        if (attempt === retries) {
          console.error(`[Telegram] Failed after ${retries} attempts:`, err.message);
          return null;
        }
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function vrTag(contentType) {
    return contentType === 'VR' ? ' 🥽' : '';
  }

  function formatActresses(actresses) {
    if (!actresses || actresses.length === 0) return '—';
    return actresses.map(a => a.name).join(', ');
  }

  function formatReview(review) {
    if (!review || !review.count) return '';
    return ` ⭐${review.average.toFixed(1)}(${review.count})`;
  }

  function formatBookmark(count) {
    return count ? ` ♥${count}` : '';
  }

  function contentLine(c, index) {
    const vr = vrTag(c.contentType);
    const actresses = escapeHtml(formatActresses(c.actresses));
    const maker = escapeHtml(c.maker?.name || '—');
    const review = formatReview(c.review);
    const bookmark = formatBookmark(c.bookmarkCount);
    const title = escapeHtml(c.title.slice(0, 50));
    const code = c.id.toUpperCase();
    const url = `https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=${c.id}/`;
    return `<b>${index}.</b> <code>${code}</code> <a href="${url}">${title}</a>${vr}\n    ${actresses} | ${maker}${review}${bookmark}`;
  }

  async function sendMessage(text, opts = {}) {
    return callApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: opts.disablePreview ?? true,
      ...opts.extra,
    });
  }

  async function sendPhoto(photoUrl, caption) {
    return callApi('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    });
  }

  async function sendDailyDigest(contents, totalCount, date) {
    const header = `📅 <b>${date} 新片上架</b> — 共 ${totalCount} 部\n`;
    const lines = contents.slice(0, 15).map((c, i) => contentLine(c, i + 1));

    // Telegram message limit is 4096 chars, split if needed
    let msg = header + '\n' + lines.join('\n\n');
    if (msg.length > 4000) {
      msg = header + '\n' + lines.slice(0, 10).join('\n\n');
      if (lines.length > 10) {
        msg += `\n\n⋯ 還有 ${totalCount - 10} 部`;
      }
    }

    await sendMessage(msg);

    // Send cover of top 1 if available
    const top = contents[0];
    if (top?.packageImage?.largeUrl) {
      const caption = `🏆 <b>今日首推</b>\n${escapeHtml(top.title.slice(0, 100))}\n${escapeHtml(formatActresses(top.actresses))}`;
      await sendPhoto(top.packageImage.largeUrl, caption);
    }
  }

  async function sendActressAlert(actress, newContents) {
    const header = `🔔 <b>${escapeHtml(actress.name)}</b> 有 ${newContents.length} 部新作品！\n`;
    const lines = newContents.map((c, i) => contentLine(c, i + 1));
    const msg = header + '\n' + lines.join('\n\n');

    await sendMessage(msg.slice(0, 4000));

    // Send cover of first new content
    const first = newContents[0];
    if (first?.packageImage?.largeUrl) {
      const caption = `${escapeHtml(first.title.slice(0, 100))}\n${escapeHtml(formatActresses(first.actresses))}`;
      await sendPhoto(first.packageImage.largeUrl, caption);
    }
  }

  return { sendMessage, sendPhoto, sendDailyDigest, sendActressAlert };
}
