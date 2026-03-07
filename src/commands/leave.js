import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction) {
    const { client, guildId } = interaction;

    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }

    const left = client.music.leave(guildId);
    if (!left) {
      return interaction.reply({ content: "I'm not in a voice channel in this server.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Left')
      .setDescription('Disconnected from the voice channel.')
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
