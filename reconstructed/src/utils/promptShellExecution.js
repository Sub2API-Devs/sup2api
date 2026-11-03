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
import { randomUUID } from "crypto";
import { repeatString } from "./stringUtils.js";
import { env } from "./env.js";
import { getSettingsForSource, getSettings_DEPRECATED } from "./settings/settings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { isToolResultMessage, createAssistantMessage } from "./messages.js";
import { isBashAvailable, isPowerShellToolEnabled } from "./shell/shellToolUtils.js";
import { INSTALL_GIT_FOR_WINDOWS, describeNoBashFallback } from "./hooks/hookCommandResolution.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { INNER_TASK_SUFFIX, PREAMBLE_TASK_SUFFIX } from "../tasks/LocalShellTask/backgroundNotices.js";
import { findToolByName } from "../Tool.js";
import { getToolPermissionContext } from "./permissions/toolPermissionContext.js";
import { hasPermissionsToUseTool } from "./permissions/permissions.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "./debug.js";
import { isBridgeOrTransport } from "../cli/transportState.js";
import { MalformedCommandError, ShellError, errorMessage } from "./errors.js";
import { recordToolUsed } from "../services/compact/keptTools.js";
import { mapAndMaybePersistToolResult, toolResultsDirFor_2 } from "./toolResultStorage.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { stripNonPrintable } from "./truncateGraphemes.js";

//@ chunk-e6aww6q8.js:983407-983529 placement
/**
 * 把文本中不是 !` 起头的行内代码段内容替换为空格（保留长度），避免其中的 !`命令` 被误识别为 shell 执行。
 */
function blankInlineCodeSpans(e) {
  return e.replace(/`[^`\n]+`/g, (n, r) => {
    let s = e[r - 1];
    return s === "!" || s === "`" ? n : "`" + repeatString(" ", n.length - 2) + "`";
  });
}
//@ chunk-e6aww6q8.js:983529-983624 placement
/**
 * escapeShellBangs：转义提示词里的感叹号。
 */
function escapeShellBangs(e) {
  return e
    .replace(/`!/g, "` !")
    .replace(/!`/g, "! `")
    .replace(/(^|\s)!/gm, "$1\\!");
}
//@ chunk-e6aww6q8.js:983624-983690 placement
var SHELL_BLOCK_PATTERN = /```!\s*\n?([\s\S]*?)\n?```/g;
var INLINE_SHELL_COMMAND_PATTERN = /(?<=^|\s)!`([^`]+)`/gm;
//@ chunk-e6aww6q8.js:983690-983744 placement
/**
 * normalizeShellCommandText：统一换行并去空白。
 */
function normalizeShellCommandText(e) {
  return e.trim().replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-e6aww6q8.js:983744-983929 placement
/**
 * 找出提示词中要执行的 shell 命令：```! 代码块与行内 !`命令`，返回原文、解析后的命令与位置。
 */
function findPromptShellCommands(e) {
  let blockMatches = e.matchAll(SHELL_BLOCK_PATTERN);
  let inlineMatches = e.includes("!`") ? blankInlineCodeSpans(e).matchAll(INLINE_SHELL_COMMAND_PATTERN) : [];
  let commands = [];
  for (let match of [...blockMatches, ...inlineMatches]) {
    let command = normalizeShellCommandText(match[1] ?? "");
    if (command)
      commands.push({
        raw: match[0],
        command,
        at: match.index,
      });
  }
  return commands;
}
//@ chunk-e6aww6q8.js:989245-989472 placement
/**
 * 提示词 shell 执行的匹配正则（```! 代码块与行内 !`命令`）以及策略禁用/协调者只读加载时的替换文本。
 */
