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
    let h = files === undefined ? "missing" : "non-array";
    let y = typeof files === "object" && files !== null;
    if (!(y ? weakSet_5.has(files) : loggedAttachmentPaths().has(h))) {
      if (y) weakSet_5.add(files);
      else loggedAttachmentPaths().add(h);
      logForDebugging(`Dropped a ${h} diagnostics files payload from a replayed attachment`);
    }
    return [];
  }
  let n = [];
  let r = 0;
  let s = 0;
  for (let h of files) {
    if (typeof h !== "object" || h === null || typeof h.uri !== "string" || !Array.isArray(h.diagnostics)) {
      r++;
      continue;
    }
    let { uri, diagnostics } = h;
    let flattened = diagnostics.flatMap((L) => {
      if (typeof L !== "object" || L === null) return [];
      let G = L;
      let message = G.message;
      let start = G.range?.start;
      if (
        typeof message !== "string" ||
        typeof start?.line !== "number" ||
        typeof start?.character !== "number"
      )
        return [];
      let Se = normalizeDiagnosticSeverity(G.severity);
      let end = G.range?.end;
      return [
        {
          message,
          ...(Se !== undefined && {
            severity: Se,
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
          ...(typeof G.code === "string" && {
            code: G.code,
          }),
          ...(typeof G.source === "string" && {
            source: G.source,
          }),
        },
      ];
    });
    s += diagnostics.length - flattened.length;
    if (flattened.length === 0) {
      r++;
      continue;
    }
    n.push({
      uri,
      diagnostics: flattened,
    });
  }
  if ((r > 0 || s > 0) && !weakSet_5.has(files)) {
    weakSet_5.add(files);
    logForDebugging(
      `Dropped ${r} malformed file(s) and ${s} malformed diagnostic(s) from a replayed diagnostics attachment`,
    );
  }
  return n;
}
//@ chunk-e6aww6q8.js:3251084-3251446 placement
/**
 * 把各文件的诊断格式化为"文件名: 图标 [Line x:y] 消息 [code] (source)"文本，超出长度上限时截断并加 …[truncated]。
 */
function formatDiagnosticsSummary(e) {
  let joined = e.map((s) => {
    let h = s.uri.split("/").pop() || s.uri;
    let joined = s.diagnostics.map(
      (S) =>
        `  ${getSeverityIcon(S.severity)} [Line ${S.range.start.line + 1}:${S.range.start.character + 1}] ${S.message}${S.code ? ` [${S.code}]` : ""}${S.source ? ` (${S.source})` : ""}`,
    ).join(`
`);
    return `${h}:
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
function formatNewDiagnosticsAttachment(e) {
  return `<new-diagnostics>The following new diagnostic issues were detected:

${formatDiagnosticsSummary(e)}</new-diagnostics>`;
}
//@ chunk-e6aww6q8.js:3251567-3251732 placement
/**
 * 按诊断严重程度返回图标（错误、警告、信息、提示）。
 */
function getSeverityIcon(severity) {
  let n = {
    Error: figures_default.cross,
    Warning: figures_default.warning,
    Info: figures_default.info,
    Hint: figures_default.star,
  };
  if (typeof severity !== "string") return figures_default.bullet;
  return Object.hasOwn(n, severity) ? n[severity] : figures_default.bullet;
}
//@ chunk-e6aww6q8.js:3251770-3252265 placement
/**
 * 用新文本替换消息内容中的文本：新文本为空时只保留非文本块；字符串内容直接替换；数组内容替换最后一个文本块，若新文本以前面文本块开头则去掉重复前缀并保留它们。
 */
function replacePromptText(e, n) {
  if (n.trim() === "") {
    let S = typeof e === "string" ? [] : e.filter((w) => w.type !== "text");
    return S.length > 0 ? S : NO_CONTENT_MESSAGE;
  }
  if (typeof e === "string") return n;
  let last = e.findLast((S) => S.type === "text");
  if (last?.type !== "text")
    return [
      ...e,
      {
        type: "text",
        text: n,
      },
    ];
  let joined = e.flatMap((S) => (S.type === "text" && S !== last ? [S.text] : [])).join(`
`);
  let h =
    joined !== "" &&
    n.startsWith(`${joined}
`) &&
    n.slice(joined.length + 1).trim() !== "";
  let y = [];
  for (let S of e)
    if (S === last)
      y.push({
        ...S,
        text: h ? n.slice(joined.length + 1) : n,
      });
    else if (S.type !== "text" || h) y.push(S);
  return y;
}
export { sanitizeDiagnosticsAttachment, formatNewDiagnosticsAttachment, replacePromptText, getSeverityIcon };
