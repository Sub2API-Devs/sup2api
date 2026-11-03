/**
 * hooks/notifs/_new/teammateStatusSignature.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (1)
 * attribution: sole-consumer-new 1
 */
import { isInProcessTeammateTask } from "../../../tasks/InProcessTeammateTask/types.js";

/**
 * teammate 任务状态签名串（id:status;…），用于判断是否变化。
 */
//@ chunk-6vnxsn99.js:22755-22854 sole-consumer-new
function teammateStatusSignature(tasks) {
  let n = "";
  for (let r of Object.values(tasks)) if (isInProcessTeammateTask(r)) n += `${r.id}:${r.status};`;
  return n;
}

export { teammateStatusSignature };
