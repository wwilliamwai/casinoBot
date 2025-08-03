/* const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	cooldown: 5,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('labor')
		.setDescription('Do manual labor for more money.'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const interactionUserID = interaction.user.id;
			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			if (user) {
				user.balance += 50;
			}
			else {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				// converting today's date into yesterday's date.
				const now = Date.now();
				now.setDate(now.getDate() - 1);
				// 'YYYY-MM-DD'
				const yesterday = now.toLocaleString('en-CA');
				userData.users.push({
					userID: interactionUserID,
					name: name,
					balance: 50,
					blackJackStreak: 0,
					lastWageDate: yesterday,
				});
			}
			await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
			await interaction.reply(`${interaction.user} worked to make $50 more dollars!`);
		}
		catch (error) {
			console.error('Error handling labor command', error);
			await interaction.reply({ content: 'Something went wrong while processing your labor', flags: MessageFlags.Ephemeral });
		}
	},
}; */