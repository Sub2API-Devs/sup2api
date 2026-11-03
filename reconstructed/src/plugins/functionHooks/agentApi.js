/**
 * plugins/functionHooks/agentApi.ts
 *
 * 2.1.316 新增：插件函数钩子 $.agent.spawn/register 接口实现
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (14)
 * attribution: placement 14
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

//@ chunk-e6aww6q8.js:3730319-3730484 placement
function validateAgentDefinition(e) {
  let { name: n, ...r } = e;
  let joined = (AgentJsonSchema().safeParse(r).error?.issues ?? [])
    .map((h) => [...h.path.map(String), h.message].join(": "))
    .join("; ");
  return joined === "" ? undefined : joined;
}
//@ chunk-e6aww6q8.js:3730484-3731121 placement
/**
 * $.agent.register 实现：校验代理定义，键为"插件显示名:代理名"；内容未变则跳过，否则登记或替换并刷新代理列表。
 */
async function registerAgentForPlugin(e, { pluginName, pluginStorageId, pluginRoot }) {
  requireBoundSession(pluginName, "$.agent.register");
  let h = validateAgentDefinition(e);
  let y = `${pluginDisplayKey(pluginName, pluginStorageId)}:${e.name}`;
  if (h !== undefined) {
    logFeatureBad("plugin_function_hooks_register_agent", "invalid_definition");
    throw new HooksError(`${pluginName}: $.agent.register: "${e.name}" refused: ${h}`);
  }
  let S = registeredAgentsTable.held(y);
  if (
    S !== undefined &&
    S.pluginId === pluginStorageId &&
    S.pluginRoot === pluginRoot &&
    stableStringifySafe(S.spec) === stableStringifySafe(e)
  ) {
    logForDebugging(`$.agent.register (${pluginName}): ${y} unchanged; not re-registered`);
    return {
      agent: y,
    };
  }
  registeredAgentsTable.register({
    plugin: pluginName,
    pluginId: pluginStorageId,
    pluginRoot,
    spec: e,
  });
  logForDebugging(`$.agent.register (${pluginName}): ${y} ${S === undefined ? "listed" : "replaced"}`);
  logFeatureOk("plugin_function_hooks_register_agent");
  await refreshAgentsAndDefinitions();
  return {
    agent: y,
  };
}
//@ chunk-e6aww6q8.js:3750768-3751183 placement
/**
 * 把代理/队友任务状态映射为对外状态：running 时区分等待/空闲，completed 时按保活原因与是否在收尾区分 running/waiting/idle/completed，paused→idle。
 */
function agentDisplayStatus(e, n) {
  let r = e.type === "in_process_teammate";
  switch (e.status) {
    case "running": {
      let s = (r ? e.awaitingPlanApproval : e.isIdle) === true;
      let h = e.isIdle === true;
      return s ? "waiting" : h ? "idle" : "running";
    }
    case "completed": {
      let s = r ? [] : [...(e.keepaliveReasons ?? [])];
      let h = !r && e.finalizing === true;
      let any = s.some((w) => w !== FLAG_IDLE_WINDOW);
      let S = !r && (n || s.length > 0);
      return h ? "running" : any ? "waiting" : S ? "idle" : "completed";
    }
    case "paused":
      return "idle";
    default:
      return e.status;
  }
}
//@ chunk-e6aww6q8.js:3751546-3752385 placement
/**
 * $.agent.list 实现：遍历任务注册表中的本地代理与进程内队友，按代理去重，给出 id、队友 id、描述、类型、状态、父 id、发起插件与名字。
 */
async function listAgentsForPlugin(plugin) {
  let n = requireBoundSession(plugin, "$.agent.list").toolContext(new AbortController());
  let { agentNameRegistry } = createToolUseContextView(n).namedAgents();
  let s = new Map();
  for (let [G, q] of agentNameRegistry) s.set(q, G);
  let { spawnProvenance } = getPluginRegistry();
  let y = new Map();
  let S = new Set();
  let values = Object.values(n.taskRegistry.all());
  let hiddenTeammateIds = await getHiddenTeammateIds(values, n.storageV5);
  for (let G of values) {
    let q = describeAgentTask(G);
    let Z = G.type === "local_agent" || G.type === "in_process_teammate";
    let Se = isTerminalTaskStatus(G.status);
    if (q === undefined || !Z) continue;
    if (Se && S.has(q.id)) continue;
    if (!Se) S.add(q.id);
    let { id, teammateId, parentId } = q;
    let hookCaller = spawnProvenance.get(id)?.hookCaller;
    let Ie = q.name ?? s.get(id);
    let Me = hiddenTeammateIds.has(id) ? "idle" : agentDisplayStatus(G, Ie !== undefined);
    let We = Me === "idle" && hasRunningBackgroundWorkForAgent(identityAgentId2(id), n.taskRegistry);
    y.set(id, {
      id,
      ...(teammateId !== undefined && {
        teammateId,
      }),
      description: q.description,
      type: q.type,
      status: We ? "waiting" : Me,
      ...(parentId !== undefined && {
        parentId,
      }),
      ...(hookCaller !== undefined && {
        spawnedBy: hookCaller,
      }),
      ...(Ie !== undefined && {
        name: Ie,
      }),
    });
  }
  return [...y.values()];
}
//@ chunk-e6aww6q8.js:3971994-3972395 placement
/**
 * $.agent.spawn 并发控制：每个插件同时运行的派生数有上限，超出拒绝；以 launch-only 方式调用工具，仍在运行的派生结束后才释放计数。
 */
