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
  uL,
  dL,
  jc,
  mL,
  pL,
  fL,
  Ts,
  gL,
  hL,
  yL,
  vs,
  rv,
  bL,
  av,
  SL,
  uo,
  EMPTY_ID_SET,
  Messages,
  TerminalTaskProgress,
  LogoHeader,
} from "../components/Messages.js";
import { TurnSpinnerRow } from "../screens/replDialogState.js";
import { useAppState } from "../state/AppState.js";
import { Se, eJ, P, zt, j, R, y } from "../../vendor/react/cjs/react.production.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";
import { shouldShowNotice } from "../components/SlashCommandLink.js";
import { useIsViewedAgentCompacting, CompactingLine } from "../components/CompactingLine.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CodeLine } from "../components/HighlightedCode.js";
import { QueuedMessageProvider } from "../context/QueuedMessageContext.js";
import { UserTextMessage } from "../components/messages/UserTextMessage.js";
import { getContentText } from "./messages.js";
import { Ptn, PLACEHOLDER } from "../components/messages/UserPromptMessage.js";
import { appendToolsNotInList } from "../commands/hooks/hooks.js";
import { k1 } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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
import { Yn } from "./stripAnsi.js";

/**
 * 静态/实时消息渲染器（导出与会话预览共用）：把消息列表渲染成 live 或 static 视图，处理图片占位与 prompt 行。
 */
