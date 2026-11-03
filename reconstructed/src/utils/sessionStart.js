/**
 * utils/sessionStart.ts
 *
 * SessionStart / Setup hooks 的执行与结果汇总。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStart.ts
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 13, fingerprint 2
 */
import { createAbortController } from "./abortController.js";
import { hq } from "./hooks/hookMessages.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  getRootSession,
  getRegisteredHooks,
  getMainThreadAgentType,
  stageResumeJournalSeed,
  getLastLiveMainThreadRequestAt,
  getLastMainThreadRequestAt,
} from "../bootstrap/state.js";
import {
  getHooksForEvent,
  executeSessionStartHooks,
  getNonBlockableHookErrorMessage,
  managedTierHooks,
  executeSetupHooks,
} from "./hooks.js";
import { nfcLower } from "./stringUtils.js";
import { hasMarketplaceAlias } from "./plugins/pluginIdentifier.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { sessionAccessTokenEnvForHooks } from "./hooks/hookSettingsSources.js";
import { shouldAllowManagedHooksOnly } from "./hooks/hooksConfigSnapshot.js";
import { isSafeMode } from "./envUtils.js";
import { getPolicyAllowedSet } from "./plugins/pluginPolicy.js";
import { logForDebugging, createAttachmentMessage_2 } from "./debug.js";
import { withDiagnosticsTiming } from "./diagLogs.js";
import { loadPluginHooks } from "./plugins/loadPluginHooks.js";
import { Qhi } from "./startupTiming.js";
import { tWe } from "./hooks/hookPolicyHold.js";
import { StreamClosedAbortError } from "./errors.js";
import { clearCommandsCache } from "../commands.js";
import { Jz } from "./plugins/pluginsChangedSignal.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { invalidateSessionEnvCache } from "./sessionEnvironment.js";
import { addWatchPaths, updateWatchPaths } from "./hooks/fileChangedWatcher.js";
import { createSessionStartContextAttachments } from "./messages.js";
import { use } from "../services/compact/autoCompact.js";
import { stageResumeKeepalive } from "../services/api/cacheKeepalive.js";
import {
  estimateCacheWriteCost,
  resolveMainThreadCacheTtl,
  getMainThreadCacheTtl,
  getMainThreadCacheTtlConfig,
} from "../services/api/promptCacheTtl.js";
import { getMainLoopModel } from "./model/model.js";
import { getCacheCreationTtl } from "../services/api/promptCacheBreakDetection.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { getTokenUsage } from "./tokens.js";
import { totalTokensOf } from "./messages/usageAndStopReason.js";
import { Lg } from "../services/tokenEstimation.js";

/**
 * 启动一次可中止的钩子执行：返回 Promise（失败时记录并给空列表）、放置位置与中止函数。
 */
//@ chunk-e6aww6q8.js:2077254-2077366 placement
function startHookRun(e, n) {
  let r = createAbortController();
  return { promise: n(r.signal).catch((s) => (hq(s), [])), placement: e, abort: () => r.abort() };
}
//@ chunk-e6aww6q8.js:2077366-2077542 placement
class SessionStartState {
  pendingInitialUserMessage = void 0;
  pendingHookSessionTitle = void 0;
  startSource = void 0;
  pluginsCovered = new Map();
  pluginsSucceeded = new Set();
  hooksDispatched = 0;
  hasDispatched = !1;
}
//@ chunk-e6aww6q8.js:2077542-2077570 placement
var psr = new SessionRootSlot(() => new SessionStartState());
//@ chunk-e6aww6q8.js:2077570-2077604 placement
function MTe() {
  return psr.of(getRootSession());
}
/**
 * 列出尚未运行 SessionStart 钩子的新插件，返回补跑所需的来源与筛选函数；没有则为 undefined。
 */
//@ chunk-e6aww6q8.js:2077604-2077859 placement
function owedSessionStartHooks() {
  let e = MTe();
  if (e.startSource === void 0) return;
  let filtered = getHooksForEvent("SessionStart").filter((r) => "pluginRoot" in r);
  return owedPluginHooks(e, filtered).owed.length === 0
    ? void 0
    : {
        source: e.startSource,
        newPluginsOnly: { owed: (r) => owedPluginHooks(e, r).owed, envFileIndexBase: e.hooksDispatched },
      };
}
/**
 * 找出未被覆盖的插件钩子（同名插件经市场别名已覆盖的视为已运行）。
 */
