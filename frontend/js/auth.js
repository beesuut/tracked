const Auth = {

  currentUser: null,

  async init() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('login') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (params.get('error')) {
      console.error('Login error:', params.get('error'));
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
    try {
      await API.logout();
    } catch {
    }
    this.currentUser = null;
    this.showLoginScreen();
  }

};
