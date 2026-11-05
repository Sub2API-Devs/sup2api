/**
 * tools/ArtifactTool/subagentPublishArms.ts
 *
 * 2.1.316 新增。子代理发布 artifact 后，主会话接管其实时订阅（artifact_live_subscribe）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cwq05khv.js (7)
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

//@ chunk-cwq05khv.js:485-494 placement
/**
 * 待处理子代理预备条目的上限。
 */
var PENDING_SUBAGENT_ARMS_MAX = 32;
//@ chunk-cwq05khv.js:494-712 placement
function subagentPublishAdopter(options) {
  if (
    options.publishContext !== "subagent" ||
    options.context.agentId === undefined ||
    options.context.teammateContext !== undefined
  )
    return null;
  let { publishContext } = derivePublishContextFrom({
    agentId: undefined,
    isNonInteractiveSession: getIsNonInteractiveSession(),
  });
  return isConsentUiKind(publishContext) ? publishContext : null;
}
//@ chunk-cwq05khv.js:712-1088 placement
function stageSubagentPublishArm(agentId, arm) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms;
  let arms = pendingSubagentArms.get(agentId) ?? [];
  let index = arms.findIndex((existing) => existing.slug === arm.slug);
  if (index === -1) arms.push(arm);
  else
    arms[index] = {
      ...arm,
      title: arm.title ?? arms[index]?.title,
    };
  pendingSubagentArms.delete(agentId);
  pendingSubagentArms.set(agentId, arms);
  let total = 0;
  for (let list of pendingSubagentArms.values()) total += list.length;
  while (total > PENDING_SUBAGENT_ARMS_MAX) {
    let [oldestId, oldestArms] = pendingSubagentArms.entries().next().value;
    oldestArms.shift();
    if (oldestArms.length === 0) pendingSubagentArms.delete(oldestId);
    total--;
    logFeatureSad("artifact_live_subscribe", "subagent_arm_evicted");
  }
}
//@ chunk-cwq05khv.js:1088-1174 placement
/**
 * 取出并清空某键的待处理子代理预备条目。
 */
function takePendingSubagentArms(agentId) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms;
  let arms = pendingSubagentArms.get(agentId) ?? [];
  pendingSubagentArms.delete(agentId);
  return arms;
}
//@ chunk-cwq05khv.js:1174-1184 placement
/**
 * 已完成子代理收养者记录的保留上限。
 */
var FINISHED_SUBAGENT_ADOPTERS_MAX = 256;
//@ chunk-cwq05khv.js:1184-1309 placement
function rememberSubagentAdopter(agentId) {
  let finishedSubagentAdopters = getLiveState().live.finishedSubagentAdopters;
  finishedSubagentAdopters.delete(agentId);
  finishedSubagentAdopters.add(agentId);
  while (finishedSubagentAdopters.size > FINISHED_SUBAGENT_ADOPTERS_MAX)
    finishedSubagentAdopters.delete(finishedSubagentAdopters.values().next().value);
}
//@ chunk-cwq05khv.js:1309-2094 placement
/**
 * 子代理发布 artifact 后，主会话接管其实时订阅（artifact_live_subscribe）。
 */
function adoptSubagentPublishArms(request) {
  let { agentId, context } = request;
  rememberSubagentAdopter(agentId);
  let arms = takePendingSubagentArms(agentId);
  if (arms.length === 0) return;
  let { publishContext } = derivePublishContextFrom({
    agentId: context.agentId,
    agentType: context.agentContext?.agentType,
    isNonInteractiveSession: context.options.isNonInteractiveSession,
  });
  if (publishContext === "subagent" && context.agentId !== undefined) {
    let isAdoptable =
      resolveVisibleSubagentId(context.agentId, context.taskRegistry) === context.agentId ||
      !getLiveState().live.finishedSubagentAdopters.has(context.agentId);
    for (let arm of arms)
      if (isAdoptable) stageSubagentPublishArm(context.agentId, arm);
      else logFeatureSad("artifact_live_subscribe", "subagent_arm_orphaned");
    return;
  }
  if (!isConsentUiKind(publishContext)) return;
  let context_2 = {
    ...context,
    abortController: new AbortController(),
  };
  for (let arm of arms)
    maybeSubscribeFrameLive({
      ...arm,
      publishContext,
      getKnownVer: makeMainObservedVersionReader(context.getArtifactReadObservation, arm.slug),
      context: context_2,
      adoptedPublish: true,
      announceArmlessEnd: true,
    }).catch(() => {});
  logFeatureOk("artifact_live_subscribe", {
    subagent_publish_adopted: true,
    count: arms.length,
    publish_context: fromEnum(publishContext),
  });
}
export { subagentPublishAdopter, stageSubagentPublishArm, adoptSubagentPublishArms };
