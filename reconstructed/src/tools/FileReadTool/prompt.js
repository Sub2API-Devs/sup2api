/**
 * tools/FileReadTool/prompt.ts
 *
 * Read 工具提示词与去重/截断文案常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/prompt.ts
 * pieces: chunk-g54kbxqw.js (6)
 * attribution: fingerprint 3, layout 3
 */
import { gD, nK } from "../../utils/model/promptBundles.js";
import { Qs } from "../../constants/promptSections.js";
import { $Yt } from "../../utils/model/claude3Models.js";

/**
 * Read 相关提示片段：不要读回刚编辑的文件；编辑成功尾注；三种"文件未变"去重文案。
 */
//@ chunk-g54kbxqw.js:132415-132983 fingerprint = FILE_UNCHANGED_STUB (0.333)
var NO_REREAD_AFTER_EDIT_NOTE = `
- Do NOT re-read a file you just edited to verify \u2014 Edit/Write would have errored if the change failed, and the harness tracks file state for you.`,
  FILE_STATE_CURRENT_SUFFIX = " (file state is current in your context \u2014 no need to Read it back)",
  FILE_UNCHANGED_STUB =
    "File unchanged since last read. The content from the earlier Read tool_result in this conversation is still current \u2014 refer to that instead of re-reading.",
  FILE_UNCHANGED_WASTED_CALL_STUB =
    "Wasted call \u2014 file unchanged since your last Read. Refer to that earlier tool_result instead.",
  ALREADY_IN_CONTEXT_PREFIX = "<system-reminder>This file is already in your context";
/**
 * 返回去重命中时的 tool_result 文案（"Wasted call — file unchanged since your last Read..."）。
 */
//@ chunk-g54kbxqw.js:132983-133008 layout
function getFileUnchangedMessage() {
  return FILE_UNCHANGED_WASTED_CALL_STUB;
}
/**
 * 启动预置文件命中去重时的 system-reminder（"已在上下文中，见 Contents of ..."）。
 */
//@ chunk-g54kbxqw.js:133008-133156 layout
function getSeededFileUnchangedMessage(e) {
  return `${ALREADY_IN_CONTEXT_PREFIX} (see "Contents of ${e}" above) and has not changed on disk. Use that content instead of re-reading.</system-reminder>`;
}
/**
 * tool_result 文本是否以三种去重文案之一开头。
 */
//@ chunk-g54kbxqw.js:133156-133232 layout
function isFileUnchangedStub(e) {
  return (
    e.startsWith(FILE_UNCHANGED_STUB) ||
    e.startsWith(FILE_UNCHANGED_WASTED_CALL_STUB) ||
    e.startsWith(ALREADY_IN_CONTEXT_PREFIX)
  );
}
/**
 * Read 提示常量：截断说明前缀、默认读取 2000 行、工具描述、cat -n 格式说明（两种）、"只读需要的部分"说明。
 */
//@ chunk-g54kbxqw.js:133232-133682 fingerprint = DESCRIPTION (0.333)
var TRUNCATED_PARTIAL_VIEW_PREFIX = "[Truncated: PARTIAL view \u2014 ",
  MAX_LINES_TO_READ = 2000,
  DESCRIPTION = "Read a file from the local filesystem.",
  LINE_FORMAT_INSTRUCTION = "- Results are returned using cat -n format, with line numbers starting at 1",
  TAB_AWARE_LINE_FORMAT_INSTRUCTION = `${LINE_FORMAT_INSTRUCTION}. Each line is the line number, a single separator (a tab or \`:\`), then the verbatim file content (including any leading whitespace).`,
  OFFSET_INSTRUCTION =
    "- When you already know which part of the file you need, only read that part. This can be important for larger files.";
/**
 * 生成 Read 提示词：lean 模式短版；完整版说明绝对路径、默认 2000 行、图片、PDF（模型支持时，超过 10 页必须给 pages，每次最多 20 页）、notebook、目录不可读、截图。
 */
//@ chunk-g54kbxqw.js:133682-135755 fingerprint = renderPromptTemplate (0.469)
function renderPromptTemplate(e, n, s, r) {
  if (gD({ model: e, leanPrompt: s })) {
    let h = nK({ model: e, leanRewrite: r }) ? Qs : NO_REREAD_AFTER_EDIT_NOTE;
    return `Reads a file from the local filesystem.

- \`file_path\` must be an absolute path.
- Reads up to ${MAX_LINES_TO_READ} lines by default.
${OFFSET_INSTRUCTION}
${n}
- Reads images (PNG, JPG, \u2026) and presents them visually.${$Yt(e) ? ' Reads PDFs via the `pages` parameter (e.g. "1-5", max 20 pages/request; required for PDFs over 10 pages).' : ""} Reads Jupyter notebooks (.ipynb) as cells with outputs.
- Reading a directory, a missing file, or an empty file returns an error or system reminder rather than content.${h}`;
  }
  return `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.

Usage:
- The file_path parameter must be an absolute path, not a relative path
- By default, it reads up to ${MAX_LINES_TO_READ} lines starting from the beginning of the file
${OFFSET_INSTRUCTION}
${n}
- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.${
    $Yt(e)
      ? `
- This tool can read PDF files (.pdf). For large PDFs (more than 10 pages), you MUST provide the pages parameter to read specific page ranges (e.g., pages: "1-5"). Reading a large PDF without the pages parameter will fail. Maximum 20 pages per request.`
      : ""
  }
- This tool can read Jupyter notebooks (.ipynb files) and returns all cells with their outputs, combining code, text, and visualizations.
- This tool can only read files, not directories. To list files in a directory, use the registered shell tool.
- You will regularly be asked to read screenshots. If the user provides a path to a screenshot, ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths.
- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.${NO_REREAD_AFTER_EDIT_NOTE}`;
}

export {
  TRUNCATED_PARTIAL_VIEW_PREFIX,
  MAX_LINES_TO_READ,
  isFileUnchangedStub,
  DESCRIPTION,
  renderPromptTemplate,
  TAB_AWARE_LINE_FORMAT_INSTRUCTION,
  LINE_FORMAT_INSTRUCTION,
  getSeededFileUnchangedMessage,
  getFileUnchangedMessage,
  FILE_STATE_CURRENT_SUFFIX,
};
