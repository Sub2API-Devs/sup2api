/**
 * utils/git/gitMissingMessage.ts
 *
 * 2.1.316 新增：未安装 git 的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8djvzp0d.js (2)
 * attribution: placement 2
 */

//@ chunk-8djvzp0d.js:313-416 placement
/**
 * macOS 未安装 git 的提示。
 */
var GIT_MISSING_MAC_MESSAGE =
  "git is not installed on this Mac. To install it, run xcode-select --install, then try again.";
//@ chunk-8djvzp0d.js:416-443 placement
/**
 * 判断当前平台是否需要"未安装 git"的提示（此构建恒为 false）。
 */
function isGitMissingMessageSupported(env, env_2) {
  return false;
}
export { isGitMissingMessageSupported, GIT_MISSING_MAC_MESSAGE };
