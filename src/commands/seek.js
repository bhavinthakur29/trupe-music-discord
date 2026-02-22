import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

/**
 * Parse a time string into milliseconds.
 * Accepts: "90", "1:30", "2:45", "0:30", "1:00:00"
 * @param {string} input
 * @returns {number | null} - ms or null if invalid
 */
function parseTimeToMs(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Only digits and colons
  if (!/^[\d:]+$/.test(trimmed)) return null;

  const parts = trimmed.split(':').map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
  if (parts.length === 0) return null;

  if (parts.length === 1) {
    // "90" -> 90 seconds; large numbers (e.g. 90000) treat as ms
    const n = parts[0];
    return n >= 3600000 ? n : n * 1000;
  }

  if (parts.length === 2) {
    // "1:30" -> 1 min 30 sec
    const [min, sec] = parts;
    return (min * 60 + sec) * 1000;
  }

  if (parts.length === 3) {
    // "1:00:00" -> 1 hour
    const [h, min, sec] = parts;
    return (h * 3600 + min * 60 + sec) * 1000;
  }

  return null;
}

function formatMs(ms) {
  if (ms == null || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const sec = s % 60;
  const min = m % 60;
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Jump to a position in the current track')
    .addStringOption((o) =>
      o
        .setName('time')
        .setDescription('Time to seek to, e.g. 1:30, 90 (seconds), or 2:45:00')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { client, guildId, member } = interaction;
    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }
    const voiceChannelId = member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
    }

    const player = client.music.getPlayer(guildId);
    if (!player) {
      return interaction.reply({ content: "I'm not playing anything here.", ephemeral: true });
    }
    if (player.voiceChannelId !== voiceChannelId) {
      return interaction.reply({ content: "You need to be in my voice channel.", ephemeral: true });
    }

    const current = player.queue?.current;
    if (!current?.info) {
      return interaction.reply({ content: 'No track is playing.', ephemeral: true });
    }
    const durationMs = current.info.duration ?? 0;
    const isSeekable = current.info.isSeekable && !current.info.isStream;
    if (!isSeekable) {
      return interaction.reply({ content: "This track can't be seeked (stream or unseekable).", ephemeral: true });
    }

    const timeInput = interaction.options.getString('time');
    const positionMs = parseTimeToMs(timeInput);
    if (positionMs === null) {
      return interaction.reply({
        content: 'Invalid time. Use formats like `1:30`, `90` (seconds), or `2:45:00`.',
        ephemeral: true,
      });
    }

    const clampedMs = Math.max(0, Math.min(positionMs, durationMs));
    const sought = await client.music.seek(guildId, clampedMs);
    if (!sought) {
      return interaction.reply({ content: "Couldn't seek.", ephemeral: true });
    }

    const title = current.info.title ?? 'Unknown';
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Seek')
      .setDescription(`Sought to **${formatMs(clampedMs)}** in **${title}**.`)
      .addFields({
        name: 'Track length',
        value: formatMs(durationMs),
        inline: true,
      })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
