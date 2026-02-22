import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config, lavalinkConfig } from './config/index.js';
import { loadCommands } from './handlers/commandLoader.js';
import { loadEvents, registerEvents } from './handlers/eventLoader.js';
import { MusicManager } from './music/MusicManager.js';

const token = config.token?.trim();

function validateToken() {
  if (!token || token.length < 50) {
    throw new Error('Invalid or missing DISCORD_TOKEN in .env (expected a long token string).');
  }
}

async function registerSlashCommands(client) {
  const rest = new REST({ version: '10' }).setToken(token);
  const body = [...client.commands.values()].map((c) => c.data.toJSON());
  if (body.length === 0) return;

  const names = body.map((c) => c.name).sort().join(', ');
  if (config.guildIds?.length) {
    console.log(`[Commands] Registering to ${config.guildIds.length} guild(s): ${config.guildIds.join(', ')}`);
    for (const guildId of config.guildIds) {
      try {
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
        console.log(`[Commands] Registered ${body.length} slash command(s) in guild ${guildId}: ${names}`);
      } catch (err) {
        console.error(`[Commands] Guild ${guildId}: ${err.message}`);
        if (err.code === 50001) console.error('[Commands] Re-invite the bot with scope applications.commands, or remove this guild from GUILD_ID.');
      }
    }
  } else {
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log(`[Commands] Registered ${body.length} global slash command(s): ${names}`);
    } catch (err) {
      console.error('[Commands] Slash command registration failed:', err.message);
      if (err.code === 50001) console.error('[Commands] Ensure the bot has the applications.commands scope and is invited with it.');
      throw err;
    }
  }
}

function setupProcessHandlers() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled rejection at:', promise, 'reason:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught exception:', err);
    process.exit(1);
  });
}

async function main() {
  validateToken();
  setupProcessHandlers();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = new Collection();
  const commandList = await loadCommands();
  const loadedNames = [];
  for (const [name, cmd] of commandList) {
    client.commands.set(name, cmd);
    loadedNames.push(name);
  }
  console.log('[Commands] Loaded:', loadedNames.sort().join(', '));

  const events = await loadEvents();
  registerEvents(client, events);

  if (lavalinkConfig.enabled && lavalinkConfig.nodes?.length) {
    client.music = new MusicManager(client, {
      nodes: lavalinkConfig.nodes,
      clientId: config.clientId,
      idleDestroyMs: lavalinkConfig.idleDestroyMs,
    });
  }

  client.once('clientReady', async (c) => {
    try {
      await registerSlashCommands(c);
    } catch (err) {
      console.error('[Ready] Command registration error (bot is online, commands may be stale):', err.message);
    }
    if (client.music) {
      client.music.init(c.user);
      console.log(`[Lavalink] Mode: ${lavalinkConfig.mode} · Node: ${lavalinkConfig.primaryNode}`);
    }
  });

  try {
    await client.login(token);
  } catch (err) {
    console.error('[Login] Failed to connect:', err.message);
    if (err.code === 'TokenInvalid') console.error('[Login] Check that DISCORD_TOKEN in .env is correct.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});
