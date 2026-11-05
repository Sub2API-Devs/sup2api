/**
 * services/extractMemories/extractMemories.ts
 *
 * 回合结束后的自动记忆提取：节流、跳过条件、hosted post-turn 配置、记忆代理的工具权限守卫。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/extractMemories/extractMemories.ts
 * pieces: chunk-70rvh5wm.js (29), chunk-t5chern7.js (1)
 * attribution: placement 25, fingerprint 1, file-local 1, layout 2, facade-majority 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalize, sep, basename } from "path";
import { booleanishSchema } from "../../utils/spellcheck.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { parseForSecurity } from "../../utils/bash/ast.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { expandPath } from "../../utils/path.js";
import {
  getDenyRuleForTool,
  findAskRuleForTool,
  isRuleOrReadBlockReason,
  isPersonTypesHold,
  deniedBashRules,
  askedBashRules,
  toolMatchesRule,
} from "../../utils/permissions/permissions.js";
import {
  matchingRuleForInput,
  checkReadNetworkPathSafety,
  checkReadPermissionForTool,
  normalizeCaseForComparison_2,
} from "../../utils/permissions/filesystem.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import {
  isAutoMemPathSafeForCarveout,
  isAutoMemoryHeldForSession,
  isDangerousMemoryRoot,
  getAutoMemEntrypoint,
  getAutoMemPath,
  isExtractModeActive,
  isAutoMemoryEnabled,
} from "../../memdir/paths.js";
import { MEMORY_PAUSED_MESSAGE, OUTSIDE_READS_BLOCKED_DENY_REASON } from "../../types/permissions.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { getPlatform } from "../../utils/platform.js";
import { isAutoMemPathFromRepoSettings, isAutoMemReadFenced } from "../../utils/permissions/readBlock.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import {
  getMemoryToggledOff,
  getPromptIndex,
  getSessionId,
  getLastPersonPrompt,
  isRestrictedSession,
} from "../../bootstrap/state.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import {
  isAccountMemoryServer,
  findMemoryServer,
  MEMORY_BACKGROUND_ALLOWED_TOOLS,
  MEMORY_MUTATING_TOOLS,
  getHostedPostTurnMemoryConfig,
  buildMemoryCallMeta,
  MEMORY_WRITE_TOOL,
  parsePostTurnMemoryConfig,
} from "../../memdir/memoryTool.js";
import {
  collectReadToolFilePaths,
  MIN_TURNS_SINCE,
  memoryExtractorSlots,
  countTurnsSince,
  afterAnchorMessages,
  summarizeUserTurns,
  isMemoryCandidateTurn,
  hasSubstantialTurnSince,
  turnCountBucket,
  proseWordEquivalent,
  lastUserTurnText,
  describeRuleBlock,
  describeMemoryRuleBlock,
  runMemoryFirstLook,
  registerPostTurnMemoryTask,
  getLastHumanTurnUuid,
  messagesNotIn,
  hasMaxTurnsReached,
  lastAssistantWasApiError,
  resyncMemoryWrites,
  finishMemoryTask,
} from "./memdirResync.js";
import { countWhere } from "../../utils/collections.js";
import { MEMORY_INDEX_FILENAME } from "../../memdir/memdir.js";
import { plural } from "../../utils/stringUtils.js";
import { logFileStateResync } from "../../utils/readFileInRange.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { hasKnownPlanTier } from "../../utils/planTiers.js";
import { env } from "../../utils/env.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { createAbortController, createChildAbortController } from "../../utils/abortController.js";
import { isSessionActive } from "../../utils/sessionActivity.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { createCacheSafeParams, runForkedAgent } from "../../utils/forkedAgent.js";
import { createSystemMessage, createUserMessage, createMemorySavedMessage } from "../../utils/messages.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import {
  heldMemoryVersions,
  buildStaleReadNotice,
  heldPostTurnInstruction,
  mergeReadVersions,
} from "../accountMemory/memoryContext.js";
import { messagesSinceCompactBoundary, isCompactBoundaryMessage } from "../projects/threadRows.js";
import { findStaleCarriedReads } from "../accountMemory/memoryUpdates.js";
import { estimateTokensWithAnchor } from "../compact/autoCompact.js";
import { isSharedMemoryServedViaTools } from "../../memdir/memoryStoresPrompt.js";
import { canUseTeamMemory, isTeamMemPath } from "../../memdir/teamMemPaths.js";
import { formatMemoryManifest, scanMemoryFiles } from "../../memdir/memoryScan.js";
import { buildExtractMemoriesPrompt } from "./prompts.js";
import { makeSaltedName } from "../../utils/agentId.js";
import { isBasaltSpurEnabled } from "../api/claude.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { matchesToolName } from "../../Tool.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { applyCoordinatorToolFilter } from "../../utils/toolPool.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-t5chern7.js:227-848 placement
/**
 * 检查后台记忆代理等受限调用方的 Bash 输入：要求关闭沙箱或后台运行时拒绝并给出说明，否则返回把两项强制为 false 的输入。
 */
function sanitizeBackgroundBashInput(callerName, input) {
  let parsed = booleanishSchema().safeParse(input.dangerouslyDisableSandbox);
  if (parsed.success && parsed.data)
    return {
      deniedFlag: "dangerouslyDisableSandbox",
      message: `unsandboxed execution (dangerouslyDisableSandbox) is not available to ${callerName}. If the command failed with a sandbox violation, the operation cannot be performed in this context \u2014 do not retry it.`,
    };
  let text = booleanishSchema().safeParse(input.run_in_background);
  if (text.success && text.data)
    return {
      deniedFlag: "run_in_background",
      message: `run_in_background is not available to ${callerName} \u2014 run the command in the foreground.`,
    };
  return {
    sanitizedInput: {
      ...input,
      dangerouslyDisableSandbox: false,
      run_in_background: false,
    },
  };
}
//@ chunk-70rvh5wm.js:13940-14044 placement
/**
 * 记忆试验运行器（servedTrial / runTrial）。
 */
var laptopExtractModule_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var laptopExtractModule;
var extractorRuntime;
var memoryTrialRunner;
var DELETE_COMMAND_NAMES;
var regExp;
deferInit("chunk-70rvh5wm.js:13940", () => {
  laptopExtractModule_2 = null;
  laptopExtractModule = null;
  extractorRuntime = null;
  memoryTrialRunner = null;
  DELETE_COMMAND_NAMES = "rm|remove-item|ri|del|erase";
  regExp = new RegExp(`^(?:${DELETE_COMMAND_NAMES})$`, "i");
});
//@ chunk-70rvh5wm.js:14044-14257 fingerprint (2.1.88 match: denyAutoMemTool, 1)
/**
 * 拒绝记忆代理的工具调用并打 tengu_auto_mem_tool_denied（带原因）。
 */
function denyAutoMemTool(tool, reason, source, reportDenial = true) {
  logForDebugging(`[autoMem] denied ${tool.name} (${source}): ${reason}`);
  if (reportDenial)
    logEvent("tengu_auto_mem_tool_denied", {
      tool_name: sanitizeToolNameForAnalytics(tool.name),
      reason: fromEnum(source),
    });
  return {
    behavior: "deny",
    message: reason,
    decisionReason: {
      type: "other",
      reason,
    },
  };
}
//@ chunk-70rvh5wm.js:14257-14680 placement
/**
 * 从工具调用中提取记忆代理写入的文件路径。
 */
