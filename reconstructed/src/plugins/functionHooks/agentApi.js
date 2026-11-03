/**
 * plugins/functionHooks/agentApi.ts
 *
 * 2.1.316 新增：插件函数钩子 $.agent.spawn/register 接口实现
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { AgentJsonSchema } from "../../tools/AgentTool/loadAgentsDir.js";
import { requireBoundSession } from "./sessionApi.js";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { HooksError } from "./hooksErrors.js";
import { fWe, P3n } from "./hooksModuleLoader.js";
import { Rs } from "../../utils/hooks/hookSerialization.js";
import { logForDebugging } from "../../utils/debug.js";
import { toolCallForPlugin } from "./toolApi.js";
import { nUr, lastAssistantText } from "./toolCallHooks.js";
import { SLOW_HOOK_REPORT_INTERVAL_MS } from "./dispatch/slowHookReports.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { sleep } from "../../utils/sleep.js";
import { claimTaskNotification } from "../../utils/task/framework.js";

//@ chunk-e6aww6q8.js:3730319-3730484 placement
function validateAgentDefinition(e) {
  let { name: n, ...r } = e,
    joined = (AgentJsonSchema().safeParse(r).error?.issues ?? [])
      .map((h) => [...h.path.map(String), h.message].join(": "))
      .join("; ");
  return joined === "" ? void 0 : joined;
}
/**
 * $.agent.register 实现：校验代理定义，键为"插件显示名:代理名"；内容未变则跳过，否则登记或替换并刷新代理列表。
 */
//@ chunk-e6aww6q8.js:3730484-3731121 placement
async function registerAgentForPlugin(
  e,
  { pluginName: pluginName, pluginStorageId: pluginStorageId, pluginRoot: pluginRoot },
) {
  requireBoundSession(pluginName, "$.agent.register");
  let h = validateAgentDefinition(e),
    y = `${pluginDisplayKey(pluginName, pluginStorageId)}:${e.name}`;
  if (h !== void 0)
    throw (
      logFeatureBad("plugin_function_hooks_register_agent", "invalid_definition"),
      new HooksError(`${pluginName}: $.agent.register: "${e.name}" refused: ${h}`)
    );
  let held = fWe.held(y);
  if (
    held !== void 0 &&
    held.pluginId === pluginStorageId &&
    held.pluginRoot === pluginRoot &&
    Rs(held.spec) === Rs(e)
  )
    return (
      logForDebugging(`$.agent.register (${pluginName}): ${y} unchanged; not re-registered`),
      { agent: y }
    );
  return (
    fWe.register({ plugin: pluginName, pluginId: pluginStorageId, pluginRoot: pluginRoot, spec: e }),
    logForDebugging(`$.agent.register (${pluginName}): ${y} ${held === void 0 ? "listed" : "replaced"}`),
    logFeatureOk("plugin_function_hooks_register_agent"),
    await P3n(),
    { agent: y }
  );
}
/**
 * $.agent.spawn 并发控制：每个插件同时运行的派生数有上限，超出拒绝；以 launch-only 方式调用工具，仍在运行的派生结束后才释放计数。
 */
//@ chunk-e6aww6q8.js:3971994-3972395 placement
function createAgentSpawner(e = toolCallForPlugin, n = nUr) {
  let r = new Map();
  return {
    spawn: async (s, h) => {
      let { plugin: plugin } = h,
        S = r.get(plugin) ?? 0,
        w = n();
      if (S >= w)
        throw (
          logForDebugging(`$.agent.spawn (${plugin}): ${S} running at once; refused`),
          new HooksError(`${plugin}: $.agent.spawn refused: ${w} spawns are running at once`)
        );
      r.set(plugin, S + 1);
      let L = () => {
          r.set(plugin, (r.get(plugin) ?? 1) - 1);
        },
        G = !1;
      try {
        return await e(s, {
          ...h,
          isLaunchOnly: !0,
          leftRunning: (q) => {
            ((G = !0), q.finally(L));
          },
        });
      } finally {
        if (!G) L();
      }
    },
  };
}
//@ chunk-e6aww6q8.js:3972395-3972448 placement
var YPe = (e, n) => lastAssistantText(e.getTranscript(n)?.messages ?? []);
//@ chunk-e6aww6q8.js:3972448-3972460 placement
var Y$n = 150;
//@ chunk-e6aww6q8.js:3972460-3972471 placement
var iat = 10;
//@ chunk-e6aww6q8.js:3972471-3972482 placement
var X$n = 60;
//@ chunk-e6aww6q8.js:3972482-3972501 placement
var Q$n = iat * X$n * SLOW_HOOK_REPORT_INTERVAL_MS;
//@ chunk-e6aww6q8.js:3972501-3972661 placement
function evictedAnswerResult(e, n, r) {
  let s = YPe(e, n);
  return s === ""
    ? {
        text: `${r}: $.agent.spawn: the subagent's record was evicted before its answer was read`,
        isError: !0,
      }
    : { text: s };
}
//@ chunk-e6aww6q8.js:3972661-3972757 placement
async function Z$n(e, n) {
  for (;;) {
    let r = e.get(n);
    if (r === void 0 || isTerminalTaskStatus(r.status)) return;
    await sleep(Y$n);
  }
}
//@ chunk-e6aww6q8.js:3972757-3972859 placement
function abandonWaitResult(e, n, r) {
  return (e.update(n, (s) => ({ ...s, notified: !1 })), { text: r, isError: !0, settled: Z$n(e, n) });
}
/**
 * 轮询等待插件派生的子代理结束：完成返回其最后回答，失败/被杀返回错误；超时（10 分钟）或中止时返回错误并在后台继续等待结算。
 */
//@ chunk-e6aww6q8.js:3972859-3973570 placement
async function awaitSpawnedAgentAnswer({
  registry: registry,
  agentId: agentId,
  pluginName: pluginName,
  signal: signal,
  settleWaitMs: settleWaitMs = Q$n,
}) {
  let now = Date.now(),
    S;
  for (;;) {
    let found = Object.values(registry.all()).find((q) => q.type === "local_agent" && q.agentId === agentId);
    if (found) {
      if (S === void 0) ((S = found.id), claimTaskNotification(S, registry));
      if (isTerminalTaskStatus(found.status)) {
        let q = YPe(registry, agentId);
        if (found.status === "completed") return { text: q };
        let Z = "error" in found && typeof found.error === "string" ? found.error : q;
        return {
          text: `${pluginName}: $.agent.spawn: the subagent ${found.status}${Z ? `: ${Z}` : ""}`,
          isError: !0,
        };
      }
    } else if (S !== void 0) return evictedAnswerResult(registry, agentId, pluginName);
    let L = Date.now() - now >= (S === void 0 ? Q$n : settleWaitMs),
      G = signal.aborted
        ? `${pluginName}: $.agent.spawn aborted`
        : L
          ? `${pluginName}: $.agent.spawn: no answer within ${iat} minutes`
          : void 0;
    if (G !== void 0) {
      if (S === void 0) return { text: G, isError: !0 };
      return abandonWaitResult(registry, S, G);
    }
    await sleep(Y$n);
  }
}

export { awaitSpawnedAgentAnswer, registerAgentForPlugin, createAgentSpawner };
