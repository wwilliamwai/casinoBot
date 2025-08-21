const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gotRobinHooded } = require('../../game/blackJackState');
const { getAllUsers, getUser, updateBalance } = require('../../database/db.js');

const imagePath = path.resolve(__dirname, '..', '..', 'robinhood.png');

const robinHoodID = '623750889366224906';
module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('robinhood')
		.setDescription('robin hood will save us all'),
	async execute(interaction) {
		if (interaction.user.id != robinHoodID) {
			await interaction.reply('you are not robin hood. you will not be the one to save us');
			return;
		}

		const users = await getAllUsers();

		const numTargets = users.filter(user => !gotRobinHooded.has(user.userid) && user.userid != robinHoodID).length;

		const robinHood = await getUser(robinHoodID);
		const moneyGiven = Math.floor(robinHood.balance / numTargets);

		users.forEach(async user => {
			if (user.userid === robinHoodID) {
				return;
			}
			if (!gotRobinHooded.has(user.userID)) {
				await updateBalance(robinHoodID, -moneyGiven);
				await updateBalance(user.userid, moneyGiven);
			}
		});

		await updateBalance(robinHoodID, -99999999999);

		const updatedUsers = await getAllUsers();
		const sortedData = updatedUsers.sort((a, b) => b.balance - a.balance);
		const leaderboardEmbed = createEmbedElement(sortedData);

		await interaction.reply({ content: `<@${robinHoodID}> we thank you for this robinhood. you're a true hero.`, embeds: [leaderboardEmbed], files: [imagePath] });
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