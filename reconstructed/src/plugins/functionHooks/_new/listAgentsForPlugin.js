/**
 * plugins/functionHooks/_new/listAgentsForPlugin.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { requireBoundSession, describeAgentTask } from "../sessionApi.js";
import { createToolUseContextView } from "../../../Tool.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { getHiddenTeammateIds } from "../../../utils/teamDiscovery.js";
import { isTerminalTaskStatus } from "../../../tasks/taskStatus.js";
import { agentDisplayStatus } from "./_new/agentDisplayStatus.js";
import { hasRunningBackgroundWorkForAgent } from "../../../tasks/backgroundTaskKinds.js";
import { Mr } from "../../../utils/agentId.js";

/**
 * $.agent.list 实现：遍历任务注册表中的本地代理与进程内队友，按代理去重，给出 id、队友 id、描述、类型、状态、父 id、发起插件与名字。
 */
//@ chunk-e6aww6q8.js:3751546-3752385 sole-consumer-new
async function listAgentsForPlugin(e) {
  let toolContext = requireBoundSession(e, "$.agent.list").toolContext(new AbortController()),
    { agentNameRegistry: agentNameRegistry } = createToolUseContextView(toolContext).namedAgents(),
    s = new Map();
  for (let [G, q] of agentNameRegistry) s.set(q, G);
  let { spawnProvenance: spawnProvenance } = getPluginRegistry(),
    y = new Map(),
    S = new Set(),
    values = Object.values(toolContext.taskRegistry.all()),
    L = await getHiddenTeammateIds(values, toolContext.storageV5);
  for (let G of values) {
    let q = describeAgentTask(G),
      Z = G.type === "local_agent" || G.type === "in_process_teammate",
      Se = isTerminalTaskStatus(G.status);
    if (q === void 0 || !Z) continue;
    if (Se && S.has(q.id)) continue;
    if (!Se) S.add(q.id);
    let { id: id, teammateId: teammateId, parentId: parentId } = q,
      Ae = spawnProvenance.get(id)?.hookCaller,
      Ie = q.name ?? s.get(id),
      Me = L.has(id) ? "idle" : agentDisplayStatus(G, Ie !== void 0),
      We = Me === "idle" && hasRunningBackgroundWorkForAgent(Mr(id), toolContext.taskRegistry);
    y.set(id, {
      id: id,
      ...(teammateId !== void 0 && { teammateId: teammateId }),
      description: q.description,
      type: q.type,
      status: We ? "waiting" : Me,
      ...(parentId !== void 0 && { parentId: parentId }),
      ...(Ae !== void 0 && { spawnedBy: Ae }),
      ...(Ie !== void 0 && { name: Ie }),
    });
  }
  return [...y.values()];
}

export { listAgentsForPlugin };
