/**
 * Per-guild settings (volume, loop, 24x7, voice channel).
 * The actual data lives in data/guildSettings.json — that file is easy to view and edit.
 * Stop the bot before editing the JSON by hand so the bot doesn’t overwrite your changes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const SETTINGS_FILE = join(DATA_DIR, 'guildSettings.json');

/** @type {Record<string, { volume?: number, loop?: string, stayConnected?: boolean, voiceChannelId?: string }>} */
let cache = {};

function load() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf8');
      cache = JSON.parse(raw) || {};
    } else {
      cache = {};
    }
  } catch (err) {
    console.warn('[GuildSettings] Could not load settings file:', err.message);
    cache = {};
  }
}

function save() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SETTINGS_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[GuildSettings] Could not save settings file:', err.message);
  }
}

load();

/**
 * Get all settings for a guild.
 * @param {string} guildId
 * @returns {{ volume?: number, loop?: string, stayConnected?: boolean, voiceChannelId?: string }}
 */
export function get(guildId) {
  return cache[guildId] ? { ...cache[guildId] } : {};
}

/**
 * Update settings for a guild and persist to JSON.
 * @param {string} guildId
 * @param {{ volume?: number, loop?: string, stayConnected?: boolean, voiceChannelId?: string }} updates
 */
export function set(guildId, updates) {
  if (!guildId || typeof updates !== 'object') return;
  cache[guildId] = { ...(cache[guildId] || {}), ...updates };
  save();
}
