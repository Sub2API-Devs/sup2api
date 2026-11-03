/**
 * utils/conversationReset.ts
 *
 * 2.1.316 新增：对话重置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2663ce23.js (1)
 * attribution: placement 1
 */
import { cancelQuotaAutoResume } from "../services/quotaAutoResume/quotaAutoResume.js";
import { endLowPriority } from "../services/lowPriority/lowPriorityMode.js";
import { kb, Oq } from "./messageQueueManager.js";
import {
  retireConversationReplicas,
  disposeLiveState,
  resetNoticeBudgets,
  resetForNewConversation,
  clearRefusedPublishBodies,
} from "../services/liveReplica/liveReplica.js";
import { runBundledSkillSessionResets } from "../skills/bundledSkills.js";
import { getSessionId, forgetMainChainOnHandOff } from "../bootstrap/state.js";
import { getSessionStopPromptHooks } from "../commands/goal/goal.js";
import { Ket } from "./conversationRecovery.js";
import { clearFileStateCacheKeepingSeeds } from "./fileStateCache.js";
import { i6 } from "../memdir/findRelevantMemories.js";
import { primePasteIdsFromMessages } from "../history.js";
import { hasOnlyPreservedBeforeBoundary, uZn } from "../services/projects/threadRows.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createSystemMessage } from "./messages.js";
import { emitReplBridgeEvent } from "../hooks/useReplBridge.js";
import { markRemoteSourced } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { LTe } from "./sessionModelPin.js";

/**
 * 重置对话（/clear 等）：停止副本与监听、清理缓存与状态。
 */
//@ chunk-2663ce23.js:675-1227 placement
function resetConversation(e, o, m, a) {
  (cancelQuotaAutoResume("conversation_reset"),
    endLowPriority("conversation_reset"),
    kb(Oq),
    retireConversationReplicas(),
    disposeLiveState(),
    resetNoticeBudgets(),
    resetForNewConversation(),
    clearRefusedPublishBodies(),
    runBundledSkillSessionResets());
  let r = getSessionId();
  for (let s of getSessionStopPromptHooks(e.sessionHooksRegistry, r))
    e.sessionHooksRegistry.remove(r, "Stop", s);
  (m(),
    Ket(),
    e.markConversationRemote?.(),
    clearFileStateCacheKeepingSeeds(e.readFileState),
    i6(e.memorySelector),
    forgetMainChainOnHandOff(),
    primePasteIdsFromMessages(o));
  let t = hasOnlyPreservedBeforeBoundary(o);
  if (t) logFeatureSad("teleport_resume_history", "summarized_rows_absent");
  else logFeatureOk("teleport_resume_history");
  let i = t ? [createSystemMessage(uZn, "warning")] : [];
  (emitReplBridgeEvent(
    a,
    r,
    [...o, ...i].map((s) => s.uuid),
  ),
    e.applyMessageOp({ type: "replace-all", messages: [...markRemoteSourced(o), ...i] }),
    LTe(!0));
}

export { resetConversation };
