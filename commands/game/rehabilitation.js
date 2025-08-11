const { SlashCommandBuilder } = require('discord.js');
const { rehabilitatedUsers } = require('../../game/blackJackState');

module.exports = {
	cooldown: 3600,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('rehabilitation')
		.setDescription('bans you from gambling for an hour'),
	async execute(interaction) {
		rehabilitatedUsers.set(interaction.user.id, Date.now());
		await interaction.reply(`${interaction.user.id} you will now be rehabilitated for the next hour. addiction is not good...`);
	},
};