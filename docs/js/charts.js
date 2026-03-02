const Dashboard = {
  currentRange: 'alltime',

  init() {
    console.log('Dashboard init — charts coming in Part 10');
    this.pollNowPlaying();
  },

  setRange(range, tabEl) {
    this.currentRange = range;
    document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    console.log('Range set to:', range);
  },

  async pollNowPlaying() {
    try {
      const data = await API.getNowPlaying();
      const bar = document.getElementById('now-playing-bar');

      if (data.is_playing && data.item) {
        document.getElementById('np-track').textContent = data.item.name;
        document.getElementById('np-artist').textContent = data.item.artists.join(', ');
        document.getElementById('np-art').src = data.item.album_art || '';
        bar.style.display = 'flex';
      } else {
        bar.style.display = 'none';
      }
    } catch {
    }

    setTimeout(() => this.pollNowPlaying(), 30000);
  }
};
