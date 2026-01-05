const { Pool} = require('pg');

const logger = require('../utils/logger');

// Cloud Run에서는 Unix socket을 사용, 로컬에서는 TCP 사용
const isCloudRun = process.env.K_SERVICE !== undefined;
const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME || 'lbstech-codelab:asia-northeast3:lbstech-codelab';

const poolConfig = {
    user: process.env.DB_USER || 'KJY',
    database: process.env.DB_NAME || 'KJY',
    password: process.env.DB_PASSWORD || 'aiccaicc',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Cloud Run 환경이면 Unix socket 사용, 아니면 TCP 사용
if (isCloudRun) {
    poolConfig.host = `/cloudsql/${instanceConnectionName}`;
    logger.info(`Using Unix socket for Cloud SQL: ${poolConfig.host}`);
} else {
    poolConfig.host = process.env.DB_HOST || '34.64.194.157';
    poolConfig.port = process.env.DB_PORT || 5432;
    logger.info(`Using TCP connection: ${poolConfig.host}:${poolConfig.port}`);
}

const pool = new Pool(poolConfig);

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