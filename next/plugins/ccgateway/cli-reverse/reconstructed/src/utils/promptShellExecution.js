/**
 * utils/promptShellExecution.ts
 *
 * 执行 Skill/斜杠命令文本里的 !`cmd` 与 ```! 块：逐条权限检查（auto 模式可移交模型）、执行并把输出替换回文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/promptShellExecution.ts
 * pieces: chunk-5xgkngpb.js (30)
 * attribution: placement 25, fingerprint 3, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getPowerShellTool } from "../tools.js";
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

//@ chunk-5xgkngpb.js:997117-997239 placement
/**
 * 把文本中不是 !` 起头的行内代码段内容替换为空格（保留长度），避免其中的 !`命令` 被误识别为 shell 执行。
 */
function blankInlineCodeSpans(text) {
  return text.replace(/`[^`\n]+`/g, (match, offset) => {
    let prevChar = text[offset - 1];
    return prevChar === "!" || prevChar === "`" ? match : "`" + repeatString(" ", match.length - 2) + "`";
  });
}
//@ chunk-5xgkngpb.js:997239-997334 placement
/**
 * escapeShellBangs：转义提示词里的感叹号。
 */
function escapeShellBangs(text) {
  return text
    .replace(/`!/g, "` !")
    .replace(/!`/g, "! `")
    .replace(/(^|\s)!/gm, "$1\\!");
}
//@ chunk-5xgkngpb.js:997334-997400 placement
var SHELL_BLOCK_PATTERN = /```!\s*\n?([\s\S]*?)\n?```/g;
var INLINE_SHELL_COMMAND_PATTERN = /(?<=^|\s)!`([^`]+)`/gm;
//@ chunk-5xgkngpb.js:997400-997454 placement
/**
 * normalizeShellCommandText：统一换行并去空白。
 */
function normalizeShellCommandText(text) {
  return text.trim().replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-5xgkngpb.js:997454-997639 placement
/**
 * 找出提示词中要执行的 shell 命令：```! 代码块与行内 !`命令`，返回原文、解析后的命令与位置。
 */
function findPromptShellCommands(text) {
  let blockMatches = text.matchAll(SHELL_BLOCK_PATTERN);
  let inlineMatches = text.includes("!`")
    ? blankInlineCodeSpans(text).matchAll(INLINE_SHELL_COMMAND_PATTERN)
    : [];
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
//@ chunk-5xgkngpb.js:1002957-1003184 placement
/**
 * 提示词 shell 执行的匹配正则（```! 代码块与行内 !`命令`）以及策略禁用/协调者只读加载时的替换文本。
 */
var SHELL_BLOCK_RE = /```!\s*\n?[\s\S]*?\n?```/g;
var INLINE_SHELL_RE = /(?<=^|\s)!`[^`]+`/gm;
var SHELL_DISABLED_PLACEHOLDER = "[shell command execution disabled by policy]";
var SHELL_DEFERRED_TO_WORKER_PLACEHOLDER =
  "[shell command not executed: read-only skill load on the coordinator \u2014 delegate to a worker to run it]";
//@ chunk-5xgkngpb.js:1003184-1003345 placement
/**
 * 判断技能中的 shell 命令执行是否被禁用：Cowork 环境、策略设置或普通设置的 disableSkillShellExecution。
 */
function isSkillShellExecutionDisabled() {
  if (env.CLAUDE_CODE_IS_COWORK) return true;
  if (getSettingsForSource("policySettings")?.disableSkillShellExecution === true) return true;
  return getSettings_DEPRECATED().disableSkillShellExecution === true;
}
//@ chunk-5xgkngpb.js:1003345-1003527 placement
/**
 * 把提示词中的 shell 执行片段（代码块和行内 !`命令`）替换为占位文本。
 */
function replacePromptShellCommands(promptText, placeholder = SHELL_DISABLED_PLACEHOLDER) {
  let result = promptText.replace(SHELL_BLOCK_RE, placeholder);
  if (result.includes("!`")) {
    let blanked = blankInlineCodeSpans(result);
    for (let match of [...blanked.matchAll(INLINE_SHELL_RE)].reverse())
      result = result.slice(0, match.index) + placeholder + result.slice(match.index + match[0].length);
  }
  return result;
}
//@ chunk-5xgkngpb.js:1003527-1003552 placement
var INVISIBLE_CMD_CHARS_RE = /[\u180e\ufeff]/;
//@ chunk-5xgkngpb.js:1003552-1003587 placement
/**
 * hasInvisibleCommandChars：命令含不可见字符。
 */
