const { getTokens, saveTokens } = require('../db/queries');

const SPOTIFY_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';

async function exchangeCodeForTokens(code, redirectUri) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return response.json();
}

async function getValidAccessToken(userId) {
  const tokens = await getTokens(userId);
  if (!tokens) throw new Error(`No tokens found for user ${userId}`);

  const isExpired = new Date(tokens.expires_at) < new Date(Date.now() + 60_000);

  if (!isExpired) {
    return tokens.access_token;
  }

  console.log(`Refreshing token for user ${userId}...`);
  const refreshed = await refreshAccessToken(tokens.refresh_token);

  await saveTokens(
    userId,
    refreshed.access_token,
    refreshed.refresh_token || tokens.refresh_token,
    refreshed.expires_in
  );

  return refreshed.access_token;
}

async function spotifyGet(endpoint, accessToken) {
  const response = await fetch(`${SPOTIFY_BASE}${endpoint}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (response.status === 429) throw new Error('RATE_LIMITED');
  if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);

  return response.json();
}

async function getSpotifyProfile(accessToken) {
  return spotifyGet('/me', accessToken);
}

async function getRecentlyPlayed(userId) {
  const accessToken = await getValidAccessToken(userId);
  return spotifyGet('/me/player/recently-played?limit=50', accessToken);
}

async function getCurrentlyPlaying(userId) {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(`${SPOTIFY_BASE}/me/player/currently-playing`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Currently playing error: ${response.status}`);

  return response.json();
}

module.exports = {
  exchangeCodeForTokens,
  getValidAccessToken,
  getSpotifyProfile,
  getRecentlyPlayed,
  getCurrentlyPlaying
};
