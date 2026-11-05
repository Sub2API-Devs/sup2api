/**
 * tools/FileWriteTool/UI.tsx
 *
 * Write 工具的终端渲染：新建文件预览、更新 diff、拒绝/错误消息（混有 lodash 片段与误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileWriteTool/UI.tsx
 * pieces: chunk-4rfadb6m.js (17), chunk-5xgkngpb.js (3)
 * attribution: sole-consumer 3, affinity 1, file-local 1, layout 2, facade-majority 6, fingerprint 5, callgraph-fingerprint 2
 */
import { isAbsolute, resolve } from "path";
import { lintBackgroundMemoryWrite, rememberLintedWrite } from "../../memdir/memoryWriteLint.js";
import { expandPath } from "../../utils/path.js";
import { getPlansDirectory } from "../../utils/plans.js";
import { getDisplayPath } from "../../utils/file.js";
import {
  init_react_production,
  useState,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import { lineWidth } from "../../ink/line-width-cache.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useHighlightedLineHeights, HighlightedCode } from "../../components/HighlightedCode.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { OverflowHint, CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { FileEditToolUseRejectedMessage } from "../../components/FileEditToolUseRejectedMessage.js";
import { getCwd } from "../../utils/cwd.js";
import { openForDiff, settingsWriteGateText } from "../../utils/settings/settingsReview.js";
import { readCapped } from "../../utils/readEditContext.js";
import { getPatchForDisplay } from "../../utils/diff.js";
import { isSyscallError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { extractTag } from "../../utils/messages.js";
import { FallbackToolUseErrorMessage } from "../../components/FallbackToolUseErrorMessage.js";
import { isScratchpadDisplayPath } from "../../utils/permissions/filesystem.js";
import { FileEditToolUpdatedMessage } from "../../components/FileEditToolUpdatedMessage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1363614-1363734 callgraph-fingerprint (2.1.88 match: renderToolUseMessage, 0.519)
/**
 * 对 Edit/Write 输入的某个字段做记忆目录写入清洗（XQ），有变化时记录并返回替换后的输入（checkPermissions 用它产出 updatedInput）。
 */
function renderToolUseMessage_2(input, textField, memorySource, summaryContext) {
  let lintedText = lintBackgroundMemoryWrite(expandPath(input.file_path), input[textField], memorySource);
  if (lintedText === input[textField]) return input;
  rememberLintedWrite(summaryContext.host, summaryContext.toolUseId);
  return {
    ...input,
    [textField]: lintedText,
  };
}
//@ chunk-5xgkngpb.js:1411896-1411981 fingerprint (2.1.88 match: userFacingName, 1)
/**
 * Write 的用户可见名：计划文件 "Updated plan"，否则 "Write"。
 */
function userFacingName(input) {
  if (input?.file_path?.startsWith(getPlansDirectory())) return "Updated plan";
  return "Write";
}
//@ chunk-5xgkngpb.js:4757418-4757486 callgraph-fingerprint (2.1.88 match: getToolUseSummary, 1)
/**
 * Edit/Write 工具调用渲染：显示路径。
 */
function getToolUseSummary_4(input) {
  if (!input?.file_path) return null;
  return getDisplayPath(input.file_path);
}
//@ chunk-4rfadb6m.js:1019-1023 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4rfadb6m.js:1019", () => {
  init_react_production();
});
//@ chunk-4rfadb6m.js:1072-1318 sole-consumer (2.1.88 match: measureText, 0.811)
function countWrappedLines(text, maxWidth, limit = 1 / 0) {
  let noWrap = maxWidth <= 0 || !Number.isFinite(maxWidth);
  let lineCount = 0;
  let offset = 0;
  while (offset <= text.length) {
    let end = text.indexOf(
      `
`,
      offset,
    );
    let line = end === -1 ? text.substring(offset) : text.substring(offset, end);
    if (noWrap) lineCount++;
    else {
      let width = lineWidth(line);
      lineCount += width === 0 ? 1 : Math.ceil(width / maxWidth);
    }
    if (lineCount > limit) return lineCount;
    if (end === -1) break;
    offset = end + 1;
  }
  return lineCount;
}
//@ chunk-4rfadb6m.js:1318-1356 sole-consumer
/**
 * 判断文本按列宽换行后的行数是否超过上限。
 */
function exceedsWrappedLineLimit(text, maxWidth, limit) {
  return countWrappedLines(text, maxWidth, limit) > limit;
}
//@ chunk-4rfadb6m.js:1356-1371 affinity
/**
 * 文件内容预览最多显示的行数与换行分隔符。
 */
var MAX_PREVIEW_LINES = 10;
var LINE_SEPARATOR = `
`;
//@ chunk-4rfadb6m.js:1371-1443 file-local
function countLines(content) {
  let parts = content.split(LINE_SEPARATOR);
  return content.endsWith(LINE_SEPARATOR) ? parts.length - 1 : parts.length;
}
//@ chunk-4rfadb6m.js:1443-1591 layout
function PreviousContentReplacedNote() {
  let $ = useMemoCache(1);
  let element;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    element = jsxProd_default(Text, {
      dimColor: true,
      children: " \u2014 previous content replaced (no diff shown)",
    });
    $[0] = element;
  } else element = $[0];
  return element;
}
//@ chunk-4rfadb6m.js:1591-3786 facade-majority (2.1.88 match: FileWriteToolCreatedMessage, 0.471)
/**
 * Write 新建文件结果的终端渲染：显示行数与带高亮的内容预览（非 verbose 时截断）。
 */
