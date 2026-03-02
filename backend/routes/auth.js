const express = require('express');
const router = express.Router();
const { exchangeCodeForTokens, getSpotifyProfile } = require('../utils/spotify');
const { upsertUser, saveTokens, getUserById } = require('../db/queries');

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-recently-played',
  'user-top-read',
  'user-read-currently-playing'
].join(' ');

const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? `${process.env.BACKEND_URL}/auth/callback`
  : `http://127.0.0.1:${process.env.PORT || 3000}/auth/callback`;

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    state: Math.random().toString(36).substring(7)
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Spotify auth denied:', error);
    return res.redirect(`${process.env.FRONTEND_URL}?error=access_denied`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  try {
    const tokenData = await exchangeCodeForTokens(code, REDIRECT_URI);

    const spotifyProfile = await getSpotifyProfile(tokenData.access_token);

    const user = await upsertUser(spotifyProfile);

    await saveTokens(
      user.id,
      tokenData.access_token,
      tokenData.refresh_token,
      tokenData.expires_in
    );

    req.session.userId = user.id;

    console.log(`User logged in: ${spotifyProfile.display_name} (${user.id})`);

    res.redirect(`${process.env.FRONTEND_URL}?login=success`);

  } catch (err) {
    console.error('Auth callback error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const user = await getUserById(req.session.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

module.exports = router;
