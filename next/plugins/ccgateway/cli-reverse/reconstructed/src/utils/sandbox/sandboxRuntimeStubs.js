/**
 * utils/sandbox/sandboxRuntimeStubs.ts
 *
 * 2.1.316 新增：sandbox-runtime 在本构建里的配置桩（是否启用/强制、容器 leg、诊断占位与名字清洗）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 8, layout 1
 */

//@ chunk-5xgkngpb.js:1805652-1805676 placement
function isSandboxEnforcedStub() {
  return false;
}
//@ chunk-5xgkngpb.js:3150144-3150206 placement
var SANDBOX_RUNTIME_DEFAULTS = {
  enabled: false,
  enforce: false,
  everywhere: false,
  python_leg: "on",
};
//@ chunk-5xgkngpb.js:3150206-3150232 placement
function getSandboxRuntimeDefaults() {
  return SANDBOX_RUNTIME_DEFAULTS;
}
//@ chunk-5xgkngpb.js:3150232-3150256 layout
function isSandboxRuntimeEnabledStub() {
  return false;
}
//@ chunk-5xgkngpb.js:3150256-3150280 placement
function isContainersLegStub() {
  return false;
}
//@ chunk-5xgkngpb.js:3150280-3150307 placement
function getSandboxInnerShellStub() {
  return null;
}
//@ chunk-5xgkngpb.js:3150307-3150386 placement
function isPythonLegEnabled(config) {
  return config.python_leg === "on" || (config.python_leg === "containers" && isContainersLegStub());
}
//@ chunk-5xgkngpb.js:3150465-3150492 placement
function getSnapshotOverrideStub() {
  return null;
}
//@ chunk-5xgkngpb.js:3150576-3150603 placement
function getSandboxExtraArgsStub() {
  return null;
}
export { getSnapshotOverrideStub, isSandboxEnforcedStub };
