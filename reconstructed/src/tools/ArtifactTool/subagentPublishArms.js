/**
 * tools/ArtifactTool/subagentPublishArms.ts
 *
 * 2.1.316 新增。子代理发布 artifact 后，主会话接管其实时订阅（artifact_live_subscribe）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-59vafc9k.js (7)
 * attribution: placement 7
 */
import {
  derivePublishContextFrom,
  makeMainObservedVersionReader,
} from "../../services/artifacts/readObservation.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isConsentUiKind } from "../../services/artifacts/comments/repliesConsent.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { resolveVisibleSubagentId } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { maybeSubscribeFrameLive } from "../../services/artifacts/frameLive.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-59vafc9k.js:485-494 placement
/**
 * 待处理子代理预备条目的上限。
 */
var PENDING_SUBAGENT_ARMS_MAX = 32;
//@ chunk-59vafc9k.js:494-712 placement
function subagentPublishAdopter(n) {
  if (
    n.publishContext !== "subagent" ||
    n.context.agentId === undefined ||
    n.context.teammateContext !== undefined
  )
    return null;
  let { publishContext } = derivePublishContextFrom({
    agentId: undefined,
    isNonInteractiveSession: getIsNonInteractiveSession(),
  });
  return isConsentUiKind(publishContext) ? publishContext : null;
}
//@ chunk-59vafc9k.js:712-1056 placement
function stageSubagentPublishArm(agentId, e) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms;
  let s = pendingSubagentArms.get(agentId) ?? [];
  let index = s.findIndex((o) => o.slug === e.slug);
  if (index === -1) s.push(e);
  else s[index] = e;
  pendingSubagentArms.delete(agentId);
  pendingSubagentArms.set(agentId, s);
  let r = 0;
  for (let o of pendingSubagentArms.values()) r += o.length;
  while (r > PENDING_SUBAGENT_ARMS_MAX) {
    let [o, a] = pendingSubagentArms.entries().next().value;
    a.shift();
    if (a.length === 0) pendingSubagentArms.delete(o);
    r--;
    logFeatureSad("artifact_live_subscribe", "subagent_arm_evicted");
  }
}
//@ chunk-59vafc9k.js:1056-1142 placement
/**
 * 取出并清空某键的待处理子代理预备条目。
 */
function takePendingSubagentArms(agentId) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms;
  let t = pendingSubagentArms.get(agentId) ?? [];
  pendingSubagentArms.delete(agentId);
  return t;
}
//@ chunk-59vafc9k.js:1142-1152 placement
/**
 * 已完成子代理收养者记录的保留上限。
 */
var FINISHED_SUBAGENT_ADOPTERS_MAX = 256;
//@ chunk-59vafc9k.js:1152-1277 placement
function rememberSubagentAdopter(agentId) {
  let finishedSubagentAdopters = getLiveState().live.finishedSubagentAdopters;
  finishedSubagentAdopters.delete(agentId);
  finishedSubagentAdopters.add(agentId);
  while (finishedSubagentAdopters.size > FINISHED_SUBAGENT_ADOPTERS_MAX)
    finishedSubagentAdopters.delete(finishedSubagentAdopters.values().next().value);
}
//@ chunk-59vafc9k.js:1277-2062 placement
/**
 * 子代理发布 artifact 后，主会话接管其实时订阅（artifact_live_subscribe）。
 */
function adoptSubagentPublishArms(n) {
  let { agentId, context } = n;
  rememberSubagentAdopter(agentId);
  let s = takePendingSubagentArms(agentId);
  if (s.length === 0) return;
  let { publishContext } = derivePublishContextFrom({
    agentId: context.agentId,
    agentType: context.agentContext?.agentType,
    isNonInteractiveSession: context.options.isNonInteractiveSession,
  });
  if (publishContext === "subagent" && context.agentId !== undefined) {
    let o =
      resolveVisibleSubagentId(context.agentId, context.taskRegistry) === context.agentId ||
      !getLiveState().live.finishedSubagentAdopters.has(context.agentId);
    for (let a of s)
      if (o) stageSubagentPublishArm(context.agentId, a);
      else logFeatureSad("artifact_live_subscribe", "subagent_arm_orphaned");
    return;
  }
  if (!isConsentUiKind(publishContext)) return;
  let context_2 = {
    ...context,
    abortController: new AbortController(),
  };
  for (let o of s)
    maybeSubscribeFrameLive({
      ...o,
      publishContext,
      getKnownVer: makeMainObservedVersionReader(context.getArtifactReadObservation, o.slug),
      context: context_2,
      adoptedPublish: true,
      announceArmlessEnd: true,
    }).catch(() => {});
  logFeatureOk("artifact_live_subscribe", {
    subagent_publish_adopted: true,
    count: s.length,
    publish_context: fromEnum(publishContext),
  });
}
export { subagentPublishAdopter, stageSubagentPublishArm };
