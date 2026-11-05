/**
 * utils/background/adoptCarriedAgents.ts
 *
 * 2.1.316 新增。接管随身代理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname, basename } from "path";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:322625-322629 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:322625", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:350717-350721 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:350717", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:363429-363616 placement
var enqueueCarriedAgentFailure = (messageQueue, payload) =>
  messageQueue.enqueuePendingNotification({
    value: formatTaskNotification({
      taskId: payload.taskId,
      status: "failed",
      summary: payload.summary,
    }),
    agentId: payload.agentId,
    mode: "task-notification",
    skipAttachments: true,
    priority: "next",
  });
//@ chunk-czq1j3j2.js:363616-363856 placement
var MAX_LISTED_CARRIED_AGENTS = 8;
var CARRIED_AGENT_ID_TAIL_CHARS = 16;
var CARRIED_NOT_RESUMED_TEXT = "was carried into this session and not resumed";
var CARRIED_UNCONFIRMED_TEXT =
  "this session could not confirm from its own records that its owner launched it and that it is still running. If it is yours, a message to it may continue it.";
var MAIN_OWNER_KEY = "";
//@ chunk-czq1j3j2.js:363856-364820 placement
async function reconcileCarriedAgents(agents, fork, queue) {
  let carriedAgentsContext = createCarriedAgentsContext(fork, queue);
  let { depthOfParked } = carriedAgentsContext;
  let registered = [];
  let takenUp = new Set();
  let reported = new Set();
  let failuresByAgent = new Map();
  for (let agent of agents.toSorted(
    (leftAgent, rightAgent) => (leftAgent.spawnDepth ?? 0) - (rightAgent.spawnDepth ?? 0),
  )) {
    let { agentId, parentAgentId } = agent;
    if (normalizeAgentIdOrNull(agentId) === null || takenUp.has(agentId)) {
      carriedAgentsContext.telemetryFailureCodes.add("adopt_agent_entry_dropped");
      continue;
    }
    let parentDepth = parentAgentId === undefined ? 0 : depthOfParked.get(parentAgentId);
    let owner =
      parentAgentId !== undefined && parentDepth !== undefined
        ? identityAgentId2(parentAgentId)
        : mainAgentId();
    let outcome = await takeUpCarriedAgentSafe(agent, parentDepth, carriedAgentsContext);
    if (typeof outcome !== "string") {
      takenUp.add(agentId);
      failuresByAgent.delete(agentId);
      reported.delete(agentId);
      registered.push(outcome);
    } else if (outcome === "toldOfLink") {
      if (parentAgentId === undefined) reported.add(agentId);
    } else if (failuresByAgent.get(agentId)?.outcome !== "leftToReconcile")
      failuresByAgent.set(agentId, {
        owner,
        outcome,
      });
  }
  let failuresByOwner = new Map();
  for (let [agentId, { owner, outcome }] of failuresByAgent) {
    if (outcome === "leftToReconcile") continue;
    if (outcome === "handedBack") carriedAgentsContext.telemetryFailureCodes.add("adopt_agent_not_vouched");
    failuresByOwner.set(owner, [...(failuresByOwner.get(owner) ?? []), agentId]);
    if (owner === mainAgentId()) reported.add(agentId);
  }
  for (let [agentId, agentIds] of failuresByOwner) adoptFailureSummary(agentId, agentIds, queue);
  for (let telemetryFailureCode of carriedAgentsContext.telemetryFailureCodes)
    logFeatureSad("task_local_agent", telemetryFailureCode);
  return {
    registered,
    reported,
  };
}
//@ chunk-czq1j3j2.js:364820-364930 placement
var createCarriedAgentsContext = (fork, queue) => ({
  fork,
  queue,
  launchesByOwner: new Map(),
  depthOfParked: new Map(),
  telemetryFailureCodes: new Set(),
});
//@ chunk-czq1j3j2.js:364930-365065 placement
async function takeUpCarriedAgentSafe(agent, parentDepth, context) {
  try {
    return await takeUpCarriedAgent(agent, parentDepth, context);
  } catch (error) {
    context.telemetryFailureCodes.add("adopt_take_up_threw");
    logError(error);
    return "threw";
  }
}
//@ chunk-czq1j3j2.js:365065-365706 placement
/**
 * 决定一个随后台会话带过来的子代理如何处理：父会话未启动过它、已完成、已停止且未复活时交还（handedBack）；元数据与父代理一致时链接其转录并接管；否则留待对账。
 */
