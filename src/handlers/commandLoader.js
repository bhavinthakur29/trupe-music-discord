import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads all slash command modules from src/commands (and subfolders).
 * Expects each command file to export: data (SlashCommandBuilder), execute(interaction).
 */
export async function loadCommands(commandsPath = join(__dirname, '..', 'commands')) {
  const commands = new Map();
  const commandFiles = readdirSync(commandsPath, { withFileTypes: true });

  for (const dirent of commandFiles) {
    const fullPath = join(commandsPath, dirent.name);

    if (dirent.isDirectory()) {
      const subCommands = await loadCommands(fullPath);
      for (const [name, cmd] of subCommands) commands.set(name, cmd);
      continue;
    }

    if (!dirent.name.endsWith('.js')) continue;

    try {
      const module = await import(`file://${fullPath.replace(/\\/g, '/')}`);
      const command = module.default ?? module;
      if (command?.data?.name && typeof command.execute === 'function') {
        commands.set(command.data.name, command);
      }
    } catch (err) {
      console.error(`[CommandLoader] Failed to load ${dirent.name}:`, err.message);
    }
  }

  return commands;
}
