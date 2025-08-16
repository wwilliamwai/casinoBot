const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { arrestedUsers } = require('../../game/blackJackState');
const { getUser, createUser, updateBalance, updateRobberyFailStreak } = require('../../database/db.js');

module.exports = {
	cooldown: 3600,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('rob')
		.setDescription('Chance to rob 10% from the user you select!')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('Your robbing target')
				.setRequired(true),
		),
	async execute(interaction) {
		const targetUser = interaction.options.getUser('target');
		const targetID = targetUser.id;
		const robberID = interaction.user.id;

		// don't rob the casinoBot bro that's weird
		if (targetID === '1396921157936091156') {
			await interaction.reply({ content: 'Sorry you can\'t rob me that is weird', flags: MessageFlags.Ephemeral });
			resetCooldown(robberID, interaction);
			return;
		}
		if (targetID === robberID) {
			await interaction.reply({ content: 'wait you can\'t rob yourself? what are you doing!?', flags: MessageFlags.Ephemeral });
			resetCooldown(robberID, interaction);
			return;
		}

		try {
			let robber = await getUser(robberID);
			const target = await getUser(targetID);

			// check if the robber or target data even exists
			if (!target) {
				await interaction.reply({ content: 'that target hasn\'t earned any money yet!', flags: MessageFlags.Ephemeral });
				resetCooldown(robberID, interaction);
				return;
			}
			if (!robber) {
				const name = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
				robber = await createUser(robberID, name, 0);
			}

			const robberBalance = robber.balance;
			const targetBalance = target.balance;
			const ratio = robberBalance / targetBalance;

			const robberFailStreak = robber.robberyfailstreak;

			// you cant rob someone with no money
			if (targetBalance <= 0) {
				await interaction.reply({ content: 'the target is poor and why are you trying to rob air!?', flags: MessageFlags.Ephemeral });
				resetCooldown(robberID, interaction);
				return;
			}
			// the maximum target has to at least form a ratio of 0.01
			if (ratio < 0.01) {
				await interaction.reply({ content: `out of range. please choose a target under **$${Math.floor(robberBalance / 0.01)}**`, flags: MessageFlags.Ephemeral });
				resetCooldown(robberID, interaction);
				return;
			}

			const robChance = calculateRobChance(targetBalance, robberBalance, robberFailStreak);

			const embed = createEmbedElement(robberFailStreak, robChance, targetID, targetUser, interaction);
			const row = createButtons();

			const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

			// create the collector to take player input
			const collector = response.resource.message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300_000 });

			collector.on('collect', async (i) => {
				if (i.user.id != interaction.user.id) {
					await i.reply({ content: 'not the right person??', flags: MessageFlags.Ephemeral });
					return;
				}

				collector.resetTimer();

				if (i.customId === 'rob') {
					if (Math.random() <= robChance) {
						await rob(targetID, robberID, targetBalance, interaction);
					}
					else {
						await failedRob(robberID, robber, robChance, interaction);
					}
					collector.stop('rob');
				}
				else if (i.customId === 'abort') {
					await interaction.editReply({ content: 'crime aborted. cooldown reset!', embeds: [], components: [] });
					resetCooldown(robberID, i);
					collector.stop('abort');
				}
				i.deferUpdate();
			});
		}
		catch (error) {
			console.error('Error processing the rob command', error);
			await interaction.editReply({ content: 'Something went wrong while trying to rob', flags: MessageFlags.Ephemeral });
		}
	},
};

// functions
const resetCooldown = (robberID, interaction) => {
	const { cooldowns } = interaction.client;
	const timestamps = cooldowns.get('rob');

	timestamps.delete(robberID);
};

const rob = async (targetID, robberID, targetBalance, interaction) => {
	let moneyRobbed = Math.floor(targetBalance * 0.10);

	// the target has to have at least 1 dollar, so just rob that dollar
	if (moneyRobbed < 1) {
		moneyRobbed = 1;
	}

	await updateBalance(robberID, moneyRobbed);
	await updateBalance(targetID, -moneyRobbed);

	// reset the fail streak to 0
	await updateRobberyFailStreak(robberID, 0);

	await interaction.editReply({ content: `congratulations <@${robberID}>! you managed to rob <@${targetID}> to earn **$${moneyRobbed}!**`, embeds: [], components: [] });
};

const failedRob = async (robberID, robber, robChance, interaction) => {
	arrestedUsers.set(robberID, Date.now());
	const moneyLost = Math.floor(robber.balance * 0.05);

	await updateBalance(robberID, -moneyLost);
	await updateRobberyFailStreak(robberID, robber.robberyfailstreak + 1);
	await interaction.editReply({ content: `<@${robberID}> with a probability of **${setChanceToPercent(robChance)}%**, you failed to rob your target! you now face a **15 minute** punishment. **no gambling!**`, embeds: [], components: [] });
};

const createEmbedElement = (robberFailStreak, robChance, targetID, targetUser, interaction) => {
	return new EmbedBuilder()
		.setColor(0x1426c9)
		.setAuthor({
			name: `${interaction.user.globalName}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('Robbery')
		.setTimestamp(Date.now())
		.setDescription(
			`Probability of Success: **${setChanceToPercent(robChance)}%**\nRobbery Fail Streak: ${robberFailStreak}\n\nDo you wish to continue the robbery on **${targetUser.globalName}**?`,
		);
};

const createButtons = () => {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('rob')
			.setLabel('rob\u{1F4B0}')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('abort')
			.setLabel('abort\u{1F3C3}')
			.setStyle(ButtonStyle.Secondary),
	);
};

const setChanceToPercent = (robChance) => {
	return Math.trunc(robChance * 10000) / 100;
};

const calculateRobChance = (targetBalance, robberBalance, robberFailStreak) => {
	let chance = robberBalance / (targetBalance * Math.pow(0.80, robberFailStreak));
	if (chance > 0.70) {
		chance = 0.70;
	}
	return chance;
};