async function takeUpCarriedAgent(agent, parentDepth, context) {
  let { agentId, parentAgentId } = agent;
  if (parentDepth === undefined) return classifyUnclaimedAgent(agentId, context);
  let ownerLaunchPlan = await getOwnerLaunchPlan(parentAgentId, context);
  if (!ownerLaunchPlan.launchedAgentIds.has(agentId))
    return parentAgentId === undefined ? "handedBack" : classifyUnclaimedAgent(agentId, context);
  let launchPlanAgent = ownerLaunchPlan.asyncAgents.get(agentId);
  let carriedAgentMetaPath = await findCarriedAgentMetaPath(agent);
  let metadata =
    carriedAgentMetaPath === null
      ? null
      : await readAgentMetadataAtPath(carriedAgentMetaPath, context.fork.storageV5);
  if (metadata?.finished !== undefined) return "handedBack";
  let stoppedAt = ownerLaunchPlan.stoppedAt.get(agentId);
  let revivedAt = metadata?.revivedAt;
  if (
    (ownerLaunchPlan.stoppedTaskIds.has(agentId) || ownerLaunchPlan.endedTaskIds.has(agentId)) &&
    !(
      typeof revivedAt === "number" &&
      stoppedAt !== undefined &&
      revivedAt > stoppedAt &&
      revivedAt <= Date.now()
    )
  )
    return "handedBack";
  return metadata !== null &&
    (metadata.parentAgentId === parentAgentId ||
      (metadata.parentAgentId === undefined && ownerLaunchPlan.launchedHereAgentIds.has(agentId)))
    ? linkAdoptedAgentTranscripts(
        withCarriedDescription(agent, launchPlanAgent, carriedSpawnDepth(parentDepth, metadata)),
        launchPlanAgent,
        context,
      )
    : classifyUnclaimedAgent(agentId, context);
}
//@ chunk-czq1j3j2.js:365706-365954 placement
async function findCarriedAgentMetaPath(agent) {
  if (agent.transcriptPath === undefined)
    return toAgentMetaPath(getAgentTranscriptPath(identityAgentId2(agent.agentId)));
  let restoreSource = currentRestoreSource();
  if (restoreSource === null) return null;
  let candidatePath = join(
    dirname(restoreSource.transcriptPath),
    restoreSource.sessionId,
    "subagents",
    basename(getAgentTranscriptPath(identityAgentId2(agent.agentId))),
  );
  return (await realpathNativeAsync(candidatePath)) === agent.transcriptPath
    ? toAgentMetaPath(candidatePath)
    : null;
}
//@ chunk-czq1j3j2.js:365954-366064 placement
async function classifyUnclaimedAgent(agentId, context) {
  let { asyncAgents } = await getOwnerLaunchPlan(undefined, context);
  return asyncAgents.has(agentId) ? "leftToReconcile" : "handedBack";
}
//@ chunk-czq1j3j2.js:366064-366255 placement
async function getOwnerLaunchPlan(ownerAgentId, context) {
  let ownerKey = ownerAgentId ?? MAIN_OWNER_KEY;
  let cachedPlan = context.launchesByOwner.get(ownerKey);
  if (cachedPlan !== undefined) return cachedPlan;
  let plan;
  try {
    plan = planResumeOfBackgroundTasks(await getOwnerMessages(ownerAgentId, context.fork));
  } catch (error) {
    logError(error);
    plan = planResumeOfBackgroundTasks([]);
  }
  context.launchesByOwner.set(ownerKey, plan);
  return plan;
}
//@ chunk-czq1j3j2.js:366255-366369 placement
async function getOwnerMessages(ownerAgentId, fork) {
  if (ownerAgentId === undefined) return fork.initialMessages;
  return (await getAgentTranscript(identityAgentId2(ownerAgentId), fork.storageV5))?.messages ?? [];
}
//@ chunk-czq1j3j2.js:366369-366491 placement
var toAgentMetaPath = (path) => path.replace(/\.jsonl$/, ".meta.json");
var carriedSpawnDepth = (parentDepth, agent) =>
  Math.max(parentDepth + 1, Number.isInteger(agent.spawnDepth) ? (agent.spawnDepth ?? 0) : 0);
