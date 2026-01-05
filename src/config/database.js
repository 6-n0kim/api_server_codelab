const { Pool} = require('pg');

const logger = require('../utils/logger');

const pool = new Pool({
    host: process.env.DB_HOST || '34.64.194.157',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'KJY',
    database: process.env.DB_NAME || 'KJY',
    password: process.env.DB_PASSWORD || 'aiccaicc',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('connect', (client) => {
    logger.info('Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
    logger.error('PostgreSQL pool error:', err.message, client);
});

async function testConnection() {
    try {
        const client = await pool.connect();
        logger.info('데이터베이스 연결 성공');
        client.release();
        return true;
    } catch (err) {
        logger.error('Database connection test failed:', err.message);
        return false;
    }
}

module.exports = {pool, testConnection};