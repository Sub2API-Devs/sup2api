/**
 * utils/shell/gitGrepShim.ts
 *
 * 2.1.316 新增：git grep 垫片
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { GIT_OPTIONS_WITH_VALUE, stripShellPrefixWords } from "../attributionFileClasses.js";
import { getPlatform } from "../platform.js";
import { parseForSecurity, checkSemantics } from "../bash/ast.js";
import { wrapEvalOrTrue } from "../sandbox/userTempRoot.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3050574-3051086 placement
/**
 * git grep 垫片脚本：拦截 shell 中的 git 调用。
 */
var GIT_GREP_SHIM_SCRIPT; // deferred: uses NICE_ADJUSTMENT_ARG_RE (../attributionFileClasses.js) of its import cycle while loading; runs once the cycle is complete
var joined;
deferInit("chunk-e6aww6q8.js:3050574", () => {
  GIT_GREP_SHIM_SCRIPT = [
    "function git { 'local' _cc_skip= _cc_word;",
    'for _cc_word in ${1+"$@"}; do',
    'if [ -n "$_cc_skip" ]; then _cc_skip=; continue; fi;',
    'case "$_cc_word" in',
    `${[...GIT_OPTIONS_WITH_VALUE].join("|")}) _cc_skip=1 ;;`,
    "-*) ;;",
    `grep) '/usr/bin/env' LC_ALL=C 'git' \${1+"$@"}; 'return' ;;`,
    "*) break ;;",
    "esac; done;",
    `'command' 'git' \${1+"$@"}; }`,
  ].join(" ");
  joined = [
    "if ! 'typeset' -f 'git' >/dev/null 2>&1 && ! 'alias' 'git' >/dev/null 2>&1 &&",
    `( 'eval' ${shellQuote(GIT_GREP_SHIM_SCRIPT)} ) >/dev/null 2>&1;`,
    `then 'eval' ${shellQuote(GIT_GREP_SHIM_SCRIPT)}; fi`,
  ].join(" ");
});
//@ chunk-e6aww6q8.js:3051086-3051739 placement
/**
 * 在 macOS 上对简单的 git grep 命令（无环境变量赋值、无特殊选项）生成包装命令串，供 Bash 提供者替换执行；不符合条件返回 null。
 */
async function buildGitGrepShim(command) {
  if (
    getPlatform() !== "macos" ||
    !command.includes("git") ||
    !command.includes("grep") ||
    command.length > 1000 ||
    /[\u0080-\uFFFF]/.test(command)
  )
    return null;
  let parsed = await parseForSecurity(command).catch(() => {
    return;
  });
  if (
    parsed?.kind !== "simple" ||
    !checkSemantics(parsed.commands, {
      hasLoop: parsed.hasLoop,
    }).ok ||
    parsed.bareAssignmentNames.length > 0 ||
    parsed.commands.some(({ envVars }) => envVars.length > 0)
  )
    return null;
  let flattened = parsed.commands.flatMap(({ argv }) => {
    let gitIndex = stripShellPrefixWords(argv, true, (word) => word === "git");
    if (gitIndex === undefined || gitIndex === -1) return [];
    let subIndex = gitIndex + 1;
    while (argv[subIndex]?.startsWith("-") === true)
      subIndex += GIT_OPTIONS_WITH_VALUE.has(argv[subIndex]) ? 2 : 1;
    return argv[subIndex] === "grep" ? [argv.slice(subIndex + 1)] : [];
  });
  if (
    flattened.length === 0 ||
    flattened.flat().some((arg) => /^(?:--p|--op|--textc|-[A-Za-z0-9]*[OPf])/.test(arg))
  )
    return null;
  return `{ ${wrapEvalOrTrue(joined)}; }`;
}
//@ chunk-e6aww6q8.js:3051739-3051794 placement (2.1.88 match: shellQuote, 1)
function shellQuote(s) {
  return `'${s.replaceAll("'", "'\\''")}'`;
}
export { buildGitGrepShim };
