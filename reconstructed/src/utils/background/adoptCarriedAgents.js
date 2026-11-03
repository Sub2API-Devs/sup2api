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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import { formatTaskNotification } from "../xmlTags.js";
import { Um, Mr } from "../agentId.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../log.js";
import { readAgentMetadataAtPath, getAgentTranscriptPath, getAgentTranscript } from "../sessionStorage.js";
import { d1n } from "../sessionRestore.js";
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
import { sFt } from "../../services/workflow/journalEntries.js";
import { j } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:323945-324132 placement
var enqueueCarriedAgentFailure = (h, x) =>
  h.enqueuePendingNotification({
    value: formatTaskNotification({ taskId: x.taskId, status: "failed", summary: x.summary }),
    agentId: x.agentId,
    mode: "task-notification",
    skipAttachments: !0,
    priority: "next",
  });
//@ chunk-18hwfzwa.js:324132-324372 placement
var MAX_LISTED_CARRIED_AGENTS = 8,
  CARRIED_AGENT_ID_TAIL_CHARS = 16,
  CARRIED_NOT_RESUMED_TEXT = "was carried into this session and not resumed",
  CARRIED_UNCONFIRMED_TEXT =
    "this session could not confirm from its own records that its owner launched it and that it is still running. If it is yours, a message to it may continue it.",
  MAIN_OWNER_KEY = "";
//@ chunk-18hwfzwa.js:324372-325336 placement
async function reconcileCarriedAgents(h, x, D) {
  let L = createCarriedAgentsContext(x, D),
    { depthOfParked: depthOfParked } = L,
    ke = [],
    Re = new Set(),
    Be = new Set(),
    He = new Map();
  for (let ze of h.toSorted((Xe, rt) => (Xe.spawnDepth ?? 0) - (rt.spawnDepth ?? 0))) {
    let { agentId: agentId, parentAgentId: parentAgentId } = ze;
    if (Um(agentId) === null || Re.has(agentId)) {
      L.telemetryFailureCodes.add("adopt_agent_entry_dropped");
      continue;
    }
    let kt = parentAgentId === void 0 ? 0 : depthOfParked.get(parentAgentId),
      It = parentAgentId !== void 0 && kt !== void 0 ? Mr(parentAgentId) : mainAgentId(),
      Ot = await takeUpCarriedAgentSafe(ze, kt, L);
    if (typeof Ot !== "string") (Re.add(agentId), He.delete(agentId), Be.delete(agentId), ke.push(Ot));
    else if (Ot === "toldOfLink") {
      if (parentAgentId === void 0) Be.add(agentId);
    } else if (He.get(agentId)?.outcome !== "leftToReconcile") He.set(agentId, { owner: It, outcome: Ot });
  }
  let We = new Map();
  for (let [ze, { owner: Xe, outcome: rt }] of He) {
    if (rt === "leftToReconcile") continue;
    if (rt === "handedBack") L.telemetryFailureCodes.add("adopt_agent_not_vouched");
    if ((We.set(Xe, [...(We.get(Xe) ?? []), ze]), Xe === mainAgentId())) Be.add(ze);
  }
  for (let [ze, Xe] of We) adoptFailureSummary(ze, Xe, D);
  for (let telemetryFailureCode of L.telemetryFailureCodes)
    logFeatureSad("task_local_agent", telemetryFailureCode);
  return { registered: ke, reported: Be };
}
//@ chunk-18hwfzwa.js:325336-325446 placement
var createCarriedAgentsContext = (h, x) => ({
  fork: h,
  queue: x,
  launchesByOwner: new Map(),
  depthOfParked: new Map(),
  telemetryFailureCodes: new Set(),
});
//@ chunk-18hwfzwa.js:325446-325581 placement
async function takeUpCarriedAgentSafe(h, x, D) {
  try {
    return await takeUpCarriedAgent(h, x, D);
  } catch (error) {
    return (D.telemetryFailureCodes.add("adopt_take_up_threw"), logError(error), "threw");
  }
}
/**
 * 决定一个随后台会话带过来的子代理如何处理：父会话未启动过它、已完成、已停止且未复活时交还（handedBack）；元数据与父代理一致时链接其转录并接管；否则留待对账。
 */
