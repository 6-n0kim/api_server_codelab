const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { pool, testConnection } = require('./config/database');
const logger = require('./utils/logger');
const mountRoutes = require('./api/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors()); // CORS 설정
app.use(helmet({
    contentSecurityPolicy: false // CSP 완전히 비활성화
})); // 보안 헤더 설정
app.use(express.json()); // JSON 요청 본문 파싱
app.use(express.urlencoded({ extended: true })); // URL 인코딩된 요청 본문 파싱
app.use(express.static('public')); // 정적 파일 제공

// Pino 로깅 미들웨어
app.use((req, res, next) => {
    logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
});


// 기본 라우트
app.get('/', (req, res) => {
    res.json({
        message: 'API 서버 실행 중',
        version: '1.0.0',
        timestamp: new Date().toISOString()
     });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

mountRoutes(app);


async function startServer(){
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
            process.exit(1);
        }

        app.listen(PORT,'0.0.0.0', () => {
            logger.info(`Server is running on port ${PORT}`);
            logger.info(`Database connected: ${isConnected}`);
            logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger.info(`Server started at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();