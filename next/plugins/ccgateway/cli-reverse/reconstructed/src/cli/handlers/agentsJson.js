/**
 * cli/handlers/agentsJson.ts
 *
 * 2.1.316 新增：claude agents --json 的代理列表输出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h8f0wgnn.js (2)
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
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { getAgentStatuses } from "../../utils/tasks.js";
import { writeStdoutAndDrain } from "../exit.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-h8f0wgnn.js:14069-15491 placement
async function listAgentsJson(cwd, all, storage) {
  let realCwd = cwd ? await canonicalizePath(resolve(cwd), getRealPathOptions(storage)) : undefined;
  function isUnderCwd(path) {
    if (!realCwd) return true;
    let rel = relative(realCwd, path);
    return rel.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(rel);
  }
  let [liveSessions, jobs, daemonJobs] = await Promise.all([
    listAllLiveSessions(storage),
    listJobs(undefined, storage),
    listAliveDaemonJobs(storage),
  ]);
  let liveByJobId = new Map();
  for (let session of liveSessions)
    if (session.kind === "bg" && session.jobId) liveByJobId.set(session.jobId, session);
  let aliveShorts = new Set(daemonJobs.shorts);
  for (let key of liveByJobId.keys()) aliveShorts.add(key);
  let entries = [];
  let coveredPids = new Set();
  for (let job of markCrashed(jobs, aliveShorts)) {
    let live = liveByJobId.get(job.id);
    if (live) coveredPids.add(live.pid);
    if (!isUnderCwd(spawnOrigin(job.state))) continue;
    let state = agentJsonStatus(job.state, live?.status);
    if (!all && !live && state !== "working" && state !== "blocked") continue;
    let name = redactSecrets(
      collapseWhitespace(live?.name ?? job.state.name ?? job.state.displayIntent ?? job.state.intent),
    );
    entries.push({
      ...(live && {
        pid: live.pid,
      }),
      id: job.id,
      cwd: live?.cwd ?? job.state.cwd,
      kind: "background",
      startedAt: live?.startedAt ?? Date.parse(job.state.createdAt),
      sessionId: live?.sessionId ?? job.state.sessionId,
      ...(name && {
        name,
      }),
      ...(live?.status && {
        status: getAgentStatuses(live.status),
      }),
      ...(live?.status === "waiting" &&
        live.waitingFor && {
          waitingFor: live.waitingFor,
        }),
      state,
    });
  }
  for (let session of liveSessions) {
    if ((session.kind !== "interactive" && session.kind !== "bg") || coveredPids.has(session.pid)) continue;
    if (session.kind === "bg" && session.jobId) continue;
    if (session.parkedJobId !== undefined) continue;
    if (!isUnderCwd(session.cwd)) continue;
    let name = session.name && redactSecrets(collapseWhitespace(session.name));
    entries.push({
      pid: session.pid,
      cwd: session.cwd,
      kind: session.kind === "bg" ? "background" : "interactive",
      startedAt: session.startedAt,
      ...(session.sessionId && {
        sessionId: session.sessionId,
      }),
      ...(name && {
        name,
      }),
      ...(session.status && {
        status: getAgentStatuses(session.status),
      }),
      ...(session.status === "waiting" &&
        session.waitingFor && {
          waitingFor: session.waitingFor,
        }),
    });
  }
  entries.sort((a, b) => a.startedAt - b.startedAt);
  await writeStdoutAndDrain(
    jsonStringify(entries, null, 2) +
      `
`,
  );
  logFeatureOk("cli_agents_json");
}
//@ chunk-h8f0wgnn.js:15561-15790 placement
function agentJsonStatus(agent, activity) {
  if (activity === "busy") return "working";
  let outcome = terminalOutcome(agent.state);
  if (isSettled(agent) && !(outcome === "success" && isSelfDriving(agent)))
    return outcome === "success" ? "done" : outcome === "failure" ? "failed" : "stopped";
  if (agent.tempo === "blocked" || activity === "waiting") return "blocked";
  return "working";
}
export { listAgentsJson };
