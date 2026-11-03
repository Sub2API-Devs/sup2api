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

//@ chunk-e6aww6q8.js:579516-579783 placement
/**
 * 判断子代理结果是否可直接交回给某个接收者（单条内容、无警告、无 worktree 等），返回接收者。
 */
function handbackRecipientOf({
  result: e,
  deliveries,
  reviewWarning,
  worktreePath,
  maxTurnsReached,
  checkpoint,
  reportedBeforePass,
}) {
  if (
    (e.handback !== "send" && e.handback !== "flagged") ||
    e.content.length !== 1 ||
    reviewWarning !== undefined ||
    worktreePath !== undefined ||
    maxTurnsReached !== undefined ||
    checkpoint ||
    reportedBeforePass
  )
    return;
  return deliveries?.at(-1)?.recipient;
}
//@ chunk-e6aww6q8.js:579783-580032 placement
function shouldUseHandbackPointer({ handbackRecipient, routedAgentId }) {
  try {
    if (
      handbackRecipient === undefined ||
      routedAgentId !== mainAgentId() ||
      handbackRecipient !== routedAgentId ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_hushed_kestrel", true)
    )
      return false;
    logFeatureOk("agent_handback_pointer_notice");
    return true;
  } catch (error) {
    logError(error);
    logFeatureSad("agent_handback_pointer_notice", "decision_threw");
    return false;
  }
}
//@ chunk-e6aww6q8.js:580032-580149 placement
var RESUMED_BY_USER_SUFFIX = '" was resumed by the user';
var USER_RESUMED_NOTICE_PATTERN = new RegExp(
  `^<${TASK_NOTIFICATION}>\\n<${TASK_ID}>([^<]+)</${TASK_ID}>\\n<${SUMMARY}>[^<]*${RESUMED_BY_USER_SUFFIX}</${SUMMARY}>`,
);
//@ chunk-e6aww6q8.js:580149-580647 placement
/**
 * 生成"用户已从转录视图恢复该代理"的任务通知。
 */
function buildUserResumedNotice({ agentId, description, to }) {
  return {
    value: formatTaskNotification({
      taskId: agentId,
      summary: escapeXml(`${AGENT_NOTIFICATION_PREFIX}${description}${RESUMED_BY_USER_SUFFIX}`),
      body: `
<note>The user resumed this agent from its transcript view; it is running again. Do not treat its work as cancelled or relaunch it; its result arrives in a later task-notification for this task-id.</note>`,
    }),
    mode: "task-notification",
    skipAttachments: true,
    priority: NEXT,
    agentId: to,
    taskId: agentId,
    userResumeNotice: true,
    origin: {
      kind: "task-notification",
      producer: "session-task",
    },
    ...(to === mainAgentId() && {
      passive: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:580647-580717 placement
/**
 * 从「用户已恢复」提示文本中取出任务 id。
 */
function userResumeNoticeTaskId(e) {
  let n = USER_RESUMED_NOTICE_PATTERN.exec(e)?.[1];
  return n === undefined ? undefined : unescapeHtmlEntities(n);
}
//@ chunk-e6aww6q8.js:580717-580780 placement
/**
 * 判断通知是否是针对给定任务的用户恢复提示。
 */
function isUserResumeNoticeFor(e, taskId) {
  return e.userResumeNotice === true && e.taskId === taskId;
}
export {
  handbackRecipientOf,
  buildUserResumedNotice,
  userResumeNoticeTaskId,
  shouldUseHandbackPointer,
  isUserResumeNoticeFor,
};
