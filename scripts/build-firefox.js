#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist', 'firefox');
const manifestSource = path.join(rootDir, 'manifest.firefox.json');
const manifestDestination = path.join(distDir, 'manifest.json');

const excludedTopLevel = new Set([
  '.git',
  '.github',
  'dist',
  'node_modules',
  'scripts'
]);

const excludedFiles = new Set(['manifest.chrome.json']);

function shouldCopy(relativePath) {
  if (!relativePath || relativePath.startsWith('..')) {
    return true;
  }

  const segments = relativePath.split(path.sep);
  if (excludedTopLevel.has(segments[0])) {
    return false;
  }

  const lastSegment = segments[segments.length - 1];
  if (lastSegment === '.DS_Store') {
    return false;
  }

  if (excludedFiles.has(relativePath) || excludedFiles.has(lastSegment)) {
    return false;
  }

  return true;
}

function copyRecursive(src, dest) {
  const relative = path.relative(rootDir, src);
  if (!shouldCopy(relative)) {
    return;
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      const childSrc = path.join(src, entry);
      const childDest = path.join(dest, entry);
      copyRecursive(childSrc, childDest);
    }
    return;
  }

  if (stats.isFile()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(manifestSource)) {
  console.error('Firefox manifest is missing at', manifestSource);
  process.exit(1);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of fs.readdirSync(rootDir)) {
  const srcPath = path.join(rootDir, entry);
  const destPath = path.join(distDir, entry);
  copyRecursive(srcPath, destPath);
}

fs.copyFileSync(manifestSource, manifestDestination);

console.log('Prepared Firefox build directory.');
console.log(`  Output directory: ${path.relative(rootDir, distDir)}`);
console.log(`  Manifest copied from: ${path.relative(rootDir, manifestSource)}`);
