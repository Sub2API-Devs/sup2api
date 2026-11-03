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

/**
 * 把小粘贴块展开后重建提交内容。
 */
//@ chunk-ha3km179.js:54310-54505 placement
function withExpandedPastes(e, n) {
  let r = collapseSmallPastedBlocks(n),
    s = {};
  for (let h of Object.values(e.pastedContents)) {
    let included = r.text.includes(formatImageRef(h.id));
    if (h.type === "image" && included) s[h.id] = h;
  }
  return logEntryToHistoryEntry(e, r.text, { ...s, ...r.pastedContents });
}
/**
 * 上报排队提交统计（异常吞掉）。
 */
//@ chunk-ha3km179.js:54505-54550 placement
function reportQueuedSubmissions(e, n) {
  try {
    reportQueuedSubmissionsUnsafe(e, n);
  } catch (error) {
    logError(error);
  }
}
/**
 * 统计排队提交的类型与等待时间。
 */
//@ chunk-ha3km179.js:54550-55130 placement
function reportQueuedSubmissionsUnsafe(e, n) {
  let filtered = e.filter((w) => w.pollEmptyDispatch !== !0);
  if (filtered.length === 0) return;
  let now = Date.now(),
    h = now,
    y = 0,
    S = 0,
    M = 0,
    R = 0,
    T = 0;
  for (let w of filtered) {
    if (w.mode === "prompt") y++;
    if (w.artifactCommentTurn !== void 0) M++;
    if (w.monitorEvent !== void 0) (R++, (T += typeof w.value === "string" ? w.value.length : 0));
    if (isProjectsRelay(w.origin) && w.hearthRelayMessageIds !== void 0) S++;
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
    monitor_event_chars: T,
    wait_ms: now - h,
  });
}
//@ chunk-ha3km179.js:55130-55162 placement
function Xs(e) {
  return getCanonicalName(parseUserSpecifiedModel(e));
}
//@ chunk-ha3km179.js:55162-55416 placement
function Il({
  userModel: userModel,
  permissionMode: permissionMode,
  exceeds200kTokens: exceeds200kTokens,
  automaticModels: automaticModels,
}) {
  let h = getRuntimeMainLoopModel({
      permissionMode: permissionMode,
      mainLoopModel: userModel,
      exceeds200kTokens: exceeds200kTokens,
    }),
    y = Xs(h);
  for (let M of automaticModels) if (M && Xs(M) === y) return {};
  let S = getDefaultMainLoopModel();
  return { isDefaultModel: Xs(S) === y, defaultModel: S };
}
//@ chunk-ha3km179.js:55416-55473 placement
var Js = { inEpisode: !1, cursor: void 0, pendingNotice: void 0 };
/**
 * 选择下一个模型回退阶段。
 */
//@ chunk-ha3km179.js:55473-56111 placement
function nextFallbackStage(e, n, r) {
  let cursor = e.cursor;
  if (cursor === void 0) return { armTarget: void 0, hop: void 0, state: e };
  let firstReachableStage = r.firstReachableStage(cursor.remaining, (S) =>
    r.resolveStage(S, n, cursor.triedModels),
  );
  r.logSkippedStages({
    stages: firstReachableStage?.skippedStages ?? cursor.remaining,
    chainLength: cursor.chainLength,
    firstStageIndex: cursor.chainLength - cursor.remaining.length + 1,
    model: n,
    armedFallbackModel: void 0,
    apiRefusalCategory: cursor.triggerCategory,
    requestId: cursor.triggerRequestId,
  });
  let y =
    firstReachableStage !== void 0 && firstReachableStage.remainingChain.length > 0
      ? { ...cursor, remaining: firstReachableStage.remainingChain, nextHopIndex: cursor.nextHopIndex + 1 }
      : void 0;
  return {
    armTarget: firstReachableStage?.model,
    hop: firstReachableStage === void 0 ? void 0 : { index: cursor.nextHopIndex, length: cursor.chainLength },
    state: { ...e, cursor: y },
  };
}
//@ chunk-ha3km179.js:56111-56158 placement
function Zs(e) {
  return e.routeMatched === "chain";
}
/**
 * 记录模型回退尝试。
 */
