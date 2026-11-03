/**
 * utils/forkSourceNote.ts
 *
 * 2.1.316 新增：fork 出来的会话首轮附上"本会话分叉自另一会话"的说明（来源会话名、已分叉点）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (6)
 * attribution: placement 6
 */
import { basename } from "path";
import { getSleepPreventer } from "../services/preventSleep.js";
import { Re } from "../../runtime/bun-runtime.js";
import { require_semver_3 } from "../../vendor/semver/index.js";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { FORK_SOURCE } from "../constants/xml.js";
import { hasQueuedCommandMentioning } from "../tasks/resumeOrphanedTasks.js";
import { findLivePeerBySessionId } from "./udsMessaging/udsClient.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { clipTeammateText } from "./swarm/teammateIds.js";
import { escapeXml_2 as escapeXml } from "./confusables.js";
import { LISTAGENTS } from "../tools/SendMessageTool/listAgents.js";
import { enqueuePendingNotification } from "./messageQueueManager.js";
import { formatTaskNotification } from "./xmlTags.js";
import { SENDMESSAGE } from "../tools/SendMessageTool/constants.js";
import { mainAgentId } from "../bootstrap/state.js";
import { getUserMessageText } from "./messages.js";

//@ chunk-0sfjpx19.js:49898-49928 placement
/**
 * 获取系统休眠阻止器（acquire）。
 */
function acquireSleepPreventer() {
  getSleepPreventer().acquire();
}
//@ chunk-0sfjpx19.js:49928-49958 placement
/**
 * 释放系统休眠阻止器。
 */
function releaseSleepPreventer() {
  getSleepPreventer().release();
}
//@ chunk-0sfjpx19.js:49958-49997 placement
/**
 * 判断是否正持有休眠阻止器。
 */
function isSleepPreventerHeld() {
  return getSleepPreventer().isHolding();
}
//@ chunk-0sfjpx19.js:49997-50015 placement
/**
 * fs/promises 模块引用。
 */
var fsPromises = Re(require_semver_3(), 1);
//@ chunk-0sfjpx19.js:50096-51143 placement
/**
 * 向 fork 会话注入 fork_source_note：说明共享历史截止时间及如何联系源会话。
 */
async function appendForkSourceNote(e, parentSessionId, boundaryAt) {
  if (isCrossSessionMessagingEnabled()) {
    let text = `<${FORK_SOURCE}>`;
    if (e.some((T) => messageContainsText(T, text)) || hasQueuedCommandMentioning(text)) return;
    let timestamp = Date.parse(boundaryAt);
    if (Number.isNaN(timestamp)) return;
    let iso = new Date(timestamp).toISOString();
    let livePeerBySessionId = await findLivePeerBySessionId(parentSessionId);
    if (livePeerBySessionId === null) {
      logFeatureSad("fork_source_note", "parent_gone");
      return;
    }
    let b = clipTeammateText(livePeerBySessionId.name || basename(livePeerBySessionId.cwd));
    let k = b && b !== "?" ? b : null;
    let w = k
      ? `a session whose self-reported name is '${escapeXml(k)}'`
      : "a session that was untitled when this note was written";
    let S = k
      ? `find it in the ${LISTAGENTS} listing under that name (it may have been renamed since)`
      : `find it in the ${LISTAGENTS} listing`;
    if (hasQueuedCommandMentioning(text)) return;
    logFeatureOk("fork_source_note");
    enqueuePendingNotification({
      value: formatTaskNotification({
        body: `
<${FORK_SOURCE}>
This session began as a fork (copy) of another session that is still running: ${w}. The conversation up to ${iso} is shared history with it; the two sessions have since diverged, and neither sees the other's new activity. To coordinate with it \u2014 hand results back, ask what it has done since, avoid duplicating its work \u2014 ${S} and message it with ${SENDMESSAGE}.
</${FORK_SOURCE}>`,
      }),
      agentId: mainAgentId(),
      mode: "task-notification",
      skipAttachments: true,
      priority: "next",
      shouldQuery: false,
    });
  }
}
//@ chunk-0sfjpx19.js:51143-51318 placement = buildTranscriptEntries (0.777)
/**
 * 判断消息（或 queued_command 附件的 prompt）是否包含指定文本。旧版名 buildTranscriptEntries 误配。
 */
function messageContainsText(message, text) {
  if (message.type === "attachment") {
    let attachment = message.attachment;
    return (
      attachment.type === "queued_command" &&
      typeof attachment.prompt === "string" &&
      attachment.prompt.includes(text)
    );
  }
  return getUserMessageText(message)?.includes(text) ?? false;
}
export {
  appendForkSourceNote,
  fsPromises,
  releaseSleepPreventer,
  acquireSleepPreventer,
  isSleepPreventerHeld,
};
