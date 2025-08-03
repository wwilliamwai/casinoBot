const fs = require('fs');
const path = require('path');

const miningEmojiPath = path.join(__dirname, 'miningEmojis.json');

async function mining(interaction) {
	try {
		// creating and accessing the emojis we want to use
		const miningEmoji = await fs.promises.readFile(miningEmojiPath, 'utf8');
		const miningEmojiData = JSON.parse(miningEmoji);

		const randomIndex = Math.floor(Math.random() * miningEmojiData.emojis.length);
		const randomEmojiID = miningEmojiData.emojis[randomIndex].id;

		const response = await interaction.reply({ content: 'react to both emojis!', withResponse: true });

		await response.resource.message.react(randomEmojiID);
		await response.resource.message.react('\u{26CF}');

		const collectorFilter = (reaction, user) => {
			return (reaction.emoji.id === randomEmojiID || reaction.emoji.name === '\u{26CF}') && user.id === interaction.user.id;
		};

		const collector = response.resource.message.createReactionCollector({ filter: collectorFilter, time: 15_000 });

		let numReactions = 0;

		return new Promise((resolve) => {
			collector.on('collect', (reaction, user) => {
				numReactions++;
				if (numReactions >= 2) {
					collector.stop('clickedEnough');
				}
			});

			collector.on('end', async (collected, reason) => {
				if (reason === 'clickedEnough') {
					await interaction.editReply('congrats you made $50 dollars!');
					resolve(true);
				}
				if (reason === 'time') {
					await interaction.editReply('you took too much time');
					resolve(false);
				}
			});
		});
	}
	catch (error) {
		console.error('Something went wrong with the mining command', error);
	}
}

module.exports = {
	mining,
};