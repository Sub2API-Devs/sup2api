/**
 * utils/exportRenderer.tsx
 *
 * 把消息静态渲染为纯文本（/export、转录导出用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/exportRenderer.tsx
 * pieces: chunk-ag5x7vhf.js (13)
 * attribution: placement 4, sole-consumer 3, affinity 1, fingerprint 2, layout 2, callgraph-fingerprint 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import {
  selectLoading,
  selectStreamingToolUses,
  EMPTY_TOOL_USE_LIST,
  selectUserInputOnProcessing,
  selectPlaceholderOrigin,
  selectFollowingPrompts,
  EMPTY_ARRAY_B,
  selectPlaceholderWaitedInQueue,
  selectIsBriefOnly,
  selectVerbose_2_2,
  EMPTY_ARRAY_A,
  keepPreviousIfSame,
  selectSettledReply,
  EMPTY_ARRAY_C,
  selectUuid,
  transcriptPlugin,
  EMPTY_ID_SET,
  Messages,
  TerminalTaskProgress,
  LogoHeader,
} from "../components/Messages.js";
import { TurnSpinnerRow } from "../screens/replDialogState.js";
import { useAppState } from "../state/AppState.js";
import {
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  init_react_production,
  useRef,
  useState,
} from "../../vendor/react/cjs/react.production.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";
import { shouldShowNotice } from "../components/SlashCommandLink.js";
import { useIsViewedAgentCompacting, CompactingLine } from "../components/CompactingLine.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CodeLine } from "../components/HighlightedCode.js";
import { QueuedMessageProvider } from "../context/QueuedMessageContext.js";
import { UserTextMessage } from "../components/messages/UserTextMessage.js";
import { getContentText } from "./messages.js";
import { promptAwaitingModelSlot, PLACEHOLDER } from "../components/messages/UserPromptMessage.js";
import { appendToolsNotInList } from "../commands/hooks/hooks.js";
import { alwaysFalseFlag } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getFileAndShellTools } from "../tools.js";
import { isWebFetchAgentFlagOn } from "../tools/AgentTool/loadAgentsDir.js";
import { WebFetchTool } from "../tools/WebFetchTool/WebFetchTool.js";
import { isBuiltInArtifactHiddenForMcp } from "../services/artifacts/artifactsMcpTools.js";
import { getAllBaseToolsFromRegistry } from "../Tool.js";
import { isArtifactReplTool } from "../services/artifacts/artifactMcpSwap.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { loadKeybindingsSync, keybindingsState } from "../keybindings/loadUserBindings.js";
import { createKeybindingRegistryState } from "../keybindings/keyNames.js";
import { KeybindingProvider } from "../keybindings/KeybindingContext.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { withholdForExport } from "./transcriptWithholding.js";
import { getDefaultAppState } from "../state/AppStateStore.js";
import { renderToAnsiString } from "./staticRender.js";
import { AppRoot } from "../components/AppRoot.js";
import { TranscriptModeProvider } from "../components/messages/transcriptModeContext.js";
import { stripAnsi } from "./stripAnsi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:200980-205567 placement
/**
 * 静态/实时消息渲染器（导出与会话预览共用）：把消息列表渲染成 live 或 static 视图，处理图片占位与 prompt 行。
 */
