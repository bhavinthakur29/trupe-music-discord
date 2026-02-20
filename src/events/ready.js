import { ActivityType } from 'discord.js';

export default {
  name: 'clientReady',
  once: true,

  execute(client) {
    const { user } = client;
    const guildCount = client.guilds.cache.size;

    console.log(`[Ready] Logged in as ${user.tag} (${user.id})`);
    console.log(`[Ready] In ${guildCount} Discord server(s).`);

    client.user.setPresence({
      activities: [{ name: 'music', type: ActivityType.Listening }],
      status: 'online',
    });
  },
};
