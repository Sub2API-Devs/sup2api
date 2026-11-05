/**
 * tasks/agentObserver.ts
 *
 * 2.1.316 新增：观察者代理（agentObserver）的派生：写入观察者标记、首次运行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cdks58w4.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { writeAgentMetadata, readAgentMetadata } from "../utils/sessionStorage.js";
import { identityAgentId2 } from "../utils/agentId.js";
import { getCwd, runWithCwdOverride, resolveFromCwd } from "../utils/cwd.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { narrowerMode } from "../utils/permissions/browserToolNames.js";
import { isMcpTool } from "../services/mcp/utils.js";
import { getAgentDepth, getWorkflowRunFields } from "../utils/agentContext.js";
import { observerToolset } from "../tools/AgentTool/agentLaunch.js";
import { resolveAgentTools, runAsyncAgentLifecycle } from "../tools/AgentTool/agentToolUtils.js";
import { excludeCoordinatorCommsMcpTools } from "../coordinator/coordinatorMcpServers.js";
import { bridgeToolsOf } from "../bridge/bridgePermissionResponse.js";
import { memoryModeForSession } from "../services/accountMemory/memoryContext.js";
import { getAgentModel } from "../utils/model/agent.js";
import { registerAsyncAgent, markAgentNotified } from "./LocalAgentTask/LocalAgentTask.js";
import { willToolsLoseSessionState } from "../services/compact/compactCarry.js";
import { mainAgentId } from "../bootstrap/state.js";
import { isBuiltInAgent, isPluginAgent } from "../tools/AgentTool/loadAgentsDir.js";
import { parsePluginIdentifier_2 } from "../utils/plugins/pluginIdentifier.js";
import { getParentSessionId } from "../utils/teammate.js";
import { createDeferredReviewTools, runAgent } from "../tools/AgentTool/runAgent.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { createUserMessage } from "../utils/messages.js";
import { getQuerySourceForAgent } from "../utils/promptCategory.js";
import { agentModelRestrictionNotifier } from "../utils/model/agentModelRestriction.js";
import { resumeAgentInline } from "../tools/AgentTool/resumeAgent.js";
import { setObserverSpawner } from "../services/agentObserver/agentObserver.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-cdks58w4.js:14146-14315 placement
/**
 * 写入并回读观察者代理的元数据标记。
 */
async function writeObserverMarker(observerTaskId, observerDefinition, storageV5) {
  await writeAgentMetadata(
    identityAgentId2(observerTaskId),
    {
      agentType: observerDefinition.agentType,
      isObserver: true,
    },
    storageV5,
  );
  if ((await readAgentMetadata(identityAgentId2(observerTaskId), storageV5))?.isObserver !== true)
    throw Error("observer marker read-back failed");
}
//@ chunk-cdks58w4.js:14315-16526 placement
/**
 * 观察者代理的派生器：首次运行时写观察者标记、构造框架提示词并启动代理任务。
 */
