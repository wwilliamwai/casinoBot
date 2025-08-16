const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { rehabilitatedUsers } = require('../../game/blackJackState');

module.exports = {
	cooldown: 3600,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('rehabilitation')
		.setDescription('Bans you from gambling until the next day!'),
	async execute(interaction) {
		// YYYY-MM-DD
		const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
		if (rehabilitatedUsers.has(interaction.user.id)) {

			if (date === today) {
				await interaction.reply({ content: 'you\'ve already rehabilitated yourself. please wait for the next day', flags: MessageFlags.Ephemeral });
				return;
			}
		}
		rehabilitatedUsers.set(interaction.user.id, today);
		await interaction.reply(`${interaction.user} you will now be rehabilitated until the next day. addiction is not good...`);
	},
};