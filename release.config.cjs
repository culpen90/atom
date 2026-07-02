'use strict';

const { execFileSync } = require('child_process');

module.exports = {
  branches: ['master'],
  repositoryUrl: getRepositoryUrl(),
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          'node script/semantic-release/update-version.js ${nextRelease.version}-dev'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    [
      '@semantic-release/github',
      {
        failComment: false,
        releasedLabels: false,
        successComment: false
      }
    ]
  ]
};

function getRepositoryUrl() {
  if (process.env.GITHUB_REPOSITORY) {
    return `https://github.com/${process.env.GITHUB_REPOSITORY}.git`;
  }

  return execFileSync('git', ['config', '--get', 'remote.origin.url'], {
    encoding: 'utf8'
  }).trim();
}
