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
			const user = getUser(interactionUserID);

			// play the game
			let jobComplete = false;
			if (Math.random() < 0.5) {
				jobComplete = await mining(interaction);
			}
			else {
				jobComplete = await cleaning(interaction);
			}

			if (user && jobComplete) {
				updateBalance(interactionUserID, 50);
			}
			// if the user data doesn't yet exist
			else if (jobComplete) {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				createUser(interactionUserID, name, 50);
			}
		}
		catch (error) {
			console.error('Error handling labor command', error);
			await interaction.reply({ content: 'Something went wrong while processing your labor', flags: MessageFlags.Ephemeral });
		}
	},
};