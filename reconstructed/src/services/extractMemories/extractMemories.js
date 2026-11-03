/**
 * services/extractMemories/extractMemories.ts
 *
 * 回合结束后的自动记忆提取：节流、跳过条件、hosted post-turn 配置、记忆代理的工具权限守卫。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/extractMemories/extractMemories.ts
 * pieces: chunk-xr4xc2mq.js (26)
 * attribution: facade-exports 11, fingerprint 1, file-local 2, sole-consumer 3, layout 9
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
  pKe,
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
import { sanitizeBackgroundBashInput } from "./_new/sanitizeBackgroundBashInput.js";
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
  Ias,
  xas,
  NPt,
  getHostedPostTurnMemoryConfig,
  CTi,
  MEMORY_WRITE_TOOL,
  ATi,
} from "../../memdir/memoryTool.js";
import {
  collectReadToolFilePaths,
  Ot,
  te,
  countTurnsSince,
  hasSuccessfulToolCall,
  summarizeUserTurns,
  isMemoryCandidateTurn,
  hasSubstantialTurnSince,
  bt,
  Re,
  Qe,
  YBn,
  describeMemoryRuleBlock,
  runMemoryFirstLook,
  registerPostTurnMemoryTask,
  getLastHumanTurnUuid,
  Lt,
  It,
  Ft,
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
import { mZs, buildStaleReadNotice, gZs, mergeReadVersions } from "../accountMemory/memoryContext.js";
import { Us, isCompactBoundaryMessage } from "../projects/threadRows.js";
import { findStaleCarriedReads } from "../accountMemory/memoryUpdates.js";
import { Tp } from "../compact/autoCompact.js";
import { rar } from "../../memdir/memoryStoresPrompt.js";
import { a4, isTeamMemPath } from "../../memdir/teamMemPaths.js";
import { formatMemoryManifest, scanMemoryFiles } from "../../memdir/memoryScan.js";
import { buildExtractMemoriesPrompt } from "./prompts.js";
import { makeSaltedName } from "../../utils/agentId.js";
import { DGt } from "../api/claude.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { toolMatchesName } from "../../Tool.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { applyCoordinatorToolFilter } from "../../utils/toolPool.js";
import { Jn } from "../../remote/remoteMode.js";

//@ chunk-xr4xc2mq.js:13452-13556 facade-exports
var laptopExtractModule = null,
  Vt = null,
  ie = null,
  we = null,
  DELETE_COMMAND_NAMES = "rm|remove-item|ri|del|erase",
  regExp = new RegExp(`^(?:${DELETE_COMMAND_NAMES})$`, "i");
/**
 * 拒绝记忆代理的工具调用并打 tengu_auto_mem_tool_denied（带原因）。
 */
//@ chunk-xr4xc2mq.js:13556-13769 fingerprint = denyAutoMemTool (1)
function denyAutoMemTool(e, r, n, o = !0) {
  if ((logForDebugging(`[autoMem] denied ${e.name} (${n}): ${r}`), o))
    logEvent("tengu_auto_mem_tool_denied", {
      tool_name: sanitizeToolNameForAnalytics(e.name),
      reason: fromEnum(n),
    });
  return { behavior: "deny", message: r, decisionReason: { type: "other", reason: r } };
}
/**
 * 从工具调用中提取记忆代理写入的文件路径。
 */
