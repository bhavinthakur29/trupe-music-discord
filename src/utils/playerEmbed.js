import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const COLOR = 0x5865f2;

function formatDuration(ms) {
  if (ms == null || ms < 0) return '?';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function formatShortDuration(ms) {
  if (ms == null || ms < 0) return '?';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}

/** Resolve requester to a display string (e.g. @username). */
function requesterLabel(requester) {
  if (!requester) return 'Unknown';
  if (typeof requester === 'string') return requester;
  if (requester.username) return `@${requester.username}`;
  if (requester.tag) return requester.tag;
  return 'Unknown';
}

/**
 * Build the now-playing or queue embed for the interactive player (MUSIC PANEL style).
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {'nowplaying'|'queue'} view
 * @param {{ pausedOverride?: boolean }} [opts] - If set, use for "Paused" in footer (keeps embed in sync with button)
 * @returns {EmbedBuilder}
 */
export function buildPlayerEmbed(client, guildId, view = 'nowplaying', opts = {}) {
  const embed = new EmbedBuilder().setColor(COLOR).setTimestamp();

  if (!client.music) {
    embed.setTitle('MUSIC PANEL').setDescription('Music is not configured.');
    return embed;
  }

  const player = client.music.getPlayer(guildId);
  if (!player) {
    embed.setTitle('MUSIC PANEL').setDescription('Nothing is playing. Use `/play` to start.');
    return embed;
  }

  if (view === 'queue') {
    const queue = client.music.getQueue(guildId);
    const { current, tracks, length } = queue ?? { current: null, tracks: [], length: 0 };
    embed.setTitle('MUSIC PANEL — Queue');
    if (current?.info) {
      embed.addFields({
        name: 'Now playing',
        value: `**${current.info.title ?? 'Unknown'}** · \`${formatShortDuration(current.info.duration)}\``,
        inline: false,
      });
    }
    if (tracks?.length) {
      const list = tracks.slice(0, 10).map((t, i) => `${i + 1}. **${t?.info?.title ?? 'Unknown'}** \`${formatShortDuration(t?.info?.duration)}\``).join('\n');
      embed.addFields({
        name: `Up next (${length})`,
        value: list.length > 1024 ? list.slice(0, 1021) + '…' : list,
        inline: false,
      });
    } else if (!current) {
      embed.setDescription('Queue is empty.');
    }
    return embed;
  }

  const np = client.music.getNowPlaying(guildId);
  const { track, position = 0, duration, paused, requester } = np ?? {};
  const isPaused = opts.pausedOverride !== undefined ? opts.pausedOverride : paused;
  const info = track?.info ?? {};
  const title = info.title ?? 'Unknown';
  const author = info.author ?? null;
  const durMs = duration ?? 0;
  const posMs = Math.min(position ?? 0, durMs);
  const progress = durMs > 0 ? Math.min(1, posMs / durMs) : 0;
  const barLen = 14;
  const filled = Math.round(barLen * progress);
  const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(barLen - filled);

  embed.setTitle('MUSIC PANEL');

  const requestedBy = requesterLabel(requester);
  const durationStr = formatShortDuration(durMs);
  const progressStr = `${formatDuration(posMs)} / ${formatDuration(durMs)}`;

  embed.addFields(
    {
      name: 'Now playing',
      value: `**${title}**${author ? ` · *${author}*` : ''}`,
      inline: false,
    },
    {
      name: 'Requested by',
      value: requestedBy,
      inline: true,
    },
    {
      name: 'Duration',
      value: durationStr,
      inline: true,
    },
    {
      name: 'Progress',
      value: `${bar}\n\`${progressStr}\``,
      inline: false,
    }
  );

  const loopMode = client.music.loop(guildId);
  const loopLabel = loopMode === 'track' ? '🔁 Track' : loopMode === 'queue' ? '🔁 Queue' : '';
  const footer = [isPaused && '⏸ Paused', `🔊 Vol ${player.volume ?? 100}%`, loopLabel].filter(Boolean).join(' · ');
  if (footer) embed.setFooter({ text: footer });
  if (info.uri) embed.setURL(info.uri);
  return embed;
}

/**
 * Build button rows for the interactive player (reference-style layout).
 * Row 1: Vol Down | Back | Pause/Resume | Skip | Vol Up
 * Row 2: Loop | Stop | Queue | Reset filter | Refresh
 * @param {object} [opts] - Optional overrides (e.g. { pausedOverride: true } after toggling pause)
 */
export function buildPlayerComponents(client, guildId, view = 'nowplaying', opts = {}) {
  const player = client.music?.getPlayer(guildId);
  const hasPlayer = !!player;
  const paused = opts.pausedOverride !== undefined ? opts.pausedOverride : (hasPlayer && player.paused);
  const loopMode = hasPlayer ? (client.music.loop(guildId) ?? 'off') : 'off';
  const hasPrevious = hasPlayer && (player.queue?.previous?.length ?? 0) > 0;

  const loopLabel = loopMode === 'track' ? 'Track' : loopMode === 'queue' ? 'Queue' : 'Loop';
  const queueLabel = view === 'queue' ? '◀ Back' : 'Queue';

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music:volDown')
      .setLabel('Down')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔉')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:previous')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏮️')
      .setDisabled(!hasPrevious),
    new ButtonBuilder()
      .setCustomId('music:pause')
      .setLabel(paused ? 'Resume' : 'Pause')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(paused ? '▶️' : '⏸️')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:skip')
      .setLabel('Skip')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⏭️')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:volUp')
      .setLabel('Up')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔊')
      .setDisabled(!hasPlayer)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('music:loop')
      .setLabel(loopLabel)
      .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔁')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:stop')
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⏹️')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId(view === 'queue' ? 'music:refresh' : 'music:queue')
      .setLabel(queueLabel)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:filterReset')
      .setLabel('Reset filter')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎚️')
      .setDisabled(!hasPlayer),
    new ButtonBuilder()
      .setCustomId('music:refresh')
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄')
      .setDisabled(!hasPlayer)
  );

  return [row1, row2];
}
