const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { activeGames } = require('../../game/blackJackState');
const { playBlackJackGame } = require('../../game/playBlackJackGame');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('all_in')
		.setDescription('Bet all of your money on a game of blackjack!'),
	async execute(interaction) {
		const interactionUserID = interaction.user.id;
		if (activeGames.has(interactionUserID)) {
			try {
				const existingGame = activeGames.get(interactionUserID).resource.message;
				await existingGame.reply({ content: `${interaction.user} you already have this game going bro` });
			}
			catch (error) {
				console.error('an error occured when reaching the existing game', error);
			}
			interaction.reply({ content: '...', flags: MessageFlags.Ephemeral });
			return;
		}

		activeBlackJackUsers.set(interactionUserID);
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			if (user) {
				// to fix bug if the data changes mid game or like if 2 players at the same time.
				// has the endAmount and the most updated blackjackstreak
				const gameEndData = await playBettingGame(user.balance, user, interaction);
				const mostRecentData = await fs.promises.readFile(userDataPath, 'utf8');
				const mostRecentUserData = JSON.parse(mostRecentData);

				const upToDateUser = mostRecentUserData.users.find((targetUser) => targetUser.userID === interactionUserID);
				upToDateUser.balance += gameEndData[0];
				upToDateUser.blackJackStreak = gameEndData[1];
				await fs.promises.writeFile(userDataPath, JSON.stringify(mostRecentUserData, null, 2));
			}
			else {
				await interaction.reply({ content: `${interaction.user}. You haven't collected a wage yet. Do **/labor** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error handling blackjack command', error);
			await interaction.reply({ content: 'Something went wrong with the blackjack game', flags: MessageFlags.Ephemeral });
		}
		finally {
			activeGames.delete(interactionUserID);
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
			return [endAmount, ++user.blackJackStreak];
		}
		else if (endAmount === 0) {
			return [endAmount, user.blackJackStreak];
		}
		else {
			return [endAmount, 0];
		}
	}
};