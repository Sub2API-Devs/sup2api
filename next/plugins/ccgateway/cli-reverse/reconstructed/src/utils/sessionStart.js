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
import { logHookExecutionFailure } from "./hooks/hookMessages.js";
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
import { markHooksInitSource } from "./startupTiming.js";
import { waitForStartHooksPolicyIfNeeded } from "./hooks/hookPolicyHold.js";
import { StreamClosedAbortError } from "./errors.js";
import { clearCommandsCache } from "../commands.js";
import { skillsChangedSignal } from "./plugins/pluginsChangedSignal.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { invalidateSessionEnvCache } from "./sessionEnvironment.js";
import { addWatchPaths, updateWatchPaths } from "./hooks/fileChangedWatcher.js";
import { createSessionStartContextAttachments } from "./messages.js";
import { findLastRealAssistantMessage } from "../services/compact/autoCompact.js";
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
import { roughTokenCountEstimationForMessages } from "../services/tokenEstimation.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2077254-2077366 placement
/**
 * 启动一次可中止的钩子执行：返回 Promise（失败时记录并给空列表）、放置位置与中止函数。
 */
function startHookRun(placement, run) {
  let abortController = createAbortController();
  return {
    promise: run(abortController.signal).catch((error) => {
      logHookExecutionFailure(error);
      return [];
    }),
    placement,
    abort: () => abortController.abort(),
  };
}
//@ chunk-e6aww6q8.js:2077366-2077542 placement
class SessionStartState {
  pendingInitialUserMessage = undefined;
  pendingHookSessionTitle = undefined;
  startSource = undefined;
  pluginsCovered = new Map();
  pluginsSucceeded = new Set();
  hooksDispatched = 0;
  hasDispatched = false;
}
//@ chunk-e6aww6q8.js:2077542-2077570 placement
var sessionStartStateSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:2077542", () => {
  sessionStartStateSlot = new SessionRootSlot(() => new SessionStartState());
});
//@ chunk-e6aww6q8.js:2077570-2077604 placement
function sessionStartState() {
  return sessionStartStateSlot.of(getRootSession());
}
//@ chunk-e6aww6q8.js:2077604-2077859 placement
/**
 * 列出尚未运行 SessionStart 钩子的新插件，返回补跑所需的来源与筛选函数；没有则为 undefined。
 */
function owedSessionStartHooks() {
  let state = sessionStartState();
  if (state.startSource === undefined) return;
  let hooks = getHooksForEvent("SessionStart").filter((hook) => "pluginRoot" in hook);
  return owedPluginHooks(state, hooks).owed.length === 0
    ? undefined
    : {
        source: state.startSource,
        newPluginsOnly: {
          owed: (hooks) => owedPluginHooks(state, hooks).owed,
          envFileIndexBase: state.hooksDispatched,
        },
      };
}
//@ chunk-e6aww6q8.js:2077859-2078459 placement
/**
 * 找出未被覆盖的插件钩子（同名插件经市场别名已覆盖的视为已运行）。
 */
function owedPluginHooks({ pluginsCovered, pluginsSucceeded }, hooks) {
  let registeredPluginIds = new Set(
    Object.values(getRegisteredHooks() ?? {}).flatMap((entry) =>
      entry.flatMap((hook) => ("pluginRoot" in hook ? nfcLower(hook.pluginId) : [])),
    ),
  );
  let list = Array.from(pluginsCovered, ([id, name]) => ({
    id,
    name,
    folded: nfcLower(id),
  }));
  let coveredIds = new Set(list.map((item) => item.folded));
  let succeededIds = new Set(Array.from(pluginsSucceeded, nfcLower));
  let owedHooks = [];
  let stoodForIds = new Map();
  let claimedIds = new Set();
  for (let hook of hooks) {
    let { pluginId } = hook;
    let foldedPluginId = nfcLower(pluginId);
    if (coveredIds.has(foldedPluginId) || stoodForIds.has(foldedPluginId)) continue;
    let pluginName = nfcLower(hook.pluginName);
    let found = list.find(
      (item) =>
        item.name === pluginName &&
        !registeredPluginIds.has(item.folded) &&
        !succeededIds.has(item.folded) &&
        !claimedIds.has(item.folded) &&
        (hasMarketplaceAlias(item.id) || hasMarketplaceAlias(pluginId)),
    );
    if (found === undefined) {
      owedHooks.push(hook);
      continue;
    }
    stoodForIds.set(foldedPluginId, found.id);
    claimedIds.add(found.folded);
  }
  return {
    owed: owedHooks,
    stoodFor: stoodForIds,
  };
}
//@ chunk-e6aww6q8.js:2078459-2078560 placement
/**
 * 取出并清除 SessionStart 钩子提供的初始用户消息。
 */
