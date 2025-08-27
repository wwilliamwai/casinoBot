const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, createUser, updateBalance } = require('../../database/db.js');

const { mining } = require('../../game/playMiningGame');
const { cleaning } = require('../../game/playCleaningGame');

const laborAmount = 50;

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('work')
		.setDescription('Do work to make more money.'),
	async execute(interaction) {
		try {
			const interactionUserID = interaction.user.id;
			const user = await getUser(interactionUserID);

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