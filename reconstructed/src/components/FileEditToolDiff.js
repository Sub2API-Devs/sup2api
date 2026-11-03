/**
 * components/FileEditToolDiff.tsx
 *
 * Edit 工具（权限对话框/结果中）的 diff 展示：异步计算结构化 diff，超时显示警告，DiffFrame 外框被 20 处复用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolDiff.tsx
 * pieces: chunk-18hwfzwa.js (7), chunk-r2w21sc3.js (1)
 * attribution: fingerprint 6, layout 2
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { y, fo, Qr } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useExitCleanup } from "./permissions/FolderAccessPermissionRequest.js";
import { StructuredDiffList } from "./StructuredDiffList.js";
import { getPatchForDisplay, DIFF_CONTEXT_LINES, adjustHunkLineNumbers } from "../utils/diff.js";
import { getFirstLine } from "../utils/stringUtils.js";
import { openForDiff } from "../utils/settings/settingsReview.js";
import { scanForContext, readCapped } from "../utils/readEditContext.js";
import { findActualString, preserveEscapeStyle, preserveQuoteStyle } from "../tools/FileEditTool/utils.js";
import { isSyscallError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { markBrokenSequences, stripUnsafeChars } from "../utils/permissions/approvalPayloadSerialization.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";

//@ chunk-18hwfzwa.js:1364313-1364888 fingerprint = FileEditToolDiff (0.468)
function FileEditToolDiff(props) {
  let $ = w(9);
  let t0;
  if (
    $[0] !== props.edits ||
    $[1] !== props.file_path ||
    $[2] !== props.remoteOldContent ||
    $[3] !== props.skipLocalRead
  ) {
    t0 = () =>
      loadDiffData(props.file_path, props.edits, props.remoteOldContent, props.skipLocalRead ?? false).then(
        mapDiffDataLines,
      );
    $[0] = props.edits;
    $[1] = props.file_path;
    $[2] = props.remoteOldContent;
    $[3] = props.skipLocalRead;
    $[4] = t0;
  } else t0 = $[4];
  let [dataPromise] = y(t0);
  let fallback;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(DiffFrame, {
      paddingX: 0,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "\u2026",
      }),
    });
    $[5] = fallback;
  } else fallback = $[5];
  let t2;
  if ($[6] !== dataPromise || $[7] !== props.file_path) {
    t2 = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(DiffBody, {
        promise: dataPromise,
        file_path: props.file_path,
      }),
    });
    $[6] = dataPromise;
    $[7] = props.file_path;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
}
//@ chunk-18hwfzwa.js:1364888-1365381 fingerprint = DiffBody (0.817)
function DiffBody(props) {
  let $ = w(6);
  let { promise, file_path } = props;
  let { patch, firstLine, fileContent } = Qr(promise);
  let { columns } = useTerminalSize();
  useExitCleanup();
  let t1;
  if (
    $[0] !== columns ||
    $[1] !== fileContent ||
    $[2] !== file_path ||
    $[3] !== firstLine ||
    $[4] !== patch
  ) {
    t1 = jsxProd_default(DiffFrame, {
      paddingX: 0,
      children:
        patch.length === 0
          ? jsxProd_default(Text, {
              color: "warning",
              children: "Proposed edit took too long to diff, so it is not shown (deny unless expected).",
            })
          : jsxProd_default(StructuredDiffList, {
              hunks: patch,
              dim: false,
              width: columns,
              filePath: file_path,
              firstLine,
              fileContent,
            }),
    });
    $[0] = columns;
    $[1] = fileContent;
    $[2] = file_path;
    $[3] = firstLine;
    $[4] = patch;
    $[5] = t1;
  } else t1 = $[5];
  return t1;
}
//@ chunk-18hwfzwa.js:1365381-1366478 fingerprint = loadDiffData (0.882)
async function loadDiffData(file_path, edits, fileContent, L) {
  let valid = edits.filter((e) => e.old_string != null && e.new_string != null);
  let single = valid.length === 1 ? valid[0] : undefined;
  try {
    if (fileContent !== undefined) {
      let edits = valid.map((He) => normalizeEdit(fileContent, He));
      return {
        patch: getPatchForDisplay({
          filePath: file_path,
          fileContents: fileContent,
          edits,
        }),
        firstLine: getFirstLine(fileContent),
        fileContent,
      };
    }
    if (L) return diffToolInputsOnly(file_path, valid);
    let handle = await openForDiff(file_path);
    if (handle === null) return diffToolInputsOnly(file_path, valid);
    try {
      let ctx = await scanForContext(handle, single?.old_string ?? "", DIFF_CONTEXT_LINES);
      if (ctx.truncated) return diffToolInputsOnly(file_path, valid);
      let He = valid;
      if (ctx.content === "") {
        let file = await readCapped(handle);
        if (file === null || (single && findActualString(file, single.old_string) === null))
          return diffToolInputsOnly(file_path, valid);
        He = valid.map((e) => normalizeEdit(file, e));
        if (single && He[0].old_string !== single.old_string)
          ctx = await scanForContext(handle, He[0].old_string, DIFF_CONTEXT_LINES);
        if (ctx.content === "") {
          let patchForDisplay = getPatchForDisplay({
            filePath: file_path,
            fileContents: file,
            edits: He,
          });
          return patchForDisplay.length === 0
            ? diffToolInputsOnly(file_path, valid)
            : {
                patch: patchForDisplay,
                firstLine: getFirstLine(file),
                fileContent: file,
              };
        }
      }
      let hunks = getPatchForDisplay({
        filePath: file_path,
        fileContents: ctx.content,
        edits: He,
      });
      return {
        patch: adjustHunkLineNumbers(hunks, ctx.lineOffset - 1),
        firstLine: ctx.lineOffset === 1 ? getFirstLine(ctx.content) : null,
        fileContent: ctx.content,
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`FileEditToolDiff: fs error computing diff for ${file_path}: ${error.message}`, {
        level: "error",
      });
    else logError(error);
    return diffToolInputsOnly(file_path, valid);
  }
}
//@ chunk-18hwfzwa.js:1366478-1366612 fingerprint = diffToolInputsOnly (1)
function diffToolInputsOnly(filePath, edits) {
  return {
    patch: edits.flatMap((e) =>
      getPatchForDisplay({
        filePath,
        fileContents: e.old_string,
        edits: [e],
      }),
    ),
    firstLine: null,
    fileContent: undefined,
  };
}
//@ chunk-18hwfzwa.js:1366612-1366769 layout
function mapDiffDataLines(h) {
  return {
    patch: h.patch.map((x) => ({
      ...x,
      lines: x.lines.map(sanitizeDiffLine),
    })),
    firstLine: h.firstLine === null ? null : sanitizeDiffLine(h.firstLine),
    fileContent: h.fileContent,
  };
}
//@ chunk-18hwfzwa.js:1366769-1366802 layout
function sanitizeDiffLine(firstLine) {
  return markBrokenSequences(stripUnsafeChars(firstLine));
}
//@ chunk-18hwfzwa.js:1366802-1366954 fingerprint = normalizeEdit (1)
function normalizeEdit(fileContent, edit) {
  let actualOld = findActualString(fileContent, edit.old_string) || edit.old_string;
  let actualNew = preserveEscapeStyle(
    edit.old_string,
    actualOld,
    preserveQuoteStyle(edit.old_string, actualOld, edit.new_string),
  );
  return {
    ...edit,
    old_string: actualOld,
    new_string: actualNew,
  };
}
//@ chunk-r2w21sc3.js:299-708 fingerprint = DiffFrame (0.74)
/**
 * diff 外框（虚线边框、subtle 色），被 Edit/Write/Notebook 等 20 处复用。
 */
function DiffFrame(props) {
  let $ = w(6);
  let { children, paddingX, marginTop, marginBottom } = props;
  let paddingX_2 = paddingX === undefined ? 1 : paddingX;
  const borderStyle = useIsScreenReaderEnabled() ? undefined : "dashed";
  let i;
  if (
    $[0] !== children ||
    $[1] !== marginBottom ||
    $[2] !== marginTop ||
    $[3] !== paddingX_2 ||
    $[4] !== borderStyle
  ) {
    i = jsxProd_default(Box, {
      borderStyle,
      borderColor: "subtle",
      borderLeft: false,
      borderRight: false,
      flexDirection: "column",
      overflow: "hidden",
      paddingX: paddingX_2,
      marginTop,
      marginBottom,
      children,
    });
    $[0] = children;
    $[1] = marginBottom;
    $[2] = marginTop;
    $[3] = paddingX_2;
    $[4] = borderStyle;
    $[5] = i;
  } else i = $[5];
  return i;
}
export { DiffFrame, FileEditToolDiff };