//@ chunk-czq1j3j2.js:366491-366599 placement
function carriedAgentDescription(agent) {
  return agent?.launchedByAgentTool === true || agent?.launchedByForkedSkill === true
    ? sanitizeMetadataText(agent?.description)
    : undefined;
}
//@ chunk-czq1j3j2.js:366599-366741 placement
var withCarriedDescription = (agent, launchPlanAgent, spawnDepth) => ({
  ...agent,
  description: carriedAgentDescription(launchPlanAgent),
  spawnDepth,
});
var withForkedSkillName = (agent, linkResult) => ({
  ...agent,
  forkedSkillName: agent.forkedSkillName ?? linkResult.forkedSkillNameFromSidecar,
});
//@ chunk-czq1j3j2.js:366741-367153 placement
async function linkAdoptedAgentTranscripts(agent, launchPlanAgent, context) {
  let { taskRegistry, storageV5 } = context.fork;
  try {
    registerResumedAgentPlaceholder(
      withForkedSkillName(
        agent,
        await linkAdoptedAgentTranscript(agent, {
          storageV5,
        }),
      ),
      taskRegistry,
    );
    context.depthOfParked.set(agent.agentId, agent.spawnDepth ?? 0);
    return agent;
  } catch (error) {
    let silent = !classifyAdoptLinkFailure(agent).emit && launchPlanAgent !== undefined;
    if (!silent) emitAdoptAgentFailed(agent, "transcript link failed", taskRegistry, context.queue);
    context.telemetryFailureCodes.add("adopt_link_failed");
    logForDebugging(`[adopt] agent ${agent.agentId} skipped: ${error}`, {
      level: "warn",
    });
    return silent ? "leftToReconcile" : "toldOfLink";
  }
}
//@ chunk-czq1j3j2.js:367153-367464 placement
function adoptFailureSummary(agentId, agentIds, queue) {
  for (let agentId of agentIds)
    emitTaskNotification(agentId, "failed", {
      summary: `Background agent ${CARRIED_NOT_RESUMED_TEXT}`,
    });
  let joined = agentIds
    .slice(0, MAX_LISTED_CARRIED_AGENTS)
    .map((agentId) => agentId.slice(-CARRIED_AGENT_ID_TAIL_CHARS))
    .join(", ");
  let moreText =
    agentIds.length > MAX_LISTED_CARRIED_AGENTS
      ? ` and ${agentIds.length - MAX_LISTED_CARRIED_AGENTS} more`
      : "";
  let subject = `Background agent (id ending ${joined}${moreText})`;
  enqueueCarriedAgentFailure(queue, {
    taskId: "carried-agents",
    summary: `${subject} ${CARRIED_NOT_RESUMED_TEXT}: ${CARRIED_UNCONFIRMED_TEXT}`,
    agentId,
  });
}
//@ chunk-czq1j3j2.js:367464-367613 placement
var CANNOT_ASK_APPROVAL_NOTE =
  " This session's permission mode cannot ask for approval, so the run will not continue in this session unless that call is already allowed.";
//@ chunk-czq1j3j2.js:367613-368223 placement
function resumeCarriedWorkflow(workflow, context, messageQueue) {
  try {
    context.taskRegistry.remove(workflow.taskId);
    if (
      Object.values(context.taskRegistry.all()).some(
        (task) =>
          task.type === "local_workflow" &&
          task.status === "running" &&
          task.workflowRunId === workflow.workflowRunId,
      )
    )
      return;
    let withholdsScript = workflow.withholdScriptFromSdkEvents === true;
    let cannotAsk = !withholdsScript && context.permissionMode === "dontAsk";
    if (withholdsScript)
      context.toolState.get(HiddenScriptShaCache).scriptSha256ById.set(workflow.workflowRunId, "");
    emitAdoptWorkflowFailed(
      workflow,
      withholdsScript
        ? "it hides its script, so what launched it starts it again"
        : "a carried workflow runs again only through the Workflow tool",
      messageQueue,
      cannotAsk ? CANNOT_ASK_APPROVAL_NOTE : "",
    );
    logFeatureSad("task_local_workflow", "adopt_resume_needs_consent");
  } catch (error) {
    logFeatureBad("task_local_workflow", "adopt_hand_back_failed");
    logError(error);
  }
}
export { reconcileCarriedAgents, resumeCarriedWorkflow };
