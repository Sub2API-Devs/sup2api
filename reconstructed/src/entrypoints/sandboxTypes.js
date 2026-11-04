/**
 * entrypoints/sandboxTypes.ts
 *
 * 沙箱设置的 zod 模式（network/filesystem/excludedCommands 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/entrypoints/sandboxTypes.ts
 * pieces: chunk-fq0cr76a.js (3)
 * attribution: affinity 2, fingerprint 1
 */

//@ chunk-fq0cr76a.js:901792-901811 affinity
var weakSet = new WeakSet();
//@ chunk-fq0cr76a.js:901811-901980 fingerprint = SandboxFilesystemConfigSchema (0.466)
function SandboxFilesystemConfigSchema(config) {
  if (weakSet.has(config)) return true;
  let { denyRead, allowRead, allowWrite, denyWrite } = config.filesystem;
  let all = [denyRead, allowRead ?? [], allowWrite, denyWrite].every((list) => list.every(isString));
  if (all) weakSet.add(config);
  return all;
}
//@ chunk-fq0cr76a.js:901980-902023 affinity
function isString(value) {
  return typeof value === "string";
}
export { SandboxFilesystemConfigSchema };
