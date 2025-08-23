const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, MessageFlags, ComponentType } = require('discord.js');
const Cards = require('cards.js');
const { activeGames } = require('./blackJackState');

async function playBlackJackGame({ betAmount = 0, userWinStreak = null, hasDoubleDown = false, interaction }) {
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
	const gameEmbed = createEmbedElement({ playerHand, dealerHand, userWinStreak, interaction });
	// create row item
	const row = createButtons(hasDoubleDown);
	// send the embeded message
	const response = await interaction.reply({ embeds: [gameEmbed], components: [row], withResponse: true });
	activeGames.set(interaction.user.id, response);

	let playerSum = sumOfHand(playerHand);
	let dealerSum = sumOfHand(dealerHand);
	// if the player starts off with 21, run this code to the end of the game
	if (playerSum === 21) {
		while (dealerSum < 17) {
			dealerHand.push(deck.takeTopCard());
			dealerSum = sumOfHand(dealerHand);
		}
		activeGames.delete(interaction.user.id);
		return await displayGameResult(playerHand, dealerHand, row, userWinStreak, betAmount, interaction);
		// Stop here to prevent collector from starting and so it doesn't bug
	}

	// create the collector to take player input
	const collector = response.resource.message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 300_000 });

	return new Promise((resolve) => {
		collector.on('collect', async i => {
			if (i.user.id != interaction.user.id) {
				await i.reply({ content: 'wrong game bro. kys.', flags: MessageFlags.Ephemeral });
				return;
			}

			collector.resetTimer();

			if (i.customId === 'hit') {
				playerHand.push(deck.takeTopCard());
				await updateEmbed({ playerHand, dealerHand, row, userWinStreak, interaction, isDealerTurn: false });
				playerSum = sumOfHand(playerHand);

				// check if the player busted after hitting
				if (playerSum > 21) {
					collector.stop('bust');
				}
				else if (playerSum === 21) {
					collector.stop('got21');
				}
			}
			if (i.customId === 'double-down') {
				playerHand.push(deck.takeTopCard());
				playerSum = sumOfHand(playerHand);
				// check if the player busted after hitting
				if (playerSum > 21) {
					collector.stop('bust');
				}
				else if (playerSum === 21) {
					collector.stop('got21');
				}
				else {
					while (dealerSum < 17) {
						dealerHand.push(deck.takeTopCard());
						dealerSum = sumOfHand(dealerHand);
					}
					collector.stop('double-down-end');
				}
			}
			if (i.customId === 'stand') {
				while (dealerSum < 17) {
					dealerHand.push(deck.takeTopCard());
					dealerSum = sumOfHand(dealerHand);
				};
				collector.stop('dealer-end');
			}

			await i.deferUpdate();
		});
		collector.on('end', async (collected, reason) => {
			switch (reason) {
			case 'messageDelete':
				activeGames.delete(interaction.user.id);
				if (betAmount != 0) {
					interaction.channel.send('message was deleted? money GONE! u better not be cheating... like dream minecraft');
				}
				resolve(-betAmount);
				break;
			case 'time':
				await updateEmbed({ content: 'yo you took too long bro. it\'s been 5 whole minutes!', playerHand, dealerHand, row, userWinStreak: userWinStreak != null ? 0 : null, interaction });
				activeGames.delete(interaction.user.id);
				resolve(-betAmount);
				break;
			case 'bust':
				await updateEmbed({ content: 'busted! \u{274C}', playerHand, dealerHand, row, userWinStreak: userWinStreak != null ? 0 : null, interaction });
				activeGames.delete(interaction.user.id);
				resolve(-betAmount);
				break;
			case 'got21':
				// then the house still has to roll to see if they can tie
				while (dealerSum < 17) {
					dealerHand.push(deck.takeTopCard());
					dealerSum = sumOfHand(dealerHand);
				};
				activeGames.delete(interaction.user.id);
				resolve(await displayGameResult(playerHand, dealerHand, row, userWinStreak, betAmount, interaction));
				break;
			case 'double-down-end':
				activeGames.delete(interaction.user.id);
				resolve(await displayGameResult(playerHand, dealerHand, row, userWinStreak, betAmount * 2, interaction));
				break;
			case 'dealer-end':
				activeGames.delete(interaction.user.id);
				resolve(await displayGameResult(playerHand, dealerHand, row, userWinStreak, betAmount, interaction));
				break;
			}
		});
	});
};

// helper methods
const displayGameResult = async (playerHand, dealerHand, row, userWinStreak, betAmount, interaction) => {
	let winStreak = userWinStreak;
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
		winStreak = winStreak != null ? 0 : null;
	}
	else {
		message = 'omg you beat the house so cool :3';
		endAmount = betAmount;
		winStreak = winStreak != null ? winStreak + 1 : null;
	}
	await updateEmbed({ playerHand: playerHand, dealerHand: dealerHand, row: row, userWinStreak: winStreak, interaction: interaction });
	await interaction.editReply({ content: message, components: [] });
	return endAmount;
};
const updateEmbed = async ({ content = null, playerHand, dealerHand, row, userWinStreak, interaction, isDealerTurn = true }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		playerHand: playerHand,
		dealerHand: dealerHand,
		userWinStreak: userWinStreak,
		interaction: interaction,
		isDealerTurn: isDealerTurn });
	if (row.components[1].data.custom_id === 'double-down') {
		row.components.splice(1, 1);
	}
	await interaction.editReply({ content: content, embeds: [updatedEmbed], components: isDealerTurn ? [] : [row] });
};

const createButtons = (hasDoubleDown) => {
	const buttons = [
		new ButtonBuilder()
			.setCustomId('hit')
			.setLabel('Hit\u{2713}')
			.setStyle(ButtonStyle.Secondary),
	];

	if (hasDoubleDown) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('double-down')
				.setLabel('Double Down\u{23EB}')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	buttons.push(
		new ButtonBuilder()
			.setCustomId('stand')
			.setLabel('Stand\u{274C}')
			.setStyle(ButtonStyle.Secondary),
	);

	return new ActionRowBuilder().addComponents(...buttons);
};

const createEmbedElement = ({ playerHand, dealerHand, userWinStreak, interaction, isDealerTurn = false }) => {
	const betWinStreak = userWinStreak != null ? `Betting Win Streak: ${userWinStreak}\n\n` : '';
	const dealerValue = isDealerTurn
		? sumOfHand(dealerHand)
		: `${faceCardsToNum(dealerHand[0][1])}+`;
	const dealerCards = isDealerTurn
		? handToString(dealerHand)
		: handToString(dealerHand.slice(0, 1)) + ' `??`';

	return new EmbedBuilder()
		.setColor(0x25633d)
		.setAuthor({
			name: `${interaction.user.globalName}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack\n-------------------------------------')
		.setTimestamp(Date.now())
		.setDescription(
			`${betWinStreak}You | ${sumOfHand(playerHand)}\n${handToString(playerHand)}\n\nDealer | ${dealerValue}\n${dealerCards}`);
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
