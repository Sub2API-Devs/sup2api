/**
 * tools/FileWriteTool/UI.tsx
 *
 * Write 工具的终端渲染：新建文件预览、更新 diff、拒绝/错误消息（混有 lodash 片段与误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileWriteTool/UI.tsx
 * pieces: chunk-e6aww6q8.js (3), chunk-ek7g58h7.js (17)
 * attribution: fingerprint 5, callgraph-fingerprint 2, sole-consumer 3, affinity 1, file-local 1, layout 2, facade-majority 6
 */
import { isAbsolute, resolve } from "path";
import { init_react_production, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { lineWidth } from "../../ink/line-width-cache.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useHighlightedLineHeights, HighlightedCode } from "../../components/HighlightedCode.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { getDisplayPath } from "../../utils/file.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { OverflowHint, CtrlOToExpand } from "../../components/CtrlOToExpand.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { getPlansDirectory } from "../../utils/plans.js";
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

//@ chunk-ek7g58h7.js:1019-1023 sole-consumer
init_react_production();
//@ chunk-ek7g58h7.js:1072-1318 sole-consumer = measureText (0.861)
function countWrappedLines(text, maxWidth, limit = 1 / 0) {
  let noWrap = maxWidth <= 0 || !Number.isFinite(maxWidth);
  let d = 0;
  let f = 0;
  while (f <= text.length) {
    let end = text.indexOf(
      `
`,
      f,
    );
    let line = end === -1 ? text.substring(f) : text.substring(f, end);
    if (noWrap) d++;
    else {
      let g = lineWidth(line);
      d += g === 0 ? 1 : Math.ceil(g / maxWidth);
    }
    if (d > limit) return d;
    if (end === -1) break;
    f = end + 1;
  }
  return d;
}
//@ chunk-ek7g58h7.js:1318-1356 sole-consumer
/**
 * 判断文本按列宽换行后的行数是否超过上限。
 */
function exceedsWrappedLineLimit(text, maxWidth, limit) {
  return countWrappedLines(text, maxWidth, limit) > limit;
}
//@ chunk-ek7g58h7.js:1356-1371 affinity
/**
 * 文件内容预览最多显示的行数与换行分隔符。
 */
var MAX_PREVIEW_LINES = 10;
var LINE_SEPARATOR = `
`;
//@ chunk-ek7g58h7.js:1371-1443 file-local
function countLines(content) {
  let parts = content.split(LINE_SEPARATOR);
  return content.endsWith(LINE_SEPARATOR) ? parts.length - 1 : parts.length;
}
//@ chunk-ek7g58h7.js:1443-1591 layout
function PreviousContentReplacedNote() {
  let i = w(1);
  let o;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    o = jsxProd_default(Text, {
      dimColor: true,
      children: " \u2014 previous content replaced (no diff shown)",
    });
    i[0] = o;
  } else o = i[0];
  return o;
}
//@ chunk-ek7g58h7.js:1591-3786 facade-majority = FileWriteToolCreatedMessage (0.46)
/**
 * Write 新建文件结果的终端渲染：显示行数与带高亮的内容预览（非 verbose 时截断）。
 */
