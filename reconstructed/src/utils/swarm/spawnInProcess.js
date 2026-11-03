/**
 * utils/swarm/spawnInProcess.ts
 *
 * 进程内派生队友（in-process teammate）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/spawnInProcess.ts
 * pieces: chunk-5t8enyd9.js (4), chunk-v5mxhgy9.js (1)
 * attribution: placement 2, layout 1, facade-exports 1, fingerprint 1
 */
import { redactAndTruncate } from "../../services/teamMemorySync/secretScanner.js";
import { truncateToLength } from "../stringUtils.js";
import { MG } from "./teammateIds.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { makeSaltedName } from "../agentId.js";
import { logForDebugging } from "../debug.js";
import { createAbortController } from "../abortController.js";
import { getSessionId } from "../../bootstrap/state.js";
import { createTeammateContext } from "../teammateContext.js";
import { isTaskToolsEnabled } from "../tasks.js";
import { toolMatchesName } from "../../Tool.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { Rqe, Anr, xqe } from "../telemetry/perfettoTracing.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { withTimeout } from "../sleep.js";
import { TEAMMATE_TEARDOWN_TIMEOUT_MS } from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { errorMessage } from "../errors.js";
import { removeMemberByAgentId } from "./teamHelpers.js";
import { evictTaskOutput } from "../task/diskOutput.js";
import { emitTaskNotification } from "../task/taskNotifications.js";
import { y2t } from "../task/framework.js";

//@ chunk-5t8enyd9.js:746-755 placement
var S = 50;
//@ chunk-5t8enyd9.js:755-833 placement
function yOr(o) {
  let s = redactAndTruncate(o, S),
    e = truncateToLength(s, S);
  return e.length < s.length ? `${e}...` : e;
}
/**
 * teammate 的初始权限模式：要求计划模式时为 plan；父为 plan/dontAsk 时降为 default；否则继承。
 */
//@ chunk-5t8enyd9.js:833-921 layout
function getTeammatePermissionMode(parentMode, planModeRequired) {
  if (planModeRequired) return "plan";
  if (parentMode === "plan" || parentMode === "dontAsk") return "default";
  return parentMode;
}
/**
 * 派生同进程 teammate：生成 agentId（name@team）与 t 前缀任务 ID，建 teammate 上下文与 in_process_teammate 任务，在 agentNameRegistry 注册名字（被活着的代理占用时另分配名字）。返回 {ok, agentId, taskId, abortController, teammateContext}。
 */
//@ chunk-5t8enyd9.js:921-2645 facade-exports = spawnInProcessTeammate (0.658)
async function spawnInProcessTeammate(config, context) {
  let {
      name: name,
      teamName: teamName,
      prompt: prompt,
      color: color,
      planModeRequired: planModeRequired,
      model: model,
    } = config,
    { taskRegistry: taskRegistry } = context,
    agentId = MG(name, teamName),
    taskId = generateTaskId("in_process_teammate"),
    resumableAgentId = config.resumableAgentId ?? makeSaltedName(name);
  logForDebugging(`[spawnInProcessTeammate] Spawning ${agentId} (taskId: ${taskId})`);
  try {
    let abortController = createAbortController(),
      parentSessionId = getSessionId(),
      identity = {
        agentId: agentId,
        agentName: name,
        teamName: teamName,
        color: color,
        planModeRequired: planModeRequired,
        parentSessionId: parentSessionId,
        resumableAgentId: resumableAgentId,
      },
      teammateContext = createTeammateContext({
        agentId: agentId,
        agentName: name,
        teamName: teamName,
        color: color,
        planModeRequired: planModeRequired,
        parentSessionId: parentSessionId,
        hasTaskListTools:
          isTaskToolsEnabled() &&
          context.rootToolSurface.tools.some((tool) => toolMatchesName(tool, TASK_UPDATE_TOOL_NAME)),
        abortController: abortController,
      });
    if (Rqe()) Anr(agentId, name, parentSessionId);
    let description = config.description || yOr(prompt),
      taskState = {
        ...createTaskStateBase(taskId, "in_process_teammate", description, context.toolUseId),
        type: "in_process_teammate",
        status: "running",
        identity: identity,
        spawnedWith: config.spawnedWith,
        prompt: config.shownPrompt ?? prompt,
        model: model,
        abortController: abortController,
        awaitingPlanApproval: !1,
        permissionMode:
          config.permissionMode ??
          getTeammatePermissionMode(getToolPermissionContext(context).mode, planModeRequired),
        isIdle: !1,
        lastReportedToolCount: 0,
        lastReportedTokenCount: 0,
        pendingUserMessages: [],
      };
    taskRegistry.register(taskState);
    let appState = context.getAppState(),
      existingAgentId = appState.agentNameRegistry.get(name);
    if (existingAgentId !== resumableAgentId) {
      let p = existingAgentId !== void 0 ? appState.tasks[existingAgentId] : void 0,
        registeredName =
          existingAgentId !== void 0 &&
          (p?.status === "running" ||
            isLocalAgent(p) ||
            Object.values(appState.tasks).some(
              (u) =>
                isInProcessTeammateTask(u) &&
                u.status === "running" &&
                u.identity.resumableAgentId === existingAgentId,
            ))
            ? context.agentLifecycle.allocateName(name)
            : name;
      if (registeredName !== name)
        logForDebugging(
          `[spawnInProcessTeammate] name "${name}" already routes to live ${existingAgentId}; registry entry uses "${registeredName}" instead`,
        );
      context.agentLifecycle.registerName(registeredName, resumableAgentId);
    }
    return (
      logForDebugging(`[spawnInProcessTeammate] Registered ${agentId} in AppState`),
      logFeatureOk("swarm_in_process_spawn"),
      {
        ok: !0,
        agentId: agentId,
        identity: identity,
        taskId: taskId,
        abortController: abortController,
        teammateContext: teammateContext,
      }
    );
  } catch (error) {
    let a = error instanceof Error ? error.message : "Unknown error during spawn";
    return (
      logForDebugging(`[spawnInProcessTeammate] Failed to spawn ${agentId}: ${a}`),
      logFeatureBad("swarm_in_process_spawn", "spawn_failed"),
      { ok: !1, agentId: agentId, error: a }
    );
  }
}
/**
 * 终止同进程 teammate：标 killed 并中止、触发 onIdle 回调；带超时等 pane 拆除；从 teamContext 与团队文件移除成员；发 stopped 通知。返回 {killed, memberRemoval, osTeardown}。
 */
