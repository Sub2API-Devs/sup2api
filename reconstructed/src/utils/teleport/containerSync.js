/**
 * utils/teleport/containerSync.ts
 *
 * 2.1.316 新增：容器同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */

//@ chunk-e6aww6q8.js:270582-270626 placement
async function environmentKindOf(env, gitRoot) {
  return "unspecified";
}
//@ chunk-e6aww6q8.js:270626-270691 placement
/**
 * 环境是否是 container_sync。
 */
async function isContainerSyncEnvironment(env, gitRoot) {
  return (await environmentKindOf(env, gitRoot)) === "container_sync";
}
//@ chunk-e6aww6q8.js:270691-270716 placement
/**
 * 外部构建恒 false 的 cowork 判定桩。
 */
function isRemoteCoworkLet(env) {
  return false;
}
//@ chunk-e6aww6q8.js:270716-270733 placement
function noopContainerCleanup(state) {}
//@ chunk-e6aww6q8.js:270733-270764 placement
/**
 * 外部构建恒 false 的容器同步禁用判断桩。
 */
async function isContainerSyncDisabled(env) {
  return false;
}
export { isContainerSyncEnvironment, noopContainerCleanup, isRemoteCoworkLet, isContainerSyncDisabled };
