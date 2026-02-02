const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Module state
let transporter = null;

const createTransporter = () => {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    logger.info('Email transporter created successfully');
    return transporter;
  } catch (error) {
    logger.error('Error creating email transporter:', error);
    throw error;
  }
};

const verifyConnection = async () => {
  try {
    if (!transporter) {
      createTransporter();
    }

    await transporter.verify();
    logger.info('SMTP connection verified successfully');
    return true;
  } catch (error) {
    logger.error('SMTP connection verification failed:', error);
    return false;
  }
};

const getTransporter = () => {
  if (!transporter) {
    createTransporter();
  }
  return transporter;
};

module.exports = {
  createTransporter,
  verifyConnection,
  getTransporter,
};