function ExportTranscriptView(props) {
  let $ = useMemoCache(84);
  let onRowsDrawn;
  let source;
  let hidePlaceholder;
  let restProps;
  let waitingLines;
  if ($[0] !== props) {
    ({ source, hidePlaceholder, waitingLines, onRowsDrawn, ...restProps } = props);
    $[0] = props;
    $[1] = onRowsDrawn;
    $[2] = source;
    $[3] = hidePlaceholder;
    $[4] = restProps;
    $[5] = waitingLines;
  } else {
    onRowsDrawn = $[1];
    source = $[2];
    hidePlaceholder = $[3];
    restProps = $[4];
    waitingLines = $[5];
  }
  let shouldHidePlaceholder = hidePlaceholder === undefined ? false : hidePlaceholder;
  let turn = source.kind === "live" ? source.turn : null;
  let isMain = source.kind === "live" && source.focused.isMain;
  let isPromptScreen = isMain && restProps.screen === "prompt";
  let messages = source.kind === "live" ? source.focused.messages : source.messages;
  let isLoading = useStoreSelector(turn, selectLoading) ?? false;
  let streamingToolUses =
    useStoreSelector((isMain ? turn : null)?.stream, selectStreamingToolUses) ?? EMPTY_TOOL_USE_LIST;
  let activeTurn = isPromptScreen ? turn : null;
  let storeSelector = useStoreSelector(activeTurn?.stream, selectUserInputOnProcessing);
  let origin = useStoreSelector(activeTurn?.stream, selectPlaceholderOrigin);
  let followingPrompts = useStoreSelector(activeTurn?.stream, selectFollowingPrompts) ?? EMPTY_ARRAY_B;
  let waitedInQueue = useStoreSelector(activeTurn?.stream, selectPlaceholderWaitedInQueue) ?? false;
  let spinnerRowProps;
  if ($[6] !== activeTurn || $[7] !== messages || $[8] !== restProps.screen) {
    spinnerRowProps = {
      turn: activeTurn,
      messages,
      screen: restProps.screen,
    };
    $[6] = activeTurn;
    $[7] = messages;
    $[8] = restProps.screen;
    $[9] = spinnerRowProps;
  } else spinnerRowProps = $[9];
  let spinnerRow = TurnSpinnerRow(spinnerRowProps);
  let isBriefOnly = useAppState(selectIsBriefOnly) && isPromptScreen;
  let appState = useAppState(selectVerbose_2_2);
  let showStreamingPrompt = isPromptScreen && !spinnerRow.showStreamingText && isLoading;
  let hasSpinnerPace = useContext(SpinnerPaceContext) !== null;
  let candidateMessages = useDeferredValue(showStreamingPrompt || !hasSpinnerPace ? messages : EMPTY_ARRAY_A);
  let reviewedMessages;
  if ($[10] !== showStreamingPrompt || $[11] !== candidateMessages || $[12] !== messages) {
    reviewedMessages = keepPreviousIfSame(candidateMessages, messages, showStreamingPrompt);
    $[10] = showStreamingPrompt;
    $[11] = candidateMessages;
    $[12] = messages;
    $[13] = reviewedMessages;
  } else reviewedMessages = $[13];
  let visibleMessages = reviewedMessages;
  let settledReply = useStoreSelector(activeTurn?.stream, selectSettledReply) ?? EMPTY_ARRAY_A;
  let settledMessages;
  Ue: {
    if (!isLoading || settledReply.length === 0) {
      settledMessages = EMPTY_ARRAY_A;
      break Ue;
    }
    let visibleIds;
    if ($[14] !== visibleMessages) {
      visibleIds = new Set();
      for (const message of visibleMessages) visibleIds.add(message.uuid);
      $[14] = visibleMessages;
      $[15] = visibleIds;
    } else visibleIds = $[15];
    let newSettled;
    if ($[16] !== visibleIds || $[17] !== settledReply) {
      let isNotVisible;
      if ($[19] !== visibleIds) {
        isNotVisible = (message) => !visibleIds.has(message.uuid);
        $[19] = visibleIds;
        $[20] = isNotVisible;
      } else isNotVisible = $[20];
      newSettled = settledReply.filter(isNotVisible);
      $[16] = visibleIds;
      $[17] = settledReply;
      $[18] = newSettled;
    } else newSettled = $[18];
    settledMessages = newSettled;
  }
  let unseenSettled = settledMessages;
  let mergedMessages;
  if ($[21] !== visibleMessages || $[22] !== unseenSettled) {
    mergedMessages = unseenSettled.length === 0 ? visibleMessages : [...visibleMessages, ...unseenSettled];
    $[21] = visibleMessages;
    $[22] = unseenSettled;
    $[23] = mergedMessages;
  } else mergedMessages = $[23];
  let messages_2 = mergedMessages;
  let hasUnseenSettled = settledReply.length > 0 && unseenSettled.length === 0;
  let clearSettledReply;
  if ($[24] !== hasUnseenSettled || $[25] !== activeTurn?.stream) {
    clearSettledReply = () => {
      if (hasUnseenSettled) activeTurn?.stream.setSettledReply([]);
    };
    $[24] = hasUnseenSettled;
    $[25] = activeTurn?.stream;
    $[26] = clearSettledReply;
  } else clearSettledReply = $[26];
  let effectDeps;
  if ($[27] !== hasUnseenSettled || $[28] !== activeTurn) {
    effectDeps = [hasUnseenSettled, activeTurn];
    $[27] = hasUnseenSettled;
    $[28] = activeTurn;
    $[29] = effectDeps;
  } else effectDeps = $[29];
  useEffect(clearSettledReply, effectDeps);
  let storeSelector_2 = useStoreSelector(isPromptScreen ? waitingLines : undefined);
  let unseenQueued;
  Xt: {
    if (storeSelector_2 === undefined || storeSelector_2.length === 0) {
      unseenQueued = EMPTY_ARRAY_C;
      break Xt;
    }
    let visibleIdSet;
    if ($[30] !== visibleMessages) {
      visibleIdSet = new Set(visibleMessages.map(selectUuid));
      $[30] = visibleMessages;
      $[31] = visibleIdSet;
    } else visibleIdSet = $[31];
    let visibleIds = visibleIdSet;
    let filteredQueued;
    if ($[32] !== visibleIds || $[33] !== storeSelector_2) {
      let isNotQueued;
      if ($[35] !== visibleIds) {
        isNotQueued = (message) => !visibleIds.has(message.uuid);
        $[35] = visibleIds;
        $[36] = isNotQueued;
      } else isNotQueued = $[36];
      filteredQueued = storeSelector_2.filter(isNotQueued);
      $[32] = visibleIds;
      $[33] = storeSelector_2;
      $[34] = filteredQueued;
    } else filteredQueued = $[34];
    unseenQueued = filteredQueued;
  }
  let queuedMessages = unseenQueued;
  let deps;
  let reportRows;
  if ($[37] !== visibleMessages || $[38] !== isPromptScreen || $[39] !== onRowsDrawn) {
    reportRows = () => {
      if (isPromptScreen) onRowsDrawn?.(visibleMessages);
    };
    deps = [visibleMessages, onRowsDrawn, isPromptScreen];
    $[37] = visibleMessages;
    $[38] = isPromptScreen;
    $[39] = onRowsDrawn;
    $[40] = deps;
    $[41] = reportRows;
  } else {
    deps = $[40];
    reportRows = $[41];
  }
  useLayoutEffect(reportRows, deps);
  let composerText = shouldHidePlaceholder ? undefined : storeSelector;
  let awaitingModel =
    composerText !== undefined &&
    composerText !== "" &&
    activeTurn !== null &&
    visibleMessages.length <= activeTurn.stream.placeholderTracker.baseline;
  let showNotice = shouldShowNotice(appState);
  let hasTranscriptPlugin = transcriptPlugin !== null && showNotice;
  let isViewedAgentCompacting = useIsViewedAgentCompacting();
  let briefCompacting = useDeferredValue(isViewedAgentCompacting);
  let showCompacting =
    (visibleMessages === messages ? isViewedAgentCompacting : briefCompacting) &&
    hasTranscriptPlugin &&
    isLoading;
  let pendingPromptList;
  if ($[42] !== followingPrompts || $[43] !== origin || $[44] !== composerText) {
    pendingPromptList =
      composerText === undefined
        ? EMPTY_ARRAY_B
        : [
            {
              text: composerText,
              origin,
            },
          ].concat(followingPrompts);
    $[42] = followingPrompts;
    $[43] = origin;
    $[44] = composerText;
    $[45] = pendingPromptList;
  } else pendingPromptList = $[45];
  let allPendingPrompts = pendingPromptList;
  let queuedRows;
  if ($[46] !== queuedMessages || $[47] !== appState) {
    queuedRows =
      queuedMessages.length > 0
        ? jsxProd_default(CodeLine, {
            verbose: appState,
            children: queuedMessages.map((queuedMessage, rowIndex) =>
              jsxProd_default(
                QueuedMessageProvider,
                {
                  isFirst: rowIndex === 0,
                  noticeSystemLines: false,
                  children: jsxProd_default(UserTextMessage, {
                    param: {
                      text: getContentText(queuedMessage.message.content) ?? "[Image]",
                      type: "text",
                    },
                    addMargin: true,
                    verbose: appState,
                    messageId: queuedMessage.uuid,
                    origin: queuedMessage.origin,
                  }),
                },
                queuedMessage.uuid,
              ),
            ),
          })
        : null;
    $[46] = queuedMessages;
    $[47] = appState;
    $[48] = queuedRows;
  } else queuedRows = $[48];
  let queuedRowElement = queuedRows;
  let placeholderRow;
  if (
    $[49] !== followingPrompts ||
    $[50] !== hasTranscriptPlugin ||
    $[51] !== origin ||
    $[52] !== composerText ||
    $[53] !== waitedInQueue ||
    $[54] !== awaitingModel ||
    $[55] !== appState
  ) {
    placeholderRow =
      awaitingModel && !hasTranscriptPlugin
        ? jsxProd_default_2(promptAwaitingModelSlot.Provider, {
            value: waitedInQueue ? "every" : null,
            children: [
              jsxProd_default(UserTextMessage, {
                param: {
                  text: composerText ?? "",
                  type: "text",
                },
                addMargin: true,
                verbose: appState,
                messageId: PLACEHOLDER,
                origin,
              }),
              followingPrompts.map((prompt, promptIndex) =>
                jsxProd_default(
                  UserTextMessage,
                  {
                    param: {
                      text: prompt.text,
                      type: "text",
                    },
                    addMargin: true,
                    verbose: appState,
                    messageId: `${PLACEHOLDER}-${promptIndex + 1}`,
                    origin: prompt.origin,
                  },
                  promptIndex,
                ),
              ),
            ],
          })
        : null;
    $[49] = followingPrompts;
    $[50] = hasTranscriptPlugin;
    $[51] = origin;
    $[52] = composerText;
    $[53] = waitedInQueue;
    $[54] = awaitingModel;
    $[55] = appState;
    $[56] = placeholderRow;
  } else placeholderRow = $[56];
  let placeholderElement = placeholderRow;
  const value = activeTurn?.stream ?? null;
  const conversationId = source.kind === "live" ? source.focused.conversationKey : source.conversationId;
  const inProgressToolUseIDs = source.kind === "live" ? source.focused.inProgressToolUseIDs : EMPTY_ID_SET;
  const renderRange = source.kind === "static" ? source.renderRange : undefined;
  const hasStreamingText =
    isLoading &&
    isPromptScreen &&
    spinnerRow.hasDisplayedStreamingText &&
    !spinnerRow.focusFoldHoldsPreview &&
    unseenSettled.length === 0;
  const isFocusedTurnLoading = isMain
    ? isLoading && !showCompacting
    : source.kind === "live" && source.focused.inProgressToolUseIDs.size > 0;
  const pendingPrompts = awaitingModel && hasTranscriptPlugin ? allPendingPrompts : EMPTY_ARRAY_B;
  let messagesElement;
  if (
    $[57] !== isBriefOnly ||
    $[58] !== isLoading ||
    $[59] !== messages_2 ||
    $[60] !== streamingToolUses ||
    $[61] !== conversationId ||
    $[62] !== inProgressToolUseIDs ||
    $[63] !== renderRange ||
    $[64] !== hasStreamingText ||
    $[65] !== isFocusedTurnLoading ||
    $[66] !== pendingPrompts ||
    $[67] !== turn ||
    $[68] !== restProps
  ) {
    messagesElement = jsxProd_default(Messages, {
      ...restProps,
      messages: messages_2,
      conversationId,
      inProgressToolUseIDs,
      renderRange,
      turn,
      isLoading,
      streamingToolUses,
      hasStreamingText,
      isBriefOnly,
      isFocusedTurnLoading,
      pendingPrompts,
    });
    $[57] = isBriefOnly;
    $[58] = isLoading;
    $[59] = messages_2;
    $[60] = streamingToolUses;
    $[61] = conversationId;
    $[62] = inProgressToolUseIDs;
    $[63] = renderRange;
    $[64] = hasStreamingText;
    $[65] = isFocusedTurnLoading;
    $[66] = pendingPrompts;
    $[67] = turn;
    $[68] = restProps;
    $[69] = messagesElement;
  } else messagesElement = $[69];
  let compactingElement;
  if ($[70] !== showCompacting || $[71] !== appState) {
    compactingElement =
      showCompacting &&
      jsxProd_default(CodeLine, {
        verbose: appState,
        children: jsxProd_default(CompactingLine, {}),
      });
    $[70] = showCompacting;
    $[71] = appState;
    $[72] = compactingElement;
  } else compactingElement = $[72];
  let taskProgressElement;
  if ($[73] !== source.focused || $[74] !== source.kind || $[75] !== source.turn) {
    taskProgressElement =
      source.kind === "live" &&
      jsxProd_default(TerminalTaskProgress, {
        turn: source.turn,
        hasToolsInProgress: source.focused.inProgressToolUseIDs.size > 0,
      });
    $[73] = source.focused;
    $[74] = source.kind;
    $[75] = source.turn;
    $[76] = taskProgressElement;
  } else taskProgressElement = $[76];
  let viewElement;
  if (
    $[77] !== placeholderElement ||
    $[78] !== value ||
    $[79] !== messagesElement ||
    $[80] !== compactingElement ||
    $[81] !== taskProgressElement ||
    $[82] !== queuedRowElement
  ) {
    viewElement = jsxProd_default_2(promptAwaitingModelSlot.Provider, {
      value,
      children: [
        messagesElement,
        compactingElement,
        taskProgressElement,
        placeholderElement,
        queuedRowElement,
      ],
    });
    $[77] = placeholderElement;
    $[78] = value;
    $[79] = messagesElement;
    $[80] = compactingElement;
    $[81] = taskProgressElement;
    $[82] = queuedRowElement;
    $[83] = viewElement;
  } else viewElement = $[83];
  return viewElement;
}
//@ chunk-ag5x7vhf.js:205567-205571 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:205567", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:205571-205688 placement
/**
 * 导出渲染时在工具列表后补上未包含的额外工具（特定功能工具、WebFetch、对 MCP 隐藏的内置 artifact 工具，可选再加更多）。
 */