function FileWriteToolCreatedMessage(props) {
  let h = w(51);
  let { filePath, content, verbose, replacedUndiffedContent } = props;
  let f = replacedUndiffedContent === undefined ? false : replacedUndiffedContent;
  let { columns } = useTerminalSize();
  let max = Math.max(1, columns - 12);
  let g = content || "(No content)";
  let numLines = countLines(content);
  let b;
  if (h[0] !== g || h[1] !== max || h[2] !== verbose) {
    b = verbose
      ? g
      : g
          .split(LINE_SEPARATOR)
          .slice(0, MAX_PREVIEW_LINES)
          .join(LINE_SEPARATOR)
          .slice(0, MAX_PREVIEW_LINES * (max + 1));
    h[0] = g;
    h[1] = max;
    h[2] = verbose;
    h[3] = b;
  } else b = h[3];
  let x = b;
  let highlightedLineHeights = useHighlightedLineHeights(verbose ? "" : x, filePath, max);
  let ke;
  if (h[4] !== g) {
    ke = g.split(LINE_SEPARATOR, MAX_PREVIEW_LINES);
    h[4] = g;
    h[5] = ke;
  } else ke = h[5];
  let _ = ke;
  let Te;
  if (h[6] !== x || h[7] !== verbose) {
    Te = verbose ? [] : x.split(LINE_SEPARATOR);
    h[6] = x;
    h[7] = verbose;
    h[8] = Te;
  } else Te = h[8];
  let ae = Te;
  let le;
  let C;
  let T;
  if (h[9] !== highlightedLineHeights || h[10] !== ae || h[11] !== _) {
    let W = MAX_PREVIEW_LINES;
    T = 0;
    C = 0;
    le = false;
    for (const [We, V] of highlightedLineHeights.entries()) {
      let ce = ae[We] ?? "";
      if (W === 0) {
        break;
      }
      if (V > W || ce !== _[We]) {
        C = C + Math.floor((ce.length * Math.min(V, W)) / V);
        le = true;
        break;
      }
      W = W - V;
      T++;
      C = C + (ce.length + LINE_SEPARATOR.length);
    }
    h[9] = highlightedLineHeights;
    h[10] = ae;
    h[11] = _;
    h[12] = le;
    h[13] = C;
    h[14] = T;
  } else {
    le = h[12];
    C = h[13];
    T = h[14];
  }
  let Ie = T === numLines - 1 && _[T] === "";
  let count = numLines - T - (Ie ? 1 : 0);
  let hiddenChars = le ? content.length - C : undefined;
  let Y;
  if (h[15] !== numLines) {
    Y = jsxProd_default(Text, {
      bold: true,
      children: numLines,
    });
    h[15] = numLines;
    h[16] = Y;
  } else Y = h[16];
  let q;
  if (h[17] !== numLines) {
    q = plural(numLines, "line");
    h[17] = numLines;
    h[18] = q;
  } else q = h[18];
  let children;
  if (h[19] !== filePath || h[20] !== verbose) {
    children = verbose ? filePath : getDisplayPath(filePath);
    h[19] = filePath;
    h[20] = verbose;
    h[21] = children;
  } else children = h[21];
  let G;
  if (h[22] !== filePath || h[23] !== children) {
    G = jsxProd_default(Text, {
      bold: true,
      children: jsxProd_default(FilePathLink, {
        filePath,
        children,
      }),
    });
    h[22] = filePath;
    h[23] = children;
    h[24] = G;
  } else G = h[24];
  let J;
  if (h[25] !== f) {
    J = f && jsxProd_default(PreviousContentReplacedNote, {});
    h[25] = f;
    h[26] = J;
  } else J = h[26];
  let Q;
  if (h[27] !== Y || h[28] !== q || h[29] !== G || h[30] !== J) {
    Q = jsxProd_default_2(Text, {
      children: ["Wrote ", Y, " ", q, " to", " ", G, J],
    });
    h[27] = Y;
    h[28] = q;
    h[29] = G;
    h[30] = J;
    h[31] = Q;
  } else Q = h[31];
  const overflowY = verbose ? undefined : "hidden";
  const maxHeight = verbose ? undefined : MAX_PREVIEW_LINES;
  const width = verbose ? undefined : max;
  let children_2;
  if (h[32] !== x || h[33] !== filePath || h[34] !== max) {
    children_2 = jsxProd_default(HighlightedCode, {
      code: x,
      filePath,
      width: max,
    });
    h[32] = x;
    h[33] = filePath;
    h[34] = max;
    h[35] = children_2;
  } else children_2 = h[35];
  let children_3;
  if (h[36] !== width || h[37] !== children_2) {
    children_3 = jsxProd_default(Box, {
      flexDirection: "column",
      flexShrink: 0,
      width,
      children: children_2,
    });
    h[36] = width;
    h[37] = children_2;
    h[38] = children_3;
  } else children_3 = h[38];
  let I;
  if (h[39] !== overflowY || h[40] !== maxHeight || h[41] !== children_3) {
    I = jsxProd_default(Box, {
      flexDirection: "column",
      overflowY,
      maxHeight,
      children: children_3,
    });
    h[39] = overflowY;
    h[40] = maxHeight;
    h[41] = children_3;
    h[42] = I;
  } else I = h[42];
  let X;
  if (h[43] !== hiddenChars || h[44] !== count || h[45] !== verbose) {
    X =
      !verbose &&
      jsxProd_default(OverflowHint, {
        count,
        hiddenChars,
        expandable: true,
      });
    h[43] = hiddenChars;
    h[44] = count;
    h[45] = verbose;
    h[46] = X;
  } else X = h[46];
  let De;
  if (h[47] !== Q || h[48] !== I || h[49] !== X) {
    De = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [Q, I, X],
      }),
    });
    h[47] = Q;
    h[48] = I;
    h[49] = X;
    h[50] = De;
  } else De = h[50];
  return De;
}
//@ chunk-ek7g58h7.js:3786-3942 layout
/**
 * update 结果但 structuredPatch 为空、originalFile 为 null（旧内容过大未 diff）时为真。
 */
