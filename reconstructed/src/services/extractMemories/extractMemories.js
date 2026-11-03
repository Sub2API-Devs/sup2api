/**
 * services/extractMemories/extractMemories.ts
 *
 * 回合结束后的自动记忆提取：节流、跳过条件、hosted post-turn 配置、记忆代理的工具权限守卫。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/extractMemories/extractMemories.ts
 * pieces: chunk-6exk38gf.js (1), chunk-xr4xc2mq.js (26)
 * attribution: placement 1, facade-exports 11, fingerprint 1, file-local 2, sole-consumer 3, layout 9
 */
import { normalize, sep, basename } from "path";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { parseForSecurity } from "../../utils/bash/ast.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { expandPath } from "../../utils/path.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
  isRuleOrReadBlockReason,
  isPersonTypesHold,
  getDenyRules,
  getAskRules,
  toolMatchesRule,
} from "../../utils/permissions/permissions.js";
import {
  matchingRuleForInput,
  checkReadNetworkPathSafety,
  checkReadPermissionForTool,
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
  MEMORY_READONLY_TOOLS,
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
  hasSuccessfulToolCall,
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
import { uniq, count } from "../../utils/collections.js";
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
import { toolMatchesName } from "../../Tool.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { applyCoordinatorToolFilter } from "../../utils/toolPool.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { booleanishSchema } from "../../utils/spellcheck.js";

//@ chunk-xr4xc2mq.js:13452-13556 facade-exports
/**
 * 记忆试验运行器（servedTrial / runTrial）。
 */
var laptopExtractModule_2 = null;
var laptopExtractModule = null;
var extractorRuntime = null;
var memoryTrialRunner = null;
var DELETE_COMMAND_NAMES = "rm|remove-item|ri|del|erase";
var regExp = new RegExp(`^(?:${DELETE_COMMAND_NAMES})$`, "i");
//@ chunk-xr4xc2mq.js:13556-13769 fingerprint = denyAutoMemTool (1)
/**
 * 拒绝记忆代理的工具调用并打 tengu_auto_mem_tool_denied（带原因）。
 */
function denyAutoMemTool(tool, reason, n, reportDenial = true) {
  logForDebugging(`[autoMem] denied ${tool.name} (${n}): ${reason}`);
  if (reportDenial)
    logEvent("tengu_auto_mem_tool_denied", {
      tool_name: sanitizeToolNameForAnalytics(tool.name),
      reason: fromEnum(n),
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
//@ chunk-xr4xc2mq.js:13769-14192 file-local
/**
 * 从工具调用中提取记忆代理写入的文件路径。
 */
function extractWrittenPaths(command, r) {
  let n = command.trim().match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  if (n.length < 2) return;
  if (!regExp.test(n[0])) return;
  let paths = [];
  for (let j = 1; j < n.length; j++) {
    let u = n[j];
    if (/^-(?:Literal)?Path$/i.test(u)) continue;
    if (u.startsWith("-")) return;
    let y =
      (u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'")) ? u.slice(1, -1) : u;
    if (/[*?[\]$`(){}|;&<>"',]/.test(y)) return;
    if (!isAllowedAutoMemWritePath(y, r)) return;
    paths.push(y);
  }
  return paths.length > 0 ? paths : undefined;
}
//@ chunk-xr4xc2mq.js:14192-14352 sole-consumer
/**
 * 记忆提取允许的文件工具集合，以及恢复记忆结果的说明文字表。
 */
var MEMORY_FILE_TOOLS = new Set([
  FILE_READ_TOOL_NAME,
  GREP_TOOL_NAME,
  GLOB_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
]);
var RESTORE_OUTCOME_TEXT = {
  restored: "restored",
  none_saved: "none saved",
  not_in_transcript: "not restored: that message is no longer in the transcript",
};
//@ chunk-xr4xc2mq.js:14352-14916 sole-consumer
/**
 * 判断 Bash 命令是否只是对给定目录的简单 ls：单条命令、参数为字面量、无重定向/环境变量，非选项参数都解析到该目录（不含通配、..、~、反斜杠）。
 */
async function isSimpleLsOfDir(command, dir) {
  let n = await parseForSecurity(command);
  if (n.kind !== "simple" || n.commands.length !== 1) return false;
  let parsed = n.commands[0];
  if (
    parsed === undefined ||
    parsed.argvSourceLiteral !== true ||
    parsed.argv[0] !== "ls" ||
    parsed.redirects.length > 0 ||
    parsed.envVars.length > 0
  )
    return false;
  let s = (h) => h.replace(/[/\\]+$/, "");
  let u = new Set(getPathsForPermissionCheck(dir).map(s));
  let pathArgs = parsed.argv.slice(1).filter((arg) => !/^-[laA1hF]+$/.test(arg));
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
        return getPathsForPermissionCheck(expandPath(pathArg)).every((x) => u.has(s(x)));
      } catch {
        return false;
      }
    })
  );
}
//@ chunk-xr4xc2mq.js:14916-14991 sole-consumer
/**
 * 去掉引号后字符串里是否包含 ".."（路径穿越检测）。
 */
function hasParentTraversal(command) {
  return command.replace(/['"`\\\u2018-\u201F]/g, "").includes("..");
}
//@ chunk-xr4xc2mq.js:15271-15488 facade-exports
function memoryWriteBlockingRule(toolPermissionContext, autoMemEntrypoint) {
  try {
    for (let name of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME]) {
      let o =
        getDenyRuleForTool(toolPermissionContext, {
          name,
        }) ??
        getAskRuleForTool(toolPermissionContext, {
          name,
        });
      if (o !== null) return o;
    }
    for (let n of getPathsForPermissionCheck(autoMemEntrypoint))
      for (let o of ["deny", "ask"]) {
        let s = matchingRuleForInput(n, toolPermissionContext, "edit", o);
        if (s !== null) return s;
      }
  } catch (error) {
    logError(toError(error));
  }
  return;
}
//@ chunk-xr4xc2mq.js:15488-16054 layout
/**
 * 解析只删除自动记忆目录内文件的 rm 命令：单条简单命令，只允许 -f/--force 与 --，不允许通配，所有目标为允许写入的绝对路径；返回目标列表，不符合返回 undefined。
 */
async function parseAutoMemRm(command, memDir) {
  let n = await parseForSecurity(command);
  if (n.kind !== "simple" || n.usesAssignedValue === true || n.laterLoopPassesDiffer === true) return;
  if (n.commands.length !== 1) return;
  let parsed = n.commands[0];
  if (!parsed) return;
  if (parsed.argv[0] !== "rm") return;
  if (parsed.redirects.length > 0) return;
  if (parsed.envVars.length > 0) return;
  let targets = [];
  let u = false;
  for (let j = 1; j < parsed.argv.length; j++) {
    let h = parsed.argv[j];
    if (h === undefined) continue;
    if (!u) {
      if (h === "--") {
        u = true;
        continue;
      }
      if (h.startsWith("-")) {
        if (h === "-f" || h === "--force") continue;
        return;
      }
    }
    if (/[*?[]/.test(h)) return;
    if (!h.startsWith("/") || !isAllowedAutoMemWritePath(h, memDir)) return;
    targets.push(h);
  }
  return targets.length > 0 ? targets : undefined;
}
//@ chunk-xr4xc2mq.js:16054-16152 facade-exports = isSessionPlanFile (1)
function isAllowedAutoMemWritePath(path, dir) {
  let included = normalize(path).slice(dir.length).includes(":");
  return path.endsWith(".md") && !included && isAutoMemPathSafeForCarveout(path, dir);
}
//@ chunk-xr4xc2mq.js:16152-19866 facade-exports = createAutoMemCanUseTool (0.254)
/**
 * 记忆提取/整理子代理的 canUseTool：拒绝 MCP 工具、需 hook 确认的调用、危险 shell 参数，只允许在记忆目录内读写，删除命令受限。
 */
function createAutoMemCanUseTool(e, r, { fork: n = "dream", onWriteAllowed: o } = {}) {
  return async (s, u, y, h, x, z) => {
    if (isAutoMemoryHeldForSession()) return denyAutoMemTool(s, MEMORY_PAUSED_MESSAGE, "memory_paused");
    if (s.mcpInfo) return denyAutoMemTool(s, "MCP tools are not available to the memory agent", "mcp_tool");
    if (z !== undefined || y.hookAskFloor)
      return denyAutoMemTool(
        s,
        "a PreToolUse hook requires confirmation for this call, and the memory agent runs headless with no user to answer \u2014 the call is denied",
        "hook_ask",
      );
    let w;
    if (s.name === BASH_TOOL_NAME || s.name === POWERSHELL_TOOL_NAME) {
      let M = sanitizeBackgroundBashInput("the memory agent", u);
      if (M.deniedFlag !== undefined) return denyAutoMemTool(s, M.message, "shell_flag");
      w = M.sanitizedInput;
      if (
        getPlatform() === "windows" &&
        y.getAppState().toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
        typeof u.command === "string" &&
        hasParentTraversal(u.command)
      )
        return denyAutoMemTool(
          s,
          "On Windows with permissions.blockReadsOutsideWorkingDirectories on, the memory agent's shell commands may not contain '..' anywhere, even split by quotes or a backslash, because where it leads cannot be checked. Use absolute paths, and avoid '..' in patterns too.",
          "windows_dot_dot",
        );
    }
    try {
      let M = require("./chunk-rd4xtrpj.js");
      let { checkRuleBasedPermissions } = M;
      let { carriesAskRuleIntent } = M;
      let appState = y.getAppState();
      let replaced = e.replace(/[/\\]+$/, "");
      let X =
        appState.toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
        appState.toolPermissionContext.restricted !== true &&
        !isAutoMemPathFromRepoSettings() &&
        ![replaced, ...getPathsForPermissionCheck(replaced)].some((le) =>
          isDangerousMemoryRoot(le.replace(/[/\\]+$/, "")),
        );
      let Y = {
        ...y,
        toolUseId: x,
      };
      let J = {
        ...Y,
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
      let B = await checkRuleBasedPermissions(s, u, X && MEMORY_FILE_TOOLS.has(s.name) ? J : Y, {
        crashIsObjection: true,
      });
      let ne =
        B?.behavior === "ask" &&
        getPlatform() !== "windows" &&
        X &&
        s.name === BASH_TOOL_NAME &&
        B.decisionReason?.type === "safetyCheck" &&
        B.decisionReason.circuitBreaker === "outsideReadsBlocked" &&
        !carriesAskRuleIntent(B) &&
        typeof u.command === "string" &&
        (await isSimpleLsOfDir(u.command, e)) &&
        (await checkRuleBasedPermissions(s, u, J, {
          crashIsObjection: true,
        })) === null;
      if (B !== null && !ne)
        return denyAutoMemTool(
          s,
          B.message ?? "a configured permission rule blocks this call for the memory agent",
          isRuleOrReadBlockReason(B.decisionReason, "rule") ||
            (B.behavior === "ask" && carriesAskRuleIntent(B))
            ? "permission_rule"
            : isRuleOrReadBlockReason(B.decisionReason, "read_block")
              ? "read_block"
              : "permission_check",
        );
    } catch (error) {
      logError(toError(error));
      return denyAutoMemTool(
        s,
        "the memory agent could not evaluate configured permission rules; failing closed",
        "rule_check_failed",
      );
    }
    if (s.name === REPL_TOOL_NAME)
      return {
        behavior: "allow",
        updatedInput: u,
      };
    if (s.name === FILE_READ_TOOL_NAME || s.name === GREP_TOOL_NAME || s.name === GLOB_TOOL_NAME) {
      let toolPermissionContext = y.getAppState().toolPermissionContext;
      let E = checkReadNetworkPathSafety(s, u, toolPermissionContext);
      if (E) return denyAutoMemTool(s, E.message, "network_path");
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
        let j = checkReadPermissionForTool(s, u, toolPermissionContext);
        if (j.behavior === "deny") {
          let path = s.getPath?.(u);
          let mapped = getPathsForPermissionCheck(e).map((Y) => (Y.endsWith(sep) ? Y : Y + sep));
          if (
            !(
              path !== undefined &&
              !isAutoMemPathFromRepoSettings() &&
              getPathsForPermissionCheck(path).every((Y) =>
                mapped.some((J) => isAutoMemPathSafeForCarveout(Y, J)),
              )
            ) ||
            j.decisionReason.type !== "other" ||
            j.decisionReason.reason !== OUTSIDE_READS_BLOCKED_DENY_REASON
          )
            return denyAutoMemTool(s, j.message, "read_block");
        }
      }
      return {
        behavior: "allow",
        updatedInput: u,
      };
    }
    if (s.name === BASH_TOOL_NAME || s.name === POWERSHELL_TOOL_NAME) {
      let updatedInput = w ?? u;
      let parsed = s.inputSchema.safeParse(u);
      if (parsed.success) {
        if (s.isReadOnly(parsed.data, y))
          return {
            behavior: "allow",
            updatedInput,
          };
        let command = parsed.data.command;
        if (typeof command === "string") {
          if (
            (s.name === BASH_TOOL_NAME
              ? await parseAutoMemRm(command, e)
              : extractWrittenPaths(command, e)) !== undefined
          )
            return {
              behavior: "allow",
              updatedInput,
            };
        }
      }
      let j = s.name === BASH_TOOL_NAME;
      return denyAutoMemTool(
        s,
        `Only read-only shell commands and ${j ? "rm (no flags except -f)" : "Remove-Item"} of .md files under ${e} (not protected subdirectories like .git or agents) are permitted in this context (${j ? "ls, find, grep, cat, stat, wc, head, tail, and similar" : "Get-ChildItem, Get-Content, Select-Object -First/-Last, and similar"})`,
        "shell_not_allowed",
      );
    }
    if ((s.name === FILE_EDIT_TOOL_NAME || s.name === FILE_WRITE_TOOL_NAME) && "file_path" in u) {
      let filePath = u.file_path;
      if (typeof filePath === "string" && isAllowedAutoMemWritePath(filePath, e)) {
        o?.(filePath, x);
        return {
          behavior: "allow",
          updatedInput: u,
        };
      }
    }
    let S = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    return denyAutoMemTool(
      s,
      `only ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${S}, and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} within ${e} are allowed`,
      "tool_not_allowed",
    );
  };
}
//@ chunk-xr4xc2mq.js:19866-20791 layout
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
      [...getDenyRules(toolPermissionContext), ...getAskRules(toolPermissionContext)].some((h) =>
        toolMatchesRule(toolPermissionContext, tool, h),
      )
    )
      return denyAutoMemTool(
        tool,
        `${tool.name} is blocked by a permission rule for this session`,
        "permission_rule",
        reportDenial,
      );
    if (!MEMORY_READONLY_TOOLS.has(tool.name))
      return denyAutoMemTool(
        tool,
        `this background memory pass may only call ${[...MEMORY_READONLY_TOOLS].join(", ")}`,
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
//@ chunk-xr4xc2mq.js:20791-21006 layout
function collectErroredToolUseIds(e) {
  let r = new Set();
  for (let n of e) {
    if (n.type !== "user") continue;
    let content = n.message.content;
    if (!Array.isArray(content)) continue;
    for (let s of content) if (s.type === "tool_result" && s.is_error === true) r.add(s.tool_use_id);
  }
  return r;
}
//@ chunk-xr4xc2mq.js:21006-21112 layout
function getAutoMemReadPath(messages, r) {
  let readToolFilePaths = collectReadToolFilePaths(messages);
  if (readToolFilePaths === undefined) return;
  let o;
  try {
    o = expandPath(readToolFilePaths);
  } catch {
    return;
  }
  return isAllowedAutoMemWritePath(o, r) ? o : undefined;
}
//@ chunk-xr4xc2mq.js:21112-21361 layout = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let erroredToolUseIds = collectErroredToolUseIds(messages);
  let o = [];
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let y of content) {
      if (y.type === "tool_use" && erroredToolUseIds.has(y.id)) continue;
      let autoMemReadPath = getAutoMemReadPath(y, sinceUuid);
      if (autoMemReadPath !== undefined) o.push(autoMemReadPath);
    }
  }
  return uniq(o);
}
//@ chunk-xr4xc2mq.js:21361-21516 layout
function buildExtractNotice(e) {
  let r = count(e, (n) => basename(n) !== MEMORY_INDEX_FILENAME);
  return {
    source: "extract",
    summary: r > 0 ? `saved ${r} ${plural(r, "memory", "memories")}` : "updated the memory index",
    paths: e,
  };
}
//@ chunk-xr4xc2mq.js:21516-22048 file-local
function getWrittenFilePath(readFileState, r) {
  let n = new Map();
  let o = [];
  return {
    onMessage: (u) => {
      if (u.type === "assistant") {
        let content = u.message.content;
        if (!Array.isArray(content)) return;
        for (let x of content) {
          let autoMemReadPath = getAutoMemReadPath(x, r);
          if (x.type === "tool_use" && autoMemReadPath !== undefined) n.set(x.id, autoMemReadPath);
        }
        return;
      }
      if (u.type !== "user") return;
      let content = u.message.content;
      if (!Array.isArray(content)) return;
      for (let h of content) {
        if (h.type !== "tool_result") continue;
        let x = n.get(h.tool_use_id);
        if (x === undefined) continue;
        n.delete(h.tool_use_id);
        if (h.is_error === true) continue;
        o.push(x);
        logFileStateResync(readFileState, x, {
          requireReadBeforeWrite: true,
        });
      }
    },
    completedWritePaths: () => uniq(o),
  };
}
//@ chunk-xr4xc2mq.js:22048-22213 layout
function getBillingFlags(context) {
  let queryTracking = context.toolUseContext.queryTracking;
  return {
    overageInUse: queryTracking?.billedToUsageCredits ?? getCurrentLimits().overageInUse === true,
    longContextBilled: queryTracking?.longContextBilled === true,
  };
}
//@ chunk-xr4xc2mq.js:22213-22279 layout
/**
 * 超额计费时的动作：skip 或 run。
 */
function resolveOverageAction(e, r) {
  return r.overageInUse && hasKnownPlanTier() ? e.whenOverage : "run";
}
//@ chunk-xr4xc2mq.js:22279-35636 facade-exports = initExtractMemories (0.363)
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
  let o;
  let s = 0;
  function u(uuid) {
    if (uuid) {
      sinceUuid = uuid;
      o = undefined;
      s = 0;
    }
  }
  function y(p, uuid) {
    if (!p) {
      s++;
      if (s >= MIN_TURNS_SINCE) {
        logForDebugging(
          `[extractMemories] (mcp) stopped early ${s} passes in a row; the cursor moves on and these turns are not reviewed again`,
        );
        u(uuid);
        return;
      }
    }
    o = getSessionId();
    logForDebugging(
      `[extractMemories] (mcp) ${p ? "writes refused after a newer prompt" : "the pass stopped early (an API error, the turn cap or an abort of its fork before anything was saved, or a throw)"}; the cursor stays and the next pass reviews these turns again`,
    );
  }
  let h = false;
  let x = false;
  let abortController = createAbortController();
  let w = 0;
  let S = false;
  let resumedTurns;
  let resumedPassCountedRun;
  let resumedCursor;
  let U;
  let R;
  function runExtraction(p) {
    inFlightExtractions.add(p);
    return p.finally(() => inFlightExtractions.delete(p));
  }
  let laptopExtractRunner = laptopExtractModule_2?.createLaptopExtractRunner(host, runExtraction);
  function J() {
    let p = R;
    R = undefined;
    if (p?.timer !== undefined) clearTimeout(p.timer);
    return p;
  }
  function B(
    memoryDir,
    context,
    promptIndex = getPromptIndex(),
    personPrompt = getLastPersonPrompt(),
    billing = getBillingFlags(context),
    L = true,
  ) {
    J();
    if (memoryDir.idleFlushSeconds === 0) return;
    R = {
      timer: L ? setTimeout(ne, memoryDir.idleFlushSeconds * 1000).unref() : undefined,
      dueAt: L ? performance.now() + memoryDir.idleFlushSeconds * 1000 : 1 / 0,
      promptIndex,
      personPrompt,
      billing,
      context,
    };
  }
  function ne() {
    let p = J();
    if (!p || x || isSessionActive() || getPromptIndex() !== p.promptIndex) return;
    runExtraction(
      Oe({
        context: p.context,
        trigger: "idle_flush",
        promptIndex: p.promptIndex,
        personPrompt: p.personPrompt,
        billing: p.billing,
      }),
    );
  }
  function le(p) {
    try {
      memoryExtractorSlots.of(host).onPassEnded?.(p);
    } catch (error) {
      logError(toError(error));
    }
  }
  function rr(p) {
    try {
      memoryExtractorSlots.of(host).onPassSkipped?.(p);
    } catch (error) {
      logError(toError(error));
    }
  }
  function rt(messages) {
    if (S) return;
    S = true;
    let { restoredPlace, restoredPlaceAt } = memoryExtractorSlots.of(host);
    if (!restoredPlace) return;
    let C = restoredPlace.passAt !== null && (restoredPlaceAt ?? Date.now()) >= restoredPlace.passAt;
    let G = C ? restoredPlace.tail : restoredPlace.cursor;
    w = C ? 0 : restoredPlace.turns;
    resumedTurns = w;
    resumedPassCountedRun = C;
    if (G !== null && messages.some((b) => b.uuid === G)) sinceUuid = G;
    let L = sinceUuid !== undefined ? "restored" : G === null ? "none_saved" : "not_in_transcript";
    resumedCursor = fromEnum(L);
    logForDebugging(
      `[extractMemories] (mcp) resumed from the previous worker: ${w} turn end(s) since its last pass${C ? " (the pass it had scheduled is counted as run)" : ""}; cursor ${RESTORE_OUTCOME_TEXT[L]}`,
    );
  }
  function ae(messages, passAt) {
    let T = {
      turns: w,
      cursor: sinceUuid ?? null,
      tail: messages.at(-1)?.uuid ?? null,
      passAt,
    };
    try {
      memoryExtractorSlots.of(host).savePlace?.(T);
    } catch (error) {
      logError(toError(error));
    }
  }
  async function Oe({
    context,
    appendSystemMessage,
    trigger,
    promptIndex = getPromptIndex(),
    personPrompt = getLastPersonPrompt(),
    billing = getBillingFlags(context),
  }) {
    let { messages } = context;
    let memoryDir = getHostedPostTurnMemoryConfig();
    let ce = memoryDir?.carryAcrossRestarts === true && trigger === undefined;
    if (memoryDir?.carryAcrossRestarts) rt(messages);
    let newMessageCount = countTurnsSince(messages, sinceUuid);
    if (o !== undefined && o !== getSessionId()) {
      o = undefined;
      s = 0;
    }
    if (o === undefined && hasSuccessfulToolCall(messages, sinceUuid, !!memoryDir)) {
      logForDebugging("[extractMemories] skipping \u2014 conversation already wrote to memory in this range");
      u(messages.at(-1)?.uuid);
      if (ce) ae(messages, null);
      logEvent("tengu_extract_memories_skipped_direct_write", {
        message_count: newMessageCount,
      });
      if (memoryDir) rr(trigger ?? "cadence");
      return;
    }
    let ee = memoryDir ? summarizeUserTurns(messages, sinceUuid) : undefined;
    let Ce = memoryDir?.proseGate === "chat";
    let nt = Ce ? Math.max(memoryDir.reviewWindow, ee?.userTurns ?? 0) : 0;
    let sr = Ce
      ? isMemoryCandidateTurn(messages, memoryDir.minProseWords, nt)
      : hasSubstantialTurnSince(messages, sinceUuid);
    let Ee =
      memoryDir && ee
        ? turnCountBucket(Ce ? proseWordEquivalent(lastUserTurnText(messages, nt)) : ee.proseWords)
        : undefined;
    if (!sr) {
      logForDebugging("[extractMemories] skipping \u2014 not enough user prose");
      u(messages.at(-1)?.uuid);
      if (ce) ae(messages, null);
      logEvent("tengu_extract_memories_skipped_no_prose", {
        message_count: newMessageCount,
        prose_gate: fromEnumOpt(memoryDir?.proseGate),
        prose_words_bucket: fromEnumOpt(Ee),
      });
      return;
    }
    let Le = memoryDir?.everyNTurns ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_bramble_lintel", null) ?? 1;
    let cacheSafeParams = createCacheSafeParams(context);
    let ge = memoryDir ? resolveOverageAction(memoryDir, billing) : "run";
    if (trigger === undefined) {
      w++;
      if (w < Le) {
        if (memoryDir) {
          let A = w >= memoryDir.idleFlushMinTurns;
          B(memoryDir, context, promptIndex, personPrompt, billing, A);
          if (ce)
            ae(
              messages,
              A && memoryDir.idleFlushSeconds > 0 && ge !== "skip"
                ? Date.now() + memoryDir.idleFlushSeconds * 1000
                : null,
            );
        }
        return;
      }
    }
    let it = w;
    w = 0;
    if (ce) ae(messages, Date.now());
    let { toolPermissionContext } = context.toolUseContext.getAppState();
    let Ie = memoryDir ? undefined : memoryWriteBlockingRule(toolPermissionContext, getAutoMemEntrypoint());
    if (Ie !== undefined) {
      logForDebugging(
        `[extractMemories] skipping \u2014 ${describeRuleBlock(Ie)} would refuse memory writes`,
      );
      logEvent("tengu_extract_memories_skipped_permission_rule", {
        message_count: newMessageCount,
      });
      if (appendSystemMessage !== undefined) {
        let A = describeMemoryRuleBlock(host, Ie, getAutoMemPath());
        if (A !== undefined) appendSystemMessage(createSystemMessage(A, "warning"));
      }
      return;
    }
    x = true;
    let now = Date.now();
    let We;
    let { taskRegistry } = context.toolUseContext;
    let _e;
    let Ne;
    let ue = false;
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
          if (ce) ae(messages, null);
          return;
        }
        if (ge === "skip") {
          o = getSessionId();
          logForDebugging(
            "[extractMemories] skipping (mcp) \u2014 the turn was billed to Extra Usage and when_overage is 'skip'; these turns wait for the next pass",
          );
          logEvent("tengu_extract_memories_skipped_overage", {
            message_count: newMessageCount,
            trigger: fromEnum(trigger ?? "cadence"),
            long_context_billed: billing.longContextBilled,
            prose_words_bucket: fromEnumOpt(Ee),
            own_words_turns: ee?.ownWordsTurns,
          });
          if (ce) ae(messages, null);
          return;
        }
        let Q =
          memoryDir.firstLook === undefined
            ? "off"
            : ge === "first_look"
              ? "enforce"
              : memoryDir.firstLook.mode;
        let je =
          memoryDir.firstLook !== undefined && Q !== "off"
            ? runMemoryFirstLook({
                config: memoryDir.firstLook,
                messages,
                sinceUuid,
                window: memoryDir.reviewWindow,
                signal: context.toolUseContext.abortController.signal,
                credentials: context.toolUseContext.credentials,
              })
            : undefined;
        if (je !== undefined && Q === "enforce") {
          let D = await je;
          logForDebugging(
            `[extractMemories] first look (enforce, a "no" skips the pass) answered ${D.verdict} after ${D.durationMs}ms`,
          );
          if (getPromptIndex() !== promptIndex) {
            w = it;
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
          if (D.verdict === "no" || D.verdict === "empty") {
            logForDebugging(
              `[extractMemories] skipping (mcp) \u2014 the first look answered ${D.verdict}; these turns wait for the next pass`,
            );
            logEvent("tengu_extract_memories_skipped_first_look", {
              message_count: newMessageCount,
              trigger: fromEnum(trigger ?? "cadence"),
              overage_in_use: billing.overageInUse,
              when_overage: fromEnum(ge),
              first_look_verdict: fromEnum(D.verdict),
              first_look_model: telemetrySafeModelName(D.model),
              first_look_ms: D.durationMs,
              first_look_input_chars: D.inputChars,
              first_look_user_turns: D.userTurns,
              prose_words_bucket: fromEnumOpt(Ee),
              own_words_turns: ee?.ownWordsTurns,
            });
            return;
          }
        }
        logForDebugging(
          `[extractMemories] starting (mcp, ${trigger ?? "cadence"}) \u2014 ${newMessageCount} new messages`,
        );
        let Ae = 0;
        let canUseTool = createChildAbortController(context.toolUseContext.abortController);
        if (memoryDir.declareTask) {
          _e = registerPostTurnMemoryTask(taskRegistry, canUseTool);
          Ne = canUseTool.signal;
        }
        let ft = memoryTrialRunner?.servedTrial(memoryDir);
        let pt =
          memoryTrialRunner !== null && ft !== undefined
            ? await memoryTrialRunner.runTrial({
                served: ft,
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
        let ve = memoryDir.staleNote ? heldMemoryVersions(host) : undefined;
        let gt = ve
          ? buildStaleReadNotice(ve, messagesSinceCompactBoundary(messages), findStaleCarriedReads)
          : "";
        let cacheSafeParams_2 = heldPostTurnInstruction(host);
        let startTime = Date.now();
        let Me = await runForkedAgent({
          promptMessages: [
            createUserMessage({
              content: (cacheSafeParams_2 ?? memoryDir.instruction) + gt,
            }),
          ],
          cacheSafeParams,
          canUseTool: makeMemoryPassCanUseTool(promptIndex, () => {
            Ae++;
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
        ue = Ne?.aborted === true;
        let re = await je;
        if (re !== undefined && Q === "shadow")
          logForDebugging(
            `[extractMemories] first look (shadow, the pass ran regardless) answered ${re.verdict} after ${re.durationMs}ms`,
          );
        let se = messagesNotIn(Me.messages, messages);
        if (ve) mergeReadVersions(host, ve, se);
        let existingMemories = collectErroredToolUseIds(se);
        let me = count(
          se.flatMap((D) =>
            D.type === "assistant" && Array.isArray(D.message.content) ? D.message.content : [],
          ),
          (D) => D.type === "tool_use" && MEMORY_MUTATING_TOOLS.has(D.name) && !existingMemories.has(D.id),
        );
        let ht = hasMaxTurnsReached(se);
        let ke = lastAssistantWasApiError(se) || (me === 0 && (ht || ue));
        let unfinishedInARow = ke && me === 0 ? s + 1 : 0;
        if (me > 0 || (Ae === 0 && !ke)) u(messages.at(-1)?.uuid);
        else y(!ke, messages.at(-1)?.uuid);
        logEvent("tengu_extract_memories_extraction", {
          mode: fromEnum("mcp"),
          trigger: fromEnum(trigger ?? "cadence"),
          account_memory_line_rendered: false,
          every_n_turns: Le,
          input_tokens: Me.totalUsage.input_tokens,
          output_tokens: Me.totalUsage.output_tokens,
          cache_read_input_tokens: Me.totalUsage.cache_read_input_tokens,
          cache_creation_input_tokens: Me.totalUsage.cache_creation_input_tokens,
          message_count: newMessageCount,
          parent_context_tokens: estimateTokensWithAnchor(messages),
          compacted_in_fork: se.some(isCompactBoundaryMessage),
          turn_count: count(se, (D) => D.type === "assistant"),
          written: me,
          superseded_writes: Ae,
          instruction_source: fromEnum(cacheSafeParams_2 === undefined ? "env" : "memory_context"),
          stale_note_rendered: gt !== "",
          review_unfinished: ke,
          unfinished_in_a_row: unfinishedInARow,
          reached_cap: ht,
          duration_ms: durationMs,
          fork_model: telemetrySafeModelName(context.toolUseContext.options.mainLoopModel),
          turns_since_last_pass: it,
          prose_gate: fromEnum(memoryDir.proseGate),
          prose_words_bucket: fromEnumOpt(Ee),
          user_turns: ee?.userTurns,
          own_words_turns: ee?.ownWordsTurns,
          own_words_chars: ee?.ownWordsChars,
          task_notification_turns: ee?.taskNotificationTurns,
          unstamped_turns: ee?.unstampedTurns,
          overage_in_use: billing.overageInUse,
          long_context_billed: billing.longContextBilled,
          when_overage: fromEnum(ge),
          first_look_mode: fromEnum(Q),
          first_look_verdict: fromEnumOpt(re?.verdict),
          first_look_error: fromEnumOpt(re?.error),
          first_look_model: telemetrySafeModelName(re?.model),
          first_look_ms: re?.durationMs,
          first_look_input_chars: re?.inputChars,
          first_look_user_turns: re?.userTurns,
          idle_flush_min_turns: memoryDir.idleFlushMinTurns,
          carry_across_restarts: memoryDir.carryAcrossRestarts,
          resumed_turns: resumedTurns,
          resumed_pass_counted_run: resumedPassCountedRun,
          resumed_cursor: resumedCursor,
        });
        logFeatureOk("ccr_memory_extract");
        le({
          outcome: me > 0 ? "saved" : ke ? "unfinished" : Ae > 0 ? "writes_refused" : "nothing_to_save",
          trigger: trigger ?? "cadence",
          written: me,
          durationMs: Date.now() - now,
        });
        if (memoryTrialRunner !== null && pt !== undefined)
          memoryTrialRunner.logPair(
            pt,
            se,
            trigger ?? "cadence",
            context.toolUseContext.options.mainLoopModel,
          );
        return;
      }
      let sinceUuid_2 = getAutoMemPath();
      logForDebugging(
        `[extractMemories] starting \u2014 ${newMessageCount} new messages, memoryDir=${sinceUuid_2}`,
      );
      let he = isSharedMemoryServedViaTools();
      let $e = canUseTeamMemory() || he;
      let canUseTool = createAutoMemCanUseTool(sinceUuid_2, undefined, {
        fork: "extraction",
      });
      let writtenPaths = formatMemoryManifest(
        await scanMemoryFiles(sinceUuid_2, createAbortController().signal, context.toolUseContext.storageV5),
      );
      let dt = false;
      let He =
        extractorRuntime?.isPromoterExtractorOn() === true
          ? extractorRuntime.typedTurnsInWindow(host, context.toolUseContext.session.id, messages, sinceUuid)
          : [];
      let content =
        buildExtractMemoriesPrompt(newMessageCount, writtenPaths, $e, he, dt) +
        (extractorRuntime?.typedTurnsPromptBlock(He) ?? "");
      let be = extractorRuntime !== null && He.length > 0 ? makeSaltedName("extract_memories") : undefined;
      let dr = be === undefined ? undefined : extractorRuntime?.registerExtractorFork(host, be, He);
      We = getWrittenFilePath(context.toolUseContext.readFileState, sinceUuid_2);
      let V = await runForkedAgent({
        promptMessages: [
          createUserMessage({
            content,
          }),
        ],
        cacheSafeParams,
        canUseTool,
        querySource: "extract_memories",
        forkLabel: "extract_memories",
        ...(be !== undefined && {
          overrides: {
            agentId: be,
          },
        }),
        skipTranscript: true,
        maxTurns: 5,
        skipCacheWrite: isBasaltSpurEnabled(),
        onMessage: We.onMessage,
      }).finally(() => dr?.());
      u(messages.at(-1)?.uuid);
      let turnCount = countToolCallsSince(V.messages, sinceUuid_2);
      let turnCount_2 = count(V.messages, (Q) => Q.type === "assistant");
      let lt =
        V.totalUsage.input_tokens +
        V.totalUsage.cache_creation_input_tokens +
        V.totalUsage.cache_read_input_tokens;
      let mr = lt > 0 ? ((V.totalUsage.cache_read_input_tokens / lt) * 100).toFixed(1) : "0.0";
      logForDebugging(
        `[extractMemories] finished \u2014 ${turnCount.length} files written, cache: read=${V.totalUsage.cache_read_input_tokens} create=${V.totalUsage.cache_creation_input_tokens} input=${V.totalUsage.input_tokens} (${mr}% hit)`,
      );
      if (turnCount.length > 0) logForDebugging(`[extractMemories] memories saved: ${turnCount.join(", ")}`);
      else logForDebugging("[extractMemories] no memories saved this run");
      let memoryPaths = turnCount.filter((Q) => basename(Q) !== MEMORY_INDEX_FILENAME);
      let mt = count(memoryPaths, isTeamMemPath);
      logEvent("tengu_extract_memories_extraction", {
        mode: fromEnum("file"),
        input_tokens: V.totalUsage.input_tokens,
        output_tokens: V.totalUsage.output_tokens,
        cache_read_input_tokens: V.totalUsage.cache_read_input_tokens,
        cache_creation_input_tokens: V.totalUsage.cache_creation_input_tokens,
        message_count: newMessageCount,
        parent_context_tokens: estimateTokensWithAnchor(messages),
        compacted_in_fork: V.messages.some(isCompactBoundaryMessage),
        turn_count: turnCount_2,
        files_written: turnCount.length,
        memories_saved: memoryPaths.length,
        team_memories_saved: mt,
        account_memory_line_rendered: dt,
        duration_ms: Date.now() - now,
      });
      logForDebugging(
        `[extractMemories] writtenPaths=${turnCount.length} memoryPaths=${memoryPaths.length} appendSystemMessage defined=${appendSystemMessage != null}`,
      );
      if (memoryPaths.length > 0) {
        let msg = createMemorySavedMessage(memoryPaths);
        msg.teamCount = mt;
        appendSystemMessage?.(msg);
      }
      if (turnCount.length > 0)
        await resyncMemoryWrites(context.toolUseContext, buildExtractNotice(turnCount));
      logFeatureOk("memory_extract");
    } catch (error) {
      ue = Ne?.aborted === true;
      logForDebugging(`[extractMemories] error: ${error}`);
      if (!ue) {
        logEvent("tengu_extract_memories_error", {
          duration_ms: Date.now() - now,
          mode: fromEnum(memoryDir ? "mcp" : "file"),
        });
        logFeatureBad(memoryDir ? "ccr_memory_extract" : "memory_extract", "agent_error");
      }
      if (memoryDir) {
        if (_e !== undefined && !ue) finishMemoryTask(_e, taskRegistry, "failed");
        le({
          outcome: ue ? "unfinished" : "failed",
          trigger: trigger ?? "cadence",
          written: 0,
          durationMs: Date.now() - now,
        });
        y(false, messages.at(-1)?.uuid);
      }
      let he = We?.completedWritePaths() ?? [];
      if (he.length > 0)
        try {
          await resyncMemoryWrites(context.toolUseContext, buildExtractNotice(he));
        } catch (error) {
          logForDebugging(
            `[extractMemories] could not queue the notice for writes that landed before the error: ${errorMessage(error)}`,
          );
        }
    } finally {
      x = false;
      if (_e !== undefined) finishMemoryTask(_e, taskRegistry, ue ? "killed" : "completed");
      let A = U;
      U = undefined;
      if (A && Le <= 1) {
        logForDebugging("[extractMemories] running trailing extraction for stashed context");
        await Oe({
          context: A.context,
          appendSystemMessage: A.appendSystemMessage,
          trigger: "trailing",
          promptIndex: A.promptIndex,
          personPrompt: A.personPrompt,
          billing: A.billing,
        });
      } else if (A && memoryDir) B(memoryDir, A.context, A.promptIndex, A.personPrompt, A.billing);
    }
  }
  async function executeExtractMemoriesImpl(context, appendSystemMessage) {
    if (context.toolUseContext.agentId) return;
    let T = laptopExtractRunner?.onTurnEnd(context, appendSystemMessage);
    try {
      if (isExtractModeActive() || isPromoterExtractorOn()) await or(context, appendSystemMessage);
    } finally {
      await T;
    }
  }
  async function or(context, appendSystemMessage) {
    J();
    let hostedPostTurnMemoryConfig = getHostedPostTurnMemoryConfig();
    let C = hostedPostTurnMemoryConfig !== null;
    let G = (L) => {
      if (hostedPostTurnMemoryConfig?.carryAcrossRestarts) {
        rt(context.messages);
        ae(context.messages, L);
      }
    };
    if (C && (getMemoryToggledOff() || isSafeMode() || isRestrictedSession())) {
      G(null);
      return;
    }
    if (
      C &&
      !(
        isAccountMemoryServer(findMemoryServer(context.toolUseContext.options.mcpClients)) &&
        context.toolUseContext.options.tools.some((tool) => toolMatchesName(tool, MEMORY_WRITE_TOOL))
      )
    ) {
      logForDebugging("[extractMemories] skipping (mcp) \u2014 CCR memory server not mounted");
      G(null);
      return;
    }
    if (
      C &&
      isCoordinatorMode_2() &&
      applyCoordinatorToolFilter(
        context.toolUseContext.options.tools.filter((tool) => toolMatchesName(tool, MEMORY_WRITE_TOOL)),
      ).length === 0
    ) {
      logForDebugging(
        "[extractMemories] skipping (mcp) \u2014 coordinator mode: the write tool is held on the memory server's word alone",
      );
      G(null);
      return;
    }
    if (!C && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_passport_quail", false) && !isPromoterExtractorOn())
      return;
    if (!C && !isAutoMemoryEnabled()) {
      if (isAutoMemoryHeldForSession()) sinceUuid = context.messages.at(-1)?.uuid ?? sinceUuid;
      return;
    }
    if (!C && isAutoMemReadFenced()) return;
    if (getRemoteCaps() !== null) return;
    if (x) {
      logForDebugging("[extractMemories] extraction in progress \u2014 stashing for trailing run");
      logEvent("tengu_extract_memories_coalesced", {});
      let billingFlags = getBillingFlags(context);
      U = {
        context,
        appendSystemMessage,
        promptIndex: getPromptIndex(),
        personPrompt: getLastPersonPrompt(),
        billing: billingFlags,
      };
      if (hostedPostTurnMemoryConfig)
        G(
          (hostedPostTurnMemoryConfig.everyNTurns <= 1 || hostedPostTurnMemoryConfig.idleFlushSeconds > 0) &&
            resolveOverageAction(hostedPostTurnMemoryConfig, billingFlags) !== "skip"
            ? Date.now() + hostedPostTurnMemoryConfig.idleFlushSeconds * 1000
            : null,
        );
      return;
    }
    await Oe({
      context,
      appendSystemMessage,
    });
  }
  let pe = memoryExtractorSlots.of(host);
  pe.extractor = (context, appendSystemMessage) =>
    runExtraction(executeExtractMemoriesImpl(context, appendSystemMessage));
  pe.drainer = async (p = 60000) => {
    let P = Date.now() + p;
    abortController.abort();
    ne();
    laptopExtractRunner?.disarmIdleFlush();
    while (inFlightExtractions.size > 0 && Date.now() < P) {
      await Promise.race([
        Promise.all(inFlightExtractions).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, P - Date.now()).unref()),
      ]);
      ne();
    }
  };
  pe.disarm = () => {
    pe.extractor = null;
    U = undefined;
    J();
    laptopExtractRunner?.disarmIdleFlush();
  };
  pe.owedWithin = (p) =>
    inFlightExtractions.size > 0 ||
    (R?.timer !== undefined && R.promptIndex === getPromptIndex() && R.dueAt - performance.now() <= p);
}
//@ chunk-xr4xc2mq.js:35636-35727 layout
function isPromoterExtractorOn() {
  return (
    extractorRuntime !== null &&
    extractorRuntime.EXTRACTOR_RUNS_FOR_PROMOTER &&
    extractorRuntime.isPromoterExtractorOn()
  );
}
//@ chunk-xr4xc2mq.js:35727-35793 facade-exports
function isLaptopExtractActive(e) {
  return laptopExtractModule_2 !== null && laptopExtractModule_2.isLaptopExtractDispatched(e);
}
//@ chunk-xr4xc2mq.js:35793-35853 facade-exports
function isLaptopExtractSync(e) {
  return laptopExtractModule_2 !== null && laptopExtractModule_2.isLaptopExtractSync(e);
}
//@ chunk-xr4xc2mq.js:35853-35937 facade-exports
async function executeExtractMemories(e, r) {
  await memoryExtractorSlots.of(e.toolUseContext.session.host).extractor?.(e, r);
}
//@ chunk-xr4xc2mq.js:35937-35987 facade-exports
async function drainPendingExtraction(e, r) {
  await memoryExtractorSlots.of(e).drainer(r);
}
//@ chunk-xr4xc2mq.js:35987-36072 facade-exports
function restoreMemoryExtractPlace(e, r) {
  let n = memoryExtractorSlots.of(e);
  n.restoredPlace = parsePostTurnMemoryConfig(r);
  n.restoredPlaceAt = Date.now();
}
//@ chunk-xr4xc2mq.js:36072-36111 facade-exports
function onMemoryExtractPlace(e, savePlace) {
  memoryExtractorSlots.of(e).savePlace = savePlace;
}
//@ chunk-6exk38gf.js:227-848 placement
/**
 * 检查后台记忆代理等受限调用方的 Bash 输入：要求关闭沙箱或后台运行时拒绝并给出说明，否则返回把两项强制为 false 的输入。
 */
function sanitizeBackgroundBashInput(callerName, input) {
  let a = booleanishSchema().safeParse(input.dangerouslyDisableSandbox);
  if (a.success && a.data)
    return {
      deniedFlag: "dangerouslyDisableSandbox",
      message: `unsandboxed execution (dangerouslyDisableSandbox) is not available to ${callerName}. If the command failed with a sandbox violation, the operation cannot be performed in this context \u2014 do not retry it.`,
    };
  let o = booleanishSchema().safeParse(input.run_in_background);
  if (o.success && o.data)
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
export {
  initExtractMemories,
  isAllowedAutoMemWritePath,
  DELETE_COMMAND_NAMES,
  memoryWriteBlockingRule,
  createAutoMemCanUseTool,
};
