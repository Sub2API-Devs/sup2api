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
import { w } from "../../vendor/react/compiler-runtime.js";
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
import { Se, eJ, P, zt, init_react_production, R, y } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-ag5x7vhf.js:200980-205567 placement
/**
 * 静态/实时消息渲染器（导出与会话预览共用）：把消息列表渲染成 live 或 static 视图，处理图片占位与 prompt 行。
 */
function ExportTranscriptView(m) {
  let h = w(84);
  let x;
  let T;
  let k;
  let _;
  let I;
  if (h[0] !== m) {
    ({ source: T, hidePlaceholder: k, waitingLines: I, onRowsDrawn: x, ..._ } = m);
    h[0] = m;
    h[1] = x;
    h[2] = T;
    h[3] = k;
    h[4] = _;
    h[5] = I;
  } else {
    x = h[1];
    T = h[2];
    k = h[3];
    _ = h[4];
    I = h[5];
  }
  let D = k === undefined ? false : k;
  let turn = T.kind === "live" ? T.turn : null;
  let isMain = T.kind === "live" && T.focused.isMain;
  let V = isMain && _.screen === "prompt";
  let messages = T.kind === "live" ? T.focused.messages : T.messages;
  let z = useStoreSelector(turn, selectLoading) ?? false;
  let streamingToolUses =
    useStoreSelector((isMain ? turn : null)?.stream, selectStreamingToolUses) ?? EMPTY_TOOL_USE_LIST;
  let Y = V ? turn : null;
  let storeSelector = useStoreSelector(Y?.stream, selectUserInputOnProcessing);
  let origin = useStoreSelector(Y?.stream, selectPlaceholderOrigin);
  let ge = useStoreSelector(Y?.stream, selectFollowingPrompts) ?? EMPTY_ARRAY_B;
  let Re = useStoreSelector(Y?.stream, selectPlaceholderWaitedInQueue) ?? false;
  let We;
  if (h[6] !== Y || h[7] !== messages || h[8] !== _.screen) {
    We = {
      turn: Y,
      messages,
      screen: _.screen,
    };
    h[6] = Y;
    h[7] = messages;
    h[8] = _.screen;
    h[9] = We;
  } else We = h[9];
  let fe = TurnSpinnerRow(We);
  let isBriefOnly = useAppState(selectIsBriefOnly) && V;
  let appState = useAppState(selectVerbose_2_2);
  let me = V && !fe.showStreamingText && z;
  let se = Se(SpinnerPaceContext) !== null;
  let _e = eJ(me || !se ? messages : EMPTY_ARRAY_A);
  let oe;
  if (h[10] !== me || h[11] !== _e || h[12] !== messages) {
    oe = keepPreviousIfSame(_e, messages, me);
    h[10] = me;
    h[11] = _e;
    h[12] = messages;
    h[13] = oe;
  } else oe = h[13];
  let ve = oe;
  let Ee = useStoreSelector(Y?.stream, selectSettledReply) ?? EMPTY_ARRAY_A;
  let He;
  Ue: {
    if (!z || Ee.length === 0) {
      He = EMPTY_ARRAY_A;
      break Ue;
    }
    let lt;
    if (h[14] !== ve) {
      lt = new Set();
      for (const it of ve) lt.add(it.uuid);
      h[14] = ve;
      h[15] = lt;
    } else lt = h[15];
    let ae;
    if (h[16] !== lt || h[17] !== Ee) {
      let tt;
      if (h[19] !== lt) {
        tt = (ct) => !lt.has(ct.uuid);
        h[19] = lt;
        h[20] = tt;
      } else tt = h[20];
      ae = Ee.filter(tt);
      h[16] = lt;
      h[17] = Ee;
      h[18] = ae;
    } else ae = h[18];
    He = ae;
  }
  let Je = He;
  let ae;
  if (h[21] !== ve || h[22] !== Je) {
    ae = Je.length === 0 ? ve : [...ve, ...Je];
    h[21] = ve;
    h[22] = Je;
    h[23] = ae;
  } else ae = h[23];
  let messages_2 = ae;
  let Qe = Ee.length > 0 && Je.length === 0;
  let tt;
  if (h[24] !== Qe || h[25] !== Y?.stream) {
    tt = () => {
      if (Qe) Y?.stream.setSettledReply([]);
    };
    h[24] = Qe;
    h[25] = Y?.stream;
    h[26] = tt;
  } else tt = h[26];
  let Wt;
  if (h[27] !== Qe || h[28] !== Y) {
    Wt = [Qe, Y];
    h[27] = Qe;
    h[28] = Y;
    h[29] = Wt;
  } else Wt = h[29];
  P(tt, Wt);
  let storeSelector_2 = useStoreSelector(V ? I : undefined);
  let pt;
  Xt: {
    if (storeSelector_2 === undefined || storeSelector_2.length === 0) {
      pt = EMPTY_ARRAY_C;
      break Xt;
    }
    let rt;
    if (h[30] !== ve) {
      rt = new Set(ve.map(selectUuid));
      h[30] = ve;
      h[31] = rt;
    } else rt = h[31];
    let qe = rt;
    let St;
    if (h[32] !== qe || h[33] !== storeSelector_2) {
      let dt;
      if (h[35] !== qe) {
        dt = (Pt) => !qe.has(Pt.uuid);
        h[35] = qe;
        h[36] = dt;
      } else dt = h[36];
      St = storeSelector_2.filter(dt);
      h[32] = qe;
      h[33] = storeSelector_2;
      h[34] = St;
    } else St = h[34];
    pt = St;
  }
  let Ot = pt;
  let St;
  let rt;
  if (h[37] !== ve || h[38] !== V || h[39] !== x) {
    rt = () => {
      if (V) x?.(ve);
    };
    St = [ve, x, V];
    h[37] = ve;
    h[38] = V;
    h[39] = x;
    h[40] = St;
    h[41] = rt;
  } else {
    St = h[40];
    rt = h[41];
  }
  zt(rt, St);
  let It = D ? undefined : storeSelector;
  let kt = It !== undefined && It !== "" && Y !== null && ve.length <= Y.stream.placeholderTracker.baseline;
  let to = shouldShowNotice(appState);
  let de = transcriptPlugin !== null && to;
  let isViewedAgentCompacting = useIsViewedAgentCompacting();
  let Be = eJ(isViewedAgentCompacting);
  let st = (ve === messages ? isViewedAgentCompacting : Be) && de && z;
  let dt;
  if (h[42] !== ge || h[43] !== origin || h[44] !== It) {
    dt =
      It === undefined
        ? EMPTY_ARRAY_B
        : [
            {
              text: It,
              origin,
            },
          ].concat(ge);
    h[42] = ge;
    h[43] = origin;
    h[44] = It;
    h[45] = dt;
  } else dt = h[45];
  let Ge = dt;
  let Ve;
  if (h[46] !== Ot || h[47] !== appState) {
    Ve =
      Ot.length > 0
        ? jsxProd_default(CodeLine, {
            verbose: appState,
            children: Ot.map((ze, At) =>
              jsxProd_default(
                QueuedMessageProvider,
                {
                  isFirst: At === 0,
                  noticeSystemLines: false,
                  children: jsxProd_default(UserTextMessage, {
                    param: {
                      text: getContentText(ze.message.content) ?? "[Image]",
                      type: "text",
                    },
                    addMargin: true,
                    verbose: appState,
                    messageId: ze.uuid,
                    origin: ze.origin,
                  }),
                },
                ze.uuid,
              ),
            ),
          })
        : null;
    h[46] = Ot;
    h[47] = appState;
    h[48] = Ve;
  } else Ve = h[48];
  let ut = Ve;
  let jt;
  if (
    h[49] !== ge ||
    h[50] !== de ||
    h[51] !== origin ||
    h[52] !== It ||
    h[53] !== Re ||
    h[54] !== kt ||
    h[55] !== appState
  ) {
    jt =
      kt && !de
        ? jsxProd_default_2(promptAwaitingModelSlot.Provider, {
            value: Re ? "every" : null,
            children: [
              jsxProd_default(UserTextMessage, {
                param: {
                  text: It ?? "",
                  type: "text",
                },
                addMargin: true,
                verbose: appState,
                messageId: PLACEHOLDER,
                origin,
              }),
              ge.map((oo, mo) =>
                jsxProd_default(
                  UserTextMessage,
                  {
                    param: {
                      text: oo.text,
                      type: "text",
                    },
                    addMargin: true,
                    verbose: appState,
                    messageId: `${PLACEHOLDER}-${mo + 1}`,
                    origin: oo.origin,
                  },
                  mo,
                ),
              ),
            ],
          })
        : null;
    h[49] = ge;
    h[50] = de;
    h[51] = origin;
    h[52] = It;
    h[53] = Re;
    h[54] = kt;
    h[55] = appState;
    h[56] = jt;
  } else jt = h[56];
  let Jt = jt;
  const value = Y?.stream ?? null;
  const conversationId = T.kind === "live" ? T.focused.conversationKey : T.conversationId;
  const inProgressToolUseIDs = T.kind === "live" ? T.focused.inProgressToolUseIDs : EMPTY_ID_SET;
  const renderRange = T.kind === "static" ? T.renderRange : undefined;
  const hasStreamingText =
    z && V && fe.hasDisplayedStreamingText && !fe.focusFoldHoldsPreview && Je.length === 0;
  const isFocusedTurnLoading = isMain
    ? z && !st
    : T.kind === "live" && T.focused.inProgressToolUseIDs.size > 0;
  const pendingPrompts = kt && de ? Ge : EMPTY_ARRAY_B;
  let ne;
  if (
    h[57] !== isBriefOnly ||
    h[58] !== z ||
    h[59] !== messages_2 ||
    h[60] !== streamingToolUses ||
    h[61] !== conversationId ||
    h[62] !== inProgressToolUseIDs ||
    h[63] !== renderRange ||
    h[64] !== hasStreamingText ||
    h[65] !== isFocusedTurnLoading ||
    h[66] !== pendingPrompts ||
    h[67] !== turn ||
    h[68] !== _
  ) {
    ne = jsxProd_default(Messages, {
      ..._,
      messages: messages_2,
      conversationId,
      inProgressToolUseIDs,
      renderRange,
      turn,
      isLoading: z,
      streamingToolUses,
      hasStreamingText,
      isBriefOnly,
      isFocusedTurnLoading,
      pendingPrompts,
    });
    h[57] = isBriefOnly;
    h[58] = z;
    h[59] = messages_2;
    h[60] = streamingToolUses;
    h[61] = conversationId;
    h[62] = inProgressToolUseIDs;
    h[63] = renderRange;
    h[64] = hasStreamingText;
    h[65] = isFocusedTurnLoading;
    h[66] = pendingPrompts;
    h[67] = turn;
    h[68] = _;
    h[69] = ne;
  } else ne = h[69];
  let ee;
  if (h[70] !== st || h[71] !== appState) {
    ee =
      st &&
      jsxProd_default(CodeLine, {
        verbose: appState,
        children: jsxProd_default(CompactingLine, {}),
      });
    h[70] = st;
    h[71] = appState;
    h[72] = ee;
  } else ee = h[72];
  let we;
  if (h[73] !== T.focused || h[74] !== T.kind || h[75] !== T.turn) {
    we =
      T.kind === "live" &&
      jsxProd_default(TerminalTaskProgress, {
        turn: T.turn,
        hasToolsInProgress: T.focused.inProgressToolUseIDs.size > 0,
      });
    h[73] = T.focused;
    h[74] = T.kind;
    h[75] = T.turn;
    h[76] = we;
  } else we = h[76];
  let Ce;
  if (h[77] !== Jt || h[78] !== value || h[79] !== ne || h[80] !== ee || h[81] !== we || h[82] !== ut) {
    Ce = jsxProd_default_2(promptAwaitingModelSlot.Provider, {
      value,
      children: [ne, ee, we, Jt, ut],
    });
    h[77] = Jt;
    h[78] = value;
    h[79] = ne;
    h[80] = ee;
    h[81] = we;
    h[82] = ut;
    h[83] = Ce;
  } else Ce = h[83];
  return Ce;
}
//@ chunk-ag5x7vhf.js:205567-205571 placement
init_react_production();
//@ chunk-ag5x7vhf.js:205571-205688 placement
/**
 * 导出渲染时在工具列表后补上未包含的额外工具（特定功能工具、WebFetch、对 MCP 隐藏的内置 artifact 工具，可选再加更多）。
 */
