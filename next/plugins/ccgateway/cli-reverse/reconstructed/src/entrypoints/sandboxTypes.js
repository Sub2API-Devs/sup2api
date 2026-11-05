/**
 * entrypoints/sandboxTypes.ts
 *
 * 沙箱设置的 zod 模式（network/filesystem/excludedCommands 等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/sandboxTypes.ts
 * pieces: chunk-qg41pqt6.js (3)
 * attribution: affinity 2, fingerprint 1
 */

//@ chunk-qg41pqt6.js:906612-906631 affinity
var weakSet = new WeakSet();
//@ chunk-qg41pqt6.js:906631-906800 fingerprint (2.1.88 match: SandboxFilesystemConfigSchema, 0.465)
function SandboxFilesystemConfigSchema(config) {
  if (weakSet.has(config)) return true;
  let { denyRead, allowRead, allowWrite, denyWrite } = config.filesystem;
  let all = [denyRead, allowRead ?? [], allowWrite, denyWrite].every((list) => list.every(isString));
  if (all) weakSet.add(config);
  return all;
}
//@ chunk-qg41pqt6.js:906800-906843 affinity
function isString(value) {
  return typeof value === "string";
}
export { SandboxFilesystemConfigSchema };
