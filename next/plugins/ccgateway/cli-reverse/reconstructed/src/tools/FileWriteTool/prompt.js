/**
 * tools/FileWriteTool/prompt.ts
 *
 * Write 工具名与提示词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileWriteTool/prompt.ts
 * pieces: chunk-bwbq4xvm.js (1), chunk-g54kbxqw.js (2)
 * attribution: fingerprint 3
 */
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { leanPromptOf } from "../../utils/model/promptBundles.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";

//@ chunk-bwbq4xvm.js:176155-176170 fingerprint (2.1.88 match: FILE_WRITE_TOOL_NAME, 1)
/**
 * Write 工具名 "Write"。
 */
var FILE_WRITE_TOOL_NAME = "Write";
//@ chunk-g54kbxqw.js:135755-135928 fingerprint (2.1.88 match: getPreReadInstruction, 1)
/**
 * Write 提示词里"已有文件必须先 Read"一行。
 */
function getPreReadInstruction() {
  return `
- If this is an existing file, you MUST use the ${FILE_READ_TOOL_NAME} tool first to read the file's contents. This tool will fail if you did not read the file first.`;
}
//@ chunk-g54kbxqw.js:135928-136718 fingerprint (2.1.88 match: getWriteToolDescription, 0.491)
/**
 * 生成 Write 提示词：lean 模式两句话；完整版说明覆盖、必须先读、优先 Edit、不主动写文档/README、不加 emoji。
 */
function getWriteToolDescription(model, leanPrompt) {
  if (
    leanPromptOf({
      model,
      leanPrompt,
    })
  )
    return `Writes a file to the local filesystem, overwriting if one exists.

When to use: creating a new file, or fully replacing one you've already ${FILE_READ_TOOL_NAME}. Overwriting an existing file you haven't ${FILE_READ_TOOL_NAME} will fail. For partial changes, use ${FILE_EDIT_TOOL_NAME} instead.`;
  return `Writes a file to the local filesystem.

Usage:
- This tool will overwrite the existing file if there is one at the provided path.${getPreReadInstruction()}
- Prefer the Edit tool for modifying existing files \u2014 it only sends the diff. Only use this tool to create new files or for complete rewrites.
- NEVER create documentation files (*.md) or README files unless explicitly requested by the User.
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.`;
}
export { FILE_WRITE_TOOL_NAME, getWriteToolDescription };
