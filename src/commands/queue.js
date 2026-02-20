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
    .setName('queue')
    .setDescription('Show the current queue'),

  async execute(interaction) {
    const { client, guildId } = interaction;
    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }

    const queue = client.music.getQueue(guildId);
    if (!queue) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Queue')
        .setDescription('No queue in this server. Use `/play` to add tracks.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const { current, tracks, length } = queue;
    if (!current && length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Queue')
        .setDescription('The queue is empty.')
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Queue')
      .setTimestamp();

    if (current?.info) {
      const dur = formatDuration(current.info.duration);
      embed.addFields({
        name: 'Now playing',
        value: `**${current.info.title ?? 'Unknown'}**\n\`${dur}\`${current.info.uri ? ` • [Link](${current.info.uri})` : ''}`,
        inline: false,
      });
    }

    const show = tracks.slice(0, 10);
    if (show.length > 0) {
      const list = show
        .map((t, i) => {
          const title = t?.info?.title ?? 'Unknown';
          const d = formatDuration(t?.info?.duration);
          return `**${i + 1}.** ${title} \`${d}\``;
        })
        .join('\n');
      embed.addFields({
        name: `Up next (${length} track${length !== 1 ? 's' : ''})`,
        value: list.length > 1024 ? list.slice(0, 1021) + '…' : list,
        inline: false,
      });
      if (length > 10) {
        embed.setFooter({ text: `and ${length - 10} more` });
      }
    }

    return interaction.reply({ embeds: [embed] });
  },
};
