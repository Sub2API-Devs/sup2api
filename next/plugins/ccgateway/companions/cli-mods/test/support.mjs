// installSupport copies support modules into a test directory the way
// patch-cli-2.1.304.cjs installs them: as ccgateway-<name>.js, their imports
// of each other renamed to match. The shared helpers always come along.
import fs from 'node:fs/promises';
import path from 'node:path';

const supportNames = ['shared', 'native-tools', 'model-request', 'request-command', 'request-input', 'request-build', 'request-parameters', 'request-output',
  'request-options', 'request-error', 'request-policy', 'content-policy', 'container-resources', 'request-identity', 'direct-billing', 'request-agent'];

export async function installSupport(dir, names) {
  for (const name of new Set(['shared', ...names])) {
    const source = name === 'request-build' ? 'request-build-2.1.304.js' : name + '.js';
    let text = await fs.readFile(new URL('../' + source, import.meta.url), 'utf8');
    for (const other of supportNames) text = text.replaceAll(`'./${other}.js'`, `'./ccgateway-${other}.js'`);
    await fs.writeFile(path.join(dir, 'ccgateway-' + name + '.js'), text);
  }
}
