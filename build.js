'use strict';

const fs = require('node:fs');
const path = require('node:path');

const output = path.join(__dirname, 'public');
const files = [
  'index.html',
  'app.js',
  'pdf-export.js',
  'styles.css',
  'assets/rtncn-logo.png',
];

fs.rmSync(output, { recursive: true, force: true });

for (const relativePath of files) {
  const source = path.join(__dirname, relativePath);
  const destination = path.join(output, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error('Missing required website asset: ' + relativePath);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

console.log('QA70: static website files prepared in public/');
