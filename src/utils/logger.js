const pino = require('pino');

// 운영 환경(production)이 아닐 때만 pino-pretty 사용
const transport = process.env.NODE_ENV !== 'production' 
    ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
      }
    : undefined;

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: transport
});

module.exports = logger;