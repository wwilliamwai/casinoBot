const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const { activeGames } = require('../../game/gamblingUserState');
const { playSlotsGame } = require('../../game/playSlotsGame');
const { getUser, updateBalance } = require('../../database/db.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('slots')
		.setDescription('Play a game of slots to earn some money!')
		.addNumberOption(option =>
			option.setName('bet')
		        .setDescription('The betting amount')
		        .setRequired(true),
		),
	async execute(interaction) {
		const interactionUserID = interaction.user.id;

		if (await checkForActiveGames(interactionUserID, interaction)) return;

		const betAmount = Math.floor(interaction.options.getNumber('bet'));

		if (betAmount <= 0) {
			await interaction.reply({ content: 'you must bet an adaquate amount for slots', flags: MessageFlags.Ephemeral });
			return;
		}

		try {
			const user = await getUser(interactionUserID);

			if (await checkIfRehabilitated(interaction, user)) return;

			// if the user's data does exist
			if (user) {
				if (user.balance < betAmount) {
					await interaction.reply({ content: 'you don\'t have enough money.', flags: MessageFlags.Ephemeral });
					return;
				}
				activeGames.set(interactionUserID, null);
				const amountEarned = await playSlotsGame(betAmount, interaction);
				const existingGame = activeGames.get(interactionUserID).resource.message;
				await existingGame.reply({ content: `${interaction.user} you now have $${Number(user.balance) + Number(amountEarned)} in your balance.` });
				updateBalance(interactionUserID, amountEarned);

			}
			else {
				await interaction.reply({ content: `${interaction.user}. you haven't collected any money yet. do **/daily** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error processing the slots command', error);
			await interaction.editReply({ content: 'Something went wrong while trying to run slots', flags: MessageFlags.Ephemeral });
		}
		finally {
			activeGames.delete(interactionUserID);
		}
	},
};

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
		await interaction.reply({ content: '...', flags: MessageFlags.Ephemeral });
		return true;
	}
	return false;
};