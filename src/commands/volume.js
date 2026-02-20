import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Get or set playback volume (0–100)')
    .addIntegerOption((o) =>
      o
        .setName('level')
        .setDescription('Volume level 0–100 (omit to show current)')
        .setMinValue(0)
        .setMaxValue(100)
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

    const level = interaction.options.getInteger('level');
    const isSet = typeof level === 'number';
    if (isSet) await interaction.deferReply();
    const result = await client.music.volume(guildId, level);
    if (result == null) {
      return isSet
        ? interaction.editReply({ content: "Couldn't set volume." }).catch(() => {})
        : interaction.reply({ content: "Couldn't get volume.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Volume')
      .setTimestamp();

    if (isSet) {
      embed.setDescription(`Volume set to **${result}%**.`);
    } else {
      embed.setDescription(`Current volume: **${result}%**. Use \`/volume <0-100>\` to change.`);
    }

    return isSet ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed] });
  },
};
