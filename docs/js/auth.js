const Auth = {
  currentUser: null,

  async init() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    // If Spotify just redirected back with a token, save it
    if (token) {
      API.TokenStore.set(token);
      // Clean the token out of the URL so it's not visible
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      this.showLoginScreen();
      return;
    }

    // Check if we have a stored token and if it's valid
    if (!API.TokenStore.exists()) {
      this.showLoginScreen();
      return;
    }

    try {
      const user = await API.getMe();
      this.currentUser = user;
      this.showDashboard(user);
    } catch {
      this.showLoginScreen();
    }
  },

  showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
  },

  showDashboard(user) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('loading-screen').style.display = 'none';

    document.getElementById('user-name').textContent = user.display_name || 'Listener';

    if (user.avatar_url) {
      document.getElementById('user-avatar').src = user.avatar_url;
      document.getElementById('user-avatar').style.display = 'block';
    }

    if (typeof Dashboard !== 'undefined') {
      Dashboard.init();
    }
  },

  async logout() {
    await API.logout();
    this.currentUser = null;
    this.showLoginScreen();
  }
};

showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loading-screen').style.display = 'none';
},

showDashboard(user) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('loading-screen').style.display = 'none';

  document.getElementById('user-name').textContent = user.display_name || 'Listener';

  if (user.avatar_url) {
    document.getElementById('user-avatar').src = user.avatar_url;
    document.getElementById('user-avatar').style.display = 'block';
  }

  if (typeof Dashboard !== 'undefined') {
    Dashboard.init();
  }
},

  async logout() {
  try {
    await API.logout();
  } catch {
  }
  this.currentUser = null;
  this.showLoginScreen();
}

};
