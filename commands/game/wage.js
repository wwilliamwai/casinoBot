const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	cooldown: 2,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('wage')
		.setDescription('Earn you wage for the day.'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const interactionUserID = interaction.user.id;
			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			if (user) {
				user.balance += 10;
			}
			else {
				userData.users.push({
					userID: interactionUserID,
					balance: 10,
					blackJackStreak: 0,
				});
			}

			await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
			await interaction.reply(`${interaction.user} has earned 10 more dollars!`);
		}
		catch (error) {
			console.error('Error handling wage command', error);
			await interaction.reply({ content: 'Something went wrong while processing your wage', flags: MessageFlags.Ephemeral });
		}
	},
};