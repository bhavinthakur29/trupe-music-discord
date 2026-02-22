/**
 * Register slash commands with Discord (without starting the bot).
 * Run: node scripts/register-commands.js
 * Uses GUILD_ID from .env: if set, commands are registered only to that guild (instant).
 * If GUILD_ID is empty, registers globally (can take up to 1 hour to appear).
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from '../src/config/index.js';
import { loadCommands } from '../src/handlers/commandLoader.js';

const token = config.token?.trim();
const clientId = config.clientId?.trim();

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in .env');
  process.exit(1);
}

const commandList = await loadCommands();
const body = [...commandList.values()].map((c) => c.data.toJSON());
const names = body.map((c) => c.name).sort().join(', ');

console.log('Loaded commands:', names);
if (body.length === 0) {
  console.error('No commands to register.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  if (config.guildIds?.length) {
    for (const guildId of config.guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log(`Registered ${body.length} commands in guild ${guildId}`);
    }
    console.log('\nIf /uptime still does not appear: the server where you type / must have ID listed in GUILD_ID.');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body });
    console.log(`Registered ${body.length} commands globally. Global commands may take up to 1 hour to appear.`);
  }
  console.log('Done. Try / in Discord (choose your bot if multiple bots are in the server).');
} catch (err) {
  console.error('Registration failed:', err.message);
  if (err.code === 50001) console.error('Ensure the bot has the applications.commands scope and is invited with it.');
  process.exit(1);
}
