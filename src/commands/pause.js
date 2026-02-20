import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause playback'),

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

    const ok = await client.music.pause(guildId);
    if (!ok) {
      return interaction.reply({ content: "Couldn't pause.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Paused')
      .setDescription('Playback has been paused. Use `/resume` to continue.')
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
