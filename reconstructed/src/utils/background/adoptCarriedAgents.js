/**
 * utils/background/adoptCarriedAgents.ts
 *
 * 2.1.316 新增。接管随身代理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: placement 19
 */
import { join, dirname, basename } from "path";
import { formatTaskNotification } from "../xmlTags.js";
import { normalizeAgentIdOrNull, identityAgentId2 } from "../agentId.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import { readAgentMetadataAtPath, getAgentTranscriptPath, getAgentTranscript } from "../sessionStorage.js";
import { currentRestoreSource } from "../sessionRestore.js";
import { realpathNativeAsync } from "../windowsUncPaths.js";
import { planResumeOfBackgroundTasks } from "../../tasks/resumeOrphanedTasks.js";
import { sanitizeMetadataText } from "../agentMetadata.js";
import { registerResumedAgentPlaceholder } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import {
  linkAdoptedAgentTranscript,
  classifyAdoptLinkFailure,
  emitAdoptAgentFailed,
  emitAdoptWorkflowFailed,
} from "./adopt.js";
import { logForDebugging } from "../debug.js";
import { emitTaskNotification } from "../task/taskNotifications.js";
import { HiddenScriptShaCache } from "../../services/workflow/journalEntries.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:323945-324132 placement
var enqueueCarriedAgentFailure = (h, x) =>
  h.enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: x.taskId,
      status: "failed",
      summary: x.summary,
    }),
    agentId: x.agentId,
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
  });
//@ chunk-18hwfzwa.js:324132-324372 placement
var MAX_LISTED_CARRIED_AGENTS = 8;
var CARRIED_AGENT_ID_TAIL_CHARS = 16;
var CARRIED_NOT_RESUMED_TEXT = "was carried into this session and not resumed";
var CARRIED_UNCONFIRMED_TEXT =
  "this session could not confirm from its own records that its owner launched it and that it is still running. If it is yours, a message to it may continue it.";
var MAIN_OWNER_KEY = "";
//@ chunk-18hwfzwa.js:324372-325336 placement
async function reconcileCarriedAgents(h, fork, queue) {
  let carriedAgentsContext = createCarriedAgentsContext(fork, queue);
  let { depthOfParked } = carriedAgentsContext;
  let ke = [];
  let Re = new Set();
  let Be = new Set();
  let He = new Map();
  for (let ze of h.toSorted((Xe, rt) => (Xe.spawnDepth ?? 0) - (rt.spawnDepth ?? 0))) {
    let { agentId, parentAgentId } = ze;
    if (normalizeAgentIdOrNull(agentId) === null || Re.has(agentId)) {
      carriedAgentsContext.telemetryFailureCodes.add("adopt_agent_entry_dropped");
      continue;
    }
    let kt = parentAgentId === undefined ? 0 : depthOfParked.get(parentAgentId);
    let owner =
      parentAgentId !== undefined && kt !== undefined ? identityAgentId2(parentAgentId) : mainAgentId();
    let Ot = await takeUpCarriedAgentSafe(ze, kt, carriedAgentsContext);
    if (typeof Ot !== "string") {
      Re.add(agentId);
      He.delete(agentId);
      Be.delete(agentId);
      ke.push(Ot);
    } else if (Ot === "toldOfLink") {
      if (parentAgentId === undefined) Be.add(agentId);
    } else if (He.get(agentId)?.outcome !== "leftToReconcile")
      He.set(agentId, {
        owner,
        outcome: Ot,
      });
  }
  let We = new Map();
  for (let [ze, { owner: Xe, outcome: rt }] of He) {
    if (rt === "leftToReconcile") continue;
    if (rt === "handedBack") carriedAgentsContext.telemetryFailureCodes.add("adopt_agent_not_vouched");
    We.set(Xe, [...(We.get(Xe) ?? []), ze]);
    if (Xe === mainAgentId()) Be.add(ze);
  }
  for (let [agentId, Xe] of We) adoptFailureSummary(agentId, Xe, queue);
  for (let telemetryFailureCode of carriedAgentsContext.telemetryFailureCodes)
    logFeatureSad("task_local_agent", telemetryFailureCode);
  return {
    registered: ke,
    reported: Be,
  };
}
//@ chunk-18hwfzwa.js:325336-325446 placement
var createCarriedAgentsContext = (fork, queue) => ({
  fork,
  queue,
  launchesByOwner: new Map(),
  depthOfParked: new Map(),
  telemetryFailureCodes: new Set(),
});
//@ chunk-18hwfzwa.js:325446-325581 placement
async function takeUpCarriedAgentSafe(agent, x, context) {
  try {
    return await takeUpCarriedAgent(agent, x, context);
  } catch (error) {
    context.telemetryFailureCodes.add("adopt_take_up_threw");
    logError(error);
    return "threw";
  }
}
//@ chunk-18hwfzwa.js:325581-326222 placement
/**
 * 决定一个随后台会话带过来的子代理如何处理：父会话未启动过它、已完成、已停止且未复活时交还（handedBack）；元数据与父代理一致时链接其转录并接管；否则留待对账。
 */
