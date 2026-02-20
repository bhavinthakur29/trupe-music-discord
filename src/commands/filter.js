import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EQList } from 'lavalink-client';

const EQ_PRESETS = Object.keys(EQList);
const FILTER_CHOICES = [
  { name: 'Show enabled filters', value: 'status' },
  { name: 'Off (reset all)', value: 'off' },
  { name: 'Bass — Low', value: 'BassboostLow' },
  { name: 'Bass — Medium', value: 'BassboostMedium' },
  { name: 'Bass — High', value: 'BassboostHigh' },
  { name: 'Bass — Earrape', value: 'BassboostEarrape' },
  { name: 'Better music', value: 'BetterMusic' },
  { name: 'Rock', value: 'Rock' },
  { name: 'Classic', value: 'Classic' },
  { name: 'Pop', value: 'Pop' },
  { name: 'Electronic', value: 'Electronic' },
  { name: 'Full sound', value: 'FullSound' },
  { name: 'Gaming', value: 'Gaming' },
  { name: 'Nightcore', value: 'Nightcore' },
  { name: 'Vaporwave', value: 'Vaporwave' },
];

/** Match current equalizer bands to a preset name (if any). */
function getEQPresetName(equalizerBands) {
  if (!equalizerBands?.length) return null;
  const key = (arr) => JSON.stringify(arr.map((b) => ({ band: b.band, gain: b.gain })));
  const current = key(equalizerBands);
  for (const [name, bands] of Object.entries(EQList)) {
    if (key(bands) === current) return name;
  }
  return null;
}

/** Build list of currently enabled filters from player.filterManager. */
function getEnabledFilters(player) {
  const fm = player?.filterManager;
  if (!fm) return [];
  const list = [];
  if (fm.filters?.nightcore) list.push('Nightcore');
  if (fm.filters?.vaporwave) list.push('Vaporwave');
  if (fm.filters?.custom) list.push('Custom (speed/pitch/rate)');
  if (fm.equalizerBands?.length) {
    const preset = getEQPresetName(fm.equalizerBands);
    list.push(preset ? `Equalizer: ${preset}` : 'Equalizer');
  }
  if (fm.filters?.volume) list.push('Volume filter');
  if (fm.filters?.rotation) list.push('Rotation');
  if (fm.filters?.karaoke) list.push('Karaoke');
  if (fm.filters?.tremolo) list.push('Tremolo');
  if (fm.filters?.vibrato) list.push('Vibrato');
  if (fm.filters?.lowPass) list.push('Low pass');
  return list;
}

export default {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Apply an audio filter, or show currently enabled filters')
    .addStringOption((o) =>
      o
        .setName('preset')
        .setDescription('Filter preset or "Show enabled" to see active filters')
        .setRequired(true)
        .addChoices(...FILTER_CHOICES)
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

    const preset = interaction.options.getString('preset', true);

    if (preset === 'status') {
      const enabled = getEnabledFilters(player);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Enabled filters')
        .setDescription(
          enabled.length
            ? enabled.map((f) => `• **${f}**`).join('\n')
            : 'No filters are currently enabled.'
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    await interaction.deferReply();

    try {
      const fm = player.filterManager;
      if (preset === 'off') {
        fm.equalizerBands = [];
        await fm.resetFilters();
      } else if (preset === 'Nightcore') {
        await fm.toggleNightcore();
      } else if (preset === 'Vaporwave') {
        await fm.toggleVaporwave();
      } else if (EQ_PRESETS.includes(preset)) {
        await fm.setEQPreset(preset);
      } else {
        await interaction.editReply({ content: 'Unknown preset.' }).catch(() => {});
        return;
      }

      const label = FILTER_CHOICES.find((c) => c.value === preset)?.name ?? preset;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Filter')
        .setDescription(preset === 'off' ? 'All filters have been reset.' : `Applied filter: **${label}**.`)
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Filter]', err);
      return interaction.editReply({
        content: 'Failed to apply filter. The Lavalink node may not support this filter.',
      }).catch(() => {});
    }
  },
};
