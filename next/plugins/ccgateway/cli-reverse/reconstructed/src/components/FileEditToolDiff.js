/**
 * components/FileEditToolDiff.tsx
 *
 * Edit 工具（权限对话框/结果中）的 diff 展示：异步计算结构化 diff，超时显示警告，DiffFrame 外框被 20 处复用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolDiff.tsx
 * pieces: chunk-cec8js9j.js (1), chunk-czq1j3j2.js (7), chunk-e5wzyn92.js (1)
 * attribution: fingerprint 6, affinity 1, sole-consumer 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { useState, suspenseTypeExport, use } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
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

//@ chunk-cec8js9j.js:5886-5984 fingerprint (2.1.88 match: normalizeEdit, 1)
function normalizeEdit(fileContent, edit) {
  return (
    !fileContent &&
    edit.length === 1 &&
    edit[0] !== undefined &&
    edit[0].old_string === "" &&
    edit[0].new_string === ""
  );
}
//@ chunk-e5wzyn92.js:299-708 fingerprint (2.1.88 match: DiffFrame, 0.741)
function DiffFrame(props) {
  let $ = useMemoCache(6);
  let { children, paddingX, marginTop, marginBottom } = props;
  let paddingX_2 = paddingX === undefined ? 1 : paddingX;
  const borderStyle = useIsScreenReaderEnabled() ? undefined : "dashed";
  let frame;
  if (
    $[0] !== children ||
    $[1] !== marginBottom ||
    $[2] !== marginTop ||
    $[3] !== paddingX_2 ||
    $[4] !== borderStyle
  ) {
    frame = jsxProd_default(Box, {
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
    $[5] = frame;
  } else frame = $[5];
  return frame;
}
//@ chunk-czq1j3j2.js:1387113-1387688 fingerprint (2.1.88 match: FileEditToolDiff, 0.468)
function FileEditToolDiff(props) {
  let $ = useMemoCache(9);
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
  let [dataPromise] = useState(t0);
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
    t2 = jsxProd_default(suspenseTypeExport, {
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
//@ chunk-czq1j3j2.js:1387688-1388181 fingerprint (2.1.88 match: DiffBody, 0.817)
function DiffBody(props) {
  let $ = useMemoCache(6);
  let { promise, file_path } = props;
  let { patch, firstLine, fileContent } = use(promise);
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
//@ chunk-czq1j3j2.js:1388181-1389278 fingerprint (2.1.88 match: loadDiffData, 0.882)
async function loadDiffData(file_path, edits, fileContent, toolUseContext) {
  let valid = edits.filter((e) => e.old_string != null && e.new_string != null);
  let single = valid.length === 1 ? valid[0] : undefined;
  try {
    if (fileContent !== undefined) {
      let edits = valid.map((edit) => normalizeEdit_2(fileContent, edit));
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
    if (toolUseContext) return diffToolInputsOnly(file_path, valid);
    let handle = await openForDiff(file_path);
    if (handle === null) return diffToolInputsOnly(file_path, valid);
    try {
      let ctx = await scanForContext(handle, single?.old_string ?? "", DIFF_CONTEXT_LINES);
      if (ctx.truncated) return diffToolInputsOnly(file_path, valid);
      let normalizedEdits = valid;
      if (ctx.content === "") {
        let file = await readCapped(handle);
        if (file === null || (single && findActualString(file, single.old_string) === null))
          return diffToolInputsOnly(file_path, valid);
        normalizedEdits = valid.map((e) => normalizeEdit_2(file, e));
        if (single && normalizedEdits[0].old_string !== single.old_string)
          ctx = await scanForContext(handle, normalizedEdits[0].old_string, DIFF_CONTEXT_LINES);
        if (ctx.content === "") {
          let patchForDisplay = getPatchForDisplay({
            filePath: file_path,
            fileContents: file,
            edits: normalizedEdits,
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
        edits: normalizedEdits,
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
//@ chunk-czq1j3j2.js:1389278-1389412 fingerprint (2.1.88 match: diffToolInputsOnly, 1)
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
//@ chunk-czq1j3j2.js:1389412-1389569 affinity
function mapDiffDataLines(data) {
  return {
    patch: data.patch.map((hunk) => ({
      ...hunk,
      lines: hunk.lines.map(sanitizeDiffLine),
    })),
    firstLine: data.firstLine === null ? null : sanitizeDiffLine(data.firstLine),
    fileContent: data.fileContent,
  };
}
//@ chunk-czq1j3j2.js:1389569-1389602 sole-consumer
function sanitizeDiffLine(firstLine) {
  return markBrokenSequences(stripUnsafeChars(firstLine));
}
//@ chunk-czq1j3j2.js:1389602-1389754 sole-consumer (2.1.88 match: normalizeEdit, 1)
function normalizeEdit_2(fileContent, edit) {
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
export { DiffFrame, normalizeEdit, FileEditToolDiff };
