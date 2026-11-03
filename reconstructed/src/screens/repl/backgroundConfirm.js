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
import { markDetachedSinceAttach } from "../../utils/attachStamp.js";
import { daemonDetachApc } from "../../services/daemon/leaseProtocol.js";
import { slugifySessionName } from "../../utils/sessionAddresses.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { collapseWhitespace, truncateToLength, plural } from "../../utils/stringUtils.js";
import { MAX_SEED_NAME_CHARS } from "../../utils/swarm/teammateIds.js";
import { withTimeout } from "../../utils/sleep.js";
import { listJobs } from "../../services/daemon/jobState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-18hwfzwa.js:60922-61089 placement
function sendDetachRequest(h) {
  if (!isDaemonBgWorker()) return;
  let x = h?.message ?? formatDetachedTaskNotice();
  if (
    sendRv({
      type: "detach-request",
      msg: x,
      broadcast: h?.broadcast,
    })
  ) {
    markDetachedSinceAttach();
    return;
  }
  process.stdout.write(daemonDetachApc(x));
  markDetachedSinceAttach();
}
//@ chunk-18hwfzwa.js:61089-61113 placement
/**
 * 导出函数 `alwaysFalseBackgroundConfirm`：返回 !1。
 */
function alwaysFalseBackgroundConfirm() {
  return false;
}
//@ chunk-18hwfzwa.js:61113-61137 placement
function alwaysFalseB() {
  return false;
}
//@ chunk-18hwfzwa.js:61137-61160 placement
/**
 * 导出函数 `noopBackgroundConfirm`：参数 h。
 */
function noopBackgroundConfirm(h) {
  return;
}
//@ chunk-18hwfzwa.js:61160-61202 placement
var SEED_NAME_WITH_COUNT_RE = /^(.*\S) \((\d{1,6})\)$/;
var LIST_JOBS_TIMEOUT_MS = 1500;
//@ chunk-18hwfzwa.js:61202-61303 placement
/**
 * 解析 “名字 (N)” 的基名与代数。
 */
function parseGenerationSuffix(h) {
  let match = SEED_NAME_WITH_COUNT_RE.exec(h);
  return match
    ? {
        base: match[1],
        generation: Number(match[2]),
      }
    : {
        base: h,
        generation: 1,
      };
}
//@ chunk-18hwfzwa.js:61303-61615 placement
/**
 * 名称已被占用时生成 “基名 (N)” 的新名字。
 */
function uniqueSeedName(name, x) {
  let D = slugifySessionName(name);
  let { base } = parseGenerationSuffix(name);
  let ee = slugifySessionName(base);
  let ke = new Set();
  let Re = 1;
  for (let He of x) {
    ke.add(slugifySessionName(He));
    let generationSuffix = parseGenerationSuffix(He);
    if (slugifySessionName(generationSuffix.base) === ee) Re = Math.max(Re, generationSuffix.generation);
  }
  if (!ke.has(D)) return name;
  let Be = redactSecrets(collapseWhitespace(base));
  for (let idx = Re + 1; ; idx++) {
    let We = ` (${idx})`;
    let ze = `${truncateToLength(Be, MAX_SEED_NAME_CHARS - We.length)}${We}`;
    if (!ke.has(slugifySessionName(ze))) return ze;
  }
}
//@ chunk-18hwfzwa.js:61615-61924 placement
async function settleSeedName(h, x) {
  if (!h.name) return h;
  let D;
  try {
    D = (await withTimeout(listJobs(undefined, x), LIST_JOBS_TIMEOUT_MS, "seed name settle")).flatMap((ke) =>
      ke.state.name ? [ke.state.name] : [],
    );
  } catch (error) {
    logForDebugging(`[background] seed name settle skipped: ${errorMessage(error)}`);
    return h;
  }
  let L = uniqueSeedName(h.name, D);
  if (L === h.name) return h;
  return {
    ...h,
    name: L,
    nameSource: "collision",
  };
}
//@ chunk-18hwfzwa.js:61924-62182 placement
function artifactRepliesStopNotice(h) {
  if (h === 0) return "";
  return `Automatic replies to ${h === 1 ? "Artifact comments" : `comments on ${h} Artifacts`} keep going in the background session, where you won't see each reply as it's posted. You'll see a summary of the replies when you return.`;
}
//@ chunk-18hwfzwa.js:62182-62507 placement
function describeCarriedTasks({ running, finished, rerun }) {
  if (running === 0) return "";
  let L =
    finished > 0
      ? `; ${finished} finished ${plural(finished, "subagent")} ${finished === 1 ? "is" : "are"} kept`
      : "";
  let ee =
    rerun > 0 ? `; ${rerun} that finished after a failed one ${rerun === 1 ? "runs" : "run"} again` : "";
  return `${running} running workflow ${plural(running, "subagent")} ${running === 1 ? "restarts" : "restart"} from the beginning${L}${ee}.`;
}
//@ chunk-18hwfzwa.js:62507-62719 placement
function backgroundAnywayLabel(h, workflowAgents) {
  if (h) return "Background anyway (tasks will be stopped)";
  let D = workflowAgents.running + workflowAgents.rerun;
  if (workflowAgents.running > 0)
    return `Background anyway (${D} ${plural(D, "subagent")} ${D === 1 ? "restarts" : "restart"})`;
  return "Background";
}
//@ chunk-18hwfzwa.js:62719-63754 placement
/**
 * 后台化（← 进入 agents 视图 / /background）前的确认对话框：列出将被停止的任务与可带到后台会话的任务数，选项 Stay / Background anyway。
 */