function withExtraExportTools(tools, includeExtraTools = false) {
  return appendToolsNotInList(tools, [
    ...(alwaysFalseFlag() ? getFileAndShellTools() : []),
    ...(isWebFetchAgentFlagOn() ? [WebFetchTool] : []),
    ...(isBuiltInArtifactHiddenForMcp()
      ? (getAllBaseToolsFromRegistry() ?? []).filter(isArtifactReplTool)
      : []),
    ...(includeExtraTools ? emptyArray() : []),
  ]);
}
//@ chunk-ag5x7vhf.js:205688-205711 placement
function emptyArray() {
  return [];
}
//@ chunk-ag5x7vhf.js:205978-206007 sole-consumer
function createEmptySet() {
  return new Set();
}
//@ chunk-ag5x7vhf.js:206007-206022 sole-consumer
function noopChordHandler() {}
//@ chunk-ag5x7vhf.js:206022-206037 sole-consumer
function noopRegisterContext() {}
//@ chunk-ag5x7vhf.js:206037-206052 affinity
function noopUnregisterContext() {}
//@ chunk-ag5x7vhf.js:206052-206622 fingerprint (2.1.88 match: StaticKeybindingProvider, 0.84)
function StaticKeybindingProvider(props) {
  let $ = useMemoCache(7);
  let { children } = props;
  let keybindingsState_2;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingsState_2 = loadKeybindingsSync(keybindingsState);
    $[0] = keybindingsState_2;
  } else keybindingsState_2 = $[0];
  let { bindings } = keybindingsState_2;
  let pendingChordRef = useRef(null);
  let handlerRegistry;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    handlerRegistry = new Map();
    $[1] = handlerRegistry;
  } else handlerRegistry = $[1];
  let handlerRegistryRef = useRef(handlerRegistry);
  let pendingChord;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    pendingChord = new Set();
    $[2] = pendingChord;
  } else pendingChord = $[2];
  let pendingChordRef_2 = useRef(pendingChord);
  let handlerRegistryRef_2 = useRef(null);
  let [activeContexts] = useState(createEmptySet);
  let [keyHandlerRegistry] = useState(createKeybindingRegistryState);
  let providerElement;
  if ($[3] !== activeContexts || $[4] !== children || $[5] !== keyHandlerRegistry) {
    providerElement = jsxProd_default(KeybindingProvider, {
      bindings,
      pendingChordRef,
      pendingChord: null,
      setPendingChord: noopChordHandler,
      activeContexts,
      registerActiveContext: noopRegisterContext,
      unregisterActiveContext: noopUnregisterContext,
      handlerRegistryRef,
      preDispatchRef: pendingChordRef_2,
      singleKeyEventRef: handlerRegistryRef_2,
      keyHandlerRegistry,
      children,
    });
    $[3] = activeContexts;
    $[4] = children;
    $[5] = keyHandlerRegistry;
    $[6] = providerElement;
  } else providerElement = $[6];
  return providerElement;
}
//@ chunk-ag5x7vhf.js:206622-206728 layout
function findFirstRealModel(messages) {
  for (let message of messages)
    if (message.type === "assistant") {
      let model = message.message.model;
      if (model && model !== SYNTHETIC_MODEL) return model;
    }
  return;
}
//@ chunk-ag5x7vhf.js:206728-206831 layout (2.1.88 match: extractErrorDetail, 1)
function contentBlockCount(data) {
  if (!("message" in data)) return 1;
  let content = data.message.content;
  return Array.isArray(content) ? content.length : 1;
}
//@ chunk-ag5x7vhf.js:206831-207617 fingerprint (2.1.88 match: streamRenderedMessages, 0.538)
/**
 * 把消息用静态 Ink 渲染成文本流（/export 等导出用）。
 */
