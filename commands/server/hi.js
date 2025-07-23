const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	category: 'server',
	data: new SlashCommandBuilder()
		.setName('hi')
		.setDescription('Says hi to anyone!')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('Select a user to say hi to!')
				.setRequired(true),
		),
	async execute(interaction) {
		user = interaction.options.getUser('user');
		await interaction.reply(`${interaction.user} says hi to ${user}!`);
	},
};