/**
 * screens/repl/backgroundConfirm.ts
 *
 * 2.1.316 新增。转入后台的确认。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (13)
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-czq1j3j2.js:61467-61634 placement
function sendDetachRequest(options) {
  if (!isDaemonBgWorker()) return;
  let message = options?.message ?? formatDetachedTaskNotice();
  if (
    sendRv({
      type: "detach-request",
      msg: message,
      broadcast: options?.broadcast,
    })
  ) {
    markDetachedSinceAttach();
    return;
  }
  process.stdout.write(daemonDetachApc(message));
  markDetachedSinceAttach();
}
//@ chunk-czq1j3j2.js:61634-61658 placement
/**
 * 导出函数 `alwaysFalseBackgroundConfirm`：返回 !1。
 */
function alwaysFalseBackgroundConfirm() {
  return false;
}
//@ chunk-czq1j3j2.js:61658-61682 placement
function alwaysFalseB() {
  return false;
}
//@ chunk-czq1j3j2.js:61682-61705 placement
/**
 * 导出函数 `noopBackgroundConfirm`：参数 h。
 */
function noopBackgroundConfirm(request) {
  return;
}
//@ chunk-czq1j3j2.js:61705-61747 placement
var SEED_NAME_WITH_COUNT_RE = /^(.*\S) \((\d{1,6})\)$/;
var LIST_JOBS_TIMEOUT_MS = 1500;
//@ chunk-czq1j3j2.js:61747-61848 placement
/**
 * 解析 “名字 (N)” 的基名与代数。
 */
function parseGenerationSuffix(name) {
  let match = SEED_NAME_WITH_COUNT_RE.exec(name);
  return match
    ? {
        base: match[1],
        generation: Number(match[2]),
      }
    : {
        base: name,
        generation: 1,
      };
}
//@ chunk-czq1j3j2.js:61848-62159 placement
/**
 * 名称已被占用时生成 “基名 (N)” 的新名字。
 */
function uniqueSeedName(name, takenNames) {
  let slug = slugifySessionName(name);
  let { base } = parseGenerationSuffix(name);
  let baseSlug = slugifySessionName(base);
  let takenSlugs = new Set();
  let maxGeneration = 1;
  for (let takenName of takenNames) {
    takenSlugs.add(slugifySessionName(takenName));
    let generationSuffix = parseGenerationSuffix(takenName);
    if (slugifySessionName(generationSuffix.base) === baseSlug)
      maxGeneration = Math.max(maxGeneration, generationSuffix.generation);
  }
  if (!takenSlugs.has(slug)) return name;
  let safeBase = redactSecrets(collapseWhitespace(base));
  for (let idx = maxGeneration + 1; ; idx++) {
    let suffix = ` (${idx})`;
    let candidate = `${truncateToLength(safeBase, MAX_SEED_NAME_CHARS - suffix.length)}${suffix}`;
    if (!takenSlugs.has(slugifySessionName(candidate))) return candidate;
  }
}
//@ chunk-czq1j3j2.js:62159-62468 placement
async function settleSeedName(seed, store) {
  if (!seed.name) return seed;
  let existingNames;
  try {
    existingNames = (
      await withTimeout(listJobs(undefined, store), LIST_JOBS_TIMEOUT_MS, "seed name settle")
    ).flatMap((job) => (job.state.name ? [job.state.name] : []));
  } catch (error) {
    logForDebugging(`[background] seed name settle skipped: ${errorMessage(error)}`);
    return seed;
  }
  let settledName = uniqueSeedName(seed.name, existingNames);
  if (settledName === seed.name) return seed;
  return {
    ...seed,
    name: settledName,
    nameSource: "collision",
  };
}
//@ chunk-czq1j3j2.js:62468-62726 placement
function artifactRepliesStopNotice(artifactCount) {
  if (artifactCount === 0) return "";
  return `Automatic replies to ${artifactCount === 1 ? "Artifact comments" : `comments on ${artifactCount} Artifacts`} keep going in the background session, where you won't see each reply as it's posted. You'll see a summary of the replies when you return.`;
}
//@ chunk-czq1j3j2.js:62726-63051 placement
function describeCarriedTasks({ running, finished, rerun }) {
  if (running === 0) return "";
  let finishedNotice =
    finished > 0
      ? `; ${finished} finished ${plural(finished, "subagent")} ${finished === 1 ? "is" : "are"} kept`
      : "";
  let rerunNotice =
    rerun > 0 ? `; ${rerun} that finished after a failed one ${rerun === 1 ? "runs" : "run"} again` : "";
  return `${running} running workflow ${plural(running, "subagent")} ${running === 1 ? "restarts" : "restart"} from the beginning${finishedNotice}${rerunNotice}.`;
}
//@ chunk-czq1j3j2.js:63051-63263 placement
function backgroundAnywayLabel(tasksWillStop, workflowAgents) {
  if (tasksWillStop) return "Background anyway (tasks will be stopped)";
  let subagentCount = workflowAgents.running + workflowAgents.rerun;
  if (workflowAgents.running > 0)
    return `Background anyway (${subagentCount} ${plural(subagentCount, "subagent")} ${subagentCount === 1 ? "restarts" : "restart"})`;
  return "Background";
}
//@ chunk-czq1j3j2.js:63263-64298 placement
/**
 * 后台化（← 进入 agents 视图 / /background）前的确认对话框：列出将被停止的任务与可带到后台会话的任务数，选项 Stay / Background anyway。
 */
