/**
 * utils/permissions/unfinishedWriteCheck.ts
 *
 * 2.1.316 新增：未完成写入检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { encodeControlChars } from "../sanitization.js";
import { expandStablePath } from "../path.js";
import { walkPermissionCheckPaths } from "../fsOperations.js";
import { writeDenyPrefix, safetyCheckReasonFields } from "./filesystem.js";
import { isAbortError } from "../errors.js";
import { logError } from "../log.js";

//@ chunk-e6aww6q8.js:1409130-1409464 placement
/**
 * 权限检查未完成时的决定：写文件先尝试 deny 规则判定；否则在 plan 模式提示不能写，其他模式给出不可分类器批准的 ask。
 */
function buildUnfinishedCheckDecision(toolName, filePath, toolPermissionContext) {
  let isWrite = typeof filePath === "string";
  let denyDecision = isWrite ? checkWriteDenyForUnfinished(filePath, toolPermissionContext) : undefined;
  if (denyDecision !== undefined) return denyDecision;
  let actionText = isWrite ? `write to ${encodeControlChars(filePath)}` : `call ${toolName}`;
  let message =
    toolPermissionContext.mode === "plan"
      ? `Cannot ${actionText} while in plan mode: its check did not finish.`
      : [
          `The permission check for this attempt to ${actionText} did not`,
          "finish, so its safety checks did not run.",
        ].join(" ");
  return buildUnfinishedCheckAsk(message, toolPermissionContext);
}
//@ chunk-e6aww6q8.js:1409464-1409565 placement
function checkWriteDenyForUnfinished(filePath, toolPermissionContext) {
  try {
    let stablePath = expandStablePath(filePath);
    let walk = walkPermissionCheckPaths(stablePath);
    return writeDenyPrefix(stablePath, walk, stablePath, toolPermissionContext);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return denyUnfinishedWrite(filePath);
  }
}
//@ chunk-e6aww6q8.js:1409565-1410040 placement
/**
 * 写入权限检查未完成时的拒绝/询问结果构造：生成说明文字、deny 结果、标记检查未完成的 ask 结果及安全检查原因。
 */
var formatUnfinishedDenyCheck = (filePath) =>
  [
    "The permission check for this attempt to write to",
    `${encodeControlChars(filePath)} did not finish, and its denies could not be`,
    "checked.",
  ].join(" ");
var denyUnfinishedWrite = (filePath) => buildOtherDeny(formatUnfinishedDenyCheck(filePath));
var buildOtherDeny = (message) => ({
  behavior: "deny",
  message,
  decisionReason: {
    type: "other",
    reason: message,
  },
});
var buildUnfinishedCheckAsk = (reason, toolPermissionContext) => ({
  behavior: "ask",
  message: reason,
  decisionReason: buildUnfinishedCheckReason(reason, toolPermissionContext.restricted),
  suppressAlwaysAllowRule: true,
  checkIncomplete: true,
});
var buildUnfinishedCheckReason = (reason, restricted) => ({
  type: "safetyCheck",
  reason,
  ...safetyCheckReasonFields(
    {
      classifierApprovable: false,
      circuitBreaker: "unfinishedCheck",
    },
    restricted,
  ),
});
export { buildUnfinishedCheckDecision };
