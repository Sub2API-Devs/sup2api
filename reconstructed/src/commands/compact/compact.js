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
  COMPACT_FAILED_CONTEXT_LIMIT,
  COMPACT_FAILED_MEDIA_LIMIT,
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
import { invalidateUserContext, getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
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
import { getLastCacheSafeParamsForSameModel } from "../../utils/forkedAgent.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getSystemPrompt } from "../../constants/prompts.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { effectiveSystemPromptText } from "../../utils/systemPrompt.js";

//@ chunk-vrrvwm85.js:12092-12311 placement = buildMagicDocsUpdatePrompt (0.349)
/**
 * /compact 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runCompactCommand = async (args, context) => {
  let i = await call(context, {
    customInstructions: args,
  });
  if (i.type !== "skipped") return i;
  return i.reason.startsWith(COMPACTION_BLOCKED_BY_HOOK)
    ? {
        type: "text",
        value: i.reason,
        level: "error",
      }
    : {
        type: "text",
        value: `Not compacted \xB7 ${i.reason}`,
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
  e,
  { customInstructions, mainThreadAgentDefinition, trigger, origin },
) {
  let n = trigger === "auto" ? "auto" : "manual";
  e.onCompactEvent?.({
    type: "compact_progress",
    event: {
      type: "hooks_start",
      hookType: "pre_compact",
    },
  });
  e.onCompactEvent?.({
    type: "sdk_status",
    status: "compacting",
  });
  let startTime = performance.now();
  let mainChainTailAtStart = getLastMainRequestId();
  let m;
  let E = roughTokenCountEstimationForMessages(messages);
  let p;
  let precomputeReuse;
  let T;
  let compact = async (a, u) => {
    let [k, compactCacheSafeParams] = await Promise.all([
      executePreCompactHooks(
        e.session,
        {
          trigger: n,
          customInstructions: u || null,
        },
        e,
        e.abortController.signal,
      ),
      buildCompactCacheSafeParams({
        toolUseContext: e,
        forkContextMessages: a,
        mainThreadAgentDefinition,
      }),
    ]);
    T = compactCacheSafeParams;
    if (k.blockedBy) {
      logForDebugging(`Compaction blocked by PreCompact hook: ${k.blockedBy}`, {
        level: "warn",
      });
      e.onQueryEvent?.({
        type: "notification",
        notification: {
          key: "compaction-blocked-by-hook",
          text: "compaction blocked by PreCompact hook",
          priority: "immediate",
          color: "warning",
        },
      });
      return {
        skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${k.blockedBy}`,
      };
    }
    let mergedInstructions = mergeHookInstructions(u, k.newCustomInstructions);
    e.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    e.onQueryEvent?.({
      type: "response_length",
      op: "reset",
    });
    e.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_start",
      },
    });
    let c = await tryReusePrecomputedCompaction(e, u ?? "", k.newCustomInstructions, {
      sent: messages,
      received: a,
    });
    precomputeReuse = c.reuse;
    if (c.hit && c.replacement !== undefined) {
      let messages = [...c.replacement, ...c.since];
      return {
        messages,
        tokensBefore: E,
        record: {
          kind: "replacement",
          messages,
        },
      };
    }
    let g = await (
      c.hit
        ? buildReactiveCompactionResult({
            ...c.finalize,
            trigger: n,
            compactionKind: n,
            startTime,
            cacheSafeParams: compactCacheSafeParams,
            mainChainTailAtStart,
          })
        : tryReactiveCompact(a, compactCacheSafeParams, {
            customInstructions: mergedInstructions,
            trigger: n,
            compactionKind: n,
            manualPrecomputeReuse: c.reuse,
            userWaitStartedAt: startTime,
            precomputedKind: c.precomputedKind,
            precomputedFailureCause: c.precomputedFailureCause,
            onResponseLength: (h) => e.onQueryEvent?.(h),
          })
    ).catch((error) => {
      logError(error);
      return {
        ok: false,
        reason: "error",
        detail: errorMessage(error),
      };
    });
    if (!g.ok)
      switch (g.reason) {
        case "too_few_groups":
          throw Error(ERROR_MESSAGE_NOT_ENOUGH_MESSAGES);
        case "aborted":
          throw Error(API_REQUEST_ABORTED_MESSAGE);
        case "exhausted":
          throw new CompactionError(COMPACT_FAILED_CONTEXT_LIMIT);
        case "media_unstrippable":
          throw new CompactionError(COMPACT_FAILED_MEDIA_LIMIT);
        case "error":
          throw new CompactionError(`${COMPACT_ERROR_PREFIX}${g.detail || "unknown error"}`);
      }
    let boundaryMarker = g.result.boundaryMarker;
    let compactMetadata = isCompactBoundaryMessage(boundaryMarker)
      ? boundaryMarker.compactMetadata
      : undefined;
    return {
      messages: buildPostCompactMessages(g.result),
      tokensBefore: compactMetadata?.preTokens,
      tokensAfter: compactMetadata?.postTokens,
      usage: getTokenCountFromUsage_3(g.result.compactionUsage),
      record: {
        kind: "compacted",
        compactionResult: g.result,
        hookDisplay: k.userDisplayMessage,
      },
    };
  };
  try {
    let a = await dispatchSessionCompactHooks({
      trigger,
      instructions: customInstructions || undefined,
      messages,
      isIsolated: false,
      origin,
      signal: e.abortController.signal,
      compact,
    });
    if (a.kind === "skipped") {
      m = `skipped: ${a.reason}`;
      return {
        type: "skipped",
        reason: a.reason,
      };
    }
    let record = a.record;
    let cacheSafeParams =
      T ??
      (await buildCompactCacheSafeParams({
        toolUseContext: e,
        forkContextMessages: messages,
        mainThreadAgentDefinition,
      }));
    let S =
      a.kind === "replaced"
        ? a.messages
        : a.record.kind === "replacement"
          ? reuuidAssistantRows(a.record.messages)
          : undefined;
    let _ =
      S === undefined && record?.kind === "compacted"
        ? record.compactionResult
        : await runCompactHooks({
            replacement: S ?? [],
            preCompactMessages: messages,
            cacheSafeParams,
            querySource: undefined,
            trigger: n,
            startTime,
            coreBoundary: record?.kind === "compacted" ? record.compactionResult.boundaryMarker : undefined,
            compactionKind: n,
            mainChainTailAtStart,
            precomputed: record?.kind === "replacement",
          });
    let hookDisplay = record?.kind === "compacted" ? record.hookDisplay : undefined;
    let boundaryMarker = _.boundaryMarker;
    if (isCompactBoundaryMessage(boundaryMarker)) p = boundaryMarker.compactMetadata.postTokens;
    cleanupAfterCompaction(e.session, undefined, e.setAppState, undefined, undefined, e.storageV5);
    suppressCompactWarning();
    invalidateUserContext(e.session, "compaction");
    let userDisplayMessage =
      [hookDisplay, _.userDisplayMessage].filter(Boolean).join(`
`) || undefined;
    return {
      type: "compact",
      compactionResult: {
        ..._,
        userDisplayMessage,
      },
      ...buildDisplayText(e.options.verbose, userDisplayMessage),
      displayRepeatsSummary: _.userDisplayMessage !== undefined,
      result: {
        ...a.result,
        ...(p !== undefined && {
          tokensAfter: p,
        }),
      },
    };
  } catch (error) {
    m = error instanceof Error ? error.message : "reactive compaction failed";
    throw error;
  } finally {
    e.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    e.onQueryEvent?.({
      type: "response_length",
      op: "reset",
    });
    e.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_end",
      },
    });
    logCompactionEvent(
      {
        trigger: n,
        success: !m,
        durationMs: performance.now() - startTime,
        preTokens: E,
        postTokens: p,
        error: m,
        precomputeReuse,
      },
      e.agentContext,
    );
    e.onCompactEvent?.({
      type: "sdk_status",
      status: null,
      metadata: {
        compactResult: m ? "failed" : "success",
        ...(m && {
          compactError: m,
        }),
      },
    });
  }
}
//@ chunk-vrrvwm85.js:16941-18671 layout
/**
 * tryReusePrecomputedCompaction：命中 session.precompute 的预计算摘要则复用。
 */
async function tryReusePrecomputedCompaction(r, e, newCustomInstructions, { sent, received }) {
  if (e)
    return {
      hit: false,
      reuse: "miss_custom_instructions",
    };
  if (newCustomInstructions)
    return {
      hit: false,
      reuse: "miss_hook",
    };
  let { precompute } = r.session;
  loadPrecomputedCompact(
    precompute,
    "main",
    r.options.querySource,
    sent,
    r.options.mainLoopModel,
    r.storageV5,
  );
  let startTime = performance.now();
  let o = await awaitInflightPrecompute(precompute, undefined, r.abortController.signal, r.storageV5);
  let s = performance.now() - startTime;
  if (o === null) {
    logManualPrecomputeConsumed("none", o, s);
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "none",
    };
  }
  if (o.kind === "turn_aborted") {
    logManualPrecomputeConsumed("aborted", o, s);
    throw Error(API_REQUEST_ABORTED_MESSAGE);
  }
  if (o.kind === "failed") {
    logManualPrecomputeConsumed("failed", o, s);
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "failed",
      precomputedFailureCause: o.failure.cause,
    };
  }
  let m = messagesWithRowUuids(sent);
  let E = m && messagesWithRowUuids(received);
  let p =
    m === undefined || E === undefined
      ? {
          kind: "refuse",
          reason: "rows_unreadable",
        }
      : checkPrecomputeCoverage(
          o.ready,
          {
            sent: m,
            received: E,
          },
          r.options.mainLoopModel,
          r.options.autoCompactWindow,
        );
  if (p.kind === "refuse") {
    logManualPrecomputeConsumed("none", o, s);
    logPrecomputeDiscarded(o.ready, p.reason, undefined, p.reason === "would_not_fit" ? p.sizes : undefined);
    return {
      hit: false,
      reuse: "miss_not_ready",
      precomputedKind: "none",
    };
  }
  let tail = p.tail;
  logManualPrecomputeApplied(
    o,
    s,
    {
      messages: sent,
      mainLoopModel: r.options.mainLoopModel,
    },
    p.sizes,
  );
  return {
    hit: true,
    reuse: "hit",
    ...(o.ready.replacement && {
      replacement: o.ready.result.messagesToPreserve,
    }),
    since: tail,
    finalize: {
      compactResult: o.ready.result,
      messagesToPreserve: [...o.ready.result.messagesToPreserve, ...tail],
      preCompactMessages: received,
      querySource: undefined,
      precomputed: true,
      manualPrecomputeReuse: "hit",
      precomputeTelemetry: {
        statusAtPTL: o.statusAtPTL === "ready" ? "ready" : "pending",
        leadMs: startTime - o.ready.startedAt,
        totalMs: o.ready.readyDurationMs,
        borrowed: false,
        messagesSinceTokens: roughTokenCountEstimationForMessages(tail),
        rehydrated: o.ready.rehydrated === true,
        ...(o.ready.armTrigger === "idle" && {
          armTrigger: "idle",
        }),
        headReordered: p.headReordered,
        displayOnlyLeftOutCount: p.displayOnlyLeftOutCount,
        earlyTailCount: p.earlyTailCount,
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
  let [t, s, cachedSystemContext] = await Promise.all([
    context.renderedSystemPrompt ?? getCacheSharingParams(context, forkContextMessages),
    getOrBuildUserContext(context.session, context.storageV5, context.credentials),
    getCachedSystemContext(context.session, context.options.cacheBreakerPhrase),
  ]);
  return {
    systemPrompt: t,
    userContext: s,
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
export { buildCompactCacheSafeParams };
