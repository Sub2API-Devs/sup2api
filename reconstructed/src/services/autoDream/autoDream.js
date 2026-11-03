/**
 * services/autoDream/autoDream.ts
 *
 * autoDream 后台记忆整理：按 tengu_onyx_plover 阈值（24 小时、5 个会话）触发 dream 子代理整理记忆。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/autoDream/autoDream.ts
 * pieces: chunk-rsht1tdj.js (8)
 * attribution: sole-consumer 1, fingerprint 4, layout 2, placement 1
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
import { Jn } from "../../remote/remoteMode.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import { isAutoMemoryEnabled, getAutoMemEntrypoint, getAutoMemPath } from "../../memdir/paths.js";
import { isAutoMemReadFenced } from "../../utils/permissions/readBlock.js";
import { isAutoDreamEnabled, B } from "./config.js";
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
import { YBn, describeMemoryRuleBlock, resyncMemoryWrites } from "../extractMemories/memdirResync.js";
import {
  createSystemMessage,
  createUserMessage,
  collectErroredToolUseIds,
  createMemorySavedMessage,
} from "../../utils/messages.js";
import { a4 } from "../../memdir/teamMemPaths.js";
import {
  registerDreamTask,
  completeDreamTask,
  isDreamTask,
  addDreamTurn,
} from "../../tasks/DreamTask/DreamTask.js";
import { getProjectDir } from "../../utils/sessionStorage.js";
import { buildConsolidationPrompt } from "./consolidationPrompt.js";
import { rar } from "../../memdir/memoryStoresPrompt.js";
import { runForkedAgent, createCacheSafeParams } from "../../utils/forkedAgent.js";
import { DGt } from "../api/claude.js";
import { plural } from "../../utils/stringUtils.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";

//@ chunk-rsht1tdj.js:7527-7722 sole-consumer
function markDreamTaskFailed(e, r) {
  (r.update(e, (o) => ({
    ...o,
    status: "failed",
    endTime: Date.now(),
    notified: !0,
    abortController: void 0,
  })),
    logFeatureBad("task_dream", "task_dream_failed"),
    emitTaskNotification(e, "failed", { skipTranscript: !0, ambient: !0 }));
}
/**
 * autoDream 默认阈值 minHours=24、minSessions=5，会话扫描节流 10 分钟。
 */
//@ chunk-rsht1tdj.js:7722-7814 fingerprint = DEFAULTS (0.522)
var AUTO_DREAM_DEFAULTS = null,
  SESSION_SCAN_THROTTLE_MS = 600000,
  regExp = new RegExp(`^\\s*(?:${DELETE_COMMAND_NAMES})\\b`, "i"),
  DEFAULT_DREAM_THRESHOLDS = { minHours: 24, minSessions: 5 };
/**
 * 读取 tengu_onyx_plover 中的 minHours/minSessions，非法值回落到 24/5。
 */
//@ chunk-rsht1tdj.js:7814-8098 fingerprint = getConfig (1)
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
/**
 * autoDream 前置条件：不是宿主托管会话、无嵌入式搜索工具、自动记忆可用、非 --add-dir 场景且 Sgt() 为真。
 */
//@ chunk-rsht1tdj.js:8098-8202 layout
function isAutoDreamAllowed() {
  if (Jn() !== null) return !1;
  if (hasEmbeddedSearchTools_2()) return !1;
  if (!isAutoMemoryEnabled()) return !1;
  if (isAutoMemReadFenced()) return !1;
  return isAutoDreamEnabled();
}
//@ chunk-rsht1tdj.js:8202-8225 layout
function isAutoDreamForced() {
  return !1;
}
/**
 * autoDream（后台记忆整理）：每回合检查——tengu_onyx_plover 配置存在且 isAutoDreamAllowed；距上次整理 ≥ minHours（默认 24h）；10 分钟扫描节流；自上次整理后改动过的其他会话 ≥ minSessions（默认 5）；拿到 .consolidate-lock 后派生 dream 子代理整理记忆，失败回滚锁时间。
 */
