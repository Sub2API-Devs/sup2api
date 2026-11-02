// What a compiled CLI reports as its Node.js version, read from its real entry:
// the ELF runs `--version` with a Bun preload (BUN_OPTIONS) that records
// process.version and process.versions.node when the process exits, after the
// entry (and the runtime version module it imports first, runtime-version.js)
// has been evaluated. A preload runs ahead of the entry, so it reads the value
// the entry left, not the compiler's. Linux x64 only (the ELF must run here);
// package-release.cjs and the Worker image refuse a CLI whose value is not the
// profile's runtimeVersion.
//   node runtime-check.cjs <ELF> [expected-version]
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { spawnSync } = require('node:child_process');

function reportedRuntime(binary) {
  if (process.platform !== 'linux' || process.arch !== 'x64') throw Error('The runtime version check runs the Linux x64 CLI: run it on Linux x64 (node:22-bookworm-slim)');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccg-runtime-check-'));
  try {
    const out = path.join(dir, 'runtime.json'), probe = path.join(dir, 'probe.cjs');
    fs.writeFileSync(probe, `process.on('exit', () => require('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify({ version: process.version, node: process.versions.node })));\n`);
    const home = path.join(dir, 'home');
    fs.mkdirSync(home);
    const run = spawnSync(path.resolve(binary), ['--version'], { cwd: dir, timeout: 60000, encoding: 'utf8',
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), DISABLE_AUTOUPDATER: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1', BUN_OPTIONS: `--preload=${probe}` } });
    if (run.error) throw run.error;
    if (run.status !== 0) throw Error(`The CLI --version exited ${run.status}: ${String(run.stderr).slice(0, 500)}`);
    if (!fs.existsSync(out)) throw Error('The CLI did not run the runtime probe (BUN_OPTIONS preload)');
    return { ...JSON.parse(fs.readFileSync(out, 'utf8')), versionLine: String(run.stdout).trim() };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// checkRuntime refuses a CLI that does not report expected (vX.Y.Z) as both
// process.version and process.versions.node.
function checkRuntime(binary, expected) {
  const reported = reportedRuntime(binary);
  if (reported.version !== expected || reported.node !== expected.slice(1)) throw Error(`The CLI reports Node.js ${reported.version} (versions.node ${reported.node}), not the official ${expected} (profile runtimeVersion)`);
  return reported;
}

module.exports = { reportedRuntime, checkRuntime };
if (require.main === module) {
  const [binary, expected] = process.argv.slice(2);
  if (!binary) throw Error('Usage: node runtime-check.cjs ELF [expected-version]');
  console.log(JSON.stringify(expected ? checkRuntime(binary, expected) : reportedRuntime(binary)));
}
