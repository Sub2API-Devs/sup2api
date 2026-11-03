/**
 * tasks/LocalAgentTask/agentHandback.ts
 *
 * 2.1.316 新增：子代理把控制交回父代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { mainAgentId } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { TASK_NOTIFICATION, TASK_ID, SUMMARY, AGENT_NOTIFICATION_PREFIX } from "../../constants/xml.js";
import { formatTaskNotification, NEXT } from "../../utils/xmlTags.js";
import { escapeXml_2 as escapeXml, unescapeHtmlEntities } from "../../utils/confusables.js";

/**
 * 判断子代理结果是否可直接交回给某个接收者（单条内容、无警告、无 worktree 等），返回接收者。
 */
//@ chunk-e6aww6q8.js:579516-579783 placement
function handbackRecipientOf({
  result: e,
  deliveries: deliveries,
  reviewWarning: reviewWarning,
  worktreePath: worktreePath,
  maxTurnsReached: maxTurnsReached,
  checkpoint: checkpoint,
  reportedBeforePass: reportedBeforePass,
}) {
  if (
    (e.handback !== "send" && e.handback !== "flagged") ||
    e.content.length !== 1 ||
    reviewWarning !== void 0 ||
    worktreePath !== void 0 ||
    maxTurnsReached !== void 0 ||
    checkpoint ||
    reportedBeforePass
  )
    return;
  return deliveries?.at(-1)?.recipient;
}
//@ chunk-e6aww6q8.js:579783-580032 placement
function shouldUseHandbackPointer({ handbackRecipient: handbackRecipient, routedAgentId: routedAgentId }) {
  try {
    if (
      handbackRecipient === void 0 ||
      routedAgentId !== mainAgentId() ||
      handbackRecipient !== routedAgentId ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_kestrel", !0)
    )
      return !1;
    return (logFeatureOk("agent_handback_pointer_notice"), !0);
  } catch (error) {
    return (logError(error), logFeatureSad("agent_handback_pointer_notice", "decision_threw"), !1);
  }
}
//@ chunk-e6aww6q8.js:580032-580149 placement
var RESUMED_BY_USER_SUFFIX = '" was resumed by the user',
  USER_RESUMED_NOTICE_PATTERN = new RegExp(
    `^<${TASK_NOTIFICATION}>\\n<${TASK_ID}>([^<]+)</${TASK_ID}>\\n<${SUMMARY}>[^<]*${RESUMED_BY_USER_SUFFIX}</${SUMMARY}>`,
  );
/**
 * 生成"用户已从转录视图恢复该代理"的任务通知。
 */
//@ chunk-e6aww6q8.js:580149-580647 placement
function buildUserResumedNotice({ agentId: agentId, description: description, to: to }) {
  return {
    value: formatTaskNotification({
      taskId: agentId,
      summary: escapeXml(`${AGENT_NOTIFICATION_PREFIX}${description}${RESUMED_BY_USER_SUFFIX}`),
      body: `
<note>The user resumed this agent from its transcript view; it is running again. Do not treat its work as cancelled or relaunch it; its result arrives in a later task-notification for this task-id.</note>`,
    }),
    mode: "task-notification",
    skipAttachments: !0,
    priority: NEXT,
    agentId: to,
    taskId: agentId,
    userResumeNotice: !0,
    origin: { kind: "task-notification", producer: "session-task" },
    ...(to === mainAgentId() && { passive: !0 }),
  };
}
//@ chunk-e6aww6q8.js:580647-580717 placement
function o6s(e) {
  let n = USER_RESUMED_NOTICE_PATTERN.exec(e)?.[1];
  return n === void 0 ? void 0 : unescapeHtmlEntities(n);
}
//@ chunk-e6aww6q8.js:580717-580780 placement
function zBe(e, n) {
  return e.userResumeNotice === !0 && e.taskId === n;
}

export { handbackRecipientOf, buildUserResumedNotice, o6s, shouldUseHandbackPointer, zBe };
