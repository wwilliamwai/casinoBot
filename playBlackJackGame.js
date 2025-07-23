const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const Cards = require('cards.js');

async function playBlackJackGame(interaction) {
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

	let playerSum = sumOfHand(playerHand);
	let dealerSum = sumOfHand(dealerHand);
	// if the player starts off with 21, run this code to the end of the game
	if (playerSum === 21) {
		while (dealerSum < 17 || dealerSum < playerSum) {
			dealerHand.push(deck.takeTopCard());
			dealerSum = sumOfHand(dealerHand);
		}
		await displayGameResult(playerHand, dealerHand, row, interaction);
		return;
		// Stop here to prevent collector from starting and so it doesn't bug
	}

	// create the filter and the collector to take
	const filter = (i) => i.user.id === interaction.user.id;
	const collector = response.resource.message.createMessageComponentCollector({ filter, time: 30_000 });

	collector.on('collect', async i => {
		if (i.customId === 'hit') {
			collector.resetTimer();
			playerHand.push(deck.takeTopCard());
			await updateEmbed({ playerHand, dealerHand, row, interaction, isDealerTurn: false });
			playerSum = sumOfHand(playerHand);

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

			while (dealerSum < 17 || dealerSum < playerSum) {
				dealerHand.push(deck.takeTopCard());
				dealerSum = sumOfHand(dealerHand);
			};
			collector.stop('dealer-end');
		}
	});
	collector.on('end', async (collected, reason) => {
		if (reason === 'time') {
			await updateEmbed({ content: 'dingus. you took more than 30 seconds to make a move',
					 playerHand, dealerHand, row, interaction });
		}
		if (reason === 'bust') {
			await updateEmbed({ content: 'busted! \u{274C}', playerHand, dealerHand, row, interaction });
		}
		if (reason === 'got21') {
			// then the house still has to roll to see if they can tie
			while (dealerSum < 17 || dealerSum < playerSum) {
				dealerHand.push(deck.takeTopCard());
				dealerSum = sumOfHand(dealerHand);
			};
			await displayGameResult(playerHand, dealerHand, row, interaction);
		}
		if (reason === 'dealer-end') {
			await displayGameResult(playerHand, dealerHand, row, interaction);
		}
	});
};

// helper methods
const displayGameResult = async (playerHand, dealerHand, row, interaction) => {
	await updateEmbed({ playerHand: playerHand, dealerHand: dealerHand, row: row, interaction: interaction });
	let message = '';

	const playerSum = sumOfHand(playerHand);
	const dealerSum = sumOfHand(dealerHand);

	if (playerSum == dealerSum) {
		message = 'Wait. You guys drew? what the sigma!';
	}
	else if (dealerSum <= 21 && dealerSum > playerSum) {
		message = 'you lost unlucky tbh';
	}
	else {
		message = 'omg you beat the house so cool :3';
	}
	await interaction.editReply({ content: message, components: [] });
};
const updateEmbed = async ({ content = null, playerHand, dealerHand, row, interaction, isDealerTurn = true }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		playerHand: playerHand,
		dealerHand: dealerHand,
		interaction: interaction,
		isDealerTurn: isDealerTurn });

	await interaction.editReply({ content: content, embeds: [updatedEmbed], components: isDealerTurn ? [] : [row] });
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
	const dealerValue = isDealerTurn
		? sumOfHand(dealerHand)
		: `${faceCardsToNum(dealerHand[0][1])}+`;
	const dealerCards = isDealerTurn
		? handToString(dealerHand)
		: handToString(dealerHand.slice(0, 1)) + ' `  `';

	return new EmbedBuilder()
		.setColor(0x163d0f)
		.setAuthor({
			name: `${interaction.user.username}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack')
		.setTimestamp(Date.now())
		.setDescription(
			`You | ${sumOfHand(playerHand)}\n${handToString(playerHand)}\nDealer | ${dealerValue}\n${dealerCards}`);
};

const handToString = (hand) => {
	return hand.reduce((acc, currentCard) => {
		return acc + `\`${currentCard[1]}${currentCard[0].icon}\` `;
	}, '');
};

const sumOfHand = (hand) => {
	let numAces = 0;
	let sum = 0;

	for (const card of hand) {
		const value = faceCardsToNum(card[1]);
		sum += value;
		if (card[1] === 'ace') {
			numAces++;
		}
	}

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

module.exports = {
	playBlackJackGame,
};