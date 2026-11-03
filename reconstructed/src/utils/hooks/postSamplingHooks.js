/**
 * utils/hooks/postSamplingHooks.ts
 *
 * 并入已有模块：选择下一个模型回退阶段；统计排队提交的类型与等待时间等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/postSamplingHooks.ts
 * pieces: chunk-ha3km179.js (19)
 * attribution: placement 18, fingerprint 1
 */
import { collapseSmallPastedBlocks, formatImageRef, logEntryToHistoryEntry } from "../../history.js";
import { logError } from "../log.js";
import { isProjectsRelay } from "../messageProvenance.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { getRuntimeMainLoopModel } from "../model/planModeModel.js";
import { getDefaultMainLoopModel } from "../model/modelFallback.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { toError } from "../errors.js";

//@ chunk-ha3km179.js:54310-54505 placement
/**
 * 把小粘贴块展开后重建提交内容。
 */
function withExpandedPastes(entry, n) {
  let r = collapseSmallPastedBlocks(n);
  let s = {};
  for (let pastedContent of Object.values(entry.pastedContents)) {
    let included = r.text.includes(formatImageRef(pastedContent.id));
    if (pastedContent.type === "image" && included) s[pastedContent.id] = pastedContent;
  }
  return logEntryToHistoryEntry(entry, r.text, {
    ...s,
    ...r.pastedContents,
  });
}
//@ chunk-ha3km179.js:54505-54550 placement
/**
 * 上报排队提交统计（异常吞掉）。
 */
