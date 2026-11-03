/**
 * components/diff/DiffFileList.tsx
 *
 * /diff 文件列表：每个文件的增删行统计与状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffFileList.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-mtx4csef.js (2)
 * attribution: callgraph-fingerprint 2, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { pM } from "../CustomSelect/select.js";
import { diffLineToPlainText } from "./diffText.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DiffStatCounts } from "../PrBadge.js";
import { displayField } from "../../utils/permissions/approvalPayloadSerialization.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Sct, _9 } from "../permissions/ComputerUseApproval/ComputerUseApproval.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { Blockquote } from "../Blockquote.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-mtx4csef.js:17588-18112 callgraph-fingerprint = FileItem (0.322)
function FileItem(t0) {
  let $ = w(11),
    { file: file } = t0,
    i = pM();
  const t = i ? "suggestion" : void 0;
  let l;
  if ($[0] !== file.path) ((l = diffLineToPlainText(file.path)), ($[0] = file.path), ($[1] = l));
  else l = $[1];
  let T;
  if ($[2] !== t || $[3] !== l)
    ((T = e(Box, {
      flexBasis: 0,
      flexGrow: 1,
      marginRight: 1,
      children: e(Text, { color: t, wrap: "truncate-start", children: l }),
    })),
      ($[2] = t),
      ($[3] = l),
      ($[4] = T));
  else T = $[4];
  let m;
  if ($[5] !== file || $[6] !== i)
    ((m = e(FileStats, { file: file, isSelected: i })), ($[5] = file), ($[6] = i), ($[7] = m));
  else m = $[7];
  let d;
  if ($[8] !== T || $[9] !== m)
    ((d = r(Box, { flexDirection: "row", flexGrow: 1, children: [T, m] })),
      ($[8] = T),
      ($[9] = m),
      ($[10] = d));
  else d = $[10];
  return d;
}
//@ chunk-mtx4csef.js:18112-19087 fingerprint = FileStats (0.494)
function FileStats(t0) {
  let $ = w(16),
    { file: file, isSelected: isSelected } = t0;
  if (file.isUntracked) {
    const t1 = !isSelected;
    let l;
    if ($[0] !== t1)
      ((l = e(Text, { dimColor: t1, italic: !0, wrap: "truncate-end", children: "untracked" })),
        ($[0] = t1),
        ($[1] = l));
    else l = $[1];
    return l;
  }
  if (file.isBinary) {
    const t1 = !isSelected;
    let l;
    if ($[2] !== t1)
      ((l = e(Text, { dimColor: t1, italic: !0, wrap: "truncate-end", children: "Binary file" })),
        ($[2] = t1),
        ($[3] = l));
    else l = $[3];
    return l;
  }
  if (file.isLargeFile) {
    const t1 = !isSelected;
    let l;
    if ($[4] !== t1)
      ((l = e(Text, { dimColor: t1, italic: !0, wrap: "truncate-end", children: "Large file modified" })),
        ($[4] = t1),
        ($[5] = l));
    else l = $[5];
    return l;
  }
  let t;
  if ($[6] !== file.linesAdded || $[7] !== file.linesRemoved || $[8] !== isSelected)
    ((t = e(DiffStatCounts, { added: file.linesAdded, removed: file.linesRemoved, bold: isSelected })),
      ($[6] = file.linesAdded),
      ($[7] = file.linesRemoved),
      ($[8] = isSelected),
      ($[9] = t));
  else t = $[9];
  let l;
  if ($[10] !== file.isTruncated || $[11] !== isSelected)
    ((l = file.isTruncated && e(Text, { dimColor: !isSelected, children: " (truncated)" })),
      ($[10] = file.isTruncated),
      ($[11] = isSelected),
      ($[12] = l));
  else l = $[12];
  let T;
  if ($[13] !== t || $[14] !== l)
    ((T = r(Text, { wrap: "truncate-end", children: [t, l] })), ($[13] = t), ($[14] = l), ($[15] = T));
  else T = $[15];
  return T;
}
//@ chunk-18hwfzwa.js:1239149-1239902 callgraph-fingerprint = DiffFileList (0.197)
function DiffFileList(t0) {
  let $ = w(12),
    { reason: reason } = t0,
    D = displayField(reason),
    { columns: columns } = useTerminalSize(),
    start = Math.max(20, columns - Sct),
    Re;
  if ($[0] !== start)
    ((Re = function He(Be) {
      return wrapAnsi(Be, start, { trim: !1, hard: !0 }).split(`
`);
    }),
      ($[0] = start),
      ($[1] = Re));
  else Re = $[1];
  let He = Re,
    flattened = D.text
      .split(
        `
`,
      )
      .flatMap(He),
    ze = flattened.length <= _9 ? flattened : flattened.slice(0, _9 - 1),
    Xe = flattened.length - ze.length;
  const rt = Blockquote,
    needsGutter = D.needsGutter,
    At = Text,
    It = !0,
    joined = ze.join(`
`);
  let Et;
  if ($[2] !== Xe)
    ((Et =
      Xe > 0
        ? `
\u2026 +${Xe} more ${plural(Xe, "row")} not shown.`
        : ""),
      ($[2] = Xe),
      ($[3] = Et));
  else Et = $[3];
  let Dt;
  if ($[4] !== At || $[5] !== joined || $[6] !== Et)
    ((Dt = r(At, { dimColor: It, children: [joined, Et] })),
      ($[4] = At),
      ($[5] = joined),
      ($[6] = Et),
      ($[7] = Dt));
  else Dt = $[7];
  let Lt;
  if ($[8] !== rt || $[9] !== D || $[10] !== Dt)
    ((Lt = e(rt, { multiline: needsGutter, children: Dt })),
      ($[8] = rt),
      ($[9] = D),
      ($[10] = Dt),
      ($[11] = Lt));
  else Lt = $[11];
  return Lt;
}

export { DiffFileList, FileItem };
