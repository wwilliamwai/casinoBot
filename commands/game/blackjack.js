const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { activeGames, rehabilitatedUsers } = require('../../game/blackJackState');
const { playBlackJackGame } = require('../../game/playBlackJackGame');
const { getUser, updateAfterBlackJack } = require('../../database/db.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack')
		.addNumberOption(option =>
			option.setName('bet')
				.setDescription('The betting amount'),
		),
	async execute(interaction) {
		const interactionUserID = interaction.user.id;

		if (rehabilitatedUsers.has(interactionUserID)) {
			if (Date.now() - 3600000 >= rehabilitatedUsers.get(interactionUserID)) {
				rehabilitatedUsers.delete(interactionUserID);
			}
			else {
				await interaction.reply('you cannot play right now. you are in the rehabilitation process');
				return;
			}
		}

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
		activeGames.set(interactionUserID, null);

		const betAmount = interaction.options.getNumber('bet');

		// if they didn't bet, then play a normal blackjack game
		if (!betAmount || betAmount === 0) {
			await playBlackJackGame({ betAmount: 0, interaction });
			return;
		}
		// if they did bet, then play a blackjack game with money on the line
		try {
			const user = await getUser(interactionUserID);

			// if the user's data does exist
			if (user) {
				const gameEndData = await playBettingGame(betAmount, user, interaction);

				await updateAfterBlackJack(interactionUserID, gameEndData[0], gameEndData[1]);
			}
			else {
				await interaction.reply({ content: `${interaction.user}. You haven't collected any money yet. Do **/daily** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
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