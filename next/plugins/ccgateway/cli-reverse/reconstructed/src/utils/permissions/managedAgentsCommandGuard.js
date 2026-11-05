/**
 * utils/permissions/managedAgentsCommandGuard.ts
 *
 * 2.1.316 新增：managed agents CLI 命令守卫钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b628tq8y.js (8)
 * attribution: placement 7, affinity 1
 */
import { getRegisteredHooks, registerHookCallbacks } from "../../bootstrap/state.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { withSturdyLanternOff } from "../bash/bashReadingFlags.js";
import { withReExpansionIfNeeded, needsReExpansionRun } from "../bash/bashParserFlags.js";
import { parseForSecurity, failsSubstitutionTextCheck, checkSemantics } from "../bash/ast.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-b628tq8y.js:2968-6710 placement
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
//@ chunk-b628tq8y.js:6710-6852 placement
/**
 * 若尚未注册，则为 Bash/PowerShell/Monitor 注册 managed agents 命令守卫 PreToolUse 钩子。
 */
function registerManagedAgentsCommandGuard() {
  if (
    (getRegisteredHooks()?.PreToolUse ?? []).some((matcher) =>
      matcher.hooks.some((hook) => hook === managedAgentsCommandGuardHook),
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
//@ chunk-b628tq8y.js:6852-9900 placement
/**
 * PreToolUse 钩子：检查 Bash 中的 managed agents CLI 命令参数格式，阻止可疑调用。
 */
async function guardManagedAgentsCommand(hookInput) {
  if (hookInput.hook_event_name !== "PreToolUse") return {};
  let toolInput = hookInput.tool_input;
  let command =
    typeof toolInput === "object" && toolInput !== null && "command" in toolInput
      ? toolInput.command
      : undefined;
  if (typeof command !== "string") return {};
  let shell = hookInput.tool_name === POWERSHELL_TOOL_NAME ? "powershell" : "bash";
  let replaced = command.replace(QUOTE_CHARS_PATTERN, "");
  let parsed =
    shell === "bash"
      ? await withSturdyLanternOff(() => withReExpansionIfNeeded(command, () => parseForSecurity(command)))
      : undefined;
  let skillsPathPresent = needsReExpansionRun(command);
  let commandShapeSuspicious =
    parsed?.kind !== "simple" ||
    (parsed.tree !== undefined && failsSubstitutionTextCheck(command, parsed.tree)) ||
    ANT_WORD_PATTERN.test(replaced) ||
    parsed.commands.some(({ argv }) => argv.some((arg) => /(?:^|\/)ant(?:\.exe)?$/i.test(arg)));
  let joinedArgv = parsed?.kind === "simple" ? parsed.commands.flatMap(({ argv }) => argv).join(" ") : "";
  let mapped = [command, command.replace(/\\\n/g, "")].map((candidate) =>
    candidate.replace(QUOTE_CHARS_PATTERN, ""),
  );
  let hasLocalId =
    mapped.some((variant) => (variant.match(LOCAL_ID_PATTERN) ?? []).length > 0) ||
    (joinedArgv.match(LOCAL_ID_PATTERN) ?? []).length > 0;
  let idCommandIndex =
    parsed?.kind === "simple"
      ? parsed.commands.findLastIndex(({ argv }) =>
          argv.some((arg) => (arg.match(LOCAL_ID_PATTERN) ?? []).length > 0),
        )
      : -1;
  let localIds =
    hasLocalId &&
    parsed?.kind === "simple" &&
    !skillsPathPresent &&
    !/\$\(|`|<<|[<>]\(/.test(command) &&
    checkSemantics(parsed.commands).ok &&
    parsed.bareAssignmentNames.length === 0 &&
    parsed.hasLoop === false &&
    parsed.tree !== undefined &&
    !hasLoopNode(parsed.tree) &&
    parsed.commands.every(
      ({ argv, argvSourceLiteral, envVars, redirects }, index) =>
        argvSourceLiteral === true &&
        envVars.length === 0 &&
        (index > idCommandIndex ||
          (redirects.length === 0 &&
            (BARE_ANT_PATTERN.test(argv[0] ?? "") ||
              (argv.length === 2 &&
                argv[0] === "cd" &&
                (argv[1]?.match(LOCAL_ID_PATTERN) ?? []).length === 0)))),
    )
      ? parsed.commands.flatMap(({ argv }) =>
          argv.filter((arg) => (arg.match(LOCAL_ID_PATTERN) ?? []).length > 0),
        )
      : undefined;
  let allIdsFullForm =
    localIds !== undefined &&
    localIds.every((localId) => LOCAL_ID_FULL_FORM.test(localId)) &&
    mapped.every((variant) => (variant.match(LOCAL_ID_PATTERN) ?? []).length === localIds.length);
  let hasStagedId =
    mapped.some((variant) => STAGED_ID_PATTERN.test(variant)) || STAGED_ID_PATTERN.test(joinedArgv);
  let stagedIdWithPrefix =
    skillsPathPresent &&
    mapped.some(
      (variant) => STAGED_ID_PATTERN.test(variant) || (variant.match(LOCAL_ID_PATTERN) ?? []).length > 0,
    );
  if (
    (hasStagedId || (hasLocalId && !allIdsFullForm)) &&
    (commandShapeSuspicious ||
      stagedIdWithPrefix ||
      (await withReExpansionIfNeeded(command, () =>
        hasNestedDoLoop(parsed, {
          left: MAX_NESTED_DO_DEPTH,
        }),
      )))
  ) {
    logEvent("tengu_claude_api_ant_command_refused", {
      shell: fromEnum(shell),
      cause: hasStagedId ? lit("id_with_second_part") : lit("id_with_local_part"),
    });
    let matchesSkillTransform =
      !hasStagedId &&
      (await loadManagedAgentsSkillFiles().catch(() => [])).some(({ transform }) =>
        replaced.includes(transform),
      );
    return denyHookOutput(
      hasStagedId
        ? STAGED_ID_REFUSED_MESSAGE
        : matchesSkillTransform
          ? MANAGED_AGENTS_SECURE_LOCAL_ID_MESSAGE
          : LOCAL_ID_FORM_MESSAGE,
    );
  }
  let managedAgentsSkillFiles = await loadManagedAgentsSkillFiles();
  let skillWords;
  let argv;
  if (shell === "powershell") {
    skillWords = managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))?.words;
    let text = command.replace(LEADING_SET_LOCATION_CHAIN, "");
    argv = /^[ \t\n]*['"]/.test(text) ? undefined : splitQuotedArgs(text);
  } else if (parsed?.kind !== "simple")
    skillWords = managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))?.words;
  else {
    let filtered = parsed.commands.filter(({ argv }) =>
      managedAgentsSkillFiles.some(({ transform }) => argv.includes(transform)),
    );
    skillWords = (
      managedAgentsSkillFiles.find(({ transform }) =>
        filtered.some(({ argv }) => argv.includes(transform)),
      ) ?? managedAgentsSkillFiles.find(({ transform }) => replaced.includes(transform))
    )?.words;
    let last = parsed.commands.at(-1);
    let sliced = parsed.commands.slice(0, -1);
    let strippedArgs = splitQuotedArgs(command.replace(LEADING_CD_CHAIN_PATTERN, ""));
    argv =
      !skillsPathPresent &&
      filtered.length === 1 &&
      parsed.bareAssignmentNames.length === 0 &&
      parsed.hasLoop === false &&
      last !== undefined &&
      last === filtered[0] &&
      strippedArgs !== undefined &&
      strippedArgs.length === last.argv.length &&
      strippedArgs.every((arg, index) => arg === last.argv[index]) &&
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
  if (skillWords === undefined) return {};
  let words = argv ?? [];
  let versionIndex =
    skillWords[1] === "beta:agents" && skillWords[2] === "retrieve"
      ? words.findIndex((word, index) => index > 2 && (word === "--version" || word.startsWith("--version=")))
      : -1;
  let isInlineVersion = words[versionIndex]?.startsWith("--version=") === true;
  let versionValue = isInlineVersion ? words[versionIndex]?.slice(10) : words[versionIndex + 1];
  let argsWithoutVersion =
    versionIndex === -1
      ? words
      : versionValue !== undefined &&
          VERSION_ARG_PATTERN.test(versionValue) &&
          !(words[versionIndex - 1] ?? "").startsWith("-")
        ? [...words.slice(0, versionIndex), ...words.slice(versionIndex + (isInlineVersion ? 1 : 2))]
        : [];
  if (
    argsWithoutVersion.length === skillWords.length &&
    skillWords.every((expected, index) => {
      let flagPattern = MANAGED_AGENTS_FLAG_PATTERNS.get(skillWords[index - 1] ?? "");
      let actual = argsWithoutVersion[index] ?? "";
      return flagPattern !== undefined
        ? flagPattern.test(actual)
        : index === 0
          ? ANT_COMMAND_PATTERN.test(actual)
          : actual === expected;
    })
  )
    return {};
  let isLocalId = hasLocalId && allIdsFullForm;
  logEvent("tengu_claude_api_ant_command_refused", {
    shell: fromEnum(shell),
    cause: isLocalId ? lit("local_id") : lit("managed_agents_secure_command_changed"),
  });
  return denyHookOutput(isLocalId ? MANAGED_AGENTS_SECURE_LOCAL_ID_MESSAGE : MALFORMED_ANT_COMMAND_MESSAGE);
}
//@ chunk-b628tq8y.js:9900-10225 placement
async function loadManagedAgentsSkillFiles() {
  if (managedAgentsSkillFilesCache === undefined) {
    let { SKILL_FILES } = await import("../../skills/bundled/SKILL_FILES_3.lazy.js");
    managedAgentsSkillFilesCache = (SKILL_FILES["shared/managed-agents-secure.md"] ?? "")
      .split(
        `
`,
      )
      .filter((line) => line.startsWith("ant beta:"))
      .flatMap((line) => {
        let args = splitQuotedArgs(line);
        let transformIndex = args?.indexOf("--transform") ?? -1;
        let transform = transformIndex === -1 ? undefined : args?.[transformIndex + 1];
        return args !== undefined && transform
          ? [
              {
                words: args,
                transform,
              },
            ]
          : [];
      });
  }
  return managedAgentsSkillFilesCache;
}
//@ chunk-b628tq8y.js:10225-10446 placement
async function hasNestedDoLoop(parsed, budget) {
  if (parsed?.kind !== "simple" || parsed.laterLoopPassesDiffer === true) return true;
  for (let arg of parsed.commands.flatMap(({ argv }) => argv))
    if (
      /\bdo\b/.test(arg) &&
      /\s/.test(arg) &&
      (budget.left-- <= 0 || (await hasNestedDoLoop(await parseForSecurity(arg), budget)))
    )
      return true;
  return false;
}
//@ chunk-b628tq8y.js:10446-10510 placement
function hasLoopNode(node) {
  return LOOP_NODE_TYPES.has(node.type) || node.children.some((child) => hasLoopNode(child));
}
//@ chunk-b628tq8y.js:10510-10697 placement
function splitQuotedArgs(text) {
  let replaced = text.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
  if (
    !new RegExp(`^(?:${QUOTED_ARG_TOKEN_PATTERN})(?:[ \\t]+(?:${QUOTED_ARG_TOKEN_PATTERN}))*$`).test(replaced)
  )
    return;
  return [...replaced.matchAll(new RegExp(QUOTED_ARG_TOKEN_PATTERN, "g"))].map(
    (match) => match[1] ?? match[2] ?? "",
  );
}
//@ chunk-b628tq8y.js:10697-10820 affinity
function denyHookOutput(permissionDecisionReason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason,
    },
  };
}
export { registerManagedAgentsCommandGuard };
