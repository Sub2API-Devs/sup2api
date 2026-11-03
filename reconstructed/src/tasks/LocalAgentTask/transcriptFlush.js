/**
 * tasks/LocalAgentTask/transcriptFlush.ts
 *
 * 2.1.316 新增：后台代理转录落盘等待
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (4)
 * attribution: placement 4
 */
import { normalizeMessagesForAPI } from "../../utils/messages.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { isSafeIdSegment, identityAgentId2 } from "../../utils/agentId.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  flushSessionStorage,
  listSubagentIdsFromDisk,
  getAgentTranscript,
} from "../../utils/sessionStorage.js";

//@ chunk-0sfjpx19.js:134912-134944 placement
/**
 * 把代理消息列表规范化为 API 形状。
 */
var normalizeAgentMessagesForApi = (e, n) => normalizeMessagesForAPI(messagesSinceCompactBoundary([...e]), n);
//@ chunk-0sfjpx19.js:134944-134956 placement
var AGENT_TRANSCRIPT_FLUSH_TIMEOUT_MS = 2000;
//@ chunk-0sfjpx19.js:134956-135190 placement
async function waitForAgentTranscriptFlush(e, n) {
  if (!isSafeIdSegment(e)) return null;
  await withTimeout(
    flushSessionStorage(),
    AGENT_TRANSCRIPT_FLUSH_TIMEOUT_MS,
    "saved agent transcript: flush wait",
  ).catch(() => {});
  let s = (await listSubagentIdsFromDisk(n)).includes(e)
    ? await getAgentTranscript(identityAgentId2(e), n, {
        trustLocal: true,
      })
    : null;
  return s ? s.messages.filter((message) => isMessageFromAgent(message, e)) : null;
}
//@ chunk-0sfjpx19.js:135190-135242 placement
/**
 * 判断消息是否来自给定代理。
 */
function isMessageFromAgent(message, n) {
  return "agentId" in message && message.agentId === n;
}
export { waitForAgentTranscriptFlush, normalizeAgentMessagesForApi };
