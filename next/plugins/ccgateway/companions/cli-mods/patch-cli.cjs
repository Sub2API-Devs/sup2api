// Dispatch only to an audited, hash-bound version-specific patcher.
const fs = require('node:fs');
const path = require('node:path');
const source = process.argv[2];
if (!source) throw Error('Usage: node patch-cli.cjs restored-source new-output-directory');
const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
if (!['2.1.304'].includes(version)) throw Error(`Unsupported Claude Code baseline: ${version}`);
require(`./patch-cli-${version}.cjs`);
