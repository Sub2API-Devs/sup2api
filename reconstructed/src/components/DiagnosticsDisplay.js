/**
 * components/DiagnosticsDisplay.tsx
 *
 * IDE 诊断信息（附件）显示：按文件分组列出 [Line N] 问题。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DiagnosticsDisplay.tsx
 * pieces: chunk-ah34pb7m.js (4)
 * attribution: fingerprint 4
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "./MessageResponse.js";
import { Text, Box } from "../ink/components/Text.js";
import { getSeverityIcon, sanitizeDiagnosticsAttachment } from "../utils/attachments/diagnostics.js";
import { Kc } from "../../vendor/react/cjs/react.production.js";
import { toCloudRelativePath } from "../utils/file.js";
import { firstLineOf } from "../utils/stringUtils.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:80593-80640 fingerprint = _temp (1)
function sumDiagnostics(sum, file) {
  return sum + file.diagnostics.length;
}
//@ chunk-ah34pb7m.js:80640-80876 fingerprint = _temp2 (1)
function renderDiagnosticLine(diagnostic, diagIndex) {
  return jsxProd_default(
    MessageResponse,
    {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: [
          "  ",
          getSeverityIcon(diagnostic.severity),
          " [Line ",
          diagnostic.range.start.line + 1,
          ":",
          diagnostic.range.start.character + 1,
          "] ",
          diagnostic.message,
          diagnostic.code ? ` [${diagnostic.code}]` : "",
          diagnostic.source ? ` (${diagnostic.source})` : "",
        ],
      }),
    },
    diagIndex,
  );
}
//@ chunk-ah34pb7m.js:80876-81246 fingerprint = _temp3 (1)
/**
 * 渲染单个文件的诊断列表：文件名及其下各条诊断。
 */
function renderDiagnosticFile(file, fileIndex) {
  return jsxProd_default_2(
    Kc,
    {
      children: [
        jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Text, {
            dimColor: true,
            wrap: "wrap",
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: toCloudRelativePath(
                  file.uri.replace("file://", "").replace("_claude_fs_right:", ""),
                ),
              }),
              " ",
              jsxProd_default(Text, {
                dimColor: true,
                children: file.uri.startsWith("file://")
                  ? "(file://)"
                  : file.uri.startsWith("_claude_fs_right:")
                    ? "(claude_fs_right)"
                    : `(${firstLineOf(file.uri, ":")})`,
              }),
              ":",
            ],
          }),
        }),
        file.diagnostics.map(renderDiagnosticLine),
      ],
    },
    fileIndex,
  );
}
//@ chunk-ah34pb7m.js:81246-81968 fingerprint = DiagnosticsDisplay (0.627)
function DiagnosticsDisplay(props) {
  let $ = w(11);
  let { attachment, verbose, isTranscriptMode } = props;
  let h;
  if ($[0] !== attachment.files || $[1] !== isTranscriptMode || $[2] !== verbose) {
    h = EARLY_RETURN_SENTINEL;
    T: {
      let M = sanitizeDiagnosticsAttachment(attachment.files);
      if (M.length === 0) {
        h = null;
        break T;
      }
      let totalIssues = M.reduce(sumDiagnostics, 0);
      let fileCount = M.length;
      if (verbose || isTranscriptMode) {
        h = jsxProd_default(Box, {
          flexDirection: "column",
          children: M.map(renderDiagnosticFile),
        });
        break T;
      } else {
        let b;
        if ($[4] !== totalIssues) {
          b = jsxProd_default(Text, {
            bold: true,
            children: totalIssues,
          });
          $[4] = totalIssues;
          $[5] = b;
        } else b = $[5];
        const E = totalIssues === 1 ? "issue" : "issues";
        const B = fileCount === 1 ? "file" : "files";
        let L;
        if ($[6] !== fileCount || $[7] !== b || $[8] !== E || $[9] !== B) {
          L = jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              dimColor: true,
              wrap: "wrap",
              children: [
                "Found ",
                b,
                " new diagnostic",
                " ",
                E,
                " in ",
                fileCount,
                " ",
                B,
                " (ctrl+o to expand)",
              ],
            }),
          });
          $[6] = fileCount;
          $[7] = b;
          $[8] = E;
          $[9] = B;
          $[10] = L;
        } else L = $[10];
        h = L;
        break T;
      }
    }
    $[0] = attachment.files;
    $[1] = isTranscriptMode;
    $[2] = verbose;
    $[3] = h;
  } else h = $[3];
  if (h !== EARLY_RETURN_SENTINEL) return h;
}
export { DiagnosticsDisplay };
