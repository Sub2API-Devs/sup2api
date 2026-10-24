// installSupport copies support modules into a test directory the way
// patch-cli-2.1.304.cjs installs them: as ccgateway-<name>.js, their imports
// of each other renamed to match. The shared helpers always come along. The
// module list is the profile's, as the patcher reads it.
import fs from 'node:fs/promises';
import path from 'node:path';

const profile = JSON.parse(await fs.readFile(new URL('../profiles/linux-x64-2.1.304.json', import.meta.url), 'utf8'));
const supportNames = profile.supportModules;

export async function installSupport(dir, names) {
  for (const name of new Set(['shared', ...names])) {
    let text = await fs.readFile(new URL('../' + name + '.js', import.meta.url), 'utf8');
    for (const other of supportNames) text = text.replaceAll(`'./${other}.js'`, `'./ccgateway-${other}.js'`);
    await fs.writeFile(path.join(dir, 'ccgateway-' + name + '.js'), text);
  }
}
