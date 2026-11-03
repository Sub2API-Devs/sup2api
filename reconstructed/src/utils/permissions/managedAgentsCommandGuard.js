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
var MANAGED_AGENTS_FLAG_PATTERNS = new Map([
    ["--agent-id", /^agent_[A-Za-z0-9]+$/],
    ["--environment-id", /^env_[A-Za-z0-9]+$/],
    ["--vault-id", /^vlt_[A-Za-z0-9]+$/],
  ]),
  J = /^[1-9][0-9]*$/,
  q = /\bant\b/i,
  N = /(?:^|[^A-Za-z0-9_])(?:agent|env|vlt)_(?:staging|vrtx|bdrk)_/,
  p = /(?:^|[^A-Za-z0-9_])(?:agent|env|vlt)_local_/g,
  V = /^(?:--[a-z][a-z-]*=)?(?:agent|env|vlt)_local_01[1-9A-HJ-NP-Za-km-z]{22}$/,
  H = /['"\\`\u2018-\u201f]/g,
  K = /^(?:~?\/(?:[\w.-]+\/)*)?ant(?:\.exe)?$/,
  X = /^ant(?:\.exe)?$/,
  Y = 16,
  Q = new Set(["&", "subshell", "compound_statement", "if_statement", "case_statement"]),
  k = String.raw`'([^'"\r\n\u2018-\u201f]*)'|([\w:./=~-]+)`,
  ee = /^(?:cd '[^'"\r\n\u2018-\u201f]*' && )+/,
  te = /^(?:Set-Location -LiteralPath '[^'"\r\n\u2018-\u201f]*'(?: -ErrorAction Stop)?; )+/,
  ne =
    "Claude Code did not run this command: it holds a --transform from the /claude-api managed-agents-secure instructions but is not that `ant` command as written. Run each of those commands alone and exactly as written, with each ID typed inside its single quotes (agent_, env_ or vlt_, then only letters and digits). Add --version only to `ant beta:agents retrieve`, as a whole number with no leading zero. If an ID or version read from the account has another form, do not run the command: ask the developer about it, and mark each report row that needs it CAN'T TELL.",
  oe =
    "Claude Code did not run this command: it holds an ID starting agent_, env_ or vlt_ then staging_, vrtx_ or bdrk_, which `ant` commands may not use. Do not run the command another way: tell the developer which ID was refused and ask where it came from. If this is part of /claude-api managed-agents-secure, mark each report row that needs it CAN'T TELL.",
  ae =
    "Claude Code did not run this command: it holds an ID starting agent_local_, env_local_ or vlt_local_, and the ID or the command around it is not in the one form Claude Code accepts. Such IDs come from a self-hosted or local Managed Agents server. Each such ID in the command must have the form agent_, env_ or vlt_, then local_01, then 22 letters and digits other than 0, O, I and l, and must be typed in full as its own argument to ant or ant.exe, named in lowercase with no path. Only cd into a folder, or another ant command, may come before ant; do not run ant through or feed it from another program such as timeout, echo or xargs. The command must be Bash made of plain commands joined by &&, || or ;, with at most one | after ant, into a program such as jq. It must not use: & to run a command in the background; VAR=value, export or any other variable setting; a redirect such as > file or 2>&1; if, for, while, case or function; a ( ) or { } group; $ variables; $( ), <( ), >( ) or backtick substitutions; or here-documents or <<< strings. To reach a self-hosted server, pass its address with ant's --base-url flag, not a variable. If ant is not on PATH, ask the developer to add its folder to PATH in their shell settings and restart Claude Code. If this is part of /claude-api managed-agents-secure, do not run the command again: mark each report row that needs the ID CAN'T TELL. Otherwise, if the ID came from such a server and already has that form, you may run the command again following these rules; if not, do not change the ID: ask the developer where it came from.",
  M =
    "Claude Code did not run this command: /claude-api managed-agents-secure does not support self-hosted or local Managed Agents servers, whose IDs start agent_local_, env_local_ or vlt_local_. Do not run the command another way: tell the developer which ID was refused and that /claude-api managed-agents-secure checks only agents on Anthropic's Managed Agents API, ask where the ID came from, and mark each report row that needs it CAN'T TELL.",
  W = { type: "callback", callback: guardManagedAgentsCommand, timeout: 10, internal: !0 },
  I;
/**
 * 若尚未注册，则为 Bash/PowerShell/Monitor 注册 managed agents 命令守卫 PreToolUse 钩子。
 */
//@ chunk-e5gvqyfh.js:6425-6567 placement
function registerManagedAgentsCommandGuard() {
  if ((getRegisteredHooks()?.PreToolUse ?? []).some((s) => s.hooks.some((hook) => hook === W))) return;
  registerHookCallbacks({
    PreToolUse: [{ matcher: `${BASH_TOOL_NAME}|${POWERSHELL_TOOL_NAME}|${MONITOR}`, hooks: [W] }],
  });
}
/**
 * PreToolUse 钩子：检查 Bash 中的 managed agents CLI 命令参数格式，阻止可疑调用。
 */
//@ chunk-e5gvqyfh.js:6567-9476 placement
async function guardManagedAgentsCommand(r) {
  if (r.hook_event_name !== "PreToolUse") return {};
  let tool_input = r.tool_input,
    o =
      typeof tool_input === "object" && tool_input !== null && "command" in tool_input
        ? tool_input.command
        : void 0;
  if (typeof o !== "string") return {};
  let i = r.tool_name === POWERSHELL_TOOL_NAME ? "powershell" : "bash",
    replaced = o.replace(H, ""),
    n = i === "bash" ? await parseForSecurity(o) : void 0,
    j =
      n?.kind !== "simple" ||
      q.test(replaced) ||
      n.commands.some(({ argv: argv }) => argv.some((t) => /(?:^|\/)ant(?:\.exe)?$/i.test(t))),
    D = n?.kind === "simple" ? n.commands.flatMap(({ argv: argv }) => argv).join(" ") : "",
    mapped = [o, o.replace(/\\\n/g, "")].map((e) => e.replace(H, "")),
    y = mapped.some((e) => (e.match(p) ?? []).length > 0) || (D.match(p) ?? []).length > 0,
    Z =
      n?.kind === "simple"
        ? n.commands.findLastIndex(({ argv: argv }) => argv.some((t) => (t.match(p) ?? []).length > 0))
        : -1,
    O =
      y &&
      n?.kind === "simple" &&
      !/\$\(|`|<<|[<>]\(/.test(o) &&
      checkSemantics(n.commands).ok &&
      n.bareAssignmentNames.length === 0 &&
      n.hasLoop === !1 &&
      n.tree !== void 0 &&
      !z(n.tree) &&
      n.commands.every(
        ({ argv: argv, argvSourceLiteral: argvSourceLiteral, envVars: envVars, redirects: redirects }, d) =>
          argvSourceLiteral === !0 &&
          envVars.length === 0 &&
          (d > Z ||
            (redirects.length === 0 &&
              (X.test(argv[0] ?? "") ||
                (argv.length === 2 && argv[0] === "cd" && (argv[1]?.match(p) ?? []).length === 0)))),
      )
        ? n.commands.flatMap(({ argv: argv }) => argv.filter((t) => (t.match(p) ?? []).length > 0))
        : void 0,
    L =
      O !== void 0 &&
      O.every((e) => V.test(e)) &&
      mapped.every((e) => (e.match(p) ?? []).length === O.length),
    A = mapped.some((e) => N.test(e)) || N.test(D);
  if ((A || (y && !L)) && (j || (await hasNestedDoLoop(n, { left: Y })))) {
    logEvent("tengu_claude_api_ant_command_refused", {
      shell: fromEnum(i),
      cause: A ? lit("id_with_second_part") : lit("id_with_local_part"),
    });
    let e =
      !A &&
      (await loadManagedAgentsSkillFiles().catch(() => [])).some(({ transform: transform }) =>
        replaced.includes(transform),
      );
    return PreToolUseHookSpecificOutputSchema_2(A ? oe : e ? M : ae);
  }
  let v = await loadManagedAgentsSkillFiles(),
    l,
    R;
  if (i === "powershell") {
    l = v.find(({ transform: transform }) => replaced.includes(transform))?.words;
    let replaced_2 = o.replace(te, "");
    R = /^[ \t\n]*['"]/.test(replaced_2) ? void 0 : splitQuotedArgs(replaced_2);
  } else if (n?.kind !== "simple")
    l = v.find(({ transform: transform }) => replaced.includes(transform))?.words;
  else {
    let filtered = n.commands.filter(({ argv: argv }) =>
      v.some(({ transform: transform }) => argv.includes(transform)),
    );
    l = (
      v.find(({ transform: transform }) => filtered.some(({ argv: argv }) => argv.includes(transform))) ??
      v.find(({ transform: transform }) => replaced.includes(transform))
    )?.words;
    let at = n.commands.at(-1),
      sliced = n.commands.slice(0, -1),
      m = splitQuotedArgs(o.replace(ee, ""));
    R =
      filtered.length === 1 &&
      n.bareAssignmentNames.length === 0 &&
      n.hasLoop === !1 &&
      at !== void 0 &&
      at === filtered[0] &&
      m !== void 0 &&
      m.length === at.argv.length &&
      m.every((d, g) => d === at.argv[g]) &&
      at.envVars.length === 0 &&
      at.redirects.length === 0 &&
      at.argvSourceLiteral === !0 &&
      sliced.every(
        ({ argv: argv, envVars: envVars, redirects: redirects }) =>
          argv.length === 2 && argv[0] === "cd" && envVars.length === 0 && redirects.length === 0,
      )
        ? at.argv
        : void 0;
  }
  if (l === void 0) return {};
  let h = R ?? [],
    f =
      l[1] === "beta:agents" && l[2] === "retrieve"
        ? h.findIndex((e, t) => t > 2 && (e === "--version" || e.startsWith("--version=")))
        : -1,
    S = h[f]?.startsWith("--version=") === !0,
    T = S ? h[f]?.slice(10) : h[f + 1],
    P =
      f === -1
        ? h
        : T !== void 0 && J.test(T) && !(h[f - 1] ?? "").startsWith("-")
          ? [...h.slice(0, f), ...h.slice(f + (S ? 1 : 2))]
          : [];
  if (
    P.length === l.length &&
    l.every((e, t) => {
      let _ = MANAGED_AGENTS_FLAG_PATTERNS.get(l[t - 1] ?? ""),
        m = P[t] ?? "";
      return _ !== void 0 ? _.test(m) : t === 0 ? K.test(m) : m === e;
    })
  )
    return {};
  let C = y && L;
  return (
    logEvent("tengu_claude_api_ant_command_refused", {
      shell: fromEnum(i),
      cause: C ? lit("local_id") : lit("managed_agents_secure_command_changed"),
    }),
    PreToolUseHookSpecificOutputSchema_2(C ? M : ne)
  );
}
//@ chunk-e5gvqyfh.js:9476-9801 placement
async function loadManagedAgentsSkillFiles() {
  if (I === void 0) {
    let { SKILL_FILES: SKILL_FILES } = await import("./chunk-7wwf2tct.js");
    I = (SKILL_FILES["shared/managed-agents-secure.md"] ?? "")
      .split(
        `
`,
      )
      .filter((s) => s.startsWith("ant beta:"))
      .flatMap((s) => {
        let o = splitQuotedArgs(s),
          i = o?.indexOf("--transform") ?? -1,
          u = i === -1 ? void 0 : o?.[i + 1];
        return o !== void 0 && u ? [{ words: o, transform: u }] : [];
      });
  }
  return I;
}
//@ chunk-e5gvqyfh.js:9801-10022 placement
async function hasNestedDoLoop(r, s) {
  if (r?.kind !== "simple" || r.laterLoopPassesDiffer === !0) return !0;
  for (let o of r.commands.flatMap(({ argv: argv }) => argv))
    if (
      /\bdo\b/.test(o) &&
      /\s/.test(o) &&
      (s.left-- <= 0 || (await hasNestedDoLoop(await parseForSecurity(o), s)))
    )
      return !0;
  return !1;
}
//@ chunk-e5gvqyfh.js:10022-10085 placement
function z(r) {
  return Q.has(r.type) || r.children.some((s) => z(s));
}
//@ chunk-e5gvqyfh.js:10085-10272 placement
function splitQuotedArgs(r) {
  let replaced = r.replace(/^[ \t\n]+|[ \t\n]+$/g, "");
  if (!new RegExp(`^(?:${k})(?:[ \\t]+(?:${k}))*$`).test(replaced)) return;
  return [...replaced.matchAll(new RegExp(k, "g"))].map((i) => i[1] ?? i[2] ?? "");
}
