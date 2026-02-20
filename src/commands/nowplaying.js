import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

function formatDuration(ms) {
  if (ms == null || ms < 0) return '?';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing track'),

  async execute(interaction) {
    const { client, guildId } = interaction;
    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }

    const np = client.music.getNowPlaying(guildId);
    if (!np || !np.track) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Now playing')
        .setDescription('Nothing is playing right now.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const { track, position = 0, duration, paused, requester } = np;
    const info = track.info ?? {};
    const title = info.title ?? 'Unknown';
    const author = info.author ?? null;
    const durMs = duration ?? 0;
    const posMs = Math.min(position ?? 0, durMs);
    const progress = durMs > 0 ? Math.min(1, posMs / durMs) : 0;
    const barLen = 12;
    const filled = Math.round(barLen * progress);
    const bar = '▬'.repeat(filled) + '🔘' + '▬'.repeat(barLen - filled);
    const requestedBy = requester?.username ? `@${requester.username}` : requester?.tag ?? 'Unknown';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Now playing')
      .setDescription(`**${title}**${author ? `\n*${author}*` : ''}`)
      .addFields(
        { name: 'Requested by', value: requestedBy, inline: true },
        { name: 'Duration', value: `${formatDuration(posMs)} / ${formatDuration(durMs)}`, inline: true },
        {
          name: 'Progress',
          value: `${bar}\n\`${formatDuration(posMs)}\` / \`${formatDuration(durMs)}\``,
          inline: false,
        }
      )
      .setTimestamp();
    if (info.uri) embed.setURL(info.uri);
    if (paused) embed.setFooter({ text: 'Paused' });

    return interaction.reply({ embeds: [embed] });
  },
};
