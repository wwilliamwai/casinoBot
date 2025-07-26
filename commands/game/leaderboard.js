const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	cooldown: 5,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Check the leaderboard for most money!'),
	async execute(interaction) {
		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			sortedData = userData.users.toSorted((a, b) => b.balance - a.balance);
			const leaderboardEmbed = createEmbedElement(sortedData);
			await interaction.reply({ content: '', embeds: [leaderboardEmbed] });
		}
		catch (error) {
			console.error('Error processing the leaderboard', error);
			await interaction.reply({ content: 'Something went wrong while processing the leaderboard', flags: MessageFlags.Ephemeral });
		}
	},
};

// helper functions
const createEmbedElement = ((userData) => {
	let leaderboard = '';
	userData.forEach((user, index) => {
		leaderboard += `**(#${index + 1}) ${user.name}** - $${user.balance}\n`;
	});
	return new EmbedBuilder()
		.setColor(0x163d0f)
		.setTitle('Leaderboard')
		.setTimestamp(Date.now())
		.setDescription(
			`${leaderboard}`);
});