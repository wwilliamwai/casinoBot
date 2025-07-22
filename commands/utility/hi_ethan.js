const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('hi_ethan')
		.setDescription('says hi to ethan!'),
	async execute(interaction) {
		await interaction.reply(`${interaction.user} says hi to <@716809967734226974>`);
	},
};