const { EmbedBuilder } = require('discord.js');
const { activeGames } = require('./gamblingUserState');

const symbols = ['🍒', '🍒', '🍒', '🍒', '🍒', '🍒', '🍒', '🍒',
	'🍋', '🍋', '🍋', '🍋', '🍋',
	'🍉', '🍉', '🍉',
	'🔔', '🔔',
	'⭐'];


async function playSlotsGame(betAmount, interaction) {
	const embed = createEmbedElement(betAmount, interaction);
	const row = [];
	rollMachine(row);
	const response = await interaction.reply({ content: '**Spinning...**', embeds: [embed], withResponse: true });
	activeGames.set(interaction.user.id, response);
	return await updateEmbed(row, betAmount, interaction);
}

const updateEmbed = async (row, betAmount, interaction) => {
	let rowString = '';
	const payout = getPayout(row, betAmount);
	for (let i = 0; i < 3; i++) {
		rowString += `${ i != 0 ? ' | ' : ''}${row[i]}`;

		await delay(300);
		const updatedEmbed = new EmbedBuilder()
			.setColor(0xc0d13f)
			.setAuthor({
				name: interaction.user.globalName || interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTitle('Slots\n')
			.setTimestamp(Date.now())
			.setDescription(
				`**Bet Amount:** ${betAmount}\n\n${rowString}`,
			);
		await interaction.editReply({ embeds: [updatedEmbed] });
	}
	await delay(200);
	if (payout < 0) {
		await interaction.editReply({ content: `you lost **$${Math.abs(payout)}**` });
	}
	else {
        	await interaction.editReply({ content: `you won **$${payout}**` });
	}
	return payout;
};

const getPayout = (row, betAmount) => {
	if (row[0] === row[1] && row[1] === row[2]) {
		if (row[0] === '🍒') {
			return betAmount * 2;
		}
		else if (row[0] === '🍋') {
			return betAmount * 8;
		}
		else if (row[0] === '🍉') {
			return betAmount * 36;
		}
		else if (row[0] === '🔔') {
			return betAmount * 90;
		}
		else if (row[0] === '⭐') {
			return betAmount * 340;
		}
	}
	return -betAmount;
};

const rollMachine = (row) => {
	for (let i = 0; i < 3; i++) {
		row.push(symbols[Math.floor(Math.random() * 16)]);
	}
};
const createEmbedElement = (betAmount, interaction) => {
	return new EmbedBuilder()
		.setColor(0xc0d13f)
		.setAuthor({
			name: interaction.user.globalName || interaction.user.username,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('Slots\n')
		.setTimestamp(Date.now())
		.setDescription(
			`**Bet Amount:** ${betAmount}\n\nSpinning...`,
		);
};

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
	playSlotsGame,
};