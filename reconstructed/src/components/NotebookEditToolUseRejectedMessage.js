/**
 * components/NotebookEditToolUseRejectedMessage.tsx
 *
 * NotebookEdit 被拒绝时的显示（替换/插入/删除 cell）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/NotebookEditToolUseRejectedMessage.tsx
 * pieces: chunk-q466qetm.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { getDisplayPath } from "../utils/file.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { FilePathLink } from "./FilePathLink.js";
import {
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { HighlightedCode } from "./HighlightedCode.js";
import { MessageResponse } from "./MessageResponse.js";

//@ chunk-q466qetm.js:7512-8643 fingerprint = NotebookEditToolUseRejectedMessage (0.909)
function NotebookEditToolUseRejectedMessage(t0) {
  let $ = w(23),
    {
      notebook_path: notebook_path,
      cell_id: cell_id,
      new_source: new_source,
      cell_type: cell_type,
      edit_mode: t1,
      verbose: verbose,
    } = t0,
    l = t1 === void 0 ? "replace" : t1,
    f = l === "delete" ? "delete" : `${l} cell in`,
    M;
  if ($[0] !== notebook_path || $[1] !== verbose)
    ((M = verbose ? notebook_path : getDisplayPath(notebook_path)),
      ($[0] = notebook_path),
      ($[1] = verbose),
      ($[2] = M));
  else M = $[2];
  let x = M,
    u;
  if ($[3] !== f)
    ((u = r(Text, { color: "subtle", children: ["User rejected ", f, " "] })), ($[3] = f), ($[4] = u));
  else u = $[4];
  let g;
  if ($[5] !== x || $[6] !== notebook_path)
    ((g = e(Text, {
      bold: !0,
      color: "subtle",
      children: e(FilePathLink, { filePath: notebook_path, children: x }),
    })),
      ($[5] = x),
      ($[6] = notebook_path),
      ($[7] = g));
  else g = $[7];
  let y;
  if ($[8] !== cell_id)
    ((y = cell_id ? markBrokenSequences(replaceLineBreaks(stripUnsafeChars(cell_id))) : ""),
      ($[8] = cell_id),
      ($[9] = y));
  else y = $[9];
  let _;
  if ($[10] !== y) ((_ = r(Text, { color: "subtle", children: [" at cell ", y] })), ($[10] = y), ($[11] = _));
  else _ = $[11];
  let h;
  if ($[12] !== u || $[13] !== g || $[14] !== _)
    ((h = r(Box, { flexDirection: "row", children: [u, g, _] })),
      ($[12] = u),
      ($[13] = g),
      ($[14] = _),
      ($[15] = h));
  else h = $[15];
  let R;
  if ($[16] !== cell_type || $[17] !== l || $[18] !== new_source)
    ((R =
      l !== "delete" &&
      e(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: e(HighlightedCode, {
          code: stripUnsafeChars(new_source),
          filePath: cell_type === "markdown" ? "file.md" : "file.py",
          dim: !0,
        }),
      })),
      ($[16] = cell_type),
      ($[17] = l),
      ($[18] = new_source),
      ($[19] = R));
  else R = $[19];
  let D;
  if ($[20] !== h || $[21] !== R)
    ((D = e(MessageResponse, { children: r(Box, { flexDirection: "column", children: [h, R] }) })),
      ($[20] = h),
      ($[21] = R),
      ($[22] = D));
  else D = $[22];
  return D;
}

export { NotebookEditToolUseRejectedMessage };