function takePendingInitialUserMessage() {
  let state = sessionStartState();
  let pendingInitialUserMessage = state.pendingInitialUserMessage;
  state.pendingInitialUserMessage = undefined;
  return pendingInitialUserMessage;
}
//@ chunk-e6aww6q8.js:2078560-2078657 placement
/**
 * takePendingHookSessionTitle：取待定的钩子会话标题。
 */
function takePendingHookSessionTitle() {
  let state = sessionStartState();
  let pendingHookSessionTitle = state.pendingHookSessionTitle;
  state.pendingHookSessionTitle = undefined;
  return pendingHookSessionTitle;
}
//@ chunk-e6aww6q8.js:2078657-2081951 fingerprint (2.1.88 match: processSessionStartHooks, 0.552)
/**
 * 运行 SessionStart hooks（startup/resume/clear/compact），收集附加上下文与初始消息。
 */
async function processSessionStartHooks(
  session,
  source,
  {
    sessionId,
    sessionTitle: title,
    agentType,
    model,
    forceSyncExecution,
    resumedMessages,
    storageV5,
    credentials,
    signal,
    orphaned: abortSignal,
    agentContext,
    newPluginsOnly,
    envFileSessionId,
    progress,
    holdHooksUntil,
  } = {},
) {
  let cacheStats =
    resumedMessages !== undefined
      ? resumeCacheStats(resumedMessages, model, sessionId, {
          credentials,
          storageV5,
        })
      : undefined;
  if (isCustomizationDisabled("hooks")) return [];
  if (holdHooksUntil !== undefined) {
    await holdHooksUntil();
    if (abortSignal?.aborted) return [];
  }
  let state = sessionStartState();
  let rows = progress?.rows ?? [];
  let additionalContexts = progress?.additionalContexts ?? [];
  let watchPaths = [];
  let sessionTitle;
  let reloadSkills = false;
  let launcherShaped =
    !state.hasDispatched &&
    (source === "startup" || (source === "resume" && resumedMessages?.length === 0)) &&
    agentContext === undefined &&
    newPluginsOnly === undefined;
  state.hasDispatched = true;
  let results = executeSessionStartHooks(
    session,
    source,
    sessionId,
    title,
    agentType ?? getMainThreadAgentType(),
    model,
    signal,
    undefined,
    forceSyncExecution,
    cacheStats,
    agentContext,
    {
      newPluginsOnly,
      envFileSessionId,
      launcherHookEnv: sessionAccessTokenEnvForHooks(launcherShaped),
      onMatched: (hooks, count) => {
        state.hooksDispatched += count;
        if (source === "compact") return;
        let stoodFor = newPluginsOnly ? [] : owedPluginHooks(state, hooks).stoodFor.values();
        for (let pluginId of stoodFor) state.pluginsSucceeded.add(pluginId);
        for (let hook of hooks) state.pluginsCovered.set(hook.pluginId, nfcLower(hook.pluginName));
      },
    },
    storageV5,
    credentials,
  );
  if (shouldAllowManagedHooksOnly() && (isSafeMode() || getPolicyAllowedSet() === null))
    logForDebugging(
      isSafeMode()
        ? "Skipping plugin hooks - safe mode disables installed plugins (managed settings-file hooks still run; built-in plugins load regardless)"
        : "Skipping plugin hooks - allowManagedHooksOnly is enabled and no managed plugins",
    );
  else
    try {
      await withDiagnosticsTiming("load_plugin_hooks", () => loadPluginHooks(storageV5));
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      let userGuidance = "";
      if (
        errorMessage.includes("Failed to clone") ||
        errorMessage.includes("network") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ENOTFOUND")
      )
        userGuidance = "This appears to be a network issue. Check your internet connection and try again.";
      else if (
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("EACCES") ||
        errorMessage.includes("EPERM")
      )
        userGuidance = "This appears to be a permissions issue. Check file permissions on ~/.claude/plugins/";
      else if (
        errorMessage.includes("Invalid") ||
        errorMessage.includes("parse") ||
        errorMessage.includes("JSON") ||
        errorMessage.includes("schema")
      )
        userGuidance =
          "This appears to be a configuration issue. Check your plugin settings in .claude/settings.json";
      else
        userGuidance =
          "Please fix the plugin configuration or remove problematic plugins from your settings.";
      logForDebugging(
        `Warning: Failed to load plugin hooks. SessionStart hooks from plugins will not execute. Error: ${errorMessage}. ${userGuidance}`,
        {
          level: "error",
        },
      );
    }
  if (source === "startup" || source === "resume" || source === "fork") {
    state.startSource = source;
    markHooksInitSource(source);
  }
  await waitForStartHooksPolicyIfNeeded("SessionStart");
  try {
    for await (let result of results) {
      if (
        result.message &&
        !(result.message.type === "attachment" && result.message.attachment.type === "hook_blocking_error")
      )
        rows.push(result.message);
      if (result.blockingError)
        rows.push(
          getNonBlockableHookErrorMessage("SessionStart", result.blockingError, `SessionStart:${source}`),
        );
      if (result.additionalContexts && result.additionalContexts.length > 0)
        additionalContexts.push(...result.additionalContexts);
      if (result.initialUserMessage)
        if (newPluginsOnly)
          logForDebugging(
            "Ignoring initialUserMessage from a SessionStart hook: its plugin loaded after the session started",
            {
              level: "warn",
            },
          );
        else if (progress?.isOvertaken) progress.lateInitialUserMessage = result.initialUserMessage;
        else state.pendingInitialUserMessage = result.initialUserMessage;
      if (result.sessionTitle) sessionTitle = result.sessionTitle;
      if (result.watchPaths && result.watchPaths.length > 0) watchPaths.push(...result.watchPaths);
      if (result.reloadSkills) reloadSkills = true;
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("SessionStart hooks cancelled (control stream closed)");
  }
  if (signal?.aborted || abortSignal?.aborted) return rows;
  if (reloadSkills) {
    clearCommandsCache();
    skillsChangedSignal.emit();
    logFeatureOk("hook_session_start_reload_skills");
  }
  state.pendingHookSessionTitle =
    !newPluginsOnly && (source === "startup" || source === "resume" || source === "fork")
      ? sessionTitle
      : undefined;
  if (newPluginsOnly || envFileSessionId !== undefined) invalidateSessionEnvCache();
  if (watchPaths.length > 0)
    if (newPluginsOnly || progress?.isOvertaken) addWatchPaths(watchPaths);
    else updateWatchPaths(watchPaths);
  rows.push(...createSessionStartContextAttachments(additionalContexts));
  return rows;
}
//@ chunk-e6aww6q8.js:2081951-2082032 placement
/**
 * overtakeSessionStart：接管会话启动上下文。
 */
function overtakeSessionStart(progress) {
  progress.isOvertaken = true;
  return [...progress.rows, ...createSessionStartContextAttachments(progress.additionalContexts)];
}
//@ chunk-e6aww6q8.js:2082032-2082189 placement
/**
 * 是否需等待 SessionStart 钩子的原因：托管层钩子或托管插件策略。
 */
function sessionStartWaitReason() {
  let managed = managedTierHooks("SessionStart");
  if (managed !== "none") return managed === "some" ? "managed_hooks" : "managed_hooks_unknown";
  return getPolicyAllowedSet() === null ? undefined : "managed_plugins";
}
//@ chunk-e6aww6q8.js:2082354-2083443 fingerprint (2.1.88 match: processSetupHooks, 0.573)
/**
 * 运行 Setup hooks（safe mode 下跳过插件 hooks）。
 */
async function processSetupHooks(trigger, trigger_2, { forceSyncExecution, storageV5, credentials } = {}) {
  if (isCustomizationDisabled("hooks")) return [];
  let hookMessages = [];
  let additionalContexts = [];
  if (shouldAllowManagedHooksOnly() && (isSafeMode() || getPolicyAllowedSet() === null))
    logForDebugging(
      isSafeMode()
        ? "Skipping plugin hooks - safe mode disables plugins (managed settings-file hooks still run)"
        : "Skipping plugin hooks - allowManagedHooksOnly is enabled and no managed plugins",
    );
  else
    try {
      await loadPluginHooks(storageV5);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      logForDebugging(
        `Warning: Failed to load plugin hooks. Setup hooks from plugins will not execute. Error: ${errorMessage}`,
        {
          level: "warn",
        },
      );
    }
  await waitForStartHooksPolicyIfNeeded("Setup");
  try {
    for await (let hookResult of executeSetupHooks(
      trigger,
      trigger_2,
      undefined,
      undefined,
      forceSyncExecution,
      storageV5,
      credentials,
    )) {
      if (
        hookResult.message &&
        !(
          hookResult.message.type === "attachment" &&
          hookResult.message.attachment.type === "hook_blocking_error"
        )
      )
        hookMessages.push(hookResult.message);
      if (hookResult.blockingError)
        hookMessages.push(
          getNonBlockableHookErrorMessage("Setup", hookResult.blockingError, `Setup:${trigger_2}`),
        );
      if (hookResult.additionalContexts && hookResult.additionalContexts.length > 0)
        additionalContexts.push(...hookResult.additionalContexts);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("Setup hooks cancelled (control stream closed)");
  }
  if (additionalContexts.length > 0) {
    let contextMessage = createAttachmentMessage_2({
      type: "hook_additional_context",
      content: additionalContexts,
      hookName: "Setup",
      toolUseID: "Setup",
      hookEvent: "Setup",
    });
    hookMessages.push(contextMessage);
  }
  return hookMessages;
}
//@ chunk-e6aww6q8.js:2083443-2084306 placement
/**
 * 恢复会话时统计：距上次响应秒数、上下文 token、提示缓存是否可能过期与重写费用，并记录恢复日志种子。
 */
function resumeCacheStats(messages, model, sessionId, options) {
  let contextTokens = contextTokensOf(messages);
  let stageSeed = (requestAt, ttlMs) => {
    stageResumeJournalSeed({
      sessionId,
      contextTokens,
      requestAt,
      ttlMs,
    });
  };
  let lastRealAssistantMessage = findLastRealAssistantMessage(messages);
  let lastReplyAt = lastRealAssistantMessage ? Date.parse(lastRealAssistantMessage.timestamp) : NaN;
  if (!lastRealAssistantMessage || Number.isNaN(lastReplyAt)) {
    stageSeed(null, null);
    stageResumeKeepalive(() => {
      return;
    });
    return {};
  }
  let secondsSinceLastResponse = Math.max(0, Math.round((Date.now() - lastReplyAt) / 1000));
  let postCompact = hasPostCompactUsage(messages);
  let lastLiveMainThreadRequestAt = getLastLiveMainThreadRequestAt();
  let writeCost = estimateCacheWriteCost(
    model ?? lastRealAssistantMessage.message.model ?? getMainLoopModel(),
    contextTokens,
    postCompact
      ? (getCacheCreationTtl(lastRealAssistantMessage.message.usage) ??
          (lastLiveMainThreadRequestAt !== null &&
          lastLiveMainThreadRequestAt === getLastMainThreadRequestAt()
            ? resolveMainThreadCacheTtl()
            : getMainThreadCacheTtl()))
      : getMainThreadCacheTtl(),
  );
  let ttlSeconds = writeCost.cache_ttl === "1h" ? 3600 : 300;
  let cacheAnchorAt = postCompact ? lastReplyAt : NaN;
  let sinceAnchorSeconds = Number.isNaN(cacheAnchorAt)
    ? 1 / 0
    : Math.max(0, Math.round((Date.now() - cacheAnchorAt) / 1000));
  stageSeed(
    Number.isNaN(cacheAnchorAt) ? null : cacheAnchorAt,
    Number.isNaN(cacheAnchorAt) ? null : ttlSeconds * 1000,
  );
  stageResumeKeepalive(() =>
    postCompact &&
    getCacheCreationTtl(lastRealAssistantMessage.message.usage) === "5m" &&
    lastRealAssistantMessage.remoteSourced !== true
      ? {
          sessionId,
          repliedAt: lastReplyAt,
          requestId: lastRealAssistantMessage.requestId,
          cacheTtlOf: getMainThreadCacheTtlConfig,
          clientOptions: {
            model: lastRealAssistantMessage.message.model,
            ...options,
          },
        }
      : undefined,
  );
  return {
    seconds_since_last_response: secondsSinceLastResponse,
    context_tokens: contextTokens,
    prompt_cache_likely_expired: sinceAnchorSeconds >= ttlSeconds,
    estimated_cache_write_usd: writeCost.estimated_cache_write_usd,
  };
}
//@ chunk-e6aww6q8.js:2084306-2084641 placement
/**
 * 判断压缩边界之后是否有助手用量（或保留段锚点即边界）。
 */
function hasPostCompactUsage(messages) {
  let lastIndex = messages.findLastIndex(isCompactBoundaryMessage_3);
  if (lastIndex === -1) return true;
  for (let idx = messages.length - 1; idx > lastIndex; idx--) {
    let message = messages[idx];
    if (message?.type !== "assistant") continue;
    let tokenUsage = getTokenUsage(message);
    if (tokenUsage && totalTokensOf(tokenUsage) > 0) return true;
  }
  let boundary = messages[lastIndex];
  if (boundary === undefined || !isCompactBoundaryMessage_3(boundary)) return false;
  let compactMetadata = boundary.compactMetadata;
  let anchorUuid =
    compactMetadata?.preservedMessages?.anchorUuid ?? compactMetadata?.preservedSegment?.anchorUuid;
  return anchorUuid !== undefined && anchorUuid === boundary.uuid;
}
//@ chunk-e6aww6q8.js:2084641-2084912 placement
/**
 * 估算当前上下文 token：取最近一次助手用量，否则取压缩边界的 postTokens 或估算。
 */
function contextTokensOf(messages) {
  let lastIndex = messages.findLastIndex(isCompactBoundaryMessage_3);
  for (let idx = messages.length - 1; idx > lastIndex; idx--) {
    let message = messages[idx];
    if (message?.type !== "assistant") continue;
    let tokenUsage = getTokenUsage(message);
    let total = tokenUsage ? totalTokensOf(tokenUsage) : 0;
    if (total > 0) return total;
  }
  let boundary = lastIndex === -1 ? undefined : messages[lastIndex];
  if (boundary !== undefined && isCompactBoundaryMessage_3(boundary))
    return (
      boundary.compactMetadata?.postTokens ??
      roughTokenCountEstimationForMessages(messages.slice(lastIndex + 1))
    );
  return roughTokenCountEstimationForMessages(messages);
}
export {
  startHookRun,
  processSessionStartHooks,
  takePendingHookSessionTitle,
  contextTokensOf,
  takePendingInitialUserMessage,
  processSetupHooks,
  owedSessionStartHooks,
  sessionStartWaitReason,
  overtakeSessionStart,
};
