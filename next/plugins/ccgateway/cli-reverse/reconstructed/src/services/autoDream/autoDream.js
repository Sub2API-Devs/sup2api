/**
 * services/autoDream/autoDream.ts
 *
 * autoDream 后台记忆整理：按 tengu_onyx_plover 阈值（24 小时、5 个会话）触发 dream 子代理整理记忆。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/autoDream/autoDream.ts
 * pieces: chunk-arvn22xd.js (9)
 * attribution: sole-consumer 1, fingerprint 4, layout 3, placement 1
 */
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import {
  DELETE_COMMAND_NAMES,
  memoryWriteBlockingRule,
  createAutoMemCanUseTool,
  isAllowedAutoMemWritePath,
} from "../extractMemories/extractMemories.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import { isAutoMemoryEnabled, getAutoMemEntrypoint, getAutoMemPath } from "../../memdir/paths.js";
import { isAutoMemReadFenced } from "../../utils/permissions/readBlock.js";
import { isAutoDreamEnabled, autoDreamHostState } from "./config.js";
import {
  readLastConsolidatedAt,
  listSessionsTouchedSince,
  tryAcquireConsolidationLockDefault,
  rollbackConsolidationLockDefault,
} from "./consolidationLock.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, sanitizedErrorNameForTelemetry, toError } from "../../utils/errors.js";
import { getSessionId, getOriginalCwd } from "../../bootstrap/state.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import {
  describeRuleBlock,
  describeMemoryRuleBlock,
  resyncMemoryWrites,
} from "../extractMemories/memdirResync.js";
import { createSystemMessage, createUserMessage, createMemorySavedMessage } from "../../utils/messages.js";
import { canUseTeamMemory } from "../../memdir/teamMemPaths.js";
import {
  registerDreamTask,
  completeDreamTask,
  isDreamTask,
  addDreamTurn,
} from "../../tasks/DreamTask/DreamTask.js";
import { getProjectDir } from "../../utils/sessionStorage.js";
import { buildConsolidationPrompt } from "./consolidationPrompt.js";
import { isSharedMemoryServedViaTools } from "../../memdir/memoryStoresPrompt.js";
import { runForkedAgent, createCacheSafeParams } from "../../utils/forkedAgent.js";
import { isBasaltSpurEnabled } from "../api/claude.js";
import { plural } from "../../utils/stringUtils.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-arvn22xd.js:7527-7722 sole-consumer
function markDreamTaskFailed(taskId, taskRegistry) {
  taskRegistry.update(taskId, (task) => ({
    ...task,
    status: "failed",
    endTime: Date.now(),
    notified: true,
    abortController: undefined,
  }));
  logFeatureBad("task_dream", "task_dream_failed");
  emitTaskNotification(taskId, "failed", {
    skipTranscript: true,
    ambient: true,
  });
}
//@ chunk-arvn22xd.js:7722-7814 fingerprint (2.1.88 match: DEFAULTS, 0.522)
/**
 * autoDream 默认阈值 minHours=24、minSessions=5，会话扫描节流 10 分钟。
 */
var AUTO_DREAM_DEFAULTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SESSION_SCAN_THROTTLE_MS;
var regExp;
var DEFAULT_DREAM_THRESHOLDS;
deferInit("chunk-arvn22xd.js:7722", () => {
  AUTO_DREAM_DEFAULTS = null;
  SESSION_SCAN_THROTTLE_MS = 600000;
  regExp = new RegExp(`^\\s*(?:${DELETE_COMMAND_NAMES})\\b`, "i");
  DEFAULT_DREAM_THRESHOLDS = {
    minHours: 24,
    minSessions: 5,
  };
});
//@ chunk-arvn22xd.js:7814-8098 fingerprint (2.1.88 match: getConfig, 1)
/**
 * 读取 tengu_onyx_plover 中的 minHours/minSessions，非法值回落到 24/5。
 */
function getConfig() {
  let raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_plover", null);
  return {
    minHours:
      typeof raw?.minHours === "number" && Number.isFinite(raw.minHours) && raw.minHours > 0
        ? raw.minHours
        : DEFAULT_DREAM_THRESHOLDS.minHours,
    minSessions:
      typeof raw?.minSessions === "number" && Number.isFinite(raw.minSessions) && raw.minSessions > 0
        ? raw.minSessions
        : DEFAULT_DREAM_THRESHOLDS.minSessions,
  };
}
//@ chunk-arvn22xd.js:8098-8202 layout
/**
 * autoDream 前置条件：不是宿主托管会话、无嵌入式搜索工具、自动记忆可用、非 --add-dir 场景且 Sgt() 为真。
 */
