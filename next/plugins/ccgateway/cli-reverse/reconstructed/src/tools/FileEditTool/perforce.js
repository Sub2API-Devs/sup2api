/**
 * tools/FileEditTool/perforce.ts
 *
 * Perforce 模式判断与相关处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-847rdpmn.js (3)
 * attribution: placement 3
 */
import { isEnvTruthy } from "../../utils/envUtils.js";
import { env } from "../../utils/env.js";

//@ chunk-847rdpmn.js:6351-6405 placement
/**
 * Perforce 模式：CLAUDE_CODE_PERFORCE_MODE 为真。
 */
function isPerforceMode() {
  return isEnvTruthy(env.CLAUDE_CODE_PERFORCE_MODE);
}
//@ chunk-847rdpmn.js:6405-6600 placement
var PERFORCE_READ_ONLY_MESSAGE =
  "File is read-only \u2014 it has not been opened for edit in Perforce. Run `p4 edit <file>` to check it out, then retry. Do not chmod the file writable; that bypasses Perforce tracking.";
//@ chunk-847rdpmn.js:6600-6642 placement
/**
 * Perforce 模式下文件属主没有写权限（未 p4 edit），编辑前拒绝。
 */
function isPerforceReadOnlyFile(mode) {
  return isPerforceMode() && (mode & 128) === 0;
}
export { isPerforceReadOnlyFile, PERFORCE_READ_ONLY_MESSAGE, isPerforceMode };
