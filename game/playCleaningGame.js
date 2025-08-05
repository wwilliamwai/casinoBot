const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const litter = ['\u{1F9FB}', '\u{1F964}', '\u{1F37E}', '\u{1F36B}', '\u{1F9C3}'];

async function cleaning(interaction) {
	const isTrash = [false, false, false, false, false];

	for (let i = 0; i < isTrash.length; i++) {
		if (Math.random() < 0.4) {
			isTrash[i] = true;
		}
	};
	// if there are no pieces of trash
	if (!isTrash.some((i) => i === true)) {
		isTrash[Math.floor(Math.random() * isTrash.length)] = true;
	}

	const cleaningButtons = createCleaningButtons(isTrash);
	const row = new ActionRowBuilder().addComponents(cleaningButtons);

	const response = await interaction.reply({ content: 'click the pieces of trash!', components: [row], withResponse: true });

	const filter = (i) => i.user.id === interaction.user.id;

	const collector = response.resource.message.createMessageComponentCollector({
		filter: filter,
		componentType: ComponentType.Button,
		time: 45_000 });

	const numTrash = isTrash.filter(Boolean).length;
	const uniquetrashID = [];

	return new Promise((resolve) => {
		collector.on('collect', async i => {
			const buttonId = parseInt(i.customId);
			if (isTrash[buttonId] && !uniquetrashID.includes(buttonId)) {
				uniquetrashID.push(buttonId);
			}

			if (uniquetrashID.length >= numTrash) {
				collector.stop('clickedAll');
			}
			else {
				await i.deferUpdate();
			}
		});

		collector.on('end', async (collected, reason) => {
			if (reason === 'messageDelete') {
				resolve(false);
			}
			if (reason === 'time') {
				await interaction.editReply({ content: 'sorry you took too long to clean up', components: [] });
				resolve(false);
			}
			if (reason === 'clickedAll') {
				await interaction.editReply({ content: 'you earned $100 from collecting all the trash!', components: [] });
				resolve(true);
			}
		});
	});
}

const createCleaningButtons = (isTrash) => {
	const buttons = [];

	for (let i = 0; i < isTrash.length; i++) {
		if (isTrash[i] === true) {
			const litterEmoji = litter[Math.floor(Math.random() * litter.length)];

			buttons.push(new ButtonBuilder()
				.setCustomId(`${i}`)
				.setLabel(litterEmoji)
				.setStyle(ButtonStyle.Secondary));
		}
		else {
			buttons.push(new ButtonBuilder()
				.setCustomId(`${i}`)
				.setLabel('-')
				.setStyle(ButtonStyle.Secondary));
		}
	}
	return buttons;
};

module.exports = {
	cleaning,
};