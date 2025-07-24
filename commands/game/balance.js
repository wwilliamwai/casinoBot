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
		fs.readFile(userDataPath, 'utf8', (err, data) => {
			if (err) {
				console.error('Error reading file:', err);
				return;
			}

			const userData = JSON.parse(data);

			const interactorIndex = userData.users.findIndex(targetUser => targetUser.userID === interaction.user.id);

			if (interactorIndex != -1) {
				interaction.reply(`${interaction.user} has $${userData.users[interactorIndex].balance} in their balance.`);
			}
			else {
				interaction.reply({ content: `${interaction.user}. You haven't collected a wage yet. Do /wage to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		});
	},
};