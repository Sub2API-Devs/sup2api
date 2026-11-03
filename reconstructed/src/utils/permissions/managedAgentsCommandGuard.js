/**
 * utils/permissions/managedAgentsCommandGuard.ts
 *
 * 2.1.316 新增：managed agents CLI 命令守卫钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e5gvqyfh.js (7)
 * attribution: placement 7
 */
import { getRegisteredHooks, registerHookCallbacks } from "../../bootstrap/state.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { parseForSecurity, checkSemantics } from "../bash/ast.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { PreToolUseHookSpecificOutputSchema_2 } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-e5gvqyfh.js:2685-6425 placement
/**
 * VERSION_ARG_PATTERN：--version 的十进制整数值；ANT_WORD_PATTERN：命令里出现 ant（大小写不敏感）；STAGED_ID_PATTERN：staging/vrtx/bdrk 前缀的 ID（同一声明共 19 个绑定）。
 */
var MANAGED_AGENTS_FLAG_PATTERNS = new Map([
  ["--agent-id", /^agent_[A-Za-z0-9]+$/],
  ["--environment-id", /^env_[A-Za-z0-9]+$/],
  ["--vault-id", /^vlt_[A-Za-z0-9]+$/],
]);
var VERSION_ARG_PATTERN = /^[1-9][0-9]*$/;
var ANT_WORD_PATTERN = /\bant\b/i;
var STAGED_ID_PATTERN = /(?:^|[^A-Za-z0-9_])(?:agent|env|vlt)_(?:staging|vrtx|bdrk)_/;
var LOCAL_ID_PATTERN = /(?:^|[^A-Za-z0-9_])(?:agent|env|vlt)_local_/g;
var LOCAL_ID_FULL_FORM = /^(?:--[a-z][a-z-]*=)?(?:agent|env|vlt)_local_01[1-9A-HJ-NP-Za-km-z]{22}$/;
var QUOTE_CHARS_PATTERN = /['"\\`\u2018-\u201f]/g;
var ANT_COMMAND_PATTERN = /^(?:~?\/(?:[\w.-]+\/)*)?ant(?:\.exe)?$/;
var BARE_ANT_PATTERN = /^ant(?:\.exe)?$/;
var MAX_NESTED_DO_DEPTH = 16;
var LOOP_NODE_TYPES = new Set(["&", "subshell", "compound_statement", "if_statement", "case_statement"]);
var QUOTED_ARG_TOKEN_PATTERN = String.raw`'([^'"\r\n\u2018-\u201f]*)'|([\w:./=~-]+)`;
var LEADING_CD_CHAIN_PATTERN = /^(?:cd '[^'"\r\n\u2018-\u201f]*' && )+/;
var LEADING_SET_LOCATION_CHAIN =
  /^(?:Set-Location -LiteralPath '[^'"\r\n\u2018-\u201f]*'(?: -ErrorAction Stop)?; )+/;
var MALFORMED_ANT_COMMAND_MESSAGE =
  "Claude Code did not run this command: it holds a --transform from the /claude-api managed-agents-secure instructions but is not that `ant` command as written. Run each of those commands alone and exactly as written, with each ID typed inside its single quotes (agent_, env_ or vlt_, then only letters and digits). Add --version only to `ant beta:agents retrieve`, as a whole number with no leading zero. If an ID or version read from the account has another form, do not run the command: ask the developer about it, and mark each report row that needs it CAN'T TELL.";
var STAGED_ID_REFUSED_MESSAGE =
  "Claude Code did not run this command: it holds an ID starting agent_, env_ or vlt_ then staging_, vrtx_ or bdrk_, which `ant` commands may not use. Do not run the command another way: tell the developer which ID was refused and ask where it came from. If this is part of /claude-api managed-agents-secure, mark each report row that needs it CAN'T TELL.";
var LOCAL_ID_FORM_MESSAGE =
  "Claude Code did not run this command: it holds an ID starting agent_local_, env_local_ or vlt_local_, and the ID or the command around it is not in the one form Claude Code accepts. Such IDs come from a self-hosted or local Managed Agents server. Each such ID in the command must have the form agent_, env_ or vlt_, then local_01, then 22 letters and digits other than 0, O, I and l, and must be typed in full as its own argument to ant or ant.exe, named in lowercase with no path. Only cd into a folder, or another ant command, may come before ant; do not run ant through or feed it from another program such as timeout, echo or xargs. The command must be Bash made of plain commands joined by &&, || or ;, with at most one | after ant, into a program such as jq. It must not use: & to run a command in the background; VAR=value, export or any other variable setting; a redirect such as > file or 2>&1; if, for, while, case or function; a ( ) or { } group; $ variables; $( ), <( ), >( ) or backtick substitutions; or here-documents or <<< strings. To reach a self-hosted server, pass its address with ant's --base-url flag, not a variable. If ant is not on PATH, ask the developer to add its folder to PATH in their shell settings and restart Claude Code. If this is part of /claude-api managed-agents-secure, do not run the command again: mark each report row that needs the ID CAN'T TELL. Otherwise, if the ID came from such a server and already has that form, you may run the command again following these rules; if not, do not change the ID: ask the developer where it came from.";
var MANAGED_AGENTS_SECURE_LOCAL_ID_MESSAGE =
  "Claude Code did not run this command: /claude-api managed-agents-secure does not support self-hosted or local Managed Agents servers, whose IDs start agent_local_, env_local_ or vlt_local_. Do not run the command another way: tell the developer which ID was refused and that /claude-api managed-agents-secure checks only agents on Anthropic's Managed Agents API, ask where the ID came from, and mark each report row that needs it CAN'T TELL.";
var managedAgentsCommandGuardHook = {
  type: "callback",
  callback: guardManagedAgentsCommand,
  timeout: 10,
  internal: true,
};
var managedAgentsSkillFilesCache;
//@ chunk-e5gvqyfh.js:6425-6567 placement
/**
 * 若尚未注册，则为 Bash/PowerShell/Monitor 注册 managed agents 命令守卫 PreToolUse 钩子。
 */
function registerManagedAgentsCommandGuard() {
  if (
    (getRegisteredHooks()?.PreToolUse ?? []).some((s) =>
      s.hooks.some((hook) => hook === managedAgentsCommandGuardHook),
    )
  )
    return;
  registerHookCallbacks({
    PreToolUse: [
      {
        matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}|${MONITOR}`,
        hooks: [managedAgentsCommandGuardHook],
      },
    ],
  });
}
//@ chunk-e5gvqyfh.js:6567-9476 placement
/**
 * PreToolUse 钩子：检查 Bash 中的 managed agents CLI 命令参数格式，阻止可疑调用。
 */
async function guardManagedAgentsCommand(r) {
  if (r.hook_event_name !== "PreToolUse") return {};
  let toolInput = r.tool_input;
  let command =
    typeof toolInput === "object" && toolInput !== null && "command" in toolInput
      ? toolInput.command
      : undefined;
  if (typeof command !== "string") return {};
  let i = r.tool_name === POWERSHELL_TOOL_NAME ? "powershell" : "bash";
  let replaced = command.replace(QUOTE_CHARS_PATTERN, "");
  let n = i === "bash" ? await parseForSecurity(command) : undefined;
  let j =
    n?.kind !== "simple" ||
    ANT_WORD_PATTERN.test(replaced) ||
    n.commands.some(({ argv }) => argv.some((arg) => /(?:^|\/)ant(?:\.exe)?$/i.test(arg)));
  let D = n?.kind === "simple" ? n.commands.flatMap(({ argv }) => argv).join(" ") : "";
  let mapped = [command, command.replace(/\\\n/g, "")].map((e) => e.replace(QUOTE_CHARS_PATTERN, ""));
  let y =
    mapped.some((e) => (e.match(LOCAL_ID_PATTERN) ?? []).length > 0) ||
    (D.match(LOCAL_ID_PATTERN) ?? []).length > 0;
  let Z =
    n?.kind === "simple"
      ? n.commands.findLastIndex(({ argv }) =>
          argv.some((arg) => (arg.match(LOCAL_ID_PATTERN) ?? []).length > 0),
        )
      : -1;
  let O =
    y &&
    n?.kind === "simple" &&
    !/\$\(|`|<<|[<>]\(/.test(command) &&
    checkSemantics(n.commands).ok &&
    n.bareAssignmentNames.length === 0 &&
    n.hasLoop === false &&
    n.tree !== undefined &&
    !hasLoopNode(n.tree) &&
    n.commands.every(
      ({ argv, argvSourceLiteral, envVars, redirects }, d) =>
        argvSourceLiteral === true &&
        envVars.length === 0 &&
        (d > Z ||
          (redirects.length === 0 &&
            (BARE_ANT_PATTERN.test(argv[0] ?? "") ||
              (argv.length === 2 &&
                argv[0] === "cd" &&
                (argv[1]?.match(LOCAL_ID_PATTERN) ?? []).length === 0)))),
    )
      ? n.commands.flatMap(({ argv }) => argv.filter((arg) => (arg.match(LOCAL_ID_PATTERN) ?? []).length > 0))
      : undefined;
  let L =
    O !== undefined &&
    O.every((e) => LOCAL_ID_FULL_FORM.test(e)) &&
    mapped.every((e) => (e.match(LOCAL_ID_PATTERN) ?? []).length === O.length);
  let A = mapped.some((e) => STAGED_ID_PATTERN.test(e)) || STAGED_ID_PATTERN.test(D);
  if (
    (A || (y && !L)) &&
    (j ||
      (await hasNestedDoLoop(n, {
        left: MAX_NESTED_DO_DEPTH,
      })))
  ) {
    logEvent("tengu_claude_api_ant_command_refused", {
      shell: fromEnum(i),
      cause: A ? lit("id_with_second_part") : lit("id_with_local_part"),
    });
    let e =
      !A &&
      (await loadManagedAgentsSkillFiles().catch(() => [])).some(({ transform }) =>
        replaced.includes(transform),
      );
    return PreToolUseHookSpecificOutputSchema_2(
      A ? STAGED_ID_REFUSED_MESSAGE : e ? MANAGED_AGENTS_SECURE_LOCAL_ID_MESSAGE : LOCAL_ID_FORM_MESSAGE,
    );
  }
  let managedAgentsSkillFiles = await loadManagedAgentsSkillFiles();
  let l;
  let R;
  if (i === "powershell") {
    l = managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))?.words;
    let replaced_2 = command.replace(LEADING_SET_LOCATION_CHAIN, "");
    R = /^[ \t\n]*['"]/.test(replaced_2) ? undefined : splitQuotedArgs(replaced_2);
  } else if (n?.kind !== "simple")
    l = managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))?.words;
  else {
    let filtered = n.commands.filter(({ argv }) =>
      managedAgentsSkillFiles.some(({ transform }) => argv.includes(transform)),
    );
    l = (
      managedAgentsSkillFiles.find(({ transform }) =>
        filtered.some(({ argv }) => argv.includes(transform)),
      ) ?? managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))
    )?.words;
    let last = n.commands.at(-1);
    let sliced = n.commands.slice(0, -1);
    let m = splitQuotedArgs(command.replace(LEADING_CD_CHAIN_PATTERN, ""));
    R =
      filtered.length === 1 &&
      n.bareAssignmentNames.length === 0 &&
      n.hasLoop === false &&
      last !== undefined &&
      last === filtered[0] &&
      m !== undefined &&
      m.length === last.argv.length &&
      m.every((d, g) => d === last.argv[g]) &&
      last.envVars.length === 0 &&
      last.redirects.length === 0 &&
      last.argvSourceLiteral === true &&
      sliced.every(
        ({ argv, envVars, redirects }) =>
          argv.length === 2 && argv[0] === "cd" && envVars.length === 0 && redirects.length === 0,
      )
        ? last.argv
        : undefined;
  }
  if (l === undefined) return {};
  let h = R ?? [];
  let f =
    l[1] === "beta:agents" && l[2] === "retrieve"
      ? h.findIndex((e, t) => t > 2 && (e === "--version" || e.startsWith("--version=")))
      : -1;
  let S = h[f]?.startsWith("--version=") === true;
  let T = S ? h[f]?.slice(10) : h[f + 1];
  let P =
    f === -1
      ? h
      : T !== undefined && VERSION_ARG_PATTERN.test(T) && !(h[f - 1] ?? "").startsWith("-")
        ? [...h.slice(0, f), ...h.slice(f + (S ? 1 : 2))]
        : [];
  if (
    P.length === l.length &&
    l.every((e, t) => {
      let _ = MANAGED_AGENTS_FLAG_PATTERNS.get(l[t - 1] ?? "");
      let m = P[t] ?? "";
      return _ !== undefined ? _.test(m) : t === 0 ? ANT_COMMAND_PATTERN.test(m) : m === e;
    })
  )
    return {};
  let C = y && L;
  logEvent("tengu_claude_api_ant_command_refused", {
    shell: fromEnum(i),
    cause: C ? lit("local_id") : lit("managed_agents_secure_command_changed"),
  });
  return PreToolUseHookSpecificOutputSchema_2(
    C ? MANAGED_AGENTS_SECURE_LOCAL_ID_MESSAGE : MALFORMED_ANT_COMMAND_MESSAGE,
  );
}
//@ chunk-e5gvqyfh.js:9476-9801 placement
async function loadManagedAgentsSkillFiles() {
  if (managedAgentsSkillFilesCache === undefined) {
    let { SKILL_FILES } = await import("./chunk-7wwf2tct.js");
    managedAgentsSkillFilesCache = (SKILL_FILES["shared/managed-agents-secure.md"] ?? "")
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("ant beta:"))
      .flatMap((line) => {
        let o = splitQuotedArgs(line);
        let i = o?.indexOf("--transform") ?? -1;
        let u = i === -1 ? undefined : o?.[i + 1];
        return o !== undefined && u
          ? [
              {
                words: o,
                transform: u,
              },
            ]
          : [];
      });
  }
  return managedAgentsSkillFilesCache;
}
//@ chunk-e5gvqyfh.js:9801-10022 placement
async function hasNestedDoLoop(r, s) {
  if (r?.kind !== "simple" || r.laterLoopPassesDiffer === true) return true;
  for (let o of r.commands.flatMap(({ argv }) => argv))
    if (
      /\bdo\b/.test(o) &&
      /\s/.test(o) &&
      (s.left-- <= 0 || (await hasNestedDoLoop(await parseForSecurity(o), s)))
    )
      return true;
  return false;
}
//@ chunk-e5gvqyfh.js:10022-10085 placement
function hasLoopNode(r) {
  return LOOP_NODE_TYPES.has(r.type) || r.children.some((child) => hasLoopNode(child));
}
//@ chunk-e5gvqyfh.js:10085-10272 placement
function splitQuotedArgs(r) {
  let replaced = r.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
  if (
    !new RegExp(`^(?:${QUOTED_ARG_TOKEN_PATTERN})(?:[ \\t]+(?:${QUOTED_ARG_TOKEN_PATTERN}))*$`).test(replaced)
  )
    return;
  return [...replaced.matchAll(new RegExp(QUOTED_ARG_TOKEN_PATTERN, "g"))].map((i) => i[1] ?? i[2] ?? "");
}
