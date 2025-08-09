const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { activeGames } = require('../../game/blackJackState');
const { playBlackJackGame } = require('../../game/playBlackJackGame');
const { getUser, updateAfterBlackJack } = require('../../database/db.js');

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

		activeGames.set(interactionUserID, null);
		try {
			const user = await getUser(interactionUserID);

			if (user) {
				// to fix bug if the data changes mid game or like if 2 players at the same time.
				// has the endAmount and the most updated blackjackstreak
				const gameEndData = await playBettingGame(user.balance, user, interaction);

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
