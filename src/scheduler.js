import * as fanza from './fanza-client.js';
import * as tracker from './actress-tracker.js';
import * as settings from './settings.js';

const CHECK_INTERVAL = 30_000; // 30 seconds

let intervalId = null;
let lastDailyPush = null;
let lastActressCheck = null;
let lastWeeklyDigest = null;

function getNowJST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function getJSTDateString(jstDate) {
  return jstDate.toISOString().slice(0, 10);
}

export function start(notifiers, scheduleConfig) {
  const {
    dailyPushHourJST = 0,
    dailyPushMinuteJST = 5,
    actressCheckIntervalHours = 6,
  } = scheduleConfig;

  console.log(`[Scheduler] Starting — daily push at JST ${String(dailyPushHourJST).padStart(2, '0')}:${String(dailyPushMinuteJST).padStart(2, '0')}, actress check every ${actressCheckIntervalHours}h, ${notifiers.length} notifier(s)`);

  intervalId = setInterval(async () => {
    const jstNow = getNowJST();
    const jstHour = jstNow.getUTCHours();
    const jstMinute = jstNow.getUTCMinutes();
    const todayKey = getJSTDateString(jstNow);

    // Daily push check
    if (jstHour === dailyPushHourJST && jstMinute === dailyPushMinuteJST && lastDailyPush !== todayKey) {
      lastDailyPush = todayKey;
      const dailyEnabled = await settings.get('dailyPushEnabled');
      if (dailyEnabled === false) {
        console.log('[Scheduler] Daily push skipped (disabled)');
      } else {
        console.log(`[Scheduler] Triggering daily push for ${todayKey}`);
        try {
          await runDailyPush(notifiers, todayKey);
        } catch (err) {
          console.error('[Scheduler] Daily push failed:', err.message);
        }
      }
    }

    // Actress check
    const actressIntervalMs = actressCheckIntervalHours * 60 * 60 * 1000;
    if (!lastActressCheck || Date.now() - lastActressCheck >= actressIntervalMs) {
      lastActressCheck = Date.now();
      const actressEnabled = await settings.get('actressCheckEnabled');
      if (actressEnabled === false) {
        console.log('[Scheduler] Actress check skipped (disabled)');
      } else {
        console.log('[Scheduler] Triggering actress check');
        try {
          await runActressCheck(notifiers);
        } catch (err) {
          console.error('[Scheduler] Actress check failed:', err.message);
        }
      }
    }

    // Weekly digest — every Sunday JST 20:00
    const jstDay = jstNow.getUTCDay(); // 0 = Sunday
    if (jstDay === 0 && jstHour === 20 && jstMinute === 0 && lastWeeklyDigest !== todayKey) {
      lastWeeklyDigest = todayKey;
      const weeklyEnabled = await settings.get('weeklyDigestEnabled');
      if (weeklyEnabled === false) {
        console.log('[Scheduler] Weekly digest skipped (disabled)');
      } else {
        console.log('[Scheduler] Triggering weekly digest');
        try {
          await runWeeklyDigest(notifiers);
        } catch (err) {
          console.error('[Scheduler] Weekly digest failed:', err.message);
        }
      }
    }
  }, CHECK_INTERVAL);
}

export function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped');
  }
}

async function runDailyPush(notifiers, date) {
  const result = await fanza.fetchTodayReleases(date, 20, 0);
  if (result.totalCount === 0) {
    console.log(`[Scheduler] No releases for ${date}`);
    return;
  }
  console.log(`[Scheduler] ${date}: ${result.totalCount} releases, pushing digest`);
  for (const n of notifiers) {
    try {
      await n.sendDailyDigest(result.contents, result.totalCount, date);
    } catch (err) {
      console.error(`[Scheduler] Notifier failed:`, err.message);
    }
  }
}

async function runActressCheck(notifiers) {
  const tracked = await tracker.getTracked();
  const actressIds = Object.keys(tracked);

  if (actressIds.length === 0) {
    console.log('[Scheduler] No tracked actresses');
    return;
  }

  for (const actressId of actressIds) {
    const info = tracked[actressId];
    try {
      const result = await fanza.fetchByActress(actressId, 20);
      const seenIds = new Set(info.seenIds);
      const newContents = result.contents.filter(c => !seenIds.has(c.id));

      if (newContents.length > 0) {
        console.log(`[Scheduler] ${info.name}: ${newContents.length} new contents`);
        for (const n of notifiers) {
          try {
            await n.sendActressAlert({ id: actressId, name: info.name }, newContents);
          } catch (err) {
            console.error(`[Scheduler] Notifier failed:`, err.message);
          }
        }
        await tracker.updateSeen(actressId, newContents.map(c => c.id));
      }

      await tracker.updateLastCheck(actressId);
    } catch (err) {
      console.error(`[Scheduler] Actress check failed for ${info.name}:`, err.message);
    }

    // Small delay between actresses to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function runWeeklyDigest(notifiers) {
  const digest = await fanza.fetchWeeklyDigest();
  const hasContent = digest.topRated.length > 0 || digest.topBookmarked.length > 0 || digest.topSelling.length > 0;
  if (!hasContent) {
    console.log('[Scheduler] Weekly digest: no content');
    return;
  }
  console.log(`[Scheduler] Weekly digest: ${digest.topRated.length} rated, ${digest.topBookmarked.length} bookmarked, ${digest.topSelling.length} selling`);
  for (const n of notifiers) {
    try {
      await n.sendWeeklyDigest(digest);
    } catch (err) {
      console.error('[Scheduler] Weekly digest notifier failed:', err.message);
    }
  }
}

// Manual triggers for testing
export async function triggerDailyPush(notifiers) {
  const date = fanza.getTodayJST();
  await runDailyPush(notifiers, date);
}

export async function triggerActressCheck(notifiers) {
  await runActressCheck(notifiers);
}

export async function triggerWeeklyDigest(notifiers) {
  await runWeeklyDigest(notifiers);
}
