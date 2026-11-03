/**
 * utils/promptShellExecution.ts
 *
 * 执行 Skill/斜杠命令文本里的 !`cmd` 与 ```! 块：逐条权限检查（auto 模式可移交模型）、执行并把输出替换回文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/promptShellExecution.ts
 * pieces: chunk-e6aww6q8.js (31)
 * attribution: placement 25, callgraph-fingerprint 1, fingerprint 3, layout 2
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { repeatString } from "./stringUtils.js";
import { env } from "./env.js";
import { getSettingsForSource, getSettings_DEPRECATED } from "./settings/settings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { isToolResultMessage, createAssistantMessage } from "./messages.js";
import { isBashAvailable, isPowerShellToolEnabled } from "./shell/shellToolUtils.js";
import { INSTALL_GIT_FOR_WINDOWS, describeNoBashFallback } from "./hooks/hookCommandResolution.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { Pxe, $qe } from "../tasks/LocalShellTask/backgroundNotices.js";
import { findToolByName } from "../Tool.js";
import { getToolPermissionContext } from "./permissions/toolPermissionContext.js";
import { hasPermissionsToUseTool } from "./permissions/permissions.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { isBridgeOrTransport } from "../cli/transportState.js";
import { MalformedCommandError, ShellError, errorMessage } from "./errors.js";
import { Uv } from "../services/compact/keptTools.js";
import { mapAndMaybePersistToolResult, toolResultsDirFor } from "./toolResultStorage.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { stripNonPrintable } from "./truncateGraphemes.js";

/**
 * 把文本中不是 !` 起头的行内代码段内容替换为空格（保留长度），避免其中的 !`命令` 被误识别为 shell 执行。
 */
//@ chunk-e6aww6q8.js:983407-983529 placement
function blankInlineCodeSpans(e) {
  return e.replace(/`[^`\n]+`/g, (n, r) => {
    let s = e[r - 1];
    return s === "!" || s === "`" ? n : "`" + repeatString(" ", n.length - 2) + "`";
  });
}
//@ chunk-e6aww6q8.js:983529-983624 placement
function xM(e) {
  return e
    .replace(/`!/g, "` !")
    .replace(/!`/g, "! `")
    .replace(/(^|\s)!/gm, "$1\\!");
}
//@ chunk-e6aww6q8.js:983624-983690 placement
var oPo = /```!\s*\n?([\s\S]*?)\n?```/g,
  rPo = /(?<=^|\s)!`([^`]+)`/gm;
//@ chunk-e6aww6q8.js:983690-983744 placement
function d$o(e) {
  return e.trim().replaceAll(
    `\r
`,
    `
`,
  );
}
/**
 * 找出提示词中要执行的 shell 命令：```! 代码块与行内 !`命令`，返回原文、解析后的命令与位置。
 */
//@ chunk-e6aww6q8.js:983744-983929 placement
function findPromptShellCommands(e) {
  let blockMatches = e.matchAll(oPo),
    inlineMatches = e.includes("!`") ? blankInlineCodeSpans(e).matchAll(rPo) : [],
    commands = [];
  for (let match of [...blockMatches, ...inlineMatches]) {
    let command = d$o(match[1] ?? "");
    if (command) commands.push({ raw: match[0], command: command, at: match.index });
  }
  return commands;
}
/**
 * 提示词 shell 执行的匹配正则（```! 代码块与行内 !`命令`）以及策略禁用/协调者只读加载时的替换文本。
 */
