const BACKEND_URL = 'https://tracked-backend-ez4u.onrender.com';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (response.status === 401) {
    Auth.showLoginScreen();
    throw new Error('Not logged in');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ─── AUTH ───────────────────────────────────────────────────

const API = {

  getMe() {
    return apiFetch('/auth/me');
  },

  login() {
    window.location.href = `${BACKEND_URL}/auth/login`;
  },

  logout() {
    return apiFetch('/auth/logout');
  },

  // ─── STATS ────────────────────────────────────────────────

  getOverview() {
    return apiFetch('/stats/overview');
  },

  getTopTracks(range = 'alltime', limit = 50) {
    return apiFetch(`/stats/top-tracks?range=${range}&limit=${limit}`);
  },

  getTopArtists(range = 'alltime', limit = 20) {
    return apiFetch(`/stats/top-artists?range=${range}&limit=${limit}`);
  },

  getRecentPlays(limit = 50) {
    return apiFetch(`/stats/recent?limit=${limit}`);
  },

  getOverTime() {
    return apiFetch('/stats/over-time');
  },

  getNowPlaying() {
    return apiFetch('/stats/now-playing');
  },

  // ─── IMPORT ───────────────────────────────────────────────

  importHistory(plays) {
    return apiFetch('/import', {
      method: 'POST',
      body: JSON.stringify({ plays })
    });
  }

};
