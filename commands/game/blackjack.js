const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder, ButtonStyle } = require('discord.js');
const Cards = require('cards.js');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('blackjack')
		.setDescription('Play a game of blackjack')
		.addIntegerOption(option =>
			option.setName('bet')
				.setDescription('set the amount to bet')
				.setRequired(true),
		),
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
		const gameEmbed = createEmbedElement(deck, playerHand, dealerHand, interaction);
		// create row item
		const row = createHitStandButtons();
		// send the embeded message
		await interaction.reply({ embeds: [gameEmbed], components: [row], withResponse: true });

		/* const filter = (i) => i.user.id === interaction.user.id;

		const collector = response.resource.message.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 30_000 });

		collector.on('collect', async i => {
			if (i.customId === 'hit') {
				i.reply('you clicked on hit');
				return;
			}
		}); */
	},
};

// helper methods
/* const updateEmbedOnHit = async (deck, playerHand, dealerHand, interaction) => {
	playerHand.push(deck.takeTopCard());
	// create a new embed object
	const updatedEmbed = createEmbedElement(deck, playerHand, dealerHand, interaction);
	const buttons = createHitStayButtons();

	await interaction.editReply({ embeds: [updatedEmbed], components: [buttons] });
}; */

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

const createEmbedElement = (deck, playerHand, dealerHand, interaction) => {
	return new EmbedBuilder()
		.setColor(0x163d0f)
		.setAuthor({
			name: `${interaction.user.username}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('BlackJack')
		.setTimestamp(Date.now())
		.setDescription(`You | ${sumOfHand(playerHand)}\n${handToString(playerHand)}\n
Dealer | ${dealerHand[0][1]}+\n${handToString(dealerHand.slice(0, 1))}`);
};

const handToString = (hand) => {
	return hand.reduce((acc, currentCard) => {
		return acc + `\`${currentCard[1]}${currentCard[0].icon}\` `;
	}, '');
};

const sumOfHand = (hand) => {
	const sum = hand.reduce((acc, currentCard) => {
		return acc + faceCardsToNum(currentCard[1]);
	}, 0);
	if (sum > 21 && deck.some((currentCard) => currentCard[1] === 'ace')) {
		return sum - 9;
	}
	else {
		return sum;
	}
};

const faceCardsToNum = (cardVal) => {
	if (cardVal === 'jack' || cardVal === 'queen' || cardVal === 'king' || cardVal === 'ace') {
		return 10;
	}
	else {
		return cardVal;
	}
};