function BackgroundConfirmDialog(props) {
  let $ = useMemoCache(20);
  let { summary, carryOverCount, monitorParkCount, workflowAgents, onConfirm, onCancel } = props;
  const summaryNotice = summary ? `${summary} running \u2014 they will be stopped.` : "";
  let artifactNotice;
  if ($[0] !== monitorParkCount) {
    artifactNotice = artifactRepliesStopNotice(monitorParkCount);
    $[0] = monitorParkCount;
    $[1] = artifactNotice;
  } else artifactNotice = $[1];
  const taskNotice =
    carryOverCount > 0
      ? `${carryOverCount} ${carryOverCount === 1 ? "task carries" : "tasks carry"} over to the background session.`
      : "";
  let carriedTasksNotice;
  if ($[2] !== workflowAgents) {
    carriedTasksNotice = describeCarriedTasks(workflowAgents);
    $[2] = workflowAgents;
    $[3] = carriedTasksNotice;
  } else carriedTasksNotice = $[3];
  let notices;
  if (
    $[4] !== summaryNotice ||
    $[5] !== artifactNotice ||
    $[6] !== taskNotice ||
    $[7] !== carriedTasksNotice
  ) {
    notices = [summaryNotice, artifactNotice, taskNotice, carriedTasksNotice].filter(Boolean);
    $[4] = summaryNotice;
    $[5] = artifactNotice;
    $[6] = taskNotice;
    $[7] = carriedTasksNotice;
    $[8] = notices;
  } else notices = $[8];
  const subtitle = notices.join(" ");
  const hasSummary = summary !== "";
  let confirmLabel;
  if ($[9] !== hasSummary || $[10] !== workflowAgents) {
    confirmLabel = backgroundAnywayLabel(hasSummary, workflowAgents);
    $[9] = hasSummary;
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
  let dialog;
  if ($[16] !== onCancel || $[17] !== subtitle || $[18] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Background this session?",
      subtitle,
      onCancel,
      children,
    });
    $[16] = onCancel;
    $[17] = subtitle;
    $[18] = children;
    $[19] = dialog;
  } else dialog = $[19];
  return dialog;
}
//@ chunk-czq1j3j2.js:64298-64339 placement
function selectSessionEffort(state) {
  return state.sessionEffort;
}
export {
  noopBackgroundConfirm,
  sendDetachRequest,
  artifactRepliesStopNotice,
  settleSeedName,
  describeCarriedTasks,
  selectSessionEffort,
  backgroundAnywayLabel,
  alwaysFalseBackgroundConfirm,
  alwaysFalseB,
  BackgroundConfirmDialog,
};
