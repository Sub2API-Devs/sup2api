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
import { Us, isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import {
  NO_MESSAGES_TO_COMPACT,
  COMPACT_ERROR_PREFIX,
  COMPACT_FAILED_CONTEXT_LIMIT,
  COMPACT_FAILED_MEDIA_LIMIT,
} from "../../services/compact/compactErrors.js";
import { logError } from "../../utils/log.js";
import { getLastMainRequestId } from "../../bootstrap/state.js";
import { Lg } from "../../services/tokenEstimation.js";
import { executePreCompactHooks } from "../../utils/hooks.js";
import { logForDebugging } from "../../utils/debug.js";
import { tryReactiveCompact } from "../../services/compact/reactiveCompact.js";
import { API_REQUEST_ABORTED_MESSAGE } from "../../utils/messages.js";
import {
  getTokenCountFromUsage_3,
  dispatchSessionCompactHooks,
  W1r,
} from "../../plugins/functionHooks/sessionCompactHook.js";
import { cleanupAfterCompaction } from "../../services/compact/postCompactCleanup.js";
import { suppressCompactWarning } from "../../services/compact/compactWarningState.js";
import { invalidateUserContext, getOrBuildUserContext, getCachedSystemContext } from "../../context.js";
import { logCompactionEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import {
  loadPrecomputedCompact,
  awaitInflightPrecompute,
  logManualPrecomputeConsumed,
  Nmn,
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
import { u6 } from "../../utils/systemPrompt.js";

/**
 * /compact 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-vrrvwm85.js:12092-12311 placement = buildMagicDocsUpdatePrompt (0.349)
var runCompactCommand = async (args, context) => {
  let i = await call(context, { customInstructions: args });
  if (i.type !== "skipped") return i;
  return i.reason.startsWith(COMPACTION_BLOCKED_BY_HOOK)
    ? { type: "text", value: i.reason, level: "error" }
    : { type: "text", value: `Not compacted \xB7 ${i.reason}` };
};
//@ chunk-vrrvwm85.js:12311-13047 placement
async function call(
  args,
  {
    customInstructions: customInstructions,
    mainThreadAgentDefinition: mainThreadAgentDefinition,
    trigger: trigger = "manual",
    origin: origin,
  },
) {
  let { abortController: abortController } = args,
    { messages: messages } = args;
  if (args.getAppState().endedByModel)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue."),
      "Claude ended this conversation",
    );
  if (((messages = Us(messages)), messages.length === 0)) throw Error(NO_MESSAGES_TO_COMPACT);
  let customInstructions_2 = customInstructions.trim();
  try {
    return await compactViaReactive(messages, args, {
      customInstructions: customInstructions_2,
      mainThreadAgentDefinition: mainThreadAgentDefinition,
      trigger: trigger,
      origin: origin ?? args.hookOrigin,
    });
  } catch (error) {
    if (abortController.signal.aborted) throw new AbortError("Compaction canceled.");
    else if (hasExactErrorMessage(error, ERROR_MESSAGE_NOT_ENOUGH_MESSAGES))
      return { type: "text", value: ERROR_MESSAGE_NOT_ENOUGH_MESSAGES };
    else if (error instanceof CompactionError) return { type: "text", value: error.message, level: "error" };
    else
      throw (
        logError(error),
        Error(`${COMPACT_ERROR_PREFIX}${error instanceof Error ? error.message : String(error)}`, {
          cause: error,
        })
      );
  }
}
//@ chunk-vrrvwm85.js:13047-16941 fingerprint = compactViaReactive (0.389)
async function compactViaReactive(
  r,
  e,
  {
    customInstructions: customInstructions,
    mainThreadAgentDefinition: mainThreadAgentDefinition,
    trigger: trigger,
    origin: origin,
  },
) {
  let n = trigger === "auto" ? "auto" : "manual";
  (e.onCompactEvent?.({ type: "compact_progress", event: { type: "hooks_start", hookType: "pre_compact" } }),
    e.onCompactEvent?.({ type: "sdk_status", status: "compacting" }));
  let startTime = performance.now(),
    s = getLastMainRequestId(),
    m,
    E = Lg(r),
    p,
    R,
    T,
    v = async (a, u) => {
      let [k, S] = await Promise.all([
        executePreCompactHooks(
          e.session,
          { trigger: n, customInstructions: u || null },
          e,
          e.abortController.signal,
        ),
        buildCompactCacheSafeParams({
          toolUseContext: e,
          forkContextMessages: a,
          mainThreadAgentDefinition: mainThreadAgentDefinition,
        }),
      ]);
      if (((T = S), k.blockedBy))
        return (
          logForDebugging(`Compaction blocked by PreCompact hook: ${k.blockedBy}`, { level: "warn" }),
          e.onQueryEvent?.({
            type: "notification",
            notification: {
              key: "compaction-blocked-by-hook",
              text: "compaction blocked by PreCompact hook",
              priority: "immediate",
              color: "warning",
            },
          }),
          { skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${k.blockedBy}` }
        );
      let mergedInstructions = mergeHookInstructions(u, k.newCustomInstructions);
      (e.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
        e.onQueryEvent?.({ type: "response_length", op: "reset" }),
        e.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_start" } }));
      let c = await tryReusePrecomputedCompaction(e, u ?? "", k.newCustomInstructions, {
        sent: r,
        received: a,
      });
      if (((R = c.reuse), c.hit && c.replacement !== void 0)) {
        let h = [...c.replacement, ...c.since];
        return { messages: h, tokensBefore: E, record: { kind: "replacement", messages: h } };
      }
      let g = await (
        c.hit
          ? buildReactiveCompactionResult({
              ...c.finalize,
              trigger: n,
              compactionKind: n,
              startTime: startTime,
              cacheSafeParams: S,
              mainChainTailAtStart: s,
            })
          : tryReactiveCompact(a, S, {
              customInstructions: mergedInstructions,
              trigger: n,
              compactionKind: n,
              manualPrecomputeReuse: c.reuse,
              userWaitStartedAt: startTime,
              precomputedKind: c.precomputedKind,
              precomputedFailureCause: c.precomputedFailureCause,
              onResponseLength: (h) => e.onQueryEvent?.(h),
            })
      ).catch((h) => (logError(h), { ok: !1, reason: "error", detail: errorMessage(h) }));
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
      let boundaryMarker = g.result.boundaryMarker,
        P = isCompactBoundaryMessage(boundaryMarker) ? boundaryMarker.compactMetadata : void 0;
      return {
        messages: buildPostCompactMessages(g.result),
        tokensBefore: P?.preTokens,
        tokensAfter: P?.postTokens,
        usage: getTokenCountFromUsage_3(g.result.compactionUsage),
        record: { kind: "compacted", compactionResult: g.result, hookDisplay: k.userDisplayMessage },
      };
    };
  try {
    let a = await dispatchSessionCompactHooks({
      trigger: trigger,
      instructions: customInstructions || void 0,
      messages: r,
      isIsolated: !1,
      origin: origin,
      signal: e.abortController.signal,
      compact: v,
    });
    if (a.kind === "skipped") return ((m = `skipped: ${a.reason}`), { type: "skipped", reason: a.reason });
    let record = a.record,
      k =
        T ??
        (await buildCompactCacheSafeParams({
          toolUseContext: e,
          forkContextMessages: r,
          mainThreadAgentDefinition: mainThreadAgentDefinition,
        })),
      S =
        a.kind === "replaced"
          ? a.messages
          : a.record.kind === "replacement"
            ? W1r(a.record.messages)
            : void 0,
      _ =
        S === void 0 && record?.kind === "compacted"
          ? record.compactionResult
          : await runCompactHooks({
              replacement: S ?? [],
              preCompactMessages: r,
              cacheSafeParams: k,
              querySource: void 0,
              trigger: n,
              startTime: startTime,
              coreBoundary: record?.kind === "compacted" ? record.compactionResult.boundaryMarker : void 0,
              compactionKind: n,
              mainChainTailAtStart: s,
              precomputed: record?.kind === "replacement",
            }),
      c = record?.kind === "compacted" ? record.hookDisplay : void 0,
      boundaryMarker = _.boundaryMarker;
    if (isCompactBoundaryMessage(boundaryMarker)) p = boundaryMarker.compactMetadata.postTokens;
    (cleanupAfterCompaction(e.session, void 0, e.setAppState, void 0, void 0, e.storageV5),
      suppressCompactWarning(),
      invalidateUserContext(e.session, "compaction"));
    let w =
      [c, _.userDisplayMessage].filter(Boolean).join(`
`) || void 0;
    return {
      type: "compact",
      compactionResult: { ..._, userDisplayMessage: w },
      ...buildDisplayText(e.options.verbose, w),
      displayRepeatsSummary: _.userDisplayMessage !== void 0,
      result: { ...a.result, ...(p !== void 0 && { tokensAfter: p }) },
    };
  } catch (error) {
    throw ((m = error instanceof Error ? error.message : "reactive compaction failed"), error);
  } finally {
    (e.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      e.onQueryEvent?.({ type: "response_length", op: "reset" }),
      e.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_end" } }),
      logCompactionEvent(
        {
          trigger: n,
          success: !m,
          durationMs: performance.now() - startTime,
          preTokens: E,
          postTokens: p,
          error: m,
          precomputeReuse: R,
        },
        e.agentContext,
      ),
      e.onCompactEvent?.({
        type: "sdk_status",
        status: null,
        metadata: { compactResult: m ? "failed" : "success", ...(m && { compactError: m }) },
      }));
  }
}
/**
 * tryReusePrecomputedCompaction：命中 session.precompute 的预计算摘要则复用。
 */
//@ chunk-vrrvwm85.js:16941-18671 layout
async function tryReusePrecomputedCompaction(r, e, i, { sent: sent, received: received }) {
  if (e) return { hit: !1, reuse: "miss_custom_instructions" };
  if (i) return { hit: !1, reuse: "miss_hook" };
  let { precompute: precompute } = r.session;
  loadPrecomputedCompact(
    precompute,
    "main",
    r.options.querySource,
    sent,
    r.options.mainLoopModel,
    r.storageV5,
  );
  let startTime = performance.now(),
    o = await awaitInflightPrecompute(precompute, void 0, r.abortController.signal, r.storageV5),
    s = performance.now() - startTime;
  if (o === null)
    return (
      logManualPrecomputeConsumed("none", o, s),
      { hit: !1, reuse: "miss_not_ready", precomputedKind: "none" }
    );
  if (o.kind === "turn_aborted")
    throw (logManualPrecomputeConsumed("aborted", o, s), Error(API_REQUEST_ABORTED_MESSAGE));
  if (o.kind === "failed")
    return (
      logManualPrecomputeConsumed("failed", o, s),
      {
        hit: !1,
        reuse: "miss_not_ready",
        precomputedKind: "failed",
        precomputedFailureCause: o.failure.cause,
      }
    );
  let m = Nmn(sent),
    E = m && Nmn(received),
    p =
      m === void 0 || E === void 0
        ? { kind: "refuse", reason: "rows_unreadable" }
        : checkPrecomputeCoverage(
            o.ready,
            { sent: m, received: E },
            r.options.mainLoopModel,
            r.options.autoCompactWindow,
          );
  if (p.kind === "refuse")
    return (
      logManualPrecomputeConsumed("none", o, s),
      logPrecomputeDiscarded(o.ready, p.reason, void 0, p.reason === "would_not_fit" ? p.sizes : void 0),
      { hit: !1, reuse: "miss_not_ready", precomputedKind: "none" }
    );
  let tail = p.tail;
  return (
    logManualPrecomputeApplied(o, s, { messages: sent, mainLoopModel: r.options.mainLoopModel }, p.sizes),
    {
      hit: !0,
      reuse: "hit",
      ...(o.ready.replacement && { replacement: o.ready.result.messagesToPreserve }),
      since: tail,
      finalize: {
        compactResult: o.ready.result,
        messagesToPreserve: [...o.ready.result.messagesToPreserve, ...tail],
        preCompactMessages: received,
        querySource: void 0,
        precomputed: !0,
        manualPrecomputeReuse: "hit",
        precomputeTelemetry: {
          statusAtPTL: o.statusAtPTL === "ready" ? "ready" : "pending",
          leadMs: startTime - o.ready.startedAt,
          totalMs: o.ready.readyDurationMs,
          borrowed: !1,
          messagesSinceTokens: Lg(tail),
          rehydrated: o.ready.rehydrated === !0,
          ...(o.ready.armTrigger === "idle" && { armTrigger: "idle" }),
          headReordered: p.headReordered,
          displayOnlyLeftOutCount: p.displayOnlyLeftOutCount,
          earlyTailCount: p.earlyTailCount,
        },
      },
    }
  );
}
//@ chunk-vrrvwm85.js:18671-18900 fingerprint = buildDisplayText (0.9)
function buildDisplayText(context, userDisplayMessage) {
  let upgradeMessage = getUpgradeMessage("tip"),
    expandShortcut = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    dimmed = [
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
/**
 * 组装压缩用的缓存安全参数：优先复用同模型最近一次的 system/user/system context，否则重新构建。
 */
//@ chunk-p5wtay00.js:312-598 placement
async function buildCompactCacheSafeParams({
  toolUseContext: toolUseContext,
  forkContextMessages: forkContextMessages,
  mainThreadAgentDefinition: mainThreadAgentDefinition,
}) {
  let {
    systemPrompt: systemPrompt,
    userContext: userContext,
    systemContext: systemContext,
  } = getLastCacheSafeParamsForSameModel() ??
  (await buildCacheSafePromptParts(toolUseContext, mainThreadAgentDefinition));
  return {
    systemPrompt: systemPrompt,
    userContext: userContext,
    systemContext: systemContext,
    toolUseContext: toolUseContext,
    forkContextMessages: forkContextMessages,
    advisorModel: toolUseContext.getAdvisorSetting(),
  };
}
/**
 * 并行生成 system prompt、user context 与 system context。
 */
//@ chunk-p5wtay00.js:598-819 placement
async function buildCacheSafePromptParts(e, o) {
  let [t, s, m] = await Promise.all([
    e.renderedSystemPrompt ?? getCacheSharingParams(e, o),
    getOrBuildUserContext(e.session, e.storageV5, e.credentials),
    getCachedSystemContext(e.session, e.options.cacheBreakerPhrase),
  ]);
  return { systemPrompt: t, userContext: s, systemContext: m };
}
//@ chunk-p5wtay00.js:819-1123 fingerprint = getCacheSharingParams (0.585)
async function getCacheSharingParams(context, forkContextMessages) {
  let systemPrompt = getToolPermissionContext(context),
    s = await getSystemPrompt(
      context.options.tools,
      getRuntimeMainLoopModel({
        permissionMode: systemPrompt.mode,
        mainLoopModel: context.options.mainLoopModel,
      }),
    );
  return u6({
    mainThreadAgentDefinition: forkContextMessages,
    toolUseContext: context,
    customSystemPrompt: context.options.customSystemPrompt,
    defaultSystemPrompt: s,
    appendSystemPrompt: context.options.appendSystemPrompt,
  });
}

export { buildCompactCacheSafeParams };