function hasInvisibleCommandChars(command) {
  return INVISIBLE_CMD_CHARS_RE.test(command);
}
//@ chunk-5xgkngpb.js:1003587-1003657 placement
function replaceInvisibleCommandChars(command) {
  return command.replace(new RegExp(INVISIBLE_CMD_CHARS_RE.source, "g"), "\uFFFD");
}
//@ chunk-5xgkngpb.js:1003657-1003953 placement
/**
 * 命令含不可见字符 U+FEFF 或 U+180E 而未执行时的拒绝说明。
 */
var INVISIBLE_CHAR_REFUSAL =
  "command contains the invisible character U+FEFF (byte order mark) or U+180E (Mongolian vowel separator), and was not run. Remove the character, keep the text that needs it in a file that the command reads, or write it as $([char]0xFEFF) or $([char]0x180E) inside a double-quoted string";
//@ chunk-5xgkngpb.js:3105686-3105716 placement
var TENGU_GLOWING_ORBIT = "tengu_glowing_orbit";
//@ chunk-5xgkngpb.js:3105716-3105753 placement
/**
 * glowingOrbitOn：开关 tengu_glowing_orbit。
 */
function glowingOrbitOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GLOWING_ORBIT, true) !== false;
}
//@ chunk-5xgkngpb.js:3105753-3105818 placement
function iterativeFalconOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_falcon", true) !== false && glowingOrbitOn();
}
//@ chunk-5xgkngpb.js:3105818-3106076 placement
function formatRunFirstInstruction({ command, tool }) {
  let instruction =
    tool === BASH_TOOL_NAME
      ? "run this first, exactly as written, and use its output:"
      : `run this first, exactly as written, with the ${tool} tool and use its output:`;
  if (/[`\n]/.test(command))
    return `[${instruction}]
\`\`\`
${command}
\`\`\``;
  return `[${instruction} \`${command}\`]`;
}
//@ chunk-5xgkngpb.js:3106076-3106567 placement
/**
 * 为多条需先执行的命令生成说明：若都用同一工具，提示可合并为一次调用（Bash 用 &&，否则用 ;）；逐条编号列出命令，含反引号或换行的用代码块。
 */
function formatRunAllFirstInstruction(commands) {
  let firstTool = commands[0]?.tool;
  let sameTool = firstTool !== undefined && commands.every((command) => command.tool === firstTool);
  let toolSuffix = sameTool && firstTool !== BASH_TOOL_NAME ? ` with the ${firstTool} tool` : "";
  let joinHint = sameTool
    ? `, or all in one ${firstTool} call joined with ${firstTool === BASH_TOOL_NAME ? "&&" : ";"}`
    : "";
  let header = `[Run these ${commands.length} commands first, exactly as written${toolSuffix}, and use their output where each is named below. Run them one per call${joinHint}.]`;
  let lines = commands.map(({ command, tool }, index) => {
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
//@ chunk-5xgkngpb.js:3106567-3106690 placement
function formatCommandOutputRef({ command }, commandNumber) {
  if (/[`\n]/.test(command)) return `[output of command ${commandNumber}]`;
  return `[output of command ${commandNumber}, \`${command}\`]`;
}
//@ chunk-5xgkngpb.js:3106690-3106838 placement
/**
 * 找出最后一条真实用户提示（有提示来源，或非元消息、非堆叠展开、非工具结果）的下标，找不到为 0。
 */
function findLastPromptIndex(messages) {
  return Math.max(
    messages.findLastIndex(
      (message) =>
        message.type === "user" &&
        (message.promptSource !== undefined ||
          (message.isMeta !== true && message.stackedExpansion !== true && !isToolResultMessage(message))),
    ),
    0,
  );
}
//@ chunk-5xgkngpb.js:3106838-3106874 placement
var MAX_SHELL_OUTPUT_BYTES = 262144;
var MAX_SHELL_STREAM_BYTES = 134217728;
var MAX_SHELL_HANDOFFS = 64;
//@ chunk-5xgkngpb.js:3106874-3106926 placement
function collapseWhitespace(command) {
  return command.replace(/\s+/g, " ").trim();
}
//@ chunk-5xgkngpb.js:3106926-3107113 placement
function containsCommandToken(text, token) {
  let tokenSeparator = /[\s;&|()<>]/;
  for (let index = text.indexOf(token); index !== -1; index = text.indexOf(token, index + 1)) {
    let before = text[index - 1];
    let after = text[index + token.length];
    if (
      (before === undefined || tokenSeparator.test(before)) &&
      (after === undefined || tokenSeparator.test(after))
    )
      return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:3107113-3107941 placement
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
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        let input = block.input;
        if (
          typeof input !== "object" ||
          input === null ||
          !("command" in input) ||
          typeof input.command !== "string"
        )
          continue;
        let commandText = collapseWhitespace(input.command);
        for (let [key, state] of pending) {
          workBudget -= MAX_SHELL_HANDOFFS;
          if (state.entry.tool === block.name)
            for (let line of state.pending)
              workBudget -= (commandText.length + 1) * (line.length + MAX_SHELL_HANDOFFS);
          if (workBudget < 0) return;
          if (state.entry.tool !== block.name) continue;
          state.pending = state.pending.filter((line) => !containsCommandToken(commandText, line));
          if (state.pending.length === 0) pending.delete(key);
        }
      }
  return [...pending.values()].map((state) => state.entry);
}
//@ chunk-5xgkngpb.js:3107941-3107987 placement
/**
 * pendingShellHandOffs：权限上下文中的待处理 shell 交接。
 */
function pendingShellHandOffs(messages, extraMessages, agentId) {
  return findPendingShellHandOffs([...messages, ...extraMessages], agentId);
}
//@ chunk-5xgkngpb.js:3107987-3108244 placement
/**
 * 生成在权限上下文中加入命令允许规则的 AppState 读取函数（poll 事件投递保护开启时不改）。
 */
function withCommandAllowRules(context, commandRules) {
  return () => {
    let appState = context.getAppState();
    if (appState.toolPermissionContext.pollEventDeliveryGuard === true) return appState;
    return {
      ...appState,
      toolPermissionContext: {
        ...appState.toolPermissionContext,
        alwaysAllowRules: {
          ...appState.toolPermissionContext.alwaysAllowRules,
          command: [...commandRules],
        },
      },
    };
  };
}
//@ chunk-5xgkngpb.js:3203201-3205644 fingerprint (2.1.88 match: executeShellCommandsInPrompt, 0.368)
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
  let tool =
    shell === "powershell" && isPowerShellToolEnabled()
      ? getPowerShellTool()
      : isBashAvailable()
        ? BashTool
        : getPowerShellTool();
  let toolUseId = context.toolUseId ?? `${randomUUID()}${INNER_TASK_SUFFIX}`;
  let handOffEnabled = iterativeFalconOn();
  let toolAvailable = findToolByName(context.options.tools, tool.name) !== undefined;
  let promptShellHandOff =
    handOffEnabled && getToolPermissionContext(context).mode === "auto" && toolAvailable
      ? context.promptShellHandOff
      : undefined;
  let forPromptShellCommand = handOffEnabled && (promptShellHandOff !== undefined || true);
  if (
    getToolPermissionContext(context).servedCall === true &&
    getToolPermissionContext(context).mode === "auto" &&
    promptShellHandOff === undefined
  )
    return replacePromptShellCommands(text, SHELL_DEFERRED_TO_WORKER_PLACEHOLDER);
  let options = toolAvailable
    ? context.options
    : {
        ...context.options,
        tools: [...context.options.tools, tool],
      };
  let handOffs = [];
  await Promise.all(
    extractPromptShellCommands(text, tool, sourceName).map(async ({ raw, command, at }, index) => {
      if (shell === undefined && tool !== BashTool) describeNoBashFallback("skill");
      let innerContext = {
        ...context,
        innerCall: true,
        toolUseId: `${toolUseId}${PREAMBLE_TASK_SUFFIX}${index}`,
        promptShellHandOff: undefined,
        promptShellPluginId: pluginId,
      };
      try {
        let callContext = {
          ...context,
          options,
          forPromptShellCommand,
          promptShellHandOff: undefined,
          ...(promptShellHandOff === undefined && {
            asksNoHost: true,
          }),
        };
        let permissionResult = await hasPermissionsToUseTool(
          tool,
          {
            command,
          },
          callContext,
          createAssistantMessage({
            content: [],
          }),
          "",
        );
        let needsAsk =
          permissionResult.behavior === "ask" ||
          (permissionResult.behavior === "deny" && permissionResult.decisionReason?.type === "asyncAgent");
        let handOffOnAllow = false;
        let handToModel = promptShellHandOff !== undefined && (needsAsk || handOffOnAllow);
        logEvent("tengu_prompt_shell_permission", {
          behavior: fromEnum(permissionResult.behavior),
          mode: fromEnum(getToolPermissionContext(context).mode),
          evaluatedAs: fromEnum(getToolPermissionContext(callContext).mode),
          decisionReasonType: fromEnumOpt(permissionResult.decisionReason?.type),
          handedToModel: handToModel,
          handedOffOnAllow: handOffOnAllow,
        });
        if (handToModel) {
          let entry = {
            command: command.trim(),
            tool: tool.name,
          };
          handOffs.push({
            index,
            at,
            entry,
          });
          result = result.replace(raw, () => promptShellHandOffPlaceholder(index));
          return;
        }
        if (permissionResult.behavior !== "allow") {
          logForDebugging(
            `Shell command permission check failed for command in ${sourceName}: ${command}. Error: ${permissionResult.message}`,
          );
          if (isBridgeOrTransport(innerContext.session)) {
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
        recordToolUsed(tool.name);
        let { data } = await tool.call(
          {
            command,
          },
          innerContext,
        );
        let toolResult = await mapAndMaybePersistToolResult(
          tool,
          data,
          randomUUID(),
          toolResultsDirFor_2(innerContext.session),
          innerContext.storageV5,
        );
        let outputText =
          typeof toolResult.content === "string"
            ? toolResult.content
            : formatBashOutput(data.stdout, data.stderr);
        result = result.replace(raw, () => outputText);
      } catch (error) {
        if (error instanceof MalformedCommandError) throw error;
        formatBashError(error, raw, innerContext.session);
      }
    }),
  );
  if (promptShellHandOff !== undefined && handOffs.length > 0) {
    handOffs.sort((left, right) => left.at - right.at);
    let commands = handOffs.map((handOff) => handOff.entry);
    if (handOffs.length === 1)
      result = result.replace(promptShellHandOffPlaceholder(handOffs[0].index), () =>
        formatRunFirstInstruction(handOffs[0].entry),
      );
    else {
      handOffs.forEach(({ index, entry }, handOffIndex) => {
        result = result.replace(promptShellHandOffPlaceholder(index), () =>
          formatCommandOutputRef(entry, handOffIndex + 1),
        );
      });
      result = `${formatRunAllFirstInstruction(commands)}

${result}`;
    }
    promptShellHandOff.push(...commands);
    logFeatureOk("skill_inline_command_handoff");
  }
  return result;
}
//@ chunk-5xgkngpb.js:3205644-3206331 layout
/**
 * 提取文本中的内联/块命令并用工具 inputSchema 校验；不合法（或含不可打印字符）时抛出带说明的错误，一条都不执行。
 */
function extractPromptShellCommands(text, tool, sourceName) {
  return findPromptShellCommands(text).map((command) => {
    let parseResult = tool.inputSchema.safeParse({
      command: command.command,
    });
    let hasInvisibleChars = tool !== BashTool && hasInvisibleCommandChars(command.command);
    if (parseResult.success && !hasInvisibleChars) return command;
    let reason = parseResult.success
      ? INVISIBLE_CHAR_REFUSAL
      : parseResult.error.issues.map((issue) => issue.message).join("; ");
    let crlfNote = command.command.includes(`\r
`)
      ? " A \uFFFD at the end of a line is a carriage return from Windows (CR LF) line endings: if the file has them, save it with LF line endings."
      : "";
    throw new MalformedCommandError(
      stripNonPrintable(
        `No shell command in ${sourceName} was run, because the ${tool.name} tool does not accept one of them: ${reason}. ` +
          `Unprintable characters are shown as \uFFFD below: remove them from the skill or command file, or from the arguments or options substituted into it.${crlfNote}
` +
          (hasInvisibleChars ? replaceInvisibleCommandChars(command.command) : command.command),
      ),
    );
  });
}
//@ chunk-5xgkngpb.js:3206331-3206387 layout
function promptShellHandOffPlaceholder(index) {
  return `\x00promptShellHandOff:${index}\x00`;
}
//@ chunk-5xgkngpb.js:3206387-3206558 fingerprint (2.1.88 match: formatBashOutput, 1)
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
//@ chunk-5xgkngpb.js:3206558-3207037 fingerprint (2.1.88 match: formatBashError, 0.782)
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
  escapeShellBangs,
  isSkillShellExecutionDisabled,
  replacePromptShellCommands,
  executeShellCommandsInPrompt,
  withCommandAllowRules,
  hasInvisibleCommandChars,
  INVISIBLE_CHAR_REFUSAL,
  normalizeShellCommandText,
  findPromptShellCommands,
  glowingOrbitOn,
  pendingShellHandOffs,
  findLastPromptIndex,
};
