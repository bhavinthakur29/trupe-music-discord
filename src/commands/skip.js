import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track'),

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

    const skipped = await client.music.skip(guildId);
    if (!skipped) {
      return interaction.reply({ content: "Couldn't skip.", ephemeral: true });
    }

    const updated = client.music.getPlayer(guildId);
    const nowPlaying = updated?.queue?.current?.info?.title;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Skipped')
      .setDescription('Skipped to the next track.')
      .setTimestamp();
    if (nowPlaying) {
      embed.addFields({ name: 'Now playing', value: nowPlaying, inline: false });
    }
    return interaction.reply({ embeds: [embed] });
  },
};