function isUpdateWithOmittedDiff({ type: i, content, structuredPatch, originalFile }) {
  return (
    i === "update" &&
    Array.isArray(structuredPatch) &&
    structuredPatch.length === 0 &&
    originalFile === null &&
    typeof content === "string" &&
    content !== ""
  );
}
//@ chunk-ek7g58h7.js:3942-4117 facade-majority = isResultTruncated (0.818)
function isResultTruncated(i, { columns }) {
  let { type: c, content } = i;
  if (c !== "create" && !isUpdateWithOmittedDiff(i)) return false;
  if (typeof content !== "string") return false;
  let d = content.endsWith(LINE_SEPARATOR) ? MAX_PREVIEW_LINES + 1 : MAX_PREVIEW_LINES;
  return exceedsWrappedLineLimit(content, Math.max(1, columns - 12), d);
}
//@ chunk-ek7g58h7.js:4117-4289 facade-majority = renderToolUseMessage (1)
function renderToolUseMessage(file_path, { verbose }) {
  if (!file_path.file_path) return null;
  if (file_path.file_path.startsWith(getPlansDirectory())) return "";
  return jsxProd_default(FilePathLink, {
    filePath: file_path.file_path,
    children: verbose ? file_path.file_path : getDisplayPath(file_path.file_path),
  });
}
//@ chunk-ek7g58h7.js:4289-4401 facade-majority = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage({ file_path, content }, { style, verbose }) {
  return jsxProd_default(WriteRejectionDiff, {
    filePath: file_path,
    content,
    style,
    verbose,
  });
}
//@ chunk-ek7g58h7.js:4401-5107 fingerprint = WriteRejectionDiff (1)
function WriteRejectionDiff(props) {
  let $ = w(20);
  let { filePath, content, style, verbose } = props;
  let t1;
  if ($[0] !== content || $[1] !== filePath) {
    t1 = () => loadRejectionDiff(filePath, content);
    $[0] = content;
    $[1] = filePath;
    $[2] = t1;
  } else t1 = $[2];
  let [dataPromise] = y(t1);
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
    t5 = jsxProd_default(fo, {
      fallback: createFallback,
      children,
    });
    $[17] = createFallback;
    $[18] = children;
    $[19] = t5;
  } else t5 = $[19];
  return t5;
}
//@ chunk-ek7g58h7.js:5107-5644 fingerprint = WriteRejectionBody (0.819)
function WriteRejectionBody(props) {
  let $ = w(8);
  let { promise, filePath, firstLine, createFallback, style, verbose } = props;
  let data = Qr(promise);
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
//@ chunk-ek7g58h7.js:5644-6076 fingerprint = loadRejectionDiff (0.898)
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
//@ chunk-ek7g58h7.js:6076-6304 facade-majority = renderToolUseErrorMessage (0.509)
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
//@ chunk-ek7g58h7.js:6304-6474 facade-majority
function renderToolResultMessage(i, o, { style, verbose }) {
  if (i.staged && i.filePath)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        dimColor: true,
        children: settingsWriteGateText(i.stagedWording),
      }),
    });
  return renderToolResultMessage_2(i, o, {
    style,
    verbose,
  });
}
//@ chunk-ek7g58h7.js:6474-7479 fingerprint = renderToolResultMessage (0.785)
function renderToolResultMessage_2(
  i,
  _progressMessagesForMessage,
  { style, verbose, replacedUndiffedContent = false },
) {
  let { filePath = "", content, structuredPatch, type, originalFile } = i;
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
      if (isUpdateWithOmittedDiff(i))
        return renderToolResultMessage_2(
          {
            ...i,
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
//@ chunk-e6aww6q8.js:1412415-1412500 fingerprint = userFacingName (1)
/**
 * Write 的用户可见名：计划文件 "Updated plan"，否则 "Write"。
 */
function userFacingName(input) {
  if (input?.file_path?.startsWith(getPlansDirectory())) return "Updated plan";
  return "Write";
}
//@ chunk-e6aww6q8.js:1412500-1412568 callgraph-fingerprint = getToolUseSummary (1)
/**
 * Write 工具使用摘要：显示路径。
 */
function getToolUseSummary_3(input) {
  if (!input?.file_path) return null;
  return getDisplayPath(input.file_path);
}
//@ chunk-e6aww6q8.js:4648833-4648901 callgraph-fingerprint = renderToolUseMessage (0.52)
/**
 * Edit/Write 工具调用渲染：显示路径。
 */
function renderToolUseMessage_2(e) {
  if (!e?.file_path) return null;
  return getDisplayPath(e.file_path);
}
export { userFacingName, getToolUseSummary_3, renderToolUseMessage_2, FileWriteToolCreatedMessage };