function reportQueuedSubmissions(e, n) {
  try {
    reportQueuedSubmissionsUnsafe(e, n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:54550-55130 placement
/**
 * 统计排队提交的类型与等待时间。
 */
function reportQueuedSubmissionsUnsafe(e, n) {
  let filtered = e.filter((w) => w.pollEmptyDispatch !== true);
  if (filtered.length === 0) return;
  let now = Date.now();
  let h = now;
  let y = 0;
  let S = 0;
  let M = 0;
  let R = 0;
  let monitorEventChars = 0;
  for (let w of filtered) {
    if (w.mode === "prompt") y++;
    if (w.artifactCommentTurn !== undefined) M++;
    if (w.monitorEvent !== undefined) {
      R++;
      monitorEventChars += typeof w.value === "string" ? w.value.length : 0;
    }
    if (isProjectsRelay(w.origin) && w.hearthRelayMessageIds !== undefined) S++;
    let P = w.timestamp ? Date.parse(w.timestamp) : Number.NaN;
    if (P < h) h = P;
  }
  logFeatureOk("queued_message_delivered", {
    delivery: fromEnum(n),
    command_count: filtered.length,
    prompt_count: y,
    relay_count: S,
    artifact_comment_count: M,
    monitor_event_count: R,
    monitor_event_chars: monitorEventChars,
    wait_ms: now - h,
  });
}
//@ chunk-ha3km179.js:55130-55162 placement
function canonicalModelName(e) {
  return getCanonicalName(parseUserSpecifiedModel(e));
}
//@ chunk-ha3km179.js:55162-55416 placement
/**
 * 判断当前主循环模型是否为自动模式模型或默认模型（用于回退提示）。
 */
function automaticModelFallbackInfo({ userModel, permissionMode, exceeds200kTokens, automaticModels }) {
  let runtimeMainLoopModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: userModel,
    exceeds200kTokens,
  });
  let y = canonicalModelName(runtimeMainLoopModel);
  for (let automaticModel of automaticModels)
    if (automaticModel && canonicalModelName(automaticModel) === y) return {};
  let defaultMainLoopModel = getDefaultMainLoopModel();
  return {
    isDefaultModel: canonicalModelName(defaultMainLoopModel) === y,
    defaultModel: defaultMainLoopModel,
  };
}
//@ chunk-ha3km179.js:55416-55473 placement
/**
 * 初始的"拒绝回退"回合状态（未进入、无游标、无待发通知）。
 */
var INITIAL_REJECTION_EPISODE = {
  inEpisode: false,
  cursor: undefined,
  pendingNotice: undefined,
};
//@ chunk-ha3km179.js:55473-56111 placement
/**
 * 选择下一个模型回退阶段。
 */
function nextFallbackStage(refusalCascadeState, attemptModel, refusalCascadeResolver) {
  let cursor = refusalCascadeState.cursor;
  if (cursor === undefined)
    return {
      armTarget: undefined,
      hop: undefined,
      state: refusalCascadeState,
    };
  let h = refusalCascadeResolver.firstReachableStage(cursor.remaining, (S) =>
    refusalCascadeResolver.resolveStage(S, attemptModel, cursor.triedModels),
  );
  refusalCascadeResolver.logSkippedStages({
    stages: h?.skippedStages ?? cursor.remaining,
    chainLength: cursor.chainLength,
    firstStageIndex: cursor.chainLength - cursor.remaining.length + 1,
    model: attemptModel,
    armedFallbackModel: undefined,
    apiRefusalCategory: cursor.triggerCategory,
    requestId: cursor.triggerRequestId,
  });
  let cursor_2 =
    h !== undefined && h.remainingChain.length > 0
      ? {
          ...cursor,
          remaining: h.remainingChain,
          nextHopIndex: cursor.nextHopIndex + 1,
        }
      : undefined;
  return {
    armTarget: h?.model,
    hop:
      h === undefined
        ? undefined
        : {
            index: cursor.nextHopIndex,
            length: cursor.chainLength,
          },
    state: {
      ...refusalCascadeState,
      cursor: cursor_2,
    },
  };
}
//@ chunk-ha3km179.js:56111-56158 placement
/**
 * 判断该次路由是否为链式（fallback chain）。
 */
function isChainRouteMatch(e) {
  return e.routeMatched === "chain";
}
//@ chunk-ha3km179.js:56158-56727 placement
/**
 * 记录模型回退尝试。
 */
function recordFallbackAttempt(refusalCascadeState, event, switchModelsOnFlagSetting, canonicalModelKey) {
  if (isChainRouteMatch(event))
    return refusalCascadeState.cursor === undefined
      ? {
          ...refusalCascadeState,
          inEpisode: true,
        }
      : {
          ...refusalCascadeState,
          inEpisode: true,
          cursor: {
            ...refusalCascadeState.cursor,
            triedModels: [...refusalCascadeState.cursor.triedModels, canonicalModelKey(event.fallbackModel)],
            triggerRequestId: event.requestId ?? undefined,
            triggerCategory: event.apiRefusalCategory ?? undefined,
          },
        };
  let h = switchModelsOnFlagSetting ? (event.remainingChain ?? []) : [];
  let cursor =
    h.length > 0 && event.cascadeChainLength !== undefined
      ? {
          remaining: h,
          chainLength: event.cascadeChainLength,
          nextHopIndex: 2,
          triedModels: [canonicalModelKey(event.originalModel), canonicalModelKey(event.fallbackModel)],
          triggerRequestId: event.requestId ?? undefined,
          triggerCategory: event.apiRefusalCategory ?? undefined,
        }
      : undefined;
  return {
    ...refusalCascadeState,
    inEpisode: true,
    cursor,
  };
}
//@ chunk-ha3km179.js:56727-57286 placement
/**
 * 记录回退通知（来源与服务模型）。
 */
function recordFallbackNotice(refusalCascadeState, n) {
  let pendingNotice = refusalCascadeState.pendingNotice;
  return {
    ...refusalCascadeState,
    pendingNotice: {
      originModel: pendingNotice?.originModel ?? n.originModel,
      servingModel: n.servingModel,
      retractedMessageUuids: [
        ...(pendingNotice?.retractedMessageUuids ?? []),
        ...(pendingNotice?.provisionalFlushUuid !== undefined ? [pendingNotice.provisionalFlushUuid] : []),
        ...n.retractedMessageUuids,
      ],
      refusedUserMessageUuid: pendingNotice?.refusedUserMessageUuid ?? n.refusedUserMessageUuid,
      apiRefusalCategory: pendingNotice ? pendingNotice.apiRefusalCategory : n.apiRefusalCategory,
      sawCyberRefusal: pendingNotice?.sawCyberRefusal === true || n.apiRefusalCategory === "cyber",
      requestId: pendingNotice ? pendingNotice.requestId : n.requestId,
      provisionalFlushUuid: undefined,
    },
  };
}
//@ chunk-ha3km179.js:57286-57476 placement
/**
 * 取待发通知并打上临时刷新 uuid（避免重复）。
 */
function takePendingNotice(refusalCascadeState, provisionalFlushUuid) {
  let pendingNotice = refusalCascadeState.pendingNotice;
  if (pendingNotice === undefined || pendingNotice.provisionalFlushUuid !== undefined)
    return {
      notice: undefined,
      state: refusalCascadeState,
    };
  return {
    notice: pendingNotice,
    state: {
      ...refusalCascadeState,
      pendingNotice: {
        ...pendingNotice,
        provisionalFlushUuid,
      },
    },
  };
}
//@ chunk-ha3km179.js:57476-57615 placement
function takeFallbackNotice(refusalCascadeState) {
  let pendingNotice = refusalCascadeState.pendingNotice;
  return {
    notice:
      pendingNotice !== undefined && pendingNotice.provisionalFlushUuid === undefined
        ? pendingNotice
        : undefined,
    state: {
      ...refusalCascadeState,
      pendingNotice: undefined,
    },
  };
}
//@ chunk-ha3km179.js:57615-57664 placement
/**
 * 清空待发通知。
 */
function clearPendingNotice(refusalCascadeState) {
  return {
    ...refusalCascadeState,
    pendingNotice: undefined,
  };
}
//@ chunk-ha3km179.js:57664-57688 placement
/**
 * 返回初始的拒绝回退状态。
 */
function initialRejectionEpisode() {
  return INITIAL_REJECTION_EPISODE;
}
//@ chunk-ha3km179.js:57688-57717 placement
/**
 * 判断 e 是否不小于 n。
 */
function atLeast(refusalFallbacksUsed, n) {
  return refusalFallbacksUsed >= n;
}
//@ chunk-ha3km179.js:57717-57767 placement
class PostSamplingHookRegistry {
  hooks = [];
  register(e) {
    this.hooks.push(e);
  }
}
//@ chunk-ha3km179.js:57767-57792 placement
/**
 * 宿主隔离的 post-sampling 钩子注册表。
 */
var postSamplingHookRegistry = new HostScoped(() => new PostSamplingHookRegistry());
//@ chunk-ha3km179.js:57792-57836 placement
/**
 * 把 post-sampling 钩子注册到当前宿主的注册表。
 */
function registerPostSamplingHook(e) {
  postSamplingHookRegistry.of(getRootSession().host).register(e);
}
//@ chunk-ha3km179.js:57836-58036 fingerprint = executePostSamplingHooks (0.923)
async function executePostSamplingHooks(
  messages,
  systemPrompt,
  userContext,
  systemContext,
  toolUseContext,
  querySource,
) {
  let context = {
    messages,
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    querySource,
  };
  for (let hook of postSamplingHookRegistry.of(toolUseContext.session.host).hooks)
    try {
      await hook(context);
    } catch (error) {
      logError(toError(error));
    }
}
export {
  withExpandedPastes,
  registerPostSamplingHook,
  reportQueuedSubmissions,
  automaticModelFallbackInfo,
  INITIAL_REJECTION_EPISODE,
  takePendingNotice,
  takeFallbackNotice,
  nextFallbackStage,
  atLeast,
  isChainRouteMatch,
  recordFallbackAttempt,
  clearPendingNotice,
  recordFallbackNotice,
  initialRejectionEpisode,
  executePostSamplingHooks,
  postSamplingHookRegistry,
};
