import 'dotenv/config';

const guildIdRaw = process.env.GUILD_ID ?? '';
const guildIds = guildIdRaw.split(',').map((id) => id.trim()).filter(Boolean);

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  /** @deprecated Use guildIds for multiple guilds */
  guildId: guildIds[0] || null,
  /** Guild IDs for instant slash command registration (comma-separated in .env GUILD_ID) */
  guildIds: guildIds.length ? guildIds : null,
};

/** Lavalink: use LAVALINK_MODE=local for localhost, otherwise server/public node (LAVALINK_HOST etc.) */
const lavalinkMode = (process.env.LAVALINK_MODE ?? (process.env.NODE_ENV === 'development' ? 'local' : 'server')).toLowerCase();
const isLocalLavalink = lavalinkMode === 'local';

/** Retry config for server mode: delay (ms) between attempts, max attempts (avoids rate limit, then retries) */
const lavalinkRetryDelayMs = Math.max(5000, parseInt(process.env.LAVALINK_RETRY_DELAY_MS || '60000', 10) || 60000);
const lavalinkRetryAmount = Math.max(10, Math.min(1000, parseInt(process.env.LAVALINK_RETRY_AMOUNT || '100', 10) || 100));

const primaryNode = isLocalLavalink
  ? {
      id: 'main',
      host: process.env.LAVALINK_LOCAL_HOST || 'localhost',
      port: parseInt(process.env.LAVALINK_LOCAL_PORT || '2333', 10) || 2333,
      authorization: process.env.LAVALINK_LOCAL_PASSWORD || process.env.LAVALINK_LOCAL_AUTHORIZATION || 'youshallnotpass',
      secure: process.env.LAVALINK_LOCAL_SECURE === 'true',
    }
  : {
      id: 'main',
      host: process.env.LAVALINK_HOST || 'lavalink.rive.wtf',
      port: parseInt(process.env.LAVALINK_PORT || '443', 10) || 443,
      authorization: process.env.LAVALINK_PASSWORD || process.env.LAVALINK_AUTHORIZATION || 'youshallnotpass',
      secure: process.env.LAVALINK_SECURE !== 'false',
      retryDelay: lavalinkRetryDelayMs,
      retryAmount: lavalinkRetryAmount,
    };

const useFallback = !isLocalLavalink && process.env.LAVALINK_USE_FALLBACK !== 'false';
const lavalinkNodes = [
  primaryNode,
  ...(useFallback
    ? [
        {
          id: 'fallback',
          host: 'lavalink.jirayu.net',
          port: 443,
          authorization: 'youshallnotpass',
          secure: true,
          retryDelay: lavalinkRetryDelayMs,
          retryAmount: lavalinkRetryAmount,
        },
      ]
    : []),
];

export const lavalinkConfig = {
  enabled: true,
  nodes: lavalinkNodes,
  idleDestroyMs: Math.max(1000, parseInt(process.env.LAVALINK_IDLE_DESTROY_MS || '60000', 10) || 60000),
  /** 'local' | 'server' – which env set is used */
  mode: isLocalLavalink ? 'local' : 'server',
  primaryNode: `${primaryNode.host}:${primaryNode.port}`,
};
