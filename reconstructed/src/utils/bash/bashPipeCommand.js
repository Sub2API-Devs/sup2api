/**
 * utils/bash/bashPipeCommand.ts
 *
 * 单引号转义工具（多个 chunk 的副本）与 /dev/null 重定向判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/bashPipeCommand.ts
 * pieces: chunk-0stm8h1s.js (1), chunk-e6aww6q8.js (3)
 * attribution: fingerprint 3, affinity 1
 */

/**
 * 重定向是否为字面量 >/dev/null 或 2>/dev/null。
 */
//@ chunk-e6aww6q8.js:1021040-1021153 fingerprint = buildCommandParts (0.408)
function isDevNullStdoutRedirect(redirect) {
  return (
    redirect.op === ">" &&
    (redirect.fd === void 0 || redirect.fd === 2) &&
    redirect.target === "/dev/null" &&
    redirect.targetSourceLiteral === !0
  );
}
/**
 * 单引号包装命令并追加 < /dev/null。
 */
//@ chunk-e6aww6q8.js:3050473-3050518 fingerprint = quoteWithEvalStdinRedirect (1)
function quoteWithEvalStdinRedirect(command) {
  return singleQuoteForEval(command) + " < /dev/null";
}
//@ chunk-e6aww6q8.js:3050518-3050574 affinity = singleQuoteForEval (1)
function singleQuoteForEval(s) {
  return "'" + s.replaceAll("'", `'"'"'`) + "'";
}
/**
 * 把参数数组按需单引号转义并空格拼接（安全字符集原样保留，空串为 ''）。
 */
//@ chunk-0stm8h1s.js:191-360 fingerprint = singleQuoteForEval (1)
function shellQuoteArgs(s) {
  return s
    .map((t) => {
      let n = String(t);
      if (n === "") return "''";
      if (/^[A-Za-z0-9_./:=@+,-]+$/.test(n)) return n;
      return "'" + n.replaceAll("'", `'"'"'`) + "'";
    })
    .join(" ");
}

export { shellQuoteArgs, quoteWithEvalStdinRedirect, isDevNullStdoutRedirect };
