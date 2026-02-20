# Discord Music Bot

Modular Discord.js v14 bot with slash commands, event handling, and structure ready for Lavalink.

## Setup

1. Copy `.env.example` to `.env` and fill in your bot token and app id:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the bot:
   ```bash
   npm start
   ```
   Or with auto-restart on file changes:
   ```bash
   npm run dev
   ```

## Structure

- **`src/commands/`** – Slash command modules (export `data` + `execute`). Subfolders are supported.
- **`src/events/`** – Event modules (export `name`, optional `once`, and `execute(client, ...args)`).
- **`src/handlers/`** – Command and event loaders.
- **`src/config/`** – Config from env; includes a Lavalink placeholder for later.

## Adding commands

Create a file in `src/commands/` (e.g. `src/commands/play.js`) that exports:

```js
import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('play').setDescription('Play a track'),
  async execute(interaction) {
    await interaction.reply('Not implemented yet.');
  },
};
```

Restart the bot to register new slash commands (use `GUILD_ID` in `.env` for instant guild-only updates).

## Lavalink

The bot expects a Lavalink server at **localhost:2333** with password **youshallnotpass** (override with `.env`: `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD`).

### How to start Lavalink

**Option 1: JAR (simple)**

1. Install **Java 17+** ([Azul Zulu](https://www.azul.com/downloads/?package=jdk#zulu) or OpenJDK).
2. Download [Lavalink.jar](https://github.com/lavalink-devs/Lavalink/releases/latest) and put it in a folder.
3. In that folder, create `application.yml` with at least:

   ```yaml
   server:
     port: 2333
     address: 0.0.0.0
   lavalink:
     server:
       password: "youshallnotpass"
   ```

4. Run:

   ```bash
   java -jar Lavalink.jar
   ```

   Keep the terminal open. When you see the server listening on 2333, the bot can connect.

**Option 2: Docker**

1. Create a folder with `compose.yml`:

   ```yaml
   services:
     lavalink:
       image: ghcr.io/lavalink-devs/lavalink:4-alpine
       container_name: lavalink
       restart: unless-stopped
       environment:
         - LAVALINK_SERVER_PASSWORD=youshallnotpass
       ports:
         - "2333:2333"
   ```

2. Run:

   ```bash
   docker compose up -d
   ```

**YouTube / search**

Default Lavalink has YouTube disabled. For `/play` search and YouTube URLs, add the [YouTube source plugin](https://github.com/lavalink-devs/youtube-source) or use another source (e.g. YouTube Music) in your Lavalink config and in the bot’s search source.
