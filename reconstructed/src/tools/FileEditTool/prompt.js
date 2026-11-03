/**
 * tools/FileEditTool/prompt.ts
 *
 * Edit 工具提示词（lean 短版与完整版）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/prompt.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: fingerprint 2, layout 1
 */
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { Dat } from "../FileReadTool/limits.js";
import { gD } from "../../utils/model/promptBundles.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

/**
 * Edit 提示词里的"必须先用 Read 读过"一行。
 */
//@ chunk-e6aww6q8.js:4645791-4645970 fingerprint = getPreReadInstruction (1)
function getPreReadInstruction() {
  return `
- You must use your \`${FILE_READ_TOOL_NAME}\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.`;
}
/**
 * Edit 工具提示词：转调 getDefaultEditDescription。
 */
//@ chunk-e6aww6q8.js:4645970-4646004 layout
function getEditToolDescription(e, n) {
  return getDefaultEditDescription(e, n);
}
/**
 * 生成 Edit 提示词：lean 模式给 3 行短版；完整版含先读要求、行号前缀格式（tengu_tab_read_sep 决定 tab 或冒号）、tengu_edit_minimalanchor_jrn 开启时要求 old_string 尽量短。
 */
//@ chunk-e6aww6q8.js:4646004-4647900 fingerprint = getDefaultEditDescription (0.429)
function getDefaultEditDescription(e, n) {
  let r = Dat();
  if (gD({ model: e, leanPrompt: n }))
    return `Performs exact string replacement in a file.

- You must ${FILE_READ_TOOL_NAME} the file in this conversation before editing, or the call will fail.
- \`old_string\` must match the file exactly, including indentation, and be unique \u2014 the edit fails otherwise. Strip the Read line prefix (${r ? "line number + a single tab or `:`" : "line number + tab"}) before matching.
- \`replace_all: true\` replaces every occurrence instead.`;
  let s = r ? "line number + a single separator character (a tab or `:`)" : "line number + tab",
    h = getFeatureValue_CACHED_MAY_BE_STALE("tengu_edit_minimalanchor_jrn", !1)
      ? "\n- Keep `old_string` minimal \u2014 usually 1-3 lines, only enough to be unique in the file. Including excess context wastes tokens and is an error.\n- The edit will FAIL if `old_string` is not unique in the file. In that case, add the minimum extra context needed for uniqueness, or use `replace_all` to change every instance."
      : "\n- The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`.";
  return `Performs exact string replacements in files.

Usage:${getPreReadInstruction()}
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: ${s}. Everything after that is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.${h}
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`;
}

export { getEditToolDescription };
