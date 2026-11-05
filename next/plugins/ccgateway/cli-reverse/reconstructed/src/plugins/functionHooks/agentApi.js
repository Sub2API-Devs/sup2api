/**
 * plugins/functionHooks/agentApi.ts
 *
 * 2.1.316 新增：插件函数钩子 $.agent.spawn/register 接口实现
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AgentJsonSchema } from "../../tools/AgentTool/loadAgentsDir.js";
import { requireBoundSession, describeAgentTask } from "./sessionApi.js";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { registeredAgentsTable, refreshAgentsAndDefinitions } from "./hooksModuleLoader.js";
import { stableStringifySafe } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { FLAG_IDLE_WINDOW } from "../../tasks/LocalAgentTask/keepalive.js";
import { createToolUseContextView } from "../../Tool.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { getHiddenTeammateIds } from "../../utils/teamDiscovery.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { hasRunningBackgroundWorkForAgent } from "../../tasks/backgroundTaskKinds.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { toolCallForPlugin } from "./toolApi.js";
import { maxSubagents, lastAssistantText } from "./toolCallHooks.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS_2 } from "./dispatch/slowHookReports.js";
import { sleep } from "../../utils/sleep.js";
import { claimTaskNotification } from "../../utils/task/framework.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3826053-3826218 placement
function validateAgentDefinition(definition) {
  let { name, ...rest } = definition;
  let joined = (AgentJsonSchema().safeParse(rest).error?.issues ?? [])
    .map((issue) => [...issue.path.map(String), issue.message].join(": "))
    .join("; ");
  return joined === "" ? undefined : joined;
}
//@ chunk-5xgkngpb.js:3826218-3826855 placement
/**
 * $.agent.register 实现：校验代理定义，键为"插件显示名:代理名"；内容未变则跳过，否则登记或替换并刷新代理列表。
 */
async function registerAgentForPlugin(definition, { pluginName, pluginStorageId, pluginRoot }) {
  requireBoundSession(pluginName, "$.agent.register");
  let problem = validateAgentDefinition(definition);
  let agentId = `${pluginDisplayKey(pluginName, pluginStorageId)}:${definition.name}`;
  if (problem !== undefined) {
    logFeatureBad("plugin_function_hooks_register_agent", "invalid_definition");
    throw new HooksError(`${pluginName}: $.agent.register: "${definition.name}" refused: ${problem}`);
  }
  let existing = registeredAgentsTable.held(agentId);
  if (
    existing !== undefined &&
    existing.pluginId === pluginStorageId &&
    existing.pluginRoot === pluginRoot &&
    stableStringifySafe(existing.spec) === stableStringifySafe(definition)
  ) {
    logForDebugging(`$.agent.register (${pluginName}): ${agentId} unchanged; not re-registered`);
    return {
      agent: agentId,
    };
  }
  registeredAgentsTable.register({
    plugin: pluginName,
    pluginId: pluginStorageId,
    pluginRoot,
    spec: definition,
  });
  logForDebugging(
    `$.agent.register (${pluginName}): ${agentId} ${existing === undefined ? "listed" : "replaced"}`,
  );
  logFeatureOk("plugin_function_hooks_register_agent");
  await refreshAgentsAndDefinitions();
  return {
    agent: agentId,
  };
}
//@ chunk-5xgkngpb.js:3846521-3846936 placement
/**
 * 把代理/队友任务状态映射为对外状态：running 时区分等待/空闲，completed 时按保活原因与是否在收尾区分 running/waiting/idle/completed，paused→idle。
 */
