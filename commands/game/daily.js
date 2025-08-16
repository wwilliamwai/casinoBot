const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, updateBalance, updateLastWageDate, createUser } = require('../../database/db.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('daily')
		.setDescription('Get your daily earnings'),
	async execute(interaction) {
		try {
			const interactionUserID = interaction.user.id;
			const user = await getUser(interactionUserID);

			// 'YYYY-MM-DD'
			const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

			let dailyWage = 1000;
			if (user) {
				if (user.lastwagedate === today) {
					await interaction.reply({ content: 'you\'ve already collected your daily today. do it after 12 am now.', flags: MessageFlags.Ephemeral });
				}
				else {
					dailyWage = getDailyAmount(user.balance, user);
					await updateBalance(interactionUserID, dailyWage);
					await updateLastWageDate(interactionUserID, today);
					await interaction.reply(`${interaction.user} has earned their **$${dailyWage} daily.** nice job bro.`);
				}
			}
			else {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				await createUser(interactionUserID, name, dailyWage);
				await interaction.reply(`${interaction.user} has earned their **$1000 daily.** nice job bro.`);
			}
		}
		catch (error) {
			console.error('Error handling daily command', error);
			await interaction.reply({ content: 'Something went wrong while processing your daily', flags: MessageFlags.Ephemeral });
		}
	},
};

function getDailyAmount(num) {
	if (num < 10000) {
		return 1000;
	}
	const digits = Math.floor(Math.log10(num)) + 1;
	return Math.pow(10, digits - 1);
}