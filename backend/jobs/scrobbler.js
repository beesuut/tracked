const cron = require('node-cron');
const { getAllUsers,
  upsertTrack,
  savePlay } = require('../db/queries');
const { getRecentlyPlayed } = require('../utils/spotify');

const POLL_INTERVAL_SECONDS = 30;

async function scrobbleUser(user) {
  try {
    const data = await getRecentlyPlayed(user.id);

    if (!data?.items?.length) {
      return 0;
    }

    let newPlays = 0;

    for (const item of data.items) {
      const trackId = await upsertTrack(item.track);

      const isNew = await savePlay(
        user.id,
        trackId,
        item.played_at
      );

      if (isNew) newPlays++;
    }

    return newPlays;

  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      console.warn(`[scrobbler] User ${user.display_name} needs to re-authenticate`);
    } else if (err.message === 'RATE_LIMITED') {
      console.warn(`[scrobbler] Rate limited by Spotify — backing off`);
    } else {
      console.error(`[scrobbler] Error for user ${user.display_name}:`, err.message);
    }
    return 0;
  }
}

async function runScrobbleCycle() {
  const cycleStart = Date.now();

  try {
    const users = await getAllUsers();

    if (users.length === 0) {
      return;
    }

    let totalNew = 0;

    for (const user of users) {
      const newPlays = await scrobbleUser(user);
      totalNew += newPlays;
    }

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);

    if (totalNew > 0) {
      console.log(`[scrobbler] ✓ ${totalNew} new play(s) across ${users.length} user(s) — ${elapsed}s`);
    }

  } catch (err) {
    console.error('[scrobbler] Cycle failed:', err.message);
  }
}

function startScrobbler() {
  console.log(`[scrobbler] Starting — polling every ${POLL_INTERVAL_SECONDS}s`);

  runScrobbleCycle();

  cron.schedule(`*/${POLL_INTERVAL_SECONDS} * * * * *`, runScrobbleCycle);
}

module.exports = { startScrobbler };