//@ chunk-e6aww6q8.js:989245-989472 placement
var SHELL_BLOCK_RE = /```!\s*\n?[\s\S]*?\n?```/g,
  INLINE_SHELL_RE = /(?<=^|\s)!`[^`]+`/gm,
  SHELL_DISABLED_PLACEHOLDER = "[shell command execution disabled by policy]",
  SHELL_DEFERRED_TO_WORKER_PLACEHOLDER =
    "[shell command not executed: read-only skill load on the coordinator \u2014 delegate to a worker to run it]";
/**
 * 判断技能中的 shell 命令执行是否被禁用：Cowork 环境、策略设置或普通设置的 disableSkillShellExecution。
 */
//@ chunk-e6aww6q8.js:989472-989633 placement
function isSkillShellExecutionDisabled() {
  if (env.CLAUDE_CODE_IS_COWORK) return !0;
  if (getSettingsForSource("policySettings")?.disableSkillShellExecution === !0) return !0;
  return getSettings_DEPRECATED().disableSkillShellExecution === !0;
}
/**
 * 把提示词中的 shell 执行片段（代码块和行内 !`命令`）替换为占位文本。
 */
//@ chunk-e6aww6q8.js:989633-989815 placement
function replacePromptShellCommands(e, n = SHELL_DISABLED_PLACEHOLDER) {
  let result = e.replace(SHELL_BLOCK_RE, n);
  if (result.includes("!`")) {
    let blanked = blankInlineCodeSpans(result);
    for (let match of [...blanked.matchAll(INLINE_SHELL_RE)].reverse())
      result = result.slice(0, match.index) + n + result.slice(match.index + match[0].length);
  }
  return result;
}
//@ chunk-e6aww6q8.js:989815-989840 placement
var _1t = /[\u180e\ufeff]/;
//@ chunk-e6aww6q8.js:989840-989875 placement
function q9n(e) {
  return _1t.test(e);
}
//@ chunk-e6aww6q8.js:989875-989945 placement
function S1t(e) {
  return e.replace(new RegExp(_1t.source, "g"), "\uFFFD");
}
/**
 * 命令含不可见字符 U+FEFF 或 U+180E 而未执行时的拒绝说明。
 */
//@ chunk-e6aww6q8.js:989945-990241 placement
var INVISIBLE_CHAR_REFUSAL =
  "command contains the invisible character U+FEFF (byte order mark) or U+180E (Mongolian vowel separator), and was not run. Remove the character, keep the text that needs it in a file that the command reads, or write it as $([char]0xFEFF) or $([char]0x180E) inside a double-quoted string";
