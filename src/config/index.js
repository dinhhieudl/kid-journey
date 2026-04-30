/**
 * Application configuration
 * @module config
 */
const path = require('path');

const config = {
  PORT: process.env.PORT || 3107,
  JWT_SECRET: process.env.JWT_SECRET || 'kid-journey-secret-change-me-in-production',
  JWT_EXPIRES_IN: '2h',
  BCRYPT_ROUNDS: 10,
  DATA_DIR: path.join(__dirname, '..', '..', 'data'),
  UPLOADS_DIR: path.join(__dirname, '..', '..', 'data', 'uploads'),
  DB_PATH: path.join(__dirname, '..', '..', 'data', 'kidjourney.db'),
  PUBLIC_DIR: path.join(__dirname, '..', '..', 'public'),
};

module.exports = config;
