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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { YC } from "./permissions/FolderAccessPermissionRequest.js";
import { StructuredDiffList } from "./StructuredDiffList.js";
import { getPatchForDisplay, zEt, adjustHunkLineNumbers } from "../utils/diff.js";
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
  let $ = w(9),
    D;
  if (
    $[0] !== props.edits ||
    $[1] !== props.file_path ||
    $[2] !== props.remoteOldContent ||
    $[3] !== props.skipLocalRead
  )
    ((D = () =>
      loadDiffData(props.file_path, props.edits, props.remoteOldContent, props.skipLocalRead ?? !1).then(
        mapDiffDataLines,
      )),
      ($[0] = props.edits),
      ($[1] = props.file_path),
      ($[2] = props.remoteOldContent),
      ($[3] = props.skipLocalRead),
      ($[4] = D));
  else D = $[4];
  let [L] = y(D),
    ee;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((ee = e(DiffFrame, { paddingX: 0, children: e(Text, { dimColor: !0, children: "\u2026" }) })),
      ($[5] = ee));
  else ee = $[5];
  let ke;
  if ($[6] !== L || $[7] !== props.file_path)
    ((ke = e(fo, { fallback: ee, children: e(DiffBody, { promise: L, file_path: props.file_path }) })),
      ($[6] = L),
      ($[7] = props.file_path),
      ($[8] = ke));
  else ke = $[8];
  return ke;
}
//@ chunk-18hwfzwa.js:1364888-1365381 fingerprint = DiffBody (0.817)
function DiffBody(t0) {
  let $ = w(6),
    { promise: promise, file_path: file_path } = t0,
    { patch: patch, firstLine: firstLine, fileContent: fileContent } = Qr(promise),
    { columns: columns } = useTerminalSize();
  YC();
  let t1;
  if ($[0] !== columns || $[1] !== fileContent || $[2] !== file_path || $[3] !== firstLine || $[4] !== patch)
    ((t1 = e(DiffFrame, {
      paddingX: 0,
      children:
        patch.length === 0
          ? e(Text, {
              color: "warning",
              children: "Proposed edit took too long to diff, so it is not shown (deny unless expected).",
            })
          : e(StructuredDiffList, {
              hunks: patch,
              dim: !1,
              width: columns,
              filePath: file_path,
              firstLine: firstLine,
              fileContent: fileContent,
            }),
    })),
      ($[0] = columns),
      ($[1] = fileContent),
      ($[2] = file_path),
      ($[3] = firstLine),
      ($[4] = patch),
      ($[5] = t1));
  else t1 = $[5];
  return t1;
}
//@ chunk-18hwfzwa.js:1365381-1366478 fingerprint = loadDiffData (0.882)
async function loadDiffData(h, x, D, L) {
  let valid = x.filter((Re) => Re.old_string != null && Re.new_string != null),
    single = valid.length === 1 ? valid[0] : void 0;
  try {
    if (D !== void 0) {
      let mapped = valid.map((He) => normalizeEdit(D, He));
      return {
        patch: getPatchForDisplay({ filePath: h, fileContents: D, edits: mapped }),
        firstLine: getFirstLine(D),
        fileContent: D,
      };
    }
    if (L) return diffToolInputsOnly(h, valid);
    let handle = await openForDiff(h);
    if (handle === null) return diffToolInputsOnly(h, valid);
    try {
      let Be = await scanForContext(handle, single?.old_string ?? "", zEt);
      if (Be.truncated) return diffToolInputsOnly(h, valid);
      let He = valid;
      if (Be.content === "") {
        let file = await readCapped(handle);
        if (file === null || (single && findActualString(file, single.old_string) === null))
          return diffToolInputsOnly(h, valid);
        if (
          ((He = valid.map((Xe) => normalizeEdit(file, Xe))),
          single && He[0].old_string !== single.old_string)
        )
          Be = await scanForContext(handle, He[0].old_string, zEt);
        if (Be.content === "") {
          let Xe = getPatchForDisplay({ filePath: h, fileContents: file, edits: He });
          return Xe.length === 0
            ? diffToolInputsOnly(h, valid)
            : { patch: Xe, firstLine: getFirstLine(file), fileContent: file };
        }
      }
      let hunks = getPatchForDisplay({ filePath: h, fileContents: Be.content, edits: He });
      return {
        patch: adjustHunkLineNumbers(hunks, Be.lineOffset - 1),
        firstLine: Be.lineOffset === 1 ? getFirstLine(Be.content) : null,
        fileContent: Be.content,
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`FileEditToolDiff: fs error computing diff for ${h}: ${error.message}`, {
        level: "error",
      });
    else logError(error);
    return diffToolInputsOnly(h, valid);
  }
}
//@ chunk-18hwfzwa.js:1366478-1366612 fingerprint = diffToolInputsOnly (1)
function diffToolInputsOnly(filePath, edits) {
  return {
    patch: edits.flatMap((D) =>
      getPatchForDisplay({ filePath: filePath, fileContents: D.old_string, edits: [D] }),
    ),
    firstLine: null,
    fileContent: void 0,
  };
}
//@ chunk-18hwfzwa.js:1366612-1366769 layout
function mapDiffDataLines(h) {
  return {
    patch: h.patch.map((x) => ({ ...x, lines: x.lines.map(kht) })),
    firstLine: h.firstLine === null ? null : kht(h.firstLine),
    fileContent: h.fileContent,
  };
}
//@ chunk-18hwfzwa.js:1366769-1366802 layout
function kht(h) {
  return markBrokenSequences(stripUnsafeChars(h));
}
//@ chunk-18hwfzwa.js:1366802-1366954 fingerprint = normalizeEdit (1)
function normalizeEdit(fileContent, edit) {
  let actualOld = findActualString(fileContent, edit.old_string) || edit.old_string,
    actualNew = preserveEscapeStyle(
      edit.old_string,
      actualOld,
      preserveQuoteStyle(edit.old_string, actualOld, edit.new_string),
    );
  return { ...edit, old_string: actualOld, new_string: actualNew };
}
/**
 * diff 外框（虚线边框、subtle 色），被 Edit/Write/Notebook 等 20 处复用。
 */
//@ chunk-r2w21sc3.js:299-708 fingerprint = DiffFrame (0.74)
function DiffFrame(t0) {
  let $ = w(6),
    { children: children, paddingX: paddingX, marginTop: marginTop, marginBottom: marginBottom } = t0,
    d = paddingX === void 0 ? 1 : paddingX;
  const t = useIsScreenReaderEnabled() ? void 0 : "dashed";
  let i;
  if ($[0] !== children || $[1] !== marginBottom || $[2] !== marginTop || $[3] !== d || $[4] !== t)
    ((i = e(Box, {
      borderStyle: t,
      borderColor: "subtle",
      borderLeft: !1,
      borderRight: !1,
      flexDirection: "column",
      overflow: "hidden",
      paddingX: d,
      marginTop: marginTop,
      marginBottom: marginBottom,
      children: children,
    })),
      ($[0] = children),
      ($[1] = marginBottom),
      ($[2] = marginTop),
      ($[3] = d),
      ($[4] = t),
      ($[5] = i));
  else i = $[5];
  return i;
}

export { DiffFrame, FileEditToolDiff };
