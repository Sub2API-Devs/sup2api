/**
 * commands/compact/compact.ts
 *
 * 并入已有模块：/compact 命令的补充逻辑。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/compact/compact.ts
 * pieces: chunk-p5wtay00.js (3), chunk-vrrvwm85.js (5)
 * attribution: placement 4, fingerprint 3, layout 1
 */
import { getLastCacheSafeParamsForSameModel } from "../../utils/forkedAgent.js";
import { getOrBuildUserContext, getCachedSystemContext, invalidateUserContext } from "../../context.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";
import {
  COMPACTION_BLOCKED_BY_HOOK,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  CompactionError,
  mergeHookInstructions,
  buildReactiveCompactionResult,
  buildPostCompactMessages,
  runCompactHooks,
} from "../../services/compact/compact.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
  hasExactErrorMessage,
  errorMessage,
} from "../../utils/errors.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import {
  messagesSinceCompactBoundary,
  isCompactBoundaryMessage,
} from "../../services/projects/threadRows.js";
import {
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE,
  COMPACT_FAILED_MEDIA_LIMIT_MESSAGE,
} from "../../services/compact/compactErrors.js";
import { logError } from "../../utils/log.js";
import { getLastMainRequestId } from "../../bootstrap/state.js";
import { roughTokenCountEstimationForMessages } from "../../services/tokenEstimation.js";
import { executePreCompactHooks } from "../../utils/hooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { tryReactiveCompact } from "../../services/compact/reactiveCompact.js";
import { API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import {
  getTokenCountFromUsage_3,
  dispatchSessionCompactHooks,
  reuuidAssistantRows,
} from "../../plugins/functionHooks/sessionCompactHook.js";
import { cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import { suppressCompactWarning } from "../../services/compact/compactWarningState.js";
import { logCompactionEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import {
  loadPrecomputedCompact,
  awaitInflightPrecompute,
  logManualPrecomputeConsumed,
  messagesWithRowUuids,
  checkPrecomputeCoverage,
  logPrecomputeDiscarded,
  logManualPrecomputeApplied,
} from "../../services/compact/precomputedCompact.js";
import { getUpgradeMessage } from "../../utils/model/contextWindowUpgradeCheck.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { sequential } from "../../utils/sequential.js";

//@ chunk-p5wtay00.js:312-598 placement
/**
 * 组装压缩用的缓存安全参数：优先复用同模型最近一次的 system/user/system context，否则重新构建。
 */
async function buildCompactCacheSafeParams({
  toolUseContext,
  forkContextMessages,
  mainThreadAgentDefinition,
}) {
  let { systemPrompt, userContext, systemContext } =
    getLastCacheSafeParamsForSameModel() ??
    (await buildCacheSafePromptParts(toolUseContext, mainThreadAgentDefinition));
  return {
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    forkContextMessages,
    advisorModel: toolUseContext.getAdvisorSetting(),
  };
}
//@ chunk-p5wtay00.js:598-819 placement
/**
 * 并行生成 system prompt、user context 与 system context。
 */
async function buildCacheSafePromptParts(context, forkContextMessages) {
  let [model, customInstructions, cachedSystemContext] = await Promise.all([
    context.renderedSystemPrompt ?? getCacheSharingParams(context, forkContextMessages),
    getOrBuildUserContext(context.session, context.storageV5, context.credentials),
    getCachedSystemContext(context.session, context.options.cacheBreakerPhrase),
  ]);
  return {
    systemPrompt: model,
    userContext: customInstructions,
    systemContext: cachedSystemContext,
  };
}
//@ chunk-p5wtay00.js:819-1123 fingerprint = getCacheSharingParams (0.585)
async function getCacheSharingParams(context, forkContextMessages) {
  let systemPrompt = getToolPermissionContext(context);
  let defaultSysPrompt = await getSystemPrompt(
    context.options.tools,
    getRuntimeMainLoopModel({
      permissionMode: systemPrompt.mode,
      mainLoopModel: context.options.mainLoopModel,
    }),
  );
  return effectiveSystemPromptText({
    mainThreadAgentDefinition: forkContextMessages,
    toolUseContext: context,
    customSystemPrompt: context.options.customSystemPrompt,
    defaultSystemPrompt: defaultSysPrompt,
    appendSystemPrompt: context.options.appendSystemPrompt,
  });
}
//@ chunk-vrrvwm85.js:12092-12311 placement = buildMagicDocsUpdatePrompt (0.349)
/**
 * /compact 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runCompactCommand = async (args, context) => {
  let result = await call(context, {
    customInstructions: args,
  });
  if (result.type !== "skipped") return result;
  return result.reason.startsWith(COMPACTION_BLOCKED_BY_HOOK)
    ? {
        type: "text",
        value: result.reason,
        level: "error",
      }
    : {
        type: "text",
        value: `Not compacted \xB7 ${result.reason}`,
      };
};
//@ chunk-vrrvwm85.js:12311-13047 placement
async function call(args, { customInstructions, mainThreadAgentDefinition, trigger = "manual", origin }) {
  let { abortController } = args;
  let { messages } = args;
  if (args.getAppState().endedByModel)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue."),
      "Claude ended this conversation",
    );
  messages = messagesSinceCompactBoundary(messages);
  if (messages.length === 0) throw Error(NO_MESSAGES_TO_COMPACT);
  let customInstructions_2 = customInstructions.trim();
  try {
    return await compactViaReactive(messages, args, {
      customInstructions: customInstructions_2,
      mainThreadAgentDefinition,
      trigger,
      origin: origin ?? args.hookOrigin,
    });
  } catch (error) {
    if (abortController.signal.aborted) throw new AbortError("Compaction canceled.");
    else if (hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES))
      return {
        type: "text",
        value: ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
      };
    else if (error instanceof CompactionError)
      return {
        type: "text",
        value: error.message,
        level: "error",
      };
    else {
      logError(error);
      throw Error(`${COMPACT_ERROR_PREFIX}${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }
}
//@ chunk-vrrvwm85.js:13047-16941 fingerprint = compactViaReactive (0.389)
async function compactViaReactive(
  messages,
  context,
  { customInstructions, mainThreadAgentDefinition, trigger, origin },
) {
  let triggerLabel = trigger === "auto" ? "auto" : "manual";
  context.onCompactEvent?.({
    type: "compact_progress",
    event: {
      type: "hooks_start",
      hookType: "pre_compact",
    },
  });
  context.onCompactEvent?.({
    type: "sdk_status",
    status: "compacting",
  });
  let startTime = performance.now();
  let mainChainTailAtStart = getLastMainRequestId();
  let preCompact;
  let tokenEstimate = roughTokenCountEstimationForMessages(messages);
  let reuse;
  let precomputeReuse;
  let cacheParams;
  let compact = async (onQueryEvent, options) => {
    let [preHooks, cacheSafeParams] = await Promise.all([
      executePreCompactHooks(
        context.session,
        {
          trigger: triggerLabel,
          customInstructions: options || null,
        },
        context,
        context.abortController.signal,
      ),
      buildCompactCacheSafeParams({
        toolUseContext: context,
        forkContextMessages: onQueryEvent,
        mainThreadAgentDefinition,
      }),
    ]);
    cacheParams = cacheSafeParams;
    if (preHooks.blockedBy) {
      logForDebugging(`Compaction blocked by PreCompact hook: ${preHooks.blockedBy}`, {
        level: "warn",
      });
      context.onQueryEvent?.({
        type: "notification",
        notification: {
          key: "compaction-blocked-by-hook",
          text: "compaction blocked by PreCompact hook",
          priority: "immediate",
          color: "warning",
        },
      });
      return {
        skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${preHooks.blockedBy}`,
      };
    }
    let mergedInstructions = mergeHookInstructions(options, preHooks.newCustomInstructions);
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    context.onQueryEvent?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_start",
      },
    });
    let reused = await tryReusePrecomputedCompaction(context, options ?? "", preHooks.newCustomInstructions, {
      sent: messages,
      received: onQueryEvent,
    });
    precomputeReuse = reused.reuse;
    if (reused.hit && reused.replacement !== undefined) {
      let messages = [...reused.replacement, ...reused.since];
      return {
        messages,
        tokensBefore: tokenEstimate,
        record: {
          kind: "replacement",
          messages,
        },
      };
    }
    let compaction = await (
      reused.hit
        ? buildReactiveCompactionResult({
            ...reused.finalize,
            trigger: triggerLabel,
            compactionKind: triggerLabel,
            startTime,
            cacheSafeParams,
            mainChainTailAtStart,
          })
        : tryReactiveCompact(onQueryEvent, cacheSafeParams, {
            customInstructions: mergedInstructions,
            trigger: triggerLabel,
            compactionKind: triggerLabel,
            manualPrecomputeReuse: reused.reuse,
            userWaitStartedAt: startTime,
            precomputedKind: reused.precomputedKind,
            precomputedFailureCause: reused.precomputedFailureCause,
            onResponseLength: (event) => context.onQueryEvent?.(event),
          })
    ).catch((error) => {
      logError(error);
      return {
        ok: false,
        reason: "error",
        detail: errorMessage(error),
      };
    });
    if (!compaction.ok)
      switch (compaction.reason) {
        case "too_few_groups":
          throw Error(ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
        case "aborted":
          throw Error(API_REQUEST_ABORTED_MESSAGE);
        case "exhausted":
          throw new CompactionError(COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE);
        case "media_unstrippable":
          throw new CompactionError(COMPACT_FAILED_MEDIA_LIMIT_MESSAGE);
        case "error":
          throw new CompactionError(`${COMPACT_ERROR_PREFIX}${compaction.detail || "unknown error"}`);
      }
    let boundaryMarker = compaction.result.boundaryMarker;
    let compactMetadata = isCompactBoundaryMessage(boundaryMarker)
      ? boundaryMarker.compactMetadata
      : undefined;
    return {
      messages: buildPostCompactMessages(compaction.result),
      tokensBefore: compactMetadata?.preTokens,
      tokensAfter: compactMetadata?.postTokens,
      usage: getTokenCountFromUsage_3(compaction.result.compactionUsage),
      record: {
        kind: "compacted",
        compactionResult: compaction.result,
        hookDisplay: preHooks.userDisplayMessage,
      },
    };
  };
  try {
    let hookResult = await dispatchSessionCompactHooks({
      trigger,
      instructions: customInstructions || undefined,
      messages,
      isIsolated: false,
      origin,
      signal: context.abortController.signal,
      compact,
    });
    if (hookResult.kind === "skipped") {
      preCompact = `skipped: ${hookResult.reason}`;
      return {
        type: "skipped",
        reason: hookResult.reason,
      };
    }
    let record = hookResult.record;
    let cacheSafeParams =
      cacheParams ??
      (await buildCompactCacheSafeParams({
        toolUseContext: context,
        forkContextMessages: messages,
        mainThreadAgentDefinition,
      }));
    let result =
      hookResult.kind === "replaced"
        ? hookResult.messages
        : hookResult.record.kind === "replacement"
          ? reuuidAssistantRows(hookResult.record.messages)
          : undefined;
    let boundary =
      result === undefined && record?.kind === "compacted"
        ? record.compactionResult
        : await runCompactHooks({
            replacement: result ?? [],
            preCompactMessages: messages,
            cacheSafeParams,
            querySource: undefined,
            trigger: triggerLabel,
            startTime,
            coreBoundary: record?.kind === "compacted" ? record.compactionResult.boundaryMarker : undefined,
            compactionKind: triggerLabel,
            mainChainTailAtStart,
            precomputed: record?.kind === "replacement",
          });
    let hookDisplay = record?.kind === "compacted" ? record.hookDisplay : undefined;
    let boundaryMarker = boundary.boundaryMarker;
    if (isCompactBoundaryMessage(boundaryMarker)) reuse = boundaryMarker.compactMetadata.postTokens;
    cleanupAfterCompaction(
      context.session,
      undefined,
      context.setAppState,
      undefined,
      undefined,
      context.storageV5,
    );
    suppressCompactWarning();
    invalidateUserContext(context.session, "compaction");
    let userDisplayMessage =
      [hookDisplay, boundary.userDisplayMessage].filter(Boolean).join(`
`) || undefined;
    return {
      type: "compact",
      compactionResult: {
        ...boundary,
        userDisplayMessage,
      },
      ...buildDisplayText(context.options.verbose, userDisplayMessage),
      displayRepeatsSummary: boundary.userDisplayMessage !== undefined,
      result: {
        ...hookResult.result,
        ...(reuse !== undefined && {
          tokensAfter: reuse,
        }),
      },
    };
  } catch (error) {
    preCompact = error instanceof Error ? error.message : "reactive compaction failed";
    throw error;
  } finally {
    context.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    context.onQueryEvent?.({
      type: "response_length",
      op: "reset",
    });
    context.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_end",
      },
    });
    logCompactionEvent(
      {
        trigger: triggerLabel,
        success: !preCompact,
        durationMs: performance.now() - startTime,
        preTokens: tokenEstimate,
        postTokens: reuse,
        error: preCompact,
        precomputeReuse,
      },
      context.agentContext,
    );
    context.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: preCompact ? "failed" : "success",
        ...(preCompact && {
          compactError: preCompact,
        }),
      },
    });
  }
}
//@ chunk-vrrvwm85.js:16941-18671 layout
/**
 * tryReusePrecomputedCompaction：命中 session.precompute 的预计算摘要则复用。
 */
async function tryReusePrecomputedCompaction(session, context, newCustomInstructions, { sent, received }) {
  if (context)
    return {
      hit: false,
      reuse: "miss_custom_instructions",
    };
  if (newCustomInstructions)
    return {
      hit: false,
      reuse: "miss_hook",
    };
  let { precompute } = session.session;
  loadPrecomputedCompact(
    precompute,
    "main",
    session.options.querySource,
    sent,
    session.options.mainLoopModel,
    session.storageV5,
  );
  let startTime = performance.now();
  let precomputed = await awaitInflightPrecompute(
    precompute,
    undefined,
    session.abortController.signal,
    session.storageV5,
  );
  let elapsedMs = performance.now() - startTime;
  if (precomputed === null) {
    logManualPrecomputeConsumed("none", precomputed, elapsedMs);
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "none",
    };
  }
  if (precomputed.kind === "turn_aborted") {
    logManualPrecomputeConsumed("aborted", precomputed, elapsedMs);
    throw Error(API_REQUEST_ABORTED_MESSAGE);
  }
  if (precomputed.kind === "failed") {
    logManualPrecomputeConsumed("failed", precomputed, elapsedMs);
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "failed",
      precomputedFailureCause: precomputed.failure.cause,
    };
  }
  let sentRows = messagesWithRowUuids(sent);
  let receivedRows = sentRows && messagesWithRowUuids(received);
  let diff =
    sentRows === undefined || receivedRows === undefined
      ? {
          kind: "refuse",
          reason: "rows_unreadable",
        }
      : checkPrecomputeCoverage(
          precomputed.ready,
          {
            sent: sentRows,
            received: receivedRows,
          },
          session.options.mainLoopModel,
          session.options.autoCompactWindow,
        );
  if (diff.kind === "refuse") {
    logManualPrecomputeConsumed("none", precomputed, elapsedMs);
    logPrecomputeDiscarded(
      precomputed.ready,
      diff.reason,
      undefined,
      diff.reason === "would_not_fit" ? diff.sizes : undefined,
    );
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "none",
    };
  }
  let tail = diff.tail;
  logManualPrecomputeApplied(
    precomputed,
    elapsedMs,
    {
      messages: sent,
      mainLoopModel: session.options.mainLoopModel,
    },
    diff.sizes,
  );
  return {
    hit: true,
    reuse: "hit",
    ...(precomputed.ready.replacement && {
      replacement: precomputed.ready.result.messagesToPreserve,
    }),
    since: tail,
    finalize: {
      compactResult: precomputed.ready.result,
      messagesToPreserve: [...precomputed.ready.result.messagesToPreserve, ...tail],
      preCompactMessages: received,
      querySource: undefined,
      precomputed: true,
      manualPrecomputeReuse: "hit",
      precomputeTelemetry: {
        statusAtPTL: precomputed.statusAtPTL === "ready" ? "ready" : "pending",
        leadMs: startTime - precomputed.ready.startedAt,
        totalMs: precomputed.ready.readyDurationMs,
        borrowed: false,
        messagesSinceTokens: roughTokenCountEstimationForMessages(tail),
        rehydrated: precomputed.ready.rehydrated === true,
        ...(precomputed.ready.armTrigger === "idle" && {
          armTrigger: "idle",
        }),
        headReordered: diff.headReordered,
        displayOnlyLeftOutCount: diff.displayOnlyLeftOutCount,
        earlyTailCount: diff.earlyTailCount,
      },
    },
  };
}
//@ chunk-vrrvwm85.js:18671-18900 fingerprint = buildDisplayText (0.9)
function buildDisplayText(context, userDisplayMessage) {
  let upgradeMessage = getUpgradeMessage("tip");
  let expandShortcut = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let dimmed = [
    ...(context ? [] : [`(${expandShortcut} to see full summary)`]),
    ...(userDisplayMessage ? [userDisplayMessage] : []),
    ...(upgradeMessage ? [upgradeMessage] : []),
  ];
  return {
    displayText: sequential.dim(
      "Compacted " +
        dimmed.join(`
`),
    ),
    displayTextIsHintOnly: !userDisplayMessage && !upgradeMessage,
  };
}
export { buildCompactCacheSafeParams, runCompactCommand, call };
