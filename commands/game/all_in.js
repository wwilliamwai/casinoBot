const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { playBlackJackGame } = require('../../playBlackJackGame');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('all_in')
		.setDescription('Bet all of your money on a game of blackjack!'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const user = userData.users.find((targetUser) => targetUser.userID === interaction.user.id);

			if (user) {
				await playBettingGame(user.balance, user, interaction);
				await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
			}
			else {
				await interaction.reply({ content: `${interaction.user}. You haven't collected a wage yet. Do **/wage** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error handling blackjack command', error);
			await interaction.reply({ content: 'Something went wrong with the blackjack game', flags: MessageFlags.Ephemeral });
		}
	},
};

// helper functions

const playBettingGame = async (betAmount, user, interaction) => {
	if (user.balance < betAmount) {
		await interaction.reply({ content: 'You don\'t have enough money.', flags: MessageFlags.Ephemeral });
	}
	else if (betAmount < 0) {
		await interaction.reply({ content: 'Not a valid amount to bet.', flags: MessageFlags.Ephemeral });
	}
	else {
		const endAmount = await playBlackJackGame({ betAmount, betWinStreak: user.blackJackStreak, interaction });
		if (endAmount > 0) {
			user.blackJackStreak++;
		}
		else if (endAmount < 0) {
			user.blackJackStreak = 0;
		}
		user.balance += endAmount;
	}
};