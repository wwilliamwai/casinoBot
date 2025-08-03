const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const userDataPath = path.join(__dirname, '../../userData.json');

module.exports = {
	category: 'game',
	data: new SlashCommandBuilder()
		.setName('give')
		.setDescription('Give your money to someone else')
		.addUserOption(option =>
			option.setName('receiver')
				.setDescription('This user will receieve money')
				.setRequired(true),
		)
		.addNumberOption(option =>
			option.setName('money')
				.setDescription('The amount that will be received')
				.setRequired(true),
		),
	async execute(interaction) {
		const receivingUser = interaction.options.getUser('receiver');

		// if you try sending it to the casinoBot itself
		if (receivingUser.id === '1396921157936091156') {
			await interaction.reply({ content: 'Sorry I can\'t hold any money donate to someone else :3', flags: MessageFlags.Ephemeral });
			return;
		}

		const money = interaction.options.getNumber('money');

		try {
			const data = await fs.promises.readFile(userDataPath, 'utf8');
			const userData = JSON.parse(data);

			const sender = userData.users.find((targetUser) => targetUser.userID === interaction.user.id);

			// if the sender exists in the file
			if (sender) {
				// if they are trying to send too much
				if (sender.balance < money) {
					await interaction.reply({ content: 'You do not have enough money!', flags: MessageFlags.Ephemeral });
					return;
				}
				// if they are trying to send an invalid amount
				else if (money <= 0) {
					await interaction.reply({ content: 'That is not a valid amount of money!', flags: MessageFlags.Ephemeral });
					return;
				}
				// otherwise if they don't alreayd exist
				else {
					let receiver = userData.users.find((targetUser) => targetUser.userID === receivingUser.id);
					const name = receivingUser.globalName ? receivingUser.globalName : receivingUser.username;
					if (!receiver) {
						receiver = {
							userID: receivingUser.id,
							name: name,
							balance: 0,
							blackJackStreak: 0,
							lastWageDate: yesterday,
						};
						userData.users.push(receiver);
					}
					sender.balance -= money;
					receiver.balance += money;

					await fs.promises.writeFile(userDataPath, JSON.stringify(userData, null, 2));
					await interaction.reply(`${interaction.user} gave $${money} to ${receivingUser}!`);
				}
			}
		}
		catch (error) {
			console.error('Error processing the give command', error);
			await interaction.reply({ content: 'Something went wrong while processing the give command!', flags: MessageFlags.Ephemeral });
		}
	},
};