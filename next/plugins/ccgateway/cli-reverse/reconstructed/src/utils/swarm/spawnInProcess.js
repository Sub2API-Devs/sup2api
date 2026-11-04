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
import { withTimeout } from "../sleep.js";
import { TEAMMATE_TEARDOWN_TIMEOUT_MS } from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { removeMemberByAgentId } from "./teamHelpers.js";
import { evictTaskOutput } from "../task/diskOutput.js";
import { emitTaskNotification } from "../task/taskNotifications.js";
import { TASK_NOTIFICATION_DELAY_MS } from "../task/framework.js";
import {
  unregisterPerfettoAgent,
  isPerfettoRecording,
  registerPerfettoAgent,
} from "../telemetry/perfettoTracing.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { redactAndTruncate } from "../../services/teamMemorySync/secretScanner.js";
import { truncateToLength } from "../stringUtils.js";
import { agentAddress } from "./teammateIds.js";
import { generateTaskId, createTaskStateBase } from "../../Task.js";
import { makeSaltedName } from "../agentId.js";
import { createAbortController } from "../abortController.js";
import { getSessionId } from "../../bootstrap/state.js";
import { createTeammateContext } from "../teammateContext.js";
import { isTaskToolsEnabled } from "../tasks.js";
import { toolMatchesName } from "../../Tool.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";

//@ chunk-v5mxhgy9.js:721-2171 fingerprint = killInProcessTeammate (0.504)
/**
 * 终止同进程 teammate：标 killed 并中止、触发 onIdle 回调；带超时等 pane 拆除；从 teamContext 与团队文件移除成员；发 stopped 通知。返回 {killed, memberRemoval, osTeardown}。
 */
function killInProcessTeammate(taskId, taskRegistry, setAppState, storage) {
  let wasRunning = false;
  let teamName = null;
  let agentId = null;
  let toolUseId;
  let summary;
  let paneTeardown;
  taskRegistry.update(taskId, (prev) => {
    if (prev.status !== "running") return prev;
    teamName = prev.identity.teamName;
    agentId = prev.identity.agentId;
    toolUseId = prev.toolUseId;
    summary = prev.description;
    paneTeardown = prev.paneTeardown;
    prev.abortController?.abort();
    wasRunning = true;
    prev.onIdleCallbacks?.forEach((cb) => cb());
    return {
      ...prev,
      status: "killed",
      notified: true,
      endTime: Date.now(),
      onIdleCallbacks: [],
      pendingUserMessages: [],
      abortController: undefined,
      currentWorkAbortController: undefined,
      paneTeardown: undefined,
      evictAfter: undefined,
    };
  });
  let osTeardown = paneTeardown
    ? withTimeout(
        paneTeardown(),
        TEAMMATE_TEARDOWN_TIMEOUT_MS,
        `pane teardown did not settle within ${TEAMMATE_TEARDOWN_TIMEOUT_MS}ms`,
      ).then(
        (teardownOk) => {
          if (!teardownOk)
            logForDebugging(
              `[killInProcessTeammate] pane teardown for ${taskId} reported failure \u2014 the backend could not find/kill the pane; its separate \`claude --agent-id\` process may still be running`,
              {
                level: "warn",
              },
            );
          return teardownOk;
        },
        (error) => {
          logForDebugging(
            `[killInProcessTeammate] pane teardown for ${taskId} did not complete cleanly: ${errorMessage(error)}. Not blocking the stop result on it; the backend kill continues in the background and the separate \`claude --agent-id\` process may still be running`,
            {
              level: "warn",
            },
          );
          return false;
        },
      )
    : Promise.resolve(undefined);
  if (wasRunning && agentId)
    setAppState((cb) => {
      if (!cb.teamContext?.teammates?.[agentId]) return cb;
      let { [agentId]: removed, ...remainingTeammates } = cb.teamContext.teammates;
      return {
        ...cb,
        teamContext: {
          ...cb.teamContext,
          teammates: remainingTeammates,
        },
      };
    });
  let memberRemoval = Promise.resolve();
  if (teamName && agentId)
    memberRemoval = removeMemberByAgentId(
      teamName,
      agentId,
      {
        onlyIfJoinedBefore: Date.now(),
      },
      storage,
    );
  if (wasRunning) {
    evictTaskOutput(taskId);
    emitTaskNotification(taskId, "stopped", {
      toolUseId,
      summary,
    });
    setTimeout(
      (registryArg, taskIdArg) => registryArg.evictTerminal(taskIdArg),
      TASK_NOTIFICATION_DELAY_MS,
      taskRegistry,
      taskId,
    );
  }
  if (agentId) unregisterPerfettoAgent(agentId);
  logFeatureOk("swarm_in_process_kill");
  return {
    killed: wasRunning,
    memberRemoval,
    osTeardown,
  };
}
//@ chunk-5t8enyd9.js:746-755 placement
var MAX_DESCRIPTION_CHARS = 50;
//@ chunk-5t8enyd9.js:755-833 placement
/**
 * 把提示文本脱敏截断成队友描述（超出补省略号）。
 */