//@ chunk-ag5x7vhf.js:200980-205567 placement
function ExportTranscriptView(m) {
  let h = w(84),
    x,
    T,
    k,
    _,
    I;
  if (h[0] !== m)
    (({ source: T, hidePlaceholder: k, waitingLines: I, onRowsDrawn: x, ..._ } = m),
      (h[0] = m),
      (h[1] = x),
      (h[2] = T),
      (h[3] = k),
      (h[4] = _),
      (h[5] = I));
  else ((x = h[1]), (T = h[2]), (k = h[3]), (_ = h[4]), (I = h[5]));
  let D = k === void 0 ? !1 : k,
    A = T.kind === "live" ? T.turn : null,
    L = T.kind === "live" && T.focused.isMain,
    V = L && _.screen === "prompt",
    W = T.kind === "live" ? T.focused.messages : T.messages,
    z = useStoreSelector(A, uL) ?? !1,
    q = useStoreSelector((L ? A : null)?.stream, dL) ?? jc,
    Y = V ? A : null,
    pe = useStoreSelector(Y?.stream, mL),
    xe = useStoreSelector(Y?.stream, pL),
    ge = useStoreSelector(Y?.stream, fL) ?? Ts,
    Re = useStoreSelector(Y?.stream, gL) ?? !1,
    We;
  if (h[6] !== Y || h[7] !== W || h[8] !== _.screen)
    ((We = { turn: Y, messages: W, screen: _.screen }),
      (h[6] = Y),
      (h[7] = W),
      (h[8] = _.screen),
      (h[9] = We));
  else We = h[9];
  let fe = TurnSpinnerRow(We),
    Fe = useAppState(hL) && V,
    te = useAppState(yL),
    me = V && !fe.showStreamingText && z,
    se = Se(SpinnerPaceContext) !== null,
    _e = eJ(me || !se ? W : vs),
    oe;
  if (h[10] !== me || h[11] !== _e || h[12] !== W)
    ((oe = rv(_e, W, me)), (h[10] = me), (h[11] = _e), (h[12] = W), (h[13] = oe));
  else oe = h[13];
  let ve = oe,
    Ee = useStoreSelector(Y?.stream, bL) ?? vs,
    He;
  Ue: {
    if (!z || Ee.length === 0) {
      He = vs;
      break Ue;
    }
    let lt;
    if (h[14] !== ve) {
      lt = new Set();
      for (const it of ve) lt.add(it.uuid);
      ((h[14] = ve), (h[15] = lt));
    } else lt = h[15];
    let ae;
    if (h[16] !== lt || h[17] !== Ee) {
      let tt;
      if (h[19] !== lt) ((tt = (ct) => !lt.has(ct.uuid)), (h[19] = lt), (h[20] = tt));
      else tt = h[20];
      ae = Ee.filter(tt);
      ((h[16] = lt), (h[17] = Ee), (h[18] = ae));
    } else ae = h[18];
    He = ae;
  }
  let Je = He,
    ae;
  if (h[21] !== ve || h[22] !== Je)
    ((ae = Je.length === 0 ? ve : [...ve, ...Je]), (h[21] = ve), (h[22] = Je), (h[23] = ae));
  else ae = h[23];
  let $e = ae,
    Qe = Ee.length > 0 && Je.length === 0,
    tt;
  if (h[24] !== Qe || h[25] !== Y?.stream)
    ((tt = () => {
      if (Qe) Y?.stream.setSettledReply([]);
    }),
      (h[24] = Qe),
      (h[25] = Y?.stream),
      (h[26] = tt));
  else tt = h[26];
  let Wt;
  if (h[27] !== Qe || h[28] !== Y) ((Wt = [Qe, Y]), (h[27] = Qe), (h[28] = Y), (h[29] = Wt));
  else Wt = h[29];
  P(tt, Wt);
  let Ze = useStoreSelector(V ? I : void 0),
    pt;
  Xt: {
    if (Ze === void 0 || Ze.length === 0) {
      pt = av;
      break Xt;
    }
    let rt;
    if (h[30] !== ve) ((rt = new Set(ve.map(SL))), (h[30] = ve), (h[31] = rt));
    else rt = h[31];
    let qe = rt;
    let St;
    if (h[32] !== qe || h[33] !== Ze) {
      let dt;
      if (h[35] !== qe) ((dt = (Pt) => !qe.has(Pt.uuid)), (h[35] = qe), (h[36] = dt));
      else dt = h[36];
      St = Ze.filter(dt);
      ((h[32] = qe), (h[33] = Ze), (h[34] = St));
    } else St = h[34];
    pt = St;
  }
  let Ot = pt,
    St,
    rt;
  if (h[37] !== ve || h[38] !== V || h[39] !== x)
    ((rt = () => {
      if (V) x?.(ve);
    }),
      (St = [ve, x, V]),
      (h[37] = ve),
      (h[38] = V),
      (h[39] = x),
      (h[40] = St),
      (h[41] = rt));
  else ((St = h[40]), (rt = h[41]));
  zt(rt, St);
  let It = D ? void 0 : pe,
    kt = It !== void 0 && It !== "" && Y !== null && ve.length <= Y.stream.placeholderTracker.baseline,
    to = shouldShowNotice(te),
    de = uo !== null && to,
    le = useIsViewedAgentCompacting(),
    Be = eJ(le),
    st = (ve === W ? le : Be) && de && z,
    dt;
  if (h[42] !== ge || h[43] !== xe || h[44] !== It)
    ((dt = It === void 0 ? Ts : [{ text: It, origin: xe }].concat(ge)),
      (h[42] = ge),
      (h[43] = xe),
      (h[44] = It),
      (h[45] = dt));
  else dt = h[45];
  let Ge = dt,
    Ve;
  if (h[46] !== Ot || h[47] !== te)
    ((Ve =
      Ot.length > 0
        ? e(CodeLine, {
            verbose: te,
            children: Ot.map((ze, At) =>
              e(
                QueuedMessageProvider,
                {
                  isFirst: At === 0,
                  noticeSystemLines: !1,
                  children: e(UserTextMessage, {
                    param: { text: getContentText(ze.message.content) ?? "[Image]", type: "text" },
                    addMargin: !0,
                    verbose: te,
                    messageId: ze.uuid,
                    origin: ze.origin,
                  }),
                },
                ze.uuid,
              ),
            ),
          })
        : null),
      (h[46] = Ot),
      (h[47] = te),
      (h[48] = Ve));
  else Ve = h[48];
  let ut = Ve,
    jt;
  if (
    h[49] !== ge ||
    h[50] !== de ||
    h[51] !== xe ||
    h[52] !== It ||
    h[53] !== Re ||
    h[54] !== kt ||
    h[55] !== te
  )
    ((jt =
      kt && !de
        ? r(Ptn.Provider, {
            value: Re ? "every" : null,
            children: [
              e(UserTextMessage, {
                param: { text: It ?? "", type: "text" },
                addMargin: !0,
                verbose: te,
                messageId: PLACEHOLDER,
                origin: xe,
              }),
              ge.map((oo, mo) =>
                e(
                  UserTextMessage,
                  {
                    param: { text: oo.text, type: "text" },
                    addMargin: !0,
                    verbose: te,
                    messageId: `${PLACEHOLDER}-${mo + 1}`,
                    origin: oo.origin,
                  },
                  mo,
                ),
              ),
            ],
          })
        : null),
      (h[49] = ge),
      (h[50] = de),
      (h[51] = xe),
      (h[52] = It),
      (h[53] = Re),
      (h[54] = kt),
      (h[55] = te),
      (h[56] = jt));
  else jt = h[56];
  let Jt = jt;
  const Gt = Y?.stream ?? null,
    Mo = T.kind === "live" ? T.focused.conversationKey : T.conversationId,
    Vo = T.kind === "live" ? T.focused.inProgressToolUseIDs : EMPTY_ID_SET,
    Po = T.kind === "static" ? T.renderRange : void 0,
    So = z && V && fe.hasDisplayedStreamingText && !fe.focusFoldHoldsPreview && Je.length === 0,
    Yt = L ? z && !st : T.kind === "live" && T.focused.inProgressToolUseIDs.size > 0,
    Qt = kt && de ? Ge : Ts;
  let ne;
  if (
    h[57] !== Fe ||
    h[58] !== z ||
    h[59] !== $e ||
    h[60] !== q ||
    h[61] !== Mo ||
    h[62] !== Vo ||
    h[63] !== Po ||
    h[64] !== So ||
    h[65] !== Yt ||
    h[66] !== Qt ||
    h[67] !== A ||
    h[68] !== _
  )
    ((ne = e(Messages, {
      ..._,
      messages: $e,
      conversationId: Mo,
      inProgressToolUseIDs: Vo,
      renderRange: Po,
      turn: A,
      isLoading: z,
      streamingToolUses: q,
      hasStreamingText: So,
      isBriefOnly: Fe,
      isFocusedTurnLoading: Yt,
      pendingPrompts: Qt,
    })),
      (h[57] = Fe),
      (h[58] = z),
      (h[59] = $e),
      (h[60] = q),
      (h[61] = Mo),
      (h[62] = Vo),
      (h[63] = Po),
      (h[64] = So),
      (h[65] = Yt),
      (h[66] = Qt),
      (h[67] = A),
      (h[68] = _),
      (h[69] = ne));
  else ne = h[69];
  let ee;
  if (h[70] !== st || h[71] !== te)
    ((ee = st && e(CodeLine, { verbose: te, children: e(CompactingLine, {}) })),
      (h[70] = st),
      (h[71] = te),
      (h[72] = ee));
  else ee = h[72];
  let we;
  if (h[73] !== T.focused || h[74] !== T.kind || h[75] !== T.turn)
    ((we =
      T.kind === "live" &&
      e(TerminalTaskProgress, { turn: T.turn, hasToolsInProgress: T.focused.inProgressToolUseIDs.size > 0 })),
      (h[73] = T.focused),
      (h[74] = T.kind),
      (h[75] = T.turn),
      (h[76] = we));
  else we = h[76];
  let Ce;
  if (h[77] !== Jt || h[78] !== Gt || h[79] !== ne || h[80] !== ee || h[81] !== we || h[82] !== ut)
    ((Ce = r(Ptn.Provider, { value: Gt, children: [ne, ee, we, Jt, ut] })),
      (h[77] = Jt),
      (h[78] = Gt),
      (h[79] = ne),
      (h[80] = ee),
      (h[81] = we),
      (h[82] = ut),
      (h[83] = Ce));
  else Ce = h[83];
  return Ce;
}
//@ chunk-ag5x7vhf.js:205567-205571 placement
j();
/**
 * 导出渲染时在工具列表后补上未包含的额外工具（特定功能工具、WebFetch、对 MCP 隐藏的内置 artifact 工具，可选再加更多）。
 */
