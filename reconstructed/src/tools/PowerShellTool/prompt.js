/**
 * tools/PowerShellTool/prompt.ts
 *
 * PowerShell 工具提示词：按版本（5.1/7+）的语法说明、已验证构建工具、Unix 命令对照、交互命令禁忌、后台与 sleep 规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/prompt.ts
 * pieces: chunk-mx04m55e.js (8)
 * attribution: placement 3, layout 3, fingerprint 2
 */
import { getDefaultBashTimeoutMs, getMaxBashTimeoutMs } from "../../utils/timeouts.js";
import { uf, T_ } from "../AgentTool/backgroundGates.js";
import { oie, NO_FINISH_NOTIFICATION_NOTICE } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { getBackgroundTimeoutPromptNote } from "../BashTool/prompt.js";
import { getPowerShellEditionAsync } from "../../utils/shell/powershellDetection.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { qMi } from "../../utils/env.js";
import { getPlatform } from "../../utils/platform.js";
import { getMaxOutputLength } from "../../utils/shell/outputLimits.js";
import { GLOB_TOOL_NAME } from "../GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../GrepTool/prompt.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";

//@ chunk-mx04m55e.js:613-641 placement
function w0r() {
  return getDefaultBashTimeoutMs();
}
//@ chunk-mx04m55e.js:641-669 placement
function hln() {
  return getMaxBashTimeoutMs();
}
//@ chunk-mx04m55e.js:669-1465 layout
function getBackgroundUsageNote() {
  if (uf()) return null;
  if (!oie())
    return `  - You can use the \`run_in_background\` parameter to run the command in the background. Only use this if you don't need the result immediately. ${NO_FINISH_NOTIFICATION_NOTICE}`;
  return `  - You can use the \`run_in_background\` parameter to run the command in the background. ${T_() ? "Only use this if you don't need the result immediately; you'll be notified if it finishes while you are still working. After your reply you may not be told when it ends, and a few minutes later it is likely stopped, so if you need its result, wait for it before you reply." : "Only use this if you don't need the result immediately and are OK being notified when the command completes later. You do not need to check the output right away - you'll be notified when it finishes."}${getBackgroundTimeoutPromptNote()}`;
}
//@ chunk-mx04m55e.js:1465-2348 layout
function getSleepGuidance() {
  if (uf()) return null;
  let e = oie(),
    t = T_();
  return `  - Avoid unnecessary \`Start-Sleep\` commands:
    - Do not sleep between commands that can run immediately \u2014 just run them.${e && !t ? "\n    - If your command is long running and you would like to be notified when it finishes \u2014 simply run your command using `run_in_background`. There is no need to sleep in this case." : ""}
    - Do not retry failing commands in a sleep loop \u2014 diagnose the root cause or consider an alternative approach.${
      e
        ? `
    - If waiting for a background task you started with \`run_in_background\`, you will be notified ${t ? "if it completes while you are still working" : "when it completes"} \u2014 do not poll.`
        : ""
    }
    - If you must poll an external process, use a check command rather than sleeping first.
    - If you must sleep, keep the duration short to avoid blocking the user.`;
}
/**
 * 按 PowerShell 版本（desktop 5.1 / core 7+ / unknown）生成语法注意事项：&&/||、三元、?? 等是否可用。
 */
//@ chunk-mx04m55e.js:2348-4157 fingerprint = getEditionSection (1)
function getEditionSection(edition) {
  if (edition === "desktop")
    return "PowerShell edition: Windows PowerShell 5.1 (powershell.exe)\n   - Pipeline chain operators `&&` and `||` are NOT available \u2014 they cause a parser error. To run B only if A succeeds: `A; if ($?) { B }`. To chain unconditionally: `A; B`.\n   - Ternary (`?:`), null-coalescing (`??`), and null-conditional (`?.`) operators are NOT available. Use `if/else` and explicit `$null -eq` checks instead.\n   - Avoid `2>&1` on native executables. In 5.1, redirecting a native command's stderr inside PowerShell wraps each line in an ErrorRecord (NativeCommandError) and sets `$?` to `$false` even when the exe returned exit code 0. stderr is already captured for you \u2014 don't redirect it.\n   - `>`, `>>`, and `Out-File` usually default to UTF-8 (with BOM) in this environment, but `Set-Content`/`Add-Content` still default to the system ANSI codepage \u2014 when writing a file other tools will read, pass `-Encoding utf8` explicitly to `Out-File`/`Set-Content`.\n   - `ConvertFrom-Json` returns a PSCustomObject, not a hashtable. `-AsHashtable` is not available.";
  if (edition === "core")
    return "PowerShell edition: PowerShell 7+ (pwsh)\n   - Pipeline chain operators `&&` and `||` ARE available and work like bash. Prefer `cmd1 && cmd2` over `cmd1; cmd2` when cmd2 should only run if cmd1 succeeds.\n   - Ternary (`$cond ? $a : $b`), null-coalescing (`??`), and null-conditional (`?.`) operators are available.\n   - Default file encoding is UTF-8 without BOM.";
  return "PowerShell edition: unknown \u2014 assume Windows PowerShell 5.1 for compatibility\n   - Do NOT use `&&`, `||`, ternary `?:`, null-coalescing `??`, or null-conditional `?.`. These are PowerShell 7+ only and parser-error on 5.1.\n   - To chain commands conditionally: `A; if ($?) { B }`. Unconditionally: `A; B`.";
}
/**
 * 取 PowerShell 版本与（开关 tengu_brass_sled 打开时）已验证的构建工具列表，生成 PowerShell 工具提示词。
 */
//@ chunk-mx04m55e.js:4157-4322 layout
async function getPowerShellPrompt() {
  let e = await getPowerShellEditionAsync(),
    t = getFeatureValue_CACHED_MAY_BE_STALE("tengu_brass_sled", !1) ? await qMi() : [];
  return getPrompt({
    edition: e,
    buildTools: t,
    onWindows: getPlatform() === "windows",
    backgroundRuns: !uf(),
  });
}
/**
 * PowerShell 工具提示词：版本节、已验证构建工具、目录验证、语法说明、Unix 命令对照、退出码注意、交互命令禁忌、here-string 用法、超时/输出截断、专用工具优先、并行/顺序、git 规则、sleep 规则。
 */
//@ chunk-mx04m55e.js:4322-12435 fingerprint = getPrompt (0.812)
function getPrompt(e) {
  let { edition: edition, buildTools: buildTools } = e,
    n = e.backgroundRuns ? getBackgroundUsageNote() : null,
    i = e.backgroundRuns ? getSleepGuidance() : null,
    r = e.onWindows
      ? "\n   - Exception: the MSVC toolchain (`cl`, `nmake`, `msbuild`) is only on PATH inside a Visual Studio developer shell, so it may be installed even if not listed. Environment changes do NOT persist between commands, so initialize and build in ONE command: `cmd /c '\"C:\\Program Files\\Microsoft Visual Studio\\<year>\\<edition>\\VC\\Auxiliary\\Build\\vcvarsall.bat\" x64 && <build command>'`"
      : "",
    a = buildTools.length
      ? `
