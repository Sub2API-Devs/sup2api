/**
 * utils/queryContext.ts
 *
 * 获取系统提示各部分（默认提示、用户/系统上下文），构造旁路问题的回退参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/queryContext.ts
 * pieces: chunk-dmpxe2vf.js (2)
 * attribution: facade-exports 2
 */
import { getSystemPrompt, W6s } from "../constants/prompts.js";
import { getOrBuildUserContext, getCachedSystemContext } from "../context.js";
import { getRuntimeMainLoopModel } from "./model/planModeModel.js";
import { getMainLoopModel } from "./model/model.js";
import { asSystemPrompt } from "./systemPromptType.js";
import { withCliSections } from "../constants/promptSections.js";
import { baseSystemPromptOf } from "./systemPromptBoundary.js";
import { mainAgentContext } from "./agentContext.js";
import { isBetaHeaderAllowed } from "./betas.js";
import { createAbortController } from "./abortController.js";
import { freeze_2, createColorAssigner } from "../services/artifacts/artifactReadConsent.js";
import { createAppStateAccessors } from "../state/appStateSetters.js";
import { createNotificationDrain } from "../services/queuedNotifications/queuedNotifications.js";
import { createTaskFramework } from "./task/framework.js";
import { wIe } from "../state/sliceHelpers.js";

/**
 * 获取系统提示的各部分（默认提示、用户上下文、系统上下文），供旁路问题等复用。
 */
//@ chunk-dmpxe2vf.js:583-1110 facade-exports = fetchSystemPromptParts (0.661)
async function fetchSystemPromptParts({
  session: session,
  tools: tools,
  mainLoopModel: mainLoopModel,
  customSystemPrompt: customSystemPrompt,
  excludeDynamicSections: excludeDynamicSections,
  cacheBreakerPhrase: cacheBreakerPhrase,
  analysisOnly: analysisOnly,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let [m, l, e, t] = await Promise.all([
    customSystemPrompt !== void 0
      ? Promise.resolve([])
      : getSystemPrompt(tools, mainLoopModel, {
          excludeDynamicSections: excludeDynamicSections,
          analysisOnly: analysisOnly,
        }),
    getOrBuildUserContext(session, storageV5, credentials),
    customSystemPrompt !== void 0 ? Promise.resolve({}) : getCachedSystemContext(session, cacheBreakerPhrase),
    excludeDynamicSections && customSystemPrompt === void 0
      ? W6s(mainLoopModel, { analysisOnly: analysisOnly })
      : Promise.resolve({}),
  ]);
  if (excludeDynamicSections)
    return { defaultSystemPrompt: m, userContext: { ...e, ...l, ...t }, systemContext: {} };
  return { defaultSystemPrompt: m, userContext: l, systemContext: e };
}
//@ chunk-dmpxe2vf.js:1110-2919 facade-exports = buildSideQuestionFallbackParams (0.628)
async function buildSideQuestionFallbackParams({
  session: session,
  messageQueue: messageQueue,
  tools: tools,
  toolCatalog: toolCatalog,
  commands: commands,
  mcpClients: mcpClients,
  messages: messages,
  turnInProgress: turnInProgress,
  readFileState: readFileState,
  toolState: toolState,
  sessionHooks: sessionHooks,
  getAppState: getAppState,
  setAppState: setAppState,
  customSystemPrompt: customSystemPrompt,
  appendSystemPrompt: appendSystemPrompt,
  excludeDynamicSections: excludeDynamicSections,
  thinkingConfig: thinkingConfig,
  agents: agents,
  storageV5: storageV5,
  credentials: credentials,
  runQuery: runQuery,
}) {
  let mainLoopModel = getAppState(),
    u = getRuntimeMainLoopModel({
      permissionMode: mainLoopModel.toolPermissionContext.mode,
      mainLoopModel: getMainLoopModel(),
    }),
    {
      defaultSystemPrompt: defaultSystemPrompt,
      userContext: userContext,
      systemContext: systemContext,
    } = await fetchSystemPromptParts({
      session: session,
      tools: tools,
      mainLoopModel: u,
      customSystemPrompt: customSystemPrompt,
      excludeDynamicSections: excludeDynamicSections,
      cacheBreakerPhrase: mainLoopModel.cacheBreakerPhrase,
      analysisOnly: !0,
      storageV5: storageV5,
      credentials: credentials,
    }),
    systemPrompt = asSystemPrompt(
      withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
        tools: tools,
        appendSystemPrompt: appendSystemPrompt,
      }),
    ),
    last = messages.at(-1),
    forkContextMessages =
      turnInProgress && last?.type === "assistant" && last.message.stop_reason === null
        ? messages.slice(0, -1)
        : messages,
    H = {
      messageQueue: messageQueue,
      session: session,
      storageV5: storageV5,
      credentials: credentials,
      agentContext: mainAgentContext(),
      options: {
        commands: commands,
        debug: !1,
        mainLoopModel: u,
        tools: tools,
        toolCatalog: toolCatalog,
        verbose: !1,
        thinkingConfig:
          thinkingConfig ?? (isBetaHeaderAllowed() !== !1 ? { type: "adaptive" } : { type: "disabled" }),
        mcpClients: mcpClients,
        mcpResources: {},
        isNonInteractiveSession: !0,
        runQuery: runQuery,
        agentDefinitions: { activeAgents: agents, allAgents: [] },
        customSystemPrompt: customSystemPrompt,
        ...(customSystemPrompt !== void 0 && { omitGitStatus: !0 }),
        appendSystemPrompt: appendSystemPrompt,
        autoCompactWindow: mainLoopModel.autoCompactWindow,
        fastMode: mainLoopModel.fastMode,
        cacheBreakerPhrase: mainLoopModel.cacheBreakerPhrase,
      },
      abortController: createAbortController(),
      readFileState: readFileState,
      toolState: toolState,
      toolDecisions: new Map(),
      permissionRelays: freeze_2,
      getAppState: getAppState,
      setAppState: setAppState,
      ...createAppStateAccessors(getAppState, setAppState),
      queuedNotificationsRegistry: createNotificationDrain(getAppState, setAppState, session),
      taskRegistry: createTaskFramework(getAppState, setAppState),
      sessionHooksRegistry: sessionHooks,
      teammateColors: createColorAssigner(wIe(getAppState, setAppState, "teammateColors")),
      rootToolSurface: { tools: tools, mainLoopModel: u },
      messages: forkContextMessages,
      turnStartIndex: 0,
      getFileHistoryState: () => {
        return;
      },
      applyFileHistoryOp: () => {},
      applyAttributionOp: () => {},
    };
  return {
    systemPrompt: systemPrompt,
    userContext: userContext,
    systemContext: systemContext,
    toolUseContext: H,
    forkContextMessages: forkContextMessages,
    advisorModel: mainLoopModel.advisorModel,
  };
}

export { buildSideQuestionFallbackParams, fetchSystemPromptParts };
