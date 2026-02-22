/**
 * Print the bot invite URL with applications.commands scope (required for slash commands).
 * Run: node scripts/invite-url.js
 * Use this URL to invite the bot to each server. Then add each server's ID to GUILD_ID in .env.
 */

import 'dotenv/config';

const clientId = process.env.CLIENT_ID?.trim();
if (!clientId) {
  console.error('CLIENT_ID not set in .env');
  process.exit(1);
}

// Permission integer for: connect, speak, use voice activity, manage messages, embed links, read message history, view channels
const permissions = '3147776';
const scope = 'bot%20applications.commands';
const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scope}`;

console.log('Invite URL (use in each server where you want slash commands):');
console.log(url);
console.log('');
console.log('After inviting:');
console.log('1. Get each server ID: Developer Mode ON → right‑click server icon → Copy Server ID');
console.log('2. In .env on the server, set GUILD_ID to all three IDs, comma‑separated, no spaces:');
console.log('   GUILD_ID=id1,id2,id3');
console.log('3. Restart the bot: sudo systemctl restart trupe');
console.log('4. In Discord, type / and choose "Trupe" (your bot) in the command list.');
process.exit(0);
