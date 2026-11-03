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
import { Xer, Jer } from "./remoteTaskLabels.js";

//@ chunk-1r7cdak2.js:305-317 placement
var f = 30000;
//@ chunk-1r7cdak2.js:317-397 placement
function serviceSessionName(i) {
  let n = sanitizeSessionTitle(i ?? "");
  if (!n || isInternalHuskTitle(n) || n === Xer || n === Jer) return;
  return n;
}
/**
 * 远程会话改名后跟随服务端会话标题，用于 useRemoteSession 显示。
 */
//@ chunk-1r7cdak2.js:397-714 placement
function followServiceSessionName(i, n, r, a) {
  let abortController = new AbortController(),
    s,
    d = (t) => {
      if (abortController.signal.aborted || t === void 0 || t === s) return;
      ((s = t), a(t));
    };
  if ((n?.then(d, () => {}), r === void 0)) return () => abortController.abort();
  let o = () => {},
    u = () => {
      r(abortController.signal)
        .then(d, () => {})
        .finally(() => {
          if (!abortController.signal.aborted) o = i.setTimeout(u, f);
        });
    };
  return (
    (o = i.setTimeout(u, f)),
    () => {
      (abortController.abort(), o());
    }
  );
}

export { serviceSessionName, followServiceSessionName };
