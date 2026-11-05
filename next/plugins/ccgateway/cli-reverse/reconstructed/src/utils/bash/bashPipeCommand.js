/**
 * utils/bash/bashPipeCommand.ts
 *
 * 单引号转义工具（多个 chunk 的副本）与 /dev/null 重定向判断。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/bashPipeCommand.ts
 * pieces: chunk-5xgkngpb.js (2), chunk-exqhz3vp.js (1), chunk-y3znj513.js (1)
 * attribution: fingerprint 2, affinity 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-exqhz3vp.js:191-360 placement (2.1.88 match: singleQuoteForEval, 1)
/**
 * 把参数数组按需单引号转义并空格拼接（安全字符集原样保留，空串为 ''）。
 */
function shellQuoteArgs(s) {
  return s
    .map((arg) => {
      let text = String(arg);
      if (text === "") return "''";
      if (/^[A-Za-z0-9_./:=@+,-]+$/.test(text)) return text;
      return "'" + text.replaceAll("'", `'"'"'`) + "'";
    })
    .join(" ");
}
//@ chunk-5xgkngpb.js:3134570-3134615 fingerprint (2.1.88 match: quoteWithEvalStdinRedirect, 1)
/**
 * 单引号包装命令并追加 < /dev/null。
 */
function quoteWithEvalStdinRedirect(command) {
  return singleQuoteForEval(command) + " < /dev/null";
}
//@ chunk-5xgkngpb.js:3134615-3134671 affinity (2.1.88 match: singleQuoteForEval, 1)
function singleQuoteForEval(s) {
  return "'" + s.replaceAll("'", `'"'"'`) + "'";
}
//@ chunk-y3znj513.js:15277-15400 fingerprint (2.1.88 match: buildCommandParts, 0.438)
function buildCommandParts(part) {
  return (
    part.targetSourceLiteral === true &&
    ((part.op === ">" && part.target === "/dev/null") || (part.op === ">&" && /^\d$/.test(part.target)))
  );
}
export { shellQuoteArgs, quoteWithEvalStdinRedirect, buildCommandParts };
