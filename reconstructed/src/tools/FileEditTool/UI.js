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
import { lintBackgroundMemoryWrite, rememberLintedWrite } from "../../memdir/memoryWriteLint.js";
import { expandPath } from "../../utils/path.js";
import { getPlansDirectory } from "../../utils/plans.js";
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { getDisplayPath, FILE_NOT_FOUND_CWD_NOTE } from "../../utils/file.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";
import { settingsWriteGateText, readRejectionContext } from "../../utils/settings/settingsReview.js";
import { FileEditToolUpdatedMessage } from "../../components/FileEditToolUpdatedMessage.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { isScratchpadDisplayPath } from "../../utils/permissions/filesystem.js";
import { FileEditToolUseRejectedMessage } from "../../components/FileEditToolUseRejectedMessage.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { DIFF_CONTEXT_LINES, adjustHunkLineNumbers } from "../../utils/diff.js";
import { getPatchForEdit, findActualString, preserveQuoteStyle } from "./utils.js";
import { isFsInaccessible } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1364294-1364414 fingerprint = getToolUseSummary (0.701)
/**
 * 对 Edit/Write 输入的某个字段做记忆目录写入清洗（XQ），有变化时记录并返回替换后的输入（checkPermissions 用它产出 updatedInput）。
 */
function getToolUseSummary_2(input, textField, memorySource, summaryContext) {
  let lintedText = lintBackgroundMemoryWrite(expandPath(input.file_path), input[textField], memorySource);
  if (lintedText === input[textField]) return input;
  rememberLintedWrite(summaryContext.host, summaryContext.toolUseId);
  return {
    ...input,
    [textField]: lintedText,
  };
}
//@ chunk-e6aww6q8.js:4648659-4648833 fingerprint = userFacingName (1)
/**
 * Edit 的用户可见名：计划文件显示 "Updated plan"，old_string 为空显示 "Create"，其余 "Update"。
 */
