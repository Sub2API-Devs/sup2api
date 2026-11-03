/**
 * screens/repl/backgroundConfirm.ts
 *
 * 2.1.316 新增。转入后台的确认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: placement 13
 */
import { isDaemonBgWorker } from "../../utils/concurrentSessions.js";
import { formatDetachedTaskNotice } from "../../tasks/backgroundTaskLabels.js";
import { sendRv } from "../../services/daemon/rendezvous.js";
import { aon } from "../../utils/attachStamp.js";
import { daemonDetachApc } from "../../services/daemon/leaseProtocol.js";
import { slugifySessionName } from "../../utils/sessionAddresses.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { Dr, truncateToLength, plural } from "../../utils/stringUtils.js";
import { ND } from "../../utils/swarm/teammateIds.js";
import { withTimeout } from "../../utils/sleep.js";
import { listJobs } from "../../services/daemon/jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-18hwfzwa.js:60922-61089 placement
function sendDetachRequest(h) {
  if (!isDaemonBgWorker()) return;
  let x = h?.message ?? formatDetachedTaskNotice();
  if (sendRv({ type: "detach-request", msg: x, broadcast: h?.broadcast })) {
    aon();
    return;
  }
  (process.stdout.write(daemonDetachApc(x)), aon());
}
//@ chunk-18hwfzwa.js:61089-61113 placement
function T0n() {
  return !1;
}
//@ chunk-18hwfzwa.js:61113-61137 placement
function Sre() {
  return !1;
}
//@ chunk-18hwfzwa.js:61137-61160 placement
function tce(h) {
  return;
}
//@ chunk-18hwfzwa.js:61160-61202 placement
var mMt = /^(.*\S) \((\d{1,6})\)$/,
  pMt = 1500;
/**
 * 解析 “名字 (N)” 的基名与代数。
 */
//@ chunk-18hwfzwa.js:61202-61303 placement
function parseGenerationSuffix(h) {
  let match = mMt.exec(h);
  return match ? { base: match[1], generation: Number(match[2]) } : { base: h, generation: 1 };
}
/**
 * 名称已被占用时生成 “基名 (N)” 的新名字。
 */
//@ chunk-18hwfzwa.js:61303-61615 placement
function uniqueSeedName(h, x) {
  let D = slugifySessionName(h),
    { base: base } = parseGenerationSuffix(h),
    ee = slugifySessionName(base),
    ke = new Set(),
    Re = 1;
  for (let He of x) {
    ke.add(slugifySessionName(He));
    let We = parseGenerationSuffix(He);
    if (slugifySessionName(We.base) === ee) Re = Math.max(Re, We.generation);
  }
  if (!ke.has(D)) return h;
  let Be = redactSecrets(Dr(base));
  for (let He = Re + 1; ; He++) {
    let We = ` (${He})`,
      ze = `${truncateToLength(Be, ND - We.length)}${We}`;
    if (!ke.has(slugifySessionName(ze))) return ze;
  }
}
//@ chunk-18hwfzwa.js:61615-61924 placement
async function settleSeedName(h, x) {
  if (!h.name) return h;
  let D;
  try {
    D = (await withTimeout(listJobs(void 0, x), pMt, "seed name settle")).flatMap((ke) =>
      ke.state.name ? [ke.state.name] : [],
    );
  } catch (error) {
    return (logForDebugging(`[background] seed name settle skipped: ${errorMessage(error)}`), h);
  }
  let L = uniqueSeedName(h.name, D);
  if (L === h.name) return h;
  return { ...h, name: L, nameSource: "collision" };
}
//@ chunk-18hwfzwa.js:61924-62182 placement
function artifactRepliesStopNotice(h) {
  if (h === 0) return "";
  return `Automatic replies to ${h === 1 ? "Artifact comments" : `comments on ${h} Artifacts`} keep going in the background session, where you won't see each reply as it's posted. You'll see a summary of the replies when you return.`;
}
//@ chunk-18hwfzwa.js:62182-62507 placement
function describeCarriedTasks({ running: running, finished: finished, rerun: rerun }) {
  if (running === 0) return "";
  let L =
      finished > 0
        ? `; ${finished} finished ${plural(finished, "subagent")} ${finished === 1 ? "is" : "are"} kept`
        : "",
    ee = rerun > 0 ? `; ${rerun} that finished after a failed one ${rerun === 1 ? "runs" : "run"} again` : "";
  return `${running} running workflow ${plural(running, "subagent")} ${running === 1 ? "restarts" : "restart"} from the beginning${L}${ee}.`;
}
//@ chunk-18hwfzwa.js:62507-62719 placement
function backgroundAnywayLabel(h, x) {
  if (h) return "Background anyway (tasks will be stopped)";
  let D = x.running + x.rerun;
  if (x.running > 0)
    return `Background anyway (${D} ${plural(D, "subagent")} ${D === 1 ? "restarts" : "restart"})`;
  return "Background";
}
/**
 * 后台化（← 进入 agents 视图 / /background）前的确认对话框：列出将被停止的任务与可带到后台会话的任务数，选项 Stay / Background anyway。
 */
