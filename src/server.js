/**
 * Server entry point
 * @module server
 */
const config = require('./config');
const app = require('./app');
const { runMigration } = require('./database/migrate');

// Run migrations on startup
runMigration();

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`🧒 Kid Journey running at http://0.0.0.0:${config.PORT}`);
});