function parseToolNamesInMessage(command, autoMemRoot) {
  let tokens = command.trim().match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  if (tokens.length < 2) return;
  if (!regExp.test(tokens[0])) return;
  let parts = [];
  for (let k = 1; k < tokens.length; k++) {
    let arg = tokens[k];
    if (/^-(?:Literal)?Path$/i.test(arg)) continue;
    if (arg.startsWith("-")) return;
    let unquoted =
      (arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))
        ? arg.slice(1, -1)
        : arg;
    if (/[*?[\]$`(){}|;&<>"',]/.test(unquoted)) return;
    if (!isAllowedAutoMemWritePath(unquoted, autoMemRoot)) return;
    parts.push(unquoted);
  }
  return parts.length > 0 ? parts : undefined;
}
//@ chunk-70rvh5wm.js:14680-14840 placement
/**
 * 记忆提取允许的文件工具集合，以及恢复记忆结果的说明文字表。
 */
var MEMORY_FILE_TOOLS; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var RESTORE_OUTCOME_TEXT;
deferInit("chunk-70rvh5wm.js:14680", () => {
  MEMORY_FILE_TOOLS = new Set([READ, GREP_TOOL_NAME, GLOB_TOOL_NAME, EDIT, FILE_WRITE_TOOL_NAME]);
  RESTORE_OUTCOME_TEXT = {
    restored: "restored",
    none_saved: "none saved",
    not_in_transcript: "not restored: that message is no longer in the transcript",
  };
});
//@ chunk-70rvh5wm.js:14840-15404 placement
/**
 * 判断 Bash 命令是否只是对给定目录的简单 ls：单条命令、参数为字面量、无重定向/环境变量，非选项参数都解析到该目录（不含通配、..、~、反斜杠）。
 */
async function isSimpleLsOfDir(command, dir) {
  let parsed = await parseForSecurity(command);
  if (parsed.kind !== "simple" || parsed.commands.length !== 1) return false;
  let parsed_2 = parsed.commands[0];
  if (
    parsed_2 === undefined ||
    parsed_2.argvSourceLiteral !== true ||
    parsed_2.argv[0] !== "ls" ||
    parsed_2.redirects.length > 0 ||
    parsed_2.envVars.length > 0
  )
    return false;
  let stripTrailingSep = (pathValue) => pathValue.replace(/[/\\]+$/, "");
  let allowedPaths = new Set(getPathsForPermissionCheck(dir).map(stripTrailingSep));
  let pathArgs = parsed_2.argv.slice(1).filter((arg) => !/^-[laA1hF]+$/.test(arg));
  return (
    pathArgs.length > 0 &&
    pathArgs.every((pathArg) => {
      if (
        pathArg.startsWith("-") ||
        pathArg.startsWith("~") ||
        pathArg !== pathArg.trim() ||
        pathArg.split(/[/\\]/).includes("..") ||
        /[*?[]/.test(pathArg) ||
        pathArg.includes("\\")
      )
        return false;
      try {
        return getPathsForPermissionCheck(expandPath(pathArg)).every((resolved) =>
          allowedPaths.has(stripTrailingSep(resolved)),
        );
      } catch {
        return false;
      }
    })
  );
}
//@ chunk-70rvh5wm.js:15404-15479 placement
/**
 * 去掉引号后字符串里是否包含 ".."（路径穿越检测）。
 */
function hasParentTraversal(command) {
  return command.replace(/['"`\\\u2018-\u201F]/g, "").includes("..");
}
//@ chunk-70rvh5wm.js:15759-15976 placement
function memoryWriteBlockingRule(toolPermissionContext, autoMemEntrypoint) {
  try {
    for (let name of [FILE_WRITE_TOOL_NAME, EDIT]) {
      let rule =
        getDenyRuleForTool(toolPermissionContext, {
          name,
        }) ??
        findAskRuleForTool(toolPermissionContext, {
          name,
        });
      if (rule !== null) return rule;
    }
    for (let memPath of getPathsForPermissionCheck(autoMemEntrypoint))
      for (let behavior of ["deny", "ask"]) {
        let matchingRule = matchingRuleForInput(memPath, toolPermissionContext, "edit", behavior);
        if (matchingRule !== null) return matchingRule;
      }
  } catch (error) {
    logError(toError(error));
  }
  return;
}
//@ chunk-70rvh5wm.js:15976-16542 placement
/**
 * 解析只删除自动记忆目录内文件的 rm 命令：单条简单命令，只允许 -f/--force 与 --，不允许通配，所有目标为允许写入的绝对路径；返回目标列表，不符合返回 undefined。
 */
