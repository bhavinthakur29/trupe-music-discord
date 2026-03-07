import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import * as guildSettings from '../data/guildSettings.js';

export default {
  data: new SlashCommandBuilder()
    .setName('24x7')
    .setDescription('Toggle 24/7 mode: keep the bot in voice even when idle or after restart')
    .addBooleanOption((o) =>
      o
        .setName('enable')
        .setDescription('Turn 24/7 on (true) or off (false); omit to toggle')
    ),

  async execute(interaction) {
    const { client, guildId, member } = interaction;

    if (!client.music) {
      return interaction.reply({ content: 'Music is not configured.', ephemeral: true });
    }

    const enableOption = interaction.options.getBoolean('enable');
    const saved = guildSettings.get(guildId);
    const current = Boolean(saved.stayConnected);
    const next = enableOption !== undefined ? enableOption : !current;

    guildSettings.set(guildId, { stayConnected: next });

    // If turning on and bot is currently in a VC in this guild, save that channel
    if (next) {
      const player = client.music.getPlayer(guildId);
      const voiceChannelId = player?.voiceChannelId ?? player?.voiceChannel?.id;
      if (voiceChannelId) {
        guildSettings.set(guildId, { voiceChannelId });
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('24/7 Mode')
      .setDescription(next ? '24/7 mode is **on**. I\'ll stay in voice till I am called from heavens :cloud:' : '24/7 mode is **off**.')
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