function isAutoDreamAllowed() {
  if (getRemoteCaps() !== null) return false;
  if (hasEmbeddedSearchTools_2()) return false;
  if (!isAutoMemoryEnabled()) return false;
  if (isAutoMemReadFenced()) return false;
  return isAutoDreamEnabled();
}
//@ chunk-arvn22xd.js:8202-8225 layout
function isAutoDreamForced() {
  return false;
}
//@ chunk-arvn22xd.js:8225-13121 fingerprint (2.1.88 match: initAutoDream, 0.648)
/**
 * autoDream（后台记忆整理）：每回合检查——tengu_onyx_plover 配置存在且 isAutoDreamAllowed；距上次整理 ≥ minHours（默认 24h）；10 分钟扫描节流；自上次整理后改动过的其他会话 ≥ minSessions（默认 5）；拿到 .consolidate-lock 后派生 dream 子代理整理记忆，失败回滚锁时间。
 */
function initAutoDream(message) {
  let lastSessionScanAt = 0;
  let hasShownNewerRecordNotice = false;
  let notifiedUnreadableCauses = new Set();
  autoDreamHostState.of(message).runner = async function (context, appendSystemMessage) {
    let cfg = getConfig();
    let force = isAutoDreamForced();
    if (!force && !isAutoDreamAllowed()) return;
    let lastAt;
    try {
      lastAt = await readLastConsolidatedAt(undefined, context.toolUseContext.storageV5);
    } catch (e) {
      logForDebugging(`[autoDream] readLastConsolidatedAt failed: ${errorMessage(e)}`);
      return;
    }
    let hoursSince = (Date.now() - lastAt) / 3600000;
    if (!force && hoursSince < cfg.minHours) return;
    let sinceScanMs = Date.now() - lastSessionScanAt;
    if (!force && sinceScanMs < SESSION_SCAN_THROTTLE_MS) {
      logForDebugging(
        `[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(sinceScanMs / 1000)}s ago`,
      );
      return;
    }
    lastSessionScanAt = Date.now();
    let sessionIds;
    try {
      sessionIds = await listSessionsTouchedSince(lastAt, context.toolUseContext.storageV5);
    } catch (e) {
      logForDebugging(`[autoDream] listSessionsTouchedSince failed: ${errorMessage(e)}`);
      return;
    }
    let currentSession = getSessionId();
    sessionIds = sessionIds.filter((id) => id !== currentSession);
    if (!force && sessionIds.length < cfg.minSessions) {
      logForDebugging(
        `[autoDream] skip \u2014 ${sessionIds.length} sessions since last consolidation, need ${cfg.minSessions}`,
      );
      logEvent("tengu_auto_dream_skipped", {
        reason: lit("sessions"),
        session_count: sessionIds.length,
        min_required: cfg.minSessions,
      });
      return;
    }
    let memoryWriteBlockRule = memoryWriteBlockingRule(
      context.toolUseContext.getAppState().toolPermissionContext,
      getAutoMemEntrypoint(),
    );
    if (memoryWriteBlockRule !== undefined) {
      logForDebugging(
        `[autoDream] skip \u2014 ${describeRuleBlock(memoryWriteBlockRule)} would refuse memory writes`,
      );
      logEvent("tengu_auto_dream_skipped", {
        reason: lit("permission_rule"),
      });
      if (appendSystemMessage !== undefined) {
        let ruleBlockWarning = describeMemoryRuleBlock(message, memoryWriteBlockRule, getAutoMemPath());
        if (ruleBlockWarning !== undefined)
          appendSystemMessage(createSystemMessage(ruleBlockWarning, "warning"));
      }
      return;
    }
    let priorLastConsolidatedAt;
    if (force) priorLastConsolidatedAt = lastAt;
    else {
      try {
        priorLastConsolidatedAt = await tryAcquireConsolidationLockDefault(context.toolUseContext.storageV5);
      } catch (e) {
        logForDebugging(`[autoDream] lock acquire failed: ${errorMessage(e)}`);
        return;
      }
      if (priorLastConsolidatedAt === null) {
        logEvent("tengu_auto_dream_skipped", {
          reason: lit("lock"),
        });
        return;
      }
    }
    let autoMemDir = getAutoMemPath();
    let memoryItemsState = undefined;
    let itemsSnapshot =
      memoryItemsState === "unplaced" || memoryItemsState === "capped" ? undefined : memoryItemsState;
    if (itemsSnapshot === "newer" || (itemsSnapshot !== undefined && "unreadable" in itemsSnapshot)) {
      if (!force)
        await rollbackConsolidationLockDefault(priorLastConsolidatedAt, context.toolUseContext.storageV5);
      if (itemsSnapshot !== "newer") {
        logForDebugging(
          `[autoDream] skipped: the memory items could not be read (cause: ${itemsSnapshot.unreadable}); the warning above says why and what resumes consolidation`,
        );
        logEvent("tengu_auto_dream_skipped", {
          reason: lit("items_unreadable"),
        });
        if (
          AUTO_DREAM_DEFAULTS !== null &&
          appendSystemMessage !== undefined &&
          !notifiedUnreadableCauses.has(itemsSnapshot.unreadable)
        ) {
          notifiedUnreadableCauses.add(itemsSnapshot.unreadable);
          appendSystemMessage?.(
            createSystemMessage(
              await AUTO_DREAM_DEFAULTS.unreadableItemsNotice(itemsSnapshot.unreadable, autoMemDir),
              "warning",
            ),
          );
        }
        return;
      }
      logForDebugging("[autoDream] skip \u2014 newer item record");
      logEvent("tengu_auto_dream_skipped", {
        reason: lit("record_newer"),
      });
      if (AUTO_DREAM_DEFAULTS !== null && appendSystemMessage !== undefined && !hasShownNewerRecordNotice) {
        hasShownNewerRecordNotice = true;
        appendSystemMessage?.(createSystemMessage(AUTO_DREAM_DEFAULTS.NEWER_RECORD_NOTICE, "warning"));
      }
      return;
    }
    let teamMemoryEnabled = canUseTeamMemory();
    logForDebugging(
      `[autoDream] firing \u2014 ${hoursSince.toFixed(1)}h since last, ${sessionIds.length} sessions to review`,
    );
    logEvent("tengu_auto_dream_fired", {
      hours_since: Math.round(hoursSince),
      sessions_since: sessionIds.length,
      team_memory_enabled: teamMemoryEnabled,
    });
    let { taskRegistry } = context.toolUseContext;
    let abortController = new AbortController();
    let taskId = registerDreamTask(taskRegistry, {
      sessionsReviewing: sessionIds.length,
      priorMtime: priorLastConsolidatedAt,
      abortController,
      storageV5: context.toolUseContext.storageV5,
    });
    let phase = "fork";
    try {
      let transcriptDir = getProjectDir(getOriginalCwd());
      let extra = `

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${sessionIds.length}):
${sessionIds.map((id) => `- ${id}`).join(`
`)}`;
      let weUnusedFlag = false;
      let prompt = buildConsolidationPrompt(
        autoMemDir,
        transcriptDir,
        extra,
        teamMemoryEnabled,
        isSharedMemoryServedViaTools(),
        false,
      );
      let prompt_2 = makeDreamProgressWatcher(taskId, taskRegistry, autoMemDir);
      let writtenPathsByToolUseId = new Map();
      let erroredToolUseIds = new Set();
      let hitApiError = false;
      let forkReturned = false;
      let forkSucceeded = false;
      let result;
      try {
        result = await runForkedAgent({
          promptMessages: [
            createUserMessage({
              content: prompt,
            }),
          ],
          cacheSafeParams: createCacheSafeParams(context),
          canUseTool: createAutoMemCanUseTool(
            autoMemDir,
            itemsSnapshot !== undefined ? AUTO_DREAM_DEFAULTS?.keptItemsOf(itemsSnapshot) : undefined,
            {
              fork: "dream",
              onWriteAllowed: (writtenPath, toolUseId) => writtenPathsByToolUseId.set(toolUseId, writtenPath),
            },
          ),
          querySource: "auto_dream",
          forkLabel: "auto_dream",
          skipTranscript: true,
          overrides: {
            abortController,
          },
          onMessage: (message) => {
            prompt_2(message);
            collectErroredToolUseIds(message, erroredToolUseIds);
            if (message.type === "assistant") hitApiError = message.isApiErrorMessage === true;
          },
          skipCacheWrite: isBasaltSpurEnabled(),
        });
        forkReturned = true;
        forkSucceeded = !abortController.signal.aborted && !hitApiError;
      } finally {
        let dreamWrote = new Set(
          [...writtenPathsByToolUseId]
            .filter(([toolUseId]) => !forkSucceeded || !erroredToolUseIds.has(toolUseId))
            .map(([, path]) => path),
        );
        let mayHaveWritten = new Set(
          [...writtenPathsByToolUseId]
            .filter(([toolUseId]) => forkSucceeded && erroredToolUseIds.has(toolUseId))
            .map(([, path]) => path),
        );
        if (AUTO_DREAM_DEFAULTS !== null && memoryItemsState === "capped")
          await AUTO_DREAM_DEFAULTS.deferCappedRunWrites({
            memoryDir: autoMemDir,
            dreamWrote,
            mayHaveWritten,
          });
        if (AUTO_DREAM_DEFAULTS !== null && itemsSnapshot !== undefined) {
          let settleResult = await AUTO_DREAM_DEFAULTS.settleDreamItems({
            memoryDir: autoMemDir,
            before: itemsSnapshot,
            dreamWrote,
            mayHaveWritten,
          });
          if (
            (settleResult.skipped || settleResult.failed) &&
            forkReturned &&
            !abortController.signal.aborted &&
            !force &&
            (await AUTO_DREAM_DEFAULTS.claimLockGiveBack(autoMemDir))
          )
            await rollbackConsolidationLockDefault(priorLastConsolidatedAt, context.toolUseContext.storageV5);
        }
      }
      phase = "completion";
      completeDreamTask(taskId, taskRegistry);
      let task = context.toolUseContext.taskRegistry.get(taskId);
      let filesTouchedCount = isDreamTask(task) ? task.filesTouched.length : 0;
      if (isDreamTask(task) && task.filesTouched.length > 0) {
        appendSystemMessage?.({
          ...createMemorySavedMessage(task.filesTouched),
          verb: "Improved",
        });
        await resyncMemoryWrites(context.toolUseContext, {
          source: "dream",
          summary: `consolidated ${task.filesTouched.length} ${plural(task.filesTouched.length, "memory file")}`,
          paths: task.filesTouched,
        });
      }
      logForDebugging(
        `[autoDream] completed \u2014 cache: read=${result.totalUsage.cache_read_input_tokens} created=${result.totalUsage.cache_creation_input_tokens}`,
      );
      logEvent("tengu_auto_dream_completed", {
        cache_read: result.totalUsage.cache_read_input_tokens,
        cache_created: result.totalUsage.cache_creation_input_tokens,
        output: result.totalUsage.output_tokens,
        sessions_reviewed: sessionIds.length,
        files_touched_count: filesTouchedCount,
        team_memory_enabled: teamMemoryEnabled,
        account_memory_line_rendered: false,
      });
    } catch (e) {
      if (abortController.signal.aborted) {
        logForDebugging("[autoDream] aborted by user");
        return;
      }
      logForDebugging(`[autoDream] ${phase} failed: ${errorMessage(e)}`);
      logEvent("tengu_auto_dream_failed", {
        phase: fromEnum(phase),
        error_class: sanitizedErrorNameForTelemetry(toError(e)),
      });
      if (phase === "fork") {
        markDreamTaskFailed(taskId, taskRegistry);
        await rollbackConsolidationLockDefault(priorLastConsolidatedAt, context.toolUseContext.storageV5);
      }
    }
  };
}
//@ chunk-arvn22xd.js:13121-13323 layout
/**
 * 把 user 消息里 is_error 的 tool_result id 加入集合（无 toolDenialKind 时）。旧版名 createToolResultStopMessage 为错配。
 */
