/**
 * components/FileEditToolUseRejectedMessage.tsx
 *
 * 文件编辑/写入被拒绝时显示 "User rejected update/write to <文件>" 与被拒 diff 或内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolUseRejectedMessage.tsx
 * pieces: chunk-vnfdjr3f.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { getDisplayPath } from "../utils/file.js";
import { FilePathLink } from "./FilePathLink.js";
import { MessageResponse } from "./MessageResponse.js";
import { HighlightedCode } from "./HighlightedCode.js";
import { OverflowHint } from "./CtrlOToExpand.js";
import { StructuredDiffList } from "./StructuredDiffList.js";

//@ chunk-vnfdjr3f.js:627-636 affinity
var D = 10;
/**
 * 编辑/写入被拒绝："User rejected update/write to <路径>"，写入显示被拒内容（高亮），编辑显示被拒 diff。
 */
//@ chunk-vnfdjr3f.js:636-2341 fingerprint = FileEditToolUseRejectedMessage (0.879)
function FileEditToolUseRejectedMessage(t0) {
  let $ = w(39),
    {
      file_path: file_path,
      operation: operation,
      patch: patch,
      firstLine: firstLine,
      fileContent: fileContent,
      content: content,
      style: style,
      verbose: verbose,
    } = t0,
    { columns: columns } = useTerminalSize(),
    d;
  if ($[0] !== operation)
    ((d = r(Text, { color: "subtle", children: ["User rejected ", operation, " to "] })),
      ($[0] = operation),
      ($[1] = d));
  else d = $[1];
  let c;
  if ($[2] !== file_path || $[3] !== verbose)
    ((c = verbose ? file_path : getDisplayPath(file_path)), ($[2] = file_path), ($[3] = verbose), ($[4] = c));
  else c = $[4];
  let P;
  if ($[5] !== file_path || $[6] !== c)
    ((P = e(Text, {
      bold: !0,
      color: "subtle",
      children: e(FilePathLink, { filePath: file_path, children: c }),
    })),
      ($[5] = file_path),
      ($[6] = c),
      ($[7] = P));
  else P = $[7];
  let H;
  if ($[8] !== d || $[9] !== P)
    ((H = r(Box, { flexDirection: "row", children: [d, P] })), ($[8] = d), ($[9] = P), ($[10] = H));
  else H = $[10];
  let i = H;
  if (style === "condensed" && !verbose) {
    let l;
    if ($[11] !== i) ((l = e(MessageResponse, { children: i })), ($[11] = i), ($[12] = l));
    else l = $[12];
    return l;
  }
  if (operation === "write" && content !== void 0) {
    let a, l;
    if ($[13] !== content || $[14] !== verbose) {
      let parts = content.split(`
`);
      a = parts.length - D;
      l = verbose
        ? content
        : parts.slice(0, D).join(`
`);
      (($[13] = content), ($[14] = verbose), ($[15] = a), ($[16] = l));
    } else ((a = $[15]), (l = $[16]));
    let x = l;
    const t6 = x || "(No content)";
    const b = columns - 12;
    let _;
    if ($[17] !== file_path || $[18] !== t6 || $[19] !== b)
      ((_ = e(HighlightedCode, { code: t6, filePath: file_path, width: b, dim: !0 })),
        ($[17] = file_path),
        ($[18] = t6),
        ($[19] = b),
        ($[20] = _));
    else _ = $[20];
    let A;
    if ($[21] !== a || $[22] !== verbose)
      ((A = !verbose && e(OverflowHint, { count: a })), ($[21] = a), ($[22] = verbose), ($[23] = A));
    else A = $[23];
    let z;
    if ($[24] !== _ || $[25] !== A || $[26] !== i)
      ((z = e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [i, _, A] }) })),
        ($[24] = _),
        ($[25] = A),
        ($[26] = i),
        ($[27] = z));
    else z = $[27];
    return z;
  }
  if (!patch || patch.length === 0) {
    let l;
    if ($[28] !== i) ((l = e(MessageResponse, { children: i })), ($[28] = i), ($[29] = l));
    else l = $[29];
    return l;
  }
  const l = columns - 12;
  let f;
  if ($[30] !== fileContent || $[31] !== file_path || $[32] !== firstLine || $[33] !== patch || $[34] !== l)
    ((f = e(StructuredDiffList, {
      hunks: patch,
      dim: !0,
      width: l,
      filePath: file_path,
      firstLine: firstLine,
      fileContent: fileContent,
    })),
      ($[30] = fileContent),
      ($[31] = file_path),
      ($[32] = firstLine),
      ($[33] = patch),
      ($[34] = l),
      ($[35] = f));
  else f = $[35];
  let b;
  if ($[36] !== f || $[37] !== i)
    ((b = e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [i, f] }) })),
      ($[36] = f),
      ($[37] = i),
      ($[38] = b));
  else b = $[38];
  return b;
}

export { FileEditToolUseRejectedMessage };
