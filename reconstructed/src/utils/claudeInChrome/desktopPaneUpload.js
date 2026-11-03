/**
 * utils/claudeInChrome/desktopPaneUpload.ts
 *
 * 2.1.316 新增：Claude Desktop 浏览器面板的 file_upload 转发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v64arqfj.js (3)
 * attribution: placement 3
 */
import { preparePaneFileUploadInput } from "./fileUpload.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";

//@ chunk-v64arqfj.js:5723-5805 placement
var CLAUDECODE_FILESREADBYCLAUDECODE = "claudecode/filesReadByClaudeCode";
var CLAUDECODE_AUTOMODECLASSIFIERALLOWED = "claudecode/autoModeClassifierAllowed";
//@ chunk-v64arqfj.js:5805-6438 placement
/**
 * 把 file_upload 转发给 Claude Desktop 浏览器面板前：校验并读取路径（每个文件由宿主询问），失败抛出；在 MCP 请求元数据中标注文件由 Claude Code 读取，单文件且路径与读取一致时允许自动模式分类器处理。
 */
async function preparePaneUpload(input, context, requestMeta, hostAsksPerFile, autoModeOn) {
  let prepared = await preparePaneFileUploadInput(input ?? {}, context, {
    hostAsksPerFile,
  });
  if (prepared.error)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      prepared.error,
      "Claude Desktop pane file_upload: refused by Claude Code before the request was sent",
    );
  if (prepared.input === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "Nothing was uploaded: file_upload hit an internal error in Claude Code. This is a bug, not a problem with the file, so do not retry. Tell the user the upload failed because of a bug in Claude Code.",
      "Claude Desktop pane file_upload: internal error, the path check returned neither a file nor a refusal",
    );
  let meta = {
    ...requestMeta,
    [CLAUDECODE_FILESREADBYCLAUDECODE]: "1",
  };
  if (autoModeOn && isSingleRequestedPath(input, prepared.input))
    meta[CLAUDECODE_AUTOMODECLASSIFIERALLOWED] = "1";
  else delete meta[CLAUDECODE_AUTOMODECLASSIFIERALLOWED];
  return {
    input: prepared.input,
    mcpRequestMeta: meta,
  };
}
//@ chunk-v64arqfj.js:6438-6639 placement
function isSingleRequestedPath(n, r) {
  let t = Array.isArray(n?.paths) ? n.paths[0] : undefined;
  let e = Array.isArray(r.files) ? r.files[0] : undefined;
  return (
    typeof t === "string" && typeof e === "object" && e !== null && "sourcePath" in e && t === e.sourcePath
  );
}
