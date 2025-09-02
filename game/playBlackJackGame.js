const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, MessageFlags, ComponentType } = require('discord.js');
const Cards = require('cards.js');
const { activeGames } = require('./gamblingUserState');
const { updateBalance, updateBlackJackStreak } = require('../database/db.js');

async function startBlackJackSession({ betAmount = 0, userBalance = 1, winStreak = null, interaction }) {
	// setup the gameData class
	const game = new GameData(betAmount, userBalance, winStreak);

	await playBlackJackGame(game, 0, interaction);
}
async function playBlackJackGame(game, index, interaction) {
	// create the embed element
	const embed = createEmbedElement({ game, index: index, interaction });
	// create row item
	const row = createButtons(game, index);

	// send the embeded message
	let response = null;
	// we need two different responses depending if its the first game or a split game
	if (index === 0) {
		response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });
	}
	else {
		response = await interaction.editReply({ embeds: [embed], components: [row], withResponse: true });
	}
	activeGames.set(interaction.user.id, response);

	// if the player starts off with 21, run this code to the end of the game
	if (game.playerSums[index] === 21) {
		game.handDealerTill17(index);
		return await displayGameEndResult({ game, index: index, row, response, interaction });
		// Stop here to prevent collector from starting and so it doesn't bug
	}

	// create the collector to take player input
	let collector = null;
	if (index === 0) {
		collector = response.resource.message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 900_000 });
	}
	else {
		collector = response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 900_000 });
	}

	return new Promise((resolve) => {
		collector.on('collect', async i => {
			await handleCollect(i, game, index, row, interaction, collector);
		});
		collector.on('end', async (collected, reason) => {
			resolve(await handleEnd(reason, game, index, row, interaction, response));
		});
	});
};

// helper methods
const createSplitGame = async (game, oldIndex, interaction) => {
	const index = oldIndex + 1;

	game.splitCards(oldIndex, index, interaction);

	const embed = createEmbedElement({ game, index, interaction });
	await interaction.reply({ content: '**play the previous hand first!**', embeds: [embed], withResponse: true });
};

const updateMessageAndData = async (game, index, endAmount, userID, response) => {
	if (game.betAmounts[index] === 0) {
		return;
	}
	await updateBalance(userID, endAmount);
	await updateBlackJackStreak(userID, game.winStreak);
	game.balance = Number(game.balance) + Number(endAmount);
	if (index === 0) {
		await response.resource.message.reply({ content: `<@${userID}> you now have $${game.balance} in your balance.` });
	}
	else {
		await response.reply({ content: `<@${userID}> you now have $${game.balance} in your balance.` });
	}
};

const displayGameEndResult = async ({ game, index, row, response, interaction }) => {
	let message = '';
	let endAmount = 0;

	if (game.playerSums[index] > 21) {
		message = 'busted! \u{274C}';
		endAmount = -game.betAmounts[index];
		game.winStreak = game.winStreak != null ? 0 : null;
	}
	else if (game.playerSums[index] === 21 && game.playerHands[index].length === 2 && !game.splitAces.includes(index)) {
		message = 'blackjack!!!!';
		endAmount = game.betAmounts[index] * 1.5;
		game.winStreak = game.winStreak != null ? game.winStreak + 1 : null;
	}
	else if (game.playerSums[index] === game.dealerSum) {
		message = 'wait. you guys drew? what the sigma!';
	}
	else if (game.dealerSum <= 21 && game.dealerSum > game.playerSums[index]) {
		message = 'you lost unlucky tbh';
		endAmount = -game.betAmounts[index];
		game.winStreak = game.winStreak != null ? 0 : null;
	}
	else {
		message = 'omg you beat the house so cool :3';
		endAmount = game.betAmounts[index];
		game.winStreak = game.winStreak != null ? game.winStreak + 1 : null;
	}
	// if the endAmount is greater than the userBalance after a double-down, default to the userBalance
	if (game.balance < Math.abs(endAmount)) {
		endAmount = Math.sign(endAmount) * game.balance;
		game.betAmounts[index] = Math.abs(endAmount);
	}
	await updateEmbed({ content: message, game, index, row, interaction, showButtons: false, showDealerCard: true });
	await updateMessageAndData(game, index, endAmount, interaction.user.id, response);
};

const finishHand = async ({ game, index, row, interaction, response, splitGameInteraction, dealerRoll = false }) => {
	await updateEmbed({ game, index, row, interaction, showButtons: false, showDealerCard: false });

	// if there's a game that split off and derives from this, recursively run another game!
	if (splitGameInteraction) {
		game.updateForSplitGame(index + 1);
		await playBlackJackGame(game, index + 1, splitGameInteraction);
	}
	else if (dealerRoll) {
		game.handDealerTill17();
	}

	await displayGameEndResult({ game, index, row, response, interaction });
};