//@ chunk-ag5x7vhf.js:205571-205688 placement
function withExtraExportTools(m, h = !1) {
  return appendToolsNotInList(m, [
    ...(k1() ? getFileAndShellTools() : []),
    ...(isWebFetchAgentFlagOn() ? [WebFetchTool] : []),
    ...(isBuiltInArtifactHiddenForMcp()
      ? (getAllBaseToolsFromRegistry() ?? []).filter(isArtifactReplTool)
      : []),
    ...(h ? wL() : []),
  ]);
}
//@ chunk-ag5x7vhf.js:205688-205711 placement
function wL() {
  return [];
}
//@ chunk-ag5x7vhf.js:205978-206007 sole-consumer
function NL() {
  return new Set();
}
//@ chunk-ag5x7vhf.js:206007-206022 sole-consumer
function PL() {}
//@ chunk-ag5x7vhf.js:206022-206037 sole-consumer
function LL() {}
//@ chunk-ag5x7vhf.js:206037-206052 affinity
function OL() {}
//@ chunk-ag5x7vhf.js:206052-206622 fingerprint = StaticKeybindingProvider (0.84)
function StaticKeybindingProvider(m) {
  let x = w(7),
    { children: children } = m,
    T;
  if (x[0] === MEMO_CACHE_SENTINEL) ((T = loadKeybindingsSync(keybindingsState)), (x[0] = T));
  else T = x[0];
  let { bindings: bindings } = T,
    _ = R(null),
    I;
  if (x[1] === MEMO_CACHE_SENTINEL) ((I = new Map()), (x[1] = I));
  else I = x[1];
  let D = R(I),
    A;
  if (x[2] === MEMO_CACHE_SENTINEL) ((A = new Set()), (x[2] = A));
  else A = x[2];
  let pendingChordRef = R(A),
    handlerRegistryRef = R(null),
    [W] = y(NL),
    [z] = y(createKeybindingRegistryState),
    K;
  if (x[3] !== W || x[4] !== children || x[5] !== z)
    ((K = e(KeybindingProvider, {
      bindings: bindings,
      pendingChordRef: _,
      pendingChord: null,
      setPendingChord: PL,
      activeContexts: W,
      registerActiveContext: LL,
      unregisterActiveContext: OL,
      handlerRegistryRef: D,
      preDispatchRef: pendingChordRef,
      singleKeyEventRef: handlerRegistryRef,
      keyHandlerRegistry: z,
      children: children,
    })),
      (x[3] = W),
      (x[4] = children),
      (x[5] = z),
      (x[6] = K));
  else K = x[6];
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
/**
 * 把消息用静态 Ink 渲染成文本流（/export 等导出用）。
 */
//@ chunk-ag5x7vhf.js:206831-207617 fingerprint = streamRenderedMessages (0.538)
async function streamRenderedMessages(
  m,
  h,
  x,
  T,
  {
    columns: k,
    verbose: _ = !1,
    chunkSize: I = 40,
    onProgress: D,
    storageV5: A,
    welcomeHeader: L = !0,
    viewedAgent: V,
  } = {},
) {
  h = withholdForExport(h, { host: m.host });
  let W = findFirstRealModel(h),
    z = V?.status === "running" ? { ...V, status: "completed", abortController: void 0 } : V,
    K = {
      ...getDefaultAppState(),
      verbose: _,
      ...(W && { mainLoopModel: W }),
      ...(z && { viewingAgentTaskId: z.id, tasks: { [z.id]: z } }),
    },
    q = withExtraExportTools(x),
    renderChunk = (range) =>
      renderToAnsiString(
        e(AppRoot, {
          session: m,
          storageV5: A,
          initialState: K,
          keybindings: !1,
          children: r(StaticKeybindingProvider, {
            children: [
              range[0] === 0 && L && e(LogoHeader, { latchAnnouncementSlot: !1 }),
              e(TranscriptModeProvider, {
                children: e(ExportTranscriptView, {
                  source: { kind: "static", messages: h, conversationId: "export", renderRange: range },
                  tools: q,
                  commands: [],
                  screen: "prompt",
                }),
              }),
            ],
          }),
        }),
        { columns: k, storageV5: A },
      ),
    ceiling = I;
  for (let xe of h) ceiling += contentBlockCount(xe);
  for (let offset = 0; offset < ceiling; offset += I) {
    let ansi = await renderChunk([offset, offset + I]);
    if (Yn(ansi).trim() === "") break;
    (await T(ansi), D?.(offset + I));
  }
}
//@ chunk-ag5x7vhf.js:207617-207818 callgraph-fingerprint = renderMessagesToPlainText (0.347)
async function renderMessagesToPlainText(
  m,
  h,
  x,
  { columns: columns, storageV5: storageV5, welcomeHeader: welcomeHeader, viewedAgent: viewedAgent },
) {
  let parts = [];
  return (
    await streamRenderedMessages(m, h, x, (chunk) => void parts.push(Yn(chunk)), {
      columns: columns,
      storageV5: storageV5,
      welcomeHeader: welcomeHeader,
      viewedAgent: viewedAgent,
    }),
    parts.join("")
  );
}

export { renderMessagesToPlainText, ExportTranscriptView, withExtraExportTools };
