import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode: off, current track, or entire queue')
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track (current song)', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
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

    const mode = interaction.options.getString('mode', true);
    const current = client.music.loop(guildId, mode);
    if (current == null) {
      return interaction.reply({ content: "Couldn't set loop.", ephemeral: true });
    }

    const labels = { off: 'Off', track: 'Track', queue: 'Queue' };
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Loop')
      .setDescription(`Loop set to **${labels[current]}**.`)
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
