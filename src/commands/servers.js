import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const ALLOWED_USER_ID = '527489750815342625';

export default {
    data: new SlashCommandBuilder()
        .setName('servers')
        .setDescription('List Discord servers the bot is in (restricted).'),

    async execute(interaction) {
        if (interaction.user.id !== ALLOWED_USER_ID) {
            return interaction.reply({
                content: "You don't have permission to use this command.",
                ephemeral: true,
            });
        }

        const guilds = interaction.client.guilds.cache;
        const list = guilds
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((g, i) => `${i + 1}. ${g.name}`);

        const description = list.length
            ? list.join('\n').slice(0, 4090) + (list.join('\n').length > 4090 ? '\n…' : '')
            : 'Bot is in no servers.';

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle(`Servers (${guilds.size})`)
            .setDescription(description)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