Developer tools verified on this machine's PATH: ${buildTools.join(", ")}
   - Prefer these. A build/dev tool NOT in this list is likely not installed \u2014 do not assume \`make\`, \`gcc\`, or a package manager is available unless listed. Check with \`if (Get-Command <name> -ErrorAction SilentlyContinue) { ... }\` before relying on an unlisted tool, and prefer a listed equivalent.${r}
`
      : "",
    d = `
  - For git commands:
    - Prefer to create a new commit rather than amending an existing commit.
    - Before running destructive operations (e.g., git reset --hard, git push --force, git checkout --), consider whether there is a safer alternative that achieves the same goal. Only use destructive operations when they are truly the best approach.
    - Never skip hooks (--no-verify) or bypass signing (--no-gpg-sign, -c commit.gpgsign=false) unless the user has explicitly asked for it. If a hook fails, investigate and fix the underlying issue.`;
  return `Executes a given PowerShell command with optional timeout. Working directory persists between commands; shell state (variables, functions) does not.

IMPORTANT: This tool is for terminal operations via PowerShell: git, npm, docker, and PS cmdlets. DO NOT use it for file operations (reading, writing, editing, searching, finding files) - use the specialized tools for this instead.

${getEditionSection(edition)}
${a}
Before executing the command, please follow these steps:

1. Directory Verification:
   - If the command will create new directories or files, first use \`Get-ChildItem\` (or \`ls\`) to verify the parent directory exists and is the correct location

2. Command Execution:
   - Always quote file paths that contain spaces with double quotes
   - Capture the output of the command.

PowerShell Syntax Notes:
   - Variables use $ prefix: $myVar = "value"
   - Escape character is backtick (\`), not backslash
   - Use Verb-Noun cmdlet naming: Get-ChildItem, Set-Location, New-Item, Remove-Item
   - Common aliases: ls (Get-ChildItem), cd (Set-Location), cat (Get-Content), rm (Remove-Item)
   - Pipe operator | works similarly to bash but passes objects, not text
   - Use Select-Object, Where-Object, ForEach-Object for filtering and transformation
   - String interpolation: "Hello $name" or "Hello $($obj.Property)"
   - Registry access uses PSDrive prefixes: \`HKLM:\\SOFTWARE\\...\`, \`HKCU:\\...\` \u2014 NOT raw \`HKEY_LOCAL_MACHINE\\...\`
   - Environment variables: read with \`$env:NAME\`, set with \`$env:NAME = "value"\` (NOT \`Set-Variable\` or bash \`export\`)
   - Call native exe with spaces in path via call operator: \`& "C:\\Program Files\\App\\app.exe" arg1 arg2\`

Unix commands that DO NOT exist in PowerShell \u2014 use the equivalent instead:
   - head / tail \u2192 \`Get-Content file -TotalCount N\` / \`-Tail N\`; piped: \`| Select-Object -First N\` / \`-Last N\`
   - which \u2192 \`(Get-Command name).Source\`
   - touch \u2192 \`if (-not (Test-Path path)) { New-Item -ItemType File path }\` (NEVER use \`New-Item -Force\` on a file \u2014 it truncates existing content)
   - wc -l \u2192 \`(Get-Content file | Measure-Object -Line).Lines\`
   - mkdir -p \u2192 \`New-Item -ItemType Directory -Force path\` (\`-p\` is not a PowerShell flag)
   - rm -rf \u2192 \`Remove-Item -Recurse -Force path\`
   - ln -s \u2192 \`New-Item -ItemType SymbolicLink -Path link -Target target\`
   - chmod / chown \u2192 not applicable on Windows; use \`icacls\` only if ACL changes are required
   - 2>/dev/null \u2192 \`2>$null\` (but stderr is captured for you \u2014 usually unnecessary)
   - VAR=x cmd \u2192 \`$env:VAR = 'x'; cmd\` (PowerShell has no inline env-var prefix)
   - Bash control flow (\`if [ -f x ]\`, \`for x in *\`, backtick \`\`cmd\`\` substitution) is a parser error \u2014 use \`if (Test-Path x)\`, \`foreach ($x in ...)\`, \`$(cmd)\`

Exit-code note: \`-ErrorAction SilentlyContinue\` suppresses error OUTPUT but the cmdlet failure still causes this tool to report exit 1. To make a cmdlet failure truly non-fatal, promote it to terminating and swallow it: \`try { Cmdlet ... -ErrorAction Stop } catch {}\` (without \`-ErrorAction Stop\`, non-terminating errors skip the \`catch\` and still exit 1).

Interactive and blocking commands (this tool runs with -NonInteractive and stdin attached to the null device \u2014 console prompts read EOF or error immediately; GUI prompts can still block until timeout):
   - NEVER use \`Read-Host\`, \`Get-Credential\`, \`Out-GridView\`, \`$Host.UI.PromptForChoice\`, or \`pause\`
   - Destructive cmdlets (\`Remove-Item\`, \`Stop-Process\`, \`Clear-Content\`, etc.) may prompt for confirmation. Add \`-Confirm:$false\` when you intend the action to proceed. Use \`-Force\` for read-only/hidden items.
   - Never use \`git rebase -i\`, \`git add -i\`, or other commands that open an interactive editor

Passing multiline strings (commit messages, file content) to native executables:
   - Use a single-quoted here-string so PowerShell does not expand \`$\` or backticks inside. The closing \`'@\` MUST be at column 0 (no leading whitespace) on its own line \u2014 indenting it is a parse error:
<example>
git commit -m @'
Commit message here.
Second line with $literal dollar signs.
'@
</example>
   - Use \`@'...'@\` (single-quoted, literal) not \`@"..."@\` (double-quoted, interpolated) unless you need variable expansion
   - For arguments containing \`-\`, \`@\`, or other characters PowerShell parses as operators, use the stop-parsing token: \`git log --% --format=%H\`

Usage notes:
  - The command argument is required.
  - You can specify an optional timeout in milliseconds (up to ${hln()}ms / ${hln() / 60000} minutes for a foreground command). If not specified, commands will timeout after ${w0r()}ms (${w0r() / 60000} minutes).
  - It is very helpful if you write a clear, concise description of what this command does.
  - If the output exceeds ${getMaxOutputLength()} characters, output will be truncated before being returned to you.
${
  n
    ? n +
      `
