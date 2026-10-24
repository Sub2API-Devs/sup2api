// installSupport copies support modules into a test directory the way
// patch-cli-2.1.304.cjs installs them: every module in the profile's
// supportModules becomes ccgateway-<name>.js, their imports of each other
// renamed to match. A module added to another's imports (raw-json) is thus
// installed without the test enumerating it, exactly as production does.
// `names` only pin which modules a test means to exercise: each must be in the
// profile's list, so a renamed or dropped module fails here, not later.
import fs from 'node:fs/promises';
import path from 'node:path';

const profile = JSON.parse(await fs.readFile(new URL('../profiles/linux-x64-2.1.304.json', import.meta.url), 'utf8'));
export const supportModules = profile.supportModules;

export async function installSupport(dir, names = []) {
  for (const name of names) {
    if (!supportModules.includes(name)) throw Error(name + ' is not a support module of the profile');
  }
  for (const name of supportModules) {
    let text = await fs.readFile(new URL('../' + name + '.js', import.meta.url), 'utf8');
    for (const other of supportModules) text = text.replaceAll(`'./${other}.js'`, `'./ccgateway-${other}.js'`);
    await fs.writeFile(path.join(dir, 'ccgateway-' + name + '.js'), text);
  }
}