//@ chunk-18hwfzwa.js:325581-326222 placement
async function takeUpCarriedAgent(agent, x, context) {
  let { agentId: agentId, parentAgentId: parentAgentId } = agent;
  if (x === void 0) return classifyUnclaimedAgent(agentId, context);
  let ke = await getOwnerLaunchPlan(parentAgentId, context);
  if (!ke.launchedAgentIds.has(agentId))
    return parentAgentId === void 0 ? "handedBack" : classifyUnclaimedAgent(agentId, context);
  let Re = ke.asyncAgents.get(agentId),
    Be = await findCarriedAgentMetaPath(agent),
    He = Be === null ? null : await readAgentMetadataAtPath(Be, context.fork.storageV5);
  if (He?.finished !== void 0) return "handedBack";
  let We = ke.stoppedAt.get(agentId),
    ze = He?.revivedAt;
  if (
    (ke.stoppedTaskIds.has(agentId) || ke.endedTaskIds.has(agentId)) &&
    !(typeof ze === "number" && We !== void 0 && ze > We && ze <= Date.now())
  )
    return "handedBack";
  return He !== null &&
    (He.parentAgentId === parentAgentId ||
      (He.parentAgentId === void 0 && ke.launchedHereAgentIds.has(agentId)))
    ? linkAdoptedAgentTranscripts(withCarriedDescription(agent, Re, carriedSpawnDepth(x, He)), Re, context)
    : classifyUnclaimedAgent(agentId, context);
}
//@ chunk-18hwfzwa.js:326222-326470 placement
async function findCarriedAgentMetaPath(h) {
  if (h.transcriptPath === void 0) return toAgentMetaPath(getAgentTranscriptPath(Mr(h.agentId)));
  let x = d1n();
  if (x === null) return null;
  let D = join_5(
    dirname_3(x.transcriptPath),
    x.sessionId,
    "subagents",
    basename(getAgentTranscriptPath(Mr(h.agentId))),
  );
  return (await realpathNativeAsync(D)) === h.transcriptPath ? toAgentMetaPath(D) : null;
}
//@ chunk-18hwfzwa.js:326470-326580 placement
async function classifyUnclaimedAgent(h, x) {
  let { asyncAgents: asyncAgents } = await getOwnerLaunchPlan(void 0, x);
  return asyncAgents.has(h) ? "leftToReconcile" : "handedBack";
}
//@ chunk-18hwfzwa.js:326580-326771 placement
async function getOwnerLaunchPlan(h, x) {
  let D = h ?? MAIN_OWNER_KEY,
    L = x.launchesByOwner.get(D);
  if (L !== void 0) return L;
  let ee;
  try {
    ee = planResumeOfBackgroundTasks(await getOwnerMessages(h, x.fork));
  } catch (error) {
    (logError(error), (ee = planResumeOfBackgroundTasks([])));
  }
  return (x.launchesByOwner.set(D, ee), ee);
}
//@ chunk-18hwfzwa.js:326771-326885 placement
async function getOwnerMessages(h, x) {
  if (h === void 0) return x.initialMessages;
  return (await getAgentTranscript(Mr(h), x.storageV5))?.messages ?? [];
}
//@ chunk-18hwfzwa.js:326885-327007 placement
var toAgentMetaPath = (h) => h.replace(/\.jsonl$/, ".meta.json"),
  carriedSpawnDepth = (h, x) => Math.max(h + 1, Number.isInteger(x.spawnDepth) ? (x.spawnDepth ?? 0) : 0);
