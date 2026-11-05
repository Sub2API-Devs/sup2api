/**
 * tools/REPLTool/prompt.ts
 *
 * REPL（Code Mode）工具提示词：用法、全局、输出与等待说明，以及 dts 声明块（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAccepted, codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { registerToolDescriptionPrefixProvider } from "../../utils/api.js";
import { toolSchemaCacheKey, buildToolsInterface, listCodeModeOnlyTools } from "./typePrinting.js";
import {
  isCodeModeEnabled,
  willHideCodeModeOnlyTools,
  isAsyncReplEnabled,
  REPL_MAX_TIMEOUT_MS,
} from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { mcpToolsThrow } from "./mcpTools.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { getReplPartCap, replSettleWindowMs, replDetachAfterMs } from "../../utils/codeMode.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isReplTypedEventsOn } from "../../utils/codeMode/typedEvents.js";
import { matchesToolName } from "../../Tool.js";
import { AGENT } from "../AgentTool/constants.js";
import { isReplSpliceWaitEnabled } from "../../utils/codeMode/waitForNews.js";
import { POLL } from "../PollTool/prompt.js";
import { listPromptSkillCommands } from "../BashTool/BashTool.js";
import { getLeanGitInstructions, buildPrSkillPrepSuggestion } from "../BashTool/prompt.js";
import { availablePrSkills } from "../../utils/gitCommitGuidance.js";
import { REPL_TOOL_NAME } from "./constants.js";

//@ chunk-n51jggtb.js:39072-39835 placement
/**
 * 生成 dts 里 tools 全局的声明块与说明。
 */
function toolsDeclarations({ mcpThrows, tools }) {
  return [
    "/** " +
      ("Every tool of this session by name, with its usual input (each is a bare global too); a built-in resolves {error} on failure" +
        (mcpThrows
          ? "; an MCP tool throws (e.message carries the tool error, e.detail the parsed body when it was JSON)."
          : ".") +
        (tools === ""
          ? ""
          : " In a subagent, or a session run as an agent, Tools can list a file or shell tool that agent isn't given; it is missing from tools.list() and calling it throws, so check tools.list() first.")) +
      " */",
    ...(tools === ""
      ? [
          "declare var tools: {[name: string]: (input: Record<string, unknown>) => Promise<unknown>} & {list(): string[]}",
        ]
      : [
          "declare var tools: Tools & {[name: string]: (input: Record<string, unknown>) => Promise<unknown>} & {list(): string[]}",
          ...tools.split(`
`),
        ]),
  ];
}
//@ chunk-n51jggtb.js:39835-40812 placement
/**
 * REPL 的 shell 超时说明原文。
 */
var TIMEOUT_BACKGROUND_NOTE =
  "Timeouts cap at 600000 ms: past that the command keeps running in the background, and running names the task and the file its output streams to, so that file can be read instead of running the command again.";
var SCRIPT_STOP_NOTE =
  "A script is stopped 600000 ms after it starts, counting the time spent waiting on permission prompts, and a command still running then is stopped too and its output is lost. So give a long command a timeout that ends well before that. At its own timeout a command moves to the background and keeps running (one that starts with sleep is stopped instead, and so is every command if background tasks are disabled): the await resolves without throwing, with exitCode null, and running names the task and the file its output streams to, so read that file instead of running the command again.";
var REMOVE_UNSANDBOXED_RETRY_DTS_RE =
  /(?: {4}\/\*\* the sandbox blocked the command, so this is its retry outside the sandbox;[^\n]*\n)? {4}unsandboxedRetry\?: \{\n {8}violation: string;\n {4}\};\n/g;
//@ chunk-n51jggtb.js:40812-40870 placement
/**
 * 把 shell 超时说明替换成 REPL 语境下的版本，并删掉沙箱重试字段。
 */
function applyScriptStopNote(dts) {
  return dts
    .replace(TIMEOUT_BACKGROUND_NOTE, () => SCRIPT_STOP_NOTE)
    .replace(REMOVE_UNSANDBOXED_RETRY_DTS_RE, "");
}
//@ chunk-n51jggtb.js:40870-41573 placement
/**
 * 拼出 REPL 脚本全局的 TypeScript 声明块（按 bash/powershell 与同步/异步通道取对应 prelude）。
 */
