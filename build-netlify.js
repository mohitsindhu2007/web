// This script ensures that the _redirects file is copied to the dist folder during build
const fs = require('fs');
const path = require('path');

// Make sure the dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy the _redirects file to the dist folder
fs.copyFileSync(
  path.join(__dirname, 'public', '_redirects'),
  path.join(__dirname, 'dist', '_redirects')
);

console.log('_redirects file copied to dist folder successfully!');