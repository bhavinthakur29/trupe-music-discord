import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const OWNER_ID = process.env.BOT_OWNER_ID || '527489750815342625';

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Show how long the bot has been running (owner only).'),

  async execute(interaction) {
    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        ephemeral: true,
      });
    }

    const seconds = process.uptime();
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Uptime')
      .setDescription(`Bot has been up for **${formatUptime(seconds)}**.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
