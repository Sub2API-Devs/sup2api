/**
 * hooks/notifs/useTeammateShutdownNotification.ts
 *
 * 队友启动/关停的合并计数通知（"N teammates started / shut down"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useTeammateShutdownNotification.ts
 * pieces: chunk-18hwfzwa.js (5), chunk-e6aww6q8.js (1)
 * attribution: file-local 1, layout 2, fingerprint 3
 */
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { keepaliveReasons } from "../../tasks/taskKinds.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";

//@ chunk-18hwfzwa.js:1787959-1788064 file-local
function parseCount(notif) {
  if (!("text" in notif)) return 1;
  let match = notif.text.match(/^(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 1;
}
//@ chunk-18hwfzwa.js:1788064-1788103 layout
function mGo(h, x) {
  return makeSpawnNotif(parseCount(h) + 1);
}
//@ chunk-18hwfzwa.js:1788103-1788257 fingerprint = makeSpawnNotif (0.664)
function makeSpawnNotif(count) {
  return {
    key: "teammate-spawn",
    kind: "event",
    text: count === 1 ? "1 teammate started" : `${count} teammates started`,
    priority: "low",
    timeoutMs: 5000,
    fold: mGo,
  };
}
//@ chunk-18hwfzwa.js:1788257-1788296 layout
function pGo(h, x) {
  return makeShutdownNotif(parseCount(h) + 1);
}
//@ chunk-18hwfzwa.js:1788296-1788457 fingerprint = makeShutdownNotif (0.664)
function makeShutdownNotif(count) {
  return {
    key: "teammate-shutdown",
    kind: "event",
    text: count === 1 ? "1 teammate shut down" : `${count} teammates shut down`,
    priority: "low",
    timeoutMs: 5000,
    fold: pGo,
  };
}
//@ chunk-e6aww6q8.js:4718644-4718761 fingerprint = useTeammateLifecycleNotification (0.759)
function useTeammateLifecycleNotification(e) {
  if (!isLocalAgent(e)) return !1;
  return (
    e.status === "running" ||
    (e.status === "completed" && [...keepaliveReasons(e)].some((n) => n !== FLAG_IDLE_WINDOW))
  );
}

export { useTeammateLifecycleNotification, makeSpawnNotif, makeShutdownNotif };