//@ chunk-ha3km179.js:56158-56727 placement
function recordFallbackAttempt(e, n, r, s) {
  if (Zs(n))
    return e.cursor === void 0
      ? { ...e, inEpisode: !0 }
      : {
          ...e,
          inEpisode: !0,
          cursor: {
            ...e.cursor,
            triedModels: [...e.cursor.triedModels, s(n.fallbackModel)],
            triggerRequestId: n.requestId ?? void 0,
            triggerCategory: n.apiRefusalCategory ?? void 0,
          },
        };
  let h = r ? (n.remainingChain ?? []) : [],
    y =
      h.length > 0 && n.cascadeChainLength !== void 0
        ? {
            remaining: h,
            chainLength: n.cascadeChainLength,
            nextHopIndex: 2,
            triedModels: [s(n.originalModel), s(n.fallbackModel)],
            triggerRequestId: n.requestId ?? void 0,
            triggerCategory: n.apiRefusalCategory ?? void 0,
          }
        : void 0;
  return { ...e, inEpisode: !0, cursor: y };
}
/**
 * 记录回退通知（来源与服务模型）。
 */
//@ chunk-ha3km179.js:56727-57286 placement
function recordFallbackNotice(e, n) {
  let pendingNotice = e.pendingNotice;
  return {
    ...e,
    pendingNotice: {
      originModel: pendingNotice?.originModel ?? n.originModel,
      servingModel: n.servingModel,
      retractedMessageUuids: [
        ...(pendingNotice?.retractedMessageUuids ?? []),
        ...(pendingNotice?.provisionalFlushUuid !== void 0 ? [pendingNotice.provisionalFlushUuid] : []),
        ...n.retractedMessageUuids,
      ],
      refusedUserMessageUuid: pendingNotice?.refusedUserMessageUuid ?? n.refusedUserMessageUuid,
      apiRefusalCategory: pendingNotice ? pendingNotice.apiRefusalCategory : n.apiRefusalCategory,
      sawCyberRefusal: pendingNotice?.sawCyberRefusal === !0 || n.apiRefusalCategory === "cyber",
      requestId: pendingNotice ? pendingNotice.requestId : n.requestId,
      provisionalFlushUuid: void 0,
    },
  };
}
//@ chunk-ha3km179.js:57286-57476 placement
function Ul(e, n) {
  let pendingNotice = e.pendingNotice;
  if (pendingNotice === void 0 || pendingNotice.provisionalFlushUuid !== void 0)
    return { notice: void 0, state: e };
  return {
    notice: pendingNotice,
    state: { ...e, pendingNotice: { ...pendingNotice, provisionalFlushUuid: n } },
  };
}
//@ chunk-ha3km179.js:57476-57615 placement
function takeFallbackNotice(e) {
  let pendingNotice = e.pendingNotice;
  return {
    notice:
      pendingNotice !== void 0 && pendingNotice.provisionalFlushUuid === void 0 ? pendingNotice : void 0,
    state: { ...e, pendingNotice: void 0 },
  };
}
//@ chunk-ha3km179.js:57615-57664 placement
function Nl(e) {
  return { ...e, pendingNotice: void 0 };
}
//@ chunk-ha3km179.js:57664-57688 placement
function ql() {
  return Js;
}
//@ chunk-ha3km179.js:57688-57717 placement
function ti(e, n) {
  return e >= n;
}
//@ chunk-ha3km179.js:57717-57767 placement
class Bl {
  hooks = [];
  register(e) {
    this.hooks.push(e);
  }
}
//@ chunk-ha3km179.js:57767-57792 placement
var Lr = new HostScoped(() => new Bl());
//@ chunk-ha3km179.js:57792-57836 placement
function xBn(e) {
  Lr.of(getRootSession().host).register(e);
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
    messages: messages,
    systemPrompt: systemPrompt,
    userContext: userContext,
    systemContext: systemContext,
    toolUseContext: toolUseContext,
    querySource: querySource,
  };
  for (let hook of Lr.of(toolUseContext.session.host).hooks)
    try {
      await hook(context);
    } catch (error) {
      logError(toError(error));
    }
}

export {
  withExpandedPastes,
  xBn,
  reportQueuedSubmissions,
  Il,
  Js,
  Ul,
  takeFallbackNotice,
  nextFallbackStage,
  ti,
  Zs,
  recordFallbackAttempt,
  Nl,
  recordFallbackNotice,
  ql,
  executePostSamplingHooks,
  Lr,
};
