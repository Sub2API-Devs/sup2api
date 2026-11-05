/**
 * components/permissions/NotebookEditPermissionRequest/NotebookEditPermissionRequest.tsx
 *
 * NotebookEdit 权限请求（交给 FilePermissionDialog 的 notebook-edit-diff）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/NotebookEditPermissionRequest/NotebookEditPermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FileEditToolDiff, DiffFrame } from "../../FileEditToolDiff.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { FileWriteToolDiff } from "../FileWritePermissionRequest/FileWriteToolDiff.js";
import { NotebookEditToolDiff } from "./NotebookEditToolDiff.js";
import {
  replaceLineBreaks,
  markBrokenSequences,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { import_mapValues } from "../../../../vendor/lodash-es/_inlinedHelpers.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "../../../utils/invisibleChars.js";
import { renderToolUseByName } from "../../messages/toolUseRenderers.js";
import { logError } from "../../../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../../utils/errors.js";
import { Blockquote } from "../../Blockquote.js";

//@ chunk-czq1j3j2.js:1401862-1403242 callgraph-fingerprint (2.1.88 match: NotebookEditPermissionRequest, 0.161)
function NotebookEditPermissionRequest(payload, theme, languageName, paddingX) {
  let content = payload.content;
  switch (content.kind) {
    case "file-edit-diff":
      return jsxProd_default(FileEditToolDiff, {
        file_path: content.filePath,
        edits: [...content.edits],
        remoteOldContent: content.remoteOldContent,
        skipLocalRead: content.skipLocalRead,
      });
    case "file-write-diff":
      return jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          content.notice === undefined
            ? null
            : jsxProd_default(Text, {
                dimColor: true,
                children: content.notice,
              }),
          jsxProd_default(FileWriteToolDiff, {
            file_path: content.filePath,
            content: content.content,
            fileExists: content.fileExists,
            oldContent: content.oldContent,
          }),
        ],
      });
    case "notebook-edit-diff":
      return jsxProd_default(NotebookEditToolDiff, {
        notebook_path: content.notebookPath,
        cell_id: content.cellId,
        new_source: content.newSource,
        cell_type: content.cellType,
        edit_mode: content.editMode,
        verbose: true,
        width: 120,
        remoteOldContent: content.remoteOldContent,
        skipLocalRead: content.skipLocalRead,
        oldCellSource: content.oldCellSource,
      });
    case "tool-use-line": {
      let renderedToolUseMessage = payload.renderedToolUseMessage;
      if (typeof renderedToolUseMessage === "string") {
        if (languageName !== null)
          return jsxProd_default(DiffFrame, {
            paddingX,
            children: jsxProd_default(Text, {
              dimColor: true,
              children: languageName,
            }),
          });
        renderedToolUseMessage = replaceLineBreaks(renderedToolUseMessage);
      }
      if (renderedToolUseMessage == null)
        try {
          let sanitizedInput = import_mapValues(payload.input, (value) =>
            typeof value === "string" ? markBrokenSequences(stripInvisibleChars_3(value)) : value,
          );
          renderedToolUseMessage = renderToolUseByName(payload.toolName, sanitizedInput, {
            theme,
            verbose: true,
          });
        } catch (error) {
          logError(
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Error rendering tool use line for ${payload.toolName}: ${error}`,
              "Error rendering tool use line (file consent dialog fallback)",
            ),
          );
          renderedToolUseMessage = stripInvisibleChars_3(payload.filePath);
        }
      return jsxProd_default(DiffFrame, {
        paddingX,
        children: jsxProd_default(Blockquote, {
          multiline:
            typeof renderedToolUseMessage === "string" &&
            needsGutter(`${payload.userFacingName}(${renderedToolUseMessage})`),
          children: jsxProd_default_2(Text, {
            children: [payload.userFacingName, "(", renderedToolUseMessage, ")"],
          }),
        }),
      });
    }
    case "no-changes":
      return jsxProd_default(Text, {
        dimColor: true,
        children: content.message,
      });
  }
}
export { NotebookEditPermissionRequest };
