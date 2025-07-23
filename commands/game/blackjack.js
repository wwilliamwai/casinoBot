const { SlashCommandBuilder } = require('discord.js');
const { playBlackJackGame } = require('../../playBlackJackGame');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack'),
	async execute(interaction) {
		playBlackJackGame(interaction);
	},
};