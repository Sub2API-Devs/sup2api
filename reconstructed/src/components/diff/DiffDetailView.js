/**
 * components/diff/DiffDetailView.tsx
 *
 * /diff 单文件详情：结构化 diff、未跟踪/二进制/过大/被读权限规则限制等状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/diff/DiffDetailView.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 */
import { resolve, resolve as resolve_2, resolve as resolve_3 } from "path";
import { useSelection } from "../../ink/components/Input.js";
import { R, Oo, P, j } from "../../../vendor/react/cjs/react.production.js";
import { countCharInString, getFirstLine } from "../../utils/stringUtils.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useProject } from "../../context/session.js";
import { diffLineToPlainText } from "./diffText.js";
import { wt } from "../../remote/remoteMode.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { readBoundedSync } from "../../utils/fsSafety/atomicWriteStaging.js";
import { Divider } from "../design-system/Divider.js";
import { HintText } from "../design-system/HintText.js";
import { StructuredDiff } from "../StructuredDiff.js";

/**
 * 订阅终端选区：在 diff 区域内选中文本（非行选、非拖动中）时把选中内容作为 diff 附件回调出去，记 diff_selection_attach。
 */
//@ chunk-18hwfzwa.js:1816722-1817369 placement
function useDiffSelectionAttach(minColumn, getMaxRow, onAttach, filePathForRow) {
  let selection = useSelection(),
    lastAttachedText = R(""),
    Re = Oo(() => {
      if (!onAttach) return;
      let state = selection.getState();
      if (state?.isDragging || !selection.hasSelection()) {
        lastAttachedText.current = "";
        return;
      }
      if (!state?.anchor || !state.focus || state.anchorSpan?.kind === "line") return;
      let He = state.virtualAnchorCol ?? state.anchor.col,
        We = state.virtualFocusCol ?? state.focus.col;
      if (He < minColumn || We < minColumn) return;
      let ze = getMaxRow();
      if (ze === null || state.anchor.row > ze || state.focus.row > ze) return;
      let selectedText = selection.getSelectedText();
      if (!selectedText.trim() || selectedText === lastAttachedText.current) return;
      lastAttachedText.current = selectedText;
      let rt =
          countCharInString(
            selectedText.trimEnd(),
            `
`,
          ) + 1,
        kt = filePathForRow?.(Math.min(state.anchor.row, state.focus.row));
      (onAttach({ source: "diff", text: selectedText, lineCount: rt, filePath: kt }),
        logFeatureOk("diff_selection_attach"));
    });
  P(() => selection.subscribe(() => Re()), [selection]);
}
//@ chunk-18hwfzwa.js:1817369-1817373 placement
j();
/**
 * when 为真时以暗色显示 “ (children)”。
 */
