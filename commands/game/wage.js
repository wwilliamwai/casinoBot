const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('wage')
		.setDescription('Earn you wage for the day.'),
	async execute(interaction) {
		fs.readFile(userDataPath, 'utf8', (err, data) => {
			if (err) {
				console.error('Error reading file:', err);
				return;
			}

			const userData = JSON.parse(data);

			const interactorIndex = userData.users.findIndex(targetUser => targetUser.userID === interaction.user.id);

			if (interactorIndex != -1) {
				userData.users[interactorIndex].balance += 10;
			}
			else {
				userData.users.push({
					userID: interaction.user.id,
					balance: 10,
					blackJackStreak: 0,
				});
			}

			const updatedUserData = JSON.stringify(userData, null, 2);

			fs.writeFile(userDataPath, updatedUserData, 'utf8', (err) => {
				if (err) {
					console.error('Error writing file:', err);
					return;
				}
			});

			interaction.reply(`${interaction.user} has earned 10 more dollars!`);
		});
	},
};