//@ chunk-e6aww6q8.js:3029403-3029433 placement
var TENGU_GLOWING_ORBIT = "tengu_glowing_orbit";
//@ chunk-e6aww6q8.js:3029433-3029470 placement
function qzo() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLOWING_ORBIT, !0) !== !1;
}
//@ chunk-e6aww6q8.js:3029470-3029535 placement
function bbn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_falcon", !0) !== !1 && qzo();
}
//@ chunk-e6aww6q8.js:3029535-3029793 placement
function formatRunFirstInstruction({ command: command, tool: tool }) {
  let r =
    tool === BASH_TOOL_NAME
      ? "run this first, exactly as written, and use its output:"
      : `run this first, exactly as written, with the ${tool} tool and use its output:`;
  if (/[`\n]/.test(command))
    return `[${r}]
\`\`\`
${command}
\`\`\``;
  return `[${r} \`${command}\`]`;
}
/**
 * 为多条需先执行的命令生成说明：若都用同一工具，提示可合并为一次调用（Bash 用 &&，否则用 ;）；逐条编号列出命令，含反引号或换行的用代码块。
 */
//@ chunk-e6aww6q8.js:3029793-3030284 placement
function formatRunAllFirstInstruction(e) {
  let firstTool = e[0]?.tool,
    sameTool = firstTool !== void 0 && e.every((w) => w.tool === firstTool),
    toolSuffix = sameTool && firstTool !== BASH_TOOL_NAME ? ` with the ${firstTool} tool` : "",
    joinHint = sameTool
      ? `, or all in one ${firstTool} call joined with ${firstTool === BASH_TOOL_NAME ? "&&" : ";"}`
      : "",
    header = `[Run these ${e.length} commands first, exactly as written${toolSuffix}, and use their output where each is named below. Run them one per call${joinHint}.]`,
    lines = e.map(({ command: command, tool: tool }, index) => {
      let toolNote = sameTool ? "" : ` (${tool} tool)`;
      if (/[`\n]/.test(command))
        return `${index + 1}.${toolNote}
\`\`\`
${command}
\`\`\``;
      return `${index + 1}. \`${command}\`${toolNote}`;
    });
  return [header, ...lines].join(`
`);
}
//@ chunk-e6aww6q8.js:3030284-3030407 placement
function formatCommandOutputRef({ command: command }, n) {
  if (/[`\n]/.test(command)) return `[output of command ${n}]`;
  return `[output of command ${n}, \`${command}\`]`;
}
/**
 * 找出最后一条真实用户提示（有提示来源，或非元消息、非堆叠展开、非工具结果）的下标，找不到为 0。
 */
//@ chunk-e6aww6q8.js:3030407-3030555 placement
function findLastPromptIndex(e) {
  return Math.max(
    e.findLastIndex(
      (n) =>
        n.type === "user" &&
        (n.promptSource !== void 0 ||
          (n.isMeta !== !0 && n.stackedExpansion !== !0 && !isToolResultMessage(n))),
    ),
    0,
  );
}
//@ chunk-e6aww6q8.js:3030555-3030591 placement
var _Tr = 262144,
  STr = 134217728,
  hbn = 64;
//@ chunk-e6aww6q8.js:3030591-3030643 placement
function Sbn(e) {
  return e.replace(/\s+/g, " ").trim();
}
//@ chunk-e6aww6q8.js:3030643-3030830 placement
function containsCommandToken(e, n) {
  let r = /[\s;&|()<>]/;
  for (let index = e.indexOf(n); index !== -1; index = e.indexOf(n, index + 1)) {
    let h = e[index - 1],
      y = e[index + n.length];
    if ((h === void 0 || r.test(h)) && (y === void 0 || r.test(y))) return !0;
  }
  return !1;
}
/**
 * 找出交接给指定 agent 的提示词 shell 命令中尚未被执行的：遍历用户消息记录交接命令，再检查助手的工具调用逐行抵消；超出长度/计算预算时放弃返回 undefined。
 */
//@ chunk-e6aww6q8.js:3030830-3031654 placement
function findPendingShellHandOffs(messages, agentId) {
  let lengthBudget = _Tr,
    workBudget = STr,
    pending = new Map();
  for (let message of messages)
    if (message.type === "user") {
      let promptShellHandOff = message.promptShellHandOff;
      if (promptShellHandOff === void 0 || promptShellHandOff.agentId !== agentId) continue;
      for (let command of promptShellHandOff.commands) {
        if (((lengthBudget -= command.command.length), lengthBudget < 0)) return;
        let key = `${command.tool}
${command.command}`;
        if (!pending.has(key))
          pending.set(key, {
            entry: command,
            pending: command.command
              .split(
                `
`,
              )
              .map(Sbn)
              .filter((pendingKey) => pendingKey !== ""),
          });
      }
    } else if (message.type === "assistant" && pending.size > 0)
      for (let S of message.message.content) {
        if (S.type !== "tool_use") continue;
        let input = S.input;
        if (
          typeof input !== "object" ||
          input === null ||
          !("command" in input) ||
          typeof input.command !== "string"
        )
          continue;
        let L = Sbn(input.command);
        for (let [G, state] of pending) {
          if (((workBudget -= hbn), state.entry.tool === S.name))
            for (let line of state.pending) workBudget -= (L.length + 1) * (line.length + hbn);
          if (workBudget < 0) return;
          if (state.entry.tool !== S.name) continue;
          if (
            ((state.pending = state.pending.filter((Z) => !containsCommandToken(L, Z))),
            state.pending.length === 0)
          )
            pending.delete(G);
        }
      }
  return [...pending.values()].map((y) => y.entry);
}
//@ chunk-e6aww6q8.js:3031654-3031700 placement
function jXs(e, n, r) {
  return findPendingShellHandOffs([...e, ...n], r);
}
/**
 * 生成在权限上下文中加入命令允许规则的 AppState 读取函数（poll 事件投递保护开启时不改）。
 */
//@ chunk-e6aww6q8.js:3031700-3031957 placement
function withCommandAllowRules(e, n) {
  return () => {
    let appState = e.getAppState();
    if (appState.toolPermissionContext.pollEventDeliveryGuard === !0) return appState;
    return {
      ...appState,
      toolPermissionContext: {
        ...appState.toolPermissionContext,
        alwaysAllowRules: { ...appState.toolPermissionContext.alwaysAllowRules, command: [...n] },
      },
    };
  };
}
//@ chunk-e6aww6q8.js:3116579-3116678 callgraph-fingerprint = getPowerShellTool (0.524)
var getPowerShellTool = (() => {
  let e;
  return () => {
    if (!e) e = require("./chunk-v0yfsee9.js").PowerShellTool;
    return e;
  };
})();
/**
 * 执行 Skill/命令文件里的 !`cmd` 与 ```! 块：按 frontmatter shell 选 Bash/PowerShell 工具，逐条做权限检查（GE），auto 模式下需要询问的可移交模型（promptShellHandOff），不允许则抛错；允许则执行并把输出替换进文本。readOnlySkillLoad 时不执行。
 */
//@ chunk-e6aww6q8.js:3116678-3119119 fingerprint = executeShellCommandsInPrompt (0.36)
async function executeShellCommandsInPrompt(text, context, sourceName, shell, pluginId) {
  if (context.options.readOnlySkillLoad)
    return replacePromptShellCommands(text, SHELL_DEFERRED_TO_WORKER_PLACEHOLDER);
  let result = text;
  if (shell === "bash" && !isBashAvailable())
    throw Error(
      `Skill ${sourceName} requires bash (\`shell: bash\` in frontmatter) but Git Bash was not found. ${INSTALL_GIT_FOR_WINDOWS}, or change the skill's frontmatter to \`shell: powershell\`.`,
    );
  let S =
      shell === "powershell" && isPowerShellToolEnabled()
        ? getPowerShellTool()
        : isBashAvailable()
          ? BashTool
          : getPowerShellTool(),
    w = context.toolUseId ?? `${randomUUID_14()}${Pxe}`,
    L = bbn(),
    G = findToolByName(context.options.tools, S.name) !== void 0,
    q = L && getToolPermissionContext(context).mode === "auto" && G ? context.promptShellHandOff : void 0,
    Z = L && (q !== void 0 || !0);
  if (
    getToolPermissionContext(context).servedCall === !0 &&
    getToolPermissionContext(context).mode === "auto" &&
    q === void 0
  )
    return replacePromptShellCommands(text, SHELL_DEFERRED_TO_WORKER_PLACEHOLDER);
  let Se = G ? context.options : { ...context.options, tools: [...context.options.tools, S] },
    ke = [];
  if (
    (await Promise.all(
      extractPromptShellCommands(text, S, sourceName).map(
        async ({ raw: raw, command: command, at: at }, Ie) => {
          if (shell === void 0 && S !== BashTool) describeNoBashFallback("skill");
          let Me = {
            ...context,
            innerCall: !0,
            toolUseId: `${w}${$qe}${Ie}`,
            promptShellHandOff: void 0,
            promptShellPluginId: pluginId,
          };
          try {
            let We = {
                ...context,
                options: Se,
                forPromptShellCommand: Z,
                promptShellHandOff: void 0,
                ...(q === void 0 && { asksNoHost: !0 }),
              },
              permissionResult = await hasPermissionsToUseTool(
                S,
                { command: command },
                We,
                createAssistantMessage({ content: [] }),
                "",
              ),
              lt =
                permissionResult.behavior === "ask" ||
                (permissionResult.behavior === "deny" &&
                  permissionResult.decisionReason?.type === "asyncAgent"),
              Je = !1,
              nt = q !== void 0 && (lt || Je);
            if (
              (logEvent("tengu_prompt_shell_permission", {
                behavior: fromEnum(permissionResult.behavior),
                mode: fromEnum(getToolPermissionContext(context).mode),
                evaluatedAs: fromEnum(getToolPermissionContext(We).mode),
                decisionReasonType: fromEnumOpt(permissionResult.decisionReason?.type),
                handedToModel: nt,
                handedOffOnAllow: Je,
              }),
              nt)
            ) {
              let gt = { command: command.trim(), tool: S.name };
              (ke.push({ index: Ie, at: at, entry: gt }),
                (result = result.replace(raw, () => promptShellHandOffPlaceholder(Ie))));
              return;
            }
            if (permissionResult.behavior !== "allow") {
              if (
                (logForDebugging(
                  `Shell command permission check failed for command in ${sourceName}: ${command}. Error: ${permissionResult.message}`,
                ),
                isBridgeOrTransport(Me.session))
              )
                throw (
                  logForDebugging(
                    `prompt shell permission denial: ${permissionResult.message || "Permission denied"}`,
                    { level: "error" },
                  ),
                  new MalformedCommandError(
                    `Shell command permission check failed for pattern "${raw}" (detail withheld on this connection)`,
                  )
                );
              throw new MalformedCommandError(
                `Shell command permission check failed for pattern "${raw}": ${permissionResult.message || "Permission denied"}`,
              );
            }
            Uv(S.name);
            let { data: data } = await S.call({ command: command }, Me),
              Et = await mapAndMaybePersistToolResult(
                S,
                data,
                randomUUID_14(),
                toolResultsDirFor(Me.session),
                Me.storageV5,
              ),
              yt = typeof Et.content === "string" ? Et.content : formatBashOutput(data.stdout, data.stderr);
            result = result.replace(raw, () => yt);
          } catch (error) {
            if (error instanceof MalformedCommandError) throw error;
            formatBashError(error, raw, Me.session);
          }
        },
      ),
    ),
    q !== void 0 && ke.length > 0)
  ) {
    ke.sort((Ee, Ae) => Ee.at - Ae.at);
    let mapped = ke.map((Ee) => Ee.entry);
    if (ke.length === 1)
      result = result.replace(promptShellHandOffPlaceholder(ke[0].index), () =>
        formatRunFirstInstruction(ke[0].entry),
      );
    else
      (ke.forEach(({ index: index, entry: entry }, Ie) => {
        result = result.replace(promptShellHandOffPlaceholder(index), () =>
          formatCommandOutputRef(entry, Ie + 1),
        );
      }),
        (result = `${formatRunAllFirstInstruction(mapped)}

${result}`));
    (q.push(...mapped), logFeatureOk("skill_inline_command_handoff"));
  }
  return result;
}
/**
 * 提取文本中的内联/块命令并用工具 inputSchema 校验；不合法（或含不可打印字符）时抛出带说明的错误，一条都不执行。
 */
//@ chunk-e6aww6q8.js:3119119-3119806 layout
function extractPromptShellCommands(e, n, r) {
  return findPromptShellCommands(e).map((s) => {
    let safeParse = n.inputSchema.safeParse({ command: s.command }),
      y = n !== BashTool && q9n(s.command);
    if (safeParse.success && !y) return s;
    let S = safeParse.success
        ? INVISIBLE_CHAR_REFUSAL
        : safeParse.error.issues.map((issue) => issue.message).join("; "),
      w = s.command.includes(`\r
`)
        ? " A \uFFFD at the end of a line is a carriage return from Windows (CR LF) line endings: if the file has them, save it with LF line endings."
        : "";
    throw new MalformedCommandError(
      stripNonPrintable(
        `No shell command in ${r} was run, because the ${n.name} tool does not accept one of them: ${S}. ` +
          `Unprintable characters are shown as \uFFFD below: remove them from the skill or command file, or from the arguments or options substituted into it.${w}
` +
          (y ? S1t(s.command) : s.command),
      ),
    );
  });
}
//@ chunk-e6aww6q8.js:3119806-3119862 layout
function promptShellHandOffPlaceholder(e) {
  return `\x00promptShellHandOff:${e}\x00`;
}
//@ chunk-e6aww6q8.js:3119862-3120033 fingerprint = formatBashOutput (1)
function formatBashOutput(stdout, stderr, inline = !1) {
  let parts = [];
  if (stdout.trim()) parts.push(stdout.trim());
  if (stderr.trim())
    if (inline) parts.push(`[stderr: ${stderr.trim()}]`);
    else
      parts.push(`[stderr]
${stderr.trim()}`);
  return parts.join(
    inline
      ? " "
      : `
`,
  );
}
//@ chunk-e6aww6q8.js:3120033-3120512 fingerprint = formatBashError (0.783)
function formatBashError(e, n, r, s = !1) {
  if (e instanceof ShellError) {
    if (e.interrupted)
      throw new MalformedCommandError(`Shell command interrupted for pattern "${n}": [Command interrupted]`);
    let output = formatBashOutput(e.stdout, e.stderr, s);
    throw new MalformedCommandError(`Shell command failed for pattern "${n}": ${output}`);
  }
  let message = errorMessage(e);
  if (isBridgeOrTransport(r))
    throw (
      logForDebugging(`prompt shell substitution spawn failure: ${message}`, { level: "error" }),
      new MalformedCommandError(
        `Shell substitution failed for pattern "${n}" (detail withheld on this connection)`,
      )
    );
  let formatted = s
    ? `[Error: ${message}]`
    : `[Error]
${message}`;
  throw new MalformedCommandError(formatted);
}

export {
  q9n,
  INVISIBLE_CHAR_REFUSAL,
  xM,
  executeShellCommandsInPrompt,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  withCommandAllowRules,
  qzo,
  jXs,
  findLastPromptIndex,
  d$o,
  findPromptShellCommands,
};
