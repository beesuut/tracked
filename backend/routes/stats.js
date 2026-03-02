const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const spotify = require('../utils/spotify');

async function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const userId = await db.getUserByToken(token);
    if (!userId) return res.status(401).json({ error: 'Invalid token' });
    req.userId = userId;  // make userId available to route handlers below
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.use(requireAuth);

function sinceDate(range) {
  const now = new Date();
  switch (range) {
    case '4weeks': return new Date(now - 28 * 24 * 60 * 60 * 1000);
    case '6months': return new Date(now - 182 * 24 * 60 * 60 * 1000);
    case '1year': return new Date(now - 365 * 24 * 60 * 60 * 1000);
    case 'alltime':
    default: return null;
  }
}

router.get('/overview', async (req, res) => {
  try {
    const stats = await db.getOverviewStats(req.userId);
    res.json(stats);
  } catch (err) {
    console.error('/stats/overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-tracks', async (req, res) => {
  try {
    const since = sinceDate(req.query.range || 'alltime');
    const limit = parseInt(req.query.limit) || 50;
    const tracks = await db.getTopTracks(req.userId, limit, since);
    res.json(tracks);
  } catch (err) {
    console.error('/stats/top-tracks error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/top-artists', async (req, res) => {
  try {
    const since = sinceDate(req.query.range || 'alltime');
    const limit = parseInt(req.query.limit) || 20;
    const artists = await db.getTopArtists(req.userId, limit, since);
    res.json(artists);
  } catch (err) {
    console.error('/stats/top-artists error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const recent = await db.getRecentPlays(req.userId, limit);
    res.json(recent);
  } catch (err) {
    console.error('/stats/recent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/over-time', async (req, res) => {
  try {
    const data = await db.getPlaysOverTime(req.userId);
    res.json(data);
  } catch (err) {
    console.error('/stats/over-time error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/now-playing', async (req, res) => {
  try {
    const data = await spotify.getCurrentlyPlaying(req.userId);

    if (!data || !data.item) {
      return res.json({ is_playing: false });
    }

    res.json({
      is_playing: data.is_playing,
      progress_ms: data.progress_ms,
      item: {
        name: data.item.name,
        artists: data.item.artists.map(a => a.name),
        album: data.item.album.name,
        album_art: data.item.album.images?.[1]?.url || data.item.album.images?.[0]?.url,
        duration_ms: data.item.duration_ms,
        spotify_url: data.item.external_urls?.spotify
      }
    });
  } catch (err) {
    console.error('/stats/now-playing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
