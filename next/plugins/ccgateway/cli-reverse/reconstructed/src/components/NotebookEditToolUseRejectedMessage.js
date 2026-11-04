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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { getDisplayPath } from "../utils/file.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
function NotebookEditToolUseRejectedMessage(props) {
  let $ = useMemoCache(23);
  let { notebook_path, cell_id, new_source, cell_type, edit_mode: editMode, verbose } = props;
  let edit_mode = editMode === undefined ? "replace" : editMode;
  let actionLabel = edit_mode === "delete" ? "delete" : `${edit_mode} cell in`;
  let filePathLabel;
  if ($[0] !== notebook_path || $[1] !== verbose) {
    filePathLabel = verbose ? notebook_path : getDisplayPath(notebook_path);
    $[0] = notebook_path;
    $[1] = verbose;
    $[2] = filePathLabel;
  } else filePathLabel = $[2];
  let children = filePathLabel;
  let rejectedNotice;
  if ($[3] !== actionLabel) {
    rejectedNotice = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["User rejected ", actionLabel, " "],
    });
    $[3] = actionLabel;
    $[4] = rejectedNotice;
  } else rejectedNotice = $[4];
  let t4;
  if ($[5] !== children || $[6] !== notebook_path) {
    t4 = jsxProd_default(Text, {
      bold: true,
      color: "subtle",
      children: jsxProd_default(FilePathLink, {
        filePath: notebook_path,
        children,
      }),
    });
    $[5] = children;
    $[6] = notebook_path;
    $[7] = t4;
  } else t4 = $[7];
  let highlightedCode;
  if ($[8] !== cell_id) {
    highlightedCode = cell_id ? markBrokenSequences(replaceLineBreaks(stripUnsafeChars(cell_id))) : "";
    $[8] = cell_id;
    $[9] = highlightedCode;
  } else highlightedCode = $[9];
  let cellNotice;
  if ($[10] !== highlightedCode) {
    cellNotice = jsxProd_default_2(Text, {
      color: "subtle",
      children: [" at cell ", highlightedCode],
    });
    $[10] = highlightedCode;
    $[11] = cellNotice;
  } else cellNotice = $[11];
  let t6;
  if ($[12] !== rejectedNotice || $[13] !== t4 || $[14] !== cellNotice) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [rejectedNotice, t4, cellNotice],
    });
    $[12] = rejectedNotice;
    $[13] = t4;
    $[14] = cellNotice;
    $[15] = t6;
  } else t6 = $[15];
  let t7;
  if ($[16] !== cell_type || $[17] !== edit_mode || $[18] !== new_source) {
    t7 =
      edit_mode !== "delete" &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexDirection: "column",
        children: jsxProd_default(HighlightedCode, {
          code: stripUnsafeChars(new_source),
          filePath: cell_type === "markdown" ? "file.md" : "file.py",
          dim: true,
        }),
      });
    $[16] = cell_type;
    $[17] = edit_mode;
    $[18] = new_source;
    $[19] = t7;
  } else t7 = $[19];
  let t8;
  if ($[20] !== t6 || $[21] !== t7) {
    t8 = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t6, t7],
      }),
    });
    $[20] = t6;
    $[21] = t7;
    $[22] = t8;
  } else t8 = $[22];
  return t8;
}
export { NotebookEditToolUseRejectedMessage };
