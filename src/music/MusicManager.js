import { LavalinkManager } from 'lavalink-client';
import { Events } from 'discord.js';
import * as guildSettings from '../data/guildSettings.js';

/** Default idle time (ms) before destroying the player when the queue is empty. */
const DEFAULT_IDLE_DESTROY_MS = 60_000;

/**
 * Reusable music manager: one Lavalink connection, one player per guild,
 * queue per player, play/pause/skip/stop, auto-disconnect when idle.
 */
export class MusicManager {
  /**
   * @param {import('discord.js').Client} client - Discord client
   * @param {MusicManagerOptions} [options] - Lavalink nodes and options
   */
  constructor(client, options = {}) {
    this.client = client;
    this.options = {
      idleDestroyMs: options.idleDestroyMs ?? DEFAULT_IDLE_DESTROY_MS,
      defaultVolume: options.defaultVolume ?? 100,
      defaultSearchPlatform: options.defaultSearchPlatform ?? 'ytsearch',
      nodes: options.nodes ?? [
        {
          id: 'main',
          host: 'localhost',
          port: 2333,
          authorization: 'youshallnotpass',
          secure: false,
        },
      ],
      clientId: options.clientId ?? client.user?.id,
      username: options.username ?? client.user?.username ?? 'MusicBot',
    };

    this.manager = new LavalinkManager({
      nodes: this.options.nodes.map((n) => ({
        id: n.id,
        host: n.host,
        port: Number(n.port),
        authorization: n.authorization ?? n.password ?? 'youshallnotpass',
        secure: Boolean(n.secure),
        // Public nodes often don't report sourceManagers; skip strict validation so search still runs
        autoChecks: { sourcesValidations: false, pluginValidations: false },
        // Server mode: longer delay between reconnect attempts (avoids rate limit), more attempts before giving up
        ...(typeof n.retryDelay === 'number' && { retryDelay: n.retryDelay }),
        ...(typeof n.retryAmount === 'number' && { retryAmount: n.retryAmount }),
      })),
      sendToShard: (guildId, payload) => {
        const guild = this.client.guilds.cache.get(guildId);
        if (guild?.shard) guild.shard.send(payload);
      },
      autoSkip: true,
      client: {
        id: this.options.clientId,
        username: this.options.username,
      },
      playerOptions: {
        applyVolumeAsFilter: false,
        defaultSearchPlatform: this.options.defaultSearchPlatform,
        onDisconnect: { autoReconnect: true, destroyPlayer: false },
        onEmptyQueue: {
          destroyAfterMs: this.options.idleDestroyMs,
        },
      },
    });

    this._bindRaw();
    this._bindManagerEvents();
  }

  _bindRaw() {
    this.client.on(Events.Raw, (data) => this.manager.sendRawData(data));
  }

  _bindManagerEvents() {
    this.manager.on('playerDestroy', (player) => {
      this.client.emit('musicPlayerDestroy', player);
    });
    this.manager.on('queueEnd', (player) => {
      this.client.emit('musicQueueEnd', player);
    });
    // Prevent Lavalink node errors (e.g. connection refused) from crashing the process
    this.manager.nodeManager?.on('error', (node, err) => {
      const host = node?.options?.host ?? 'unknown';
      console.warn(`[Lavalink] Node "${host}" error:`, err?.message ?? err);
    });
  }

  /**
   * Initialize the manager (call once after client is ready).
   * @param {{ id: string, username: string }} user - client.user
   */
  init(user) {
    this.manager.init({ id: user.id, username: user.username });
  }

