const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { gotRobinHooded } = require('../../game/blackJackState');
const { getAllUsers, updateBalance } = require('../../database/db.js');

const imagePath = path.resolve(__dirname, '..', '..', 'steal.png');

const robinHoodID = '623750889366224906';
module.exports = {
	cooldown: 86400,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('steal')
		.setDescription('robin hood will save us all')
		.addNumberOption(option =>
			option.setName('money')
				.setDescription('The cutoff value for who will be robbed')
				.setRequired(true),
		),
	async execute(interaction) {
		const cutoffVal = interaction.options.getNumber('money');
		if (interaction.user.id != robinHoodID) {
			await interaction.reply('you are not robin hood. you will not be the one to save us');
			return;
		}

		const users = await getAllUsers();

		users.forEach(async user => {
			if (user.userid === robinHoodID) {
				return;
			}
			const userBalance = user.balance;
			if (userBalance >= cutoffVal) {
				await updateBalance(robinHoodID, userBalance);
				await updateBalance(user.userid, -userBalance);
				gotRobinHooded.add(user.userid);
			}
		});

		const updatedUsers = await getAllUsers();
		const sortedData = updatedUsers.sort((a, b) => b.balance - a.balance);
		const leaderboardEmbed = createEmbedElement(sortedData);

		await interaction.reply({ content: 'someone stole from all of the rich! who was that!?', embeds: [leaderboardEmbed], files: [imagePath] });
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