//@ chunk-e6aww6q8.js:2077859-2078459 placement
function owedPluginHooks({ pluginsCovered: pluginsCovered, pluginsSucceeded: pluginsSucceeded }, r) {
  let s = new Set(
      Object.values(getRegisteredHooks() ?? {}).flatMap((q) =>
        q.flatMap((Z) => ("pluginRoot" in Z ? nfcLower(Z.pluginId) : [])),
      ),
    ),
    list = Array.from(pluginsCovered, ([q, Z]) => ({ id: q, name: Z, folded: nfcLower(q) })),
    y = new Set(list.map((q) => q.folded)),
    S = new Set(Array.from(pluginsSucceeded, nfcLower)),
    w = [],
    L = new Map(),
    G = new Set();
  for (let q of r) {
    let { pluginId: pluginId } = q,
      Se = nfcLower(pluginId);
    if (y.has(Se) || L.has(Se)) continue;
    let ke = nfcLower(q.pluginName),
      found = list.find(
        (Ee) =>
          Ee.name === ke &&
          !s.has(Ee.folded) &&
          !S.has(Ee.folded) &&
          !G.has(Ee.folded) &&
          (hasMarketplaceAlias(Ee.id) || hasMarketplaceAlias(pluginId)),
      );
    if (found === void 0) {
      w.push(q);
      continue;
    }
    (L.set(Se, found.id), G.add(found.folded));
  }
  return { owed: w, stoodFor: L };
}
/**
 * 取出并清除 SessionStart 钩子提供的初始用户消息。
 */
//@ chunk-e6aww6q8.js:2078459-2078560 placement
function takePendingInitialUserMessage() {
  let e = MTe(),
    pendingInitialUserMessage = e.pendingInitialUserMessage;
  return ((e.pendingInitialUserMessage = void 0), pendingInitialUserMessage);
}
//@ chunk-e6aww6q8.js:2078560-2078657 placement
function PGt() {
  let e = MTe(),
    pendingHookSessionTitle = e.pendingHookSessionTitle;
  return ((e.pendingHookSessionTitle = void 0), pendingHookSessionTitle);
}
/**
 * 运行 SessionStart hooks（startup/resume/clear/compact），收集附加上下文与初始消息。
 */
