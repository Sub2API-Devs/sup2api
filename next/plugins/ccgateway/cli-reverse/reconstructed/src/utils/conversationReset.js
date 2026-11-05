/**
 * utils/conversationReset.ts
 *
 * 2.1.316 新增：对话重置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dvbxt5ad.js (1)
 * attribution: placement 1
 */
import { cancelQuotaAutoResume } from "../services/quotaAutoResume/quotaAutoResume.js";
import { endLowPriority } from "../services/lowPriority/lowPriorityMode.js";
import { removeByFilter, isPassiveMainThreadCommand } from "./messageQueueManager.js";
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
import { clearClassifierContext } from "./conversationRecovery.js";
import { clearFileStateCacheKeepingSeeds } from "./fileStateCache.js";
import { resetPickerState } from "../memdir/findRelevantMemories.js";
import { primePasteIdsFromMessages } from "../history.js";
import { hasOnlyPreservedBeforeBoundary, COMPACTED_AWAY_NOTICE } from "../services/projects/threadRows.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { createSystemMessage } from "./messages.js";
import { emitReplBridgeEvent } from "../hooks/useReplBridge.js";
import { markRemoteSourced } from "../tools/ArtifactTool/artifactResumeCarry.js";
import { noopModelPinReset } from "./sessionModelPin.js";

//@ chunk-dvbxt5ad.js:674-1225 placement
/**
 * 重置对话（/clear 等）：停止副本与监听、清理缓存与状态。
 */
function resetConversation(context, messages, reason, options) {
  cancelQuotaAutoResume("conversation_reset");
  endLowPriority("conversation_reset");
  removeByFilter(isPassiveMainThreadCommand);
  retireConversationReplicas();
  disposeLiveState();
  resetNoticeBudgets();
  resetForNewConversation();
  clearRefusedPublishBodies();
  runBundledSkillSessionResets();
  let event = getSessionId();
  for (let hook of getSessionStopPromptHooks(context.sessionHooksRegistry, event))
    context.sessionHooksRegistry.remove(event, "Stop", hook);
  reason();
  clearClassifierContext();
  context.markConversationRemote?.();
  clearFileStateCacheKeepingSeeds(context.readFileState);
  resetPickerState(context.memorySelector);
  forgetMainChainOnHandOff();
  primePasteIdsFromMessages(messages);
  let onlyPreservedBeforeBoundary = hasOnlyPreservedBeforeBoundary(messages);
  if (onlyPreservedBeforeBoundary) logFeatureSad("teleport_resume_history", "summarized_rows_absent");
  else logFeatureOk("teleport_resume_history");
  let noticeMessages = onlyPreservedBeforeBoundary
    ? [createSystemMessage(COMPACTED_AWAY_NOTICE, "warning")]
    : [];
  emitReplBridgeEvent(
    options,
    event,
    [...messages, ...noticeMessages].map((message) => message.uuid),
  );
  context.applyMessageOp({
    type: "replace-all",
    messages: [...markRemoteSourced(messages), ...noticeMessages],
  });
  noopModelPinReset(true);
}
export { resetConversation };
