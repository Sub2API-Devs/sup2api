/**
 * utils/codeMode/sessionResumeHooks.ts
 *
 * Code 模式的恢复钩子：记录恢复来源、云迁移拒绝、会话是否在 Code 模式（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h13zwtby.js (3)
 * attribution: placement 3
 */
import { isAccepted, codeModeAccepted } from "./accepted.js";

//@ chunk-h13zwtby.js:786-861 placement
/**
 * 记录会话用过 Code 模式。
 */
function enableCodeMode() {
  {
    let codeMode = require("./applyCodeModePlan.lazy.js");
    codeMode.recordCodeMode(true);
  }
}
//@ chunk-h13zwtby.js:861-957 placement
/**
 * Code 模式下是否可以拒绝把会话移到云端。
 */
function cloudMoveRefusalReason() {
  if (isAccepted()) {
    let codeMode = require("./applyCodeModePlan.lazy.js");
    return codeMode.cloudMoveRefusal();
  }
  return;
}
//@ chunk-h13zwtby.js:957-1073 placement
/**
 * 按 transcript 路径判会话恢复来源（Code 模式关闭时恒 file）。
 */
function resumeSourceForPath(transcriptPath) {
  if (codeModeAccepted()) {
    let codeMode = require("./applyCodeModePlan.lazy.js");
    return codeMode.resumeSourceOfTranscriptPath(transcriptPath);
  }
  return "file";
}
export { enableCodeMode, resumeSourceForPath, cloudMoveRefusalReason };
