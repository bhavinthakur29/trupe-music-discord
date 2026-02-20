export default {
  name: 'shardReconnecting',
  once: false,

  execute(client, shardId) {
    console.log(`[Client] Shard ${shardId ?? 0} reconnecting…`);
  },
};