//@ chunk-xr4xc2mq.js:13769-14192 file-local
function extractWrittenPaths(e, r) {
  let n = e.trim().match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  if (n.length < 2) return;
  if (!regExp.test(n[0])) return;
  let paths = [];
  for (let s = 1; s < n.length; s++) {
    let u = n[s];
    if (/^-(?:Literal)?Path$/i.test(u)) continue;
    if (u.startsWith("-")) return;
    let y =
      (u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'")) ? u.slice(1, -1) : u;
    if (/[*?[\]$`(){}|;&<>"',]/.test(y)) return;
    if (!isAllowedAutoMemWritePath(y, r)) return;
    paths.push(y);
  }
  return paths.length > 0 ? paths : void 0;
}
/**
 * 记忆提取允许的文件工具集合，以及恢复记忆结果的说明文字表。
 */
//@ chunk-xr4xc2mq.js:14192-14352 sole-consumer
var MEMORY_FILE_TOOLS = new Set([
    FILE_READ_TOOL_NAME,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
  ]),
  RESTORE_OUTCOME_TEXT = {
    restored: "restored",
    none_saved: "none saved",
    not_in_transcript: "not restored: that message is no longer in the transcript",
  };
/**
 * 判断 Bash 命令是否只是对给定目录的简单 ls：单条命令、参数为字面量、无重定向/环境变量，非选项参数都解析到该目录（不含通配、..、~、反斜杠）。
 */
//@ chunk-xr4xc2mq.js:14352-14916 sole-consumer
async function isSimpleLsOfDir(command, dir) {
  let n = await parseForSecurity(command);
  if (n.kind !== "simple" || n.commands.length !== 1) return !1;
  let parsed = n.commands[0];
  if (
    parsed === void 0 ||
    parsed.argvSourceLiteral !== !0 ||
    parsed.argv[0] !== "ls" ||
    parsed.redirects.length > 0 ||
    parsed.envVars.length > 0
  )
    return !1;
  let s = (h) => h.replace(/[/\\]+$/, ""),
    u = new Set(getPathsForPermissionCheck(dir).map(s)),
    pathArgs = parsed.argv.slice(1).filter((h) => !/^-[laA1hF]+$/.test(h));
  return (
    pathArgs.length > 0 &&
    pathArgs.every((h) => {
      if (
        h.startsWith("-") ||
        h.startsWith("~") ||
        h !== h.trim() ||
        h.split(/[/\\]/).includes("..") ||
        /[*?[]/.test(h) ||
        h.includes("\\")
      )
        return !1;
      try {
        return getPathsForPermissionCheck(expandPath(h)).every((x) => u.has(s(x)));
      } catch {
        return !1;
      }
    })
  );
}
//@ chunk-xr4xc2mq.js:14916-14991 sole-consumer
function Ir(e) {
  return e.replace(/['"`\\\u2018-\u201F]/g, "").includes("..");
}
//@ chunk-xr4xc2mq.js:15271-15488 facade-exports
function memoryWriteBlockingRule(e, r) {
  try {
    for (let n of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME]) {
      let o = getDenyRuleForTool(e, { name: n }) ?? getAskRuleForTool(e, { name: n });
      if (o !== null) return o;
    }
    for (let n of getPathsForPermissionCheck(r))
      for (let o of ["deny", "ask"]) {
        let s = matchingRuleForInput(n, e, "edit", o);
        if (s !== null) return s;
      }
  } catch (error) {
    logError(toError(error));
  }
  return;
}
/**
 * 解析只删除自动记忆目录内文件的 rm 命令：单条简单命令，只允许 -f/--force 与 --，不允许通配，所有目标为允许写入的绝对路径；返回目标列表，不符合返回 undefined。
 */
//@ chunk-xr4xc2mq.js:15488-16054 layout
async function parseAutoMemRm(command, memDir) {
  let n = await parseForSecurity(command);
  if (n.kind !== "simple" || n.usesAssignedValue === !0 || n.laterLoopPassesDiffer === !0) return;
  if (n.commands.length !== 1) return;
  let parsed = n.commands[0];
  if (!parsed) return;
  if (parsed.argv[0] !== "rm") return;
  if (parsed.redirects.length > 0) return;
  if (parsed.envVars.length > 0) return;
  let targets = [],
    u = !1;
  for (let y = 1; y < parsed.argv.length; y++) {
    let h = parsed.argv[y];
    if (h === void 0) continue;
    if (!u) {
      if (h === "--") {
        u = !0;
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
  return targets.length > 0 ? targets : void 0;
}
//@ chunk-xr4xc2mq.js:16054-16152 facade-exports = isSessionPlanFile (1)
function isAllowedAutoMemWritePath(path, dir) {
  let included = normalize(path).slice(dir.length).includes(":");
  return path.endsWith(".md") && !included && isAutoMemPathSafeForCarveout(path, dir);
}
/**
 * 记忆提取/整理子代理的 canUseTool：拒绝 MCP 工具、需 hook 确认的调用、危险 shell 参数，只允许在记忆目录内读写，删除命令受限。
 */
//@ chunk-xr4xc2mq.js:16152-19866 facade-exports = createAutoMemCanUseTool (0.254)
function createAutoMemCanUseTool(e, r, { fork: n = "dream", onWriteAllowed: o } = {}) {
  return async (s, u, y, h, x, z) => {
    if (isAutoMemoryHeldForSession()) return denyAutoMemTool(s, MEMORY_PAUSED_MESSAGE, "memory_paused");
    if (s.mcpInfo) return denyAutoMemTool(s, "MCP tools are not available to the memory agent", "mcp_tool");
    if (z !== void 0 || y.hookAskFloor)
      return denyAutoMemTool(
        s,
        "a PreToolUse hook requires confirmation for this call, and the memory agent runs headless with no user to answer \u2014 the call is denied",
        "hook_ask",
      );
    let w;
    if (s.name === BASH_TOOL_NAME || s.name === POWERSHELL_TOOL_NAME) {
      let M = sanitizeBackgroundBashInput("the memory agent", u);
      if (M.deniedFlag !== void 0) return denyAutoMemTool(s, M.message, "shell_flag");
      if (
        ((w = M.sanitizedInput),
        getPlatform() === "windows" &&
          y.getAppState().toolPermissionContext.blockReadsOutsideWorkingDirectories === !0 &&
          typeof u.command === "string" &&
          Ir(u.command))
      )
        return denyAutoMemTool(
          s,
          "On Windows with permissions.blockReadsOutsideWorkingDirectories on, the memory agent's shell commands may not contain '..' anywhere, even split by quotes or a backslash, because where it leads cannot be checked. Use absolute paths, and avoid '..' in patterns too.",
          "windows_dot_dot",
        );
    }
    try {
      let M = require("./chunk-rd4xtrpj.js"),
        { checkRuleBasedPermissions: checkRuleBasedPermissions } = M,
        { carriesAskRuleIntent: carriesAskRuleIntent } = M,
        appState = y.getAppState(),
        replaced = e.replace(/[/\\]+$/, ""),
        X =
          appState.toolPermissionContext.blockReadsOutsideWorkingDirectories === !0 &&
          appState.toolPermissionContext.restricted !== !0 &&
          !isAutoMemPathFromRepoSettings() &&
          ![replaced, ...getPathsForPermissionCheck(replaced)].some((le) =>
            isDangerousMemoryRoot(le.replace(/[/\\]+$/, "")),
          ),
        Y = { ...y, toolUseId: x },
        J = {
          ...Y,
          getAppState: () => ({
            ...appState,
            toolPermissionContext: {
              ...appState.toolPermissionContext,
              additionalWorkingDirectories: new Map([
                ...appState.toolPermissionContext.additionalWorkingDirectories,
                [replaced, { path: replaced, source: "session" }],
              ]),
            },
          }),
        },
        B = await checkRuleBasedPermissions(s, u, X && MEMORY_FILE_TOOLS.has(s.name) ? J : Y, {
          crashIsObjection: !0,
        }),
        ne =
          B?.behavior === "ask" &&
          getPlatform() !== "windows" &&
          X &&
          s.name === BASH_TOOL_NAME &&
          B.decisionReason?.type === "safetyCheck" &&
          B.decisionReason.circuitBreaker === "outsideReadsBlocked" &&
          !carriesAskRuleIntent(B) &&
          typeof u.command === "string" &&
          (await isSimpleLsOfDir(u.command, e)) &&
          (await checkRuleBasedPermissions(s, u, J, { crashIsObjection: !0 })) === null;
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
      return (
        logError(toError(error)),
        denyAutoMemTool(
          s,
          "the memory agent could not evaluate configured permission rules; failing closed",
          "rule_check_failed",
        )
      );
    }
    if (s.name === REPL_TOOL_NAME) return { behavior: "allow", updatedInput: u };
    if (s.name === FILE_READ_TOOL_NAME || s.name === GREP_TOOL_NAME || s.name === GLOB_TOOL_NAME) {
      let toolPermissionContext = y.getAppState().toolPermissionContext,
        E = checkReadNetworkPathSafety(s, u, toolPermissionContext);
      if (E) return denyAutoMemTool(s, E.message, "network_path");
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0) {
        let j = checkReadPermissionForTool(s, u, toolPermissionContext);
        if (j.behavior === "deny") {
          let U = s.getPath?.(u),
            mapped = getPathsForPermissionCheck(e).map((Y) => (Y.endsWith(sep) ? Y : Y + sep));
          if (
            !(
              U !== void 0 &&
              !isAutoMemPathFromRepoSettings() &&
              getPathsForPermissionCheck(U).every((Y) =>
                mapped.some((J) => isAutoMemPathSafeForCarveout(Y, J)),
              )
            ) ||
            j.decisionReason.type !== "other" ||
            j.decisionReason.reason !== OUTSIDE_READS_BLOCKED_DENY_REASON
          )
            return denyAutoMemTool(s, j.message, "read_block");
        }
      }
      return { behavior: "allow", updatedInput: u };
    }
    if (s.name === BASH_TOOL_NAME || s.name === POWERSHELL_TOOL_NAME) {
      let M = w ?? u,
        parsed = s.inputSchema.safeParse(u);
      if (parsed.success) {
        if (s.isReadOnly(parsed.data, y)) return { behavior: "allow", updatedInput: M };
        let command = parsed.data.command;
        if (typeof command === "string") {
          if (
            (s.name === BASH_TOOL_NAME
              ? await parseAutoMemRm(command, e)
              : extractWrittenPaths(command, e)) !== void 0
          )
            return { behavior: "allow", updatedInput: M };
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
      if (typeof filePath === "string" && isAllowedAutoMemWritePath(filePath, e))
        return (o?.(filePath, x), { behavior: "allow", updatedInput: u });
    }
    let S = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    return denyAutoMemTool(
      s,
      `only ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${S}, and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} within ${e} are allowed`,
      "tool_not_allowed",
    );
  };
}
/**
 * 构造后台记忆提取的 canUseTool：记忆被关闭、会话工具调用被挂起、没有 CCR 记忆服务器、命中 deny/ask 规则、工具不在允许列表、或已有更新的用户回合（写类工具）时拒绝；ToolSearch/REPL 直接放行。
 */
//@ chunk-xr4xc2mq.js:19866-20791 layout
function makeMemoryPassCanUseTool(promptIndex, onAbort, reportDenial = !0) {
  return async (tool, input, context) => {
    if (getMemoryToggledOff())
      return denyAutoMemTool(tool, MEMORY_PAUSED_MESSAGE, "memory_paused", reportDenial);
    let toolPermissionContext = context.getAppState().toolPermissionContext;
    if (pKe(toolPermissionContext))
      return (
        onAbort(),
        denyAutoMemTool(
          tool,
          "tool calls are held in this session until the user writes; this background memory pass cannot run",
          "tools_held",
          reportDenial,
        )
      );
    if (tool.name === TOOL_SEARCH_TOOL_NAME || tool.name === REPL_TOOL_NAME)
      return { behavior: "allow", updatedInput: input };
    if (!isAccountMemoryServer(Ias(context.options.mcpClients)))
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
    if (!xas.has(tool.name))
      return denyAutoMemTool(
        tool,
        `this background memory pass may only call ${[...xas].join(", ")}`,
        "tool_not_allowed",
        reportDenial,
      );
    if (NPt.has(tool.name) && getPromptIndex() !== promptIndex)
      return (
        onAbort(),
        denyAutoMemTool(
          tool,
          "a newer user turn has started; this background memory pass may no longer write",
          "newer_turn",
          reportDenial,
        )
      );
    return { behavior: "allow", updatedInput: input };
  };
}
//@ chunk-xr4xc2mq.js:20791-21006 layout
function collectErroredToolUseIds(e) {
  let r = new Set();
  for (let n of e) {
    if (n.type !== "user") continue;
    let content = n.message.content;
    if (!Array.isArray(content)) continue;
    for (let s of content) if (s.type === "tool_result" && s.is_error === !0) r.add(s.tool_use_id);
  }
  return r;
}
//@ chunk-xr4xc2mq.js:21006-21112 layout
function getAutoMemReadPath(e, r) {
  let n = collectReadToolFilePaths(e);
  if (n === void 0) return;
  let o;
  try {
    o = expandPath(n);
  } catch {
    return;
  }
  return isAllowedAutoMemWritePath(o, r) ? o : void 0;
}
//@ chunk-xr4xc2mq.js:21112-21361 layout = countToolCallsSince (1)
function countToolCallsSince(messages, sinceUuid) {
  let n = collectErroredToolUseIds(messages),
    o = [];
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    let content = message.message.content;
    if (!Array.isArray(content)) continue;
    for (let y of content) {
      if (y.type === "tool_use" && n.has(y.id)) continue;
      let h = getAutoMemReadPath(y, sinceUuid);
      if (h !== void 0) o.push(h);
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
function getWrittenFilePath(e, r) {
  let n = new Map(),
    o = [];
  return {
    onMessage: (u) => {
      if (u.type === "assistant") {
        let content = u.message.content;
        if (!Array.isArray(content)) return;
        for (let x of content) {
          let z = getAutoMemReadPath(x, r);
          if (x.type === "tool_use" && z !== void 0) n.set(x.id, z);
        }
        return;
      }
      if (u.type !== "user") return;
      let content = u.message.content;
      if (!Array.isArray(content)) return;
      for (let h of content) {
        if (h.type !== "tool_result") continue;
        let x = n.get(h.tool_use_id);
        if (x === void 0) continue;
        if ((n.delete(h.tool_use_id), h.is_error === !0)) continue;
        (o.push(x), logFileStateResync(e, x, { requireReadBeforeWrite: !0 }));
      }
    },
    completedWritePaths: () => uniq(o),
  };
}
//@ chunk-xr4xc2mq.js:22048-22213 layout
function getBillingFlags(e) {
  let queryTracking = e.toolUseContext.queryTracking;
  return {
    overageInUse: queryTracking?.billedToUsageCredits ?? getCurrentLimits().overageInUse === !0,
    longContextBilled: queryTracking?.longContextBilled === !0,
  };
}
//@ chunk-xr4xc2mq.js:22213-22279 layout
function Jt(e, r) {
  return r.overageInUse && hasKnownPlanTier() ? e.whenOverage : "run";
}
/**
 * 注册回合结束后的记忆提取器：跳过本区间已直接写过记忆、用户文字太少、权限规则拒绝写记忆、超额计费（when_overage=skip）、first look 判否等情况；按 everyNTurns（tengu_bramble_lintel，默认 1）节流，空闲 idle_flush_s 后补跑；并发时合并为尾随运行。
 */
//@ chunk-xr4xc2mq.js:22279-35636 facade-exports = initExtractMemories (0.363)
function initExtractMemories(e) {
  if (env.CLAUDE_CODE_POST_TURN_MEMORY && getHostedPostTurnMemoryConfig() === null)
    (logForDebugging(
      "[extractMemories] CLAUDE_CODE_POST_TURN_MEMORY is set but CLAUDE_CODE_POST_TURN_MEMORY_CONFIG is missing or invalid; the pass is off",
    ),
      logFeatureSad("ccr_memory_extract", "config_invalid"));
  let inFlightExtractions = new Set(),
    n,
    o,
    s = 0;
  function u(p) {
    if (p) ((n = p), (o = void 0), (s = 0));
  }
  function y(p, P) {
    if (!p) {
      if ((s++, s >= Ot)) {
        (logForDebugging(
          `[extractMemories] (mcp) stopped early ${s} passes in a row; the cursor moves on and these turns are not reviewed again`,
        ),
          u(P));
        return;
      }
    }
    ((o = getSessionId()),
      logForDebugging(
        `[extractMemories] (mcp) ${p ? "writes refused after a newer prompt" : "the pass stopped early (an API error, the turn cap or an abort of its fork before anything was saved, or a throw)"}; the cursor stays and the next pass reviews these turns again`,
      ));
  }
  let h = !1,
    x = !1,
    z = createAbortController(),
    w = 0,
    S = !1,
    M,
    E,
    j,
    U,
    R;
  function runExtraction(p) {
    return (inFlightExtractions.add(p), p.finally(() => inFlightExtractions.delete(p)));
  }
  let Y = laptopExtractModule?.createLaptopExtractRunner(e, runExtraction);
  function J() {
    let p = R;
    if (((R = void 0), p?.timer !== void 0)) clearTimeout(p.timer);
    return p;
  }
  function B(p, P, T = getPromptIndex(), C = getLastPersonPrompt(), G = getBillingFlags(P), L = !0) {
    if ((J(), p.idleFlushSeconds === 0)) return;
    R = {
      timer: L ? setTimeout(ne, p.idleFlushSeconds * 1000).unref() : void 0,
      dueAt: L ? performance.now() + p.idleFlushSeconds * 1000 : 1 / 0,
      promptIndex: T,
      personPrompt: C,
      billing: G,
      context: P,
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
      te.of(e).onPassEnded?.(p);
    } catch (error) {
      logError(toError(error));
    }
  }
  function rr(p) {
    try {
      te.of(e).onPassSkipped?.(p);
    } catch (error) {
      logError(toError(error));
    }
  }
  function rt(p) {
    if (S) return;
    S = !0;
    let { restoredPlace: restoredPlace, restoredPlaceAt: restoredPlaceAt } = te.of(e);
    if (!restoredPlace) return;
    let C = restoredPlace.passAt !== null && (restoredPlaceAt ?? Date.now()) >= restoredPlace.passAt,
      G = C ? restoredPlace.tail : restoredPlace.cursor;
    if (((w = C ? 0 : restoredPlace.turns), (M = w), (E = C), G !== null && p.some((b) => b.uuid === G)))
      n = G;
    let L = n !== void 0 ? "restored" : G === null ? "none_saved" : "not_in_transcript";
    ((j = fromEnum(L)),
      logForDebugging(
        `[extractMemories] (mcp) resumed from the previous worker: ${w} turn end(s) since its last pass${C ? " (the pass it had scheduled is counted as run)" : ""}; cursor ${RESTORE_OUTCOME_TEXT[L]}`,
      ));
  }
  function ae(p, P) {
    let T = { turns: w, cursor: n ?? null, tail: p.at(-1)?.uuid ?? null, passAt: P };
    try {
      te.of(e).savePlace?.(T);
    } catch (error) {
      logError(toError(error));
    }
  }
  async function Oe({
    context: context,
    appendSystemMessage: appendSystemMessage,
    trigger: trigger,
    promptIndex: promptIndex = getPromptIndex(),
    personPrompt: personPrompt = getLastPersonPrompt(),
    billing: billing = getBillingFlags(context),
  }) {
    let { messages: messages } = context,
      memoryDir = getHostedPostTurnMemoryConfig(),
      ce = memoryDir?.carryAcrossRestarts === !0 && trigger === void 0;
    if (memoryDir?.carryAcrossRestarts) rt(messages);
    let newMessageCount = countTurnsSince(messages, n);
    if (o !== void 0 && o !== getSessionId()) ((o = void 0), (s = 0));
    if (o === void 0 && hasSuccessfulToolCall(messages, n, !!memoryDir)) {
      if (
        (logForDebugging(
          "[extractMemories] skipping \u2014 conversation already wrote to memory in this range",
        ),
        u(messages.at(-1)?.uuid),
        ce)
      )
        ae(messages, null);
      if (
        (logEvent("tengu_extract_memories_skipped_direct_write", { message_count: newMessageCount }),
        memoryDir)
      )
        rr(trigger ?? "cadence");
      return;
    }
    let ee = memoryDir ? summarizeUserTurns(messages, n) : void 0,
      Ce = memoryDir?.proseGate === "chat",
      nt = Ce ? Math.max(memoryDir.reviewWindow, ee?.userTurns ?? 0) : 0,
      sr = Ce
        ? isMemoryCandidateTurn(messages, memoryDir.minProseWords, nt)
        : hasSubstantialTurnSince(messages, n),
      Ee = memoryDir && ee ? bt(Ce ? Re(Qe(messages, nt)) : ee.proseWords) : void 0;
    if (!sr) {
      if (
        (logForDebugging("[extractMemories] skipping \u2014 not enough user prose"),
        u(messages.at(-1)?.uuid),
        ce)
      )
        ae(messages, null);
      logEvent("tengu_extract_memories_skipped_no_prose", {
        message_count: newMessageCount,
        prose_gate: fromEnumOpt(memoryDir?.proseGate),
        prose_words_bucket: fromEnumOpt(Ee),
      });
      return;
    }
    let Le = memoryDir?.everyNTurns ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_bramble_lintel", null) ?? 1,
      ot = createCacheSafeParams(context),
      ge = memoryDir ? Jt(memoryDir, billing) : "run";
    if (trigger === void 0) {
      if ((w++, w < Le)) {
        if (memoryDir) {
          let A = w >= memoryDir.idleFlushMinTurns;
          if ((B(memoryDir, context, promptIndex, personPrompt, billing, A), ce))
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
    if (((w = 0), ce)) ae(messages, Date.now());
    let { toolPermissionContext: toolPermissionContext } = context.toolUseContext.getAppState(),
      Ie = memoryDir ? void 0 : memoryWriteBlockingRule(toolPermissionContext, getAutoMemEntrypoint());
    if (Ie !== void 0) {
      if (
        (logForDebugging(`[extractMemories] skipping \u2014 ${YBn(Ie)} would refuse memory writes`),
        logEvent("tengu_extract_memories_skipped_permission_rule", { message_count: newMessageCount }),
        appendSystemMessage !== void 0)
      ) {
        let A = describeMemoryRuleBlock(e, Ie, getAutoMemPath());
        if (A !== void 0) appendSystemMessage(createSystemMessage(A, "warning"));
      }
      return;
    }
    x = !0;
    let now = Date.now(),
      We,
      { taskRegistry: taskRegistry } = context.toolUseContext,
      _e,
      Ne,
      ue = !1;
    try {
      if (memoryDir) {
        if (getPromptIndex() !== promptIndex) {
          logForDebugging("[extractMemories] skipping (mcp) \u2014 a newer turn started");
          return;
        }
        if (pKe(toolPermissionContext)) {
          if (
            (logForDebugging(
              "[extractMemories] skipping (mcp) \u2014 tool calls are held until a person writes",
            ),
            ce)
          )
            ae(messages, null);
          return;
        }
        if (ge === "skip") {
          if (
            ((o = getSessionId()),
            logForDebugging(
              "[extractMemories] skipping (mcp) \u2014 the turn was billed to Extra Usage and when_overage is 'skip'; these turns wait for the next pass",
            ),
            logEvent("tengu_extract_memories_skipped_overage", {
              message_count: newMessageCount,
              trigger: fromEnum(trigger ?? "cadence"),
              long_context_billed: billing.longContextBilled,
              prose_words_bucket: fromEnumOpt(Ee),
              own_words_turns: ee?.ownWordsTurns,
            }),
            ce)
          )
            ae(messages, null);
          return;
        }
        let Q =
            memoryDir.firstLook === void 0
              ? "off"
              : ge === "first_look"
                ? "enforce"
                : memoryDir.firstLook.mode,
          je =
            memoryDir.firstLook !== void 0 && Q !== "off"
              ? runMemoryFirstLook({
                  config: memoryDir.firstLook,
                  messages: messages,
                  sinceUuid: n,
                  window: memoryDir.reviewWindow,
                  signal: context.toolUseContext.abortController.signal,
                  credentials: context.toolUseContext.credentials,
                })
              : void 0;
        if (je !== void 0 && Q === "enforce") {
          let D = await je;
          if (
            (logForDebugging(
              `[extractMemories] first look (enforce, a "no" skips the pass) answered ${D.verdict} after ${D.durationMs}ms`,
            ),
            getPromptIndex() !== promptIndex)
          ) {
            ((w = it),
              logForDebugging(
                "[extractMemories] skipping (mcp) \u2014 a newer turn started during the first look",
              ));
            return;
          }
          if (pKe(context.toolUseContext.getAppState().toolPermissionContext)) {
            logForDebugging(
              "[extractMemories] skipping (mcp) \u2014 tool calls were held during the first look",
            );
            return;
          }
          if (D.verdict === "no" || D.verdict === "empty") {
            (logForDebugging(
              `[extractMemories] skipping (mcp) \u2014 the first look answered ${D.verdict}; these turns wait for the next pass`,
            ),
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
              }));
            return;
          }
        }
        logForDebugging(
          `[extractMemories] starting (mcp, ${trigger ?? "cadence"}) \u2014 ${newMessageCount} new messages`,
        );
        let Ae = 0,
          canUseTool = createChildAbortController(context.toolUseContext.abortController);
        if (memoryDir.declareTask)
          ((_e = registerPostTurnMemoryTask(taskRegistry, canUseTool)), (Ne = canUseTool.signal));
        let ft = we?.servedTrial(memoryDir),
          pt =
            we !== null && ft !== void 0
              ? await we.runTrial({
                  served: ft,
                  config: memoryDir,
                  context: context,
                  host: e,
                  sinceUuid: n,
                  drainSignal: z.signal,
                  parentAbort: canUseTool,
                  promptIndex: promptIndex,
                  makeGate: makeMemoryPassCanUseTool,
                })
              : void 0,
          ve = memoryDir.staleNote ? mZs(e) : void 0,
          gt = ve ? buildStaleReadNotice(ve, Us(messages), findStaleCarriedReads) : "",
          cacheSafeParams = gZs(e),
          startTime = Date.now(),
          Me = await runForkedAgent({
            promptMessages: [createUserMessage({ content: (cacheSafeParams ?? memoryDir.instruction) + gt })],
            cacheSafeParams: ot,
            canUseTool: makeMemoryPassCanUseTool(promptIndex, () => {
              Ae++;
            }),
            querySource: "extract_memories",
            forkLabel: "extract_memories",
            overrides: {
              mcpRequestMeta: CTi({ citesEvent: getLastHumanTurnUuid(messages, personPrompt) }),
              abortController: canUseTool,
            },
            skipTranscript: !0,
            maxTurns: memoryDir.maxTurns,
            skipCacheWrite: !0,
          }),
          pr = Date.now() - startTime;
        ue = Ne?.aborted === !0;
        let re = await je;
        if (re !== void 0 && Q === "shadow")
          logForDebugging(
            `[extractMemories] first look (shadow, the pass ran regardless) answered ${re.verdict} after ${re.durationMs}ms`,
          );
        let se = Lt(Me.messages, messages);
        if (ve) mergeReadVersions(e, ve, se);
        let existingMemories = collectErroredToolUseIds(se),
          me = count(
            se.flatMap((D) =>
              D.type === "assistant" && Array.isArray(D.message.content) ? D.message.content : [],
            ),
            (D) => D.type === "tool_use" && NPt.has(D.name) && !existingMemories.has(D.id),
          ),
          ht = It(se),
          ke = Ft(se) || (me === 0 && (ht || ue)),
          _r = ke && me === 0 ? s + 1 : 0;
        if (me > 0 || (Ae === 0 && !ke)) u(messages.at(-1)?.uuid);
        else y(!ke, messages.at(-1)?.uuid);
        if (
          (logEvent("tengu_extract_memories_extraction", {
            mode: fromEnum("mcp"),
            trigger: fromEnum(trigger ?? "cadence"),
            account_memory_line_rendered: !1,
            every_n_turns: Le,
            input_tokens: Me.totalUsage.input_tokens,
            output_tokens: Me.totalUsage.output_tokens,
            cache_read_input_tokens: Me.totalUsage.cache_read_input_tokens,
            cache_creation_input_tokens: Me.totalUsage.cache_creation_input_tokens,
            message_count: newMessageCount,
            parent_context_tokens: Tp(messages),
            compacted_in_fork: se.some(isCompactBoundaryMessage),
            turn_count: count(se, (D) => D.type === "assistant"),
            written: me,
            superseded_writes: Ae,
            instruction_source: fromEnum(cacheSafeParams === void 0 ? "env" : "memory_context"),
            stale_note_rendered: gt !== "",
            review_unfinished: ke,
            unfinished_in_a_row: _r,
            reached_cap: ht,
            duration_ms: pr,
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
            resumed_turns: M,
            resumed_pass_counted_run: E,
            resumed_cursor: j,
          }),
          logFeatureOk("ccr_memory_extract"),
          le({
            outcome: me > 0 ? "saved" : ke ? "unfinished" : Ae > 0 ? "writes_refused" : "nothing_to_save",
            trigger: trigger ?? "cadence",
            written: me,
            durationMs: Date.now() - now,
          }),
          we !== null && pt !== void 0)
        )
          we.logPair(pt, se, trigger ?? "cadence", context.toolUseContext.options.mainLoopModel);
        return;
      }
      let A = getAutoMemPath();
      logForDebugging(`[extractMemories] starting \u2014 ${newMessageCount} new messages, memoryDir=${A}`);
      let he = rar(),
        $e = a4() || he,
        ir = createAutoMemCanUseTool(A, void 0, { fork: "extraction" }),
        writtenPaths = formatMemoryManifest(
          await scanMemoryFiles(A, createAbortController().signal, context.toolUseContext.storageV5),
        ),
        dt = !1,
        He =
          ie?.isPromoterExtractorOn() === !0
            ? ie.typedTurnsInWindow(e, context.toolUseContext.session.id, messages, n)
            : [],
        ur =
          buildExtractMemoriesPrompt(newMessageCount, writtenPaths, $e, he, dt) +
          (ie?.typedTurnsPromptBlock(He) ?? ""),
        be = ie !== null && He.length > 0 ? makeSaltedName("extract_memories") : void 0,
        dr = be === void 0 ? void 0 : ie?.registerExtractorFork(e, be, He);
      We = getWrittenFilePath(context.toolUseContext.readFileState, A);
      let V = await runForkedAgent({
        promptMessages: [createUserMessage({ content: ur })],
        cacheSafeParams: ot,
        canUseTool: ir,
        querySource: "extract_memories",
        forkLabel: "extract_memories",
        ...(be !== void 0 && { overrides: { agentId: be } }),
        skipTranscript: !0,
        maxTurns: 5,
        skipCacheWrite: DGt(),
        onMessage: We.onMessage,
      }).finally(() => dr?.());
      u(messages.at(-1)?.uuid);
      let turnCount = countToolCallsSince(V.messages, A),
        lr = count(V.messages, (Q) => Q.type === "assistant"),
        lt =
          V.totalUsage.input_tokens +
          V.totalUsage.cache_creation_input_tokens +
          V.totalUsage.cache_read_input_tokens,
        mr = lt > 0 ? ((V.totalUsage.cache_read_input_tokens / lt) * 100).toFixed(1) : "0.0";
      if (
        (logForDebugging(
          `[extractMemories] finished \u2014 ${turnCount.length} files written, cache: read=${V.totalUsage.cache_read_input_tokens} create=${V.totalUsage.cache_creation_input_tokens} input=${V.totalUsage.input_tokens} (${mr}% hit)`,
        ),
        turnCount.length > 0)
      )
        logForDebugging(`[extractMemories] memories saved: ${turnCount.join(", ")}`);
      else logForDebugging("[extractMemories] no memories saved this run");
      let memoryPaths = turnCount.filter((Q) => basename(Q) !== MEMORY_INDEX_FILENAME),
        mt = count(memoryPaths, isTeamMemPath);
      if (
        (logEvent("tengu_extract_memories_extraction", {
          mode: fromEnum("file"),
          input_tokens: V.totalUsage.input_tokens,
          output_tokens: V.totalUsage.output_tokens,
          cache_read_input_tokens: V.totalUsage.cache_read_input_tokens,
          cache_creation_input_tokens: V.totalUsage.cache_creation_input_tokens,
          message_count: newMessageCount,
          parent_context_tokens: Tp(messages),
          compacted_in_fork: V.messages.some(isCompactBoundaryMessage),
          turn_count: lr,
          files_written: turnCount.length,
          memories_saved: memoryPaths.length,
          team_memories_saved: mt,
          account_memory_line_rendered: dt,
          duration_ms: Date.now() - now,
        }),
        logForDebugging(
          `[extractMemories] writtenPaths=${turnCount.length} memoryPaths=${memoryPaths.length} appendSystemMessage defined=${appendSystemMessage != null}`,
        ),
        memoryPaths.length > 0)
      ) {
        let msg = createMemorySavedMessage(memoryPaths);
        ((msg.teamCount = mt), appendSystemMessage?.(msg));
      }
      if (turnCount.length > 0)
        await resyncMemoryWrites(context.toolUseContext, buildExtractNotice(turnCount));
      logFeatureOk("memory_extract");
    } catch (error) {
      if (((ue = Ne?.aborted === !0), logForDebugging(`[extractMemories] error: ${error}`), !ue))
        (logEvent("tengu_extract_memories_error", {
          duration_ms: Date.now() - now,
          mode: fromEnum(memoryDir ? "mcp" : "file"),
        }),
          logFeatureBad(memoryDir ? "ccr_memory_extract" : "memory_extract", "agent_error"));
      if (memoryDir) {
        if (_e !== void 0 && !ue) finishMemoryTask(_e, taskRegistry, "failed");
        (le({
          outcome: ue ? "unfinished" : "failed",
          trigger: trigger ?? "cadence",
          written: 0,
          durationMs: Date.now() - now,
        }),
          y(!1, messages.at(-1)?.uuid));
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
      if (((x = !1), _e !== void 0)) finishMemoryTask(_e, taskRegistry, ue ? "killed" : "completed");
      let A = U;
      if (((U = void 0), A && Le <= 1))
        (logForDebugging("[extractMemories] running trailing extraction for stashed context"),
          await Oe({
            context: A.context,
            appendSystemMessage: A.appendSystemMessage,
            trigger: "trailing",
            promptIndex: A.promptIndex,
            personPrompt: A.personPrompt,
            billing: A.billing,
          }));
      else if (A && memoryDir) B(memoryDir, A.context, A.promptIndex, A.personPrompt, A.billing);
    }
  }
  async function executeExtractMemoriesImpl(context, appendSystemMessage) {
    if (context.toolUseContext.agentId) return;
    let T = Y?.onTurnEnd(context, appendSystemMessage);
    try {
      if (isExtractModeActive() || isPromoterExtractorOn()) await or(context, appendSystemMessage);
    } finally {
      await T;
    }
  }
  async function or(context, appendSystemMessage) {
    J();
    let T = getHostedPostTurnMemoryConfig(),
      C = T !== null,
      G = (L) => {
        if (T?.carryAcrossRestarts) (rt(context.messages), ae(context.messages, L));
      };
    if (C && (getMemoryToggledOff() || isSafeMode() || isRestrictedSession())) {
      G(null);
      return;
    }
    if (
      C &&
      !(
        isAccountMemoryServer(Ias(context.toolUseContext.options.mcpClients)) &&
        context.toolUseContext.options.tools.some((tool) => toolMatchesName(tool, MEMORY_WRITE_TOOL))
      )
    ) {
      (logForDebugging("[extractMemories] skipping (mcp) \u2014 CCR memory server not mounted"), G(null));
      return;
    }
    if (
      C &&
      isCoordinatorMode_2() &&
      applyCoordinatorToolFilter(
        context.toolUseContext.options.tools.filter((tool) => toolMatchesName(tool, MEMORY_WRITE_TOOL)),
      ).length === 0
    ) {
      (logForDebugging(
        "[extractMemories] skipping (mcp) \u2014 coordinator mode: the write tool is held on the memory server's word alone",
      ),
        G(null));
      return;
    }
    if (!C && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_passport_quail", !1) && !isPromoterExtractorOn())
      return;
    if (!C && !isAutoMemoryEnabled()) {
      if (isAutoMemoryHeldForSession()) n = context.messages.at(-1)?.uuid ?? n;
      return;
    }
    if (!C && isAutoMemReadFenced()) return;
    if (Jn() !== null) return;
    if (x) {
      (logForDebugging("[extractMemories] extraction in progress \u2014 stashing for trailing run"),
        logEvent("tengu_extract_memories_coalesced", {}));
      let L = getBillingFlags(context);
      if (
        ((U = {
          context: context,
          appendSystemMessage: appendSystemMessage,
          promptIndex: getPromptIndex(),
          personPrompt: getLastPersonPrompt(),
          billing: L,
        }),
        T)
      )
        G(
          (T.everyNTurns <= 1 || T.idleFlushSeconds > 0) && Jt(T, L) !== "skip"
            ? Date.now() + T.idleFlushSeconds * 1000
            : null,
        );
      return;
    }
    await Oe({ context: context, appendSystemMessage: appendSystemMessage });
  }
  let of = te.of(e);
  ((of.extractor = (p, P) => runExtraction(executeExtractMemoriesImpl(p, P))),
    (of.drainer = async (p = 60000) => {
      let P = Date.now() + p;
      (z.abort(), ne(), Y?.disarmIdleFlush());
      while (inFlightExtractions.size > 0 && Date.now() < P)
        (await Promise.race([
          Promise.all(inFlightExtractions).catch(() => {}),
          new Promise((T) => setTimeout(T, P - Date.now()).unref()),
        ]),
          ne());
    }),
    (of.disarm = () => {
      ((of.extractor = null), (U = void 0), J(), Y?.disarmIdleFlush());
    }),
    (of.owedWithin = (p) =>
      inFlightExtractions.size > 0 ||
      (R?.timer !== void 0 && R.promptIndex === getPromptIndex() && R.dueAt - performance.now() <= p)));
}
//@ chunk-xr4xc2mq.js:35636-35727 layout
function isPromoterExtractorOn() {
  return ie !== null && ie.EXTRACTOR_RUNS_FOR_PROMOTER && ie.isPromoterExtractorOn();
}
//@ chunk-xr4xc2mq.js:35727-35793 facade-exports
function isLaptopExtractActive(e) {
  return laptopExtractModule !== null && laptopExtractModule.isLaptopExtractDispatched(e);
}
//@ chunk-xr4xc2mq.js:35793-35853 facade-exports
function isLaptopExtractSync(e) {
  return laptopExtractModule !== null && laptopExtractModule.isLaptopExtractSync(e);
}
//@ chunk-xr4xc2mq.js:35853-35937 facade-exports
async function executeExtractMemories(e, r) {
  await te.of(e.toolUseContext.session.host).extractor?.(e, r);
}
//@ chunk-xr4xc2mq.js:35937-35987 facade-exports
async function drainPendingExtraction(e, r) {
  await te.of(e).drainer(r);
}
//@ chunk-xr4xc2mq.js:35987-36072 facade-exports
function restoreMemoryExtractPlace(e, r) {
  let of = te.of(e);
  ((of.restoredPlace = ATi(r)), (of.restoredPlaceAt = Date.now()));
}
//@ chunk-xr4xc2mq.js:36072-36111 facade-exports
function onMemoryExtractPlace(e, r) {
  te.of(e).savePlace = r;
}

export {
  initExtractMemories,
  isAllowedAutoMemWritePath,
  DELETE_COMMAND_NAMES,
  memoryWriteBlockingRule,
  createAutoMemCanUseTool,
};
