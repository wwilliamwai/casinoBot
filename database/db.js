const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '/users.db');

const db = new Database(dbPath);

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    userID TEXT PRIMARY KEY,
    name TEXT,
    balance INTEGER,
    blackJackStreak INTEGER,
    lastWageDate TEXT
  )
`).run();

// functions

function getUser(userID) {
	return db.prepare('SELECT * FROM users WHERE userID = ?').get(userID);
}

function createUser(userID, name, amount) {
	db.prepare(`
    INSERT OR IGNORE INTO users (userID, name, balance, blackJackStreak, lastWageDate)
    VALUES (?, ?, ?, 0, NULL)
  `).run(userID, name, amount);
}

function updateBalance(userID, amount) {
	db.prepare('UPDATE users SET balance = balance + ? WHERE userID = ?').run(amount, userID);
}

function updateAfterBlackJack(userID, amount, blackJackStreak) {
	db.prepare('UPDATE users SET balance = balance + ?, blackJackStreak = ? WHERE userID = ?').run(amount, blackJackStreak, userID);
}

function updateLastWageDate(userID, lastWageDate) {
	db.prepare('UPDATE users SET lastWageDate = ? WHERE userID = ?').run(lastWageDate, userID);
}

function getAllUsers() {
	return db.prepare('SELECT * FROM users').all();
}
module.exports = {
	getUser,
	createUser,
	updateBalance,
	updateAfterBlackJack,
	updateLastWageDate,
	getAllUsers,
};