function agentDisplayStatus(task, isTeammate) {
  let isTeammateTask = task.type === "in_process_teammate";
  switch (task.status) {
    case "running": {
      let isWaiting = (isTeammateTask ? task.awaitingPlanApproval : task.isIdle) === true;
      let isIdle = task.isIdle === true;
      return isWaiting ? "waiting" : isIdle ? "idle" : "running";
    }
    case "completed": {
      let keepaliveReasons = isTeammateTask ? [] : [...(task.keepaliveReasons ?? [])];
      let isFinalizing = !isTeammateTask && task.finalizing === true;
      let any = keepaliveReasons.some((reason) => reason !== FLAG_IDLE_WINDOW);
      let canBeIdle = !isTeammateTask && (isTeammate || keepaliveReasons.length > 0);
      return isFinalizing ? "running" : any ? "waiting" : canBeIdle ? "idle" : "completed";
    }
    case "paused":
      return "idle";
    default:
      return task.status;
  }
}
//@ chunk-5xgkngpb.js:3847299-3848140 placement
/**
 * $.agent.list 实现：遍历任务注册表中的本地代理与进程内队友，按代理去重，给出 id、队友 id、描述、类型、状态、父 id、发起插件与名字。
 */
async function listAgentsForPlugin(plugin) {
  let toolContext = requireBoundSession(plugin, "$.agent.list").toolContext(new AbortController());
  let { agentNameRegistry } = createToolUseContextView(toolContext).namedAgents();
  let nameToAgent = new Map();
  for (let [agentId, name] of agentNameRegistry) nameToAgent.set(name, agentId);
  let { spawnProvenance } = getPluginRegistry();
  let entries = new Map();
  let seenLiveIds = new Set();
  let values = Object.values(toolContext.taskRegistry.all());
  let hiddenTeammateIds = await getHiddenTeammateIds(values, toolContext.storageV5);
  for (let task of values) {
    let described = describeAgentTask(task);
    let isAgentTask = task.type === "local_agent" || task.type === "in_process_teammate";
    let isTerminal = isTerminalTaskStatus(task.status);
    if (described === undefined || !isAgentTask) continue;
    if (isTerminal && seenLiveIds.has(described.id)) continue;
    if (!isTerminal) seenLiveIds.add(described.id);
    let { id, teammateId, parentId } = described;
    let hookCaller = spawnProvenance.get(id)?.hookCaller;
    let displayName = described.name ?? nameToAgent.get(id);
    let status = hiddenTeammateIds.has(id) ? "idle" : agentDisplayStatus(task, displayName !== undefined);
    let row =
      status === "idle" && hasRunningBackgroundWorkForAgent(identityAgentId2(id), toolContext.taskRegistry);
    entries.set(id, {
      id,
      ...(teammateId !== undefined && {
        teammateId,
      }),
      description: described.description,
      type: described.type,
      status: row ? "waiting" : status,
      ...(parentId !== undefined && {
        parentId,
      }),
      ...(hookCaller !== undefined && {
        spawnedBy: hookCaller,
      }),
      ...(displayName !== undefined && {
        name: displayName,
      }),
    });
  }
  return [...entries.values()];
}
//@ chunk-5xgkngpb.js:4074224-4074625 placement
/**
 * $.agent.spawn 并发控制：每个插件同时运行的派生数有上限，超出拒绝；以 launch-only 方式调用工具，仍在运行的派生结束后才释放计数。
 */
function createAgentSpawner(runTool = toolCallForPlugin, getMaxSpawns = maxSubagents) {
  let runningByPlugin = new Map();
  return {
    spawn: async (input, context) => {
      let { plugin } = context;
      let running = runningByPlugin.get(plugin) ?? 0;
      let maxSpawns = getMaxSpawns();
      if (running >= maxSpawns) {
        logForDebugging(`$.agent.spawn (${plugin}): ${running} running at once; refused`);
        throw new HooksError(`${plugin}: $.agent.spawn refused: ${maxSpawns} spawns are running at once`);
      }
      runningByPlugin.set(plugin, running + 1);
      let release = () => {
        runningByPlugin.set(plugin, (runningByPlugin.get(plugin) ?? 1) - 1);
      };
      let wasLeftRunning = false;
      try {
        return await runTool(input, {
          ...context,
          isLaunchOnly: true,
          leftRunning: (taskId) => {
            wasLeftRunning = true;
            taskId.finally(release);
          },
        });
      } finally {
        if (!wasLeftRunning) release();
      }
    },
  };
}
//@ chunk-5xgkngpb.js:4074625-4074678 placement
/**
 * 取最后一条助手文本
 */
var lastAssistantTextOf = (registry, agentId) =>
  lastAssistantText(registry.getTranscript(agentId)?.messages ?? []);
