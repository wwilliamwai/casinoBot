const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

async function mining(interaction, moneyEarned) {
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

		collector.on('collect', async i => {
			collector.resetTimer();
			if (i.customId === 'mine') {
				timesClicked++;

				await i.deferUpdate();

				if (timesClicked >= 3) {
					collector.stop('clickedEnough');
				}
			}
		});
		collector.on('end', async (collected, reason) => {
			if (reason === 'messageDelete') {
				resolve(false);
			}
			if (reason === 'time') {
				await interaction.editReply({ content: 'sorry you took too long to mine', components: [] });
				resolve(false);
			}
			if (reason === 'clickedEnough') {
				await interaction.editReply({ content: `🪨🪨🪨 you earned **$${moneyEarned}** from mining!`, components: [] });
				resolve(true);
			}
		});
	});
}

module.exports = {
	mining,
};