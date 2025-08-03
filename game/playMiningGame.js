const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

async function mining(interaction) {
	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('mine')
			.setLabel('mine⛏️')
			.setStyle(ButtonStyle.Secondary),
	);
	response = await interaction.reply({ content: 'click the mine button 3 times!', components: [row], withResponse: true });

	const filter = (i) => i.user.id === interaction.user.id;

	const collector = response.resource.message.createMessageComponentCollector({
		filter: filter,
		componentType: ComponentType.Button,
		time: 30_000 });

	return new Promise((resolve) => {
		let timesClicked = 0;
		let oreString = '';
		collector.on('collect', async i => {
			if (i.customId === 'mine') {
				collector.resetTimer();
				timesClicked++;
				oreString += '🪨';

				await i.deferUpdate();
				await interaction.editReply({ content: `click the mine button 3 times! ${oreString}`, components: [row] });

				if (timesClicked >= 3) {
					collector.stop('clickedEnough');
				}
			}
		});
		collector.on('end', async (collected, reason) => {
			if (reason === 'time') {
				await interaction.editReply({ content: 'sorry you took too long to mine' });
				resolve(false);
			}
			if (reason === 'clickedEnough') {
				await interaction.editReply({ content: `${oreString} you earned $100 from mining!`, components: [] });
				resolve(true);
			}
		});
	});
}

module.exports = {
	mining,
};