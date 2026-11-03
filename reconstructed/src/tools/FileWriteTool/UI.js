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
import { j, y, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { lineWidth } from "../../ink/line-width-cache.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { openForDiff, P7n } from "../../utils/settings/settingsReview.js";
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
j();
//@ chunk-ek7g58h7.js:1072-1318 sole-consumer = measureText (0.861)
function countWrappedLines(text, maxWidth, limit = 1 / 0) {
  let noWrap = maxWidth <= 0 || !Number.isFinite(maxWidth),
    d = 0,
    f = 0;
  while (f <= text.length) {
    let index = text.indexOf(
        `
`,
        f,
      ),
      line = index === -1 ? text.substring(f) : text.substring(f, index);
    if (noWrap) d++;
    else {
      let g = lineWidth(line);
      d += g === 0 ? 1 : Math.ceil(g / maxWidth);
    }
    if (d > limit) return d;
    if (index === -1) break;
    f = index + 1;
  }
  return d;
}
//@ chunk-ek7g58h7.js:1318-1356 sole-consumer
function ge(i, o, c) {
  return countWrappedLines(i, o, c) > c;
}
//@ chunk-ek7g58h7.js:1356-1371 affinity
var L = 10,
  P = `
`;
//@ chunk-ek7g58h7.js:1371-1443 file-local
function countLines(content) {
  let parts = content.split(P);
  return content.endsWith(P) ? parts.length - 1 : parts.length;
}
//@ chunk-ek7g58h7.js:1443-1591 layout
function PreviousContentReplacedNote() {
  let i = w(1),
    o;
  if (i[0] === MEMO_CACHE_SENTINEL)
    ((o = e(Text, { dimColor: !0, children: " \u2014 previous content replaced (no diff shown)" })),
      (i[0] = o));
  else o = i[0];
  return o;
}
/**
 * Write 新建文件结果的终端渲染：显示行数与带高亮的内容预览（非 verbose 时截断）。
 */
//@ chunk-ek7g58h7.js:1591-3786 facade-majority = FileWriteToolCreatedMessage (0.46)
function FileWriteToolCreatedMessage(t0) {
  let h = w(51),
    {
      filePath: filePath,
      content: content,
      verbose: verbose,
      replacedUndiffedContent: replacedUndiffedContent,
    } = t0,
    f = replacedUndiffedContent === void 0 ? !1 : replacedUndiffedContent,
    { columns: columns } = useTerminalSize(),
    max = Math.max(1, columns - 12),
    g = content || "(No content)",
    numLines = countLines(content),
    b;
  if (h[0] !== g || h[1] !== max || h[2] !== verbose)
    ((b = verbose
      ? g
      : g
          .split(P)
          .slice(0, L)
          .join(P)
          .slice(0, L * (max + 1))),
      (h[0] = g),
      (h[1] = max),
      (h[2] = verbose),
      (h[3] = b));
  else b = h[3];
  let x = b,
    k = useHighlightedLineHeights(verbose ? "" : x, filePath, max),
    ke;
  if (h[4] !== g) ((ke = g.split(P, L)), (h[4] = g), (h[5] = ke));
  else ke = h[5];
  let _ = ke,
    Te;
  if (h[6] !== x || h[7] !== verbose)
    ((Te = verbose ? [] : x.split(P)), (h[6] = x), (h[7] = verbose), (h[8] = Te));
  else Te = h[8];
  let ae = Te,
    le,
    C,
    T;
  if (h[9] !== k || h[10] !== ae || h[11] !== _) {
    let W = L;
    T = 0;
    C = 0;
    le = !1;
    for (const [We, V] of k.entries()) {
      let ce = ae[We] ?? "";
      if (W === 0) {
        break;
      }
      if (V > W || ce !== _[We]) {
        ((C = C + Math.floor((ce.length * Math.min(V, W)) / V)), (le = !0));
        break;
      }
      ((W = W - V), T++, (C = C + (ce.length + P.length)));
    }
    ((h[9] = k), (h[10] = ae), (h[11] = _), (h[12] = le), (h[13] = C), (h[14] = T));
  } else ((le = h[12]), (C = h[13]), (T = h[14]));
  let Ie = T === numLines - 1 && _[T] === "",
    de = numLines - T - (Ie ? 1 : 0),
    pe = le ? content.length - C : void 0,
    Y;
  if (h[15] !== numLines) ((Y = e(Text, { bold: !0, children: numLines })), (h[15] = numLines), (h[16] = Y));
  else Y = h[16];
  let q;
  if (h[17] !== numLines) ((q = plural(numLines, "line")), (h[17] = numLines), (h[18] = q));
  else q = h[18];
  let z;
  if (h[19] !== filePath || h[20] !== verbose)
    ((z = verbose ? filePath : getDisplayPath(filePath)), (h[19] = filePath), (h[20] = verbose), (h[21] = z));
  else z = h[21];
  let G;
  if (h[22] !== filePath || h[23] !== z)
    ((G = e(Text, { bold: !0, children: e(FilePathLink, { filePath: filePath, children: z }) })),
      (h[22] = filePath),
      (h[23] = z),
      (h[24] = G));
  else G = h[24];
  let J;
  if (h[25] !== f) ((J = f && e(PreviousContentReplacedNote, {})), (h[25] = f), (h[26] = J));
  else J = h[26];
  let Q;
  if (h[27] !== Y || h[28] !== q || h[29] !== G || h[30] !== J)
    ((Q = r(Text, { children: ["Wrote ", Y, " ", q, " to", " ", G, J] })),
      (h[27] = Y),
      (h[28] = q),
      (h[29] = G),
      (h[30] = J),
      (h[31] = Q));
  else Q = h[31];
  const ue = verbose ? void 0 : "hidden",
    he = verbose ? void 0 : L,
    me = verbose ? void 0 : max;
  let Z;
  if (h[32] !== x || h[33] !== filePath || h[34] !== max)
    ((Z = e(HighlightedCode, { code: x, filePath: filePath, width: max })),
      (h[32] = x),
      (h[33] = filePath),
      (h[34] = max),
      (h[35] = Z));
  else Z = h[35];
  let A;
  if (h[36] !== me || h[37] !== Z)
    ((A = e(Box, { flexDirection: "column", flexShrink: 0, width: me, children: Z })),
      (h[36] = me),
      (h[37] = Z),
      (h[38] = A));
  else A = h[38];
  let I;
  if (h[39] !== ue || h[40] !== he || h[41] !== A)
    ((I = e(Box, { flexDirection: "column", overflowY: ue, maxHeight: he, children: A })),
      (h[39] = ue),
      (h[40] = he),
      (h[41] = A),
      (h[42] = I));
  else I = h[42];
  let X;
  if (h[43] !== pe || h[44] !== de || h[45] !== verbose)
    ((X = !verbose && e(OverflowHint, { count: de, hiddenChars: pe, expandable: !0 })),
      (h[43] = pe),
      (h[44] = de),
      (h[45] = verbose),
      (h[46] = X));
  else X = h[46];
  let De;
  if (h[47] !== Q || h[48] !== I || h[49] !== X)
    ((De = e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [Q, I, X] }) })),
      (h[47] = Q),
      (h[48] = I),
      (h[49] = X),
      (h[50] = De));
  else De = h[50];
  return De;
}
/**
 * update 结果但 structuredPatch 为空、originalFile 为 null（旧内容过大未 diff）时为真。
 */
