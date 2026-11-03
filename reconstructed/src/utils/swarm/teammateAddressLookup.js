/**
 * utils/swarm/teammateAddressLookup.ts
 *
 * 2.1.316 新增：解析队友地址（任务、名字匹配）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (5)
 * attribution: placement 5
 */
import { Zn } from "../../tasks/MonitorMcpTask/MonitorMcpTask.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import {
  resolveTeammateTask,
  getRunningTeammatesSorted,
  fuzzyResolveAgentByName,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { getSelectableBackgroundTasks } from "../../tasks/stopTask.js";
import { slugifySessionName } from "../sessionAddresses.js";
import { singleLineText } from "../printableName.js";

//@ chunk-kxyd0g16.js:18315-18351 placement
function Vgt(e) {
  return Zn.lookup(e);
}
//@ chunk-kxyd0g16.js:18351-18393 placement
function Re(e) {
  return !isTerminalTaskStatus(e.status) || isWaitingOnChildren(e);
}
/**
 * 解析队友地址（任务、名字匹配）。
 */
//@ chunk-kxyd0g16.js:18393-19289 placement
function resolveTeammateAddress(e, r, n) {
  let all = r.all(),
    f = resolveTeammateTask(e, all),
    h = getSelectableBackgroundTasks((S) => S === e, r, n);
  if (f.status !== "not_found" && h) {
    let S = f.status === "found" ? [f.task.identity.agentId] : f.candidates,
      R = f.status === "found" ? Re(f.task) : f.anyLive;
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(e, S, h.id),
      anyLiveCandidate: R || Re(h),
    };
  }
  if (f.status === "ambiguous")
    return {
      status: "ambiguous",
      message: ambiguousTeammateMessage(e, f.candidates),
      anyLiveCandidate: f.anyLive,
    };
  if (f.status === "found") return { status: "found", task: f.task };
  if (h) return { status: "found", task: h };
  let y = slugifySessionName(e),
    k = getRunningTeammatesSorted(y, all),
    w = getSelectableBackgroundTasks((S) => slugifySessionName(S) === y, r, n);
  if (k.length > 0 && w)
    return {
      status: "ambiguous",
      message: teammateOrAgentAmbiguousMessage(
        e,
        k.map((S) => S.identity.agentId),
        w.id,
      ),
      anyLiveCandidate: k.some(Re) || Re(w),
    };
  if (k.length > 1)
    return {
      status: "ambiguous",
      message: ambiguousTeammateMessage(
        e,
        k.map((S) => S.identity.agentId),
      ),
      anyLiveCandidate: k.some(Re),
    };
  if (k.length === 1) return { status: "found", task: k[0] };
  if (w) return { status: "found", task: w };
  return { status: "not_found", suggestion: fuzzyResolveAgentByName(y, r, n) };
}
//@ chunk-kxyd0g16.js:19289-19418 placement
function ambiguousTeammateMessage(e, r) {
  return `Multiple teammates match "${singleLineText(e)}": ${r.map((n) => singleLineText(n)).join(", ")}. Use the full address (name@team).`;
}
//@ chunk-kxyd0g16.js:19418-19632 placement
function teammateOrAgentAmbiguousMessage(e, r, n) {
  return `"${singleLineText(e)}" matches both teammate ${r.map((s) => singleLineText(s)).join(", ")} and background agent ${singleLineText(n)}. Use the full address (name@team) for the teammate or the task ID for the background agent.`;
}

export { resolveTeammateAddress, Vgt };
