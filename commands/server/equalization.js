const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	category: 'server',
	cooldown: 600,
	data: new SlashCommandBuilder()
		.setName('equalize')
		.setDescription('Alert the host your request to equalize a member.')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('Your target for equalization')
				.setRequired(true),
		)
		.addStringOption(option =>
			option.setName('reason')
				.setDescription('The reason for equalization')
				.setRequired(true),
		),
	async execute(interaction) {
		const target = interaction.options.getUser('target');
		const reason = interaction.options.getString('reason');

		await interaction.reply(`${interaction.user} wants to equalize ${target}!\nReason: **${reason}**\n\nPlease wait for the hosts to review your request.\n<@716809967734226974> <@695546550126116865>`);
	},
};