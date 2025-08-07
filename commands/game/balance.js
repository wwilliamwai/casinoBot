const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { getUser } = require('../../database/db.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Check your current balance'),
	async execute(interaction) {
		try {
			const user = await getUser(interaction.user.id);

			if (user) {
				interaction.reply(`${interaction.user} has $${user.balance} in their balance.`);
			}
			else {
				interaction.reply({ content: `${interaction.user}. You haven't collected any money yet. Do **/daily** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error handling balance command', error);
			await interaction.reply({ content: 'Something went wrong while processing your balance', flags: MessageFlags.Ephemeral });
		}
	},
};