  /**
   * Get existing player or create one and connect.
   * @param {string} guildId
   * @param {string} voiceChannelId
   * @param {string} textChannelId
   * @returns {Promise<import('lavalink-client').Player>}
   */
  async getOrCreatePlayer(guildId, voiceChannelId, textChannelId) {
    let player = this.manager.getPlayer(guildId);
    if (player) {
      if (typeof player.setTextChannel === 'function') player.setTextChannel(textChannelId);
      return player;
    }
    const saved = guildSettings.get(guildId);
    const volume = typeof saved.volume === 'number'
      ? Math.min(100, Math.max(0, Math.round(saved.volume)))
      : this.options.defaultVolume;
    player = await this.manager.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      volume,
    });
    if (saved.loop && ['off', 'track', 'queue'].includes(saved.loop)) {
      player.setRepeatMode(saved.loop);
    }
    await player.connect();
    return player;
  }

  /**
   * Get player for guild if it exists.
   * @param {string} guildId
   * @returns {import('lavalink-client').Player | undefined}
   */
  getPlayer(guildId) {
    return this.manager.getPlayer(guildId);
  }

  /**
   * Play a query: search, add to queue, start if not playing.
   * @param {string} guildId
   * @param {string} voiceChannelId
   * @param {string} textChannelId
   * @param {string} query - search query or URL
   * @param {object} requester - user who requested (e.g. interaction.user)
   * @param {{ source?: string }} [opts] - optional source (ytmsearch, ytsearch, etc.)
   * @returns {Promise<{ added: number, title?: string, author?: string, duration?: number, uri?: string, playlist?: string }>}
   */
  async play(guildId, voiceChannelId, textChannelId, query, requester, opts = {}) {
    const player = await this.getOrCreatePlayer(guildId, voiceChannelId, textChannelId);
    const source = opts.source ?? this.options.defaultSearchPlatform;
    let response = await player.search({ query, source: source }, requester);

    // Many public nodes support ytsearch but not ytmsearch (or vice versa); retry with the other
    if (!response?.tracks?.length && (source === 'ytmsearch' || source === 'ytsearch')) {
      const fallbackSource = source === 'ytmsearch' ? 'ytsearch' : 'ytmsearch';
      response = await player.search({ query, source: fallbackSource }, requester);
    }

    if (!response?.tracks?.length) {
      return { added: 0 };
    }

    const isPlaylist = response.loadType === 'playlist';
    const tracksToAdd = isPlaylist ? response.tracks : [response.tracks[0]];
    await player.queue.add(tracksToAdd);
    const added = tracksToAdd.length;

    if (!player.playing) {
      await player.play();
    }

    const first = response.tracks[0]?.info;
    return {
      added,
      title: first?.title,
      author: first?.author,
      duration: first?.duration,
      uri: first?.uri,
      playlist: isPlaylist ? response.playlist?.title : undefined,
    };
  }

  /**
   * Pause playback.
   * @param {string} guildId
   * @returns {Promise<boolean>} - whether a player was found and paused
   */
  async pause(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return false;
    if (player.paused) return true;
    try {
      await player.pause();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resume playback.
   * @param {string} guildId
   * @returns {Promise<boolean>} - whether a player was found and resumed
   */
  async resume(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return false;
    if (!player.paused) return true;
    try {
      await player.resume();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Skip current track (plays next in queue).
   * @param {string} guildId
   * @returns {Promise<boolean>} - whether a player was found and skip succeeded
   */
  async skip(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return false;
    try {
      await player.skip(0, false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Seek to a position in the current track (position in milliseconds).
   * @param {string} guildId
   * @param {number} positionMs - Position in ms (0 = start, max = track duration)
   * @returns {Promise<boolean>} - true if seeked, false if no player or track not seekable
   */
  async seek(guildId, positionMs) {
    const player = this.getPlayer(guildId);
    if (!player?.queue?.current) return false;
    try {
      const pos = Math.max(0, Math.round(Number(positionMs)));
      await player.seek(pos);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop playback and destroy the player (disconnect, clear queue).
   * @param {string} guildId
   * @returns {boolean} - whether a player was found and destroyed
   */
  stop(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return false;
    player.destroy();
    return true;
  }

  /**
   * Get queue for a guild (current track + list of tracks).
   * @param {string} guildId
   * @returns {{ current: object | null, tracks: object[], length: number } | null}
   */
  getQueue(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return null;
    const tracks = player.queue.tracks ?? [];
    return {
      current: player.queue.current ?? null,
      tracks: [...tracks],
      length: tracks.length,
    };
  }

  /**
   * Get current track and position for a guild.
   * @param {string} guildId
   * @returns {{ track: object | null, position?: number, duration?: number, paused?: boolean, requester?: object } | null}
   */
  getNowPlaying(guildId) {
    const player = this.getPlayer(guildId);
    if (!player) return null;
    const current = player.queue.current ?? null;
    const requester = current?.requester ?? current?.userData?.requester ?? null;
    return {
      track: current,
      position: player.lastPosition ?? 0,
      duration: current?.info?.duration,
      paused: player.paused,
      requester,
    };
  }

  /**
   * Play the previous track (from queue.previous). Returns true if previous was played.
   * @param {string} guildId
   * @returns {Promise<boolean>}
   */
  async previous(guildId) {
    const player = this.getPlayer(guildId);
    if (!player?.queue?.previous?.length) return false;
    try {
      const prev = await player.queue.shiftPrevious();
      if (!prev) return false;
      await player.play({ clientTrack: prev });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get or set volume (0–100).
   * @param {string} guildId
   * @param {number} [volume] - If provided, set volume and return new value; otherwise return current.
   * @returns {Promise<number | null>} - Current volume after set, or current volume, or null if no player
   */
  async volume(guildId, volume) {
    const player = this.getPlayer(guildId);
    if (!player) return null;
    if (typeof volume === 'number') {
      const clamped = Math.min(100, Math.max(0, Math.round(volume)));
      await player.setVolume(clamped);
      guildSettings.set(guildId, { volume: clamped });
      return clamped;
    }
    return player.volume ?? null;
  }

  /**
   * Get or set loop mode: 'off' | 'track' | 'queue'.
   * @param {string} guildId
   * @param {'off'|'track'|'queue'} [mode] - If provided, set repeat mode; otherwise return current.
   * @returns {string|null} - Current mode after set, or current mode, or null if no player
   */
  loop(guildId, mode) {
    const player = this.getPlayer(guildId);
    if (!player) return null;
    if (mode !== undefined) {
      if (!['off', 'track', 'queue'].includes(mode)) return player.repeatMode ?? null;
      player.setRepeatMode(mode);
      guildSettings.set(guildId, { loop: mode });
      return mode;
    }
    return player.repeatMode ?? 'off';
  }
}

/**
 * @typedef {Object} MusicManagerOptions
 * @property {number} [idleDestroyMs] - Destroy player after queue empty for this many ms
 * @property {number} [defaultVolume] - Default volume 0–100
 * @property {string} [defaultSearchPlatform] - e.g. 'ytmsearch', 'ytsearch'
 * @property {string} [clientId] - Bot application id
 * @property {string} [username] - Bot username
 * @property {Array<{ id: string, host: string, port: number, password?: string, authorization?: string, secure?: boolean }>} [nodes] - Lavalink nodes
 */
