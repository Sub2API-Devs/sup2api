/**
 * utils/teleport/containerSync.ts
 *
 * 2.1.316 新增：容器同步
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 */

//@ chunk-5xgkngpb.js:269866-269910 placement
async function environmentKindOf(env, gitRoot) {
  return "unspecified";
}
//@ chunk-5xgkngpb.js:269910-269975 placement
/**
 * 环境是否是 container_sync。
 */
async function isContainerSyncEnvironment(env, gitRoot) {
  return (await environmentKindOf(env, gitRoot)) === "container_sync";
}
//@ chunk-5xgkngpb.js:269975-270000 placement
/**
 * 外部构建恒 false 的 cowork 判定桩。
 */
function isRemoteCoworkLet(env) {
  return false;
}
//@ chunk-5xgkngpb.js:270000-270017 placement
function noopContainerCleanup(state) {}
//@ chunk-5xgkngpb.js:270017-270048 placement
/**
 * 外部构建恒 false 的容器同步禁用判断桩。
 */
async function isContainerSyncDisabled(env) {
  return false;
}
export { isContainerSyncEnvironment, noopContainerCleanup, isContainerSyncDisabled, isRemoteCoworkLet };
