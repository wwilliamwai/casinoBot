const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	category: 'server',
	data: new SlashCommandBuilder()
		.setName('hi_joshua')
		.setDescription('Says hi to joshua!'),
	async execute(interaction) {
		await interaction.reply(`${interaction.user} says hi to <@695546550126116865>!`);
	},
};