/**
 * utils/sdkEventQueue.ts
 *
 * SDK 事件队列：任务终止等系统事件的排入与取出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sdkEventQueue.ts
 * pieces: chunk-0h9p4sxp.js (1), chunk-h29vk4wn.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-h29vk4wn.js:5616-5741 fingerprint (2.1.88 match: emitTaskTerminatedSdk, 0.607)
function emitTaskTerminatedSdk(awaitingFinish, message) {
  return (
    message.type === "system" &&
    message.subtype === "task_notification" &&
    typeof message.task_id === "string" &&
    awaitingFinish.delete(message.task_id)
  );
}
//@ chunk-0h9p4sxp.js:29829-29918 fingerprint (2.1.88 match: drainSdkEvents, 0.428)
function drainSdkEvents(result, cloudSessionId, viewUrl) {
  return cloudSessionId === undefined
    ? result
    : {
        ...result,
        session_id: cloudSessionId,
        ...(viewUrl !== undefined && {
          session_url: viewUrl,
        }),
      };
}
export { drainSdkEvents, emitTaskTerminatedSdk };