const handleEnd = async (reason, game, index, row, interaction, response) => {
	let splitGameInteraction = null;
	if (game.splitGameInteractions.length > 0) {
		splitGameInteraction = game.splitGameInteractions[index];
	}

	switch (reason) {
	case 'messageDelete':
		if (game.betAmounts[index] != 0) {
			interaction.channel.send('message was deleted? money GONE! u better not be cheating... like dream minecraft');
		}
		await updateMessageAndData(game, index, -game.betAmounts[index], interaction.user.id);
		break;
	case 'time':
		await updateEmbed({ content: 'yo you took too long bro. it\'s been 15 whole minutes!', game, index: index, row, interaction });
		await updateMessageAndData(game, index, -game.betAmounts[index], interaction.user.id);
		break;
	case 'bust':
		await finishHand({ game, index, row, interaction, response, splitGameInteraction });
		break;
	case 'got21':
		await finishHand({ game, index, row, interaction, response, splitGameInteraction, dealerRoll: true });
		break;
	case 'double-down-end':
		game.addCardToPlayer(index);
		game.betAmounts[index] = game.betAmounts[index] * 2;
		await finishHand({ game, index, row, interaction, response, splitGameInteraction, dealerRoll: game.playerSums[index] <= 21 ? true : false });
		break;
	case 'dealer-end':
		await finishHand({ game, index, row, interaction, response, splitGameInteraction, dealerRoll: true });
		break;
	}
	return true;
};

const handleCollect = async (i, game, index, row, interaction, collector) => {
	if (i.user.id != interaction.user.id) {
		await i.reply({ content: 'wrong game bro. kys.', flags: MessageFlags.Ephemeral });
		return;
	}

	collector.resetTimer();

	switch (i.customId) {
	case 'hit':
		game.addCardToPlayer(index);
		await updateEmbed({ game, index, row, interaction, showButtons: true });

		// check if the player busted after hitting
		if (game.playerSums[index] > 21) {
			collector.stop('bust');
		}
		else if (game.playerSums[index] === 21) {
			collector.stop('got21');
		}
		await i.deferUpdate();
		break;
	case 'double-down':
		collector.stop('double-down-end');
		await i.deferUpdate();
		break;
	case 'split':
		await createSplitGame(game, index, i);
		await updateEmbed({ content: '**play the current hand to play the next!**', game, index, row, interaction });
		break;
	case 'stand':
		collector.stop('dealer-end');
		await i.deferUpdate();
		break;
	};
};

const updateEmbed = async ({ content = null, game, index, row, interaction, showButtons = true, showDealerCard = false }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		game: game,
		index: index,
		interaction: interaction,
		showDealerCard: showDealerCard });

	// filter row components if they aren't needed anymore
	const filteredComponents = row.components.slice().filter(component => {
		const id = component.data.custom_id;

		// Remove double-down if not allowed OR hand has more than 2 cards
		if (id === 'double-down' && (!game.playerCanDoubleDown(index) || game.playerHands[index].length > 2)) return false;

		// Remove split if not allowed OR hand has more than 2 cards
		if (id === 'split' && (!game.playerCanSplit(index) || game.playerHands[index].length > 2)) return false;

		// Remove hit if this hand is a split Ace
		if (id === 'hit' && game.splitAces.includes(index)) return false;

		return true;
	});

	await interaction.editReply({ content: content, embeds: [updatedEmbed], components: showButtons ? [new ActionRowBuilder().addComponents(...filteredComponents)] : [] });
};

const createButtons = (game, index) => {
	const buttons = [];

	const isSplitAce = game.splitAces.includes(index);

	// Hit button: only if NOT split Ace
	if (!isSplitAce) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('hit')
				.setLabel('Hit\u2713')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	// Stand button: always allowed
	buttons.push(
		new ButtonBuilder()
			.setCustomId('stand')
			.setLabel('Stand\u274C')
			.setStyle(ButtonStyle.Secondary),
	);

	// Double Down: only if allowed and not split Ace
	if (!isSplitAce && game.playerCanDoubleDown(index)) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('double-down')
				.setLabel('Double Down\u23EB')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	// Split: only if allowed
	if (game.playerCanSplit(index)) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('split')
				.setLabel('Split \u00F7')
				.setStyle(ButtonStyle.Secondary),
		);
	}

	return new ActionRowBuilder().addComponents(...buttons);
};

