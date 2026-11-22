const mongoose = require('mongoose');
const dns = require('dns');
const log = require('../utils/logger');

// Configure reliable DNS servers to guarantee SRV lookups on cloud/Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in sandboxed runtimes
}

// Modified connectDB to accept the URI as an argument with retry logic
const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    log.error('DB', 'MongoDB Connection Error: URI is missing.');
    return;
  }
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    log.success('DB', 'MongoDB Connected Successfully');
    return conn;
  } catch (error) {
    log.error('DB', `MongoDB Connection Error: ${error.message}`);
    log.warn('DB', 'Scheduling MongoDB reconnection attempt in 10 seconds...');
    setTimeout(() => connectDB(mongoUri), 10000);
  }
};

module.exports = connectDB;

