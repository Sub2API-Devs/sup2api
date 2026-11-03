/**
 * components/_new/teammateRowState.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { isMainSessionTask as isMainSessionTask_2 } from "../../tasks/taskKinds.js";
import { isTaskFailedOrStopped } from "../../state/teammateViewHelpers.js";

//@ chunk-e6aww6q8.js:4006927-4007097 sole-consumer-new
function teammateRowState(e) {
  if (e.type !== "in_process_teammate") return isMainSessionTask_2(e) ? void 0 : "hidden";
  let n = isTaskFailedOrStopped(e),
    r = e.identity.resumableAgentId === void 0;
  return n ? "ended" : r ? "elsewhere" : void 0;
}

export { teammateRowState };
