const supabase = require('./supabase');

async function upsertUser(spotifyProfile) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      spotify_id: spotifyProfile.id,
      display_name: spotifyProfile.display_name,
      avatar_url: spotifyProfile.images?.[0]?.url || null,
      country: spotifyProfile.country,
      last_seen: new Date().toISOString()
    }, { onConflict: 'spotify_id' })
    .select()
    .single();

  if (error) throw new Error(`upsertUser failed: ${error.message}`);
  return data;
}

async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`getUserById failed: ${error.message}`);
  return data;
}

async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, spotify_id, display_name');

  if (error) throw new Error(`getAllUsers failed: ${error.message}`);
  return data || [];
}

async function saveTokens(userId, accessToken, refreshToken, expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error } = await supabase
    .from('tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt
    }, { onConflict: 'user_id' });

  if (error) throw new Error(`saveTokens failed: ${error.message}`);
}

async function getTokens(userId) {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(`getTokens failed: ${error.message}`);
  return data;
}

async function upsertTrack(trackData) {
  const { data, error } = await supabase
    .from('tracks')
    .upsert({
      spotify_id: trackData.id,
      name: trackData.name,
      artist: trackData.artists?.[0]?.name || 'Unknown Artist',
      artist_id: trackData.artists?.[0]?.id || null,
      album: trackData.album?.name || null,
      album_art_url: trackData.album?.images?.[1]?.url ||
        trackData.album?.images?.[0]?.url || null,
      duration_ms: trackData.duration_ms || null,
      popularity: trackData.popularity || null
    }, { onConflict: 'spotify_id' })
    .select('id')
    .single();

  if (error) throw new Error(`upsertTrack failed: ${error.message}`);
  return data.id;
}

async function savePlay(userId, trackId, playedAt, msPlayed = null, source = 'scrobbler') {
  const { data, error } = await supabase
    .from('plays')
    .upsert({
      user_id: userId,
      track_id: trackId,
      played_at: playedAt,
      ms_played: msPlayed,
      source: source
    }, {
      onConflict: 'user_id,track_id,played_at',
      ignoreDuplicates: true
    })
    .select('id');

  if (error) throw new Error(`savePlay failed: ${error.message}`);
  return data && data.length > 0;
}

async function savePlays(plays) {
  if (plays.length === 0) return 0;

  const { data, error } = await supabase
    .from('plays')
    .upsert(plays, {
      onConflict: 'user_id,track_id,played_at',
      ignoreDuplicates: true
    })
    .select('id');

  if (error) throw new Error(`savePlays failed: ${error.message}`);
  return data?.length || 0;
}

async function getOverviewStats(userId) {
  const { count: totalPlays } = await supabase
    .from('plays')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { data: msData } = await supabase
    .from('plays')
    .select('ms_played')
    .eq('user_id', userId)
    .not('ms_played', 'is', null);

  const totalMinutes = msData?.length
    ? Math.round(msData.reduce((sum, p) => sum + (p.ms_played || 0), 0) / 60000)
    : null;

  const { data: firstPlay } = await supabase
    .from('plays')
    .select('played_at, tracks(name, artist)')
    .eq('user_id', userId)
    .order('played_at', { ascending: true })
    .limit(1)
    .single();

  return {
    totalPlays: totalPlays || 0,
    totalMinutes: totalMinutes || null,
    firstPlay: firstPlay || null
  };
}

async function getTopTracks(userId, limit = 50, since = null) {
  let query = supabase
    .from('plays')
    .select('track_id, tracks(spotify_id, name, artist, album, album_art_url, popularity)')
    .eq('user_id', userId);

  if (since) query = query.gte('played_at', since.toISOString());

  const { data, error } = await query;
  if (error) throw new Error(`getTopTracks failed: ${error.message}`);

  const counts = {};
  for (const play of data) {
    const id = play.track_id;
    if (!counts[id]) counts[id] = { ...play.tracks, play_count: 0 };
    counts[id].play_count++;
  }

  return Object.values(counts)
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, limit);
}

async function getTopArtists(userId, limit = 20, since = null) {
  let query = supabase
    .from('plays')
    .select('tracks(artist, artist_id)')
    .eq('user_id', userId);

  if (since) query = query.gte('played_at', since.toISOString());

  const { data, error } = await query;
  if (error) throw new Error(`getTopArtists failed: ${error.message}`);

  const counts = {};
  for (const play of data) {
    const artist = play.tracks?.artist;
    if (!artist) continue;
    if (!counts[artist]) {
      counts[artist] = {
        name: artist,
        artist_id: play.tracks.artist_id,
        play_count: 0
      };
    }
    counts[artist].play_count++;
  }

  return Object.values(counts)
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, limit);
}

async function getRecentPlays(userId, limit = 50) {
  const { data, error } = await supabase
    .from('plays')
    .select('played_at, tracks(spotify_id, name, artist, album_art_url)')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentPlays failed: ${error.message}`);
  return data || [];
}

async function getPlaysOverTime(userId) {
  const { data, error } = await supabase
    .from('plays')
    .select('played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: true });

  if (error) throw new Error(`getPlaysOverTime failed: ${error.message}`);

  const byMonth = {};
  for (const play of data) {
    const month = play.played_at.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  return Object.entries(byMonth).map(([month, count]) => ({ month, count }));
}
async function saveSessionToken(userId, token) {
  const { error } = await supabase
    .from('session_tokens')
    .upsert({ user_id: userId, token, created_at: new Date().toISOString() },
      { onConflict: 'user_id' });
  if (error) throw new Error(`saveSessionToken failed: ${error.message}`);
}

async function getUserByToken(token) {
  const { data, error } = await supabase
    .from('session_tokens')
    .select('user_id')
    .eq('token', token)
    .single();
  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(`getUserByToken failed: ${error.message}`);
  return data?.user_id || null;
}

module.exports = {
  upsertUser,
  getUserById,
  getAllUsers,
  saveTokens,
  getTokens,
  upsertTrack,
  savePlay,
  savePlays,
  getOverviewStats,
  getTopTracks,
  getTopArtists,
  getRecentPlays,
  getPlaysOverTime,
  saveSessionToken,
  getUserByToken
};
