// installSupport copies support modules into a test directory the way
// patch-cli.cjs installs them: every module in the profile's supportModules
// becomes ccgateway-<name>.js, their imports of each other and of the native
// groups (native-<group>.js) renamed to match. A module added to another's
// imports (raw-json) is thus installed without the test enumerating it,
// exactly as production does. `names` only pin which modules a test means to
// exercise: each must be in the profile's list, so a renamed or dropped module
// fails here, not later.
//
// linkNatives stands in for the generated native modules: a test writes stub
// modules (stub-*.js) that export native bindings by their logical names, and
// each ccgateway-native-<group>.js re-exports the names of its group from
// whichever stub exports them. A logical name no stub exports is left out, so
// a support module that needs it fails to load.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { profile } from './artifacts.mjs';

export const supportModules = profile.supportModules;
const groups = Object.keys(profile.natives);

export async function installSupport(dir, names = []) {
  for (const name of names) {
    if (!supportModules.includes(name)) throw Error(name + ' is not a support module of the profile');
  }
  for (const name of supportModules) {
    let text = await fs.readFile(new URL('../' + name + '.js', import.meta.url), 'utf8');
    for (const other of supportModules) text = text.replaceAll(`'./${other}.js'`, `'./ccgateway-${other}.js'`);
    for (const group of groups) text = text.replaceAll(`'./native-${group}.js'`, `'./ccgateway-native-${group}.js'`);
    await fs.writeFile(path.join(dir, 'ccgateway-' + name + '.js'), text);
  }
}

export async function linkNatives(dir) {
  const parser = createRequire(import.meta.url)('@babel/parser');
  const exporter = new Map();
  for (const file of (await fs.readdir(dir)).filter(name => /^stub-.*\.js$/.test(name)).sort()) {
    const ast = parser.parse(await fs.readFile(path.join(dir, file), 'utf8'), { sourceType: 'module' });
    for (const node of ast.program.body) {
      if (node.type !== 'ExportNamedDeclaration') continue;
      const names = [...node.specifiers.map(s => s.exported.name), node.declaration?.id?.name, ...(node.declaration?.declarations ?? []).map(d => d.id.name)].filter(Boolean);
      for (const name of names) {
        if (exporter.has(name) && exporter.get(name) !== file) throw Error(`${name} is exported by both ${exporter.get(name)} and ${file}`);
        exporter.set(name, file);
      }
    }
  }
  for (const [group, bindings] of Object.entries(profile.natives)) {
    const lines = Object.keys(bindings).filter(name => exporter.has(name)).map(name => `export { ${name} } from './${exporter.get(name)}';`);
    await fs.writeFile(path.join(dir, `ccgateway-native-${group}.js`), lines.join('\n') + '\n');
  }
}