async function takeUpCarriedAgent(agent, x, context) {
  let { agentId, parentAgentId } = agent;
  if (x === undefined) return classifyUnclaimedAgent(agentId, context);
  let ownerLaunchPlan = await getOwnerLaunchPlan(parentAgentId, context);
  if (!ownerLaunchPlan.launchedAgentIds.has(agentId))
    return parentAgentId === undefined ? "handedBack" : classifyUnclaimedAgent(agentId, context);
  let Re = ownerLaunchPlan.asyncAgents.get(agentId);
  let carriedAgentMetaPath = await findCarriedAgentMetaPath(agent);
  let He =
    carriedAgentMetaPath === null
      ? null
      : await readAgentMetadataAtPath(carriedAgentMetaPath, context.fork.storageV5);
  if (He?.finished !== undefined) return "handedBack";
  let We = ownerLaunchPlan.stoppedAt.get(agentId);
  let revivedAt = He?.revivedAt;
  if (
    (ownerLaunchPlan.stoppedTaskIds.has(agentId) || ownerLaunchPlan.endedTaskIds.has(agentId)) &&
    !(typeof revivedAt === "number" && We !== undefined && revivedAt > We && revivedAt <= Date.now())
  )
    return "handedBack";
  return He !== null &&
    (He.parentAgentId === parentAgentId ||
      (He.parentAgentId === undefined && ownerLaunchPlan.launchedHereAgentIds.has(agentId)))
    ? linkAdoptedAgentTranscripts(withCarriedDescription(agent, Re, carriedSpawnDepth(x, He)), Re, context)
    : classifyUnclaimedAgent(agentId, context);
}
//@ chunk-18hwfzwa.js:326222-326470 placement
async function findCarriedAgentMetaPath(agent) {
  if (agent.transcriptPath === undefined)
    return toAgentMetaPath(getAgentTranscriptPath(identityAgentId2(agent.agentId)));
  let x = currentRestoreSource();
  if (x === null) return null;
  let D = join(
    dirname(x.transcriptPath),
    x.sessionId,
    "subagents",
    basename(getAgentTranscriptPath(identityAgentId2(agent.agentId))),
  );
  return (await realpathNativeAsync(D)) === agent.transcriptPath ? toAgentMetaPath(D) : null;
}
//@ chunk-18hwfzwa.js:326470-326580 placement
async function classifyUnclaimedAgent(agentId, context) {
  let { asyncAgents } = await getOwnerLaunchPlan(undefined, context);
  return asyncAgents.has(agentId) ? "leftToReconcile" : "handedBack";
}
//@ chunk-18hwfzwa.js:326580-326771 placement
async function getOwnerLaunchPlan(h, x) {
  let D = h ?? MAIN_OWNER_KEY;
  let L = x.launchesByOwner.get(D);
  if (L !== undefined) return L;
  let ee;
  try {
    ee = planResumeOfBackgroundTasks(await getOwnerMessages(h, x.fork));
  } catch (error) {
    logError(error);
    ee = planResumeOfBackgroundTasks([]);
  }
  x.launchesByOwner.set(D, ee);
  return ee;
}
//@ chunk-18hwfzwa.js:326771-326885 placement
async function getOwnerMessages(h, fork) {
  if (h === undefined) return fork.initialMessages;
  return (await getAgentTranscript(identityAgentId2(h), fork.storageV5))?.messages ?? [];
}
//@ chunk-18hwfzwa.js:326885-327007 placement
var toAgentMetaPath = (h) => h.replace(/\.jsonl$/, ".meta.json");
var carriedSpawnDepth = (h, x) => Math.max(h + 1, Number.isInteger(x.spawnDepth) ? (x.spawnDepth ?? 0) : 0);
//@ chunk-18hwfzwa.js:327007-327115 placement
function carriedAgentDescription(h) {
  return h?.launchedByAgentTool === true || h?.launchedByForkedSkill === true
    ? sanitizeMetadataText(h?.description)
    : undefined;
}
//@ chunk-18hwfzwa.js:327115-327257 placement
var withCarriedDescription = (agent, x, spawnDepth) => ({
  ...agent,
  description: carriedAgentDescription(x),
  spawnDepth,
});
var withForkedSkillName = (h, x) => ({
  ...h,
  forkedSkillName: h.forkedSkillName ?? x.forkedSkillNameFromSidecar,
});
//@ chunk-18hwfzwa.js:327257-327669 placement
async function linkAdoptedAgentTranscripts(h, x, context) {
  let { taskRegistry, storageV5 } = context.fork;
  try {
    registerResumedAgentPlaceholder(
      withForkedSkillName(
        h,
        await linkAdoptedAgentTranscript(h, {
          storageV5,
        }),
      ),
      taskRegistry,
    );
    context.depthOfParked.set(h.agentId, h.spawnDepth ?? 0);
    return h;
  } catch (error) {
    let Re = !classifyAdoptLinkFailure(h).emit && x !== undefined;
    if (!Re) emitAdoptAgentFailed(h, "transcript link failed", taskRegistry, context.queue);
    context.telemetryFailureCodes.add("adopt_link_failed");
    logForDebugging(`[adopt] agent ${h.agentId} skipped: ${error}`, {
      level: "warn",
    });
    return Re ? "leftToReconcile" : "toldOfLink";
  }
}
//@ chunk-18hwfzwa.js:327669-327980 placement
function adoptFailureSummary(agentId, x, D) {
  for (let Be of x)
    emitTaskNotification(Be, "failed", {
      summary: `Background agent ${CARRIED_NOT_RESUMED_TEXT}`,
    });
  let joined = x
    .slice(0, MAX_LISTED_CARRIED_AGENTS)
    .map((Be) => Be.slice(-CARRIED_AGENT_ID_TAIL_CHARS))
    .join(", ");
  let ke = x.length > MAX_LISTED_CARRIED_AGENTS ? ` and ${x.length - MAX_LISTED_CARRIED_AGENTS} more` : "";
  let Re = `Background agent (id ending ${joined}${ke})`;
  enqueueCarriedAgentFailure(D, {
    taskId: "carried-agents",
    summary: `${Re} ${CARRIED_NOT_RESUMED_TEXT}: ${CARRIED_UNCONFIRMED_TEXT}`,
    agentId,
  });
}
//@ chunk-18hwfzwa.js:327980-328129 placement
var CANNOT_ASK_APPROVAL_NOTE =
  " This session's permission mode cannot ask for approval, so the run will not continue in this session unless that call is already allowed.";
