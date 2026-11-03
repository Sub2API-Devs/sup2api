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
import { ye } from "../startupMarks.js";
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
function p() {
  return env.CLAUDE_JOB_DIR;
}
/**
 * 停止当前后台会话：记录 tengu_bg_agent_action（stop），取消待定的 loop 唤醒；在后台会话中把未结束的任务状态写为 stopped 后再退出。
 */
//@ chunk-8vcdnkwr.js:607-1141 placement
async function stopBackgroundSession(source, sessionId, s) {
  (logEvent("tengu_bg_agent_action", {
    action: lit("stop"),
    source: fromEnum(source),
    jobSessionId: ye(getSessionId()),
  }),
    announcePendingLoopWakeup(void 0));
  let o = p();
  if (isBgSession() && o) {
    let iso = new Date().toISOString(),
      t = await readJobState(o, sessionId);
    if (t && !isSettled(t))
      await writeStateAtomic(
        o,
        {
          ...t,
          state: "stopped",
          detail: "stopped from session",
          tempo: "idle",
          needs: void 0,
          block: void 0,
          inFlight: void 0,
          updatedAt: iso,
          firstTerminalAt: t.firstTerminalAt ?? iso,
        },
        sessionId,
      ).catch(logJobWriteError);
    else await markJobStoppedOnRow(o, sessionId);
    if (isDaemonBgWorker()) process.stdout.write(daemonDetachApc(s ?? "Session stopped."));
  }
  return (
    logFeatureOk("job_stop_self"),
    gracefulShutdown(0, "prompt_input_exit", { suppressResumeHint: !0 })
  );
}

export { stopBackgroundSession };
