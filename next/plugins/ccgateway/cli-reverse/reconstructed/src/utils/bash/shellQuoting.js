/**
 * utils/bash/shellQuoting.ts
 *
 * 命令引号包装：判断 heredoc/多行字符串、单引号包装并追加 < /dev/null、改写 Windows NUL 重定向。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/shellQuoting.ts
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: file-local 3, fingerprint 2, file-last-pair 1, layout 1
 */
import { shellQuoteArgs } from "./bashPipeCommand.js";

//@ chunk-5xgkngpb.js:3149249-3149418 file-local
/**
 * 粗判命令是否含 heredoc（排除位移运算与算术中的 <<）。
 */
function containsHeredoc(command) {
  if (
    /\d\s*<<\s*\d/.test(command) ||
    /\[\[\s*\d+\s*<<\s*\d+\s*\]\]/.test(command) ||
    /\$\(\(.*<<.*\)\)/.test(command)
  )
    return false;
  return /<<-?\s*(?:(['"]?)(\w+)\1|\\(\w+))/.test(command);
}
//@ chunk-5xgkngpb.js:3149418-3149544 file-local
function containsMultilineString(command) {
  let singleQuoteMultiline = /'(?:[^'\\]|\\.)*\n(?:[^'\\]|\\.)*'/;
  let doubleQuoteMultiline = /"(?:[^"\\]|\\.)*\n(?:[^"\\]|\\.)*"/;
  return singleQuoteMultiline.test(command) || doubleQuoteMultiline.test(command);
}
//@ chunk-5xgkngpb.js:3149544-3149716 fingerprint (2.1.88 match: quoteShellCommand, 0.841)
/**
 * 把命令包装成可交给 eval 的单引号字符串；含 heredoc 或多行字符串时整体单引号，非 heredoc 时追加 < /dev/null。
 */
function quoteShellCommand(command, addStdinRedirect = true) {
  if (containsHeredoc(command) || containsMultilineString(command)) {
    let quoted = `'${command.replaceAll("'", `'"'"'`)}'`;
    if (containsHeredoc(command)) return quoted;
    return addStdinRedirect ? `${quoted} < /dev/null` : quoted;
  }
  let quoted = shellQuoteArgs([command]);
  return addStdinRedirect ? `${quoted} < /dev/null` : quoted;
}
//@ chunk-5xgkngpb.js:3149716-3149777 file-local
function hasStdinRedirect(command) {
  return /(?:^|[\s;&|])<(?![<(])\s*\S+/.test(command);
}
//@ chunk-5xgkngpb.js:3149777-3149840 file-last-pair
/**
 * 是否应追加 < /dev/null：命令含 heredoc 或已有输入重定向时不追加。
 */
function shouldAddStdinRedirect(command) {
  if (containsHeredoc(command)) return false;
  if (hasStdinRedirect(command)) return false;
  return true;
}
//@ chunk-5xgkngpb.js:3149840-3149896 layout
var WINDOWS_NUL_REDIRECT_RE = /(\d?&?>+[ \t]*)[Nn][Uu][Ll](?=\s|$|[|&;)\n])/g;
//@ chunk-5xgkngpb.js:3149896-3150010 fingerprint (2.1.88 match: rewriteWindowsNullRedirect, 1)
/**
 * 把 Windows 风格的 >NUL / 2>nul 改写为 /dev/null（命令含 < $ 反引号时不改）。
 */
function rewriteWindowsNullRedirect(command) {
  if (command.includes("<") || command.includes("$") || command.includes("`")) return command;
  return command.replace(WINDOWS_NUL_REDIRECT_RE, "$1/dev/null");
}
export { rewriteWindowsNullRedirect, shouldAddStdinRedirect, quoteShellCommand };
