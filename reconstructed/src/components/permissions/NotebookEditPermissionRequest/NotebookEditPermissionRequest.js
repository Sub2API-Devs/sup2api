/**
 * components/permissions/NotebookEditPermissionRequest/NotebookEditPermissionRequest.tsx
 *
 * NotebookEdit 权限请求（交给 FilePermissionDialog 的 notebook-edit-diff）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/NotebookEditPermissionRequest/NotebookEditPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FileEditToolDiff, DiffFrame } from "../../FileEditToolDiff.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { FileWriteToolDiff } from "../FileWritePermissionRequest/FileWriteToolDiff.js";
import { NotebookEditToolDiff } from "./NotebookEditToolDiff.js";
import {
  replaceLineBreaks,
  markBrokenSequences,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { xr } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { hr } from "../../../utils/invisibleChars.js";
import { UHt } from "../../messages/toolUseRenderers.js";
import { logError } from "../../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import { Blockquote } from "../../Blockquote.js";

//@ chunk-18hwfzwa.js:1379060-1380440 callgraph-fingerprint = NotebookEditPermissionRequest (0.16)
function NotebookEditPermissionRequest(h, x, D, L) {
  let content = h.content;
  switch (content.kind) {
    case "file-edit-diff":
      return e(FileEditToolDiff, {
        file_path: content.filePath,
        edits: [...content.edits],
        remoteOldContent: content.remoteOldContent,
        skipLocalRead: content.skipLocalRead,
      });
    case "file-write-diff":
      return r(Box, {
        flexDirection: "column",
        children: [
          content.notice === void 0 ? null : e(Text, { dimColor: !0, children: content.notice }),
          e(FileWriteToolDiff, {
            file_path: content.filePath,
            content: content.content,
            fileExists: content.fileExists,
            oldContent: content.oldContent,
          }),
        ],
      });
    case "notebook-edit-diff":
      return e(NotebookEditToolDiff, {
        notebook_path: content.notebookPath,
        cell_id: content.cellId,
        new_source: content.newSource,
        cell_type: content.cellType,
        edit_mode: content.editMode,
        verbose: !0,
        width: 120,
        remoteOldContent: content.remoteOldContent,
        skipLocalRead: content.skipLocalRead,
        oldCellSource: content.oldCellSource,
      });
    case "tool-use-line": {
      let renderedToolUseMessage = h.renderedToolUseMessage;
      if (typeof renderedToolUseMessage === "string") {
        if (D !== null)
          return e(DiffFrame, { paddingX: L, children: e(Text, { dimColor: !0, children: D }) });
        renderedToolUseMessage = replaceLineBreaks(renderedToolUseMessage);
      }
      if (renderedToolUseMessage == null)
        try {
          let Re = xr(h.input, (Be) => (typeof Be === "string" ? markBrokenSequences(hr(Be)) : Be));
          renderedToolUseMessage = UHt(h.toolName, Re, { theme: x, verbose: !0 });
        } catch (error) {
          (logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Error rendering tool use line for ${h.toolName}: ${error}`,
              "Error rendering tool use line (file consent dialog fallback)",
            ),
          ),
            (renderedToolUseMessage = hr(h.filePath)));
        }
      return e(DiffFrame, {
        paddingX: L,
        children: e(Blockquote, {
          multiline:
            typeof renderedToolUseMessage === "string" &&
            needsGutter(`${h.userFacingName}(${renderedToolUseMessage})`),
          children: r(Text, { children: [h.userFacingName, "(", renderedToolUseMessage, ")"] }),
        }),
      });
    }
    case "no-changes":
      return e(Text, { dimColor: !0, children: content.message });
  }
}

export { NotebookEditPermissionRequest };
