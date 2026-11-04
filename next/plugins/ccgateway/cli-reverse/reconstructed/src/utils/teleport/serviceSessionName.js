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
  let title_2 = sanitizeSessionTitle(title ?? "");
  if (
    !title_2 ||
    isInternalHuskTitle(title_2) ||
    title_2 === BACKGROUND_TASK_TITLE ||
    title_2 === REMOTE_TASK_TITLE
  )
    return;
  return title_2;
}
//@ chunk-1r7cdak2.js:397-714 placement
/**
 * 远程会话改名后跟随服务端会话标题，用于 useRemoteSession 显示。
 */
function followServiceSessionName(clock, serviceName, fetchServiceName, onName) {
  let abortController = new AbortController();
  let lastName;
  let onNameChange = (name) => {
    if (abortController.signal.aborted || name === undefined || name === lastName) return;
    lastName = name;
    onName(name);
  };
  serviceName?.then(onNameChange, () => {});
  if (fetchServiceName === undefined) return () => abortController.abort();
  let clearPollTimer = () => {};
  let pollOnce = () => {
    fetchServiceName(abortController.signal)
      .then(onNameChange, () => {})
      .finally(() => {
        if (!abortController.signal.aborted)
          clearPollTimer = clock.setTimeout(pollOnce, SERVICE_NAME_POLL_MS);
      });
  };
  clearPollTimer = clock.setTimeout(pollOnce, SERVICE_NAME_POLL_MS);
  return () => {
    abortController.abort();
    clearPollTimer();
  };
}
export { serviceSessionName, followServiceSessionName };
