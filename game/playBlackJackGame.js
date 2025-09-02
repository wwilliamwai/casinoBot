const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, MessageFlags, ComponentType } = require('discord.js');
const Cards = require('cards.js');
const { activeGames } = require('./gamblingUserState');

async function playBlackJackGame({ betAmount = 0, userBalance = null, winStreak = null, hasDoubleDown = false, interaction }) {
	// setup the gameData class
	const game = new GameData(betAmount, userBalance, winStreak);

	// create the embed element
	const embed = createEmbedElement({ game, interaction });
	// create row item
	const row = createButtons(hasDoubleDown);
	// send the embeded message
	const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });
	// log this as an active game
	activeGames.set(interaction.user.id, response);

	// if the player starts off with 21, run this code to the end of the game
	if (game.playerSum === 21) {
		game.handDealerTill17();
		return await displayGameEndResult({ game, row, interaction });
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

			switch (i.customId) {
			case 'hit':
				game.addCardToPlayer();
				await updateEmbed({ game, row, interaction, isDealerTurn: false });

				// check if the player busted after hitting
				if (game.playerSum > 21) {
					collector.stop('bust');
				}
				else if (game.playerSum === 21) {
					collector.stop('got21');
				}
				break;
			case 'double-down':
				collector.stop('double-down-end');
				break;
			case 'stand':
				collector.stop('dealer-end');
				break;
			};
			await i.deferUpdate();
		});
		collector.on('end', async (collected, reason) => {
			switch (reason) {
			case 'messageDelete':
				if (game.betAmount != 0) {
					interaction.channel.send('message was deleted? money GONE! u better not be cheating... like dream minecraft');
				}
				resolve([-game.betAmount, 0]);
				break;
			case 'time':
				await updateEmbed({ content: 'yo you took too long bro. it\'s been 5 whole minutes!', game, row, interaction });
				resolve([-game.betAmount, 0]);
				break;
			case 'bust':
				resolve(await displayGameEndResult({ game, row, interaction }));
				break;
			case 'got21':
				// then the house still has to roll to see if they can tie
				game.handDealerTill17();
				resolve(await displayGameEndResult({ game, row, interaction }));
				break;
			case 'double-down-end':
				game.addCardToPlayer();
				// if dealer still under 17 and you didn't bust, they still have to roll
				if (game.dealerSum < 17 && game.playerSum <= 21) {
					game.handDealerTill17();
				}
				game.betAmount = game.betAmount * 2;
				resolve(await displayGameEndResult({ game, row, interaction }));
				break;
			case 'dealer-end':
				game.handDealerTill17();
				resolve(await displayGameEndResult({ game, row, interaction }));
				break;
			}
		});
	});
};

// helper methods

const displayGameEndResult = async ({ game, row, interaction }) => {
	let message = '';
	let endAmount = 0;

	if (game.playerSum > 21) {
		message = 'busted! \u{274C}';
		endAmount = -game.betAmount;
		game.winStreak = game.winStreak != null ? 0 : null;
	}
	else if (game.playerSum === game.dealerSum) {
		message = 'wait. you guys drew? what the sigma!';
	}
	else if (game.dealerSum <= 21 && game.dealerSum > game.playerSum) {
		message = 'you lost unlucky tbh';
		endAmount = -game.betAmount;
		game.winStreak = game.winStreak != null ? 0 : null;
	}
	else {
		message = 'omg you beat the house so cool :3';
		endAmount = game.betAmount;
		game.winStreak = game.winStreak != null ? game.winStreak + 1 : null;
	}
	// if the endAmount is greater than the userBalance after a double-down, default to the userBalance
	if (game.balance != null && game.balance < Math.abs(endAmount)) {
		endAmount = Math.sign(endAmount) * game.balance;
		game.betAmount = Math.abs(endAmount);
	}
	await updateEmbed({ game, row, interaction });
	await interaction.editReply({ content: message, components: [] });
	return [endAmount, game.winStreak];
};

const updateEmbed = async ({ content = null, game, row, interaction, isDealerTurn = true }) => {
	// create a new embed object
	const updatedEmbed = createEmbedElement({
		game: game,
		interaction: interaction,
		isDealerTurn: isDealerTurn });
	// removes the extra buttons after the first update
	if (game.playerHands[index].length > 2) {
		row.components = row.components.filter(component => {
  		return component.data.custom_id !== 'double-down';
		});
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

const createEmbedElement = ({ game, interaction, isDealerTurn = false }) => {
	const betAmountString = `**Amount Bet:** ${game.betAmount}` + (game.winStreak === null ? '\n\n' : '\n');
	const betWinStreakString = game.winStreak != null ? `**Betting Win Streak:** ${game.winStreak}\n\n` : '';
	const dealerValueString = isDealerTurn
		? game.dealerSum
		: `${game.faceCardsToNum(game.dealerHand[0][1])}+`;
	const dealerCardsString = isDealerTurn
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
			`${betAmountString}${betWinStreakString}You | ${game.playerSum}\n${game.handToString(game.playerHand)}\n\nDealer | ${dealerValueString}\n${dealerCardsString}`);
};

class GameData {
	constructor(betAmount, balance, winStreak) {
		this.deck = new Cards(false);
		this.playerHand = [];
    	this.dealerHand = [];
    	this.betAmount = betAmount;
    	this.balance = balance;
    	this.winStreak = winStreak;
		this.setUpHands();
	}

	addCardToPlayer() {
		this.playerHand.push(this.deck.takeTopCard());
		this.playerSum = this.sumOfHand(this.playerHand);
	}

	setUpHands() {
		this.deck.shuffle();
		this.playerHand.push(this.deck.takeTopCard());
		this.dealerHand.push(this.deck.takeTopCard());
		this.playerHand.push(this.deck.takeTopCard());
		this.dealerHand.push(this.deck.takeTopCard());
		this.playerSum = this.sumOfHand(this.playerHand);
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
	playBlackJackGame,
};
