const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('balance')
		.setDescription('Check your current balance.'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const interactionUserID = interaction.user.id;
			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			if (user) {
				interaction.reply(`${interaction.user} has $${user.balance} in their balance.`);
			}
			else {
				interaction.reply({ content: `${interaction.user}. You haven't collected a wage yet. Do **/wage** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error handling balance command', error);
			await interaction.reply({ content: 'Something went wrong while processing your balance', flags: MessageFlags.Ephemeral });
		}
	},
};