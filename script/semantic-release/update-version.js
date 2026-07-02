'use strict';

const fs = require('fs');
const path = require('path');

const repositoryRootPath = path.resolve(__dirname, '..', '..');
const version = process.argv[2];
const isDryRun = process.argv.includes('--dry-run');
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!version || !versionPattern.test(version)) {
  console.error(
    'Usage: node script/semantic-release/update-version.js <semver> [--dry-run]'
  );
  process.exit(1);
}

for (const filePath of [
  path.join(repositoryRootPath, 'package.json'),
  path.join(repositoryRootPath, 'package-lock.json')
]) {
  updateJsonVersion(filePath, version);
}

function updateJsonVersion(filePath, nextVersion) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  metadata.version = nextVersion;

  if (isDryRun) {
    console.log(
      `${path.relative(repositoryRootPath, filePath)} -> ${nextVersion}`
    );
    return;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(metadata, null, 2)}\n`);
}