function clipPromptDescription(prompt) {
  let redacted = redactAndTruncate(prompt, MAX_DESCRIPTION_CHARS);
  let clipped = truncateToLength(redacted, MAX_DESCRIPTION_CHARS);
  return clipped.length < redacted.length ? `${clipped}...` : clipped;
}
//@ chunk-5t8enyd9.js:833-921 layout
/**
 * teammate 的初始权限模式：要求计划模式时为 plan；父为 plan/dontAsk 时降为 default；否则继承。
 */
function getTeammatePermissionMode(parentMode, planModeRequired) {
  if (planModeRequired) return "plan";
  if (parentMode === "plan" || parentMode === "dontAsk") return "default";
  return parentMode;
}
//@ chunk-5t8enyd9.js:921-2645 facade-exports = spawnInProcessTeammate (0.658)
/**
 * 派生同进程 teammate：生成 agentId（name@team）与 t 前缀任务 ID，建 teammate 上下文与 in_process_teammate 任务，在 agentNameRegistry 注册名字（被活着的代理占用时另分配名字）。返回 {ok, agentId, taskId, abortController, teammateContext}。
 */
async function spawnInProcessTeammate(config, context) {
  let { name, teamName, prompt, color, planModeRequired, model } = config;
  let { taskRegistry } = context;
  let agentId = agentAddress(name, teamName);
  let taskId = generateTaskId("in_process_teammate");
  let resumableAgentId = config.resumableAgentId ?? makeSaltedName(name);
  logForDebugging(`[spawnInProcessTeammate] Spawning ${agentId} (taskId: ${taskId})`);
  try {
    let abortController = createAbortController();
    let parentSessionId = getSessionId();
    let identity = {
      agentId,
      agentName: name,
      teamName,
      color,
      planModeRequired,
      parentSessionId,
      resumableAgentId,
    };
    let teammateContext = createTeammateContext({
      agentId,
      agentName: name,
      teamName,
      color,
      planModeRequired,
      parentSessionId,
      hasTaskListTools:
        isTaskToolsEnabled() &&
        context.rootToolSurface.tools.some((tool) => toolMatchesName(tool, TASK_UPDATE_TOOL_NAME)),
      abortController,
    });
    if (isPerfettoRecording()) registerPerfettoAgent(agentId, name, parentSessionId);
    let description = config.description || clipPromptDescription(prompt);
    let taskState = {
      ...createTaskStateBase(taskId, "in_process_teammate", description, context.toolUseId),
      type: "in_process_teammate",
      status: "running",
      identity,
      spawnedWith: config.spawnedWith,
      prompt: config.shownPrompt ?? prompt,
      model,
      abortController,
      awaitingPlanApproval: false,
      permissionMode:
        config.permissionMode ??
        getTeammatePermissionMode(getToolPermissionContext(context).mode, planModeRequired),
      isIdle: false,
      lastReportedToolCount: 0,
      lastReportedTokenCount: 0,
      pendingUserMessages: [],
    };
    taskRegistry.register(taskState);
    let appState = context.getAppState();
    let existingAgentId = appState.agentNameRegistry.get(name);
    if (existingAgentId !== resumableAgentId) {
      let existingTask = existingAgentId !== undefined ? appState.tasks[existingAgentId] : undefined;
      let registeredName =
        existingAgentId !== undefined &&
        (existingTask?.status === "running" ||
          isLocalAgent(existingTask) ||
          Object.values(appState.tasks).some(
            (task) =>
              isInProcessTeammateTask(task) &&
              task.status === "running" &&
              task.identity.resumableAgentId === existingAgentId,
          ))
          ? context.agentLifecycle.allocateName(name)
          : name;
      if (registeredName !== name)
        logForDebugging(
          `[spawnInProcessTeammate] name "${name}" already routes to live ${existingAgentId}; registry entry uses "${registeredName}" instead`,
        );
      context.agentLifecycle.registerName(registeredName, resumableAgentId);
    }
    logForDebugging(`[spawnInProcessTeammate] Registered ${agentId} in AppState`);
    logFeatureOk("swarm_in_process_spawn");
    return {
      ok: true,
      agentId,
      identity,
      taskId,
      abortController,
      teammateContext,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error during spawn";
    logForDebugging(`[spawnInProcessTeammate] Failed to spawn ${agentId}: ${errorMessage}`);
    logFeatureBad("swarm_in_process_spawn", "spawn_failed");
    return {
      ok: false,
      agentId,
      error: errorMessage,
    };
  }
}
export { killInProcessTeammate, clipPromptDescription, spawnInProcessTeammate };