async function parseAutoMemRm(command, memDir) {
  let parsed = await parseForSecurity(command);
  if (parsed.kind !== "simple" || parsed.usesAssignedValue === true || parsed.laterLoopPassesDiffer === true)
    return;
  if (parsed.commands.length !== 1) return;
  let parsed_2 = parsed.commands[0];
  if (!parsed_2) return;
  if (parsed_2.argv[0] !== "rm") return;
  if (parsed_2.redirects.length > 0) return;
  if (parsed_2.envVars.length > 0) return;
  let targets = [];
  let path = false;
  for (let k = 1; k < parsed_2.argv.length; k++) {
    let resolved = parsed_2.argv[k];
    if (resolved === undefined) continue;
    if (!path) {
      if (resolved === "--") {
        path = true;
        continue;
      }
      if (resolved.startsWith("-")) {
        if (resolved === "-f" || resolved === "--force") continue;
        return;
      }
    }
    if (/[*?[]/.test(resolved)) return;
    if (!resolved.startsWith("/") || !isAllowedAutoMemWritePath(resolved, memDir)) return;
    targets.push(resolved);
  }
  return targets.length > 0 ? targets : undefined;
}
//@ chunk-70rvh5wm.js:16542-16641 placement (2.1.88 match: isSessionPlanFile, 1)
function isAllowedAutoMemWritePath(path, dir) {
  let included = normalize(path).slice(dir.length).includes(":");
  return path.endsWith(".md") && !included && isAutoMemPathSafeForCarveout(path, dir);
}
//@ chunk-70rvh5wm.js:16641-20356 placement (2.1.88 match: createAutoMemCanUseTool, 0.257)
/**
 * 记忆提取/整理子代理的 canUseTool：拒绝 MCP 工具、需 hook 确认的调用、危险 shell 参数，只允许在记忆目录内读写，删除命令受限。
 */
function createAutoMemCanUseTool(autoMemDir, settings, { fork = "dream", onWriteAllowed } = {}) {
  return async (tool, input, context, assistantMessage, toolUseId, deferredDecision) => {
    if (isAutoMemoryHeldForSession()) return denyAutoMemTool(tool, MEMORY_PAUSED_MESSAGE, "memory_paused");
    if (tool.mcpInfo)
      return denyAutoMemTool(tool, "MCP tools are not available to the memory agent", "mcp_tool");
    if (deferredDecision !== undefined || context.hookAskFloor)
      return denyAutoMemTool(
        tool,
        "a PreToolUse hook requires confirmation for this call, and the memory agent runs headless with no user to answer \u2014 the call is denied",
        "hook_ask",
      );
    let sanitizedInput;
    if (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) {
      let shellCheck = sanitizeBackgroundBashInput("the memory agent", input);
      if (shellCheck.deniedFlag !== undefined) return denyAutoMemTool(tool, shellCheck.message, "shell_flag");
      sanitizedInput = shellCheck.sanitizedInput;
      if (
        getPlatform() === "windows" &&
        context.getAppState().toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
        typeof input.command === "string" &&
        hasParentTraversal(input.command)
      )
        return denyAutoMemTool(
          tool,
          "On Windows with permissions.blockReadsOutsideWorkingDirectories on, the memory agent's shell commands may not contain '..' anywhere, even split by quotes or a backslash, because where it leads cannot be checked. Use absolute paths, and avoid '..' in patterns too.",
          "windows_dot_dot",
        );
    }
    try {
      let permissionsModule = require("../../utils/permissions/permissions.js");
      let { checkRuleBasedPermissions } = permissionsModule;
      let { carriesAskRuleIntent } = permissionsModule;
      let appState = context.getAppState();
      let replaced = autoMemDir.replace(/[/\\]+$/, "");
      let carveOut =
        appState.toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
        appState.toolPermissionContext.restricted !== true &&
        !isAutoMemPathFromRepoSettings() &&
        ![replaced, ...getPathsForPermissionCheck(replaced)].some((candidatePath) =>
          isDangerousMemoryRoot(candidatePath.replace(/[/\\]+$/, "")),
        );
      let baseToolContext = {
        ...context,
        toolUseId,
      };
      let memDirToolContext = {
        ...baseToolContext,
        getAppState: () => ({
          ...appState,
          toolPermissionContext: {
            ...appState.toolPermissionContext,
            additionalWorkingDirectories: new Map([
              ...appState.toolPermissionContext.additionalWorkingDirectories,
              [
                replaced,
                {
                  path: replaced,
                  source: "session",
                },
              ],
            ]),
          },
        }),
      };
      let ruleDecision = await checkRuleBasedPermissions(
        tool,
        input,
        carveOut && MEMORY_FILE_TOOLS.has(tool.name) ? memDirToolContext : baseToolContext,
        {
          crashIsObjection: true,
        },
      );
      let allowSimpleLs =
        ruleDecision?.behavior === "ask" &&
        getPlatform() !== "windows" &&
        carveOut &&
        tool.name === BASH_TOOL_NAME &&
        ruleDecision.decisionReason?.type === "safetyCheck" &&
        ruleDecision.decisionReason.circuitBreaker === "outsideReadsBlocked" &&
        !carriesAskRuleIntent(ruleDecision) &&
        typeof input.command === "string" &&
        (await isSimpleLsOfDir(input.command, autoMemDir)) &&
        (await checkRuleBasedPermissions(tool, input, memDirToolContext, {
          crashIsObjection: true,
        })) === null;
      if (ruleDecision !== null && !allowSimpleLs)
        return denyAutoMemTool(
          tool,
          ruleDecision.message ?? "a configured permission rule blocks this call for the memory agent",
          isRuleOrReadBlockReason(ruleDecision.decisionReason, "rule") ||
            (ruleDecision.behavior === "ask" && carriesAskRuleIntent(ruleDecision))
            ? "permission_rule"
            : isRuleOrReadBlockReason(ruleDecision.decisionReason, "read_block")
              ? "read_block"
              : "permission_check",
        );
    } catch (error) {
      logError(toError(error));
      return denyAutoMemTool(
        tool,
        "the memory agent could not evaluate configured permission rules; failing closed",
        "rule_check_failed",
      );
    }
    if (tool.name === REPL_TOOL_NAME)
      return {
        behavior: "allow",
        updatedInput: input,
      };
    if (tool.name === READ || tool.name === GREP_TOOL_NAME || tool.name === GLOB_TOOL_NAME) {
      let toolPermissionContext = context.getAppState().toolPermissionContext;
      let networkPathIssue = checkReadNetworkPathSafety(tool, input, toolPermissionContext);
      if (networkPathIssue) return denyAutoMemTool(tool, networkPathIssue.message, "network_path");
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
        let readDecision = checkReadPermissionForTool(tool, input, toolPermissionContext);
        if (readDecision.behavior === "deny") {
          let path = tool.getPath?.(input);
          let mapped = getPathsForPermissionCheck(autoMemDir).map((allowedRoot) =>
            allowedRoot.endsWith(sep) ? allowedRoot : allowedRoot + sep,
          );
          if (
            !(
              path !== undefined &&
              !isAutoMemPathFromRepoSettings() &&
              getPathsForPermissionCheck(path).every((readPath) =>
                mapped.some((rootPrefix) => isAutoMemPathSafeForCarveout(readPath, rootPrefix)),
              )
            ) ||
            readDecision.decisionReason.type !== "other" ||
            readDecision.decisionReason.reason !== OUTSIDE_READS_BLOCKED_DENY_REASON
          )
            return denyAutoMemTool(tool, readDecision.message, "read_block");
        }
      }
      return {
        behavior: "allow",
        updatedInput: input,
      };
    }
    if (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) {
      let updatedInput = sanitizedInput ?? input;
      let parsed = tool.inputSchema.safeParse(input);
      if (parsed.success) {
        if (tool.isReadOnly(parsed.data, context))
          return {
            behavior: "allow",
            updatedInput,
          };
        let command = parsed.data.command;
        if (typeof command === "string") {
          if (
            (tool.name === BASH_TOOL_NAME
              ? await parseAutoMemRm(command, autoMemDir)
              : parseToolNamesInMessage(command, autoMemDir)) !== undefined
          )
            return {
              behavior: "allow",
              updatedInput,
            };
        }
      }
      let isBash = tool.name === BASH_TOOL_NAME;
      return denyAutoMemTool(
        tool,
        `Only read-only shell commands and ${isBash ? "rm (no flags except -f)" : "Remove-Item"} of .md files under ${autoMemDir} (not protected subdirectories like .git or agents) are permitted in this context (${isBash ? "ls, find, grep, cat, stat, wc, head, tail, and similar" : "Get-ChildItem, Get-Content, Select-Object -First/-Last, and similar"})`,
        "shell_not_allowed",
      );
    }
    if ((tool.name === EDIT || tool.name === FILE_WRITE_TOOL_NAME) && "file_path" in input) {
      let filePath = input.file_path;
      if (typeof filePath === "string" && isAllowedAutoMemWritePath(filePath, autoMemDir)) {
        onWriteAllowed?.(filePath, toolUseId);
        return {
          behavior: "allow",
          updatedInput: input,
        };
      }
    }
    let shellToolName = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    return denyAutoMemTool(
      tool,
      `only ${READ}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${shellToolName}, and ${EDIT}/${FILE_WRITE_TOOL_NAME} within ${autoMemDir} are allowed`,
      "tool_not_allowed",
    );
  };
}
//@ chunk-70rvh5wm.js:20356-21281 placement
/**
 * 构造后台记忆提取的 canUseTool：记忆被关闭、会话工具调用被挂起、没有 CCR 记忆服务器、命中 deny/ask 规则、工具不在允许列表、或已有更新的用户回合（写类工具）时拒绝；ToolSearch/REPL 直接放行。
 */