//@ chunk-5xgkngpb.js:4074678-4074690 placement
/**
 * 150
 */
var AGENT_WAIT_POLL_MS = 150;
//@ chunk-5xgkngpb.js:4074690-4074701 placement
/**
 * 10
 */
var SLOW_HOOK_MINUTES = 10;
//@ chunk-5xgkngpb.js:4074701-4074712 placement
/**
 * 60
 */
var SECONDS_PER_MINUTE = 60;
//@ chunk-5xgkngpb.js:4074712-4074731 placement
/**
 * 慢钩子上报间隔
 */
var SLOW_HOOK_REPORT_MS; // deferred: uses SLOW_HOOK_REPORT_INTERVAL_MS_2 (./dispatch/slowHookReports.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4074712", () => {
  SLOW_HOOK_REPORT_MS = SLOW_HOOK_MINUTES * SECONDS_PER_MINUTE * SLOW_HOOK_REPORT_INTERVAL_MS_2;
});
//@ chunk-5xgkngpb.js:4074731-4074891 placement
function evictedAnswerResult(registry, agentId, pluginName) {
  let lastText = lastAssistantTextOf(registry, agentId);
  return lastText === ""
    ? {
        text: `${pluginName}: $.agent.spawn: the subagent's record was evicted before its answer was read`,
        isError: true,
      }
    : {
        text: lastText,
      };
}
//@ chunk-5xgkngpb.js:4074891-4074987 placement
/**
 * 轮询等待代理结束
 */
async function waitForAgentDone(registry, agentId) {
  for (;;) {
    let task = registry.get(agentId);
    if (task === undefined || isTerminalTaskStatus(task.status)) return;
    await sleep(AGENT_WAIT_POLL_MS);
  }
}
//@ chunk-5xgkngpb.js:4074987-4075089 placement
function abandonWaitResult(registry, agentId, text) {
  registry.update(agentId, (task) => ({
    ...task,
    notified: false,
  }));
  return {
    text,
    isError: true,
    settled: waitForAgentDone(registry, agentId),
  };
}
//@ chunk-5xgkngpb.js:4075089-4075803 placement
/**
 * 轮询等待插件派生的子代理结束：完成返回其最后回答，失败/被杀返回错误；超时（10 分钟）或中止时返回错误并在后台继续等待结算。
 */
async function awaitSpawnedAgentAnswer({
  registry,
  agentId,
  pluginName,
  signal,
  settleWaitMs = SLOW_HOOK_REPORT_MS,
}) {
  let now = Date.now();
  let claimedTaskId;
  for (;;) {
    let found = Object.values(registry.all()).find(
      (task) => task.type === "local_agent" && task.agentId === agentId,
    );
    if (found) {
      if (claimedTaskId === undefined) {
        claimedTaskId = found.id;
        claimTaskNotification(claimedTaskId, registry);
      }
      if (isTerminalTaskStatus(found.status)) {
        let lastText = lastAssistantTextOf(registry, agentId);
        if (found.status === "completed")
          return {
            text: lastText,
          };
        let errorText = "error" in found && typeof found.error === "string" ? found.error : lastText;
        return {
          text: `${pluginName}: $.agent.spawn: the subagent ${found.status}${errorText ? `: ${errorText}` : ""}`,
          isError: true,
        };
      }
    } else if (claimedTaskId !== undefined) return evictedAnswerResult(registry, agentId, pluginName);
    let errorText = Date.now() - now >= (claimedTaskId === undefined ? SLOW_HOOK_REPORT_MS : settleWaitMs);
    let text = signal.aborted
      ? `${pluginName}: $.agent.spawn aborted`
      : errorText
        ? `${pluginName}: $.agent.spawn: no answer within ${SLOW_HOOK_MINUTES} minutes`
        : undefined;
    if (text !== undefined) {
      if (claimedTaskId === undefined)
        return {
          text,
          isError: true,
        };
      return abandonWaitResult(registry, claimedTaskId, text);
    }
    await sleep(AGENT_WAIT_POLL_MS);
  }
}
export { awaitSpawnedAgentAnswer, listAgentsForPlugin, registerAgentForPlugin, createAgentSpawner };