const createEmbedElement = ({ game, index, interaction, showDealerCard = false }) => {
	const betAmountString = `**Amount Bet:** ${game.betAmounts[index]}` + (game.winStreak === null ? '\n\n' : '\n');
	const betWinStreakString = game.winStreak != null ? `**Betting Win Streak:** ${game.winStreak}\n\n` : '';
	const dealerValueString = showDealerCard
		? game.dealerSum
		: `${game.faceCardsToNum(game.dealerHand[0][1])}+`;
	const dealerCardsString = showDealerCard
		? game.handToString(game.dealerHand)
		: game.handToString(game.dealerHand.slice(0, 1)) + ' `??`';

	return new EmbedBuilder()
		.setColor(0x25633d)
		.setAuthor({
			name: interaction.user.globalName || interaction.user.username,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack\n-------------------------------------')
		.setTimestamp(Date.now())
		.setDescription(
			`${betAmountString}${betWinStreakString}You | ${game.playerSums[index]}\n${game.handToString(game.playerHands[index])}\n\nDealer | ${dealerValueString}\n${dealerCardsString}`);
};

class GameData {
	constructor(betAmount, balance, winStreak) {
		this.deck = new Cards(false);
		this.playerHands = [];
    	this.dealerHand = [];
    	this.betAmounts = [betAmount];
    	this.balance = balance;
    	this.winStreak = winStreak;
		this.splitGameInteractions = [];
		this.splitAces = [];
		this.setUpHands();
	}

	updateForSplitGame(newIndex) {
		this.playerHands[newIndex].push(this.deck.takeTopCard());
		this.playerSums[newIndex] = this.sumOfHand(this.playerHands[newIndex]);
	}

	splitCards(oldIndex, newIndex, interaction) {
		// move one card from the old hand into a new hand
		this.playerHands.push([this.playerHands[oldIndex].pop()]);
		// give the old hand a replacement card
		this.playerHands[oldIndex].push(this.deck.takeTopCard());

		// update sums for both hands
		this.playerSums[oldIndex] = this.sumOfHand(this.playerHands[oldIndex]);
		this.playerSums.push(this.sumOfHand(this.playerHands[newIndex]));

		// duplicate the bet for the new hand
		this.betAmounts.push(this.betAmounts[oldIndex]);

		// store the interaction for the new hand
		this.splitGameInteractions.push(interaction);

		// keep track if indices have split aces
		if (this.playerHands[oldIndex][0][1] === 'ace') {
			this.splitAces.push(oldIndex);
			this.splitAces.push(newIndex);
		}
	}

	playerCanDoubleDown(i) {
		return (
			this.betAmounts[i] != 0 &&
		this.betAmounts[i] != this.balance && !this.splitAces.includes(i)
		);
	}

	playerCanSplit(i) {
		return (
			this.playerHands[i][0][1] === this.playerHands[i][1][1] &&
        this.betAmounts[i] * 2 <= this.balance
		);
	}

	addCardToPlayer(i) {
		this.playerHands[i].push(this.deck.takeTopCard());
		this.playerSums[i] = this.sumOfHand(this.playerHands[i]);
	}

	setUpHands() {
		// the player can have multiple hands, but the dealer will just have one
		this.deck.shuffle();
		this.playerHands.push([this.deck.takeTopCard()]);
		this.dealerHand.push(this.deck.takeTopCard());
		this.playerHands[0].push(this.deck.takeTopCard());
		this.dealerHand.push(this.deck.takeTopCard());

		this.playerSums = [this.sumOfHand(this.playerHands[0])];
		this.dealerSum = this.sumOfHand(this.dealerHand);
	}

	handDealerTill17() {
		while (this.dealerSum < 17) {
			this.dealerHand.push(this.deck.takeTopCard());
			this.dealerSum = this.sumOfHand(this.dealerHand);
		};
	};

	handToString(hand) {
		return hand.reduce((acc, currentCard) => {
			return acc + `\`${currentCard[1]}${currentCard[0].icon}\` `;
		}, '');
	};

	sumOfHand(hand) {
		let numAces = 0;
		let sum = 0;

		for (const card of hand) {
			const value = this.faceCardsToNum(card[1]);
			sum += value;
			if (card[1] === 'ace') {
				numAces++;
			}

			while (sum > 21 && numAces > 0) {
				sum -= 10;
				numAces--;
			}
		}

		return sum;
	};

	faceCardsToNum(cardVal) {
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
}

module.exports = {
	startBlackJackSession,
};
