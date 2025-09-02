const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { activeGames, rehabilitatedUsers } = require('../../game/gamblingUserState');
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

		if (await checkForActiveGames(interactionUserID, interaction)) return;

		const betAmount = interaction.options.getNumber('bet');

		// if they didn't bet, then play a normal blackjack game
		if (!betAmount || betAmount === 0) {
			activeGames.set(interactionUserID, null);
			await playBlackJackGame({ betAmount: 0, interaction });
			activeGames.delete(interactionUserID);
			return;
		}
		// if they did bet, then play a blackjack game with money on the line
		try {
			if (await checkIfRehabilitated(interactionUserID, interaction)) return;

			const user = await getUser(interactionUserID);

			// if the user's data does exist
			if (user) {
				if (user.balance < betAmount) {
					await interaction.reply({ content: 'you don\'t have enough money.', flags: MessageFlags.Ephemeral });
					return;
				}
				else if (betAmount < 0) {
					await interaction.reply({ content: 'not a valid amount to bet.', flags: MessageFlags.Ephemeral });
					return;
				}
				activeGames.set(interactionUserID, null);

				const gameEndData = await playBettingGame(betAmount, user, interaction);
				const existingGame = activeGames.get(interactionUserID);
				if (!existingGame) {
					interaction.channel.send(`${interaction.user} you now have $${Number(user.balance) + Number(gameEndData[0])} in your balance.`);
				} 
				else {
					await existingGame.resource.message.reply({ content: `${interaction.user} you now have $${Number(user.balance) + Number(gameEndData[0])} in your balance.` });
				}
				await updateAfterBlackJack(interactionUserID, gameEndData[0], gameEndData[1]);
			}
			else {
				await interaction.reply({ content: `${interaction.user}. you haven't collected any money yet. do **/daily** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
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
	const gameEndData = await playBlackJackGame({ betAmount, userBalance: user.balance, winStreak: user.blackjackstreak, hasDoubleDown: true, interaction });
	return [...gameEndData];
};

const checkIfRehabilitated = async (interactionUserID, interaction) => {
	if (rehabilitatedUsers.has(interactionUserID)) {
		// YYYY-MM-DD
		const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
		if (today > rehabilitatedUsers.get(interactionUserID)) {
			rehabilitatedUsers.delete(interactionUserID);
			return false;
		}
		await interaction.reply('you are in rehabilitation. please wait for the next day (12 am) to continue playing.');
		return true;
	}
	return false;
};

const checkForActiveGames = async (interactionUserID, interaction) => {
	if (activeGames.has(interactionUserID)) {
		try {
			const existingGame = activeGames.get(interactionUserID).resource.message;
			await existingGame.reply({ content: `${interaction.user} you already have this game going bro` });
		}
		catch (error) {
			console.error('an error occured when reaching the existing game', error);
		}
		await interaction.reply({ content: '...', flags: MessageFlags.Ephemeral });
		return true;
	}
	return false;
};
