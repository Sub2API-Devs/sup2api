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
import { weakSet_5, aRn, rRn } from "./fileAttachments.js";
import { logForDebugging } from "../debug.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";

//@ chunk-e6aww6q8.js:3249673-3249758 placement
var cRn = { error: "Error", warning: "Warning", info: "Info", information: "Info", hint: "Hint" };
//@ chunk-e6aww6q8.js:3249758-3249868 placement
function normalizeDiagnosticSeverity(e) {
  if (typeof e !== "string") return;
  let lower = e.toLowerCase();
  return Object.hasOwn(cRn, lower) ? cRn[lower] : void 0;
}
/**
 * 清理重放附件中的诊断文件载荷（格式不对时丢弃）。
 */
//@ chunk-e6aww6q8.js:3249868-3251084 placement
function sanitizeDiagnosticsAttachment(e) {
  if (!Array.isArray(e)) {
    let h = e === void 0 ? "missing" : "non-array",
      y = typeof e === "object" && e !== null;
    if (!(y ? weakSet_5.has(e) : aRn().has(h))) {
      if (y) weakSet_5.add(e);
      else aRn().add(h);
      logForDebugging(`Dropped a ${h} diagnostics files payload from a replayed attachment`);
    }
    return [];
  }
  let n = [],
    r = 0,
    s = 0;
  for (let h of e) {
    if (typeof h !== "object" || h === null || typeof h.uri !== "string" || !Array.isArray(h.diagnostics)) {
      r++;
      continue;
    }
    let { uri: uri, diagnostics: diagnostics } = h,
      flattened = diagnostics.flatMap((L) => {
        if (typeof L !== "object" || L === null) return [];
        let G = L,
          message = G.message,
          Z = G.range?.start;
        if (typeof message !== "string" || typeof Z?.line !== "number" || typeof Z?.character !== "number")
          return [];
        let Se = normalizeDiagnosticSeverity(G.severity),
          ke = G.range?.end;
        return [
          {
            message: message,
            ...(Se !== void 0 && { severity: Se }),
            range: {
              start: { line: Z.line, character: Z.character },
              end:
                typeof ke?.line === "number" && typeof ke?.character === "number"
                  ? { line: ke.line, character: ke.character }
                  : { line: Z.line, character: Z.character },
            },
            ...(typeof G.code === "string" && { code: G.code }),
            ...(typeof G.source === "string" && { source: G.source }),
          },
        ];
      });
    if (((s += diagnostics.length - flattened.length), flattened.length === 0)) {
      r++;
      continue;
    }
    n.push({ uri: uri, diagnostics: flattened });
  }
  if ((r > 0 || s > 0) && !weakSet_5.has(e))
    (weakSet_5.add(e),
      logForDebugging(
        `Dropped ${r} malformed file(s) and ${s} malformed diagnostic(s) from a replayed diagnostics attachment`,
      ));
  return n;
}
/**
 * 把各文件的诊断格式化为"文件名: 图标 [Line x:y] 消息 [code] (source)"文本，超出长度上限时截断并加 …[truncated]。
 */
//@ chunk-e6aww6q8.js:3251084-3251446 placement
function formatDiagnosticsSummary(e) {
  let joined = e.map((s) => {
    let h = s.uri.split("/").pop() || s.uri,
      joined = s.diagnostics.map(
        (diagnostic) =>
          `  ${getSeverityIcon(diagnostic.severity)} [Line ${diagnostic.range.start.line + 1}:${diagnostic.range.start.character + 1}] ${diagnostic.message}${diagnostic.code ? ` [${diagnostic.code}]` : ""}${diagnostic.source ? ` (${diagnostic.source})` : ""}`,
      ).join(`
`);
    return `${h}:
${joined}`;
  }).join(`

`);
  if (joined.length > rRn) return joined.slice(0, rRn - 12) + "\u2026[truncated]";
  return joined;
}
/**
 * 把新诊断格式化为 <new-diagnostics> 附件文本。
 */
//@ chunk-e6aww6q8.js:3251446-3251567 placement
function formatNewDiagnosticsAttachment(e) {
  return `<new-diagnostics>The following new diagnostic issues were detected:

${formatDiagnosticsSummary(e)}</new-diagnostics>`;
}
/**
 * 按诊断严重程度返回图标（错误、警告、信息、提示）。
 */
//@ chunk-e6aww6q8.js:3251567-3251732 placement
function getSeverityIcon(e) {
  let n = { Error: re.cross, Warning: re.warning, Info: re.info, Hint: re.star };
  if (typeof e !== "string") return re.bullet;
  return Object.hasOwn(n, e) ? n[e] : re.bullet;
}
/**
 * 用新文本替换消息内容中的文本：新文本为空时只保留非文本块；字符串内容直接替换；数组内容替换最后一个文本块，若新文本以前面文本块开头则去掉重复前缀并保留它们。
 */
//@ chunk-e6aww6q8.js:3251770-3252265 placement
function replacePromptText(e, n) {
  if (n.trim() === "") {
    let S = typeof e === "string" ? [] : e.filter((w) => w.type !== "text");
    return S.length > 0 ? S : NO_CONTENT_MESSAGE;
  }
  if (typeof e === "string") return n;
  let last = e.findLast((S) => S.type === "text");
  if (last?.type !== "text") return [...e, { type: "text", text: n }];
  let joined = e.flatMap((S) => (S.type === "text" && S !== last ? [S.text] : [])).join(`
`),
    h =
      joined !== "" &&
      n.startsWith(`${joined}
`) &&
      n.slice(joined.length + 1).trim() !== "",
    y = [];
  for (let S of e)
    if (S === last) y.push({ ...S, text: h ? n.slice(joined.length + 1) : n });
    else if (S.type !== "text" || h) y.push(S);
  return y;
}

export { sanitizeDiagnosticsAttachment, formatNewDiagnosticsAttachment, replacePromptText, getSeverityIcon };
