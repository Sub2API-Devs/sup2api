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
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FilePathLink } from "../../components/FilePathLink.js";
import { NotebookEditToolUseRejectedMessage } from "../../components/NotebookEditToolUseRejectedMessage.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { HighlightedCode } from "../../components/HighlightedCode.js";

//@ chunk-e6aww6q8.js:4664942-4665018 fingerprint = getToolUseSummary (1)
/**
 * NotebookEdit 工具使用摘要：显示 notebook 路径。
 */
function getToolUseSummary(input) {
  if (!input?.notebook_path) return null;
  return getDisplayPath(input.notebook_path);
}
//@ chunk-q466qetm.js:8643-9017 fingerprint = renderToolUseMessage (1)
function renderToolUseMessage(
  { notebook_path, cell_id: cellId, new_source, cell_type, edit_mode },
  { verbose },
) {
  if (!notebook_path || !new_source || !cell_type) return null;
  let displayPath = verbose ? notebook_path : getDisplayPath(notebook_path);
  let cellIdLabel = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(`${cellId}`)));
  if (verbose) {
    let sourcePreview = replaceLineBreaks(stripUnsafeChars(truncateToLength(new_source, 30)));
    return jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default(FilePathLink, {
          filePath: notebook_path,
          children: displayPath,
        }),
        `@${cellIdLabel}, content: ${sourcePreview}\u2026, cell_type: ${cell_type}, edit_mode: ${edit_mode ?? "replace"}`,
      ],
    });
  }
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(FilePathLink, {
        filePath: notebook_path,
        children: displayPath,
      }),
      `@${cellIdLabel}`,
    ],
  });
}
//@ chunk-q466qetm.js:9017-9184 fingerprint = renderToolUseRejectedMessage (1)
function renderToolUseRejectedMessage(input, { verbose }) {
  return jsxProd_default(NotebookEditToolUseRejectedMessage, {
    notebook_path: input.notebook_path,
    cell_id: input.cell_id,
    new_source: input.new_source,
    cell_type: input.cell_type,
    edit_mode: input.edit_mode,
    verbose,
  });
}
//@ chunk-q466qetm.js:9415-9746 fingerprint = renderToolResultMessage (0.854)
function renderToolResultMessage({ cell_id, new_source: newSource, error }) {
  if (error)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(Text, {
        color: "error",
        children: stripUnsafeChars(error),
      }),
    });
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: [
            "Updated cell",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: cell_id ? markBrokenSequences(replaceLineBreaks(stripUnsafeChars(cell_id))) : "",
            }),
            ":",
          ],
        }),
        jsxProd_default(Box, {
          marginLeft: 2,
          children: jsxProd_default(HighlightedCode, {
            code: stripUnsafeChars(newSource),
            filePath: "notebook.py",
          }),
        }),
      ],
    }),
  });
}
export { getToolUseSummary, renderToolResultMessage, renderToolUseMessage, renderToolUseRejectedMessage };