//@ chunk-rsht1tdj.js:8225-13121 fingerprint = initAutoDream (0.65)
function initAutoDream(e) {
  let lastSessionScanAt = 0,
    o = !1,
    y = new Set();
  B.of(e).runner = async function (context, appendSystemMessage) {
    let cfg = getConfig(),
      force = isAutoDreamForced();
    if (!force && !isAutoDreamAllowed()) return;
    let E;
    try {
      E = await readLastConsolidatedAt(void 0, context.toolUseContext.storageV5);
    } catch (error) {
      logForDebugging(`[autoDream] readLastConsolidatedAt failed: ${errorMessage(error)}`);
      return;
    }
    let P = (Date.now() - E) / 3600000;
    if (!force && P < cfg.minHours) return;
    let q = Date.now() - lastSessionScanAt;
    if (!force && q < SESSION_SCAN_THROTTLE_MS) {
      logForDebugging(
        `[autoDream] scan throttle \u2014 time-gate passed but last scan was ${Math.round(q / 1000)}s ago`,
      );
      return;
    }
    lastSessionScanAt = Date.now();
    let f;
    try {
      f = await listSessionsTouchedSince(E, context.toolUseContext.storageV5);
    } catch (error) {
      logForDebugging(`[autoDream] listSessionsTouchedSince failed: ${errorMessage(error)}`);
      return;
    }
    let currentSession = getSessionId();
    if (((f = f.filter((id) => id !== currentSession)), !force && f.length < cfg.minSessions)) {
      (logForDebugging(
        `[autoDream] skip \u2014 ${f.length} sessions since last consolidation, need ${cfg.minSessions}`,
      ),
        logEvent("tengu_auto_dream_skipped", {
          reason: lit("sessions"),
          session_count: f.length,
          min_required: cfg.minSessions,
        }));
      return;
    }
    let I = memoryWriteBlockingRule(
      context.toolUseContext.getAppState().toolPermissionContext,
      getAutoMemEntrypoint(),
    );
    if (I !== void 0) {
      if (
        (logForDebugging(`[autoDream] skip \u2014 ${YBn(I)} would refuse memory writes`),
        logEvent("tengu_auto_dream_skipped", { reason: lit("permission_rule") }),
        appendSystemMessage !== void 0)
      ) {
        let l = describeMemoryRuleBlock(e, I, getAutoMemPath());
        if (l !== void 0) appendSystemMessage(createSystemMessage(l, "warning"));
      }
      return;
    }
    let D;
    if (force) D = E;
    else {
      try {
        D = await tryAcquireConsolidationLockDefault(context.toolUseContext.storageV5);
      } catch (error) {
        logForDebugging(`[autoDream] lock acquire failed: ${errorMessage(error)}`);
        return;
      }
      if (D === null) {
        logEvent("tengu_auto_dream_skipped", { reason: lit("lock") });
        return;
      }
    }
    let S = getAutoMemPath(),
      M = void 0,
      h = M === "unplaced" || M === "capped" ? void 0 : M;
    if (h === "newer" || (h !== void 0 && "unreadable" in h)) {
      if (!force) await rollbackConsolidationLockDefault(D, context.toolUseContext.storageV5);
      if (h !== "newer") {
        if (
          (logForDebugging(
            `[autoDream] skipped: the memory items could not be read (cause: ${h.unreadable}); the warning above says why and what resumes consolidation`,
          ),
          logEvent("tengu_auto_dream_skipped", { reason: lit("items_unreadable") }),
          AUTO_DREAM_DEFAULTS !== null && appendSystemMessage !== void 0 && !y.has(h.unreadable))
        )
          (y.add(h.unreadable),
            appendSystemMessage?.(
              createSystemMessage(
                await AUTO_DREAM_DEFAULTS.unreadableItemsNotice(h.unreadable, S),
                "warning",
              ),
            ));
        return;
      }
      if (
        (logForDebugging("[autoDream] skip \u2014 newer item record"),
        logEvent("tengu_auto_dream_skipped", { reason: lit("record_newer") }),
        AUTO_DREAM_DEFAULTS !== null && appendSystemMessage !== void 0 && !o)
      )
        ((o = !0),
          appendSystemMessage?.(createSystemMessage(AUTO_DREAM_DEFAULTS.NEWER_RECORD_NOTICE, "warning")));
      return;
    }
    let F = a4();
    (logForDebugging(`[autoDream] firing \u2014 ${P.toFixed(1)}h since last, ${f.length} sessions to review`),
      logEvent("tengu_auto_dream_fired", {
        hours_since: Math.round(P),
        sessions_since: f.length,
        team_memory_enabled: F,
      }));
    let { taskRegistry: taskRegistry } = context.toolUseContext,
      abortController = new AbortController(),
      taskId = registerDreamTask(taskRegistry, {
        sessionsReviewing: f.length,
        priorMtime: D,
        abortController: abortController,
        storageV5: context.toolUseContext.storageV5,
      }),
      L = "fork";
    try {
      let transcriptDir = getProjectDir(getOriginalCwd()),
        extra = `

**Tool constraints for this run:** Shell access is restricted to read-only commands (\`ls\`, \`find\`, \`grep\`, \`cat\`, \`stat\`, \`wc\`, \`head\`, \`tail\`, and similar) plus deleting \`.md\` files inside the memory directory (outside protected subdirectories like \`.git\` or \`agents\`; \`rm\` takes no flags except \`-f\`). Anything else that writes, redirects to a file, or modifies state will be denied. Plan your exploration with this in mind.

Sessions since last consolidation (${f.length}):
${f.map((id) => `- ${id}`).join(`
`)}`,
        we = !1,
        ne = buildConsolidationPrompt(S, transcriptDir, extra, F, rar(), !1),
        prompt = makeDreamProgressWatcher(taskId, taskRegistry, S),
        H = new Map(),
        j = new Set(),
        G = !1,
        X = !1,
        V = !1,
        A;
      try {
        ((A = await runForkedAgent({
          promptMessages: [createUserMessage({ content: ne })],
          cacheSafeParams: createCacheSafeParams(context),
          canUseTool: createAutoMemCanUseTool(
            S,
            h !== void 0 ? AUTO_DREAM_DEFAULTS?.keptItemsOf(h) : void 0,
            { fork: "dream", onWriteAllowed: (_, U) => H.set(U, _) },
          ),
          querySource: "auto_dream",
          forkLabel: "auto_dream",
          skipTranscript: !0,
          overrides: { abortController: abortController },
          onMessage: (_) => {
            if ((prompt(_), collectErroredToolUseIds(_, j), _.type === "assistant"))
              G = _.isApiErrorMessage === !0;
          },
          skipCacheWrite: DGt(),
        })),
          (X = !0),
          (V = !abortController.signal.aborted && !G));
      } finally {
        let _ = new Set([...H].filter(([k]) => !V || !j.has(k)).map(([, k]) => k)),
          U = new Set([...H].filter(([k]) => V && j.has(k)).map(([, k]) => k));
        if (AUTO_DREAM_DEFAULTS !== null && M === "capped")
          await AUTO_DREAM_DEFAULTS.deferCappedRunWrites({ memoryDir: S, dreamWrote: _, mayHaveWritten: U });
        if (AUTO_DREAM_DEFAULTS !== null && h !== void 0) {
          let settleDreamItems = await AUTO_DREAM_DEFAULTS.settleDreamItems({
            memoryDir: S,
            before: h,
            dreamWrote: _,
            mayHaveWritten: U,
          });
          if (
            (settleDreamItems.skipped || settleDreamItems.failed) &&
            X &&
            !abortController.signal.aborted &&
            !force &&
            (await AUTO_DREAM_DEFAULTS.claimLockGiveBack(S))
          )
            await rollbackConsolidationLockDefault(D, context.toolUseContext.storageV5);
        }
      }
      ((L = "completion"), completeDreamTask(taskId, taskRegistry));
      let T = context.toolUseContext.taskRegistry.get(taskId),
        me = isDreamTask(T) ? T.filesTouched.length : 0;
      if (isDreamTask(T) && T.filesTouched.length > 0)
        (appendSystemMessage?.({ ...createMemorySavedMessage(T.filesTouched), verb: "Improved" }),
          await resyncMemoryWrites(context.toolUseContext, {
            source: "dream",
            summary: `consolidated ${T.filesTouched.length} ${plural(T.filesTouched.length, "memory file")}`,
            paths: T.filesTouched,
          }));
      (logForDebugging(
        `[autoDream] completed \u2014 cache: read=${A.totalUsage.cache_read_input_tokens} created=${A.totalUsage.cache_creation_input_tokens}`,
      ),
        logEvent("tengu_auto_dream_completed", {
          cache_read: A.totalUsage.cache_read_input_tokens,
          cache_created: A.totalUsage.cache_creation_input_tokens,
          output: A.totalUsage.output_tokens,
          sessions_reviewed: f.length,
          files_touched_count: me,
          team_memory_enabled: F,
          account_memory_line_rendered: !1,
        }));
    } catch (error) {
      if (abortController.signal.aborted) {
        logForDebugging("[autoDream] aborted by user");
        return;
      }
      if (
        (logForDebugging(`[autoDream] ${L} failed: ${errorMessage(error)}`),
        logEvent("tengu_auto_dream_failed", {
          phase: fromEnum(L),
          error_class: sanitizedErrorNameForTelemetry(toError(error)),
        }),
        L === "fork")
      )
        (markDreamTaskFailed(taskId, taskRegistry),
          await rollbackConsolidationLockDefault(D, context.toolUseContext.storageV5));
    }
  };
}
/**
 * 监视 dream 子代理输出，更新任务进度（touch 的文件、文本）。
 */
