const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

const { mining } = require('../../game/playMiningGame');

module.exports = {
	cooldown: 3,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('mining')
		.setDescription('work to make 100 dollars through hard mining'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const interactionUserID = interaction.user.id;
			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			if (user) {
				const didMine = await mining(interaction);
				if (didMine) {
					user.balance += 100;
					await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
				}
			}
			else {
				const didMine = await mining(interaction);
				if (didMine) {
					const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
					// converting today's date into yesterday's date.
					const now = Date.now();
					now.setDate(now.getDate() - 1);
					// 'YYYY-MM-DD'
					const yesterday = now.toLocaleString('en-CA');
					userData.users.push({
						userID: interactionUserID,
						name: name,
						balance: 100,
						blackJackStreak: 0,
						lastWageDate: yesterday,
					});
					await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
				}
			}
		}
		catch (error) {
			console.error('Error handling labor command', error);
			await interaction.reply({ content: 'Something went wrong while processing your labor', flags: MessageFlags.Ephemeral });
		}
	},
};