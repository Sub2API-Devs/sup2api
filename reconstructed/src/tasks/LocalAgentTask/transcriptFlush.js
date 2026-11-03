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
import { Us } from "../../services/projects/threadRows.js";
import { G$, Mr } from "../../utils/agentId.js";
import { withTimeout } from "../../utils/sleep.js";
import {
  flushSessionStorage,
  listSubagentIdsFromDisk,
  getAgentTranscript,
} from "../../utils/sessionStorage.js";

//@ chunk-0sfjpx19.js:134912-134944 placement
var B0n = (e, n) => normalizeMessagesForAPI(Us([...e]), n);
//@ chunk-0sfjpx19.js:134944-134956 placement
var Nl = 2000;
//@ chunk-0sfjpx19.js:134956-135190 placement
async function waitForAgentTranscriptFlush(e, n) {
  if (!G$(e)) return null;
  await withTimeout(flushSessionStorage(), Nl, "saved agent transcript: flush wait").catch(() => {});
  let s = (await listSubagentIdsFromDisk(n)).includes(e)
    ? await getAgentTranscript(Mr(e), n, { trustLocal: !0 })
    : null;
  return s ? s.messages.filter((message) => $l(message, e)) : null;
}
//@ chunk-0sfjpx19.js:135190-135242 placement
function $l(e, n) {
  return "agentId" in e && e.agentId === n;
}

export { waitForAgentTranscriptFlush, B0n };
