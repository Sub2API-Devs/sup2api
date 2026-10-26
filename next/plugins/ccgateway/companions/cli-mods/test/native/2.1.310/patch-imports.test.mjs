// The patcher refuses an import it cannot pin (audit D3): a name the target
// module does not export, or a CLI module the profile does not hash-bind.
// Each case patches a copy of these sources with one such binding changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pinned } from '../../artifacts.mjs';
const { restored, nativeSkip } = pinned('2.1.310');

const mods = fileURLToPath(new URL('../../../', import.meta.url));
const packageFile = process.env.CCG_BABEL_PACKAGE || path.join(mods, 'package.json');
const profileName = 'profiles/linux-x64-2.1.310.json';

async function patchCopy(change) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-patch-imports-'));
  try {
    const copy = path.join(dir, 'mods');
    await fs.mkdir(path.join(copy, 'profiles'), { recursive: true });
    for (const name of await fs.readdir(mods)) if (/\.(c?js)$/.test(name)) await fs.copyFile(path.join(mods, name), path.join(copy, name));
    await fs.cp(path.join(mods, 'patches'), path.join(copy, 'patches'), { recursive: true });
    await fs.copyFile(path.join(mods, profileName), path.join(copy, profileName));
    await change(copy);
    return await new Promise(resolve => execFile(process.execPath, [path.join(copy, 'patch-cli.cjs'), fileURLToPath(restored), path.join(dir, 'out')],
      { env: { ...process.env, CCG_BABEL_PACKAGE: packageFile }, maxBuffer: 8 << 20, timeout: 180000 },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stderr })));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}
async function editProfile(copy, change) {
  const file = path.join(copy, profileName);
  const profile = JSON.parse(await fs.readFile(file, 'utf8'));
  change(profile);
  await fs.writeFile(file, JSON.stringify(profile));
}

test('the patcher refuses a native binding the CLI does not export or the profile does not bind', { skip: nativeSkip('patcher import checks') }, async () => {
  const [missingExport, unbound, unmapped] = await Promise.all([
    patchCopy(copy => editProfile(copy, profile => { profile.natives.build.isBillingHeader = 'chunk-q1myka9a.js:ccgMissing'; })),
    patchCopy(copy => editProfile(copy, profile => { delete profile.modules['chunk-a5n97xgg.js']; })),
    patchCopy(copy => editProfile(copy, profile => { delete profile.coreScope.isGitRepo; })),
  ]);
  assert.notEqual(missingExport.code, 0);
  assert.match(missingExport.stderr, /ccgateway-native-build\.js imports ccgMissing from chunk-q1myka9a\.js, which does not export it/);
  assert.notEqual(unbound.code, 0);
  // querySourceFor: 2.1.304 chunk-m5q1b1c4.js:Zoe is 2.1.310 chunk-a5n97xgg.js:vae.
  assert.match(unbound.stderr, /chunk-a5n97xgg\.js:vae is not in a hash-bound module/);
  assert.notEqual(unmapped.code, 0);
  assert.match(unmapped.stderr, /native_isGitRepo is not mapped by the 2\.1\.310 profile/);
});
