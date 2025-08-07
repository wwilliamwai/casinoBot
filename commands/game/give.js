const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getUser, createUser, updateBalance } = require('../../database/db.js');

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
		const receiverID = receivingUser.id;
		const senderID = interaction.user.id;

		// if you try sending it to the casinoBot itself
		if (receiverID === '1396921157936091156') {
			await interaction.reply({ content: 'Sorry I can\'t hold any money donate to someone else :3', flags: MessageFlags.Ephemeral });
			return;
		}

		const money = interaction.options.getNumber('money');

		try {

			const sender = getUser(senderID);

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
				else {
					const receiver = getUser(receiverID);

					// if the receiver data doesn't yet exist
					if (!receiver) {
						const name = receivingUser.globalName ? receivingUser.globalName : receivingUser.username;
						createUser(receiverID, name, 0);
					}
					updateBalance(senderID, -money);
					updateBalance(receiverID, money);

					await interaction.reply(`${interaction.user} gave $${money} to ${receivingUser}!`);
				}
			}
			else {
				await interaction.reply({ content: `${interaction.user}. You haven't collected any money yet. Do **/daily** to earn your first paycheck!`, flags: MessageFlags.Ephemeral });
			}
		}
		catch (error) {
			console.error('Error processing the give command', error);
			await interaction.reply({ content: 'Something went wrong while processing the give command', flags: MessageFlags.Ephemeral });
		}
	},
};