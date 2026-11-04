/**
 * utils/background/stopBackgroundSession.ts
 *
 * 2.1.316 新增：停止后台会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8vcdnkwr.js (2)
 * attribution: placement 2
 */
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { getSessionId, announcePendingLoopWakeup } from "../../bootstrap/state.js";
import { isBgSession, isDaemonBgWorker } from "../concurrentSessions.js";
import {
  readJobState,
  isSettled,
  writeStateAtomic,
  logJobWriteError,
} from "../../services/daemon/jobState.js";
import { markJobStoppedOnRow } from "../../services/daemon/jobRow.js";
import { daemonDetachApc } from "../../services/daemon/leaseProtocol.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { gracefulShutdown } from "../gracefulShutdown.js";

//@ chunk-8vcdnkwr.js:570-607 placement
/**
 * 返回后台任务的目录（环境变量 CLAUDE_JOB_DIR）。
 */
function jobDir() {
  return env.CLAUDE_JOB_DIR;
}
//@ chunk-8vcdnkwr.js:607-1141 placement
/**
 * 停止当前后台会话：记录 tengu_bg_agent_action（stop），取消待定的 loop 唤醒；在后台会话中把未结束的任务状态写为 stopped 后再退出。
 */
async function stopBackgroundSession(source, sessionId, finalMessage) {
  logEvent("tengu_bg_agent_action", {
    action: lit("stop"),
    source: fromEnum(source),
    jobSessionId: sanitizeMarkName(getSessionId()),
  });
  announcePendingLoopWakeup(undefined);
  let jobDirPath = jobDir();
  if (isBgSession() && jobDirPath) {
    let iso = new Date().toISOString();
    let jobState = await readJobState(jobDirPath, sessionId);
    if (jobState && !isSettled(jobState))
      await writeStateAtomic(
        jobDirPath,
        {
          ...jobState,
          state: "stopped",
          detail: "stopped from session",
          tempo: "idle",
          needs: undefined,
          block: undefined,
          inFlight: undefined,
          updatedAt: iso,
          firstTerminalAt: jobState.firstTerminalAt ?? iso,
        },
        sessionId,
      ).catch(logJobWriteError);
    else await markJobStoppedOnRow(jobDirPath, sessionId);
    if (isDaemonBgWorker()) process.stdout.write(daemonDetachApc(finalMessage ?? "Session stopped."));
  }
  logFeatureOk("job_stop_self");
  return gracefulShutdown(0, "prompt_input_exit", {
    suppressResumeHint: true,
  });
}
export { stopBackgroundSession };
