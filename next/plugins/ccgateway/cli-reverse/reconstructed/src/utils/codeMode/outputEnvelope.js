/**
 * utils/codeMode/outputEnvelope.ts
 *
 * 解析 <repl-output> 信封里的 log/result/error 段并反转义（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t9gysttn.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { codeModeAccepted } from "./accepted.js";

//@ chunk-t9gysttn.js:227-263 placement
/**
 * 解析脚本输出信封，非 Code 模式时返回 null。
 */
function parseReplOutput(text) {
  return codeModeAccepted() ? parseReplOutputText(text) : null;
}
//@ chunk-t9gysttn.js:263-605 placement
/**
 * 解析 <repl-output> 里的 log/result/error 段并反转义实体。
 */
function parseReplOutputText(text) {
  let match = /^<repl-output(?: [^>\n]*)?>\n/.exec(text);
  if (match === null) return null;
  let parsed = {
    logs: [],
  };
  let tagPattern = /<(log|result|error)\/>|<(log|result|error)>([\s\S]*?)<\/\2>/g;
  for (let tagMatch of text.slice(match[0].length).matchAll(tagPattern)) {
    let tag = tagMatch[1] ?? tagMatch[2];
    let text = escapeXml(tagMatch[3] ?? "");
    if (tag === "log") parsed.logs.push(text);
    else if (tag === "result") parsed.result = text;
    else if (tag === "error") parsed.error = text;
  }
  return parsed;
}
//@ chunk-t9gysttn.js:605-698 placement (2.1.88 match: escapeXml, 1)
function escapeXml(s) {
  return s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}
export { parseReplOutput };
