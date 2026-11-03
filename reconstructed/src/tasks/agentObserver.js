/**
 * tasks/agentObserver.ts
 *
 * 2.1.316 新增：观察者代理（agentObserver）的派生：写入观察者标记、首次运行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3h5pdzw6.js (3)
 * attribution: placement 3
 */
import { writeAgentMetadata, readAgentMetadata } from "../utils/sessionStorage.js";
import { Mr } from "../utils/agentId.js";
import { getCwd, runWithCwdOverride, RDn } from "../utils/cwd.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { narrowerMode } from "../utils/permissions/browserToolNames.js";
import { isMcpTool } from "../services/mcp/utils.js";
import { getAgentDepth, getWorkflowRunFields } from "../utils/agentContext.js";
import { observerToolset } from "../tools/AgentTool/agentLaunch.js";
import { resolveAgentTools, runAsyncAgentLifecycle } from "../tools/AgentTool/agentToolUtils.js";
import { excludeCoordinatorCommsMcpTools } from "../coordinator/coordinatorMcpServers.js";
import { bridgeToolsOf } from "../bridge/bridgePermissionResponse.js";
import { bN } from "../services/accountMemory/memoryContext.js";
import { getAgentModel } from "../utils/model/agent.js";
import { registerAsyncAgent, markAgentNotified } from "./LocalAgentTask/LocalAgentTask.js";
import { HM } from "../services/compact/compactCarry.js";
import { mainAgentId } from "../bootstrap/state.js";
import { isBuiltInAgent, isPluginAgent } from "../tools/AgentTool/loadAgentsDir.js";
import { parsePluginIdentifier_2 } from "../utils/plugins/pluginIdentifier.js";
import { getParentSessionId } from "../utils/teammate.js";
import { rue, runAgent } from "../tools/AgentTool/runAgent.js";
import { xo } from "../bootstrap/sessionSlices.js";
import { createUserMessage } from "../utils/messages.js";
import { getQuerySourceForAgent } from "../utils/promptCategory.js";
import { agentModelRestrictionNotifier } from "../utils/model/agentModelRestriction.js";
import { resumeAgentInline } from "../tools/AgentTool/resumeAgent.js";
import { setObserverSpawner } from "../services/agentObserver/agentObserver.js";
import { logForDebugging } from "../utils/debug.js";

/**
 * 写入并回读观察者代理的元数据标记。
 */
//@ chunk-3h5pdzw6.js:12970-13139 placement
async function writeObserverMarker(e, r, s) {
  if (
    (await writeAgentMetadata(Mr(e), { agentType: r.agentType, isObserver: !0 }, s),
    (await readAgentMetadata(Mr(e), s))?.isObserver !== !0)
  )
    throw Error("observer marker read-back failed");
}
/**
 * 观察者代理的派生器：首次运行时写观察者标记、构造框架提示词并启动代理任务。
 */
//@ chunk-3h5pdzw6.js:13139-15350 placement
var OBSERVER_SPAWNER = {
  async spawnFirstRun({
    observerDefinition: e,
    pairing: r,
    framingPrompt: s,
    digest: a,
    toolUseContext: o,
    canUseTool: w,
  }) {
    let observerTaskId = r.observerTaskId,
      withProject = o.session.withProject({ cwd: getCwd() });
    await writeObserverMarker(observerTaskId, e, o.storageV5);
    let { taskRegistry: taskRegistry } = o,
      m = getToolPermissionContext(o),
      c = narrowerMode(r.armingPermissionMode, m.mode) ?? m.mode,
      g = { ...m, mode: c },
      filtered = o.options.tools.filter(isMcpTool),
      l = `${e.agentType}@${r.observedEnvelopeName}`,
      i = getAgentDepth(o.agentContext) + 1,
      A = observerToolset(
        resolveAgentTools(
          e,
          o.options.toolCatalog.assembleToolPool(g, excludeCoordinatorCommsMcpTools(filtered), {
            skipReplFilter: !0,
            machineMcpTools: bridgeToolsOf(o),
          }),
          !0,
          !1,
          !1,
          i,
          bN(o).mode,
        ).resolvedTools,
      ),
      u = getAgentModel(e.model, o.options.mainLoopModel, void 0, g.mode),
      y = registerAsyncAgent({
        outputFileReadable: HM(o.options.tools),
        agentId: observerTaskId,
        ownerAgentId: mainAgentId(),
        spawnDepth: i,
        description: l,
        prompt: s,
        model: u,
        selectedAgent: e,
        taskRegistry: taskRegistry,
        cwd: void 0,
        isObserver: !0,
        sessionScratch: o.session.sessionScratch,
      });
    markAgentNotified(observerTaskId, taskRegistry);
    let k = {
        prompt: s,
        resolvedAgentModel: u,
        isBuiltInAgent: isBuiltInAgent(e),
        startTime: Date.now(),
        agentType: e.agentType,
        agentDepth: i,
        isAsync: !0,
        source: e.source,
        pluginId: isPluginAgent(e) ? parsePluginIdentifier_2(e.plugin) : void 0,
      },
      f = {
        agentId: observerTaskId,
        parentAgentId: o.agentId,
        depth: i,
        parentSessionId: getParentSessionId(),
        agentType: "subagent",
        subagentName: e.agentType,
        isBuiltIn: isBuiltInAgent(e),
        invocationKind: "spawn",
        invocationEmitted: !1,
        ...getWorkflowRunFields(o.agentContext),
      },
      { onToolPool: onToolPool, reviewTools: reviewTools } = rue(o.options.tools);
    await runWithCwdOverride(f, () =>
      RDn(xo(withProject).cwd, () =>
        runAsyncAgentLifecycle({
          taskId: observerTaskId,
          abortController: y.abortController,
          makeStream: (v, I, b) =>
            runAgent({
              agentDefinition: e,
              turnPrompt: s,
              promptMessages: [
                createUserMessage({ content: s }),
                createUserMessage({ content: a, origin: { kind: "observer-activity" } }),
              ],
              toolUseContext: o,
              canUseTool: w,
              isAsync: !0,
              querySource: getQuerySourceForAgent(e.agentType, isBuiltInAgent(e)),
              availableTools: A,
              useExactTools: !0,
              session: withProject,
              spawnMode: c,
              override: {
                agentId: Mr(observerTaskId),
                abortController: y.abortController,
                agentToolScope: e,
              },
              onModelRestricted: agentModelRestrictionNotifier(e.agentType, o.appendSystemMessage),
              onCacheSafeParams: v,
              onQueryProgress: I,
              onStreamTokenEstimate: b,
              onToolPool: onToolPool,
            }),
          metadata: { ...k, agentContext: f },
          description: l,
          toolUseContext: o,
          reviewTools: reviewTools,
          taskRegistry: taskRegistry,
          agentIdForCleanup: observerTaskId,
          enableSummarization: !1,
          getWorktreeResult: async () => ({}),
        }),
      ),
    );
  },
  async deliver({ observerTaskId: e, digest: r, toolUseContext: s, canUseTool: a, armingPermissionMode: o }) {
    await resumeAgentInline({
      agentId: e,
      prompt: r,
      promptOrigin: { kind: "observer-activity" },
      toolUseContext: s,
      canUseTool: a,
      suppressOwnerNotification: !0,
      workerPermissionMode: o,
    });
  },
};
//@ chunk-3h5pdzw6.js:15350-15443 placement
function registerObserverSpawner(e) {
  try {
    setObserverSpawner(e, OBSERVER_SPAWNER);
  } catch (error) {
    logForDebugging(`[agentObserver] spawner registration failed: ${error}`);
  }
}
