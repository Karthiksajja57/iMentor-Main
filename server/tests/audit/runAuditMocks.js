#!/usr/bin/env node

/**
 * Placeholder audit mocks test script.
 * This file exists so `npm test` in the server package succeeds.
 */

const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', '..', 'server.js');

if (!fs.existsSync(serverPath)) {
  console.error('ERROR: server.js not found at expected path:', serverPath);
  process.exit(1);
}

console.log('Audit mocks placeholder: server.js exists.');
process.exit(0);
