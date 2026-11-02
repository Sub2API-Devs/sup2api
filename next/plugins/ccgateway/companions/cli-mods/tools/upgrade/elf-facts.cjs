// What an official Claude Code ELF says about the Bun it embeds, read from its
// bytes (restore-bun.cjs writes both into reconstruction.json; the patcher,
// build.sh, package-release.cjs and the Worker image check the patched CLI
// against them).
//
// embeddedBun is the Bun version and revision (`Bun v1.4.4 (<revision>)`): the
// patched CLI is compiled by that version, so its TLS stack is the official one.
//
// embeddedRuntimeVersion is the Node.js version that Bun reports
// (process.version, e.g. v26.12.1): the SDK sends it upstream as
// X-Stainless-Runtime-Version. Anthropic's builds embed private Bun revisions
// whose Node.js version differs from the public build of the same Bun version
// (official 2.1.312/2.1.316: v26.12.1; oven/bun:1.4.4: v26.3.0), so the patched
// CLI reports the official value itself (runtime-version.js). Bun writes the
// version into two strings: the npm user agent it defaults to
// (`bun/<bun> npm/? node/<version> <os> <arch>`) and process.release.headersUrl
// (`https://nodejs.org/download/release/<version>/node-<version>-headers.tar.gz`).
// Both must be present and name one version.
function embeddedBun(bytes) {
  const found = /Bun v(\d+\.\d+\.\d+) \(([0-9a-f]+)\)/.exec(bytes.toString('latin1'));
  if (!found) throw Error('The ELF names no Bun version');
  return { version: found[1], revision: found[2] };
}

function embeddedRuntimeVersion(bytes) {
  const text = bytes.toString('latin1');
  const userAgent = [...text.matchAll(/bun\/\d+\.\d+\.\d+ npm\/\? node\/(v\d+\.\d+\.\d+) /g)].map(match => match[1]);
  const headers = [...text.matchAll(/https:\/\/nodejs\.org\/download\/release\/(v\d+\.\d+\.\d+)\/node-(v\d+\.\d+\.\d+)-headers\.tar\.gz/g)].flatMap(match => [match[1], match[2]]);
  if (!userAgent.length || !headers.length) throw Error('The ELF names no Bun Node.js version (npm user agent and process.release.headersUrl)');
  const versions = [...new Set([...userAgent, ...headers])];
  if (versions.length !== 1) throw Error(`The ELF names more than one Bun Node.js version: ${versions.join(', ')}`);
  return versions[0];
}

module.exports = { embeddedBun, embeddedRuntimeVersion };