async function buildHelperDts(options) {
  let { HELPER_DTS } = await import("../../utils/embeddedResources/HELPER_DTS.lazy.js");
  let shell = options.isBash ? "bash" : "powershell";
  let lane = options.asyncLane ? "async" : "sync";
  let coreDts = HELPER_DTS.core[shell][lane].trimEnd();
  return (
    "```ts\n" +
    [
      options.tools === ""
        ? "// The globals of a REPL script, as TypeScript declarations. The session's tools are not listed here: searchTools finds them."
        : "// The globals of a REPL script, as TypeScript declarations. interface Tools covers the built-in tools a script can call that aren't in your tool list; long doc lines are cut short, and describeTool(name) returns a tool's description and full input schema. searchTools finds the others, such as MCP tools.",
      isAccepted() ? applyScriptStopNote(coreDts) : coreDts,
      ...toolsDeclarations(options),
      ...(options.agent ? [HELPER_DTS.team[lane].trimEnd()] : []),
    ].join(`
`) +
    "\n```"
  );
}
//@ chunk-n51jggtb.js:41573-42172 placement
/**
 * 提示词里的扩展示例：用一次脚本同时搜索定义与调用方再编辑。
 */
var PARALLEL_SCRIPT_EXAMPLE = `One script can look in several places at once and then act on what it found, for example:
\`\`\`js
const [defs, uses] = await Promise.all([
  $\`rg -l "function retryPolicy" src\`.text(),
  $\`rg -lF "retryPolicy(" src test\`.text(),
]);
const target = defs.trim().split('\\n')[0];                 // the file that defines it
if (!target) throw new Error('nothing defines retryPolicy: not editing');
await edit(target, 'maxAttempts: 3', 'maxAttempts: 5');
({edited: target, callers: uses.trim().split('\\n').filter(f => f !== target), test: $\`npm test -- retryPolicy\`.nothrow()})
\`\`\`
`;
//@ chunk-n51jggtb.js:43719-43776 placement
/**
 * 注册提示词指纹计算钩子。
 */
registerToolDescriptionPrefixProvider((tool, { tools, getToolPermissionContext }) =>
  toolSchemaCacheKey(tool, tools, getToolPermissionContext),
);
//@ chunk-n51jggtb.js:47164-55063 placement
/**
 * REPL 工具的主提示词：用法、全局、输出与等待方式、声明块，按 Code Mode / 传统模式分支。
 */