function collectErroredToolUseIds(message, erroredIds) {
  if (
    message.type !== "user" ||
    message.toolDenialKind !== undefined ||
    typeof message.message.content === "string"
  )
    return;
  for (let block of message.message.content)
    if (block.type === "tool_result" && block.is_error === true) erroredIds.add(block.tool_use_id);
}
//@ chunk-arvn22xd.js:13323-13882 fingerprint (2.1.88 match: makeDreamProgressWatcher, 0.822)
/**
 * 监视 dream 子代理输出，更新任务进度（touch 的文件、文本）。
 */
function makeDreamProgressWatcher(taskId, setAppState, autoMemDir) {
  return (msg) => {
    if (msg.type !== "assistant") return;
    let text = "";
    let toolUseCount = 0;
    let touchedPaths = [];
    for (let block of msg.message.content)
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") {
        toolUseCount++;
        if (block.name === EDIT || block.name === FILE_WRITE_TOOL_NAME) {
          let input = block.input;
          if (typeof input.file_path === "string") touchedPaths.push(input.file_path);
        } else if (SHELL_TOOL_NAMES.includes(block.name)) {
          let input = block.input;
          if (typeof input.command === "string" && regExp.test(input.command))
            for (let mdPathMatch of input.command.matchAll(
              /"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g,
            ))
              touchedPaths.push(mdPathMatch[0].replace(/^["']|["']$/g, ""));
        }
      }
    addDreamTurn(
      taskId,
      {
        text: text.trim(),
        toolUseCount,
      },
      touchedPaths.filter((touchedPath) => isAllowedAutoMemWritePath(touchedPath, autoMemDir)),
      setAppState,
    );
  };
}
//@ chunk-arvn22xd.js:13882-13962 placement
/**
 * 在给定宿主的 autoDream 状态里取 runner 并执行一次整理（runner 未注册时什么都不做）。
 */
async function runAutoDreamForHost(context, appendSystemMessage) {
  await autoDreamHostState.of(context.toolUseContext.session.host).runner?.(context, appendSystemMessage);
}
export { initAutoDream, runAutoDreamForHost };
