import { SlashCommandBuilder } from 'discord.js';
import { buildPlayerEmbed, buildPlayerComponents } from '../utils/playerEmbed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Open the interactive music player with buttons'),

  async execute(interaction) {
    const { client, guildId, member } = interaction;
    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }
    const voiceChannelId = member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({ content: 'Join a voice channel first.', ephemeral: true });
    }

    const embed = buildPlayerEmbed(client, guildId, 'nowplaying');
    const components = buildPlayerComponents(client, guildId, 'nowplaying');
    return interaction.reply({ embeds: [embed], components });
  },
};
