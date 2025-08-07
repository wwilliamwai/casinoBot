const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getAllUsers } = require('../../database/db.js');

module.exports = {
	cooldown: 5,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Check the leaderboard for most money!'),
	async execute(interaction) {
		try {
			const sortedData = await getAllUsers().toSorted((a, b) => b.balance - a.balance);

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