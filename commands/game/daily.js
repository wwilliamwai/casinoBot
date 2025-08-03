const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('daily')
		.setDescription('Get your daily earnings.'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const interactionUserID = interaction.user.id;
			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			// 'YYYY-MM-DD'
			const today = new Date().toLocaleDateString('en-CA');;

			if (user) {
				if (user.lastWageDate === today) {
					await interaction.reply({ content: 'you\'ve already collected your wage today. do it after 12 am now.', flags: MessageFlags.Ephemeral });
				}
				else {
					user.balance += 1000;
					user.lastWageDate = today;

					await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
					await interaction.reply(`${interaction.user} has earned their **$1000 wage.** next job bro.`);
				}
			}
			else {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				userData.users.push({
					userID: interactionUserID,
					name: name,
					balance: 1000,
					blackJackStreak: 0,
					lastWageDate: today,
				});
				await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
				await interaction.reply(`${interaction.user} has earned their **$1000 wage.** next job bro.`);
			}
		}
		catch (error) {
			console.error('Error handling wage command', error);
			await interaction.reply({ content: 'Something went wrong while processing your wage', flags: MessageFlags.Ephemeral });
		}
	},
};