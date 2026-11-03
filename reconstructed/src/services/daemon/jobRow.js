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
import { isColorCommandForceHidden } from "../../commands/color/index.js";
import { readJobState, isSettled, isExecLaunch, writeStateAtomic } from "./jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-12p23jte.js:343-604 placement
/**
 * 在后台作业的状态行上记下 stopped（已结束、已停或 exec 启动的作业跳过），失败时记日志。
 */
async function markJobStoppedOnRow(r, o) {
  if (!isColorCommandForceHidden()) return;
  try {
    let jobState = await readJobState(r, o);
    if (!jobState || !isSettled(jobState) || jobState.state === "stopped" || isExecLaunch(jobState)) return;
    await writeStateAtomic(
      r,
      {
        ...jobState,
        state: "stopped",
        updatedAt: new Date().toISOString(),
      },
      o,
    );
  } catch (error) {
    logForDebugging(`stop not recorded on the job's row: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
export { markJobStoppedOnRow };
