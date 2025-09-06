const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { updateLastRehabDate, getUser } = require('../../database/db.js');

module.exports = {
	cooldown: 3600,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('rehabilitation')
		.setDescription('Bans you from gambling until the next day!'),
	async execute(interaction) {
		// YYYY-MM-DD
		const user = await getUser(interaction.user.id);
		if (user) {
			const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
			if (user.lastrehabdate === today) {
				await interaction.reply({ content: 'you\'ve already rehabilitated yourself. please wait for the next day', flags: MessageFlags.Ephemeral });
				return;
			}
			await updateLastRehabDate(interaction.user.id, today);
			await interaction.reply(`${interaction.user} you will now be rehabilitated until the next day. addiction is not good...`);
		}
		else {
			await interaction.reply('you haven\'t even gambled once yet, and you\'re trying to rehabilitate yourself?');
		}
	},
};