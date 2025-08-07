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
      "userID" TEXT PRIMARY KEY,
      name TEXT,
      balance INTEGER,
      "blackJackStreak" INTEGER,
      "lastWageDate" TEXT
    );
  `;
	await pool.query(query);
}

// Get one user by userID
async function getUser(userID) {
	const res = await pool.query('SELECT * FROM users WHERE "userID" = $1', [userID]);
	return res.rows[0];
}

// Create a new user if not exists
async function createUser(userID, name, amount) {
	const query = `
    INSERT INTO users ("userID", name, balance, "blackJackStreak", "lastWageDate")
    VALUES ($1, $2, $3, 0, NULL)
    ON CONFLICT ("userID") DO NOTHING;
  `;
	await pool.query(query, [userID, name, amount]);
}

// Update balance by adding amount
async function updateBalance(userID, amount) {
	const query = `
    UPDATE users SET balance = balance + $1 WHERE "userID" = $2;
  `;
	await pool.query(query, [amount, userID]);
}

// Update balance and blackJackStreak
async function updateAfterBlackJack(userID, amount, blackJackStreak) {
	const query = `
    UPDATE users SET balance = balance + $1, "blackJackStreak" = $2 WHERE "userID" = $3;
  `;
	await pool.query(query, [amount, blackJackStreak, userID]);
}

// Update lastWageDate
async function updateLastWageDate(userID, lastWageDate) {
	const query = `
    UPDATE users SET "lastWageDate" = $1 WHERE "userID" = $2;
  `;
	await pool.query(query, [lastWageDate, userID]);
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
	getAllUsers,
};
