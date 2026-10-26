// npm test: the version-independent tests (test/*.test.mjs) and the native
// reconciliation tests of the Claude Code version under test
// (test/native/<version>/*.test.mjs; CCG_CLI_VERSION, else the newest
// profile). Extra arguments go to node --test.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { version } from './artifacts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const native = path.join(here, 'native', version);
if (!fs.existsSync(native)) throw Error(`No native tests for Claude Code ${version} (test/native/${version})`);
const files = [here, native].flatMap(dir => fs.readdirSync(dir).filter(name => name.endsWith('.test.mjs')).sort().map(name => path.join(dir, name)));
process.stderr.write(`CCG_CLI_TEST_VERSION ${version}: ${files.length} test files\n`);
const run = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], { stdio: 'inherit', env: { ...process.env, CCG_CLI_VERSION: version } });
process.exitCode = run.status ?? 1;
