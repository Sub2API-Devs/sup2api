// The patcher refuses an import it cannot pin (audit D3): a name the target
// module does not export, or a CLI module the profile does not hash-bind.
// Each case patches a copy of these sources with one such import added.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { restored, nativeSkip } from './artifacts.mjs';

const mods = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageFile = process.env.CCG_BABEL_PACKAGE || path.resolve(mods, '../../../../web/package.json');

async function patchCopy(change) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccg-patch-imports-'));
  try {
    const copy = path.join(dir, 'mods');
    await fs.mkdir(path.join(copy, 'profiles'), { recursive: true });
    for (const name of await fs.readdir(mods)) if (/\.(c?js)$/.test(name)) await fs.copyFile(path.join(mods, name), path.join(copy, name));
    await fs.copyFile(path.join(mods, 'profiles/linux-x64-2.1.304.json'), path.join(copy, 'profiles/linux-x64-2.1.304.json'));
    await change(copy);
    return await new Promise(resolve => execFile(process.execPath, [path.join(copy, 'patch-cli-2.1.304.cjs'), fileURLToPath(restored), path.join(dir, 'out')],
      { env: { ...process.env, CCG_BABEL_PACKAGE: packageFile }, maxBuffer: 8 << 20, timeout: 180000 },
      (error, stdout, stderr) => resolve({ code: error?.code ?? 0, stderr })));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}
async function edit(file, from, to) {
  const text = await fs.readFile(file, 'utf8');
  assert.equal(text.split(from).length, 2, from);
  await fs.writeFile(file, text.replace(from, to));
}

test('the patcher refuses an import the CLI does not export or the profile does not bind', { skip: nativeSkip('patcher import checks') }, async () => {
  const [missingExport, unbound] = await Promise.all([
    patchCopy(copy => edit(path.join(copy, 'request-build.js'), "import { oJe, B1s as isBillingHeader } from './chunk-7y2kvacy.js';", "import { oJe, B1s as isBillingHeader, ccgMissing } from './chunk-7y2kvacy.js';")),
    patchCopy(async copy => {
      const file = path.join(copy, 'profiles/linux-x64-2.1.304.json');
      const profile = JSON.parse(await fs.readFile(file, 'utf8'));
      delete profile.modules['chunk-m5q1b1c4.js'];
      await fs.writeFile(file, JSON.stringify(profile));
    }),
  ]);
  assert.notEqual(missingExport.code, 0);
  assert.match(missingExport.stderr, /ccgateway-request-build\.js imports ccgMissing from chunk-7y2kvacy\.js, which does not export it/);
  assert.notEqual(unbound.code, 0);
  assert.match(unbound.stderr, /imports chunk-m5q1b1c4\.js, which the profile does not hash-bind/);
});