//@ chunk-v5mxhgy9.js:721-2171 fingerprint = killInProcessTeammate (0.504)
function killInProcessTeammate(taskId, taskRegistry, setAppState, storage) {
  let wasRunning = !1,
    teamName = null,
    agentId = null,
    f,
    u,
    paneTeardown;
  taskRegistry.update(taskId, (prev) => {
    if (prev.status !== "running") return prev;
    return (
      (teamName = prev.identity.teamName),
      (agentId = prev.identity.agentId),
      (f = prev.toolUseId),
      (u = prev.description),
      (paneTeardown = prev.paneTeardown),
      prev.abortController?.abort(),
      (wasRunning = !0),
      prev.onIdleCallbacks?.forEach((p) => p()),
      {
        ...prev,
        status: "killed",
        notified: !0,
        endTime: Date.now(),
        onIdleCallbacks: [],
        pendingUserMessages: [],
        abortController: void 0,
        currentWorkAbortController: void 0,
        paneTeardown: void 0,
        evictAfter: void 0,
      }
    );
  });
  let osTeardown = paneTeardown
    ? withTimeout(
        paneTeardown(),
        TEAMMATE_TEARDOWN_TIMEOUT_MS,
        `pane teardown did not settle within ${TEAMMATE_TEARDOWN_TIMEOUT_MS}ms`,
      ).then(
        (e) => {
          if (!e)
            logForDebugging(
              `[killInProcessTeammate] pane teardown for ${taskId} reported failure \u2014 the backend could not find/kill the pane; its separate \`claude --agent-id\` process may still be running`,
              { level: "warn" },
            );
          return e;
        },
        (e) => (
          logForDebugging(
            `[killInProcessTeammate] pane teardown for ${taskId} did not complete cleanly: ${errorMessage(e)}. Not blocking the stop result on it; the backend kill continues in the background and the separate \`claude --agent-id\` process may still be running`,
            { level: "warn" },
          ),
          !1
        ),
      )
    : Promise.resolve(void 0);
  if (wasRunning && agentId)
    setAppState((cb) => {
      if (!cb.teamContext?.teammates?.[agentId]) return cb;
      let { [agentId]: p, ...y } = cb.teamContext.teammates;
      return { ...cb, teamContext: { ...cb.teamContext, teammates: y } };
    });
  let memberRemoval = Promise.resolve();
  if (teamName && agentId)
    memberRemoval = removeMemberByAgentId(teamName, agentId, { onlyIfJoinedBefore: Date.now() }, storage);
  if (wasRunning)
    (evictTaskOutput(taskId),
      emitTaskNotification(taskId, "stopped", { toolUseId: f, summary: u }),
      setTimeout((e, p) => e.evictTerminal(p), y2t, taskRegistry, taskId));
  if (agentId) xqe(agentId);
  return (
    logFeatureOk("swarm_in_process_kill"),
    { killed: wasRunning, memberRemoval: memberRemoval, osTeardown: osTeardown }
  );
}

export { killInProcessTeammate, yOr, spawnInProcessTeammate };
