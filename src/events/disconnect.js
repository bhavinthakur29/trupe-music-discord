export default {
  name: 'shardDisconnect',
  once: false,

  execute(client, closeEvent, shardId) {
    const reason = closeEvent?.reason || `Code ${closeEvent?.code ?? 'unknown'}`;
    console.warn(`[Client] Shard ${shardId ?? 0} disconnected. ${reason}`);
    // discord.js reconnects automatically when recoverable; do not call client.login() again.
  },
};
