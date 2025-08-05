#!/usr/bin/env node

// MCP Server wrapper script
// This script ensures proper module resolution and error handling

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up module resolution
const require = createRequire(import.meta.url);

// Add current directory to module path
process.env.NODE_PATH = join(__dirname, 'node_modules') + ':' + (process.env.NODE_PATH || '');

try {
  // Import and run the main server
  const { default: main } = await import('./dist/index.js');
} catch (error) {
  console.error('Failed to start Enhanced Sequential Thinking MCP Server:', error.message);
  console.error('Make sure all dependencies are installed: npm install');
  process.exit(1);
}