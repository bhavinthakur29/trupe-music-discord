import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with bot latency.'),

  async execute(interaction) {
    await interaction.reply({ content: 'Pinging…' });
    const sent = await interaction.fetchReply();
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;
    const wsText = wsPing >= 0 ? `${wsPing}ms` : 'N/A';

    let lavalinkText = '';
    const nodes = interaction.client.music?.manager?.nodeManager?.nodes;
    if (nodes?.size) {
      let best = -1;
      for (const node of nodes.values()) {
        if (node.connected && typeof node.heartBeatPing === 'number' && node.heartBeatPing >= 0) {
          if (best < 0 || node.heartBeatPing < best) best = node.heartBeatPing;
        }
      }
      if (best >= 0) lavalinkText = ` · Lavalink: **${Math.round(best)}ms**`;
    }

    await interaction.editReply(
      `Pong! Roundtrip: **${roundtrip}ms** · WebSocket: **${wsText}**${lavalinkText}`
    );
  },
};
