const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, createUser, updateBalance } = require('../../database/db.js');

const { mining } = require('../../game/playMiningGame');
const { cleaning } = require('../../game/playCleaningGame');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('labor')
		.setDescription('do work to make more money.'),
	async execute(interaction) {
		try {
			const interactionUserID = interaction.user.id;
			const user = await getUser(interactionUserID);

			const laborAmount = getLaborAmount(user.balance);
			// play the game
			let jobComplete = false;
			if (Math.random() < 0.5) {
				jobComplete = await mining(interaction, laborAmount);
			}
			else {
				jobComplete = await cleaning(interaction, laborAmount);
			}

			if (user && jobComplete) {
				await updateBalance(interactionUserID, laborAmount);
			}
			// if the user data doesn't yet exist
			else if (jobComplete) {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				await createUser(interactionUserID, name, laborAmount);
			}
		}
		catch (error) {
			console.error('Error handling labor command', error);
			await interaction.reply({ content: 'Something went wrong while processing your labor', flags: MessageFlags.Ephemeral });
		}
	},
};

function getLaborAmount(num) {
	if (num < 10000) {
		return 50;
	}
	const digits = Math.floor(Math.log10(num)) + 1;
	const newDigits = digits - 2;
	return 5 * Math.pow(10, newDigits - 1);
}