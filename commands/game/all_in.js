const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { activeGames } = require('../../game/gamblingUserState');
const { startBlackJackSession } = require('../../game/playBlackJackGame');
const { getUser } = require('../../database/db.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('all_in')
		.setDescription('Bet all of your money on a game of blackjack!'),
	async execute(interaction) {
		const interactionUserID = interaction.user.id;

		if (await checkForActiveGames(interactionUserID, interaction)) return;

		try {
			const user = await getUser(interactionUserID);
			if (await checkIfRehabilitated(interaction, user)) return;

			if (user) {
				if (user.balance <= 0) {
					await interaction.reply({ content: `${interaction.user}. you don't have any money to all in`, flags: MessageFlags.Ephemeral });
					return;
				}
				activeGames.set(interactionUserID, null);
				await startBlackJackSession({ betAmount: user.balance, userBalance: user.balance, winStreak: user.blackjackstreak, interaction });
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

const checkIfRehabilitated = async (interaction, user) => {
	if (user) {
		const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
		if (today > user.lastrehabdate || user.lastrehabdate === null) {
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
		interaction.reply({ content: '...', flags: MessageFlags.Ephemeral });
		return true;
	}
	return false;
};
