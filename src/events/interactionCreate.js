import { buildPlayerEmbed, buildPlayerComponents } from '../utils/playerEmbed.js';

async function handleMusicButton(client, interaction) {
  const { customId, guildId, member } = interaction;
  if (!guildId || !customId?.startsWith('music:')) return false;
  const action = customId.slice(6);

  await interaction.deferUpdate();

  const voiceChannelId = member?.voice?.channelId;
  const player = client.music?.getPlayer(guildId);
  const needsVc = !['queue', 'refresh'].includes(action);
  if (needsVc && (!voiceChannelId || !player || player.voiceChannelId !== voiceChannelId)) {
    return interaction.followUp({ content: 'Join my voice channel to use the player.', ephemeral: true }).catch(() => {});
  }

  try {
    switch (action) {
      case 'pause':
        if (player.paused) await client.music.resume(guildId);
        else await client.music.pause(guildId);
        break;
      case 'skip':
        await client.music.skip(guildId);
        break;
      case 'previous':
        await client.music.previous(guildId);
        break;
      case 'stop':
        client.music.stop(guildId);
        break;
      case 'loop': {
        const modes = ['off', 'track', 'queue'];
        const current = client.music.loop(guildId);
        const idx = modes.indexOf(current ?? 'off');
        client.music.loop(guildId, modes[(idx + 1) % 3]);
        break;
      }
      case 'volDown': {
        const v = await client.music.volume(guildId);
        if (v != null) await client.music.volume(guildId, Math.max(0, v - 10));
        break;
      }
      case 'volUp': {
        const v = await client.music.volume(guildId);
        if (v != null) await client.music.volume(guildId, Math.min(100, v + 10));
        break;
      }
      case 'filterReset':
        if (player?.filterManager) {
          player.filterManager.equalizerBands = [];
          await player.filterManager.resetFilters();
        }
        break;
      case 'queue':
      case 'refresh':
        break;
      default:
        // Unknown action: still update so the deferred interaction completes (avoids "Interaction failed")
        break;
    }
  } catch (err) {
    console.error('[Player button]', err);
    return interaction.followUp({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
  }

  const title = interaction.message?.embeds?.[0]?.title ?? '';
  const currentView = title.includes('Queue') ? 'queue' : 'nowplaying';
  const nextView = action === 'queue' ? 'queue' : action === 'refresh' ? 'nowplaying' : currentView;
  const embed = buildPlayerEmbed(client, guildId, nextView);
  const componentOpts = action === 'pause' && player ? { pausedOverride: player.paused } : {};
  const components = buildPlayerComponents(client, guildId, nextView, componentOpts);
  return interaction.update({ embeds: [embed], components }).catch(() => {});
}

export default {
  name: 'interactionCreate',
  once: false,

  async execute(client, interaction) {
    if (interaction.isButton() && interaction.customId?.startsWith('music:')) {
      try {
        await handleMusicButton(client, interaction);
      } catch (err) {
        console.error('[Music button]', err);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Error executing ${interaction.commandName}:`, err);
      const reply = { content: 'There was an error running this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  },
};
