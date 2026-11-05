/**
 * hooks/notifs/useTeammateShutdownNotification.ts
 *
 * 队友启动/关停的合并计数通知（"N teammates started / shut down"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useTeammateShutdownNotification.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (5)
 * attribution: fingerprint 3, file-local 1, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { keepaliveReasons } from "../../tasks/taskKinds.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";

//@ chunk-5xgkngpb.js:4829847-4829964 fingerprint (2.1.88 match: useTeammateLifecycleNotification, 0.759)
function useTeammateLifecycleNotification(task) {
  if (!isLocalAgent(task)) return false;
  return (
    task.status === "running" ||
    (task.status === "completed" && [...keepaliveReasons(task)].some((reason) => reason !== FLAG_IDLE_WINDOW))
  );
}
//@ chunk-czq1j3j2.js:1835934-1836039 file-local
function parseCount(notif) {
  if (!("text" in notif)) return 1;
  let match = notif.text.match(/^(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 1;
}
//@ chunk-czq1j3j2.js:1836039-1836078 layout
function foldTeammatesStarted(notif, notification) {
  return makeSpawnNotif(parseCount(notif) + 1);
}
//@ chunk-czq1j3j2.js:1836078-1836232 fingerprint (2.1.88 match: makeSpawnNotif, 0.664)
function makeSpawnNotif(count) {
  return {
    key: "teammate-spawn",
    kind: "event",
    text: count === 1 ? "1 teammate started" : `${count} teammates started`,
    priority: "low",
    timeoutMs: 5000,
    fold: foldTeammatesStarted,
  };
}
//@ chunk-czq1j3j2.js:1836232-1836271 layout
function foldTeammatesShutdown(acc, _incoming) {
  return makeShutdownNotif(parseCount(acc) + 1);
}
//@ chunk-czq1j3j2.js:1836271-1836432 fingerprint (2.1.88 match: makeShutdownNotif, 0.664)
function makeShutdownNotif(count) {
  return {
    key: "teammate-shutdown",
    kind: "event",
    text: count === 1 ? "1 teammate shut down" : `${count} teammates shut down`,
    priority: "low",
    timeoutMs: 5000,
    fold: foldTeammatesShutdown,
  };
}
export { makeSpawnNotif, makeShutdownNotif, useTeammateLifecycleNotification };