function withExtraExportTools(tools, h = false) {
  return appendToolsNotInList(tools, [
    ...(alwaysFalseFlag() ? getFileAndShellTools() : []),
    ...(isWebFetchAgentFlagOn() ? [WebFetchTool] : []),
    ...(isBuiltInArtifactHiddenForMcp()
      ? (getAllBaseToolsFromRegistry() ?? []).filter(isArtifactReplTool)
      : []),
    ...(h ? emptyArray() : []),
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
//@ chunk-ag5x7vhf.js:206052-206622 fingerprint = StaticKeybindingProvider (0.84)
function StaticKeybindingProvider(props) {
  let x = w(7);
  let { children } = props;
  let T;
  if (x[0] === MEMO_CACHE_SENTINEL) {
    T = loadKeybindingsSync(keybindingsState);
    x[0] = T;
  } else T = x[0];
  let { bindings } = T;
  let pendingChordRef = R(null);
  let I;
  if (x[1] === MEMO_CACHE_SENTINEL) {
    I = new Map();
    x[1] = I;
  } else I = x[1];
  let handlerRegistryRef = R(I);
  let A;
  if (x[2] === MEMO_CACHE_SENTINEL) {
    A = new Set();
    x[2] = A;
  } else A = x[2];
  let pendingChordRef_2 = R(A);
  let handlerRegistryRef_2 = R(null);
  let [W] = y(createEmptySet);
  let [z] = y(createKeybindingRegistryState);
  let K;
  if (x[3] !== W || x[4] !== children || x[5] !== z) {
    K = jsxProd_default(KeybindingProvider, {
      bindings,
      pendingChordRef,
      pendingChord: null,
      setPendingChord: noopChordHandler,
      activeContexts: W,
      registerActiveContext: noopRegisterContext,
      unregisterActiveContext: noopUnregisterContext,
      handlerRegistryRef,
      preDispatchRef: pendingChordRef_2,
      singleKeyEventRef: handlerRegistryRef_2,
      keyHandlerRegistry: z,
      children,
    });
    x[3] = W;
    x[4] = children;
    x[5] = z;
    x[6] = K;
  } else K = x[6];
  return K;
}
//@ chunk-ag5x7vhf.js:206622-206728 layout
function findFirstRealModel(m) {
  for (let h of m)
    if (h.type === "assistant") {
      let model = h.message.model;
      if (model && model !== SYNTHETIC_MODEL) return model;
    }
  return;
}
//@ chunk-ag5x7vhf.js:206728-206831 layout = extractErrorDetail (1)
function contentBlockCount(data) {
  if (!("message" in data)) return 1;
  let content = data.message.content;
  return Array.isArray(content) ? content.length : 1;
}
//@ chunk-ag5x7vhf.js:206831-207617 fingerprint = streamRenderedMessages (0.538)
/**
 * 把消息用静态 Ink 渲染成文本流（/export 等导出用）。
 */
async function streamRenderedMessages(
  messages,
  tools,
  x,
  T,
  {
    columns: k,
    verbose: _ = false,
    chunkSize = 40,
    onProgress,
    storageV5: A,
    welcomeHeader: L = true,
    viewedAgent: V,
  } = {},
) {
  tools = withholdForExport(tools, {
    host: messages.host,
  });
  let firstRealModel = findFirstRealModel(tools);
  let z =
    V?.status === "running"
      ? {
          ...V,
          status: "completed",
          abortController: undefined,
        }
      : V;
  let initialState = {
    ...getDefaultAppState(),
    verbose: _,
    ...(firstRealModel && {
      mainLoopModel: firstRealModel,
    }),
    ...(z && {
      viewingAgentTaskId: z.id,
      tasks: {
        [z.id]: z,
      },
    }),
  };
  let tools_2 = withExtraExportTools(x);
  let renderChunk = (range) =>
    renderToAnsiString(
      jsxProd_default(AppRoot, {
        session: messages,
        storageV5: A,
        initialState,
        keybindings: false,
        children: jsxProd_default_2(StaticKeybindingProvider, {
          children: [
            range[0] === 0 &&
              L &&
              jsxProd_default(LogoHeader, {
                latchAnnouncementSlot: false,
              }),
            jsxProd_default(TranscriptModeProvider, {
              children: jsxProd_default(ExportTranscriptView, {
                source: {
                  kind: "static",
                  messages: tools,
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
        columns: k,
        storageV5: A,
      },
    );
  let ceiling = chunkSize;
  for (let m of tools) ceiling += contentBlockCount(m);
  for (let offset = 0; offset < ceiling; offset += chunkSize) {
    let ansi = await renderChunk([offset, offset + chunkSize]);
    if (stripAnsi(ansi).trim() === "") break;
    await T(ansi);
    onProgress?.(offset + chunkSize);
  }
}
//@ chunk-ag5x7vhf.js:207617-207818 callgraph-fingerprint = renderMessagesToPlainText (0.347)
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
