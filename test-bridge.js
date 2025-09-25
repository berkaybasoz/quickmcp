#!/usr/bin/env node

const { spawn } = require('child_process');

// Spawn the bridge
const bridge = spawn('node', ['mcp-bridge-fixed.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errors = '';

bridge.stdout.on('data', (data) => {
  output += data.toString();
  console.log('STDOUT:', data.toString());
});

bridge.stderr.on('data', (data) => {
  errors += data.toString();
  console.log('STDERR:', data.toString());
});

bridge.on('close', (code) => {
  console.log(`Bridge exited with code ${code}`);
  console.log('Full output:', output);
  console.log('Full errors:', errors);
});

// Send a tools/list request
const message = JSON.stringify({
  "method": "tools/list",
  "id": 2,
  "params": {}
});

console.log('Sending message:', message);
bridge.stdin.write(message + '\n');

// Wait 3 seconds then close
setTimeout(() => {
  console.log('Closing bridge...');
  bridge.stdin.end();
}, 3000);