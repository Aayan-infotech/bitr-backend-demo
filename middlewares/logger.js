import winston from 'winston';

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: './logs/combined.log' })
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});

const loggerMiddleware = (req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
};

export default loggerMiddleware;