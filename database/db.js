const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

// Create table if it doesn't exist
async function createTable() {
	const query = `
    CREATE TABLE IF NOT EXISTS users (
      userid TEXT PRIMARY KEY,
      name TEXT,
      balance INTEGER,
      blackjackstreak INTEGER,
      lastwagedate TEXT,
	  robberyfailstreak INTEGER,
    );
  `;
	await pool.query(query);
}

// Get one user by userID
async function getUser(userID) {
	const res = await pool.query('SELECT * FROM users WHERE userid = $1', [userID]);
	return res.rows[0];
}

// Create a new user if not exists
async function createUser(userID, name, amount) {
	const query = `
    INSERT INTO users (userid, name, balance, blackjackstreak, lastwagedate, robberyfailstreak)
    VALUES ($1, $2, $3, 0, NULL, 0)
    ON CONFLICT ("userid") DO NOTHING;
  `;
	await pool.query(query, [userID, name, amount]);
	return getUser(userID);
}

// Update balance by adding amount
async function updateBalance(userID, amount) {
	const query = `
    UPDATE users SET balance = balance + $1 WHERE userid = $2;
  `;
	await pool.query(query, [amount, userID]);
}

// Update balance and blackJackStreak
async function updateAfterBlackJack(userID, amount, blackJackStreak) {
	const query = `
    UPDATE users SET balance = balance + $1, blackjackstreak = $2 WHERE userid = $3;
  `;
	await pool.query(query, [amount, blackJackStreak, userID]);
}

// Update lastWageDate
async function updateLastWageDate(userID, lastWageDate) {
	const query = `
    UPDATE users SET lastwagedate = $1 WHERE userid = $2;
  `;
	await pool.query(query, [lastWageDate, userID]);
}

// Update robberyfailstreak
async function updateRobberyFailStreak(userID, failStreak) {
	const query = `
	UPDATE users SET robberyfailstreak = $1 WHERE userid = $2;
	`;
	await pool.query(query, [failStreak, userID]);
}

// Get all users
async function getAllUsers() {
	const res = await pool.query('SELECT * FROM users;');
	return res.rows;
}

module.exports = {
	createTable,
	getUser,
	createUser,
	updateBalance,
	updateAfterBlackJack,
	updateLastWageDate,
	updateRobberyFailStreak,
	getAllUsers,
};
