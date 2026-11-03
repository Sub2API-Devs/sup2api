/**
 * tools/FileEditTool/UI.tsx
 *
 * Edit 工具的终端渲染：调用/结果/拒绝 diff/错误消息、用户可见名与摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileEditTool/UI.tsx
 * pieces: chunk-e6aww6q8.js (2), chunk-smaqkhx4.js (8)
 * attribution: fingerprint 8, placement 1, layout 1
 */
import { j, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { getPlansDirectory } from "../../utils/plans.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { getDisplayPath, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { P7n, readRejectionContext } from "../../utils/settings/settingsReview.js";
import { FileEditToolUpdatedMessage } from "../../components/FileEditToolUpdatedMessage.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { isScratchpadDisplayPath } from "../../utils/permissions/filesystem.js";
import { FileEditToolUseRejectedMessage } from "../../components/FileEditToolUseRejectedMessage.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { zEt, adjustHunkLineNumbers } from "../../utils/diff.js";
import { getPatchForEdit, findActualString, preserveQuoteStyle } from "./utils.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { lintBackgroundMemoryWrite, rememberLintedWrite } from "../../memdir/memoryWriteLint.js";
import { expandPath } from "../../utils/path.js";

//@ chunk-smaqkhx4.js:7811-7815 placement
j();
//@ chunk-smaqkhx4.js:7815-7948 layout = renderToolUseMessage (1)
function renderToolUseMessage({ file_path: file_path }, { verbose: verbose }) {
  if (!file_path) return null;
  if (file_path.startsWith(getPlansDirectory())) return "";
  return e(FilePathLink, { filePath: file_path, children: verbose ? file_path : getDisplayPath(file_path) });
}
//@ chunk-smaqkhx4.js:7948-8333 fingerprint = renderToolResultMessage (0.865)
function renderToolResultMessage(
  {
    filePath: filePath = "",
    structuredPatch: structuredPatch,
    originalFile: originalFile,
    staged: staged,
    stagedWording: stagedWording,
  },
  _progressMessagesForMessage,
  { style: style, verbose: verbose },
) {
  if (!filePath) return null;
  if (staged)
    return e(MessageResponse, { children: e(Text, { dimColor: !0, children: P7n(stagedWording) }) });
  let isPlanFile = filePath.startsWith(getPlansDirectory());
  return e(FileEditToolUpdatedMessage, {
    filePath: filePath,
    structuredPatch: structuredPatch,
    firstLine: originalFile ? getFirstLine(originalFile) : null,
    fileContent: originalFile || void 0,
    style: style,
    verbose: verbose,
    previewHint: isPlanFile ? "/plan to preview" : void 0,
    collapsed: !isPlanFile && isScratchpadDisplayPath(filePath),
  });
}
//@ chunk-smaqkhx4.js:8333-8721 fingerprint = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage(input, options) {
  let { style: style, verbose: verbose } = options,
    filePath = input.file_path,
    c = input.old_string ?? "",
    a = input.new_string ?? "",
    p = input.replace_all ?? !1;
  if ("edits" in input && input.edits != null)
    return e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      firstLine: null,
      verbose: verbose,
    });
  if (c === "")
    return e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "write",
      content: a,
      firstLine: getFirstLine(a),
      verbose: verbose,
    });
  return e(EditRejectionDiff, {
    filePath: filePath,
    oldString: c,
    newString: a,
    replaceAll: p,
    style: style,
    verbose: verbose,
  });
}
//@ chunk-smaqkhx4.js:8721-9198 fingerprint = renderToolUseErrorMessage (0.511)
function renderToolUseErrorMessage(result, options) {
  let { verbose: verbose, toolDenialKind: toolDenialKind } = options;
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  ) {
    let errorMessage = extractTag(result, "tool_use_error");
    if (errorMessage?.includes("File has not been read yet"))
      return e(MessageResponse, { children: e(Text, { dimColor: !0, children: "File must be read first" }) });
    if (errorMessage?.includes(FILE_NOT_FOUND_CWD_NOTE))
      return e(MessageResponse, { children: e(Text, { color: "error", children: "File not found" }) });
    return e(MessageResponse, { children: e(Text, { color: "error", children: "Error editing file" }) });
  }
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
//@ chunk-smaqkhx4.js:9198-9795 fingerprint = EditRejectionDiff (1)
function EditRejectionDiff(t0) {
  let p = w(16),
    {
      filePath: filePath,
      oldString: oldString,
      newString: newString,
      replaceAll: replaceAll,
      style: style,
      verbose: verbose,
    } = t0,
    m;
  if (p[0] !== filePath || p[1] !== newString || p[2] !== oldString || p[3] !== replaceAll)
    ((m = () => loadRejectionDiff(filePath, oldString, newString, replaceAll)),
      (p[0] = filePath),
      (p[1] = newString),
      (p[2] = oldString),
      (p[3] = replaceAll),
      (p[4] = m));
  else m = p[4];
  let [u] = y(m),
    d;
  if (p[5] !== filePath || p[6] !== verbose)
    ((d = e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      firstLine: null,
      verbose: verbose,
    })),
      (p[5] = filePath),
      (p[6] = verbose),
      (p[7] = d));
  else d = p[7];
  let g;
  if (p[8] !== u || p[9] !== filePath || p[10] !== style || p[11] !== verbose)
    ((g = e(EditRejectionBody, { promise: u, filePath: filePath, style: style, verbose: verbose })),
      (p[8] = u),
      (p[9] = filePath),
      (p[10] = style),
      (p[11] = verbose),
      (p[12] = g));
  else g = p[12];
  let R;
  if (p[13] !== d || p[14] !== g)
    ((R = e(fo, { fallback: d, children: g })), (p[13] = d), (p[14] = g), (p[15] = R));
  else R = p[15];
  return R;
}
//@ chunk-smaqkhx4.js:9795-10133 fingerprint = EditRejectionBody (1)
function EditRejectionBody(t0) {
  let m = w(7),
    { promise: promise, filePath: filePath, style: style, verbose: verbose } = t0,
    { patch: patch, firstLine: firstLine, fileContent: fileContent } = Qr(promise),
    t1;
  if (
    m[0] !== fileContent ||
    m[1] !== filePath ||
    m[2] !== firstLine ||
    m[3] !== patch ||
    m[4] !== style ||
    m[5] !== verbose
  )
    ((t1 = e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      patch: patch,
      firstLine: firstLine,
      fileContent: fileContent,
      style: style,
      verbose: verbose,
    })),
      (m[0] = fileContent),
      (m[1] = filePath),
      (m[2] = firstLine),
      (m[3] = patch),
      (m[4] = style),
      (m[5] = verbose),
      (m[6] = t1));
  else t1 = m[6];
  return t1;
}
//@ chunk-smaqkhx4.js:10133-10735 fingerprint = loadRejectionDiff (0.882)
async function loadRejectionDiff(filePath, oldString, newString, replaceAll) {
  try {
    let ctx = await readRejectionContext(filePath, oldString, zEt);
    if (ctx === null || ctx.truncated || ctx.content === "") {
      let { patch: patch } = getPatchForEdit({
        filePath: filePath,
        fileContents: oldString,
        oldString: oldString,
        newString: newString,
      });
      return { patch: patch, firstLine: null, fileContent: void 0 };
    }
    let actualOld = findActualString(ctx.content, oldString) || oldString,
      actualNew = preserveQuoteStyle(oldString, actualOld, newString),
      { patch: patch } = getPatchForEdit({
        filePath: filePath,
        fileContents: ctx.content,
        oldString: actualOld,
        newString: actualNew,
        replaceAll: replaceAll,
      });
    return {
      patch: adjustHunkLineNumbers(patch, ctx.lineOffset - 1),
      firstLine: ctx.lineOffset === 1 ? getFirstLine(ctx.content) : null,
      fileContent: ctx.content,
    };
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`Failed to load rejection diff for ${filePath}: ${error.message}`, { level: "error" });
    else logError(error);
    return { patch: [], firstLine: null, fileContent: void 0 };
  }
}
/**
 * 对 Edit/Write 输入的某个字段做记忆目录写入清洗（XQ），有变化时记录并返回替换后的输入（checkPermissions 用它产出 updatedInput）。
 */
//@ chunk-e6aww6q8.js:1364294-1364414 fingerprint = getToolUseSummary (0.701)
function getToolUseSummary_2(e, n, r, s) {
  let h = lintBackgroundMemoryWrite(expandPath(e.file_path), e[n], r);
  if (h === e[n]) return e;
  return (rememberLintedWrite(s.host, s.toolUseId), { ...e, [n]: h });
}
/**
 * Edit 的用户可见名：计划文件显示 "Updated plan"，old_string 为空显示 "Create"，其余 "Update"。
 */
//@ chunk-e6aww6q8.js:4648659-4648833 fingerprint = userFacingName (1)
function userFacingName_2(input) {
  if (!input) return "Update";
  if (input.file_path?.startsWith(getPlansDirectory())) return "Updated plan";
  if (input.edits != null) return "Update";
  if (input.old_string === "") return "Create";
  return "Update";
}

export { getToolUseSummary_2, userFacingName_2 };