function makeMemoryPassCanUseTool(promptIndex, onAbort, reportDenial = true) {
  return async (tool, input, context) => {
    if (getMemoryToggledOff())
      return denyAutoMemTool(tool, MEMORY_PAUSED_MESSAGE, "memory_paused", reportDenial);
    let toolPermissionContext = context.getAppState().toolPermissionContext;
    if (isPersonTypesHold(toolPermissionContext)) {
      onAbort();
      return denyAutoMemTool(
        tool,
        "tool calls are held in this session until the user writes; this background memory pass cannot run",
        "tools_held",
        reportDenial,
      );
    }
    if (tool.name === TOOL_SEARCH_TOOL_NAME || tool.name === REPL_TOOL_NAME)
      return {
        behavior: "allow",
        updatedInput: input,
      };
    if (!isAccountMemoryServer(findMemoryServer(context.options.mcpClients)))
      return denyAutoMemTool(
        tool,
        "the session has no CCR memory server; this background memory pass cannot run",
        "no_memory_server",
        reportDenial,
      );
    if (
      [...deniedBashRules(toolPermissionContext), ...askedBashRules(toolPermissionContext)].some((context) =>
        toolMatchesRule(toolPermissionContext, tool, context),
      )
    )
      return denyAutoMemTool(
        tool,
        `${tool.name} is blocked by a permission rule for this session`,
        "permission_rule",
        reportDenial,
      );
    if (!MEMORY_BACKGROUND_ALLOWED_TOOLS.has(tool.name))
      return denyAutoMemTool(
        tool,
        `this background memory pass may only call ${[...MEMORY_BACKGROUND_ALLOWED_TOOLS].join(", ")}`,
        "tool_not_allowed",
        reportDenial,
      );
    if (MEMORY_MUTATING_TOOLS.has(tool.name) && getPromptIndex() !== promptIndex) {
      onAbort();
      return denyAutoMemTool(
        tool,
        "a newer user turn has started; this background memory pass may no longer write",
        "newer_turn",
        reportDenial,
      );
    }
    return {
      behavior: "allow",
      updatedInput: input,
    };
  };
}
//@ chunk-70rvh5wm.js:21281-21496 placement
function collectErroredToolUseIds(messages) {
  let erroredIds = new Set();
  for (let message of messages) {
    if (message.type !== "user") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content)
      if (block.type === "tool_result" && block.is_error === true) erroredIds.add(block.tool_use_id);
  }
  return erroredIds;
}
//@ chunk-70rvh5wm.js:21496-21602 placement
function getAutoMemReadPath(messages, index) {
  let readToolFilePaths = collectReadToolFilePaths(messages);
  if (readToolFilePaths === undefined) return;
  let expanded;
  try {
    expanded = expandPath(readToolFilePaths);
  } catch {
    return;
  }
  return isAllowedAutoMemWritePath(expanded, index) ? expanded : undefined;
}
//@ chunk-70rvh5wm.js:21602-21851 file-local
function extractWrittenPaths(agentMessages, index) {
  let erroredToolUseIds = collectErroredToolUseIds(agentMessages);
  let ids = [];
  for (let message of agentMessages) {
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let message of content) {
      if (message.type === "tool_use" && erroredToolUseIds.has(message.id)) continue;
      let filePath = getAutoMemReadPath(message, index);
      if (filePath !== undefined) ids.push(filePath);
    }
  }
  return normalizeCaseForComparison_2(ids);
}
//@ chunk-70rvh5wm.js:21851-22006 placement
function buildExtractNotice(paths) {
  let savedCount = countWhere(paths, (path) => basename(path) !== MEMORY_INDEX_FILENAME);
  return {
    source: "extract",
    summary:
      savedCount > 0
        ? `saved ${savedCount} ${plural(savedCount, "memory", "memories")}`
        : "updated the memory index",
    paths,
  };
}
//@ chunk-70rvh5wm.js:22006-22538 placement
function makeRememberSink(fileState, sinceUuid) {
  let pathByToolUseId = new Map();
  let writtenPaths = [];
  return {
    onMessage: (message) => {
      if (message.type === "assistant") {
        let content = message.message.content;
        if (!Array.isArray(content)) return;
        for (let block of content) {
          let autoMemReadPath = getAutoMemReadPath(block, sinceUuid);
          if (block.type === "tool_use" && autoMemReadPath !== undefined)
            pathByToolUseId.set(block.id, autoMemReadPath);
        }
        return;
      }
      if (message.type !== "user") return;
      let content = message.message.content;
      if (!Array.isArray(content)) return;
      for (let block of content) {
        if (block.type !== "tool_result") continue;
        let filePath = pathByToolUseId.get(block.tool_use_id);
        if (filePath === undefined) continue;
        pathByToolUseId.delete(block.tool_use_id);
        if (block.is_error === true) continue;
        writtenPaths.push(filePath);
        logFileStateResync(fileState, filePath, {
          requireReadBeforeWrite: true,
        });
      }
    },
    completedWritePaths: () => normalizeCaseForComparison_2(writtenPaths),
  };
}
//@ chunk-70rvh5wm.js:22538-22703 placement
function getBillingFlags(context) {
  let queryTracking = context.toolUseContext.queryTracking;
  return {
    overageInUse: queryTracking?.billedToUsageCredits ?? getCurrentLimits().overageInUse === true,
    longContextBilled: queryTracking?.longContextBilled === true,
  };
}
//@ chunk-70rvh5wm.js:22703-22769 placement
/**
 * 超额计费时的动作：skip 或 run。
 */
function resolveOverageAction(config, state) {
  return state.overageInUse && hasKnownPlanTier() ? config.whenOverage : "run";
}
//@ chunk-70rvh5wm.js:22769-36212 placement (2.1.88 match: initExtractMemories, 0.361)
/**
 * 注册回合结束后的记忆提取器：跳过本区间已直接写过记忆、用户文字太少、权限规则拒绝写记忆、超额计费（when_overage=skip）、first look 判否等情况；按 everyNTurns（tengu_bramble_lintel，默认 1）节流，空闲 idle_flush_s 后补跑；并发时合并为尾随运行。
 */
