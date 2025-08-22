const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllUsers, updateBalance } = require('../../database/db');

const imagePath1 = path.resolve(__dirname, '..', '..', 'fortnite-black-hole.gif');
const imagePath2 = path.resolve(__dirname, '..', '..', 'fortnite-battle-bus.gif');
let hasRan = false;

const robinHoodID = '623750889366224906';
module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('chapter2')
		.setDescription('fortnite chapter 2 after the black hole'),
	async execute(interaction) {
		if (hasRan) {
			await interaction.reply('our economy has already been saved thanks to a young hero');
			return;
		}
		const users = await getAllUsers();

		for (const user of users) {
			if (user.userid === robinHoodID) continue;

			const userBalance = user.balance;
			if (user.userid === interaction.user.id) {
				await updateBalance(user.userid, -userBalance + 6700);
				continue;
			}
			else {
				await updateBalance(user.userid, -userBalance);
			}
		}

		const updatedUsers = await getAllUsers();
		const sortedData = updatedUsers.sort((a, b) => b.balance - a.balance);
		const leaderboardEmbed = createEmbedElement(sortedData);

		const response = await interaction.reply({ content: 'thank you young hero. casinobot chapter 2 is finally here.', embeds: [leaderboardEmbed], files: [imagePath1], withResponse: true });
		await response.resource.message.reply({ files: [imagePath2] });

		hasRan = true;
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
