/**
 * utils/queryContext.ts
 *
 * 获取系统提示各部分（默认提示、用户/系统上下文），构造旁路问题的回退参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queryContext.ts
 * pieces: chunk-t4k9zryy.js (2)
 * attribution: facade-exports 2
 */
import { getSystemPrompt, buildMemoryDirectorySection } from "../constants/prompts.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../context.js";
import { getRuntimeMainLoopModel } from "./model/planModeModel.js";
import { getMainLoopModel } from "./model/model.js";
import { asSystemPrompt } from "./systemPromptType.js";
import { withCliSections } from "../constants/promptSections.js";
import { baseSystemPromptOf } from "./systemPromptBoundary.js";
import { mainAgentContext } from "./agentContext.js";
import { isBetaHeaderAllowed } from "./betas.js";
import { createAbortController } from "./abortController.js";
import { NO_BRIDGE_CONSENT } from "../screens/repl/bridgeChannelSlot.js";
import { createAppStateAccessors } from "../state/appStateSetters.js";
import { createNotificationDrain } from "../services/queuedNotifications/queuedNotifications.js";
import { createTaskFramework } from "./task/framework.js";
import { createColorAssigner } from "../tools/AgentTool/agentColorManager.js";
import { fieldAccessor } from "../state/sliceHelpers.js";

//@ chunk-t4k9zryy.js:583-1110 facade-exports (2.1.88 match: fetchSystemPromptParts, 0.661)
/**
 * 获取系统提示的各部分（默认提示、用户上下文、系统上下文），供旁路问题等复用。
 */
async function fetchSystemPromptParts({
  session,
  tools,
  mainLoopModel,
  customSystemPrompt,
  excludeDynamicSections,
  cacheBreakerPhrase,
  analysisOnly,
  storageV5,
  credentials,
}) {
  let [defaultSystemPrompt, userContext, systemContext, extraContext] = await Promise.all([
    customSystemPrompt !== undefined
      ? Promise.resolve([])
      : getSystemPrompt(tools, mainLoopModel, {
          excludeDynamicSections,
          analysisOnly,
        }),
    getOrBuildUserContext(session, storageV5, credentials),
    customSystemPrompt !== undefined
      ? Promise.resolve({})
      : getCachedSystemContext(session, cacheBreakerPhrase),
    excludeDynamicSections && customSystemPrompt === undefined
      ? buildMemoryDirectorySection(mainLoopModel, {
          analysisOnly,
        })
      : Promise.resolve({}),
  ]);
  if (excludeDynamicSections)
    return {
      defaultSystemPrompt,
      userContext: {
        ...systemContext,
        ...userContext,
        ...extraContext,
      },
      systemContext: {},
    };
  return {
    defaultSystemPrompt,
    userContext,
    systemContext,
  };
}
//@ chunk-t4k9zryy.js:1110-2919 facade-exports (2.1.88 match: buildSideQuestionFallbackParams, 0.622)
async function buildSideQuestionFallbackParams({
  session,
  messageQueue,
  tools,
  toolCatalog,
  commands,
  mcpClients,
  messages,
  turnInProgress,
  readFileState,
  toolState,
  sessionHooks,
  getAppState,
  setAppState,
  customSystemPrompt,
  appendSystemPrompt,
  excludeDynamicSections,
  thinkingConfig,
  agents,
  storageV5,
  credentials,
  runQuery,
}) {
  let mainLoopModel = getAppState();
  let mainLoopModel_2 = getRuntimeMainLoopModel({
    permissionMode: mainLoopModel.toolPermissionContext.mode,
    mainLoopModel: getMainLoopModel(),
  });
  let { defaultSystemPrompt, userContext, systemContext } = await fetchSystemPromptParts({
    session,
    tools,
    mainLoopModel: mainLoopModel_2,
    customSystemPrompt,
    excludeDynamicSections,
    cacheBreakerPhrase: mainLoopModel.cacheBreakerPhrase,
    analysisOnly: true,
    storageV5,
    credentials,
  });
  let systemPrompt = asSystemPrompt(
    withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
      tools,
      appendSystemPrompt,
    }),
  );
  let last = messages.at(-1);
  let forkContextMessages =
    turnInProgress && last?.type === "assistant" && last.message.stop_reason === null
      ? messages.slice(0, -1)
      : messages;
  let toolUseContext = {
    messageQueue,
    session,
    storageV5,
    credentials,
    agentContext: mainAgentContext(),
    options: {
      commands,
      debug: false,
      mainLoopModel: mainLoopModel_2,
      tools,
      toolCatalog,
      verbose: false,
      thinkingConfig:
        thinkingConfig ??
        (isBetaHeaderAllowed() !== false
          ? {
              type: "adaptive",
            }
          : {
              type: "disabled",
            }),
      mcpClients,
      mcpResources: {},
      isNonInteractiveSession: true,
      runQuery,
      agentDefinitions: {
        activeAgents: agents,
        allAgents: [],
      },
      customSystemPrompt,
      ...(customSystemPrompt !== undefined && {
        omitGitStatus: true,
      }),
      appendSystemPrompt,
      autoCompactWindow: mainLoopModel.autoCompactWindow,
      fastMode: mainLoopModel.fastMode,
      cacheBreakerPhrase: mainLoopModel.cacheBreakerPhrase,
    },
    abortController: createAbortController(),
    readFileState,
    toolState,
    toolDecisions: new Map(),
    permissionRelays: NO_BRIDGE_CONSENT,
    getAppState,
    setAppState,
    ...createAppStateAccessors(getAppState, setAppState),
    queuedNotificationsRegistry: createNotificationDrain(getAppState, setAppState, session),
    taskRegistry: createTaskFramework(getAppState, setAppState),
    sessionHooksRegistry: sessionHooks,
    teammateColors: createColorAssigner(fieldAccessor(getAppState, setAppState, "teammateColors")),
    rootToolSurface: {
      tools,
      mainLoopModel: mainLoopModel_2,
    },
    messages: forkContextMessages,
    turnStartIndex: 0,
    getFileHistoryState: () => {
      return;
    },
    applyFileHistoryOp: () => {},
    applyAttributionOp: () => {},
  };
  return {
    systemPrompt,
    userContext,
    systemContext,
    toolUseContext,
    forkContextMessages,
    advisorModel: mainLoopModel.advisorModel,
  };
}
export { buildSideQuestionFallbackParams, fetchSystemPromptParts };
