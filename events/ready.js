const { Events, ActivityType } = require('discord.js');
const readline = require('readline');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		client.user.setActivity('probably being worked on', { type: ActivityType.Custom, state: 'rob+scaling patch up!' });

		// setup a way to type in general chat through the vscode terminal
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		let channel = client.channels.cache.get('1397838144396591144');

		rl.on('line', async (input) => {
			if (input.trim() === '') return;
			try {
				if (input.slice(0, 8) === 'channel:') {
					channel = client.channels.cache.get(input.slice(8).trim());
				}
				else {
					await channel.send(input);
					console.log(`Sent: ${input}`);
				}
			}
			catch (error) {
				console.error('Failed to send message:', error);
			}
		});
	},
};