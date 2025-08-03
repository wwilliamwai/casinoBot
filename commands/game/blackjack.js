const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { activeBlackJackUsers } = require('../../game/blackJackState');
const { playBlackJackGame } = require('../../game/playBlackJackGame');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack')
		.addNumberOption(option =>
			option.setName('bet')
				.setDescription('The betting amount.'),
		),
	async execute(interaction) {
		const interactionUserID = interaction.user.id;
		if (activeBlackJackUsers.has(interactionUserID)) {
			return interaction.reply({ content: 'you already have a game going bro', flags: MessageFlags.Ephemeral });
		}
		activeBlackJackUsers.add(interactionUserID);

		const betAmount = interaction.options.getNumber('bet');

		// if they didn't bet, then play a normal blackjack game
		if (!betAmount || betAmount === 0) {
			await playBlackJackGame({ betAmount, interaction });
			return;
		}
		// if they did bet, then play a blackjack game with money on the line
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const user = userData.users.find((targetUser) => targetUser.userID === interactionUserID);

			// if the user's data does exist
			if (user) {
				const gameEndData = await playBettingGame(betAmount, user, interaction);

				// after game completes, check json file again in case for any changes during game
				const mostRecentData = await fs.promises.readFile(userDataPath, 'utf8');
				const mostRecentUserData = JSON.parse(mostRecentData);

				const updatedUser = mostRecentUserData.users.find((targetUser) => targetUser.userID === interaction.user.id);
				// the final amount won or lost
				updatedUser.balance += gameEndData[0];
				// the correct update to blackJackStreak
				updatedUser.blackJackStreak = gameEndData[1];
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
			activeBlackJackUsers.delete(interactionUserID);
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
		const endAmount = await playBlackJackGame({ betAmount, userWinStreak: user.blackJackStreak, interaction });
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