function FileWriteToolCreatedMessage(props) {
  let $ = useMemoCache(51);
  let { filePath, content, verbose, replacedUndiffedContent } = props;
  let replacedUndiffed = replacedUndiffedContent === undefined ? false : replacedUndiffedContent;
  let { columns } = useTerminalSize();
  let max = Math.max(1, columns - 12);
  let fullContent = content || "(No content)";
  let numLines = countLines(content);
  let previewContent;
  if ($[0] !== fullContent || $[1] !== max || $[2] !== verbose) {
    previewContent = verbose
      ? fullContent
      : fullContent
          .split(LINE_SEPARATOR)
          .slice(0, MAX_PREVIEW_LINES)
          .join(LINE_SEPARATOR)
          .slice(0, MAX_PREVIEW_LINES * (max + 1));
    $[0] = fullContent;
    $[1] = max;
    $[2] = verbose;
    $[3] = previewContent;
  } else previewContent = $[3];
  let shownContent = previewContent;
  let highlightedLineHeights = useHighlightedLineHeights(verbose ? "" : shownContent, filePath, max);
  let contentLines;
  if ($[4] !== fullContent) {
    contentLines = fullContent.split(LINE_SEPARATOR, MAX_PREVIEW_LINES);
    $[4] = fullContent;
    $[5] = contentLines;
  } else contentLines = $[5];
  let firstLines = contentLines;
  let previewLines;
  if ($[6] !== shownContent || $[7] !== verbose) {
    previewLines = verbose ? [] : shownContent.split(LINE_SEPARATOR);
    $[6] = shownContent;
    $[7] = verbose;
    $[8] = previewLines;
  } else previewLines = $[8];
  let previewLineTexts = previewLines;
  let isTruncated;
  let shownChars;
  let shownLineCount;
  if ($[9] !== highlightedLineHeights || $[10] !== previewLineTexts || $[11] !== firstLines) {
    let linesLeft = MAX_PREVIEW_LINES;
    shownLineCount = 0;
    shownChars = 0;
    isTruncated = false;
    for (const [lineIndex, lineHeight] of highlightedLineHeights.entries()) {
      let lineText = previewLineTexts[lineIndex] ?? "";
      if (linesLeft === 0) {
        break;
      }
      if (lineHeight > linesLeft || lineText !== firstLines[lineIndex]) {
        shownChars =
          shownChars + Math.floor((lineText.length * Math.min(lineHeight, linesLeft)) / lineHeight);
        isTruncated = true;
        break;
      }
      linesLeft = linesLeft - lineHeight;
      shownLineCount++;
      shownChars = shownChars + (lineText.length + LINE_SEPARATOR.length);
    }
    $[9] = highlightedLineHeights;
    $[10] = previewLineTexts;
    $[11] = firstLines;
    $[12] = isTruncated;
    $[13] = shownChars;
    $[14] = shownLineCount;
  } else {
    isTruncated = $[12];
    shownChars = $[13];
    shownLineCount = $[14];
  }
  let trailingBlankLine = shownLineCount === numLines - 1 && firstLines[shownLineCount] === "";
  let count = numLines - shownLineCount - (trailingBlankLine ? 1 : 0);
  let hiddenChars = isTruncated ? content.length - shownChars : undefined;
  let lineCountElement;
  if ($[15] !== numLines) {
    lineCountElement = jsxProd_default(Text, {
      bold: true,
      children: numLines,
    });
    $[15] = numLines;
    $[16] = lineCountElement;
  } else lineCountElement = $[16];
  let linesWord;
  if ($[17] !== numLines) {
    linesWord = plural(numLines, "line");
    $[17] = numLines;
    $[18] = linesWord;
  } else linesWord = $[18];
  let children;
  if ($[19] !== filePath || $[20] !== verbose) {
    children = verbose ? filePath : getDisplayPath(filePath);
    $[19] = filePath;
    $[20] = verbose;
    $[21] = children;
  } else children = $[21];
  let pathElement;
  if ($[22] !== filePath || $[23] !== children) {
    pathElement = jsxProd_default(Text, {
      bold: true,
      children: jsxProd_default(FilePathLink, {
        filePath,
        children,
      }),
    });
    $[22] = filePath;
    $[23] = children;
    $[24] = pathElement;
  } else pathElement = $[24];
  let replacedNote;
  if ($[25] !== replacedUndiffed) {
    replacedNote = replacedUndiffed && jsxProd_default(PreviousContentReplacedNote, {});
    $[25] = replacedUndiffed;
    $[26] = replacedNote;
  } else replacedNote = $[26];
  let header;
  if ($[27] !== lineCountElement || $[28] !== linesWord || $[29] !== pathElement || $[30] !== replacedNote) {
    header = jsxProd_default_2(Text, {
      children: ["Wrote ", lineCountElement, " ", linesWord, " to", " ", pathElement, replacedNote],
    });
    $[27] = lineCountElement;
    $[28] = linesWord;
    $[29] = pathElement;
    $[30] = replacedNote;
    $[31] = header;
  } else header = $[31];
  const overflowY = verbose ? undefined : "hidden";
  const maxHeight = verbose ? undefined : MAX_PREVIEW_LINES;
  const width = verbose ? undefined : max;
  let children_2;
  if ($[32] !== shownContent || $[33] !== filePath || $[34] !== max) {
    children_2 = jsxProd_default(HighlightedCode, {
      code: shownContent,
      filePath,
      width: max,
    });
    $[32] = shownContent;
    $[33] = filePath;
    $[34] = max;
    $[35] = children_2;
  } else children_2 = $[35];
  let children_3;
  if ($[36] !== width || $[37] !== children_2) {
    children_3 = jsxProd_default(Box, {
      flexDirection: "column",
      flexShrink: 0,
      width,
      children: children_2,
    });
    $[36] = width;
    $[37] = children_2;
    $[38] = children_3;
  } else children_3 = $[38];
  let clippedContent;
  if ($[39] !== overflowY || $[40] !== maxHeight || $[41] !== children_3) {
    clippedContent = jsxProd_default(Box, {
      flexDirection: "column",
      overflowY,
      maxHeight,
      children: children_3,
    });
    $[39] = overflowY;
    $[40] = maxHeight;
    $[41] = children_3;
    $[42] = clippedContent;
  } else clippedContent = $[42];
  let overflowHint;
  if ($[43] !== hiddenChars || $[44] !== count || $[45] !== verbose) {
    overflowHint =
      !verbose &&
      jsxProd_default(OverflowHint, {
        count,
        hiddenChars,
        expandable: true,
      });
    $[43] = hiddenChars;
    $[44] = count;
    $[45] = verbose;
    $[46] = overflowHint;
  } else overflowHint = $[46];
  let message;
  if ($[47] !== header || $[48] !== clippedContent || $[49] !== overflowHint) {
    message = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [header, clippedContent, overflowHint],
      }),
    });
    $[47] = header;
    $[48] = clippedContent;
    $[49] = overflowHint;
    $[50] = message;
  } else message = $[50];
  return message;
}
//@ chunk-4rfadb6m.js:3786-3942 layout
/**
 * update 结果但 structuredPatch 为空、originalFile 为 null（旧内容过大未 diff）时为真。
 */
