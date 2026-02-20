export default {
  name: 'error',
  once: false,

  execute(client, err) {
    console.error('[Client] Gateway/connection error:', err.message);
    // Don't throw – let discord.js handle reconnection.
  },
};