//@ chunk-18hwfzwa.js:1817406-1817595 placement
function ParenHint(h) {
  let $ = w(2),
    { children: children, when: when } = h;
  if (!(when === void 0 ? !0 : when)) {
    return null;
  }
  let ke;
  if ($[0] !== children)
    ((ke = r(Text, { dimColor: !0, children: [" (", children, ")"] })), ($[0] = children), ($[1] = ke));
  else ke = $[1];
  return ke;
}
//@ chunk-18hwfzwa.js:1817595-1817607 layout
var uxt = 1e6;
//@ chunk-18hwfzwa.js:1817607-1821939 fingerprint = DiffDetailView (0.447)
function DiffDetailView(t0) {
  let $ = w(75),
    {
      filePath: filePath,
      hunks: hunks,
      isLargeFile: isLargeFile,
      isBinary: isBinary,
      isTruncated: isTruncated,
      isUntracked: isUntracked,
      isRestricted: isRestricted,
      width: width,
    } = t0,
    { columns: columns } = useTerminalSize(),
    ze = useProject(),
    Xe = width ?? columns - 4,
    kt;
  if ($[0] !== filePath) ((kt = diffLineToPlainText(filePath)), ($[0] = filePath), ($[1] = kt));
  else kt = $[1];
  let At = kt,
    It;
  if (
    $[2] !== filePath ||
    $[3] !== isBinary ||
    $[4] !== isLargeFile ||
    $[5] !== isRestricted ||
    $[6] !== isUntracked ||
    $[7] !== ze
  ) {
    Et: {
      if (!filePath || isBinary || isLargeFile || isUntracked || isRestricted || wt()) {
        let Ot;
        if ($[9] === MEMO_CACHE_SENTINEL) ((Ot = { firstLine: null, fileContent: void 0 }), ($[9] = Ot));
        else Ot = $[9];
        It = Ot;
        break Et;
      }
      let Dt;
      try {
        Dt = readBoundedSync(resolve_3(ze.cwd, filePath), { maxBytes: uxt });
      } catch {
        let Ot;
        if ($[10] === MEMO_CACHE_SENTINEL) ((Ot = { firstLine: null, fileContent: void 0 }), ($[10] = Ot));
        else Ot = $[10];
        It = Ot;
        break Et;
      }
      It = { firstLine: getFirstLine(Dt), fileContent: Dt };
    }
    (($[2] = filePath),
      ($[3] = isBinary),
      ($[4] = isLargeFile),
      ($[5] = isRestricted),
      ($[6] = isUntracked),
      ($[7] = ze),
      ($[8] = It));
  } else It = $[8];
  let { firstLine: firstLine, fileContent: fileContent } = It;
  if (isRestricted) {
    let Ot;
    if ($[11] !== At)
      ((Ot = e(Box, { children: e(Text, { bold: !0, children: At }) })), ($[11] = At), ($[12] = Ot));
    else Ot = $[12];
    let Xt;
    if ($[13] !== Xe) ((Xt = e(Divider, { width: Xe })), ($[13] = Xe), ($[14] = Xt));
    else Xt = $[14];
    let io;
    if ($[15] === MEMO_CACHE_SENTINEL)
      ((io = e(Box, {
        flexDirection: "column",
        children: e(Text, {
          dimColor: !0,
          italic: !0,
          children: "Content restricted by read-permission rules",
        }),
      })),
        ($[15] = io));
    else io = $[15];
    let so;
    if ($[16] !== Ot || $[17] !== Xt)
      ((so = r(Box, { flexDirection: "column", width: "100%", children: [Ot, Xt, io] })),
        ($[16] = Ot),
        ($[17] = Xt),
        ($[18] = so));
    else so = $[18];
    return so;
  }
  if (isUntracked) {
    let Ot;
    if ($[19] !== At) ((Ot = e(Text, { bold: !0, children: At })), ($[19] = At), ($[20] = Ot));
    else Ot = $[20];
    let Xt;
    if ($[21] === MEMO_CACHE_SENTINEL) ((Xt = e(ParenHint, { children: "untracked" })), ($[21] = Xt));
    else Xt = $[21];
    let io;
    if ($[22] !== Ot) ((io = r(Box, { children: [Ot, Xt] })), ($[22] = Ot), ($[23] = io));
    else io = $[23];
    let so;
    if ($[24] !== Xe) ((so = e(Divider, { width: Xe })), ($[24] = Xe), ($[25] = so));
    else so = $[25];
    let po;
    if ($[26] === MEMO_CACHE_SENTINEL)
      ((po = e(Text, { dimColor: !0, italic: !0, children: "New file not yet staged." })), ($[26] = po));
    else po = $[26];
    let ao;
    if ($[27] !== At)
      ((ao =
        !wt() &&
        r(Text, { dimColor: !0, italic: !0, children: ["Run `git add :/", At, "` to see line counts."] })),
        ($[27] = At),
        ($[28] = ao));
    else ao = $[28];
    let co;
    if ($[29] !== ao)
      ((co = r(Box, { flexDirection: "column", children: [po, ao] })), ($[29] = ao), ($[30] = co));
    else co = $[30];
    let bo;
    if ($[31] !== io || $[32] !== so || $[33] !== co)
      ((bo = r(Box, { flexDirection: "column", width: "100%", children: [io, so, co] })),
        ($[31] = io),
        ($[32] = so),
        ($[33] = co),
        ($[34] = bo));
    else bo = $[34];
    return bo;
  }
  if (isBinary) {
    let Ot;
    if ($[35] !== At)
      ((Ot = e(Box, { children: e(Text, { bold: !0, children: At }) })), ($[35] = At), ($[36] = Ot));
    else Ot = $[36];
    let Xt;
    if ($[37] !== Xe) ((Xt = e(Divider, { width: Xe })), ($[37] = Xe), ($[38] = Xt));
    else Xt = $[38];
    let io;
    if ($[39] === MEMO_CACHE_SENTINEL)
      ((io = e(Box, {
        flexDirection: "column",
        children: e(Text, { dimColor: !0, italic: !0, children: "Binary file - cannot display diff" }),
      })),
        ($[39] = io));
    else io = $[39];
    let so;
    if ($[40] !== Ot || $[41] !== Xt)
      ((so = r(Box, { flexDirection: "column", width: "100%", children: [Ot, Xt, io] })),
        ($[40] = Ot),
        ($[41] = Xt),
        ($[42] = so));
    else so = $[42];
    return so;
  }
  if (isLargeFile) {
    let Ot;
    if ($[43] !== At)
      ((Ot = e(Box, { children: e(Text, { bold: !0, children: At }) })), ($[43] = At), ($[44] = Ot));
    else Ot = $[44];
    let Xt;
    if ($[45] !== Xe) ((Xt = e(Divider, { width: Xe })), ($[45] = Xe), ($[46] = Xt));
    else Xt = $[46];
    const io = wt() ? "Diff too large to display." : "Large file - diff exceeds 1 MB limit";
    let so;
    if ($[47] === MEMO_CACHE_SENTINEL)
      ((so = e(Box, {
        flexDirection: "column",
        children: e(Text, { dimColor: !0, italic: !0, children: io }),
      })),
        ($[47] = so));
    else so = $[47];
    let po;
    if ($[48] !== Ot || $[49] !== Xt)
      ((po = r(Box, { flexDirection: "column", width: "100%", children: [Ot, Xt, so] })),
        ($[48] = Ot),
        ($[49] = Xt),
        ($[50] = po));
    else po = $[50];
    return po;
  }
  let Ot;
  if ($[51] !== At) ((Ot = e(Text, { bold: !0, children: At })), ($[51] = At), ($[52] = Ot));
  else Ot = $[52];
  const Xt = isTruncated ?? !1;
  let io;
  if ($[53] !== Xt) ((io = e(ParenHint, { when: Xt, children: "truncated" })), ($[53] = Xt), ($[54] = io));
  else io = $[54];
  let so;
  if ($[55] !== Ot || $[56] !== io)
    ((so = r(Box, { children: [Ot, io] })), ($[55] = Ot), ($[56] = io), ($[57] = so));
  else so = $[57];
  let po;
  if ($[58] !== Xe) ((po = e(Divider, { width: Xe })), ($[58] = Xe), ($[59] = po));
  else po = $[59];
  let ao;
  if ($[60] !== Xe || $[61] !== fileContent || $[62] !== filePath || $[63] !== firstLine || $[64] !== hunks)
    ((ao =
      hunks.length === 0
        ? e(HintText, { children: "No diff content" })
        : hunks.map((hunk, index) =>
            e(
              StructuredDiff,
              {
                patch: hunk,
                filePath: filePath,
                firstLine: firstLine,
                fileContent: fileContent,
                dim: !1,
                width: Xe,
              },
              index,
            ),
          )),
      ($[60] = Xe),
      ($[61] = fileContent),
      ($[62] = filePath),
      ($[63] = firstLine),
      ($[64] = hunks),
      ($[65] = ao));
  else ao = $[65];
  let co;
  if ($[66] !== ao) ((co = e(Box, { flexDirection: "column", children: ao })), ($[66] = ao), ($[67] = co));
  else co = $[67];
  let bo;
  if ($[68] !== isTruncated)
    ((bo =
      isTruncated &&
      e(Text, { dimColor: !0, italic: !0, children: "\u2026 diff truncated (exceeded 400 line limit)" })),
      ($[68] = isTruncated),
      ($[69] = bo));
  else bo = $[69];
  let Ro;
  if ($[70] !== bo || $[71] !== so || $[72] !== po || $[73] !== co)
    ((Ro = r(Box, { flexDirection: "column", width: "100%", children: [so, po, co, bo] })),
      ($[70] = bo),
      ($[71] = so),
      ($[72] = po),
      ($[73] = co),
      ($[74] = Ro));
  else Ro = $[74];
  return Ro;
}

export { useDiffSelectionAttach, DiffDetailView, ParenHint };
