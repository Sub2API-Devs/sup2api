/**
 * cli/handlers/agentsJson.ts
 *
 * 2.1.316 新增：claude agents --json 的代理列表输出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xejzdb.js (2)
 * attribution: placement 2
 */
import { resolve, relative, isAbsolute } from "path";
import { canonicalizePath } from "../../utils/sessionStoragePortable.js";
import { getRealPathOptions } from "../../utils/sessionStorage.js";
import { listAllLiveSessions } from "../../utils/udsMessaging/udsClient.js";
import {
  listJobs,
  markCrashed,
  spawnOrigin,
  terminalOutcome,
  isSettled,
  isSelfDriving,
} from "../../services/daemon/jobState.js";
import { listAliveDaemonJobs } from "../../daemon/jobs/killJob.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { Dr } from "../../utils/stringUtils.js";
import { getAgentStatuses } from "../../utils/tasks.js";
import { writeStdoutAndDrain } from "../exit.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-p7xejzdb.js:12860-14282 placement
async function listAgentsJson(i, s, n) {
  let d = i ? await canonicalizePath(resolve(i), getRealPathOptions(n)) : void 0;
  function c(t) {
    if (!d) return !0;
    let e = relative(d, t);
    return e.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(e);
  }
  let [u, b, w] = await Promise.all([listAllLiveSessions(n), listJobs(void 0, n), listAliveDaemonJobs(n)]),
    a = new Map();
  for (let t of u) if (t.kind === "bg" && t.jobId) a.set(t.jobId, t);
  let f = new Set(w.shorts);
  for (let t of a.keys()) f.add(t);
  let o = [],
    l = new Set();
  for (let t of markCrashed(b, f)) {
    let e = a.get(t.id);
    if (e) l.add(e.pid);
    if (!c(spawnOrigin(t.state))) continue;
    let r = agentJsonStatus(t.state, e?.status);
    if (!s && !e && r !== "working" && r !== "blocked") continue;
    let m = redactSecrets(Dr(e?.name ?? t.state.name ?? t.state.displayIntent ?? t.state.intent));
    o.push({
      ...(e && { pid: e.pid }),
      id: t.id,
      cwd: e?.cwd ?? t.state.cwd,
      kind: "background",
      startedAt: e?.startedAt ?? Date.parse(t.state.createdAt),
      sessionId: e?.sessionId ?? t.state.sessionId,
      ...(m && { name: m }),
      ...(e?.status && { status: getAgentStatuses(e.status) }),
      ...(e?.status === "waiting" && e.waitingFor && { waitingFor: e.waitingFor }),
      state: r,
    });
  }
  for (let t of u) {
    if ((t.kind !== "interactive" && t.kind !== "bg") || l.has(t.pid)) continue;
    if (t.kind === "bg" && t.jobId) continue;
    if (t.parkedJobId !== void 0) continue;
    if (!c(t.cwd)) continue;
    let e = t.name && redactSecrets(Dr(t.name));
    o.push({
      pid: t.pid,
      cwd: t.cwd,
      kind: t.kind === "bg" ? "background" : "interactive",
      startedAt: t.startedAt,
      ...(t.sessionId && { sessionId: t.sessionId }),
      ...(e && { name: e }),
      ...(t.status && { status: getAgentStatuses(t.status) }),
      ...(t.status === "waiting" && t.waitingFor && { waitingFor: t.waitingFor }),
    });
  }
  (o.sort((t, e) => t.startedAt - e.startedAt),
    await writeStdoutAndDrain(
      jsonStringify(o, null, 2) +
        `
`,
    ),
    logFeatureOk("cli_agents_json"));
}
//@ chunk-p7xejzdb.js:14352-14581 placement
function agentJsonStatus(agent, activity) {
  if (activity === "busy") return "working";
  let n = terminalOutcome(agent.state);
  if (isSettled(agent) && !(n === "success" && isSelfDriving(agent)))
    return n === "success" ? "done" : n === "failure" ? "failed" : "stopped";
  if (agent.tempo === "blocked" || activity === "waiting") return "blocked";
  return "working";
}
