'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repositoryRootPath = path.resolve(__dirname, '..', '..');
const shouldPush = process.argv.includes('--push');
const isDryRun = process.argv.includes('--dry-run') || !shouldPush;

const packageMetadata = JSON.parse(
  fs.readFileSync(path.join(repositoryRootPath, 'package.json'), 'utf8')
);

const currentVersion = packageMetadata.version;
const currentVersionMatch = currentVersion.match(
  /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/
);

if (!currentVersionMatch) {
  fail(`Cannot seed semantic-release history from version ${currentVersion}.`);
}

const releaseTags = listReleaseTags();
const realReleaseTags = releaseTags.filter(tagName => tagName !== 'v0.0.0');

if (realReleaseTags.length > 0) {
  console.log(
    `Existing release tag found (${realReleaseTags[0]}); skipping baseline seed.`
  );
  process.exit(0);
}

const baselineVersion = getBaselineVersion(currentVersionMatch);
const baselineTagName = `v${baselineVersion}`;
const baselineCommit = getBaselineCommit(currentVersion);
const existingBaselineCommit = getTagCommit(baselineTagName);

if (existingBaselineCommit && existingBaselineCommit !== baselineCommit) {
  fail(
    `${baselineTagName} already points to ${existingBaselineCommit}, expected ${baselineCommit}.`
  );
}

if (!existingBaselineCommit) {
  const tagArgs = [baselineTagName, baselineCommit];
  console.log(`Seeding ${baselineTagName} at ${baselineCommit}.`);

  if (!isDryRun) {
    git(['tag', ...tagArgs]);
  }
}

if (shouldPush) {
  git(['push', 'origin', baselineTagName]);
} else {
  console.log(
    `Dry run only; rerun with --push to create and push ${baselineTagName}.`
  );
}

function listReleaseTags() {
  const output = git(['tag', '--merged', 'HEAD', '--list', 'v*']);

  return output
    .split(/\r?\n/)
    .map(tagName => tagName.trim())
    .filter(tagName => /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tagName))
    .sort(compareReleaseTags)
    .reverse();
}

function getBaselineVersion(match) {
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (patch > 0) {
    return `${major}.${minor}.${patch - 1}`;
  }

  if (minor > 0) {
    return `${major}.${minor - 1}.0`;
  }

  if (major > 1) {
    return `${major - 1}.0.0`;
  }

  fail(
    `Refusing to seed ${currentVersion} from a v0.0.0 baseline. Create the first real release tag manually.`
  );
}

function getBaselineCommit(version) {
  const versionCommits = git([
    'log',
    '--reverse',
    '--format=%H',
    '-S',
    `"version": "${version}"`,
    '--',
    'package.json'
  ])
    .split(/\r?\n/)
    .filter(Boolean);

  for (const commit of versionCommits) {
    const versionAtCommit = readPackageVersion(`${commit}:package.json`);

    if (versionAtCommit === version) {
      return git(['rev-parse', `${commit}^`]);
    }
  }

  fail(`Could not find the first commit that introduced ${version}.`);
}

function readPackageVersion(revision) {
  const contents = git(['show', revision]);
  const match = contents.match(/"version"\s*:\s*"([^"]+)"/);

  return match ? match[1] : null;
}

function getTagCommit(tagName) {
  try {
    return git(['rev-parse', `${tagName}^{commit}`], { silent: true });
  } catch (error) {
    return null;
  }
}

function compareReleaseTags(left, right) {
  const leftParts = left.slice(1).split(/[.-]/).map(Number);
  const rightParts = right.slice(1).split(/[.-]/).map(Number);

  for (let index = 0; index < 3; index++) {
    const difference = leftParts[index] - rightParts[index];

    if (difference !== 0) {
      return difference;
    }
  }

  return left.localeCompare(right);
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: repositoryRootPath,
    encoding: 'utf8',
    stdio: options.silent ? ['ignore', 'pipe', 'ignore'] : undefined
  }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
