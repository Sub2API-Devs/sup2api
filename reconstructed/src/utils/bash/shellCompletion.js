/**
 * utils/bash/shellCompletion.ts
 *
 * 输入框 shell 补全：按前缀类型生成 bash compgen / zsh 补全命令并执行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/shellCompletion.ts
 * pieces: chunk-18hwfzwa.js (8), chunk-wj577vf9.js (1)
 * attribution: callgraph-witnessed 1, layout 1, fingerprint 7
 */
import { exec } from "../Shell.js";
import { getShellType } from "../localInstaller.js";
import { logForDebugging } from "../debug.js";
import { findLastContentTokenIndex, findTokenSplitOffset } from "../../components/Markdown.js";
import { isBlankToken_2 } from "../markdownHeadings.js";
import { Y } from "../doctorContextWarnings.js";
import { countCharInString } from "../stringUtils.js";

//@ chunk-18hwfzwa.js:548341-548361 callgraph-witnessed = MAX_SHELL_COMPLETIONS (0)
var MAX_SHELL_COMPLETIONS = 15,
  SHELL_COMPLETION_TIMEOUT_MS = 1000;
//@ chunk-18hwfzwa.js:548361-548419 layout = singleQuoteForEval (1)
function singleQuoteFirstArg(s) {
  return "'" + s[0].replaceAll("'", `'"'"'`) + "'";
}
//@ chunk-18hwfzwa.js:548419-548559 fingerprint = getCompletionTypeFromPrefix (1)
function getCompletionTypeFromPrefix(prefix) {
  if (prefix.startsWith("$")) return "variable";
  if (prefix.includes("/") || prefix.startsWith("~") || prefix.startsWith(".")) return "file";
  return "command";
}
/**
 * 从光标前文本取补全前缀与类型：$name→variable；含 / ~ . 的词→file；首词→command，其余→file。
 */
//@ chunk-18hwfzwa.js:548559-548842 fingerprint = parseInputContext (0.892)
function parseInputContext(input, cursorOffset) {
  let beforeCursor = input.slice(0, cursorOffset),
    varMatch = beforeCursor.match(/\$[a-zA-Z_][a-zA-Z0-9_]*$/);
  if (varMatch) return { prefix: varMatch[0], completionType: "variable" };
  let tokens = beforeCursor.split(/\s+/),
    ke = tokens.at(-1) || "",
    Re = tokens.length === 1 && !beforeCursor.includes(" "),
    lastToken = getCompletionTypeFromPrefix(ke);
  return { prefix: ke, completionType: lastToken !== "command" ? lastToken : Re ? "command" : "file" };
}
//@ chunk-18hwfzwa.js:548842-549134 fingerprint = getBashCompletionCommand (1)
function getBashCompletionCommand(prefix, completionType) {
  if (completionType === "variable") {
    let varName = prefix.slice(1);
    return `compgen -v ${singleQuoteFirstArg([varName])} 2>/dev/null`;
  } else if (completionType === "file")
    return `compgen -f ${singleQuoteFirstArg([prefix])} 2>/dev/null | head -${MAX_SHELL_COMPLETIONS} | while IFS= read -r f; do [ -d "$f" ] && echo "$f/" || echo "$f "; done`;
  else return `compgen -c ${singleQuoteFirstArg([prefix])} 2>/dev/null`;
}
//@ chunk-18hwfzwa.js:549134-549438 fingerprint = getZshCompletionCommand (1)
function getZshCompletionCommand(prefix, completionType) {
  if (completionType === "variable") {
    let varName = prefix.slice(1);
    return `print -rl -- \${(k)parameters[(I)${singleQuoteFirstArg([varName])}*]} 2>/dev/null`;
  } else if (completionType === "file")
    return `for f in ${singleQuoteFirstArg([prefix])}*(N[1,${MAX_SHELL_COMPLETIONS}]); do [[ -d "$f" ]] && echo "$f/" || echo "$f "; done`;
  else return `print -rl -- \${(k)commands[(I)${singleQuoteFirstArg([prefix])}*]} 2>/dev/null`;
}
/**
 * 按 shell 类型生成补全命令并通过 Shell.exec 运行，截取前 15 行转换成补全项。
 */
//@ chunk-18hwfzwa.js:549438-549795 fingerprint = getCompletionsForShell (0.862)
async function getCompletionsForShell(h, x, D, L, ee, ke) {
  let command;
  if (x === "bash") command = getBashCompletionCommand(D, L);
  else if (x === "zsh") command = getZshCompletionCommand(D, L);
  else return [];
  return (
    await (
      await exec(command, ee, "bash", {
        host: h,
        timeout: SHELL_COMPLETION_TIMEOUT_MS,
        sessionEnvVars: ke,
        useToolMemoryCgroup: !1,
      })
    ).result
  ).stdout
    .split(
      `
`,
    )
    .filter((line) => line.trim())
    .slice(0, MAX_SHELL_COMPLETIONS)
    .map((text) => ({ id: text, displayText: text, description: void 0, metadata: { completionType: L } }));
}
/**
 * Prompt 输入框的 shell 补全：仅 bash/zsh；从光标前文本判断前缀与类型（变量/文件/命令），执行 compgen 或 zsh 参数展开命令（超时 1000ms，最多 15 条），返回补全项。
 */
//@ chunk-18hwfzwa.js:549795-550092 fingerprint = getShellCompletions (1)
async function getShellCompletions(h, x, D, L, ee) {
  let shellType = getShellType();
  if (shellType !== "bash" && shellType !== "zsh") return [];
  try {
    let { prefix: prefix, completionType: completionType } = parseInputContext(x, D);
    if (!prefix) return [];
    return (await getCompletionsForShell(h, shellType, prefix, completionType, L, ee)).map((suggestion) => ({
      ...suggestion,
      metadata: { ...suggestion.metadata, inputSnapshot: x },
    }));
  } catch (error) {
    return (logForDebugging(`Shell completion failed: ${error}`), []);
  }
}
/**
 * 在 token 序列中从末尾向前，在换行数预算内找可用的起始位置（不早于最后一个空白 token 之后），返回满足条件的下标。旧版名 findLastStringToken 存疑，与 shell 补全无直接关系。
 */
//@ chunk-wj577vf9.js:5608-5806 fingerprint = findLastStringToken (0.53)
function findLastStringToken(e, t) {
  let n = findLastContentTokenIndex(e),
    r = e.findLastIndex((l, a) => a < n && isBlankToken_2(l)) + 1,
    o = n,
    s = 0;
  for (let l = e.length - 1; l >= r && s <= Y; l--)
    ((s += countCharInString(
      e[l]?.raw ?? "",
      `
`,
    )),
      (o = s <= Y ? Math.min(o, l) : o));
  return [r, o].find((l) => findTokenSplitOffset(e, l, t) > 0) ?? 0;
}

export { getShellCompletions, findLastStringToken };
