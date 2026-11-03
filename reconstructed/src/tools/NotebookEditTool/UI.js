/**
 * tools/NotebookEditTool/UI.tsx
 *
 * NotebookEdit 的调用/结果/拒绝渲染与摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/NotebookEditTool/UI.tsx
 * pieces: chunk-e6aww6q8.js (1), chunk-q466qetm.js (3)
 * attribution: fingerprint 4
 */
import { getDisplayPath } from "../../utils/file.js";
import {
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { NotebookEditToolUseRejectedMessage } from "../../components/NotebookEditToolUseRejectedMessage.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { HighlightedCode } from "../../components/HighlightedCode.js";

//@ chunk-q466qetm.js:8643-9017 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage(
  {
    notebook_path: notebook_path,
    cell_id: cell_id,
    new_source: new_source,
    cell_type: cell_type,
    edit_mode: edit_mode,
  },
  { verbose: verbose },
) {
  if (!notebook_path || !new_source || !cell_type) return null;
  let displayPath = verbose ? notebook_path : getDisplayPath(notebook_path),
    l = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(`${cell_id}`)));
  if (verbose) {
    let f = replaceLineBreaks(stripUnsafeChars(truncateToLength(new_source, 30)));
    return r(Fragment, {
      children: [
        e(FilePathLink, { filePath: notebook_path, children: displayPath }),
        `@${l}, content: ${f}\u2026, cell_type: ${cell_type}, edit_mode: ${edit_mode ?? "replace"}`,
      ],
    });
  }
  return r(Fragment, {
    children: [e(FilePathLink, { filePath: notebook_path, children: displayPath }), `@${l}`],
  });
}
//@ chunk-q466qetm.js:9017-9184 fingerprint = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage(input, { verbose: verbose }) {
  return e(NotebookEditToolUseRejectedMessage, {
    notebook_path: input.notebook_path,
    cell_id: input.cell_id,
    new_source: input.new_source,
    cell_type: input.cell_type,
    edit_mode: input.edit_mode,
    verbose: verbose,
  });
}
//@ chunk-q466qetm.js:9415-9746 fingerprint = renderToolResultMessage (0.854)
function renderToolResultMessage({ cell_id: cell_id, new_source: new_source, error: error }) {
  if (error)
    return e(MessageResponse, { children: e(Text, { color: "error", children: stripUnsafeChars(error) }) });
  return e(MessageResponse, {
    children: r(Box, {
      flexDirection: "column",
      children: [
        r(Text, {
          children: [
            "Updated cell",
            " ",
            e(Text, {
              bold: !0,
              children: cell_id ? markBrokenSequences(replaceLineBreaks(stripUnsafeChars(cell_id))) : "",
            }),
            ":",
          ],
        }),
        e(Box, {
          marginLeft: 2,
          children: e(HighlightedCode, { code: stripUnsafeChars(new_source), filePath: "notebook.py" }),
        }),
      ],
    }),
  });
}
/**
 * NotebookEdit 工具使用摘要：显示 notebook 路径。
 */
//@ chunk-e6aww6q8.js:4664942-4665018 fingerprint = getToolUseSummary (1)
function getToolUseSummary(input) {
  if (!input?.notebook_path) return null;
  return getDisplayPath(input.notebook_path);
}

export { getToolUseSummary };
