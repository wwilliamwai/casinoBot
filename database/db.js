const Database = require('better-sqlite3');

// Create or open SQLite database
const db = new Database('database/users.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    userid TEXT PRIMARY KEY,
    name TEXT,
    balance INTEGER,
    blackjackstreak INTEGER,
    lastwagedate TEXT,
    robberyfailstreak INTEGER,
	lastrehabdaste TEXT
  )
`).run();

// Functions
function getUser(userID) {
	return db.prepare('SELECT * FROM users WHERE userID = ?').get(userID);
}

function createUser(userID, name) {
	db.prepare(`
    INSERT OR IGNORE INTO users (userid, name, balance, blackjackstreak, lastwagedate, robberyfailstreak)
    VALUES (?, ?, 0, 0, NULL, 0)
  `).run(userID, name);
	return getUser(userID);
}

function getAllUsers() {
	 return db.prepare('SELECT * FROM users').all();
}

function updateBalance(userID, amount) {
	db.prepare('UPDATE users SET balance = balance + ? WHERE userID = ?').run(amount, userID);
}

function updateBlackJackStreak(userID, blackJackStreak) {
	db.prepare('UPDATE users SET blackjackstreak = ? WHERE userID = ?').run(blackJackStreak, userID);
}
function updateLastWageDate(userID, lastWageDate) {
	db.prepare('UPDATE users SET lastwagedate = ? WHERE userID = ?').run(lastWageDate, userID);
}
function updateRobberyFailStreak(userID, failStreak) {
	db.prepare('UPDATE users SET robberyfailstreak = ? WHERE userID = ?').run(failStreak, userID);
}

function updateLastRehabDate(userID, rehabDate) {
	db.prepare('UPDATE users SET lastrehabdate = ? WHERE userID = ?').run(rehabDate, userID);
}

module.exports = {
	getUser,
	createUser,
	getAllUsers,
	updateBalance,
	updateBlackJackStreak,
	updateLastWageDate,
	updateRobberyFailStreak,
	updateLastRehabDate,
};