function BackgroundConfirmDialog(props) {
  let $ = w(20);
  let { summary, carryOverCount, monitorParkCount, workflowAgents, onConfirm, onCancel } = props;
  const Be = summary ? `${summary} running \u2014 they will be stopped.` : "";
  let We;
  if ($[0] !== monitorParkCount) {
    We = artifactRepliesStopNotice(monitorParkCount);
    $[0] = monitorParkCount;
    $[1] = We;
  } else We = $[1];
  const ze =
    carryOverCount > 0
      ? `${carryOverCount} ${carryOverCount === 1 ? "task carries" : "tasks carry"} over to the background session.`
      : "";
  let Xe;
  if ($[2] !== workflowAgents) {
    Xe = describeCarriedTasks(workflowAgents);
    $[2] = workflowAgents;
    $[3] = Xe;
  } else Xe = $[3];
  let rt;
  if ($[4] !== Be || $[5] !== We || $[6] !== ze || $[7] !== Xe) {
    rt = [Be, We, ze, Xe].filter(Boolean);
    $[4] = Be;
    $[5] = We;
    $[6] = ze;
    $[7] = Xe;
    $[8] = rt;
  } else rt = $[8];
  const subtitle = rt.join(" ");
  const It = summary !== "";
  let confirmLabel;
  if ($[9] !== It || $[10] !== workflowAgents) {
    confirmLabel = backgroundAnywayLabel(It, workflowAgents);
    $[9] = It;
    $[10] = workflowAgents;
    $[11] = confirmLabel;
  } else confirmLabel = $[11];
  let children;
  if ($[12] !== onCancel || $[13] !== onConfirm || $[14] !== confirmLabel) {
    children = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "Stay",
      onConfirm,
      onCancel,
    });
    $[12] = onCancel;
    $[13] = onConfirm;
    $[14] = confirmLabel;
    $[15] = children;
  } else children = $[15];
  let Dt;
  if ($[16] !== onCancel || $[17] !== subtitle || $[18] !== children) {
    Dt = jsxProd_default(Dialog, {
      title: "Background this session?",
      subtitle,
      onCancel,
      children,
    });
    $[16] = onCancel;
    $[17] = subtitle;
    $[18] = children;
    $[19] = Dt;
  } else Dt = $[19];
  return Dt;
}
//@ chunk-18hwfzwa.js:63754-63795 placement
function selectSessionEffort(mr) {
  return mr.sessionEffort;
}
export {
  sendDetachRequest,
  noopBackgroundConfirm,
  artifactRepliesStopNotice,
  settleSeedName,
  describeCarriedTasks,
  selectSessionEffort,
  backgroundAnywayLabel,
  alwaysFalseBackgroundConfirm,
  alwaysFalseB,
  BackgroundConfirmDialog,
};
