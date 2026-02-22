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

  let pausedStateAfterToggle = undefined;
  try {
    switch (action) {
      case 'pause': {
        const wasPaused = player.paused;
        if (wasPaused) await client.music.resume(guildId);
        else await client.music.pause(guildId);
        pausedStateAfterToggle = !wasPaused;
        break;
      }
      case 'skip':
        await client.music.skip(guildId);
        // Brief delay so the player advances to the next track before we refresh the panel
        await new Promise((r) => setTimeout(r, 150));
        break;
      case 'previous':
        await client.music.previous(guildId);
        await new Promise((r) => setTimeout(r, 150));
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
      case 'queue': {
        // Show queue in an ephemeral reply (only visible to the user who clicked)
        const queueEmbed = buildPlayerEmbed(client, guildId, 'queue', {});
        await interaction.followUp({ embeds: [queueEmbed], ephemeral: true }).catch(() => {});
        // Keep panel on now-playing view (handled below by nextView)
        break;
      }
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
  // Queue = ephemeral only. Refresh/skip/previous = show now-playing so the panel shows the current song.
  const nextView =
    action === 'queue' ? 'nowplaying'
    : action === 'refresh' || action === 'skip' || action === 'previous' ? 'nowplaying'
    : currentView;

  const currentPlayer = client.music?.getPlayer(guildId);
  const pausedOverride =
    pausedStateAfterToggle !== undefined ? pausedStateAfterToggle : currentPlayer?.paused;
  const panelOpts = pausedOverride !== undefined ? { pausedOverride } : {};

  const embed = buildPlayerEmbed(client, guildId, nextView, panelOpts);
  const components = buildPlayerComponents(client, guildId, nextView, panelOpts);

  try {
    await interaction.update({ embeds: [embed], components });
  } catch (err) {
    console.warn('[Player button] interaction.update failed:', err?.message ?? err, '- editing message directly');
    await interaction.message?.edit({ embeds: [embed], components }).catch((e) => {
      console.error('[Player button] message.edit failed:', e?.message ?? e);
    });
  }
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