function createAgentSpawner(e = toolCallForPlugin, n = maxSubagents) {
  let r = new Map();
  return {
    spawn: async (s, h) => {
      let { plugin } = h;
      let S = r.get(plugin) ?? 0;
      let w = n();
      if (S >= w) {
        logForDebugging(`$.agent.spawn (${plugin}): ${S} running at once; refused`);
        throw new HooksError(`${plugin}: $.agent.spawn refused: ${w} spawns are running at once`);
      }
      r.set(plugin, S + 1);
      let L = () => {
        r.set(plugin, (r.get(plugin) ?? 1) - 1);
      };
      let G = false;
      try {
        return await e(s, {
          ...h,
          isLaunchOnly: true,
          leftRunning: (q) => {
            G = true;
            q.finally(L);
          },
        });
      } finally {
        if (!G) L();
      }
    },
  };
}
//@ chunk-e6aww6q8.js:3972395-3972448 placement
/**
 * 取最后一条助手文本
 */
var lastAssistantTextOf = (e, n) => lastAssistantText(e.getTranscript(n)?.messages ?? []);
//@ chunk-e6aww6q8.js:3972448-3972460 placement
/**
 * 150
 */
var AGENT_WAIT_POLL_MS = 150;
//@ chunk-e6aww6q8.js:3972460-3972471 placement
/**
 * 10
 */
var SLOW_HOOK_MINUTES = 10;
//@ chunk-e6aww6q8.js:3972471-3972482 placement
/**
 * 60
 */
var SECONDS_PER_MINUTE = 60;
//@ chunk-e6aww6q8.js:3972482-3972501 placement
/**
 * 慢钩子上报间隔
 */
var SLOW_HOOK_REPORT_MS = SLOW_HOOK_MINUTES * SECONDS_PER_MINUTE * SLOW_HOOK_REPORT_INTERVAL_MS_2;
//@ chunk-e6aww6q8.js:3972501-3972661 placement
function evictedAnswerResult(registry, agentId, pluginName) {
  let s = lastAssistantTextOf(registry, agentId);
  return s === ""
    ? {
        text: `${pluginName}: $.agent.spawn: the subagent's record was evicted before its answer was read`,
        isError: true,
      }
    : {
        text: s,
      };
}
//@ chunk-e6aww6q8.js:3972661-3972757 placement
/**
 * 轮询等待代理结束
 */
async function waitForAgentDone(e, n) {
  for (;;) {
    let r = e.get(n);
    if (r === undefined || isTerminalTaskStatus(r.status)) return;
    await sleep(AGENT_WAIT_POLL_MS);
  }
}
//@ chunk-e6aww6q8.js:3972757-3972859 placement
function abandonWaitResult(registry, n, text) {
  registry.update(n, (s) => ({
    ...s,
    notified: false,
  }));
  return {
    text,
    isError: true,
    settled: waitForAgentDone(registry, n),
  };
}
//@ chunk-e6aww6q8.js:3972859-3973570 placement
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
  let S;
  for (;;) {
    let found = Object.values(registry.all()).find((q) => q.type === "local_agent" && q.agentId === agentId);
    if (found) {
      if (S === undefined) {
        S = found.id;
        claimTaskNotification(S, registry);
      }
      if (isTerminalTaskStatus(found.status)) {
        let q = lastAssistantTextOf(registry, agentId);
        if (found.status === "completed")
          return {
            text: q,
          };
        let Z = "error" in found && typeof found.error === "string" ? found.error : q;
        return {
          text: `${pluginName}: $.agent.spawn: the subagent ${found.status}${Z ? `: ${Z}` : ""}`,
          isError: true,
        };
      }
    } else if (S !== undefined) return evictedAnswerResult(registry, agentId, pluginName);
    let L = Date.now() - now >= (S === undefined ? SLOW_HOOK_REPORT_MS : settleWaitMs);
    let text = signal.aborted
      ? `${pluginName}: $.agent.spawn aborted`
      : L
        ? `${pluginName}: $.agent.spawn: no answer within ${SLOW_HOOK_MINUTES} minutes`
        : undefined;
    if (text !== undefined) {
      if (S === undefined)
        return {
          text,
          isError: true,
        };
      return abandonWaitResult(registry, S, text);
    }
    await sleep(AGENT_WAIT_POLL_MS);
  }
}
export { awaitSpawnedAgentAnswer, listAgentsForPlugin, registerAgentForPlugin, createAgentSpawner };