//@ chunk-rsht1tdj.js:13323-13882 fingerprint = makeDreamProgressWatcher (0.885)
function makeDreamProgressWatcher(e, r, o) {
  return (msg) => {
    if (msg.type !== "assistant") return;
    let text = "",
      toolUseCount = 0,
      touchedPaths = [];
    for (let block of msg.message.content)
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") {
        if ((toolUseCount++, block.name === FILE_EDIT_TOOL_NAME || block.name === FILE_WRITE_TOOL_NAME)) {
          let input = block.input;
          if (typeof input.file_path === "string") touchedPaths.push(input.file_path);
        } else if (SHELL_TOOL_NAMES.includes(block.name)) {
          let input = block.input;
          if (typeof input.command === "string" && regExp.test(input.command))
            for (let E of input.command.matchAll(/"[^"]*\.md"|'[^']*\.md'|(?:\/|[A-Za-z]:[\\/])\S*\.md\b/g))
              touchedPaths.push(E[0].replace(/^["']|["']$/g, ""));
        }
      }
    addDreamTurn(
      e,
      { text: text.trim(), toolUseCount: toolUseCount },
      touchedPaths.filter((n) => isAllowedAutoMemWritePath(n, o)),
      r,
    );
  };
}
//@ chunk-rsht1tdj.js:13882-13962 placement
async function DOs(e, r) {
  await B.of(e.toolUseContext.session.host).runner?.(e, r);
}

export { initAutoDream, DOs };
