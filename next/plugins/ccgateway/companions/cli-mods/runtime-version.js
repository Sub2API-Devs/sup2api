// The Node.js version the official Claude Code build reports, installed ahead
// of every other module of each compiled entry (patch-cli.cjs puts this
// module's import first in cli.js and in the hooks worker, which runs on its
// own thread with its own process object).
//
// Claude Code's SDK sends process.version upstream as
// X-Stainless-Runtime-Version. The value is the Node.js version the embedded
// Bun reports, and Anthropic's builds embed private Bun revisions whose value
// differs from the public build of the same Bun version this CLI is compiled
// with (official 2.1.312/2.1.316: v26.12.1; oven/bun:1.4.4: v26.3.0). The
// patcher fills the profile's runtimeVersion here, which must equal the one
// restore-bun.cjs read from the official ELF; package-release.cjs and the
// Worker image run the compiled CLI and refuse it unless it reports that
// value. Only these two faces of the one version change (process.version and
// process.versions.node, which every reader expects to agree); each keeps its
// own property attributes, and an attribute that forbids the change fails the
// start instead of leaving the compiler's value.
const runtimeVersion = /*CCGATEWAY_RUNTIME_VERSION*/ '';
for (const [owner, key, value] of [[process, 'version', runtimeVersion], [process.versions, 'node', runtimeVersion.slice(1)]]) {
  const own = Object.getOwnPropertyDescriptor(owner, key);
  if (own && 'value' in own && own.value === value) continue;
  Object.defineProperty(owner, key, { value, writable: own?.writable ?? true, enumerable: own?.enumerable ?? true, configurable: own?.configurable ?? true });
}