async function buildReplPrompt(tools, permissionContext) {
  if (codeModeAccepted()) {
    let codeModeOn = isCodeModeEnabled();
    let mcpThrows = mcpToolsThrow();
    let bashAvailable = isBashAvailable();
    let shellToolName = bashAvailable ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    let replPartCap = getReplPartCap();
    let serverNames = normalizeCaseForComparison_2(
      tools.flatMap((tool) => (tool.isMcp === true && tool.mcpInfo ? [tool.mcpInfo.serverName] : [])),
    );
    let sliced = serverNames.slice(0, TOOL_DESCRIPTION_MAX_CHARS);
    let serverOverflow = serverNames.length - sliced.length;
    let mcpServerLine =
      codeModeAccepted() && willHideCodeModeOnlyTools(tools) && serverNames.length > 0
        ? `MCP tools: connected servers are ${sliced.join(", ")}${serverOverflow > 0 ? ` and ${serverOverflow} more` : ""}. Find a tool with \`searchTools\`, then call it with the input its match shows.
`
        : "";
    let hidesCodeModeTools = willHideCodeModeOnlyTools(tools);
    let asyncRepl = isAsyncReplEnabled();
    let typedEvents = isReplTypedEventsOn();
    let agent = !isAccepted() && tools.some((tool) => matchesToolName(tool, AGENT));
    let outputHelp =
      codeModeAccepted() && asyncRepl && isReplSpliceWaitEnabled()
        ? replSpliceWaitHelp()
        : codeModeAccepted() && asyncRepl
          ? `
How output arrives: a script that finishes within about ${Math.round(replSettleWindowMs() / 1000)} s comes back as the \`REPL\` call's own result, a \`<repl-output eval="N">\` element holding \`<log>\` lines and the \`<result>\` (or \`<error>\`). One still running by then returns \`(dispatched #N)\` instead, runs on, and no longer holds up the scripts after it: its output arrives as an ${typedEvents ? '`<event kind="repl-eval">` element whose body is one JSON object (`eval` is the script\'s number, with its `log` lines and its `result` or `error`)' : '`<event kind="repl-eval" eval="N">` element with the same children'}, in a \`${POLL}\` result or before your next turn, with an \`<event kind="repl-status">\` ${typedEvents ? "element" : "line"} meanwhile saying what is still pending. A receipt means the script is running, so issuing it again would run it twice. Scripts start in call order.

Waiting: \`${POLL}\` returns as soon as something arrives; while a script or a background task (a context, say) is still running, a wait with nothing to deliver ends just before the prompt cache would expire (about 5 minutes, or about an hour on a 1-hour cache) in a status line saying what is still pending, so you can poll again. Sent in the same turn as a \`REPL\` call it waits for that call's script: a long one (a test suite, a build) then costs no extra round trip, and one that has already come back ends the wait at once. When nothing else needs doing while a long script or a context runs, ending your turn works too: its result or notification starts your next turn when it lands, and waiting that way costs nothing. A shell command with no timeout of its own moves to the background after 10 minutes, so give a long build a longer timeout (up to 2 hours) to await it.
`
          : "\nA call's result is a `<repl-output>` element: `<log>` lines, then the `<result>` (or `<error>`).\n";
    let permissionHelp =
      isAccepted() && asyncRepl
        ? `
The user can change the permission mode at any time. In a mode that asks for permission, every \`REPL\` call instead waits for its script and returns its output. The script is stopped ${REPL_MAX_TIMEOUT_MS} ms after it starts, and that time includes time spent waiting at permission prompts.
`
        : "";
    if (codeModeOn) {
      let introLine =
        codeModeAccepted() && hidesCodeModeTools
          ? `${asyncRepl ? `Your two tools are \`REPL\` and \`${POLL}\`` : "Your one tool is `REPL`"}; there are no other tools. Everything you do \u2014 shell commands, file reads and edits, code search, web fetches, MCP calls \u2014 happens as JavaScript inside a \`REPL\` call, through the globals below.`
          : "Everything you do to investigate \u2014 shell commands, file reads, code search \u2014 happens as JavaScript inside a `REPL` call, through the globals below; the other tools in your list are also callable from a script, by name.";
      let partCapNote =
        codeModeAccepted() && replPartCap !== undefined
          ? ` Each part of what a script returns (each key of a returned object, what it logged) is shown cut to about ${replPartCap.toLocaleString("en-US")} characters, head and tail kept, with a marker where the middle went.`
          : "";
      let tools_2 = await listPromptSkillCommands(tools);
      let gitHint = isAccepted()
        ? await getLeanGitInstructions(tools_2, "repl")
        : buildPrSkillPrepSuggestion(availablePrSkills(tools_2), "repl");
      return `
${introLine}

The REPL is one persistent JavaScript context: variables and functions you define in one call are there in the next, so keep results in variables (\`const out = await $\`\u2026\`.text()\`) instead of re-reading a file or re-running a command whose output you already hold. Those variables last between calls, but not across a restart, a resume, a fork or a wake: the first result after one of those says so. Top-level \`await\` works. There is no \`import\`, \`require\` or \`process\`: the context is sealed, and the globals below are how it reaches the machine. The REPL language is always JavaScript, whatever the codebase is written in \u2014 run the codebase's own tools (pytest, cargo, go test, \u2026) with \`$\`.

What a \`REPL\` call costs: each call is a full model round-trip \u2014 the whole conversation is re-read before your script runs, and you wait for the reply \u2014 while the work inside a script (shell commands, file reads, searches, tool calls) is comparatively free, and runs concurrently when you fan it out with \`Promise.all\`. So the expensive thing is coming back to decide, not doing more in one go: gather what a decision could plausibly need in the script you are already writing, and come back for another call when the next step depends on what this one shows you.

A script's output is its last expression's value plus anything it \`self.log(...)\`s along the way. What it returns is added to your context and stays there; the value itself stays in the REPL whether you return it or not. So return what you want to read now, and keep the rest in variables to slice or search later.${partCapNote} Promise values inside a returned object are awaited for you (\`({status: $\`git status\`, branches: $\`git branch\`})\` needs no awaits); a promise used inline \u2014 concatenated, interpolated, passed to another call \u2014 needs \`await\`. \`console.*\` goes to a bounded in-memory ring rather than into your context; \`console.tail(n)\` reads it back.

To keep a long output out of your context, return \`preview(out)\` or \`preview(out, 2000)\` instead of the output itself: it gives the first characters, and when \`out\` is an awaited \`$\` result (not its \`.text()\` string) whose output the shell tool saved to a file, it starts with the output's size and the file's path.
${outputHelp}${permissionHelp}
${PARALLEL_SCRIPT_EXAMPLE}
## Declarations
${await buildHelperDts({
  agent,
  isBash: bashAvailable,
  asyncLane: asyncRepl,
  mcpThrows,
  tools: buildToolsInterface(await listCodeModeOnlyTools(tools, permissionContext)),
})}
${mcpServerLine}${
        gitHint
          ? `
${gitHint}
`
          : ""
      }`;
    }
    return `
REPL is your programming interface to Claude Code's tools. Use it to loop, branch, and compose tool calls with code.

## How to Use

Write JavaScript that calls tools as async functions:
\`\`\`javascript
const { filenames } = await Glob({ pattern: 'src/**/*.ts' })
for (const f of filenames) {
  const { file } = await Read({ file_path: f })
  if (file.content.includes('oldName')) {
    await Edit({ file_path: f, old_string: 'oldName', new_string: 'newName', replace_all: true })
  }
}
\`\`\`

**IMPORTANT: Batch ALL operations into ONE REPL call.** Don't make multiple separate REPL calls - write a complete script that does everything.

## Available Tools

All tools work as async functions: \`Read\`, \`Write\`, \`Edit\`, \`Glob\`, \`Grep\`, \`${shellToolName}\`, etc. MCP tools are callable by their full name (e.g. \`await mcp__slack__slack_send_message({...})\`).${mcpThrows ? " Built-in tools resolve with `{error: string}` on failure; MCP tool calls THROW on failure \u2014 catch only where you can genuinely proceed without the result, and never treat a caught failure as success." : ""}

\`\`\`javascript
const { filenames } = await Glob({ pattern: '*.ts' })
const { file } = await Read({ file_path: 'config.json' })
await Edit({ file_path: 'foo.ts', old_string: 'old', new_string: 'new' })
const { stdout } = await ${shellToolName}({ command: 'git status' })
\`\`\`

## Tips
- \`import\`/\`require\` don't work here \u2014 the vm context is sealed. For filesystem access use \`Read\`/\`Write\`/\`Glob\`; for shell use \`${shellToolName}\`.
- Use \`Promise.all()\` for parallel operations
- Variables persist across REPL calls
- Last expression is returned as the result
- ${bashAvailable ? `Don't write a temp file just to feed a shell command \u2014 pipe via heredoc: \`await ${shellToolName}({command: "git commit -F - <<'EOF'\\n"+msg+"\\nEOF"})\`. Generic temp paths get clobbered by parallel agents.` : `For PowerShell, quote by doubling single quotes: \`"'"+s.replaceAll("'", "''")+"'"\`; for multi-line input use a here-string \`@'\\n...\\n'@\` (closing \`'@\` at column 0).`}
`;
  }
  return "";
}
//@ chunk-n51jggtb.js:55063-57775 placement
/**
 * Code Mode 下“脚本如何跑”的提示词段落（派发、detached、输出到达顺序）。
 */
function replSpliceWaitHelp() {
  if (!codeModeAccepted()) return "";
  let typedEvents = isReplTypedEventsOn();
  return `
How scripts run: your scripts run in one persistent VM and start in the order you send them; a script starts when the one before it ends or has run for about ${Math.round(replDetachAfterMs() / 1000)} s. A script still running by then is \`detached\`: it keeps running beside the scripts after it, and they share variables. So put steps that depend on each other in one script, or send the second script only after the first one's outcome has come back. A \`REPL\` call only dispatches its script and returns \`(dispatched #N)\` at once. A receipt means the script is queued or running, so sending it again would run it twice. If a \`${REPL_TOOL_NAME}\` call returns its script's output instead, calls in this session run until their script ends, and anything a script starts without awaiting, such as a build or a dev server, is stopped when the script ends.

How output arrives: after your reply's tool calls, if a script you sent in it is still running, the harness waits before continuing, until the script ends or something else arrives, such as a message from the user; things that arrive close together come together. What arrived then comes back in the \`${POLL}\` result of your reply, in the order it arrived: the script's ${typedEvents ? '`<event kind="repl-eval">` (one JSON object: `eval` is the script\'s number, with its `log` lines and its `result` or `error`)' : '`<event kind="repl-eval" eval="N">` (its `<log>` lines and its `<result>` or `<error>`)'}, other events, and an \`<event kind="repl-status">\` ${typedEvents ? "element" : "line"} naming any script still running. A message the user sent follows the tool results as the user's own text. You don't need to call \`${POLL}\` after a \`REPL\` call. Output a script logs after it has ended arrives the same way, as late output under its number.

So waiting inside a script costs you no turns and keeps no one waiting on you: anything addressed to you ends the wait within a few seconds. Put all the work this turn can do into one script, including awaiting a build or a test run and acting on its exit code, and come back when the next step needs your judgment about a result. A long command that a script awaits runs until it ends or reaches its timeout (10 minutes if you gave it none), when it moves to the background (see \`$\`). To keep something running while you do other things (a dev server, a build you'll check later), start it without awaiting it (\`const build = $\`npm run build\`.nothrow()\`) and let the script end.

Waiting at other times: \`${POLL}\` waits until a script ends or an event arrives, and says what is still running. When nothing needs doing, ending your turn works too: results start your next turn when they land.
`;
}
//@ chunk-n51jggtb.js:57775-57785 placement
/**
 * MCP 服务器列表的提示词前缀长度上限。
 */
var TOOL_DESCRIPTION_MAX_CHARS = 40;
export { buildReplPrompt };