`
    : ""
}  - Avoid using PowerShell to run commands that have dedicated tools, unless explicitly instructed:
    - File search: Use ${GLOB_TOOL_NAME} (NOT Get-ChildItem -Recurse)
    - Content search: Use ${GREP_TOOL_NAME} (NOT Select-String)
    - Read files: Use ${FILE_READ_TOOL_NAME} (NOT Get-Content)
    - Edit files: Use ${FILE_EDIT_TOOL_NAME}
    - Write files: Use ${FILE_WRITE_TOOL_NAME} (NOT Set-Content/Out-File)
    - Communication: Output text directly (NOT Write-Output/Write-Host)
  - When issuing multiple commands:
    - If the commands are independent and can run in parallel, make multiple ${POWERSHELL_TOOL_NAME} tool calls in a single message.
    - If the commands depend on each other and must run sequentially, chain them in a single ${POWERSHELL_TOOL_NAME} call (see edition-specific chaining syntax above).
    - Use \`;\` only when you need to run commands sequentially but don't care if earlier commands fail.
    - DO NOT use newlines to separate commands (newlines are ok in quoted strings and here-strings)
  - Do NOT prefix commands with \`cd\` or \`Set-Location\` -- the working directory is already set to the correct project directory automatically.${
    i
      ? `
` + i
      : ""
  }
  - For git commands:
    - Prefer to create a new commit rather than amending an existing commit.
    - Before running destructive operations (e.g., git reset --hard, git push --force, git checkout --), consider whether there is a safer alternative that achieves the same goal. Only use destructive operations when they are truly the best approach.
    - Never skip hooks (--no-verify) or bypass signing (--no-gpg-sign, -c commit.gpgsign=false) unless the user has explicitly asked for it. If a hook fails, investigate and fix the underlying issue.`;
}
//@ chunk-mx04m55e.js:12435-12506 placement
var yOo = ["dangerouslyDisableSandbox"],
  pVn = [...yOo, "run_in_background"];

export { pVn, hln, yOo, getPowerShellPrompt, w0r, getPrompt };
