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
import { fragmentTypeExport } from "../../vendor/react/cjs/react.production.js";
import { toCloudRelativePath } from "../utils/file.js";
import { firstLineOf } from "../utils/stringUtils.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
    fragmentTypeExport,
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
  let $ = useMemoCache(11);
  let { attachment, verbose, isTranscriptMode } = props;
  let resultElement;
  if ($[0] !== attachment.files || $[1] !== isTranscriptMode || $[2] !== verbose) {
    resultElement = EARLY_RETURN_SENTINEL;
    T: {
      let files = sanitizeDiagnosticsAttachment(attachment.files);
      if (files.length === 0) {
        resultElement = null;
        break T;
      }
      let totalIssues = files.reduce(sumDiagnostics, 0);
      let fileCount = files.length;
      if (verbose || isTranscriptMode) {
        resultElement = jsxProd_default(Box, {
          flexDirection: "column",
          children: files.map(renderDiagnosticFile),
        });
        break T;
      } else {
        let countElement;
        if ($[4] !== totalIssues) {
          countElement = jsxProd_default(Text, {
            bold: true,
            children: totalIssues,
          });
          $[4] = totalIssues;
          $[5] = countElement;
        } else countElement = $[5];
        const issueWord = totalIssues === 1 ? "issue" : "issues";
        const fileWord = fileCount === 1 ? "file" : "files";
        let summaryElement;
        if ($[6] !== fileCount || $[7] !== countElement || $[8] !== issueWord || $[9] !== fileWord) {
          summaryElement = jsxProd_default(MessageResponse, {
            children: jsxProd_default_2(Text, {
              dimColor: true,
              wrap: "wrap",
              children: [
                "Found ",
                countElement,
                " new diagnostic",
                " ",
                issueWord,
                " in ",
                fileCount,
                " ",
                fileWord,
                " (ctrl+o to expand)",
              ],
            }),
          });
          $[6] = fileCount;
          $[7] = countElement;
          $[8] = issueWord;
          $[9] = fileWord;
          $[10] = summaryElement;
        } else summaryElement = $[10];
        resultElement = summaryElement;
        break T;
      }
    }
    $[0] = attachment.files;
    $[1] = isTranscriptMode;
    $[2] = verbose;
    $[3] = resultElement;
  } else resultElement = $[3];
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
}
export { DiagnosticsDisplay };
