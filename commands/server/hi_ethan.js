const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	category: 'server',
	data: new SlashCommandBuilder()
		.setName('hi_ethan')
		.setDescription('Says hi to ethan!'),
	async execute(interaction) {
		await interaction.reply(`${interaction.user} says hi to <@716809967734226974>!`);
	},
};