//@ chunk-e6aww6q8.js:2078657-2081951 fingerprint = processSessionStartHooks (0.552)
async function processSessionStartHooks(
  e,
  n,
  {
    sessionId: r,
    sessionTitle: s,
    agentType: h,
    model: y,
    forceSyncExecution: S,
    resumedMessages: w,
    storageV5: L,
    credentials: G,
    signal: q,
    orphaned: Z,
    agentContext: Se,
    newPluginsOnly: ke,
    envFileSessionId: we,
    progress: Ee,
    holdHooksUntil: Ae,
  } = {},
) {
  let Ie = w !== void 0 ? resumeCacheStats(w, y, r, { credentials: G, storageV5: L }) : void 0;
  if (isCustomizationDisabled("hooks")) return [];
  if (Ae !== void 0) {
    if ((await Ae(), Z?.aborted)) return [];
  }
  let Me = MTe(),
    We = Ee?.rows ?? [],
    ze = Ee?.additionalContexts ?? [],
    lt = [],
    Je,
    nt = !1,
    pt =
      !Me.hasDispatched &&
      (n === "startup" || (n === "resume" && w?.length === 0)) &&
      Se === void 0 &&
      ke === void 0;
  Me.hasDispatched = !0;
  let Et = executeSessionStartHooks(
    e,
    n,
    r,
    s,
    h ?? getMainThreadAgentType(),
    y,
    q,
    void 0,
    S,
    Ie,
    Se,
    {
      newPluginsOnly: ke,
      envFileSessionId: we,
      launcherHookEnv: sessionAccessTokenEnvForHooks(pt),
      onMatched: (yt, gt) => {
        if (((Me.hooksDispatched += gt), n === "compact")) return;
        let At = ke ? [] : owedPluginHooks(Me, yt).stoodFor.values();
        for (let It of At) Me.pluginsSucceeded.add(It);
        for (let It of yt) Me.pluginsCovered.set(It.pluginId, nfcLower(It.pluginName));
      },
    },
    L,
    G,
  );
  if (shouldAllowManagedHooksOnly() && (isSafeMode() || getPolicyAllowedSet() === null))
    logForDebugging(
      isSafeMode()
        ? "Skipping plugin hooks - safe mode disables installed plugins (managed settings-file hooks still run; built-in plugins load regardless)"
        : "Skipping plugin hooks - allowManagedHooksOnly is enabled and no managed plugins",
    );
  else
    try {
      await withDiagnosticsTiming("load_plugin_hooks", () => loadPluginHooks(L));
    } catch (error) {
      let gt = error instanceof Error ? error.message : String(error),
        userGuidance = "";
      if (
        gt.includes("Failed to clone") ||
        gt.includes("network") ||
        gt.includes("ETIMEDOUT") ||
        gt.includes("ENOTFOUND")
      )
        userGuidance = "This appears to be a network issue. Check your internet connection and try again.";
      else if (gt.includes("Permission denied") || gt.includes("EACCES") || gt.includes("EPERM"))
        userGuidance = "This appears to be a permissions issue. Check file permissions on ~/.claude/plugins/";
      else if (gt.includes("Invalid") || gt.includes("parse") || gt.includes("JSON") || gt.includes("schema"))
        userGuidance =
          "This appears to be a configuration issue. Check your plugin settings in .claude/settings.json";
      else
        userGuidance =
          "Please fix the plugin configuration or remove problematic plugins from your settings.";
      logForDebugging(
        `Warning: Failed to load plugin hooks. SessionStart hooks from plugins will not execute. Error: ${gt}. ${userGuidance}`,
        { level: "error" },
      );
    }
  if (n === "startup" || n === "resume" || n === "fork") ((Me.startSource = n), Qhi(n));
  await tWe("SessionStart");
  try {
    for await (let yt of Et) {
      if (
        yt.message &&
        !(yt.message.type === "attachment" && yt.message.attachment.type === "hook_blocking_error")
      )
        We.push(yt.message);
      if (yt.blockingError)
        We.push(getNonBlockableHookErrorMessage("SessionStart", yt.blockingError, `SessionStart:${n}`));
      if (yt.additionalContexts && yt.additionalContexts.length > 0) ze.push(...yt.additionalContexts);
      if (yt.initialUserMessage)
        if (ke)
          logForDebugging(
            "Ignoring initialUserMessage from a SessionStart hook: its plugin loaded after the session started",
            { level: "warn" },
          );
        else if (Ee?.isOvertaken) Ee.lateInitialUserMessage = yt.initialUserMessage;
        else Me.pendingInitialUserMessage = yt.initialUserMessage;
      if (yt.sessionTitle) Je = yt.sessionTitle;
      if (yt.watchPaths && yt.watchPaths.length > 0) lt.push(...yt.watchPaths);
      if (yt.reloadSkills) nt = !0;
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("SessionStart hooks cancelled (control stream closed)");
  }
  if (q?.aborted || Z?.aborted) return We;
  if (nt) (clearCommandsCache(), Jz.emit(), logFeatureOk("hook_session_start_reload_skills"));
  if (
    ((Me.pendingHookSessionTitle = !ke && (n === "startup" || n === "resume" || n === "fork") ? Je : void 0),
    ke || we !== void 0)
  )
    invalidateSessionEnvCache();
  if (lt.length > 0)
    if (ke || Ee?.isOvertaken) addWatchPaths(lt);
    else updateWatchPaths(lt);
  return (We.push(...createSessionStartContextAttachments(ze)), We);
}
//@ chunk-e6aww6q8.js:2081951-2082032 placement
function t8s(e) {
  return ((e.isOvertaken = !0), [...e.rows, ...createSessionStartContextAttachments(e.additionalContexts)]);
}
/**
 * 是否需等待 SessionStart 钩子的原因：托管层钩子或托管插件策略。
 */
//@ chunk-e6aww6q8.js:2082032-2082189 placement
function sessionStartWaitReason() {
  let e = managedTierHooks("SessionStart");
  if (e !== "none") return e === "some" ? "managed_hooks" : "managed_hooks_unknown";
  return getPolicyAllowedSet() === null ? void 0 : "managed_plugins";
}
/**
 * 运行 Setup hooks（safe mode 下跳过插件 hooks）。
 */
//@ chunk-e6aww6q8.js:2082354-2083443 fingerprint = processSetupHooks (0.573)
async function processSetupHooks(e, n, { forceSyncExecution: r, storageV5: s, credentials: h } = {}) {
  if (isCustomizationDisabled("hooks")) return [];
  let y = [],
    S = [];
  if (shouldAllowManagedHooksOnly() && (isSafeMode() || getPolicyAllowedSet() === null))
    logForDebugging(
      isSafeMode()
        ? "Skipping plugin hooks - safe mode disables plugins (managed settings-file hooks still run)"
        : "Skipping plugin hooks - allowManagedHooksOnly is enabled and no managed plugins",
    );
  else
    try {
      await loadPluginHooks(s);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      logForDebugging(
        `Warning: Failed to load plugin hooks. Setup hooks from plugins will not execute. Error: ${errorMessage}`,
        { level: "warn" },
      );
    }
  await tWe("Setup");
  try {
    for await (let hookResult of executeSetupHooks(e, n, void 0, void 0, r, s, h)) {
      if (
        hookResult.message &&
        !(
          hookResult.message.type === "attachment" &&
          hookResult.message.attachment.type === "hook_blocking_error"
        )
      )
        y.push(hookResult.message);
      if (hookResult.blockingError)
        y.push(getNonBlockableHookErrorMessage("Setup", hookResult.blockingError, `Setup:${n}`));
      if (hookResult.additionalContexts && hookResult.additionalContexts.length > 0)
        S.push(...hookResult.additionalContexts);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("Setup hooks cancelled (control stream closed)");
  }
  if (S.length > 0) {
    let contextMessage = createAttachmentMessage_2({
      type: "hook_additional_context",
      content: S,
      hookName: "Setup",
      toolUseID: "Setup",
      hookEvent: "Setup",
    });
    y.push(contextMessage);
  }
  return y;
}
/**
 * 恢复会话时统计：距上次响应秒数、上下文 token、提示缓存是否可能过期与重写费用，并记录恢复日志种子。
 */
//@ chunk-e6aww6q8.js:2083443-2084306 placement
function resumeCacheStats(e, n, r, s) {
  let h = contextTokensOf(e),
    y = (Ee, Ae) => {
      stageResumeJournalSeed({ sessionId: r, contextTokens: h, requestAt: Ee, ttlMs: Ae });
    },
    S = use(e),
    w = S ? Date.parse(S.timestamp) : NaN;
  if (!S || Number.isNaN(w))
    return (
      y(null, null),
      stageResumeKeepalive(() => {
        return;
      }),
      {}
    );
  let max = Math.max(0, Math.round((Date.now() - w) / 1000)),
    G = hasPostCompactUsage(e),
    q = getLastLiveMainThreadRequestAt(),
    Z = estimateCacheWriteCost(
      n ?? S.message.model ?? getMainLoopModel(),
      h,
      G
        ? (getCacheCreationTtl(S.message.usage) ??
            (q !== null && q === getLastMainThreadRequestAt()
              ? resolveMainThreadCacheTtl()
              : getMainThreadCacheTtl()))
        : getMainThreadCacheTtl(),
    ),
    Se = Z.cache_ttl === "1h" ? 3600 : 300,
    ke = G ? w : NaN,
    we = Number.isNaN(ke) ? 1 / 0 : Math.max(0, Math.round((Date.now() - ke) / 1000));
  return (
    y(Number.isNaN(ke) ? null : ke, Number.isNaN(ke) ? null : Se * 1000),
    stageResumeKeepalive(() =>
      G && getCacheCreationTtl(S.message.usage) === "5m" && S.remoteSourced !== !0
        ? {
            sessionId: r,
            repliedAt: w,
            requestId: S.requestId,
            cacheTtlOf: getMainThreadCacheTtlConfig,
            clientOptions: { model: S.message.model, ...s },
          }
        : void 0,
    ),
    {
      seconds_since_last_response: max,
      context_tokens: h,
      prompt_cache_likely_expired: we >= Se,
      estimated_cache_write_usd: Z.estimated_cache_write_usd,
    }
  );
}
/**
 * 判断压缩边界之后是否有助手用量（或保留段锚点即边界）。
 */
//@ chunk-e6aww6q8.js:2084306-2084641 placement
function hasPostCompactUsage(e) {
  let lastIndex = e.findLastIndex(isCompactBoundaryMessage_3);
  if (lastIndex === -1) return !0;
  for (let y = e.length - 1; y > lastIndex; y--) {
    let S = e[y];
    if (S?.type !== "assistant") continue;
    let w = getTokenUsage(S);
    if (w && totalTokensOf(w) > 0) return !0;
  }
  let r = e[lastIndex];
  if (r === void 0 || !isCompactBoundaryMessage_3(r)) return !1;
  let compactMetadata = r.compactMetadata,
    h = compactMetadata?.preservedMessages?.anchorUuid ?? compactMetadata?.preservedSegment?.anchorUuid;
  return h !== void 0 && h === r.uuid;
}
/**
 * 估算当前上下文 token：取最近一次助手用量，否则取压缩边界的 postTokens 或估算。
 */
//@ chunk-e6aww6q8.js:2084641-2084912 placement
function contextTokensOf(e) {
  let lastIndex = e.findLastIndex(isCompactBoundaryMessage_3);
  for (let s = e.length - 1; s > lastIndex; s--) {
    let h = e[s];
    if (h?.type !== "assistant") continue;
    let y = getTokenUsage(h),
      S = y ? totalTokensOf(y) : 0;
    if (S > 0) return S;
  }
  let r = lastIndex === -1 ? void 0 : e[lastIndex];
  if (r !== void 0 && isCompactBoundaryMessage_3(r))
    return r.compactMetadata?.postTokens ?? Lg(e.slice(lastIndex + 1));
  return Lg(e);
}

export {
  startHookRun,
  processSessionStartHooks,
  PGt,
  contextTokensOf,
  takePendingInitialUserMessage,
  processSetupHooks,
  owedSessionStartHooks,
  sessionStartWaitReason,
  t8s,
};
