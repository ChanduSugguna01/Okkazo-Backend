require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const eurekaClient = require('./config/eureka');
const emailService = require('./services/emailService');
const emailEventConsumer = require('./kafka/emailEventConsumer');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email service is running',
    timestamp: new Date().toISOString(),
    smtp: {
      configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    },
  });
});

// Test email endpoint (for development/testing)
app.post('/api/email/test', async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required',
      });
    }

    const result = await emailService.sendTestEmail(to);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Server configuration
const PORT = process.env.PORT || 8083;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Start server
const startServer = async () => {
  try {
    // Initialize email service
    await emailService.initialize();
    logger.info('Email service initialized');

    // Initialize and start Kafka consumer
    await emailEventConsumer.initialize();
    await emailEventConsumer.startConsuming();
    logger.info('Kafka consumer initialized and started');

    // Start Eureka client
    if (process.env.EUREKA_REGISTER_WITH_EUREKA !== 'false') {
      eurekaClient.start();
      logger.info('Eureka client started');
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`Service: ${process.env.SERVICE_NAME || 'email-service'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Stop Kafka consumer
          await emailEventConsumer.shutdown();
          logger.info('Kafka consumer stopped');

          // Stop Eureka client
          eurekaClient.stop();
          logger.info('Eureka client stopped');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
