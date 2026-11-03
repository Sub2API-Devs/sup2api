/**
 * services/daemon/jobRow.ts
 *
 * 后台作业行记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-12p23jte.js (1)
 * attribution: placement 1
 */
import { Zee } from "../../commands/color/index.js";
import { readJobState, isSettled, isExecLaunch, writeStateAtomic } from "./jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 在后台作业的状态行上记下 stopped（已结束、已停或 exec 启动的作业跳过），失败时记日志。
 */
//@ chunk-12p23jte.js:343-604 placement
async function markJobStoppedOnRow(r, o) {
  if (!Zee()) return;
  try {
    let e = await readJobState(r, o);
    if (!e || !isSettled(e) || e.state === "stopped" || isExecLaunch(e)) return;
    await writeStateAtomic(r, { ...e, state: "stopped", updatedAt: new Date().toISOString() }, o);
  } catch (error) {
    logForDebugging(`stop not recorded on the job's row: ${errorMessage(error)}`, { level: "error" });
  }
}

export { markJobStoppedOnRow };
