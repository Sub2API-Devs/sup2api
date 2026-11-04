/**
 * utils/attachments/diagnostics.ts
 *
 * 2.1.316 新增：诊断附件（重放时清理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { weakSet_5, loggedAttachmentPaths, MAX_ATTACHMENT_PATH_CHARS } from "./fileAttachments.js";
import { logForDebugging } from "../debug.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";

//@ chunk-e6aww6q8.js:3249673-3249758 placement
/**
 * 诊断严重级别到展示名的映射（error→Error、hint→Hint 等）。
 */
var SEVERITY_LABELS = {
  error: "Error",
  warning: "Warning",
  info: "Info",
  information: "Info",
  hint: "Hint",
};
//@ chunk-e6aww6q8.js:3249758-3249868 placement
function normalizeDiagnosticSeverity(severity) {
  if (typeof severity !== "string") return;
  let lower = severity.toLowerCase();
  return Object.hasOwn(SEVERITY_LABELS, lower) ? SEVERITY_LABELS[lower] : undefined;
}
//@ chunk-e6aww6q8.js:3249868-3251084 placement
/**
 * 清理重放附件中的诊断文件载荷（格式不对时丢弃）。
 */
function sanitizeDiagnosticsAttachment(files) {
  if (!Array.isArray(files)) {
    let payloadKind = files === undefined ? "missing" : "non-array";
    let payloadIsObject = typeof files === "object" && files !== null;
    if (!(payloadIsObject ? weakSet_5.has(files) : loggedAttachmentPaths().has(payloadKind))) {
      if (payloadIsObject) weakSet_5.add(files);
      else loggedAttachmentPaths().add(payloadKind);
      logForDebugging(`Dropped a ${payloadKind} diagnostics files payload from a replayed attachment`);
    }
    return [];
  }
  let validFiles = [];
  let droppedFiles = 0;
  let droppedDiagnostics = 0;
  for (let file of files) {
    if (
      typeof file !== "object" ||
      file === null ||
      typeof file.uri !== "string" ||
      !Array.isArray(file.diagnostics)
    ) {
      droppedFiles++;
      continue;
    }
    let { uri, diagnostics } = file;
    let flattened = diagnostics.flatMap((diagnostic) => {
      if (typeof diagnostic !== "object" || diagnostic === null) return [];
      let raw = diagnostic;
      let message = raw.message;
      let start = raw.range?.start;
      if (
        typeof message !== "string" ||
        typeof start?.line !== "number" ||
        typeof start?.character !== "number"
      )
        return [];
      let severity = normalizeDiagnosticSeverity(raw.severity);
      let end = raw.range?.end;
      return [
        {
          message,
          ...(severity !== undefined && {
            severity,
          }),
          range: {
            start: {
              line: start.line,
              character: start.character,
            },
            end:
              typeof end?.line === "number" && typeof end?.character === "number"
                ? {
                    line: end.line,
                    character: end.character,
                  }
                : {
                    line: start.line,
                    character: start.character,
                  },
          },
          ...(typeof raw.code === "string" && {
            code: raw.code,
          }),
          ...(typeof raw.source === "string" && {
            source: raw.source,
          }),
        },
      ];
    });
    droppedDiagnostics += diagnostics.length - flattened.length;
    if (flattened.length === 0) {
      droppedFiles++;
      continue;
    }
    validFiles.push({
      uri,
      diagnostics: flattened,
    });
  }
  if ((droppedFiles > 0 || droppedDiagnostics > 0) && !weakSet_5.has(files)) {
    weakSet_5.add(files);
    logForDebugging(
      `Dropped ${droppedFiles} malformed file(s) and ${droppedDiagnostics} malformed diagnostic(s) from a replayed diagnostics attachment`,
    );
  }
  return validFiles;
}
//@ chunk-e6aww6q8.js:3251084-3251446 placement
/**
 * 把各文件的诊断格式化为"文件名: 图标 [Line x:y] 消息 [code] (source)"文本，超出长度上限时截断并加 …[truncated]。
 */
function formatDiagnosticsSummary(files) {
  let joined = files.map((file) => {
    let fileName = file.uri.split("/").pop() || file.uri;
    let joined = file.diagnostics.map(
      (diagnostic) =>
        `  ${getSeverityIcon(diagnostic.severity)} [Line ${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1}] ${diagnostic.message}${diagnostic.code ? ` [${diagnostic.code}]` : ""}${diagnostic.source ? ` (${diagnostic.source})` : ""}`,
    ).join(`
`);
    return `${fileName}:
${joined}`;
  }).join(`

`);
  if (joined.length > MAX_ATTACHMENT_PATH_CHARS)
    return joined.slice(0, MAX_ATTACHMENT_PATH_CHARS - 12) + "\u2026[truncated]";
  return joined;
}
//@ chunk-e6aww6q8.js:3251446-3251567 placement
/**
 * 把新诊断格式化为 <new-diagnostics> 附件文本。
 */
function formatNewDiagnosticsAttachment(files) {
  return `<new-diagnostics>The following new diagnostic issues were detected:

${formatDiagnosticsSummary(files)}</new-diagnostics>`;
}
//@ chunk-e6aww6q8.js:3251567-3251732 placement
/**
 * 按诊断严重程度返回图标（错误、警告、信息、提示）。
 */
function getSeverityIcon(severity) {
  let iconsBySeverity = {
    Error: figures_default.cross,
    Warning: figures_default.warning,
    Info: figures_default.info,
    Hint: figures_default.star,
  };
  if (typeof severity !== "string") return figures_default.bullet;
  return Object.hasOwn(iconsBySeverity, severity) ? iconsBySeverity[severity] : figures_default.bullet;
}
//@ chunk-e6aww6q8.js:3251770-3252265 placement
/**
 * 用新文本替换消息内容中的文本：新文本为空时只保留非文本块；字符串内容直接替换；数组内容替换最后一个文本块，若新文本以前面文本块开头则去掉重复前缀并保留它们。
 */
function replacePromptText(prompt, newText) {
  if (newText.trim() === "") {
    let nonTextParts = typeof prompt === "string" ? [] : prompt.filter((part) => part.type !== "text");
    return nonTextParts.length > 0 ? nonTextParts : NO_CONTENT_MESSAGE;
  }
  if (typeof prompt === "string") return newText;
  let last = prompt.findLast((part) => part.type === "text");
  if (last?.type !== "text")
    return [
      ...prompt,
      {
        type: "text",
        text: newText,
      },
    ];
  let joined = prompt.flatMap((part) => (part.type === "text" && part !== last ? [part.text] : [])).join(`
`);
  let hasPrefix =
    joined !== "" &&
    newText.startsWith(`${joined}
`) &&
    newText.slice(joined.length + 1).trim() !== "";
  let parts = [];
  for (let part of prompt)
    if (part === last)
      parts.push({
        ...part,
        text: hasPrefix ? newText.slice(joined.length + 1) : newText,
      });
    else if (part.type !== "text" || hasPrefix) parts.push(part);
  return parts;
}
export { sanitizeDiagnosticsAttachment, formatNewDiagnosticsAttachment, replacePromptText, getSeverityIcon };
