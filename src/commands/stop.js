import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

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

    const stopped = client.music.stop(guildId);
    if (!stopped) {
      return interaction.reply({ content: "Couldn't stop.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Stopped')
      .setDescription('Playback stopped and left the voice channel.')
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