//@ chunk-18hwfzwa.js:327007-327115 placement
function carriedAgentDescription(h) {
  return h?.launchedByAgentTool === !0 || h?.launchedByForkedSkill === !0
    ? sanitizeMetadataText(h?.description)
    : void 0;
}
//@ chunk-18hwfzwa.js:327115-327257 placement
var withCarriedDescription = (h, x, D) => ({ ...h, description: carriedAgentDescription(x), spawnDepth: D }),
  withForkedSkillName = (h, x) => ({
    ...h,
    forkedSkillName: h.forkedSkillName ?? x.forkedSkillNameFromSidecar,
  });
//@ chunk-18hwfzwa.js:327257-327669 placement
async function linkAdoptedAgentTranscripts(h, x, D) {
  let { taskRegistry: taskRegistry, storageV5: storageV5 } = D.fork;
  try {
    return (
      registerResumedAgentPlaceholder(
        withForkedSkillName(h, await linkAdoptedAgentTranscript(h, { storageV5: storageV5 })),
        taskRegistry,
      ),
      D.depthOfParked.set(h.agentId, h.spawnDepth ?? 0),
      h
    );
  } catch (error) {
    let Re = !classifyAdoptLinkFailure(h).emit && x !== void 0;
    if (!Re) emitAdoptAgentFailed(h, "transcript link failed", taskRegistry, D.queue);
    return (
      D.telemetryFailureCodes.add("adopt_link_failed"),
      logForDebugging(`[adopt] agent ${h.agentId} skipped: ${error}`, { level: "warn" }),
      Re ? "leftToReconcile" : "toldOfLink"
    );
  }
}
//@ chunk-18hwfzwa.js:327669-327980 placement
function adoptFailureSummary(h, x, D) {
  for (let Be of x)
    emitTaskNotification(Be, "failed", { summary: `Background agent ${CARRIED_NOT_RESUMED_TEXT}` });
  let joined = x
      .slice(0, MAX_LISTED_CARRIED_AGENTS)
      .map((Be) => Be.slice(-CARRIED_AGENT_ID_TAIL_CHARS))
      .join(", "),
    ke = x.length > MAX_LISTED_CARRIED_AGENTS ? ` and ${x.length - MAX_LISTED_CARRIED_AGENTS} more` : "",
    Re = `Background agent (id ending ${joined}${ke})`;
  enqueueCarriedAgentFailure(D, {
    taskId: "carried-agents",
    summary: `${Re} ${CARRIED_NOT_RESUMED_TEXT}: ${CARRIED_UNCONFIRMED_TEXT}`,
    agentId: h,
  });
}
//@ chunk-18hwfzwa.js:327980-328129 placement
var CANNOT_ASK_APPROVAL_NOTE =
  " This session's permission mode cannot ask for approval, so the run will not continue in this session unless that call is already allowed.";
//@ chunk-18hwfzwa.js:328129-328739 placement
function resumeCarriedWorkflow(h, x, D) {
  try {
    if (
      (x.taskRegistry.remove(h.taskId),
      Object.values(x.taskRegistry.all()).some(
        (Re) =>
          Re.type === "local_workflow" && Re.status === "running" && Re.workflowRunId === h.workflowRunId,
      ))
    )
      return;
    let ee = h.withholdScriptFromSdkEvents === !0,
      ke = !ee && x.permissionMode === "dontAsk";
    if (ee) x.toolState.get(sFt).scriptSha256ById.set(h.workflowRunId, "");
    (emitAdoptWorkflowFailed(
      h,
      ee
        ? "it hides its script, so what launched it starts it again"
        : "a carried workflow runs again only through the Workflow tool",
      D,
      ke ? CANNOT_ASK_APPROVAL_NOTE : "",
    ),
      logFeatureSad("task_local_workflow", "adopt_resume_needs_consent"));
  } catch (error) {
    (logFeatureBad("task_local_workflow", "adopt_hand_back_failed"), logError(error));
  }
}
//@ chunk-18hwfzwa.js:328739-328743 placement
j();
//@ chunk-18hwfzwa.js:328743-328747 placement
j();

export { reconcileCarriedAgents, resumeCarriedWorkflow };
