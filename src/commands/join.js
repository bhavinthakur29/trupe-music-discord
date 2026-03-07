import { SlashCommandBuilder, EmbedBuilder, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Make the bot join your voice channel (or a channel you choose)')
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Voice channel to join (omit to join your current channel)')
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
    ),

  async execute(interaction) {
    const { client, guildId, member } = interaction;

    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }

    const channelOption = interaction.options.getChannel('channel');
    const authorChannelId = member?.voice?.channelId;
    const voiceChannel = channelOption ?? (authorChannelId ? member.voice.channel : null);

    if (!voiceChannel) {
      return interaction.reply({
        content: 'Join a voice channel first, or specify a voice channel for me to join.',
        ephemeral: true,
      });
    }

    if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
      return interaction.reply({ content: 'That channel is not a voice channel.', ephemeral: true });
    }

    if (!voiceChannel.joinable || !voiceChannel.speakable) {
      return interaction.reply({
        content: "I can't join or speak in that channel.",
        ephemeral: true,
      });
    }

    await interaction.deferReply();
    try {
      await client.music.joinOnly(guildId, voiceChannel.id, interaction.channelId);
    } catch (err) {
      if (err?.code === 'NO_LAVALINK_NODE') {
        return interaction.editReply({ content: 'The music server is still connecting. Please try again in a moment.' }).catch(() => {});
      }
      console.error('[Join]', err);
      return interaction.editReply({ content: "Couldn't join the voice channel." }).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Joined')
      .setDescription(`Joined **${voiceChannel.name}**.`)
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  },
};