var OBSERVER_SPAWNER = {
  async spawnFirstRun({ observerDefinition, pairing, framingPrompt, digest, toolUseContext, canUseTool }) {
    let observerTaskId = pairing.observerTaskId;
    let projectSession = toolUseContext.session.withProject({
      cwd: getCwd(),
    });
    await writeObserverMarker(observerTaskId, observerDefinition, toolUseContext.storageV5);
    let { taskRegistry } = toolUseContext;
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let spawnMode =
      narrowerMode(pairing.armingPermissionMode, toolPermissionContext.mode) ?? toolPermissionContext.mode;
    let spawnPermissionContext = {
      ...toolPermissionContext,
      mode: spawnMode,
    };
    let filtered = toolUseContext.options.tools.filter(isMcpTool);
    let description = `${observerDefinition.agentType}@${pairing.observedEnvelopeName}`;
    let agentDepth = getAgentDepth(toolUseContext.agentContext) + 1;
    let availableTools = observerToolset(
      resolveAgentTools(
        observerDefinition,
        toolUseContext.options.toolCatalog.assembleToolPool(
          spawnPermissionContext,
          excludeCoordinatorCommsMcpTools(filtered),
          {
            skipReplFilter: true,
            machineMcpTools: bridgeToolsOf(toolUseContext),
          },
        ),
        true,
        false,
        false,
        agentDepth,
        memoryModeForSession(toolUseContext).mode,
      ).resolvedTools,
    );
    let agentModel = getAgentModel(
      observerDefinition.model,
      toolUseContext.options.mainLoopModel,
      undefined,
      spawnPermissionContext.mode,
    );
    let spawned = registerAsyncAgent({
      outputFileReadable: willToolsLoseSessionState(toolUseContext.options.tools),
      agentId: observerTaskId,
      ownerAgentId: mainAgentId(),
      spawnDepth: agentDepth,
      description,
      prompt: framingPrompt,
      model: agentModel,
      selectedAgent: observerDefinition,
      taskRegistry,
      cwd: undefined,
      isObserver: true,
      sessionScratch: toolUseContext.session.sessionScratch,
    });
    markAgentNotified(observerTaskId, taskRegistry);
    let metadata = {
      prompt: framingPrompt,
      resolvedAgentModel: agentModel,
      isBuiltInAgent: isBuiltInAgent(observerDefinition),
      startTime: Date.now(),
      agentType: observerDefinition.agentType,
      agentDepth,
      isAsync: true,
      source: observerDefinition.source,
      pluginId: isPluginAgent(observerDefinition)
        ? parsePluginIdentifier_2(observerDefinition.plugin)
        : undefined,
    };
    let agentContext = {
      agentId: observerTaskId,
      parentAgentId: toolUseContext.agentId,
      depth: agentDepth,
      parentSessionId: getParentSessionId(),
      agentType: "subagent",
      subagentName: observerDefinition.agentType,
      isBuiltIn: isBuiltInAgent(observerDefinition),
      invocationKind: "spawn",
      invocationEmitted: false,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    };
    let { onToolPool, reviewTools } = createDeferredReviewTools(toolUseContext.options.tools);
    await runWithCwdOverride(agentContext, () =>
      resolveFromCwd(getSessionProject(projectSession).cwd, () =>
        runAsyncAgentLifecycle({
          taskId: observerTaskId,
          abortController: spawned.abortController,
          makeStream: (onCacheSafeParams, onQueryProgress, onStreamTokenEstimate) =>
            runAgent({
              agentDefinition: observerDefinition,
              turnPrompt: framingPrompt,
              promptMessages: [
                createUserMessage({
                  content: framingPrompt,
                }),
                createUserMessage({
                  content: digest,
                  origin: {
                    kind: "observer-activity",
                  },
                }),
              ],
              toolUseContext,
              canUseTool,
              isAsync: true,
              querySource: getQuerySourceForAgent(
                observerDefinition.agentType,
                isBuiltInAgent(observerDefinition),
              ),
              availableTools,
              useExactTools: true,
              session: projectSession,
              spawnMode,
              override: {
                agentId: identityAgentId2(observerTaskId),
                abortController: spawned.abortController,
                agentToolScope: observerDefinition,
              },
              onModelRestricted: agentModelRestrictionNotifier(
                observerDefinition.agentType,
                toolUseContext.appendSystemMessage,
              ),
              onCacheSafeParams,
              onQueryProgress,
              onStreamTokenEstimate,
              onToolPool,
            }),
          metadata: {
            ...metadata,
            agentContext,
          },
          description,
          toolUseContext,
          reviewTools,
          taskRegistry,
          agentIdForCleanup: observerTaskId,
          enableSummarization: false,
          getWorktreeResult: async () => ({}),
        }),
      ),
    );
  },
  async deliver({ observerTaskId, digest, toolUseContext, canUseTool, armingPermissionMode }) {
    await resumeAgentInline({
      agentId: observerTaskId,
      prompt: digest,
      promptOrigin: {
        kind: "observer-activity",
      },
      toolUseContext,
      canUseTool,
      suppressOwnerNotification: true,
      workerPermissionMode: armingPermissionMode,
    });
  },
};
//@ chunk-cdks58w4.js:16526-16619 placement
function registerObserverSpawner(rootSession) {
  try {
    setObserverSpawner(rootSession, OBSERVER_SPAWNER);
  } catch (error) {
    logForDebugging(`[agentObserver] spawner registration failed: ${error}`);
  }
}
export { registerObserverSpawner, OBSERVER_SPAWNER };
