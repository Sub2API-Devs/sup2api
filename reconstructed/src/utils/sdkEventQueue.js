/**
 * utils/sdkEventQueue.ts
 *
 * SDK 事件队列：任务终止等系统事件的排入与取出。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sdkEventQueue.ts
 * pieces: chunk-08945j39.js (1), chunk-54xbtc53.js (1)
 * attribution: fingerprint 2
 */

//@ chunk-08945j39.js:4045-4170 fingerprint = emitTaskTerminatedSdk (0.565)
function emitTaskTerminatedSdk(awaitingFinish, message) {
  return (
    message.type === "system" &&
    message.subtype === "task_notification" &&
    typeof message.task_id === "string" &&
    awaitingFinish.delete(message.task_id)
  );
}
//@ chunk-54xbtc53.js:27546-27635 fingerprint = drainSdkEvents (0.429)
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
export { emitTaskTerminatedSdk, drainSdkEvents };
