/**
 * services/daemon/jobRow.ts
 *
 * 后台作业行记录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6svdz69.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isColorCommandForceHidden } from "../../commands/color/index.js";
import { readJobState, isSettled, isExecLaunch, writeStateAtomic } from "./jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-v6svdz69.js:343-604 placement
/**
 * 在后台作业的状态行上记下 stopped（已结束、已停或 exec 启动的作业跳过），失败时记日志。
 */
async function markJobStoppedOnRow(jobDir, storageV5) {
  if (!isColorCommandForceHidden()) return;
  try {
    let jobState = await readJobState(jobDir, storageV5);
    if (!jobState || !isSettled(jobState) || jobState.state === "stopped" || isExecLaunch(jobState)) return;
    await writeStateAtomic(
      jobDir,
      {
        ...jobState,
        state: "stopped",
        updatedAt: new Date().toISOString(),
      },
      storageV5,
    );
  } catch (error) {
    logForDebugging(`stop not recorded on the job's row: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
export { markJobStoppedOnRow };