//@ chunk-18hwfzwa.js:328129-328739 placement
function resumeCarriedWorkflow(h, x, messageQueue) {
  try {
    x.taskRegistry.remove(h.taskId);
    if (
      Object.values(x.taskRegistry.all()).some(
        (Re) =>
          Re.type === "local_workflow" && Re.status === "running" && Re.workflowRunId === h.workflowRunId,
      )
    )
      return;
    let ee = h.withholdScriptFromSdkEvents === true;
    let ke = !ee && x.permissionMode === "dontAsk";
    if (ee) x.toolState.get(HiddenScriptShaCache).scriptSha256ById.set(h.workflowRunId, "");
    emitAdoptWorkflowFailed(
      h,
      ee
        ? "it hides its script, so what launched it starts it again"
        : "a carried workflow runs again only through the Workflow tool",
      messageQueue,
      ke ? CANNOT_ASK_APPROVAL_NOTE : "",
    );
    logFeatureSad("task_local_workflow", "adopt_resume_needs_consent");
  } catch (error) {
    logFeatureBad("task_local_workflow", "adopt_hand_back_failed");
    logError(error);
  }
}
//@ chunk-18hwfzwa.js:328739-328743 placement
init_react_production();
//@ chunk-18hwfzwa.js:328743-328747 placement
init_react_production();
export { reconcileCarriedAgents, resumeCarriedWorkflow };