var SHELL_BLOCK_RE = /```!\s*\n?[\s\S]*?\n?```/g;
var INLINE_SHELL_RE = /(?<=^|\s)!`[^`]+`/gm;
var SHELL_DISABLED_PLACEHOLDER = "[shell command execution disabled by policy]";
var SHELL_DEFERRED_TO_WORKER_PLACEHOLDER =
  "[shell command not executed: read-only skill load on the coordinator \u2014 delegate to a worker to run it]";
//@ chunk-e6aww6q8.js:989472-989633 placement
/**
 * 判断技能中的 shell 命令执行是否被禁用：Cowork 环境、策略设置或普通设置的 disableSkillShellExecution。
 */
function isSkillShellExecutionDisabled() {
  if (env.CLAUDE_CODE_IS_COWORK) return true;
  if (getSettingsForSource("policySettings")?.disableSkillShellExecution === true) return true;
  return getSettings_DEPRECATED().disableSkillShellExecution === true;
}
//@ chunk-e6aww6q8.js:989633-989815 placement
/**
 * 把提示词中的 shell 执行片段（代码块和行内 !`命令`）替换为占位文本。
 */
function replacePromptShellCommands(text, n = SHELL_DISABLED_PLACEHOLDER) {
  let result = text.replace(SHELL_BLOCK_RE, n);
  if (result.includes("!`")) {
    let blanked = blankInlineCodeSpans(result);
    for (let match of [...blanked.matchAll(INLINE_SHELL_RE)].reverse())
      result = result.slice(0, match.index) + n + result.slice(match.index + match[0].length);
  }
  return result;
}
//@ chunk-e6aww6q8.js:989815-989840 placement
var INVISIBLE_CMD_CHARS_RE = /[\u180e\ufeff]/;
//@ chunk-e6aww6q8.js:989840-989875 placement
/**
 * hasInvisibleCommandChars：命令含不可见字符。
 */
function hasInvisibleCommandChars(command) {
  return INVISIBLE_CMD_CHARS_RE.test(command);
}
//@ chunk-e6aww6q8.js:989875-989945 placement
function replaceInvisibleCommandChars(command) {
  return command.replace(new RegExp(INVISIBLE_CMD_CHARS_RE.source, "g"), "\uFFFD");
}
//@ chunk-e6aww6q8.js:989945-990241 placement
/**
 * 命令含不可见字符 U+FEFF 或 U+180E 而未执行时的拒绝说明。
 */
var INVISIBLE_CHAR_REFUSAL =
  "command contains the invisible character U+FEFF (byte order mark) or U+180E (Mongolian vowel separator), and was not run. Remove the character, keep the text that needs it in a file that the command reads, or write it as $([char]0xFEFF) or $([char]0x180E) inside a double-quoted string";
//@ chunk-e6aww6q8.js:3029403-3029433 placement
var TENGU_GLOWING_ORBIT = "tengu_glowing_orbit";
//@ chunk-e6aww6q8.js:3029433-3029470 placement
/**
 * glowingOrbitOn：开关 tengu_glowing_orbit。
 */
function glowingOrbitOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLOWING_ORBIT, true) !== false;
}
//@ chunk-e6aww6q8.js:3029470-3029535 placement
function iterativeFalconOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_falcon", true) !== false && glowingOrbitOn();
}
//@ chunk-e6aww6q8.js:3029535-3029793 placement
function formatRunFirstInstruction({ command, tool }) {
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
//@ chunk-e6aww6q8.js:3029793-3030284 placement
/**
 * 为多条需先执行的命令生成说明：若都用同一工具，提示可合并为一次调用（Bash 用 &&，否则用 ;）；逐条编号列出命令，含反引号或换行的用代码块。
 */
function formatRunAllFirstInstruction(e) {
  let firstTool = e[0]?.tool;
  let sameTool = firstTool !== undefined && e.every((w) => w.tool === firstTool);
  let toolSuffix = sameTool && firstTool !== BASH_TOOL_NAME ? ` with the ${firstTool} tool` : "";
  let joinHint = sameTool
    ? `, or all in one ${firstTool} call joined with ${firstTool === BASH_TOOL_NAME ? "&&" : ";"}`
    : "";
  let header = `[Run these ${e.length} commands first, exactly as written${toolSuffix}, and use their output where each is named below. Run them one per call${joinHint}.]`;
  let lines = e.map(({ command, tool }, index) => {
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
function formatCommandOutputRef({ command }, n) {
  if (/[`\n]/.test(command)) return `[output of command ${n}]`;
  return `[output of command ${n}, \`${command}\`]`;
}
//@ chunk-e6aww6q8.js:3030407-3030555 placement
/**
 * 找出最后一条真实用户提示（有提示来源，或非元消息、非堆叠展开、非工具结果）的下标，找不到为 0。
 */
function findLastPromptIndex(e) {
  return Math.max(
    e.findLastIndex(
      (n) =>
        n.type === "user" &&
        (n.promptSource !== undefined ||
          (n.isMeta !== true && n.stackedExpansion !== true && !isToolResultMessage(n))),
    ),
    0,
  );
}
//@ chunk-e6aww6q8.js:3030555-3030591 placement
var MAX_SHELL_OUTPUT_BYTES = 262144;
var MAX_SHELL_STREAM_BYTES = 134217728;
var MAX_SHELL_HANDOFFS = 64;
//@ chunk-e6aww6q8.js:3030591-3030643 placement
function collapseWhitespace(command) {
  return command.replace(/\s+/g, " ").trim();
}
//@ chunk-e6aww6q8.js:3030643-3030830 placement
function containsCommandToken(e, n) {
  let r = /[\s;&|()<>]/;
  for (let index = e.indexOf(n); index !== -1; index = e.indexOf(n, index + 1)) {
    let h = e[index - 1];
    let y = e[index + n.length];
    if ((h === undefined || r.test(h)) && (y === undefined || r.test(y))) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3030830-3031654 placement
/**
 * 找出交接给指定 agent 的提示词 shell 命令中尚未被执行的：遍历用户消息记录交接命令，再检查助手的工具调用逐行抵消；超出长度/计算预算时放弃返回 undefined。
 */
function findPendingShellHandOffs(messages, agentId) {
  let lengthBudget = MAX_SHELL_OUTPUT_BYTES;
  let workBudget = MAX_SHELL_STREAM_BYTES;
  let pending = new Map();
  for (let message of messages)
    if (message.type === "user") {
      let promptShellHandOff = message.promptShellHandOff;
      if (promptShellHandOff === undefined || promptShellHandOff.agentId !== agentId) continue;
      for (let command of promptShellHandOff.commands) {
        lengthBudget -= command.command.length;
        if (lengthBudget < 0) return;
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
              .map(collapseWhitespace)
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
        let L = collapseWhitespace(input.command);
        for (let [G, state] of pending) {
          workBudget -= MAX_SHELL_HANDOFFS;
          if (state.entry.tool === S.name)
            for (let line of state.pending) workBudget -= (L.length + 1) * (line.length + MAX_SHELL_HANDOFFS);
          if (workBudget < 0) return;
          if (state.entry.tool !== S.name) continue;
          state.pending = state.pending.filter((Z) => !containsCommandToken(L, Z));
          if (state.pending.length === 0) pending.delete(G);
        }
      }
  return [...pending.values()].map((y) => y.entry);
}
//@ chunk-e6aww6q8.js:3031654-3031700 placement
/**
 * pendingShellHandOffs：权限上下文中的待处理 shell 交接。
 */
function pendingShellHandOffs(e, n, agentId) {
  return findPendingShellHandOffs([...e, ...n], agentId);
}
//@ chunk-e6aww6q8.js:3031700-3031957 placement
/**
 * 生成在权限上下文中加入命令允许规则的 AppState 读取函数（poll 事件投递保护开启时不改）。
 */
function withCommandAllowRules(context, n) {
  return () => {
    let appState = context.getAppState();
    if (appState.toolPermissionContext.pollEventDeliveryGuard === true) return appState;
    return {
      ...appState,
      toolPermissionContext: {
        ...appState.toolPermissionContext,
        alwaysAllowRules: {
          ...appState.toolPermissionContext.alwaysAllowRules,
          command: [...n],
        },
      },
    };
  };
}
//@ chunk-e6aww6q8.js:3116579-3116678 callgraph-fingerprint = getPowerShellTool (0.524)
var getPowerShellTool = (() => {
  let cached;
  return () => {
    if (!cached) cached = require("./chunk-v0yfsee9.js").PowerShellTool;
    return cached;
  };
})();
//@ chunk-e6aww6q8.js:3116678-3119119 fingerprint = executeShellCommandsInPrompt (0.36)
/**
 * 执行 Skill/命令文件里的 !`cmd` 与 ```! 块：按 frontmatter shell 选 Bash/PowerShell 工具，逐条做权限检查（GE），auto 模式下需要询问的可移交模型（promptShellHandOff），不允许则抛错；允许则执行并把输出替换进文本。readOnlySkillLoad 时不执行。
 */
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
        : getPowerShellTool();
  let w = context.toolUseId ?? `${randomUUID()}${INNER_TASK_SUFFIX}`;
  let L = iterativeFalconOn();
  let G = findToolByName(context.options.tools, S.name) !== undefined;
  let promptShellHandOff =
    L && getToolPermissionContext(context).mode === "auto" && G ? context.promptShellHandOff : undefined;
  let forPromptShellCommand = L && (promptShellHandOff !== undefined || true);
  if (
    getToolPermissionContext(context).servedCall === true &&
    getToolPermissionContext(context).mode === "auto" &&
    promptShellHandOff === undefined
  )
    return replacePromptShellCommands(text, SHELL_DEFERRED_TO_WORKER_PLACEHOLDER);
  let options = G
    ? context.options
    : {
        ...context.options,
        tools: [...context.options.tools, S],
      };
  let ke = [];
  await Promise.all(
    extractPromptShellCommands(text, S, sourceName).map(async ({ raw, command, at }, Ie) => {
      if (shell === undefined && S !== BashTool) describeNoBashFallback("skill");
      let Me = {
        ...context,
        innerCall: true,
        toolUseId: `${w}${PREAMBLE_TASK_SUFFIX}${Ie}`,
        promptShellHandOff: undefined,
        promptShellPluginId: pluginId,
      };
      try {
        let We = {
          ...context,
          options,
          forPromptShellCommand,
          promptShellHandOff: undefined,
          ...(promptShellHandOff === undefined && {
            asksNoHost: true,
          }),
        };
        let permissionResult = await hasPermissionsToUseTool(
          S,
          {
            command,
          },
          We,
          createAssistantMessage({
            content: [],
          }),
          "",
        );
        let lt =
          permissionResult.behavior === "ask" ||
          (permissionResult.behavior === "deny" && permissionResult.decisionReason?.type === "asyncAgent");
        let Je = false;
        let nt = promptShellHandOff !== undefined && (lt || Je);
        logEvent("tengu_prompt_shell_permission", {
          behavior: fromEnum(permissionResult.behavior),
          mode: fromEnum(getToolPermissionContext(context).mode),
          evaluatedAs: fromEnum(getToolPermissionContext(We).mode),
          decisionReasonType: fromEnumOpt(permissionResult.decisionReason?.type),
          handedToModel: nt,
          handedOffOnAllow: Je,
        });
        if (nt) {
          let entry = {
            command: command.trim(),
            tool: S.name,
          };
          ke.push({
            index: Ie,
            at,
            entry,
          });
          result = result.replace(raw, () => promptShellHandOffPlaceholder(Ie));
          return;
        }
        if (permissionResult.behavior !== "allow") {
          logForDebugging(
            `Shell command permission check failed for command in ${sourceName}: ${command}. Error: ${permissionResult.message}`,
          );
          if (isBridgeOrTransport(Me.session)) {
            logForDebugging(
              `prompt shell permission denial: ${permissionResult.message || "Permission denied"}`,
              {
                level: "error",
              },
            );
            throw new MalformedCommandError(
              `Shell command permission check failed for pattern "${raw}" (detail withheld on this connection)`,
            );
          }
          throw new MalformedCommandError(
            `Shell command permission check failed for pattern "${raw}": ${permissionResult.message || "Permission denied"}`,
          );
        }
        recordToolUsed(S.name);
        let { data } = await S.call(
          {
            command,
          },
          Me,
        );
        let Et = await mapAndMaybePersistToolResult(
          S,
          data,
          randomUUID(),
          toolResultsDirFor_2(Me.session),
          Me.storageV5,
        );
        let yt = typeof Et.content === "string" ? Et.content : formatBashOutput(data.stdout, data.stderr);
        result = result.replace(raw, () => yt);
      } catch (error) {
        if (error instanceof MalformedCommandError) throw error;
        formatBashError(error, raw, Me.session);
      }
    }),
  );
  if (promptShellHandOff !== undefined && ke.length > 0) {
    ke.sort((Ee, Ae) => Ee.at - Ae.at);
    let mapped = ke.map((Ee) => Ee.entry);
    if (ke.length === 1)
      result = result.replace(promptShellHandOffPlaceholder(ke[0].index), () =>
        formatRunFirstInstruction(ke[0].entry),
      );
    else {
      ke.forEach(({ index, entry }, Ie) => {
        result = result.replace(promptShellHandOffPlaceholder(index), () =>
          formatCommandOutputRef(entry, Ie + 1),
        );
      });
      result = `${formatRunAllFirstInstruction(mapped)}

${result}`;
    }
    promptShellHandOff.push(...mapped);
    logFeatureOk("skill_inline_command_handoff");
  }
  return result;
}
//@ chunk-e6aww6q8.js:3119119-3119806 layout
/**
 * 提取文本中的内联/块命令并用工具 inputSchema 校验；不合法（或含不可打印字符）时抛出带说明的错误，一条都不执行。
 */
function extractPromptShellCommands(text, n, sourceName) {
  return findPromptShellCommands(text).map((s) => {
    let h = n.inputSchema.safeParse({
      command: s.command,
    });
    let y = n !== BashTool && hasInvisibleCommandChars(s.command);
    if (h.success && !y) return s;
    let S = h.success ? INVISIBLE_CHAR_REFUSAL : h.error.issues.map((issue) => issue.message).join("; ");
    let w = s.command.includes(`\r
`)
      ? " A \uFFFD at the end of a line is a carriage return from Windows (CR LF) line endings: if the file has them, save it with LF line endings."
      : "";
    throw new MalformedCommandError(
      stripNonPrintable(
        `No shell command in ${sourceName} was run, because the ${n.name} tool does not accept one of them: ${S}. ` +
          `Unprintable characters are shown as \uFFFD below: remove them from the skill or command file, or from the arguments or options substituted into it.${w}
` +
          (y ? replaceInvisibleCommandChars(s.command) : s.command),
      ),
    );
  });
}
//@ chunk-e6aww6q8.js:3119806-3119862 layout
function promptShellHandOffPlaceholder(index) {
  return `\x00promptShellHandOff:${index}\x00`;
}
//@ chunk-e6aww6q8.js:3119862-3120033 fingerprint = formatBashOutput (1)
function formatBashOutput(stdout, stderr, inline = false) {
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
function formatBashError(error, pattern, session, inline = false) {
  if (error instanceof ShellError) {
    if (error.interrupted)
      throw new MalformedCommandError(
        `Shell command interrupted for pattern "${pattern}": [Command interrupted]`,
      );
    let output = formatBashOutput(error.stdout, error.stderr, inline);
    throw new MalformedCommandError(`Shell command failed for pattern "${pattern}": ${output}`);
  }
  let message = errorMessage(error);
  if (isBridgeOrTransport(session)) {
    logForDebugging(`prompt shell substitution spawn failure: ${message}`, {
      level: "error",
    });
    throw new MalformedCommandError(
      `Shell substitution failed for pattern "${pattern}" (detail withheld on this connection)`,
    );
  }
  let formatted = inline
    ? `[Error: ${message}]`
    : `[Error]
${message}`;
  throw new MalformedCommandError(formatted);
}
export {
  hasInvisibleCommandChars,
  INVISIBLE_CHAR_REFUSAL,
  escapeShellBangs,
  executeShellCommandsInPrompt,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  withCommandAllowRules,
  glowingOrbitOn,
  pendingShellHandOffs,
  findLastPromptIndex,
  normalizeShellCommandText,
  findPromptShellCommands,
};
