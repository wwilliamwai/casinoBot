const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const litter = ['\u{1F9FB}', '\u{1F964}', '\u{1F37E}', '\u{1F36B}', '\u{1F9C3}'];

async function cleaning(interaction, moneyEarned) {
	const isTrash = ['', '', '', '', ''];

	for (let i = 0; i < isTrash.length; i++) {
		if (Math.random() < 0.5) {
			isTrash[i] = litter[Math.floor(Math.random() * litter.length)];
		}
	};
	// if there are no pieces of trash
	if (!isTrash.some(Boolean)) {
		isTrash[Math.floor(Math.random() * isTrash.length)] = litter[Math.floor(Math.random() * litter.length)];
	}

	const row = createActionRow({ isTrash });

	const response = await interaction.reply({ content: 'click the pieces of trash!', components: [row], withResponse: true });

	const filter = (i) => i.user.id === interaction.user.id;

	const collector = response.resource.message.createMessageComponentCollector({
		filter: filter,
		componentType: ComponentType.Button,
		time: 30_000 });

	const numTrash = isTrash.filter(Boolean).length;
	const collectedTrashID = [];

	return new Promise((resolve) => {
		collector.on('collect', async i => {
			collector.resetTimer();
			const buttonId = parseInt(i.customId);
			if (isTrash[buttonId] && !collectedTrashID.includes(buttonId)) {
				collectedTrashID.push(buttonId);
				await interaction.editReply({ content: 'click the pieces of trash!', components: [createActionRow({ isTrash, collectedTrashID })] });
			}

			await i.deferUpdate();

			if (collectedTrashID.length >= numTrash) {
				collector.stop('clickedAll');
			}
		});

		collector.on('end', async (collected, reason) => {
			switch (reason) {
			case 'messageDelete':
				resolve(false);
				break;
			case 'time':
				await interaction.editReply({ content: 'sorry you took too long to clean up', components: [] });
				resolve(false);
				break;
			case 'clickedAll':
				await interaction.editReply({ content: `\u{1F5D1} you earned **$${moneyEarned}** from collecting the trash!`, components: [] });
				resolve(true);
				break;
			}
		});
	});
}

const createActionRow = ({ isTrash, collectedTrashID = [] }) => {
	return new ActionRowBuilder().addComponents(createCleaningButtons(isTrash, collectedTrashID));
};

const createCleaningButtons = (isTrash, collectedTrashID) => {
	const buttons = [];

	for (let i = 0; i < isTrash.length; i++) {
		buttons.push(new ButtonBuilder()
			.setCustomId(`${i}`)
			.setLabel(isTrash[i] && !collectedTrashID.includes(i) ? isTrash[i] : '-')
			.setStyle(ButtonStyle.Secondary));
	}
	return buttons;
};

module.exports = {
	cleaning,
};