async function streamRenderedMessages(
  messages,
  messages_2,
  tools,
  onChunk,
  { columns, verbose = false, chunkSize = 40, onProgress, storageV5, welcomeHeader = true, viewedAgent } = {},
) {
  messages_2 = withholdForExport(messages_2, {
    host: messages.host,
  });
  let firstRealModel = findFirstRealModel(messages_2);
  let viewedAgentDone =
    viewedAgent?.status === "running"
      ? {
          ...viewedAgent,
          status: "completed",
          abortController: undefined,
        }
      : viewedAgent;
  let initialState = {
    ...getDefaultAppState(),
    verbose,
    ...(firstRealModel && {
      mainLoopModel: firstRealModel,
    }),
    ...(viewedAgentDone && {
      viewingAgentTaskId: viewedAgentDone.id,
      tasks: {
        [viewedAgentDone.id]: viewedAgentDone,
      },
    }),
  };
  let tools_2 = withExtraExportTools(tools);
  let renderChunk = (range) =>
    renderToAnsiString(
      jsxProd_default(AppRoot, {
        session: messages,
        storageV5,
        initialState,
        keybindings: false,
        children: jsxProd_default_2(StaticKeybindingProvider, {
          children: [
            range[0] === 0 &&
              welcomeHeader &&
              jsxProd_default(LogoHeader, {
                latchAnnouncementSlot: false,
              }),
            jsxProd_default(TranscriptModeProvider, {
              children: jsxProd_default(ExportTranscriptView, {
                source: {
                  kind: "static",
                  messages: messages_2,
                  conversationId: "export",
                  renderRange: range,
                },
                tools: tools_2,
                commands: [],
                screen: "prompt",
              }),
            }),
          ],
        }),
      }),
      {
        columns,
        storageV5,
      },
    );
  let ceiling = chunkSize;
  for (let m of messages_2) ceiling += contentBlockCount(m);
  for (let offset = 0; offset < ceiling; offset += chunkSize) {
    let ansi = await renderChunk([offset, offset + chunkSize]);
    if (stripAnsi(ansi).trim() === "") break;
    await onChunk(ansi);
    onProgress?.(offset + chunkSize);
  }
}
//@ chunk-ag5x7vhf.js:207617-207818 callgraph-fingerprint (2.1.88 match: renderMessagesToPlainText, 0.347)
async function renderMessagesToPlainText(
  messages,
  tools,
  tools_2,
  { columns, storageV5, welcomeHeader, viewedAgent },
) {
  let parts = [];
  await streamRenderedMessages(messages, tools, tools_2, (chunk) => void parts.push(stripAnsi(chunk)), {
    columns,
    storageV5,
    welcomeHeader,
    viewedAgent,
  });
  return parts.join("");
}
export { renderMessagesToPlainText, ExportTranscriptView, withExtraExportTools };
