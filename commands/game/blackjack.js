const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder, ButtonStyle } = require('discord.js');
const Cards = require('cards.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack'),
	async execute(interaction) {
		// create the cards for the blackJack game
		const deck = new Cards(false);
		const dealerHand = [];
		const playerHand = [];
		deck.shuffle();
		playerHand.push(deck.takeTopCard());
		dealerHand.push(deck.takeTopCard());
		playerHand.push(deck.takeTopCard());
		dealerHand.push(deck.takeTopCard());

		// create the embed element
		const gameEmbed = createEmbedElement({ playerHand, dealerHand, interaction });
		// create row item
		const row = createHitStandButtons();
		// send the embeded message
		const response = await interaction.reply({ embeds: [gameEmbed], components: [row], withResponse: true });

		// create the filter and the collector to take
		const filter = (i) => i.user.id === interaction.user.id;
		const collector = response.resource.message.createMessageComponentCollector({ filter, time: 30_000 });

		collector.on('collect', async i => {
			if (i.customId === 'hit') {
				collector.resetTimer();
				playerHand.push(deck.takeTopCard());
				await updateEmbed({ playerHand, dealerHand, row, interaction, isDealerTurn: false });
				const playerSum = sumOfHand(playerHand);
				// check if the player busted after hitting
				if (playerSum > 21) {
					collector.stop('bust');
				}
				else if (playerSum === 21) {
					collector.stop('got21');
				}
				else {
					await i.deferUpdate();
				}
			}
			if (i.customId === 'stand') {
				collector.resetTimer();
				dealerSum = sumOfHand(dealerHand);
				while (dealerSum < 17 && dealerSum < sumOfHand(playerHand)) {
					dealerHand.push(deck.takeTopCard());
				};
				collector.stop('dealer-end');
			}
		});
		collector.on('end', async (collected, reason) => {
			if (reason === 'time') {
				await updateEmbed({ playerHand, dealerHand, row, interaction });
				await interaction.editReply({ content: 'dingus. you took more than 30 seconds to make a move', components: [] });
			}
			if (reason === 'bust') {
				await updateEmbed({ playerHand, dealerHand, row, interaction });
				await interaction.editReply({ content: 'busted! \u{274C}', components: [] });
			}
			if (reason === 'got21') {
				await updateEmbed({ playerHand, dealerHand, row, interaction });
				await dictateGameEnd(playerHand, dealerHand, interaction);
			}
			if (reason === 'dealer-end') {
				await updateEmbed({ playerHand, dealerHand, row, interaction });
				await dictateGameEnd(playerHand, dealerHand, interaction);
			}
		});
	},
};

// helper methods
const dictateGameEnd = async (playerHand, dealerHand, interaction) => {
	const playerSum = sumOfHand(playerHand);
	const dealerSum = sumOfHand(dealerHand);

	if (playerSum == 21 && dealerSum == 21) {
		await interaction.editReply({ content: 'Wait. You guys drew? what the sigma!', components: [] });
	}
	else if (dealerSum <= 21 && dealerSum > playerSum) {
		await interaction.editReply({ content: 'you lost unlucky tbh', components: [] });
	}
	else {
		await interaction.editReply({ content: 'omg you beat the dealer so cool :3', components: [] });
	}
};
const updateEmbed = async ({ playerHand, dealerHand, row, interaction, isDealerTurn = true }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		playerHand: playerHand,
		dealerHand: dealerHand,
		interaction: interaction,
		isDealerTurn: isDealerTurn });

	await interaction.editReply({ embeds: [updatedEmbed], components: [row] });
};

const createHitStandButtons = () => {
	// create row item
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('hit')
			.setLabel('Hit\u{2713}')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('stand')
			.setLabel('Stand\u{274C}')
			.setStyle(ButtonStyle.Secondary),
	);
};

const createEmbedElement = ({ playerHand, dealerHand, interaction, isDealerTurn = false }) => {
	return new EmbedBuilder()
		.setColor(0x163d0f)
		.setAuthor({
			name: `${interaction.user.username}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack')
		.setTimestamp(Date.now())
		.setDescription(`You | ${sumOfHand(playerHand)}\n${handToString(playerHand)}\n
Dealer | ${faceCardsToNum(isDealerTurn ? sumOfHand(dealerHand) : dealerHand[0][1] + '+')}\n${isDealerTurn ?
	 handToString(dealerHand) : handToString(dealerHand.slice(0, 1)) + ' `  `'}`);
};

const handToString = (hand) => {
	return hand.reduce((acc, currentCard) => {
		return acc + `\`${currentCard[1]}${currentCard[0].icon}\` `;
	}, '');
};

const sumOfHand = (hand) => {
	let numAces = 0;
	let sum = 0;

	hand.forEach(currentCard => {
		sum += faceCardsToNum(currentCard[1]);

		// keeps tracks of number of aces
		if (currentCard[1] === 'ace') {
			numAces++;
		}
	});

	while (sum > 21 && numAces > 0) {
		sum -= 10;
		numAces--;
	}

	return sum;
};

const faceCardsToNum = (cardVal) => {
	if (cardVal === 'jack' || cardVal === 'queen' || cardVal === 'king') {
		return 10;
	}
	else if (cardVal === 'ace') {
		return 11;
	}
	else {
		return cardVal;
	}
};