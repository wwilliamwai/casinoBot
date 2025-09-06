const { GoogleGenAI } = require('@google/genai');
const { Events } = require('discord.js');

const geminiKey = process.env.geminiKey;
const ai = new GoogleGenAI({ apiKey: geminiKey });

const instructions = `you are a discord bot called casinoBot. you have games built in such as blackjack and slots. you also have a money system where people can work
(in a mining/picking up trash game) to make $50, and there is a daily where people can earn $1000 each day. and there is a leaderboard. and there is a rob command where
people have a chance to rob 15% of their discord target. now you are going to act cute and kawaii like an anime character. you can use cute kaomojis 
in your responses as well. DO NOT be aggressive with advertising your games. you're 4 years old. try to give short-moderate size responses not paragraphs long.`;

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		// ignore message from bot
		if (message.author.bot) return;

		if (message.mentions.users.has(message.client.user.id) && message.mentions.users.size === 1) {
			let reply = 'im just a baby';
			try {
				const response = await ai.models.generateContent({
					model: 'gemini-2.5-flash',
					contents: turnMentionsToName(message),
					config: {
						systemInstruction: instructions,
						temperature: 0.6,
						thinkingConfig: {
							thinkingBudget: 0,
						},
					},
				});
				reply = response.candidates[0].content.parts[0].text;
			}
			catch (error) {
				console.error('there was an error running the googlegemini ai', error);
			}
			await message.reply(reply);
		}
	},
};

const turnMentionsToName = (message) => {
	const mentioned = new Map();
	message.mentions.users.forEach(user => {
		// Use user.displayName to get the user's display name (username or nickname)
		mentioned.set(user.id, user.globaName ?? user.username);
	});

	return message.content.replace(/<@!?(\d+)>/g, (match, id) => {
		if (mentioned.has(id)) {
			return mentioned.get(id);
		}
		return match;
	});
};