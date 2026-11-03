/**
 * components/FileEditToolUpdatedMessage.tsx
 *
 * 文件编辑成功结果："Added N lines, removed M lines" + 结构化 diff（condensed 模式只显示统计）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FileEditToolUpdatedMessage.tsx
 * pieces: chunk-dcmhvw5a.js (1), chunk-vnfdjr3f.js (5)
 * attribution: fingerprint 2, file-local 2, callgraph-fingerprint 1, layout 1
 */
import { count } from "../utils/collections.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MessageResponse } from "./MessageResponse.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { CtrlOToExpand } from "./CtrlOToExpand.js";
import { StructuredDiffList } from "./StructuredDiffList.js";
import { countCharInString } from "../utils/stringUtils.js";

//@ chunk-vnfdjr3f.js:2341-2381 file-local
function pt(__0) {
  return __0.startsWith("+");
}
//@ chunk-vnfdjr3f.js:2381-2421 callgraph-fingerprint = _temp2 (1)
function dt(acc, hunk) {
  return acc + count(hunk.lines, pt);
}
//@ chunk-vnfdjr3f.js:2421-2463 file-local
function ht(vt) {
  return vt.startsWith("-");
}
//@ chunk-vnfdjr3f.js:2463-2507 layout
function at(Pt, bt) {
  return Pt + count(bt.lines, ht);
}
/**
 * 编辑成功消息："Added N lines, removed M lines"，非 condensed 时下方显示 StructuredDiffList。
 */
//@ chunk-vnfdjr3f.js:2507-3881 fingerprint = FileEditToolUpdatedMessage (0.834)
function FileEditToolUpdatedMessage(t0) {
  let $ = w(25),
    {
      filePath: filePath,
      structuredPatch: structuredPatch,
      firstLine: firstLine,
      fileContent: fileContent,
      style: style,
      verbose: verbose,
      previewHint: previewHint,
      collapsed: collapsed,
    } = t0,
    { columns: columns } = useTerminalSize(),
    numAdditions = structuredPatch.reduce(dt, 0),
    numRemovals = structuredPatch.reduce(at, 0),
    P;
  if ($[0] !== numAdditions)
    ((P =
      numAdditions > 0
        ? r(Fragment, {
            children: [
              "Added ",
              e(Text, { bold: !0, children: numAdditions }),
              " ",
              numAdditions > 1 ? "lines" : "line",
            ],
          })
        : null),
      ($[0] = numAdditions),
      ($[1] = P));
  else P = $[1];
  const t2 = numAdditions > 0 && numRemovals > 0 ? ", " : null;
  let i;
  if ($[2] !== numAdditions || $[3] !== numRemovals)
    ((i =
      numRemovals > 0
        ? r(Fragment, {
            children: [
              numAdditions === 0 ? "R" : "r",
              "emoved ",
              e(Text, { bold: !0, children: numRemovals }),
              " ",
              numRemovals > 1 ? "lines" : "line",
            ],
          })
        : null),
      ($[2] = numAdditions),
      ($[3] = numRemovals),
      ($[4] = i));
  else i = $[4];
  let l;
  if ($[5] !== P || $[6] !== t2 || $[7] !== i)
    ((l = r(Text, { children: [P, t2, i] })), ($[5] = P), ($[6] = t2), ($[7] = i), ($[8] = l));
  else l = $[8];
  let text = l;
  if (previewHint) {
    if (style !== "condensed" && !verbose) {
      let u;
      if ($[9] !== previewHint)
        ((u = e(MessageResponse, { children: e(Text, { dimColor: !0, children: previewHint }) })),
          ($[9] = previewHint),
          ($[10] = u));
      else u = $[10];
      return u;
    }
  } else if (style === "condensed" && !verbose) {
    return text;
  } else if (collapsed && !verbose && numAdditions + numRemovals > 0) {
    let u;
    if ($[11] === MEMO_CACHE_SENTINEL) ((u = e(CtrlOToExpand, {})), ($[11] = u));
    else u = $[11];
    let x;
    if ($[12] !== text)
      ((x = e(MessageResponse, { children: r(Text, { children: [text, " ", u] }) })),
        ($[12] = text),
        ($[13] = x));
    else x = $[13];
    return x;
  }
  let u;
  if ($[14] !== text) ((u = e(Text, { children: text })), ($[14] = text), ($[15] = u));
  else u = $[15];
  const t6 = columns - 12;
  let f;
  if (
    $[16] !== fileContent ||
    $[17] !== filePath ||
    $[18] !== firstLine ||
    $[19] !== structuredPatch ||
    $[20] !== t6
  )
    ((f = e(StructuredDiffList, {
      hunks: structuredPatch,
      dim: !1,
      width: t6,
      filePath: filePath,
      firstLine: firstLine,
      fileContent: fileContent,
    })),
      ($[16] = fileContent),
      ($[17] = filePath),
      ($[18] = firstLine),
      ($[19] = structuredPatch),
      ($[20] = t6),
      ($[21] = f));
  else f = $[21];
  let b;
  if ($[22] !== u || $[23] !== f)
    ((b = e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [u, f] }) })),
      ($[22] = u),
      ($[23] = f),
      ($[24] = b));
  else b = $[24];
  return b;
}
//@ chunk-dcmhvw5a.js:383995-384090 fingerprint = _temp4 (0.685)
function oC(e) {
  return {
    bytes: Buffer.byteLength(e, "utf8"),
    lines:
      countCharInString(
        e,
        `
`,
      ) +
      (e.endsWith(`
`)
        ? 0
        : 1),
  };
}

export { oC, FileEditToolUpdatedMessage };
