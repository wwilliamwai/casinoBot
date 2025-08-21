const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const { activeGames } = require('../../game/blackJackState');
const { getUser, createUser, updateBalance, updateRobberyFailStreak } = require('../../database/db.js');

const maxRatio = 3;
const moneyTuneCoeff = 0.875;
const pityCoeff = 0.19;

module.exports = {
	cooldown: 3600,
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('rob')
		.setDescription('Chance to rob 25% from the user you select!')
		.addUserOption(option =>
			option.setName('target')
				.setDescription('Your robbing target')
				.setRequired(true),
		),
	async execute(interaction) {
		const robberID = interaction.user.id;

		if (await checkForActiveGames(robberID, interaction)) {
			return;
		}

		const targetUser = interaction.options.getUser('target');
		const targetID = targetUser.id;

		// don't rob the casinoBot bro that's weird
		if (targetID === '1396921157936091156') {
			await interaction.reply({ content: 'why do you want to rob me!!!! that\'s so mean!! ;-;', flags: MessageFlags.Ephemeral });
			resetCooldown(robberID, interaction);
			return;
		}
		else if (targetUser.bot) {
			await interaction.reply({ content: 'you can\'t rob me! im a bot!', flags: MessageFlags.Ephemeral });
			resetCooldown(robberID, interaction);
			return;
		}
		else if (targetID === robberID) {
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

			const robberFailStreak = robber.robberyfailstreak;

			// you cant rob someone with no money
			if (targetBalance <= 0) {
				await interaction.reply({ content: 'the target is poor and why are you trying to rob air!?', flags: MessageFlags.Ephemeral });
				resetCooldown(robberID, interaction);
				return;
			}
			// the maximum target has to have at least a 1% chance to rob
			if (calculateRobChance(targetBalance, robberBalance, 0) < 0.01) {
				await interaction.reply({ content: `out of range. please choose a target under **$${calculateMaxTargetBalance(robberBalance)}**`, flags: MessageFlags.Ephemeral });
				resetCooldown(robberID, interaction);
				return;
			}

			const robChance = calculateRobChance(targetBalance, robberBalance, robberFailStreak);

			const embed = createEmbedElement(robberFailStreak, robChance, targetUser, interaction);
			const row = createButtons();

			const response = await interaction.reply({ embeds: [embed], components: [row], withResponse: true });

			// create the collector to take player input
			const collector = response.resource.message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300_000 });

			collector.on('collect', async (i) => {
				if (i.user.id != interaction.user.id) {
					await i.reply({ content: 'u are not the right person??', flags: MessageFlags.Ephemeral });
					return;
				}

				if (i.customId === 'rob') {
					collector.stop('rob');
				}
				else if (i.customId === 'abort') {
					collector.stop('abort');
				}
				i.deferUpdate();
			});

			collector.on('end', async (collected, reason) => {
				switch (reason) {
				case 'messageDelete':
					interaction.channel.send('umm why did you guys delete the robbery attempt??');
					resetCooldown(robberID, interaction);
					break;
				case 'time':
					interaction.editReply({ content: 'crime aborted. you guys took too long. cooldown reset!', embeds: [], components: [] });
					resetCooldown(robberID, interaction);
					break;
				case 'rob':
					if (Math.random() <= robChance) {
						await rob(targetID, robberID, targetBalance, robChance, interaction);
					}
					else {
						await failedRob(robberID, robber, robChance, interaction);
					}
					break;
				case 'abort':
					await interaction.editReply({ content: 'crime aborted. cooldown reset!', embeds: [], components: [] });
					resetCooldown(robberID, interaction);
					break;
				}
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

const rob = async (targetID, robberID, targetBalance, robChance, interaction) => {
	let moneyRobbed = Math.floor(targetBalance * 0.25);

	// the target has to have at least 1 dollar, so just rob that dollar
	if (moneyRobbed < 1) {
		moneyRobbed = 1;
	}

	await interaction.editReply({ content: `<@${robberID}> with a **${setChanceToPercent(robChance)}%** chance, you managed to rob <@${targetID}> to earn **$${moneyRobbed}!**`, embeds: [], components: [] });

	await updateBalance(robberID, moneyRobbed);
	await updateBalance(targetID, -moneyRobbed);

	// reset the fail streak to 0
	await updateRobberyFailStreak(robberID, 0);
};

const failedRob = async (robberID, robber, robChance, interaction) => {
	const moneyLost = Math.floor(robber.balance * 0.10);

	await interaction.editReply({ content: `<@${robberID}> with a **${setChanceToPercent(robChance)}%** chance, you failed to rob your target! you now have a **1 hour cooldown.**`, embeds: [], components: [] });

	await updateBalance(robberID, -moneyLost);
	await updateRobberyFailStreak(robberID, robber.robberyfailstreak + 1);
};

const createEmbedElement = (robberFailStreak, robChance, targetUser, interaction) => {
	const robberName = interaction.user.globalName ? interaction.user.globalName : interaction.user.username;
	const targetName = targetUser.globalName ? targetUser.globalName : targetUser.username;
	return new EmbedBuilder()
		.setColor(0x1426c9)
		.setAuthor({
			name: `${robberName}`,
			iconURL: interaction.user.displayAvatarURL(),
		})
		.setTitle('Robbery')
		.setTimestamp(Date.now())
		.setDescription(
			`Probability of Success: **${setChanceToPercent(robChance)}%**\nRobbery Fail Streak: ${robberFailStreak}\n\nDo you wish to continue the robbery on **${targetName}**?`,
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

const calculateMaxTargetBalance = (robberBalance) => {
	return Math.trunc((robberBalance + 1) / (Math.pow(99, -1 / 0.9)) - 1);
};

const calculateRobChance = (targetBalance, robberBalance, robberFailStreak) => {
	// that's dom and that's intentionally cuz i guess he needs 100% rob chance as robin hood.
	if (robberBalance < 0) {
		return 1;
	}
	const A = Math.min(Math.log(robberBalance + 1) - Math.log(targetBalance + 1), Math.log(maxRatio));
	return 1 / (1 + Math.pow(Math.E, -(moneyTuneCoeff * A + pityCoeff * robberFailStreak)));
};

const checkForActiveGames = async (interactionUserID, interaction) => {
	if (activeGames.has(interactionUserID)) {
		try {
			const existingGame = activeGames.get(interactionUserID).resource.message;
			await existingGame.reply({ content: `${interaction.user} you can\t rob anyone! you have a **game** going!` });
		}
		catch (error) {
			console.error('an error occured when reaching the existing game', error);
		}
		resetCooldown(interactionUserID, interaction);
		return true;
	}
	return false;
};
