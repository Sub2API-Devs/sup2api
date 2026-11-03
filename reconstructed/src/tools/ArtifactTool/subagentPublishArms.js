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
import { B9 } from "../../services/artifacts/comments/repliesConsent.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { resolveVisibleSubagentId } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { maybeSubscribeFrameLive } from "../../services/artifacts/frameLive.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-59vafc9k.js:485-494 placement
var u = 32;
//@ chunk-59vafc9k.js:494-712 placement
function subagentPublishAdopter(n) {
  if (n.publishContext !== "subagent" || n.context.agentId === void 0 || n.context.teammateContext !== void 0)
    return null;
  let { publishContext: publishContext } = derivePublishContextFrom({
    agentId: void 0,
    isNonInteractiveSession: getIsNonInteractiveSession(),
  });
  return B9(publishContext) ? publishContext : null;
}
//@ chunk-59vafc9k.js:712-1056 placement
function stageSubagentPublishArm(n, e) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms,
    s = pendingSubagentArms.get(n) ?? [],
    index = s.findIndex((o) => o.slug === e.slug);
  if (index === -1) s.push(e);
  else s[index] = e;
  (pendingSubagentArms.delete(n), pendingSubagentArms.set(n, s));
  let r = 0;
  for (let o of pendingSubagentArms.values()) r += o.length;
  while (r > u) {
    let [o, a] = pendingSubagentArms.entries().next().value;
    if ((a.shift(), a.length === 0)) pendingSubagentArms.delete(o);
    (r--, logFeatureSad("artifact_live_subscribe", "subagent_arm_evicted"));
  }
}
//@ chunk-59vafc9k.js:1056-1142 placement
function l(n) {
  let pendingSubagentArms = getLiveState().live.pendingSubagentArms,
    t = pendingSubagentArms.get(n) ?? [];
  return (pendingSubagentArms.delete(n), t);
}
//@ chunk-59vafc9k.js:1142-1152 placement
var d = 256;
//@ chunk-59vafc9k.js:1152-1277 placement
function rememberSubagentAdopter(n) {
  let finishedSubagentAdopters = getLiveState().live.finishedSubagentAdopters;
  (finishedSubagentAdopters.delete(n), finishedSubagentAdopters.add(n));
  while (finishedSubagentAdopters.size > d)
    finishedSubagentAdopters.delete(finishedSubagentAdopters.values().next().value);
}
/**
 * 子代理发布 artifact 后，主会话接管其实时订阅（artifact_live_subscribe）。
 */
//@ chunk-59vafc9k.js:1277-2062 placement
function adoptSubagentPublishArms(n) {
  let { agentId: agentId, context: context } = n;
  rememberSubagentAdopter(agentId);
  let s = l(agentId);
  if (s.length === 0) return;
  let { publishContext: publishContext } = derivePublishContextFrom({
    agentId: context.agentId,
    agentType: context.agentContext?.agentType,
    isNonInteractiveSession: context.options.isNonInteractiveSession,
  });
  if (publishContext === "subagent" && context.agentId !== void 0) {
    let o =
      resolveVisibleSubagentId(context.agentId, context.taskRegistry) === context.agentId ||
      !getLiveState().live.finishedSubagentAdopters.has(context.agentId);
    for (let a of s)
      if (o) stageSubagentPublishArm(context.agentId, a);
      else logFeatureSad("artifact_live_subscribe", "subagent_arm_orphaned");
    return;
  }
  if (!B9(publishContext)) return;
  let r = { ...context, abortController: new AbortController() };
  for (let o of s)
    maybeSubscribeFrameLive({
      ...o,
      publishContext: publishContext,
      getKnownVer: makeMainObservedVersionReader(context.getArtifactReadObservation, o.slug),
      context: r,
      adoptedPublish: !0,
      announceArmlessEnd: !0,
    }).catch(() => {});
  logFeatureOk("artifact_live_subscribe", {
    subagent_publish_adopted: !0,
    count: s.length,
    publish_context: fromEnum(publishContext),
  });
}

export { subagentPublishAdopter, stageSubagentPublishArm };
