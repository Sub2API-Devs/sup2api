/**
 * plugins/functionHooks/_new/_new/agentDisplayStatus.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { FLAG_IDLE_WINDOW } from "../../../../tasks/LocalAgentTask/keepalive.js";

/**
 * 把代理/队友任务状态映射为对外状态：running 时区分等待/空闲，completed 时按保活原因与是否在收尾区分 running/waiting/idle/completed，paused→idle。
 */
//@ chunk-e6aww6q8.js:3750768-3751183 sole-consumer-new
function agentDisplayStatus(e, n) {
  let r = e.type === "in_process_teammate";
  switch (e.status) {
    case "running": {
      let s = (r ? e.awaitingPlanApproval : e.isIdle) === !0,
        h = e.isIdle === !0;
      return s ? "waiting" : h ? "idle" : "running";
    }
    case "completed": {
      let s = r ? [] : [...(e.keepaliveReasons ?? [])],
        h = !r && e.finalizing === !0,
        any = s.some((w) => w !== FLAG_IDLE_WINDOW),
        S = !r && (n || s.length > 0);
      return h ? "running" : any ? "waiting" : S ? "idle" : "completed";
    }
    case "paused":
      return "idle";
    default:
      return e.status;
  }
}

export { agentDisplayStatus };
