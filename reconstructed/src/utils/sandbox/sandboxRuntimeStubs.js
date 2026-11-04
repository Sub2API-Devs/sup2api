/**
 * utils/sandbox/sandboxRuntimeStubs.ts
 *
 * 2.1.316 新增：sandbox-runtime 在本构建里的配置桩（是否启用/强制、容器 leg、诊断占位与名字清洗）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */

//@ chunk-e6aww6q8.js:3066031-3066093 placement
var SANDBOX_RUNTIME_DEFAULTS = {
  enabled: false,
  enforce: false,
  everywhere: false,
  python_leg: "on",
};
//@ chunk-e6aww6q8.js:3066093-3066119 placement
function getSandboxRuntimeDefaults() {
  return SANDBOX_RUNTIME_DEFAULTS;
}
//@ chunk-e6aww6q8.js:3066119-3066143 placement
function isSandboxEnforcedStub() {
  return false;
}
//@ chunk-e6aww6q8.js:3066143-3066167 placement
function isContainersLegStub() {
  return false;
}
//@ chunk-e6aww6q8.js:3066167-3066194 placement
function getSandboxInnerShellStub() {
  return null;
}
//@ chunk-e6aww6q8.js:3066194-3066273 placement
function isPythonLegEnabled(config) {
  return config.python_leg === "on" || (config.python_leg === "containers" && isContainersLegStub());
}
//@ chunk-e6aww6q8.js:3066352-3066379 placement
function getSnapshotOverrideStub() {
  return null;
}
//@ chunk-e6aww6q8.js:3066463-3066490 placement
function getSandboxExtraArgsStub() {
  return null;
}
export { getSnapshotOverrideStub };
