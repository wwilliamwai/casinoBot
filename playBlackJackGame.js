const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const Cards = require('cards.js');

async function playBlackJackGame({ betAmount = 0, betWinStreak = null, interaction }) {
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
	const gameEmbed = createEmbedElement({ playerHand, dealerHand, betWinStreak, interaction });
	// create row item
	const row = createHitStandButtons();
	// send the embeded message
	const response = await interaction.reply({ embeds: [gameEmbed], components: [row], withResponse: true });

	let playerSum = sumOfHand(playerHand);
	let dealerSum = sumOfHand(dealerHand);
	// if the player starts off with 21, run this code to the end of the game
	if (playerSum === 21) {
		while (dealerSum < 17) {
			dealerHand.push(deck.takeTopCard());
			dealerSum = sumOfHand(dealerHand);
		}
		return await displayGameResult(playerHand, dealerHand, row, betWinStreak, betAmount, interaction);
		// Stop here to prevent collector from starting and so it doesn't bug
	}

	// create the collector to take player input
	const collector = response.resource.message.createMessageComponentCollector({ time: 30_000 });

	return new Promise((resolve) => {
		collector.on('collect', async i => {
			if (i.user.id != interaction.user.id) {
				await i.reply({ content: 'wrong game bro. kys.', flags: MessageFlags.Ephemeral });
				return;
			}
			if (i.customId === 'hit') {
				collector.resetTimer();
				playerHand.push(deck.takeTopCard());
				await updateEmbed({ playerHand, dealerHand, row, betWinStreak, interaction, isDealerTurn: false });
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

				while (dealerSum < 17) {
					dealerHand.push(deck.takeTopCard());
					dealerSum = sumOfHand(dealerHand);
				};
				collector.stop('dealer-end');
			}
		});
		collector.on('end', async (collected, reason) => {
			if (reason === 'time') {
				await updateEmbed({ content: 'dingus. you took more than 30 seconds to make a move',
					 playerHand, dealerHand, row, betWinStreak, interaction });
				resolve(0);
			}
			if (reason === 'bust') {
				await updateEmbed({ content: 'busted! \u{274C}', playerHand, dealerHand, row, betWinStreak: 0, interaction });
				resolve(-betAmount);
			}
			if (reason === 'got21') {
				// then the house still has to roll to see if they can tie
				while (dealerSum < 17) {
					dealerHand.push(deck.takeTopCard());
					dealerSum = sumOfHand(dealerHand);
				};
				resolve(await displayGameResult(playerHand, dealerHand, row, betWinStreak, betAmount, interaction));
			}
			if (reason === 'dealer-end') {
				resolve(await displayGameResult(playerHand, dealerHand, row, betWinStreak, betAmount, interaction));
			}
		});
	});
};

// helper methods
const displayGameResult = async (playerHand, dealerHand, row, betWinStreak, betAmount, interaction) => {
	let winStreak = betWinStreak;
	let message = '';
	let endAmount = 0;

	const playerSum = sumOfHand(playerHand);
	const dealerSum = sumOfHand(dealerHand);

	if (playerSum == dealerSum) {
		message = 'Wait. You guys drew? what the sigma!';
	}
	else if (dealerSum <= 21 && dealerSum > playerSum) {
		message = 'you lost unlucky tbh';
		endAmount = -betAmount;
		winStreak = 0;
	}
	else {
		message = 'omg you beat the house so cool :3';
		endAmount = betAmount;
		winStreak++;
	}
	await updateEmbed({ playerHand: playerHand, dealerHand: dealerHand, row: row, betWinStreak: winStreak, interaction: interaction });
	await interaction.editReply({ content: message, components: [] });
	return endAmount;
};
const updateEmbed = async ({ content = null, playerHand, dealerHand, row, betWinStreak, interaction, isDealerTurn = true }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		playerHand: playerHand,
		dealerHand: dealerHand,
		betWinStreak: betWinStreak,
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

const createEmbedElement = ({ playerHand, dealerHand, betWinStreak, interaction, isDealerTurn = false }) => {
	const bettingWinStreak = betWinStreak != null ? `Betting Win Streak: ${betWinStreak}\n\n` : '';
	const dealerValue = isDealerTurn
		? sumOfHand(dealerHand)
		: `${faceCardsToNum(dealerHand[0][1])}+`;
	const dealerCards = isDealerTurn
		? handToString(dealerHand)
		: handToString(dealerHand.slice(0, 1)) + ' `  `';

	return new EmbedBuilder()
		.setColor(0x163d0f)
		.setAuthor({
			name: `${interaction.user.globalName}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack')
		.setTimestamp(Date.now())
		.setDescription(
			`${bettingWinStreak}You | ${sumOfHand(playerHand)}\n${handToString(playerHand)}\n\nDealer | ${dealerValue}\n${dealerCards}`);
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