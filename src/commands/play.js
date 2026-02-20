import { SlashCommandBuilder } from 'discord.js';
import { buildPlayerEmbed, buildPlayerComponents } from '../utils/playerEmbed.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a track by URL or search query')
    .addStringOption((o) =>
      o
        .setName('query')
        .setDescription('URL (YouTube, etc.) or search terms')
        .setRequired(true)
    ),

  async execute(interaction) {
    const { client, guildId, channelId, member } = interaction;

    if (!client.music) {
      return interaction.reply({
        content: 'Music is not configured. Lavalink may be unavailable.',
        ephemeral: true,
      });
    }

    const voiceChannelId = member?.voice?.channelId;
    if (!voiceChannelId) {
      return interaction.reply({
        content: 'Join a voice channel first.',
        ephemeral: true,
      });
    }

    const voiceChannel = member.voice.channel;
    if (!voiceChannel.joinable || !voiceChannel.speakable) {
      return interaction.reply({
        content: "I can't join or speak in that channel.",
        ephemeral: true,
      });
    }

    const existingPlayer = client.music.getPlayer(guildId);
    if (existingPlayer && existingPlayer.voiceChannelId !== voiceChannelId) {
      return interaction.reply({
        content: "You need to be in my voice channel to request music.",
        ephemeral: true,
      });
    }

    const query = interaction.options.getString('query', true).trim();
    if (!query) {
      return interaction.reply({
        content: 'Please provide a URL or search query.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const result = await client.music.play(
        guildId,
        voiceChannelId,
        channelId,
        query,
        interaction.user
      );

      if (result.added === 0) {
        return interaction.editReply({
          content: 'No tracks found. Try a different URL or search.',
        });
      }

      const embed = buildPlayerEmbed(client, guildId, 'nowplaying');
      const components = buildPlayerComponents(client, guildId, 'nowplaying');
      if (result.playlist) {
        const existing = embed.data.footer?.text ?? '';
        embed.setFooter({ text: existing ? `${existing} · Added ${result.added} tracks` : `Added ${result.added} tracks from ${result.playlist}` });
      }
      return interaction.editReply({ embeds: [embed], components });
    } catch (err) {
      console.error('[Play] Error:', err);
      const isConnectionError =
        err.message?.includes('Lavalink') || err.message?.includes('connection');
      const message = isConnectionError
        ? "Couldn't reach the music server (reconnecting). Please try again in a moment."
        : 'Something went wrong while playing. Please try again.';
      return interaction.editReply({ content: message }).catch(() => {});
    }
  },
};