//@ chunk-18hwfzwa.js:62719-63754 placement
function BackgroundConfirmDialog(h) {
  let $ = w(20),
    {
      summary: summary,
      carryOverCount: carryOverCount,
      monitorParkCount: monitorParkCount,
      workflowAgents: workflowAgents,
      onConfirm: onConfirm,
      onCancel: onCancel,
    } = h;
  const Be = summary ? `${summary} running \u2014 they will be stopped.` : "";
  let We;
  if ($[0] !== monitorParkCount)
    ((We = artifactRepliesStopNotice(monitorParkCount)), ($[0] = monitorParkCount), ($[1] = We));
  else We = $[1];
  const ze =
    carryOverCount > 0
      ? `${carryOverCount} ${carryOverCount === 1 ? "task carries" : "tasks carry"} over to the background session.`
      : "";
  let Xe;
  if ($[2] !== workflowAgents)
    ((Xe = describeCarriedTasks(workflowAgents)), ($[2] = workflowAgents), ($[3] = Xe));
  else Xe = $[3];
  let rt;
  if ($[4] !== Be || $[5] !== We || $[6] !== ze || $[7] !== Xe)
    ((rt = [Be, We, ze, Xe].filter(Boolean)),
      ($[4] = Be),
      ($[5] = We),
      ($[6] = ze),
      ($[7] = Xe),
      ($[8] = rt));
  else rt = $[8];
  const joined = rt.join(" "),
    It = summary !== "";
  let Ot;
  if ($[9] !== It || $[10] !== workflowAgents)
    ((Ot = backgroundAnywayLabel(It, workflowAgents)), ($[9] = It), ($[10] = workflowAgents), ($[11] = Ot));
  else Ot = $[11];
  let Et;
  if ($[12] !== onCancel || $[13] !== onConfirm || $[14] !== Ot)
    ((Et = e(ConfirmSelect, {
      confirmLabel: Ot,
      cancelLabel: "Stay",
      onConfirm: onConfirm,
      onCancel: onCancel,
    })),
      ($[12] = onCancel),
      ($[13] = onConfirm),
      ($[14] = Ot),
      ($[15] = Et));
  else Et = $[15];
  let Dt;
  if ($[16] !== onCancel || $[17] !== joined || $[18] !== Et)
    ((Dt = e(Dialog, {
      title: "Background this session?",
      subtitle: joined,
      onCancel: onCancel,
      children: Et,
    })),
      ($[16] = onCancel),
      ($[17] = joined),
      ($[18] = Et),
      ($[19] = Dt));
  else Dt = $[19];
  return Dt;
}
//@ chunk-18hwfzwa.js:63754-63795 placement
function selectSessionEffort(mr) {
  return mr.sessionEffort;
}

export {
  sendDetachRequest,
  tce,
  artifactRepliesStopNotice,
  settleSeedName,
  describeCarriedTasks,
  selectSessionEffort,
  backgroundAnywayLabel,
  T0n,
  Sre,
  BackgroundConfirmDialog,
};
