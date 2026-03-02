const BACKEND_URL = 'https://tracked-backend-ez4u.onrender.com';

const TokenStore = {
  get() { return localStorage.getItem('tracked_token'); },
  set(token) { localStorage.setItem('tracked_token', token); },
  clear() { localStorage.removeItem('tracked_token'); },
  exists() { return !!this.get(); }
};

async function apiFetch(path, options = {}) {
  const token = TokenStore.get();

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token || '',
      ...options.headers
    }
  });

  if (response.status === 401) {
    TokenStore.clear();
    Auth.showLoginScreen();
    throw new Error('Not logged in');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

const API = {
  TokenStore,

  getMe() { return apiFetch('/auth/me'); },
  login() { window.location.href = `${BACKEND_URL}/auth/login`; },
  async logout() { TokenStore.clear(); },

  getOverview() { return apiFetch('/stats/overview'); },
  getTopTracks(range = 'alltime', limit = 50) { return apiFetch(`/stats/top-tracks?range=${range}&limit=${limit}`); },
  getTopArtists(range = 'alltime', limit = 20) { return apiFetch(`/stats/top-artists?range=${range}&limit=${limit}`); },
  getRecentPlays(limit = 50) { return apiFetch(`/stats/recent?limit=${limit}`); },
  getOverTime() { return apiFetch('/stats/over-time'); },
  getNowPlaying() { return apiFetch('/stats/now-playing'); },

  importHistory(plays) {
    return apiFetch('/import', { method: 'POST', body: JSON.stringify({ plays }) });
  }
};
