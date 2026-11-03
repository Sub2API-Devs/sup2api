/**
 * utils/teleport/serviceSessionName.ts
 *
 * 2.1.316 新增。远程会话改名后跟随服务端会话标题，用于 useRemoteSession 显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1r7cdak2.js (3)
 * attribution: placement 3
 */
import { sanitizeSessionTitle } from "../stringUtils.js";
import { isInternalHuskTitle } from "../../services/cloudSessions/ccrSessionList.js";
import { BACKGROUND_TASK_TITLE, REMOTE_TASK_TITLE } from "./remoteTaskLabels.js";

//@ chunk-1r7cdak2.js:305-317 placement
var SERVICE_NAME_POLL_MS = 30000;
//@ chunk-1r7cdak2.js:317-397 placement
function serviceSessionName(title) {
  let n = sanitizeSessionTitle(title ?? "");
  if (!n || isInternalHuskTitle(n) || n === BACKGROUND_TASK_TITLE || n === REMOTE_TASK_TITLE) return;
  return n;
}
//@ chunk-1r7cdak2.js:397-714 placement
/**
 * 远程会话改名后跟随服务端会话标题，用于 useRemoteSession 显示。
 */
function followServiceSessionName(clock, serviceName, r, a) {
  let abortController = new AbortController();
  let s;
  let d = (t) => {
    if (abortController.signal.aborted || t === undefined || t === s) return;
    s = t;
    a(t);
  };
  serviceName?.then(d, () => {});
  if (r === undefined) return () => abortController.abort();
  let o = () => {};
  let u = () => {
    r(abortController.signal)
      .then(d, () => {})
      .finally(() => {
        if (!abortController.signal.aborted) o = clock.setTimeout(u, SERVICE_NAME_POLL_MS);
      });
  };
  o = clock.setTimeout(u, SERVICE_NAME_POLL_MS);
  return () => {
    abortController.abort();
    o();
  };
}
export { serviceSessionName, followServiceSessionName };