//@ chunk-ek7g58h7.js:3786-3942 layout
function isUpdateWithOmittedDiff({
  type: i,
  content: content,
  structuredPatch: structuredPatch,
  originalFile: originalFile,
}) {
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
function isResultTruncated(i, { columns: columns }) {
  let { type: c, content: content } = i;
  if (c !== "create" && !isUpdateWithOmittedDiff(i)) return !1;
  if (typeof content !== "string") return !1;
  let d = content.endsWith(P) ? L + 1 : L;
  return ge(content, Math.max(1, columns - 12), d);
}
//@ chunk-ek7g58h7.js:4117-4289 facade-majority = renderToolUseMessage (1)
function renderToolUseMessage(i, { verbose: verbose }) {
  if (!i.file_path) return null;
  if (i.file_path.startsWith(getPlansDirectory())) return "";
  return e(FilePathLink, {
    filePath: i.file_path,
    children: verbose ? i.file_path : getDisplayPath(i.file_path),
  });
}
//@ chunk-ek7g58h7.js:4289-4401 facade-majority = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage(
  { file_path: file_path, content: content },
  { style: style, verbose: verbose },
) {
  return e(WriteRejectionDiff, { filePath: file_path, content: content, style: style, verbose: verbose });
}
//@ chunk-ek7g58h7.js:4401-5107 fingerprint = WriteRejectionDiff (1)
function WriteRejectionDiff(t0) {
  let f = w(20),
    { filePath: filePath, content: content, style: style, verbose: verbose } = t0,
    m;
  if (f[0] !== content || f[1] !== filePath)
    ((m = () => loadRejectionDiff(filePath, content)), (f[0] = content), (f[1] = filePath), (f[2] = m));
  else m = f[2];
  let [p] = y(m),
    g;
  if (f[3] !== content) ((g = getFirstLine(content)), (f[3] = content), (f[4] = g));
  else g = f[4];
  let u = g,
    h;
  if (f[5] !== content || f[6] !== filePath || f[7] !== u || f[8] !== verbose)
    ((h = e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "write",
      content: content,
      firstLine: u,
      verbose: verbose,
    })),
      (f[5] = content),
      (f[6] = filePath),
      (f[7] = u),
      (f[8] = verbose),
      (f[9] = h));
  else h = f[9];
  let b = h,
    x;
  if (f[10] !== b || f[11] !== p || f[12] !== filePath || f[13] !== u || f[14] !== style || f[15] !== verbose)
    ((x = e(WriteRejectionBody, {
      promise: p,
      filePath: filePath,
      firstLine: u,
      createFallback: b,
      style: style,
      verbose: verbose,
    })),
      (f[10] = b),
      (f[11] = p),
      (f[12] = filePath),
      (f[13] = u),
      (f[14] = style),
      (f[15] = verbose),
      (f[16] = x));
  else x = f[16];
  let k;
  if (f[17] !== b || f[18] !== x)
    ((k = e(fo, { fallback: b, children: x })), (f[17] = b), (f[18] = x), (f[19] = k));
  else k = f[19];
  return k;
}
//@ chunk-ek7g58h7.js:5107-5644 fingerprint = WriteRejectionBody (0.819)
function WriteRejectionBody(t0) {
  let g = w(8),
    {
      promise: promise,
      filePath: filePath,
      firstLine: firstLine,
      createFallback: createFallback,
      style: style,
      verbose: verbose,
    } = t0,
    data = Qr(promise);
  if (data.type === "create") {
    return createFallback;
  }
  if (data.type === "error") {
    let u;
    if (g[0] === MEMO_CACHE_SENTINEL)
      ((u = e(MessageResponse, { children: e(Text, { children: "(No changes)" }) })), (g[0] = u));
    else u = g[0];
    return u;
  }
  let u;
  if (
    g[1] !== data.oldContent ||
    g[2] !== data.patch ||
    g[3] !== filePath ||
    g[4] !== firstLine ||
    g[5] !== style ||
    g[6] !== verbose
  )
    ((u = e(FileEditToolUseRejectedMessage, {
      file_path: filePath,
      operation: "update",
      patch: data.patch,
      firstLine: firstLine,
      fileContent: data.oldContent,
      style: style,
      verbose: verbose,
    })),
      (g[1] = data.oldContent),
      (g[2] = data.patch),
      (g[3] = filePath),
      (g[4] = firstLine),
      (g[5] = style),
      (g[6] = verbose),
      (g[7] = u));
  else u = g[7];
  return u;
}
//@ chunk-ek7g58h7.js:5644-6076 fingerprint = loadRejectionDiff (0.898)
async function loadRejectionDiff(filePath, content) {
  try {
    let fullFilePath = isAbsolute(filePath) ? filePath : resolve(getCwd(), filePath),
      handle = await openForDiff(fullFilePath);
    if (handle === null) return { type: "create" };
    let oldContent;
    try {
      oldContent = await readCapped(handle);
    } finally {
      await handle.close();
    }
    if (oldContent === null) return { type: "create" };
    return {
      type: "update",
      patch: getPatchForDisplay({
        filePath: filePath,
        fileContents: oldContent,
        edits: [{ old_string: oldContent, new_string: content, replace_all: !1 }],
      }),
      oldContent: oldContent,
    };
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Failed to load rejection diff for ${filePath}: ${error.message}`, { level: "error" });
    else logError(error);
    return { type: "error" };
  }
}
//@ chunk-ek7g58h7.js:6076-6304 facade-majority = renderToolUseErrorMessage (0.509)
function renderToolUseErrorMessage(result, { verbose: verbose, toolDenialKind: toolDenialKind }) {
  if (
    !verbose &&
    toolDenialKind !== "permission-rule" &&
    typeof result === "string" &&
    extractTag(result, "tool_use_error")
  )
    return e(MessageResponse, { children: e(Text, { color: "error", children: "Error writing file" }) });
  return e(FallbackToolUseErrorMessage, { result: result, verbose: verbose });
}
//@ chunk-ek7g58h7.js:6304-6474 facade-majority
function renderToolResultMessage(i, o, { style: style, verbose: verbose }) {
  if (i.staged && i.filePath)
    return e(MessageResponse, { children: e(Text, { dimColor: !0, children: P7n(i.stagedWording) }) });
  return renderToolResultMessage_2(i, o, { style: style, verbose: verbose });
}
//@ chunk-ek7g58h7.js:6474-7479 fingerprint = renderToolResultMessage (0.785)
function renderToolResultMessage_2(
  i,
  _progressMessagesForMessage,
  { style: style, verbose: verbose, replacedUndiffedContent: replacedUndiffedContent = !1 },
) {
  let {
    filePath: filePath = "",
    content: content,
    structuredPatch: structuredPatch,
    type: g,
    originalFile: originalFile,
  } = i;
  if (!filePath) return null;
  switch (g) {
    case "create": {
      if (filePath.startsWith(getPlansDirectory()) && !verbose) {
        if (style !== "condensed")
          return e(MessageResponse, { children: e(Text, { dimColor: !0, children: "/plan to preview" }) });
      } else if (style === "condensed" && !verbose) {
        let b = countLines(content);
        return r(Text, {
          children: [
            "Wrote ",
            e(Text, { bold: !0, children: b }),
            " ",
            plural(b, "line"),
            " to",
            " ",
            e(Text, {
              bold: !0,
              children: e(FilePathLink, { filePath: filePath, children: getDisplayPath(filePath) }),
            }),
            replacedUndiffedContent && e(PreviousContentReplacedNote, {}),
          ],
        });
      } else if (!verbose && isScratchpadDisplayPath(filePath)) {
        let numLines = countLines(content);
        return e(MessageResponse, {
          children: r(Text, {
            children: [
              "Wrote ",
              e(Text, { bold: !0, children: numLines }),
              " ",
              plural(numLines, "line"),
              replacedUndiffedContent && e(PreviousContentReplacedNote, {}),
              " ",
              e(CtrlOToExpand, {}),
            ],
          }),
        });
      }
      return e(FileWriteToolCreatedMessage, {
        filePath: filePath,
        content: content,
        verbose: verbose,
        replacedUndiffedContent: replacedUndiffedContent,
      });
    }
    case "update": {
      if (isUpdateWithOmittedDiff(i))
        return renderToolResultMessage_2({ ...i, type: "create" }, _progressMessagesForMessage, {
          style: style,
          verbose: verbose,
          replacedUndiffedContent: !0,
        });
      let isPlanFile = filePath.startsWith(getPlansDirectory());
      return e(FileEditToolUpdatedMessage, {
        filePath: filePath,
        structuredPatch: structuredPatch,
        firstLine: getFirstLine(content),
        fileContent: originalFile ?? void 0,
        style: style,
        verbose: verbose,
        previewHint: isPlanFile ? "/plan to preview" : void 0,
        collapsed: !isPlanFile && isScratchpadDisplayPath(filePath),
      });
    }
  }
}
/**
 * Write 的用户可见名：计划文件 "Updated plan"，否则 "Write"。
 */
//@ chunk-e6aww6q8.js:1412415-1412500 fingerprint = userFacingName (1)
function userFacingName(input) {
  if (input?.file_path?.startsWith(getPlansDirectory())) return "Updated plan";
  return "Write";
}
/**
 * Write 工具使用摘要：显示路径。
 */
//@ chunk-e6aww6q8.js:1412500-1412568 callgraph-fingerprint = getToolUseSummary (1)
function getToolUseSummary_3(input) {
  if (!input?.file_path) return null;
  return getDisplayPath(input.file_path);
}
/**
 * Edit/Write 工具调用渲染：显示路径。
 */
//@ chunk-e6aww6q8.js:4648833-4648901 callgraph-fingerprint = renderToolUseMessage (0.52)
function renderToolUseMessage_2(e) {
  if (!e?.file_path) return null;
  return getDisplayPath(e.file_path);
}

export { userFacingName, getToolUseSummary_3, renderToolUseMessage_2, FileWriteToolCreatedMessage };
