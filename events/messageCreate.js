const { Events } = require('discord.js');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// ignore message from bot
		if (message.author.bot) return;

		if (message.mentions.users.has(message.client.user.id) && message.mentions.users.size === 1) {
			console.log('hi');
			await message.reply('hi :)');
		}
	},
};