function userFacingName_2(input) {
  if (!input) return "Update";
  if (input.file_path?.startsWith(getPlansDirectory())) return "Updated plan";
  if (input.edits != null) return "Update";
  if (input.old_string === "") return "Create";
  return "Update";
}
//@ chunk-smaqkhx4.js:7811-7815 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-smaqkhx4.js:7811", () => {
  init_react_production();
});
//@ chunk-smaqkhx4.js:7815-7948 layout = renderToolUseMessage (1)
function renderToolUseMessage({ file_path }, { verbose }) {
  if (!file_path) return null;
  if (file_path.startsWith(getPlansDirectory())) return "";
  return jsxProd_default(FilePathLink, {
    filePath: file_path,
    children: verbose ? file_path : getDisplayPath(file_path),
  });
}
//@ chunk-smaqkhx4.js:7948-8333 fingerprint = renderToolResultMessage (0.865)
function renderToolResultMessage(
  { filePath = "", structuredPatch, originalFile, staged, stagedWording },
  _progressMessagesForMessage,
  { style, verbose },
) {
  if (!filePath) return null;
  if (staged)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: settingsWriteGateText(stagedWording),
      }),
    });
  let isPlanFile = filePath.startsWith(getPlansDirectory());
  return jsxProd_default(FileEditToolUpdatedMessage, {
    filePath,
    structuredPatch,
    firstLine: originalFile ? getFirstLine(originalFile) : null,
    fileContent: originalFile || undefined,
    style,
    verbose,
    previewHint: isPlanFile ? "/plan to preview" : undefined,
    collapsed: !isPlanFile && isScratchpadDisplayPath(filePath),
  });
}
//@ chunk-smaqkhx4.js:8333-8721 fingerprint = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage(input, options) {
  let { style, verbose } = options;
  let filePath = input.file_path;
  let oldString = input.old_string ?? "";
  let newString = input.new_string ?? "";
  let replaceAll = input.replace_all ?? false;
  if ("edits" in input && input.edits != null)
    return jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      firstLine: null,
      verbose,
    });
  if (oldString === "")
    return jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "write",
      content: newString,
      firstLine: getFirstLine(newString),
      verbose,
    });
  return jsxProd_default(EditRejectionDiff, {
    filePath,
    oldString,
    newString,
    replaceAll,
    style,
    verbose,
  });
}
//@ chunk-smaqkhx4.js:8721-9198 fingerprint = renderToolUseErrorMessage (0.511)
function renderToolUseErrorMessage(result, options) {
  let { verbose, toolDenialKind } = options;
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  ) {
    let errorMessage = extractTag(result, "tool_use_error");
    if (errorMessage?.includes("File has not been read yet"))
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "File must be read first",
        }),
      });
    if (errorMessage?.includes(FILE_NOT_FOUND_CWD_NOTE))
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          color: "error",
          children: "File not found",
        }),
      });
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: "Error editing file",
      }),
    });
  }
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-smaqkhx4.js:9198-9795 fingerprint = EditRejectionDiff (1)
function EditRejectionDiff(props) {
  let $ = useMemoCache(16);
  let { filePath, oldString, newString, replaceAll, style, verbose } = props;
  let t1;
  if ($[0] !== filePath || $[1] !== newString || $[2] !== oldString || $[3] !== replaceAll) {
    t1 = () => loadRejectionDiff(filePath, oldString, newString, replaceAll);
    $[0] = filePath;
    $[1] = newString;
    $[2] = oldString;
    $[3] = replaceAll;
    $[4] = t1;
  } else t1 = $[4];
  let [dataPromise] = useState(t1);
  let fallback;
  if ($[5] !== filePath || $[6] !== verbose) {
    fallback = jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      firstLine: null,
      verbose,
    });
    $[5] = filePath;
    $[6] = verbose;
    $[7] = fallback;
  } else fallback = $[7];
  let children;
  if ($[8] !== dataPromise || $[9] !== filePath || $[10] !== style || $[11] !== verbose) {
    children = jsxProd_default(EditRejectionBody, {
      promise: dataPromise,
      filePath,
      style,
      verbose,
    });
    $[8] = dataPromise;
    $[9] = filePath;
    $[10] = style;
    $[11] = verbose;
    $[12] = children;
  } else children = $[12];
  let t4;
  if ($[13] !== fallback || $[14] !== children) {
    t4 = jsxProd_default(suspenseTypeExport, {
      fallback,
      children,
    });
    $[13] = fallback;
    $[14] = children;
    $[15] = t4;
  } else t4 = $[15];
  return t4;
}
//@ chunk-smaqkhx4.js:9795-10133 fingerprint = EditRejectionBody (1)
function EditRejectionBody(props) {
  let $ = useMemoCache(7);
  let { promise, filePath, style, verbose } = props;
  let { patch, firstLine, fileContent } = use(promise);
  let t1;
  if (
    $[0] !== fileContent ||
    $[1] !== filePath ||
    $[2] !== firstLine ||
    $[3] !== patch ||
    $[4] !== style ||
    $[5] !== verbose
  ) {
    t1 = jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      patch,
      firstLine,
      fileContent,
      style,
      verbose,
    });
    $[0] = fileContent;
    $[1] = filePath;
    $[2] = firstLine;
    $[3] = patch;
    $[4] = style;
    $[5] = verbose;
    $[6] = t1;
  } else t1 = $[6];
  return t1;
}
//@ chunk-smaqkhx4.js:10133-10735 fingerprint = loadRejectionDiff (0.882)
async function loadRejectionDiff(filePath, oldString, newString, replaceAll) {
  try {
    let ctx = await readRejectionContext(filePath, oldString, DIFF_CONTEXT_LINES);
    if (ctx === null || ctx.truncated || ctx.content === "") {
      let { patch } = getPatchForEdit({
        filePath,
        fileContents: oldString,
        oldString,
        newString,
      });
      return {
        patch,
        firstLine: null,
        fileContent: undefined,
      };
    }
    let actualOld = findActualString(ctx.content, oldString) || oldString;
    let actualNew = preserveQuoteStyle(oldString, actualOld, newString);
    let { patch } = getPatchForEdit({
      filePath,
      fileContents: ctx.content,
      oldString: actualOld,
      newString: actualNew,
      replaceAll,
    });
    return {
      patch: adjustHunkLineNumbers(patch, ctx.lineOffset - 1),
      firstLine: ctx.lineOffset === 1 ? getFirstLine(ctx.content) : null,
      fileContent: ctx.content,
    };
  } catch (e) {
    if (isFsInaccessible(e))
      logForDebugging(`Failed to load rejection diff for ${filePath}: ${e.message}`, {
        level: "error",
      });
    else logError(e);
    return {
      patch: [],
      firstLine: null,
      fileContent: undefined,
    };
  }
}
export {
  getToolUseSummary_2,
  userFacingName_2,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseMessage,
  renderToolUseRejectedMessage,
};
