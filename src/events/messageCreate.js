import { EmbedBuilder } from 'discord.js';

const HELP_DESCRIPTION = [
  "I'm a music bot. Use **slash commands** to control me:",
  '',
  '**Voice** · `/join` [channel] · `/leave` · `/24x7`',
  '**Playback** · `/play` · `/pause` · `/resume` · `/skip` · `/stop` · `/seek <time>`',
  '**Queue** · `/queue` · `/nowplaying`',
  '**Settings** · `/volume` · `/loop` · `/filter`',
  '',
  'Use **`/play`** with a song name or URL to start. The music panel with buttons will appear.',
  'Use **`/player`** to open the control panel anytime.',
  'Use **`/join`** to have me join your voice channel (or a channel you pick). **`/24x7`** keeps me in voice when idle and after restart.',
].join('\n');

export default {
  name: 'messageCreate',
  once: false,

  execute(client, message) {
    if (message.author.bot) return;
    if (!message.mentions.has(client.user)) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Help')
      .setDescription(HELP_DESCRIPTION)
      .setTimestamp();

    message.reply({ embeds: [embed] }).catch(() => {});
  },
};
