import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads all event modules from src/events.
 * Expects each file to export: name (string), once? (boolean), execute(client, ...args).
 */
export async function loadEvents(eventsPath = join(__dirname, '..', 'events')) {
  const events = [];
  const files = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const fullPath = join(eventsPath, file);
    try {
      const module = await import(`file://${fullPath.replace(/\\/g, '/')}`);
      const event = module.default ?? module;
      if (event?.name && typeof event.execute === 'function') {
        events.push(event);
      }
    } catch (err) {
      console.error(`[EventLoader] Failed to load ${file}:`, err.message);
    }
  }

  return events;
}

export function registerEvents(client, events) {
  for (const event of events) {
    const run = (...args) => event.execute(client, ...args);
    if (event.once) {
      client.once(event.name, run);
    } else {
      client.on(event.name, run);
    }
  }
}