function initExtractMemories(host) {
  if (env.CLAUDE_CODE_POST_TURN_MEMORY && getHostedPostTurnMemoryConfig() === null) {
    logForDebugging(
      "[extractMemories] CLAUDE_CODE_POST_TURN_MEMORY is set but CLAUDE_CODE_POST_TURN_MEMORY_CONFIG is missing or invalid; the pass is off",
    );
    logFeatureSad("ccr_memory_extract", "config_invalid");
  }
  let inFlightExtractions = new Set();
  let sinceUuid;
  let lastSessionId;
  let stoppedEarlyCount = 0;
  function advanceCursor(uuid) {
    if (uuid) {
      sinceUuid = uuid;
      lastSessionId = undefined;
      stoppedEarlyCount = 0;
    }
  }
  function noteUnfinished(apiError, uuid) {
    if (!apiError) {
      stoppedEarlyCount++;
      if (stoppedEarlyCount >= MIN_TURNS_SINCE) {
        logForDebugging(
          `[extractMemories] (mcp) stopped early ${stoppedEarlyCount} passes in a row; the cursor moves on and these turns are not reviewed again`,
        );
        advanceCursor(uuid);
        return;
      }
    }
    lastSessionId = getSessionId();
    logForDebugging(
      `[extractMemories] (mcp) ${apiError ? "writes refused after a newer prompt" : "the pass stopped early (an API error, the turn cap or an abort of its fork before anything was saved, or a throw)"}; the cursor stays and the next pass reviews these turns again`,
    );
  }
  let idleScheduled = false;
  let running = false;
  let abortController = createAbortController();
  let turnsSincePass = 0;
  let resumed = false;
  let resumedTurns;
  let resumedPassCountedRun;
  let resumedCursor;
  let stashed;
  let idleTimer;
  function runExtraction(promise) {
    inFlightExtractions.add(promise);
    return promise.finally(() => inFlightExtractions.delete(promise));
  }
  let laptopExtractRunner = laptopExtractModule_2?.createLaptopExtractRunner(host, runExtraction);
  function takeIdleTimer() {
    let pending = idleTimer;
    idleTimer = undefined;
    if (pending?.timer !== undefined) clearTimeout(pending.timer);
    return pending;
  }
  function armIdleTimer(
    memoryDir,
    context,
    promptIndex = getPromptIndex(),
    personPrompt = getLastPersonPrompt(),
    billing = getBillingFlags(context),
    armDelay = true,
  ) {
    takeIdleTimer();
    if (memoryDir.idleFlushSeconds === 0) return;
    idleTimer = {
      timer: armDelay ? setTimeout(onIdleFlush, memoryDir.idleFlushSeconds * 1000).unref() : undefined,
      dueAt: armDelay ? performance.now() + memoryDir.idleFlushSeconds * 1000 : 1 / 0,
      promptIndex,
      personPrompt,
      billing,
      context,
    };
  }
  function onIdleFlush() {
    let pending = takeIdleTimer();
    if (!pending || running || isSessionActive() || getPromptIndex() !== pending.promptIndex) return;
    runExtraction(
      runPass({
        context: pending.context,
        trigger: "idle_flush",
        promptIndex: pending.promptIndex,
        personPrompt: pending.personPrompt,
        billing: pending.billing,
      }),
    );
  }
  function onPassEnded(outcome) {
    try {
      memoryExtractorSlots.of(host).onPassEnded?.(outcome);
    } catch (error) {
      logError(toError(error));
    }
  }
  function onPassSkipped(reason) {
    try {
      memoryExtractorSlots.of(host).onPassSkipped?.(reason);
    } catch (error) {
      logError(toError(error));
    }
  }
  function restorePlace(messages) {
    if (resumed) return;
    resumed = true;
    let { restoredPlace, restoredPlaceAt } = memoryExtractorSlots.of(host);
    if (!restoredPlace) return;
    let passCounted =
      restoredPlace.passAt !== null && (restoredPlaceAt ?? Date.now()) >= restoredPlace.passAt;
    let cursor = passCounted ? restoredPlace.tail : restoredPlace.cursor;
    turnsSincePass = passCounted ? 0 : restoredPlace.turns;
    resumedTurns = turnsSincePass;
    resumedPassCountedRun = passCounted;
    if (cursor !== null && messages.some((message) => message.uuid === cursor)) sinceUuid = cursor;
    let restoreOutcome =
      sinceUuid !== undefined ? "restored" : cursor === null ? "none_saved" : "not_in_transcript";
    resumedCursor = fromEnum(restoreOutcome);
    logForDebugging(
      `[extractMemories] (mcp) resumed from the previous worker: ${turnsSincePass} turn end(s) since its last pass${passCounted ? " (the pass it had scheduled is counted as run)" : ""}; cursor ${RESTORE_OUTCOME_TEXT[restoreOutcome]}`,
    );
  }
  function savePlace(messages, passAt) {
    let place = {
      turns: turnsSincePass,
      cursor: sinceUuid ?? null,
      tail: messages.at(-1)?.uuid ?? null,
      passAt,
    };
    try {
      memoryExtractorSlots.of(host).savePlace?.(place);
    } catch (error) {
      logError(toError(error));
    }
  }
  async function runPass({
    context,
    appendSystemMessage,
    trigger,
    promptIndex = getPromptIndex(),
    personPrompt = getLastPersonPrompt(),
    billing = getBillingFlags(context),
  }) {
    let { messages } = context;
    let memoryDir = getHostedPostTurnMemoryConfig();
    let carryAcrossRestarts = memoryDir?.carryAcrossRestarts === true && trigger === undefined;
    if (memoryDir?.carryAcrossRestarts) restorePlace(messages);
    let newMessageCount = countTurnsSince(messages, sinceUuid);
    if (lastSessionId !== undefined && lastSessionId !== getSessionId()) {
      lastSessionId = undefined;
      stoppedEarlyCount = 0;
    }
    if (
      lastSessionId === undefined &&
      afterAnchorMessages(
        messages,
        sinceUuid,
        !!memoryDir,
        !!memoryDir && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mellow_ember", false) === true,
      )
    ) {
      logForDebugging("[extractMemories] skipping \u2014 conversation already wrote to memory in this range");
      advanceCursor(messages.at(-1)?.uuid);
      if (carryAcrossRestarts) savePlace(messages, null);
      logEvent("tengu_extract_memories_skipped_direct_write", {
        message_count: newMessageCount,
      });
      if (memoryDir) onPassSkipped(trigger ?? "cadence");
      return;
    }
    let summary = memoryDir ? summarizeUserTurns(messages, sinceUuid) : undefined;
    let chatGate = memoryDir?.proseGate === "chat";
    let reviewWindow = chatGate ? Math.max(memoryDir.reviewWindow, summary?.userTurns ?? 0) : 0;
    let substantial = chatGate
      ? isMemoryCandidateTurn(messages, memoryDir.minProseWords, reviewWindow)
      : hasSubstantialTurnSince(messages, sinceUuid);
    let proseBucket =
      memoryDir && summary
        ? turnCountBucket(
            chatGate ? proseWordEquivalent(lastUserTurnText(messages, reviewWindow)) : summary.proseWords,
          )
        : undefined;
    if (!substantial) {
      logForDebugging("[extractMemories] skipping \u2014 not enough user prose");
      advanceCursor(messages.at(-1)?.uuid);
      if (carryAcrossRestarts) savePlace(messages, null);
      logEvent("tengu_extract_memories_skipped_no_prose", {
        message_count: newMessageCount,
        prose_gate: fromEnumOpt(memoryDir?.proseGate),
        prose_words_bucket: fromEnumOpt(proseBucket),
      });
      return;
    }
    let everyNTurns =
      memoryDir?.everyNTurns ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_bramble_lintel", null) ?? 1;
    let cacheSafeParams = createCacheSafeParams(context);
    let overageAction = memoryDir ? resolveOverageAction(memoryDir, billing) : "run";
    if (trigger === undefined) {
      turnsSincePass++;
      if (turnsSincePass < everyNTurns) {
        if (memoryDir) {
          let allowIdleFlush = turnsSincePass >= memoryDir.idleFlushMinTurns;
          armIdleTimer(memoryDir, context, promptIndex, personPrompt, billing, allowIdleFlush);
          if (carryAcrossRestarts)
            savePlace(
              messages,
              allowIdleFlush && memoryDir.idleFlushSeconds > 0 && overageAction !== "skip"
                ? Date.now() + memoryDir.idleFlushSeconds * 1000
                : null,
            );
        }
        return;
      }
    }
    let passesBefore = turnsSincePass;
    turnsSincePass = 0;
    if (carryAcrossRestarts) savePlace(messages, Date.now());
    let { toolPermissionContext } = context.toolUseContext.getAppState();
    let blockingRule = memoryDir
      ? undefined
      : memoryWriteBlockingRule(toolPermissionContext, getAutoMemEntrypoint());
    if (blockingRule !== undefined) {
      logForDebugging(
        `[extractMemories] skipping \u2014 ${describeRuleBlock(blockingRule)} would refuse memory writes`,
      );
      logEvent("tengu_extract_memories_skipped_permission_rule", {
        message_count: newMessageCount,
      });
      if (appendSystemMessage !== undefined) {
        let warning = describeMemoryRuleBlock(host, blockingRule, getAutoMemPath());
        if (warning !== undefined) appendSystemMessage(createSystemMessage(warning, "warning"));
      }
      return;
    }
    running = true;
    let now = Date.now();
    let writtenState;
    let { taskRegistry } = context.toolUseContext;
    let memoryTask;
    let taskSignal;
    let aborted = false;
    try {
      if (memoryDir) {
        if (getPromptIndex() !== promptIndex) {
          logForDebugging("[extractMemories] skipping (mcp) \u2014 a newer turn started");
          return;
        }
        if (isPersonTypesHold(toolPermissionContext)) {
          logForDebugging(
            "[extractMemories] skipping (mcp) \u2014 tool calls are held until a person writes",
          );
          if (carryAcrossRestarts) savePlace(messages, null);
          return;
        }
        if (overageAction === "skip") {
          lastSessionId = getSessionId();
          logForDebugging(
            "[extractMemories] skipping (mcp) \u2014 the turn was billed to Extra Usage and when_overage is 'skip'; these turns wait for the next pass",
          );
          logEvent("tengu_extract_memories_skipped_overage", {
            message_count: newMessageCount,
            trigger: fromEnum(trigger ?? "cadence"),
            long_context_billed: billing.longContextBilled,
            prose_words_bucket: fromEnumOpt(proseBucket),
            own_words_turns: summary?.ownWordsTurns,
          });
          if (carryAcrossRestarts) savePlace(messages, null);
          return;
        }
        let firstLookMode =
          memoryDir.firstLook === undefined
            ? "off"
            : overageAction === "first_look"
              ? "enforce"
              : memoryDir.firstLook.mode;
        let firstLookPromise =
          memoryDir.firstLook !== undefined && firstLookMode !== "off"
            ? runMemoryFirstLook({
                config: memoryDir.firstLook,
                messages,
                sinceUuid,
                window: memoryDir.reviewWindow,
                signal: context.toolUseContext.abortController.signal,
                credentials: context.toolUseContext.credentials,
              })
            : undefined;
        if (firstLookPromise !== undefined && firstLookMode === "enforce") {
          let firstLook = await firstLookPromise;
          logForDebugging(
            `[extractMemories] first look (enforce, a "no" skips the pass) answered ${firstLook.verdict} after ${firstLook.durationMs}ms`,
          );
          if (getPromptIndex() !== promptIndex) {
            turnsSincePass = passesBefore;
            logForDebugging(
              "[extractMemories] skipping (mcp) \u2014 a newer turn started during the first look",
            );
            return;
          }
          if (isPersonTypesHold(context.toolUseContext.getAppState().toolPermissionContext)) {
            logForDebugging(
              "[extractMemories] skipping (mcp) \u2014 tool calls were held during the first look",
            );
            return;
          }
          if (firstLook.verdict === "no" || firstLook.verdict === "empty") {
            logForDebugging(
              `[extractMemories] skipping (mcp) \u2014 the first look answered ${firstLook.verdict}; these turns wait for the next pass`,
            );
            logEvent("tengu_extract_memories_skipped_first_look", {
              message_count: newMessageCount,
              trigger: fromEnum(trigger ?? "cadence"),
              overage_in_use: billing.overageInUse,
              when_overage: fromEnum(overageAction),
              first_look_verdict: fromEnum(firstLook.verdict),
              first_look_model: telemetrySafeModelName(firstLook.model),
              first_look_ms: firstLook.durationMs,
              first_look_input_chars: firstLook.inputChars,
              first_look_user_turns: firstLook.userTurns,
              prose_words_bucket: fromEnumOpt(proseBucket),
              own_words_turns: summary?.ownWordsTurns,
            });
            return;
          }
        }
        logForDebugging(
          `[extractMemories] starting (mcp, ${trigger ?? "cadence"}) \u2014 ${newMessageCount} new messages`,
        );
        let refusedWrites = 0;
        let canUseTool = createChildAbortController(context.toolUseContext.abortController);
        if (memoryDir.declareTask) {
          memoryTask = registerPostTurnMemoryTask(taskRegistry, canUseTool);
          taskSignal = canUseTool.signal;
        }
        let trial = memoryTrialRunner?.servedTrial(memoryDir);
        let trialResult =
          memoryTrialRunner !== null && trial !== undefined
            ? await memoryTrialRunner.runTrial({
                served: trial,
                config: memoryDir,
                context,
                host,
                sinceUuid,
                drainSignal: abortController.signal,
                parentAbort: canUseTool,
                promptIndex,
                makeGate: makeMemoryPassCanUseTool,
              })
            : undefined;
        let heldVersions = memoryDir.staleNote ? heldMemoryVersions(host) : undefined;
        let staleNote = heldVersions
          ? buildStaleReadNotice(heldVersions, messagesSinceCompactBoundary(messages), findStaleCarriedReads)
          : "";
        let cacheSafeParams_2 = heldPostTurnInstruction(host);
        let startTime = Date.now();
        let forkResult = await runForkedAgent({
          promptMessages: [
            createUserMessage({
              content: (cacheSafeParams_2 ?? memoryDir.instruction) + staleNote,
            }),
          ],
          cacheSafeParams,
          canUseTool: makeMemoryPassCanUseTool(promptIndex, () => {
            refusedWrites++;
          }),
          querySource: "extract_memories",
          forkLabel: "extract_memories",
          overrides: {
            mcpRequestMeta: buildMemoryCallMeta({
              citesEvent: getLastHumanTurnUuid(messages, personPrompt),
            }),
            abortController: canUseTool,
          },
          skipTranscript: true,
          maxTurns: memoryDir.maxTurns,
          skipCacheWrite: true,
        });
        let durationMs = Date.now() - startTime;
        aborted = taskSignal?.aborted === true;
        let firstLookResult = await firstLookPromise;
        if (firstLookResult !== undefined && firstLookMode === "shadow")
          logForDebugging(
            `[extractMemories] first look (shadow, the pass ran regardless) answered ${firstLookResult.verdict} after ${firstLookResult.durationMs}ms`,
          );
        let newMessages = messagesNotIn(forkResult.messages, messages);
        if (heldVersions) mergeReadVersions(host, heldVersions, newMessages);
        let existingMemories = collectErroredToolUseIds(newMessages);
        let writeCount = countWhere(
          newMessages.flatMap((message) =>
            message.type === "assistant" && Array.isArray(message.message.content)
              ? message.message.content
              : [],
          ),
          (block) =>
            block.type === "tool_use" &&
            MEMORY_MUTATING_TOOLS.has(block.name) &&
            !existingMemories.has(block.id),
        );
        let hitTurnCap = hasMaxTurnsReached(newMessages);
        let unfinished =
          lastAssistantWasApiError(newMessages) || (writeCount === 0 && (hitTurnCap || aborted));
        let unfinishedInARow = unfinished && writeCount === 0 ? stoppedEarlyCount + 1 : 0;
        if (writeCount > 0 || (refusedWrites === 0 && !unfinished)) advanceCursor(messages.at(-1)?.uuid);
        else noteUnfinished(!unfinished, messages.at(-1)?.uuid);
        logEvent("tengu_extract_memories_extraction", {
          mode: fromEnum("mcp"),
          trigger: fromEnum(trigger ?? "cadence"),
          account_memory_line_rendered: false,
          every_n_turns: everyNTurns,
          input_tokens: forkResult.totalUsage.input_tokens,
          output_tokens: forkResult.totalUsage.output_tokens,
          cache_read_input_tokens: forkResult.totalUsage.cache_read_input_tokens,
          cache_creation_input_tokens: forkResult.totalUsage.cache_creation_input_tokens,
          message_count: newMessageCount,
          parent_context_tokens: estimateTokensWithAnchor(messages),
          compacted_in_fork: newMessages.some(isCompactBoundaryMessage),
          turn_count: countWhere(newMessages, (message) => message.type === "assistant"),
          written: writeCount,
          superseded_writes: refusedWrites,
          instruction_source: fromEnum(cacheSafeParams_2 === undefined ? "env" : "memory_context"),
          stale_note_rendered: staleNote !== "",
          review_unfinished: unfinished,
          unfinished_in_a_row: unfinishedInARow,
          reached_cap: hitTurnCap,
          duration_ms: durationMs,
          fork_model: telemetrySafeModelName(context.toolUseContext.options.mainLoopModel),
          turns_since_last_pass: passesBefore,
          prose_gate: fromEnum(memoryDir.proseGate),
          prose_words_bucket: fromEnumOpt(proseBucket),
          user_turns: summary?.userTurns,
          own_words_turns: summary?.ownWordsTurns,
          own_words_chars: summary?.ownWordsChars,
          task_notification_turns: summary?.taskNotificationTurns,
          unstamped_turns: summary?.unstampedTurns,
          overage_in_use: billing.overageInUse,
          long_context_billed: billing.longContextBilled,
          when_overage: fromEnum(overageAction),
          first_look_mode: fromEnum(firstLookMode),
          first_look_verdict: fromEnumOpt(firstLookResult?.verdict),
          first_look_error: fromEnumOpt(firstLookResult?.error),
          first_look_model: telemetrySafeModelName(firstLookResult?.model),
          first_look_ms: firstLookResult?.durationMs,
          first_look_input_chars: firstLookResult?.inputChars,
          first_look_user_turns: firstLookResult?.userTurns,
          idle_flush_min_turns: memoryDir.idleFlushMinTurns,
          carry_across_restarts: memoryDir.carryAcrossRestarts,
          resumed_turns: resumedTurns,
          resumed_pass_counted_run: resumedPassCountedRun,
          resumed_cursor: resumedCursor,
        });
        logFeatureOk("ccr_memory_extract");
        onPassEnded({
          outcome:
            writeCount > 0
              ? "saved"
              : unfinished
                ? "unfinished"
                : refusedWrites > 0
                  ? "writes_refused"
                  : "nothing_to_save",
          trigger: trigger ?? "cadence",
          written: writeCount,
          durationMs: Date.now() - now,
        });
        if (memoryTrialRunner !== null && trialResult !== undefined)
          memoryTrialRunner.logPair(
            trialResult,
            newMessages,
            trigger ?? "cadence",
            context.toolUseContext.options.mainLoopModel,
          );
        return;
      }
      let autoMemPath = getAutoMemPath();
      logForDebugging(
        `[extractMemories] starting \u2014 ${newMessageCount} new messages, memoryDir=${autoMemPath}`,
      );
      let sharedViaTools = isSharedMemoryServedViaTools();
      let teamMemory = canUseTeamMemory() || sharedViaTools;
      let canUseTool = createAutoMemCanUseTool(autoMemPath, undefined, {
        fork: "extraction",
      });
      let writtenPaths = formatMemoryManifest(
        await scanMemoryFiles(autoMemPath, createAbortController().signal, context.toolUseContext.storageV5),
      );
      let unusedLine = false;
      let typedTurns =
        extractorRuntime?.isPromoterExtractorOn() === true
          ? extractorRuntime.typedTurnsInWindow(host, context.toolUseContext.session.id, messages, sinceUuid)
          : [];
      let content =
        buildExtractMemoriesPrompt(newMessageCount, writtenPaths, teamMemory, sharedViaTools, unusedLine) +
        (extractorRuntime?.typedTurnsPromptBlock(typedTurns) ?? "");
      let agentId =
        extractorRuntime !== null && typedTurns.length > 0 ? makeSaltedName("extract_memories") : undefined;
      let unregister =
        agentId === undefined
          ? undefined
          : extractorRuntime?.registerExtractorFork(host, agentId, typedTurns);
      writtenState = makeRememberSink(context.toolUseContext.readFileState, autoMemPath);
      let forkResult = await runForkedAgent({
        promptMessages: [
          createUserMessage({
            content,
          }),
        ],
        cacheSafeParams,
        canUseTool,
        querySource: "extract_memories",
        forkLabel: "extract_memories",
        ...(agentId !== undefined && {
          overrides: {
            agentId,
          },
        }),
        skipTranscript: true,
        maxTurns: 5,
        skipCacheWrite: isBasaltSpurEnabled(),
        onMessage: writtenState.onMessage,
      }).finally(() => unregister?.());
      advanceCursor(messages.at(-1)?.uuid);
      let turnCount = extractWrittenPaths(forkResult.messages, autoMemPath);
      let turnCount_2 = countWhere(forkResult.messages, (message) => message.type === "assistant");
      let inputTokens =
        forkResult.totalUsage.input_tokens +
        forkResult.totalUsage.cache_creation_input_tokens +
        forkResult.totalUsage.cache_read_input_tokens;
      let hitPercent =
        inputTokens > 0
          ? ((forkResult.totalUsage.cache_read_input_tokens / inputTokens) * 100).toFixed(1)
          : "0.0";
      logForDebugging(
        `[extractMemories] finished \u2014 ${turnCount.length} files written, cache: read=${forkResult.totalUsage.cache_read_input_tokens} create=${forkResult.totalUsage.cache_creation_input_tokens} input=${forkResult.totalUsage.input_tokens} (${hitPercent}% hit)`,
      );
      if (turnCount.length > 0) logForDebugging(`[extractMemories] memories saved: ${turnCount.join(", ")}`);
      else logForDebugging("[extractMemories] no memories saved this run");
      let memoryPaths = turnCount.filter((path) => basename(path) !== MEMORY_INDEX_FILENAME);
      let teamCount = countWhere(memoryPaths, isTeamMemPath);
      logEvent("tengu_extract_memories_extraction", {
        mode: fromEnum("file"),
        input_tokens: forkResult.totalUsage.input_tokens,
        output_tokens: forkResult.totalUsage.output_tokens,
        cache_read_input_tokens: forkResult.totalUsage.cache_read_input_tokens,
        cache_creation_input_tokens: forkResult.totalUsage.cache_creation_input_tokens,
        message_count: newMessageCount,
        parent_context_tokens: estimateTokensWithAnchor(messages),
        compacted_in_fork: forkResult.messages.some(isCompactBoundaryMessage),
        turn_count: turnCount_2,
        files_written: turnCount.length,
        memories_saved: memoryPaths.length,
        team_memories_saved: teamCount,
        account_memory_line_rendered: unusedLine,
        duration_ms: Date.now() - now,
      });
      logForDebugging(
        `[extractMemories] writtenPaths=${turnCount.length} memoryPaths=${memoryPaths.length} appendSystemMessage defined=${appendSystemMessage != null}`,
      );
      if (memoryPaths.length > 0) {
        let msg = createMemorySavedMessage(memoryPaths);
        msg.teamCount = teamCount;
        appendSystemMessage?.(msg);
      }
      if (turnCount.length > 0)
        await resyncMemoryWrites(context.toolUseContext, buildExtractNotice(turnCount));
      logFeatureOk("memory_extract");
    } catch (error) {
      aborted = taskSignal?.aborted === true;
      logForDebugging(`[extractMemories] error: ${error}`);
      if (!aborted) {
        logEvent("tengu_extract_memories_error", {
          duration_ms: Date.now() - now,
          mode: fromEnum(memoryDir ? "mcp" : "file"),
        });
        logFeatureBad(memoryDir ? "ccr_memory_extract" : "memory_extract", "agent_error");
      }
      if (memoryDir) {
        if (memoryTask !== undefined && !aborted) finishMemoryTask(memoryTask, taskRegistry, "failed");
        onPassEnded({
          outcome: aborted ? "unfinished" : "failed",
          trigger: trigger ?? "cadence",
          written: 0,
          durationMs: Date.now() - now,
        });
        noteUnfinished(false, messages.at(-1)?.uuid);
      }
      let writtenPaths = writtenState?.completedWritePaths() ?? [];
      if (writtenPaths.length > 0)
        try {
          await resyncMemoryWrites(context.toolUseContext, buildExtractNotice(writtenPaths));
        } catch (error) {
          logForDebugging(
            `[extractMemories] could not queue the notice for writes that landed before the error: ${errorMessage(error)}`,
          );
        }
    } finally {
      running = false;
      if (memoryTask !== undefined)
        finishMemoryTask(memoryTask, taskRegistry, aborted ? "killed" : "completed");
      let trailing = stashed;
      stashed = undefined;
      if (trailing && everyNTurns <= 1) {
        logForDebugging("[extractMemories] running trailing extraction for stashed context");
        await runPass({
          context: trailing.context,
          appendSystemMessage: trailing.appendSystemMessage,
          trigger: "trailing",
          promptIndex: trailing.promptIndex,
          personPrompt: trailing.personPrompt,
          billing: trailing.billing,
        });
      } else if (trailing && memoryDir)
        armIdleTimer(
          memoryDir,
          trailing.context,
          trailing.promptIndex,
          trailing.personPrompt,
          trailing.billing,
        );
    }
  }
  async function executeExtractMemoriesImpl(context, appendSystemMessage) {
    if (context.toolUseContext.agentId) return;
    let laptopTurn = laptopExtractRunner?.onTurnEnd(context, appendSystemMessage);
    try {
      if (isExtractModeActive() || isPromoterExtractorOn()) await runGuarded(context, appendSystemMessage);
    } finally {
      await laptopTurn;
    }
  }
  async function runGuarded(context, appendSystemMessage) {
    takeIdleTimer();
    let config = getHostedPostTurnMemoryConfig();
    let hosted = config !== null;
    let savePlaceFor = (passAt) => {
      if (config?.carryAcrossRestarts) {
        restorePlace(context.messages);
        savePlace(context.messages, passAt);
      }
    };
    if (hosted && (getMemoryToggledOff() || isSafeMode() || isRestrictedSession())) {
      savePlaceFor(null);
      return;
    }
    if (
      hosted &&
      !(
        isAccountMemoryServer(findMemoryServer(context.toolUseContext.options.mcpClients)) &&
        context.toolUseContext.options.tools.some((tool) => matchesToolName(tool, MEMORY_WRITE_TOOL))
      )
    ) {
      logForDebugging("[extractMemories] skipping (mcp) \u2014 CCR memory server not mounted");
      savePlaceFor(null);
      return;
    }
    if (
      hosted &&
      isCoordinatorMode_2() &&
      applyCoordinatorToolFilter(
        context.toolUseContext.options.tools.filter((tool) => matchesToolName(tool, MEMORY_WRITE_TOOL)),
      ).length === 0
    ) {
      logForDebugging(
        "[extractMemories] skipping (mcp) \u2014 coordinator mode: the write tool is held on the memory server's word alone",
      );
      savePlaceFor(null);
      return;
    }
    if (
      !hosted &&
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_passport_quail", false) &&
      !isPromoterExtractorOn()
    )
      return;
    if (!hosted && !isAutoMemoryEnabled()) {
      if (isAutoMemoryHeldForSession()) sinceUuid = context.messages.at(-1)?.uuid ?? sinceUuid;
      return;
    }
    if (!hosted && isAutoMemReadFenced()) return;
    if (getRemoteCaps() !== null) return;
    if (running) {
      logForDebugging("[extractMemories] extraction in progress \u2014 stashing for trailing run");
      logEvent("tengu_extract_memories_coalesced", {});
      let state = getBillingFlags(context);
      stashed = {
        context,
        appendSystemMessage,
        promptIndex: getPromptIndex(),
        personPrompt: getLastPersonPrompt(),
        billing: state,
      };
      if (config)
        savePlaceFor(
          (config.everyNTurns <= 1 || config.idleFlushSeconds > 0) &&
            resolveOverageAction(config, state) !== "skip"
            ? Date.now() + config.idleFlushSeconds * 1000
            : null,
        );
      return;
    }
    await runPass({
      context,
      appendSystemMessage,
    });
  }
  let slot = memoryExtractorSlots.of(host);
  slot.extractor = (context, appendSystemMessage) =>
    runExtraction(executeExtractMemoriesImpl(context, appendSystemMessage));
  slot.drainer = async (timeoutMs = 60000) => {
    let deadline = Date.now() + timeoutMs;
    abortController.abort();
    onIdleFlush();
    laptopExtractRunner?.disarmIdleFlush();
    while (inFlightExtractions.size > 0 && Date.now() < deadline) {
      await Promise.race([
        Promise.all(inFlightExtractions).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, deadline - Date.now()).unref()),
      ]);
      onIdleFlush();
    }
  };
  slot.disarm = () => {
    slot.extractor = null;
    stashed = undefined;
    takeIdleTimer();
    laptopExtractRunner?.disarmIdleFlush();
  };
  slot.owedWithin = (withinMs) =>
    inFlightExtractions.size > 0 ||
    (idleTimer?.timer !== undefined &&
      idleTimer.promptIndex === getPromptIndex() &&
      idleTimer.dueAt - performance.now() <= withinMs);
  slot.placeNow = () => ({
    turns: turnsSincePass,
    cursor: sinceUuid ?? null,
  });
}
//@ chunk-70rvh5wm.js:36212-36303 placement
function isPromoterExtractorOn() {
  return (
    extractorRuntime !== null &&
    extractorRuntime.EXTRACTOR_RUNS_FOR_PROMOTER &&
    extractorRuntime.isPromoterExtractorOn()
  );
}
//@ chunk-70rvh5wm.js:36303-36369 placement
function isLaptopExtractActive(contextual) {
  return laptopExtractModule_2 !== null && laptopExtractModule_2.isLaptopExtractDispatched(contextual);
}
//@ chunk-70rvh5wm.js:36369-36429 placement
function isLaptopExtractSync(contextual) {
  return laptopExtractModule_2 !== null && laptopExtractModule_2.isLaptopExtractSync(contextual);
}
//@ chunk-70rvh5wm.js:36429-36512 placement
async function executeExtractMemories(context, opts) {
  await memoryExtractorSlots.of(context.toolUseContext.session.host).extractor?.(context, opts);
}
//@ chunk-70rvh5wm.js:36512-36561 placement
async function drainPendingExtraction(session, opts) {
  await memoryExtractorSlots.of(session).drainer(opts);
}
//@ chunk-70rvh5wm.js:36561-36593 layout
function disarmPlaceholder(context) {
  memoryExtractorSlots.of(context).disarm();
}
//@ chunk-70rvh5wm.js:36593-36677 placement
function restoreMemoryExtractPlace(session, config) {
  let slot = memoryExtractorSlots.of(session);
  slot.restoredPlace = parsePostTurnMemoryConfig(config);
  slot.restoredPlaceAt = Date.now();
}
//@ chunk-70rvh5wm.js:36677-36715 placement
function onMemoryExtractPlace(session, savePlace) {
  memoryExtractorSlots.of(session).savePlace = savePlace;
}
//@ chunk-70rvh5wm.js:36715-36761 layout
function owedWithin(context, place) {
  return memoryExtractorSlots.of(context).owedWithin(place);
}
//@ chunk-70rvh5wm.js:36761-37032 facade-majority
function cancelUnstartedPass(context, context_2) {
  if (context_2 === undefined || context_2.passAt === null) return null;
  if (owedWithin(context, Number.NEGATIVE_INFINITY)) return null;
  let owedAtInfinity = owedWithin(context, 1 / 0);
  let waitingForPass =
    (getHostedPostTurnMemoryConfig()?.everyNTurns ?? 1) > 1 && Date.now() < context_2.passAt;
  if (!owedAtInfinity && !waitingForPass) return null;
  disarmPlaceholder(context);
  return {
    place: {
      ...context_2,
      ...memoryExtractorSlots.of(context).placeNow?.(),
      passAt: null,
    },
    timerArmed: owedAtInfinity,
  };
}
export {
  onMemoryExtractPlace,
  cancelUnstartedPass,
  initExtractMemories,
  DELETE_COMMAND_NAMES,
  memoryWriteBlockingRule,
  createAutoMemCanUseTool,
  isAllowedAutoMemWritePath,
  drainPendingExtraction,
  executeExtractMemories,
  isLaptopExtractActive,
  isLaptopExtractSync,
  restoreMemoryExtractPlace,
};