function isUpdateWithOmittedDiff({ type: resultType, content, structuredPatch, originalFile }) {
  return (
    resultType === "update" &&
    Array.isArray(structuredPatch) &&
    structuredPatch.length === 0 &&
    originalFile === null &&
    typeof content === "string" &&
    content !== ""
  );
}
//@ chunk-4rfadb6m.js:3942-4117 facade-majority (2.1.88 match: isResultTruncated, 0.817)
function isResultTruncated(result, { columns }) {
  let { type: resultType, content } = result;
  if (resultType !== "create" && !isUpdateWithOmittedDiff(result)) return false;
  if (typeof content !== "string") return false;
  let lineBudget = content.endsWith(LINE_SEPARATOR) ? MAX_PREVIEW_LINES + 1 : MAX_PREVIEW_LINES;
  return exceedsWrappedLineLimit(content, Math.max(1, columns - 12), lineBudget);
}
//@ chunk-4rfadb6m.js:4117-4289 facade-majority (2.1.88 match: renderToolUseMessage, 1)
function renderToolUseMessage(file_path, { verbose }) {
  if (!file_path.file_path) return null;
  if (file_path.file_path.startsWith(getPlansDirectory())) return "";
  return jsxProd_default(FilePathLink, {
    filePath: file_path.file_path,
    children: verbose ? file_path.file_path : getDisplayPath(file_path.file_path),
  });
}
//@ chunk-4rfadb6m.js:4289-4401 facade-majority (2.1.88 match: renderToolUseRejectedMessage, 1)
function renderToolUseRejectedMessage({ file_path, content }, { style, verbose }) {
  return jsxProd_default(WriteRejectionDiff, {
    filePath: file_path,
    content,
    style,
    verbose,
  });
}
//@ chunk-4rfadb6m.js:4401-5107 fingerprint (2.1.88 match: WriteRejectionDiff, 1)
function WriteRejectionDiff(props) {
  let $ = useMemoCache(20);
  let { filePath, content, style, verbose } = props;
  let t1;
  if ($[0] !== content || $[1] !== filePath) {
    t1 = () => loadRejectionDiff(filePath, content);
    $[0] = content;
    $[1] = filePath;
    $[2] = t1;
  } else t1 = $[2];
  let [dataPromise] = useState(t1);
  let t2;
  if ($[3] !== content) {
    t2 = getFirstLine(content);
    $[3] = content;
    $[4] = t2;
  } else t2 = $[4];
  let firstLine = t2;
  let t3;
  if ($[5] !== content || $[6] !== filePath || $[7] !== firstLine || $[8] !== verbose) {
    t3 = jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "write",
      content,
      firstLine,
      verbose,
    });
    $[5] = content;
    $[6] = filePath;
    $[7] = firstLine;
    $[8] = verbose;
    $[9] = t3;
  } else t3 = $[9];
  let createFallback = t3;
  let children;
  if (
    $[10] !== createFallback ||
    $[11] !== dataPromise ||
    $[12] !== filePath ||
    $[13] !== firstLine ||
    $[14] !== style ||
    $[15] !== verbose
  ) {
    children = jsxProd_default(WriteRejectionBody, {
      promise: dataPromise,
      filePath,
      firstLine,
      createFallback,
      style,
      verbose,
    });
    $[10] = createFallback;
    $[11] = dataPromise;
    $[12] = filePath;
    $[13] = firstLine;
    $[14] = style;
    $[15] = verbose;
    $[16] = children;
  } else children = $[16];
  let t5;
  if ($[17] !== createFallback || $[18] !== children) {
    t5 = jsxProd_default(suspenseTypeExport, {
      fallback: createFallback,
      children,
    });
    $[17] = createFallback;
    $[18] = children;
    $[19] = t5;
  } else t5 = $[19];
  return t5;
}
//@ chunk-4rfadb6m.js:5107-5644 fingerprint (2.1.88 match: WriteRejectionBody, 0.819)
function WriteRejectionBody(props) {
  let $ = useMemoCache(8);
  let { promise, filePath, firstLine, createFallback, style, verbose } = props;
  let data = use(promise);
  if (data.type === "create") {
    return createFallback;
  }
  if (data.type === "error") {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(MessageResponse, {
        children: jsxProd_default(Text, {
          children: "(No changes)",
        }),
      });
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  let t1;
  if (
    $[1] !== data.oldContent ||
    $[2] !== data.patch ||
    $[3] !== filePath ||
    $[4] !== firstLine ||
    $[5] !== style ||
    $[6] !== verbose
  ) {
    t1 = jsxProd_default(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      patch: data.patch,
      firstLine,
      fileContent: data.oldContent,
      style,
      verbose,
    });
    $[1] = data.oldContent;
    $[2] = data.patch;
    $[3] = filePath;
    $[4] = firstLine;
    $[5] = style;
    $[6] = verbose;
    $[7] = t1;
  } else t1 = $[7];
  return t1;
}
//@ chunk-4rfadb6m.js:5644-6076 fingerprint (2.1.88 match: loadRejectionDiff, 0.898)
async function loadRejectionDiff(filePath, content) {
  try {
    let fullFilePath = isAbsolute(filePath) ? filePath : resolve(getCwd(), filePath);
    let handle = await openForDiff(fullFilePath);
    if (handle === null)
      return {
        type: "create",
      };
    let oldContent;
    try {
      oldContent = await readCapped(handle);
    } finally {
      await handle.close();
    }
    if (oldContent === null)
      return {
        type: "create",
      };
    return {
      type: "update",
      patch: getPatchForDisplay({
        filePath,
        fileContents: oldContent,
        edits: [
          {
            old_string: oldContent,
            new_string: content,
            replace_all: false,
          },
        ],
      }),
      oldContent,
    };
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Failed to load rejection diff for ${filePath}: ${error.message}`, {
        level: "error",
      });
    else logError(error);
    return {
      type: "error",
    };
  }
}
//@ chunk-4rfadb6m.js:6076-6304 facade-majority (2.1.88 match: renderToolUseErrorMessage, 0.51)
function renderToolUseErrorMessage(result, { verbose, toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: "Error writing file",
      }),
    });
  return jsxProd_default(FallbackToolUseErrorMessage, {
    result,
    verbose,
  });
}
//@ chunk-4rfadb6m.js:6304-6474 facade-majority
function renderToolResultMessage(result, progressMessages, { style, verbose }) {
  if (result.staged && result.filePath)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: settingsWriteGateText(result.stagedWording),
      }),
    });
  return renderToolResultMessage_2(result, progressMessages, {
    style,
    verbose,
  });
}
//@ chunk-4rfadb6m.js:6474-7479 fingerprint (2.1.88 match: renderToolResultMessage, 0.785)
function renderToolResultMessage_2(
  result,
  _progressMessagesForMessage,
  { style, verbose, replacedUndiffedContent = false },
) {
  let { filePath = "", content, structuredPatch, type, originalFile } = result;
  if (!filePath) return null;
  switch (type) {
    case "create": {
      if (filePath.startsWith(getPlansDirectory()) && !verbose) {
        if (style !== "condensed")
          return jsxProd_default(MessageResponse, {
            children: jsxProd_default(Text, {
              dimColor: true,
              children: "/plan to preview",
            }),
          });
      } else if (style === "condensed" && !verbose) {
        let numLines = countLines(content);
        return jsxProd_default_2(Text, {
          children: [
            "Wrote ",
            jsxProd_default(Text, {
              bold: true,
              children: numLines,
            }),
            " ",
            plural(numLines, "line"),
            " to",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: jsxProd_default(FilePathLink, {
                filePath,
                children: getDisplayPath(filePath),
              }),
            }),
            replacedUndiffedContent && jsxProd_default(PreviousContentReplacedNote, {}),
          ],
        });
      } else if (!verbose && isScratchpadDisplayPath(filePath)) {
        let numLines = countLines(content);
        return jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Text, {
            children: [
              "Wrote ",
              jsxProd_default(Text, {
                bold: true,
                children: numLines,
              }),
              " ",
              plural(numLines, "line"),
              replacedUndiffedContent && jsxProd_default(PreviousContentReplacedNote, {}),
              " ",
              jsxProd_default(CtrlOToExpand, {}),
            ],
          }),
        });
      }
      return jsxProd_default(FileWriteToolCreatedMessage, {
        filePath,
        content,
        verbose,
        replacedUndiffedContent,
      });
    }
    case "update": {
      if (isUpdateWithOmittedDiff(result))
        return renderToolResultMessage_2(
          {
            ...result,
            type: "create",
          },
          _progressMessagesForMessage,
          {
            style,
            verbose,
            replacedUndiffedContent: true,
          },
        );
      let isPlanFile = filePath.startsWith(getPlansDirectory());
      return jsxProd_default(FileEditToolUpdatedMessage, {
        filePath,
        structuredPatch,
        firstLine: getFirstLine(content),
        fileContent: originalFile ?? undefined,
        style,
        verbose,
        previewHint: isPlanFile ? "/plan to preview" : undefined,
        collapsed: !isPlanFile && isScratchpadDisplayPath(filePath),
      });
    }
  }
}
export {
  userFacingName,
  renderToolUseMessage_2,
  getToolUseSummary_4,
  FileWriteToolCreatedMessage,
  isResultTruncated,
  renderToolResultMessage,
  renderToolUseErrorMessage,
  renderToolUseMessage,
  renderToolUseRejectedMessage,
};
