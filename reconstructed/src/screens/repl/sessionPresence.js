/**
 * screens/repl/sessionPresence.ts
 *
 * 2.1.316 新增。会话在线状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (42)
 * attribution: placement 42
 */
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { listActiveAgentTaskEntries } from "../../tasks/LocalAgentTask/LocalAgentTask.js";
import { formatTabStatus, wQs, rZn } from "../../ink/terminal.js";
import { j, P, yt, y, Se, R, ce } from "../../../vendor/react/cjs/react.production.js";
import { isBgSession, updateSessionActivity } from "../../utils/concurrentSessions.js";
import { managedSettingsSecurityDialogDef } from "./StartupNudges.js";
import { sandboxNetworkAccessDialogDef } from "./SandboxNetworkPrompts.js";
import { DIALOG_KIND_META, EO } from "../../components/dialogs/dialogKinds.js";
import { KE, c6 } from "../../components/fleet/sessionAttention.js";
import {
  useDialogStore,
  topAutoDialog,
  useDialogOfKind,
  useDialogSelector,
} from "../../state/dialogQueue.js";
import { topAskOrder, topBlockingDialog } from "../replDialogState.js";
import { peerInboundApprovalDialogDef } from "../../utils/peerInbound/heldPeerMessages.js";
import {
  MCP_ELICITATION_DIALOG,
  MCP_ELICITATION_WAITING_DIALOG,
} from "../../services/mcp/elicitationDialogs.js";
import { EA } from "../../ink/terminalCapabilities.js";
import { TerminalWriteContext } from "../../ink/useTerminalNotification.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { osc, OSC } from "../../ink/termio/osc.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { isScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { isDecstbmRendererEnabled } from "../../ink/nativeCursor.js";
import { env } from "../../utils/env.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { vXe } from "../../hooks/useVoiceIntegration.js";
import { useAppState } from "../../state/AppState.js";
import { completedPercent } from "../../components/tasks/RemoteSessionProgress.js";
import { gye } from "../../hooks/useTasksV2.js";
import { sessionPresenceState, usePeerIdleNotices } from "./peerIdleNotices.js";
import { hasActiveAgentTasks, hasRunningShellTasks } from "../../tasks/taskStatus.js";
import { sen, oen } from "../../utils/forkSourceNote.js";
import { LOCAL_JSX_DIALOG, uOo } from "../../commands/rate-limit-options/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { useSession } from "../../context/session.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { XAe } from "../../components/dialogs/registry.js";
import { computeSessionPresence } from "../../components/dialogs/dialogStatus.js";
import { eyt } from "../../services/artifacts/artifactPresence.js";
import { pzn } from "../../services/artifacts/presenceSocket.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { tE } from "../../utils/permissions/currentPermissionContext.js";
import { Nu } from "../../context/QueuedMessageContext.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig } from "../../utils/config.js";
import { useTabStatus } from "../../ink/hooks/useTerminalHooks.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AnimatedTerminalTitle } from "../REPL.js";

//@ chunk-18hwfzwa.js:1429877-1429934 placement
function completeLabelOrUndefined(h) {
  return h.includes("\u2026") ? void 0 : redactSecrets(h);
}
//@ chunk-18hwfzwa.js:1429934-1430004 placement
function describePresenceEntries(h) {
  return listActiveAgentTaskEntries(h).map((x) => `${x.id}	${formatTabStatus(x)}`).join(`
`);
}
/**
 * 每行 “键\t值” 解析为 Map。
 */
//@ chunk-18hwfzwa.js:1430004-1430132 placement
function parseTabSeparatedMap(h) {
  let x = new Map();
  for (let D of h.split(`
`)) {
    let index = D.indexOf("\t");
    if (index > 0) x.set(D.slice(0, index), D.slice(index + 1));
  }
  return x;
}
//@ chunk-18hwfzwa.js:1430132-1430136 placement
j();
/**
 * 后台会话中把权限、沙箱网络、MCP 输入、托管设置等等待状态发布出去。
 */
//@ chunk-18hwfzwa.js:1430136-1430812 placement
function useBackgroundAskEmitter() {
  let h = isBgSession(),
    x = UBo(),
    D = x === managedSettingsSecurityDialogDef.kind,
    L = useSandboxNetworkHost(),
    ee = x === sandboxNetworkAccessDialogDef.kind,
    ke = useTopDialogMcpServerName(),
    Re = usePreviousDialogMcpServerName(),
    Be = usePeerApprovalAsk(),
    He = x === void 0 ? void 0 : DIALOG_KIND_META[x]?.needs,
    We = HBo();
  (P(() => {
    if (!h) return;
    KE.showAsk(We ?? null);
  }, [h, We]),
    P(() => {
      if (!h) return;
      let ze = L ? `allow network: ${L}` : null;
      (KE.emit(ee ? ze : null, "sandbox"), KE.emit(ee ? null : ze, "sandbox-queued"));
    }, [h, L, ee]),
    P(() => {
      if (!h) return;
      KE.emit(ke ? `MCP input: ${ke}` : null, "elicitation");
    }, [h, ke]),
    P(() => {
      if (!h) return;
      KE.emit(Re ? `MCP input: ${Re}` : null, "elicitation-queued");
    }, [h, Re]),
    P(() => {
      if (!h) return;
      KE.emit(D ? "review: managed settings change" : null, "managed-settings");
    }, [h, D]),
    P(() => {
      if (!h) return;
      KE.emit(Be !== void 0 ? { text: Be, overlay: !0 } : (He ?? null), "dialog");
    }, [h, Be, He]));
}
//@ chunk-18hwfzwa.js:1430812-1430889 placement
function HBo() {
  let h = useDialogStore(),
    x = () => topAskOrder(h.getState());
  return yt(h.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1430889-1430971 placement
function UBo() {
  let h = useDialogStore(),
    x = () => topBlockingDialog(h.getState())?.kind;
  return yt(h.subscribe, x, x);
}
/**
 * 来自其他会话的消息审批对话框的提示文本。
 */
//@ chunk-18hwfzwa.js:1430971-1431356 placement
function usePeerApprovalAsk() {
  let h = useDialogStore(),
    x = () => {
      let D = topBlockingDialog(h.getState());
      if (D?.kind !== peerInboundApprovalDialogDef.kind) return;
      let safeParse = peerInboundApprovalDialogDef.payload().safeParse(D.payload),
        ee = safeParse.success ? safeParse.data.fromAddress : void 0,
        ke = safeParse.success
          ? (safeParse.data.claimedName ?? "")
              .replace(/[^A-Za-z0-9 ._-]/g, " ")
              .replace(/ {2,}/g, " ")
              .trim()
          : "";
      return c6(`approve message from ${ee ?? "another session"}${ke ? ` (claims name: ${ke})` : ""}`);
    };
  return yt(h.subscribe, x, x);
}
/**
 * 当前沙箱网络访问对话框请求的主机。
 */
//@ chunk-18hwfzwa.js:1431356-1431580 placement
function useSandboxNetworkHost() {
  let h = useDialogStore(),
    x = () => {
      let last = h
        .getState()
        .open.findLast((ee) => !ee.userInvoked && ee.kind === sandboxNetworkAccessDialogDef.kind);
      if (!last) return;
      let safeParse = sandboxNetworkAccessDialogDef.payload().safeParse(last.payload);
      return safeParse.success ? safeParse.data.host : void 0;
    };
  return yt(h.subscribe, x, x);
}
/**
 * getDialogMcpServerName：从对话框栈条目 payload 取服务器名。
 */
//@ chunk-18hwfzwa.js:1431580-1431813 placement = isToolFromMcpServer (0.657)
function getDialogMcpServerName(h) {
  if (h?.kind === MCP_ELICITATION_DIALOG.kind) {
    let safeParse = MCP_ELICITATION_DIALOG.payload().safeParse(h.payload);
    return safeParse.success ? safeParse.data.serverName : void 0;
  }
  if (h?.kind === MCP_ELICITATION_WAITING_DIALOG.kind) {
    let safeParse = MCP_ELICITATION_WAITING_DIALOG.payload().safeParse(h.payload);
    return safeParse.success ? safeParse.data.serverName : void 0;
  }
  return;
}
//@ chunk-18hwfzwa.js:1431813-1431893 placement
function useTopDialogMcpServerName() {
  let h = useDialogStore(),
    x = () => getDialogMcpServerName(topAutoDialog(h.getState()));
  return yt(h.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1431893-1432047 placement
function usePreviousDialogMcpServerName() {
  let h = useDialogStore(),
    x = () => {
      let state = h.getState(),
        L = topAutoDialog(state),
        last = state.open.findLast((ke) => ke !== L && ke.kind === MCP_ELICITATION_DIALOG.kind);
      return getDialogMcpServerName(last);
    };
  return yt(h.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1432047-1432051 placement
j();
//@ chunk-18hwfzwa.js:1432051-1432062 placement
var qBo = "";
/**
 * 终端是否支持程序状态（异步结果）。
 */
//@ chunk-18hwfzwa.js:1432062-1432170 placement
function useProgramStatusSupport() {
  let [h, x] = y(() => EA().now("programStatus"));
  return (P(() => EA().onSettle("programStatus", x), []), h);
}
/**
 * 把会话状态写入终端程序状态序列（只写变化的项，卸载时清除）。
 */
//@ chunk-18hwfzwa.js:1432170-1432692 placement
function useTerminalProgramStatus(h, x, D) {
  let L = Se(TerminalWriteContext),
    ee = useProgramStatusSupport(),
    ke = R(new Map()),
    Re = R(!1),
    Be = R(D),
    He = formatTabStatus(h);
  (P(() => {
    if (L && ee && !isTerminalShutdown()) {
      if (Be.current !== D) ((Be.current = D), ke.current.clear());
      let We = new Map([[qBo, He], ...parseTabSeparatedMap(x)]),
        ze = "";
      for (let [Xe, rt] of We) if (ke.current.get(Xe) !== rt) (ke.current.set(Xe, rt), (ze += rt));
      for (let Xe of ke.current.keys()) if (!We.has(Xe)) (ke.current.delete(Xe), (ze += wQs(Xe)));
      if (ze === "") return;
      if (!Re.current) ((Re.current = !0), logFeatureOk("terminal_program_status"));
      L(ze);
    }
  }, [He, x, ee, L, D]),
    P(
      () => () => {
        if (ke.current.size > 0 && L) (ke.current.clear(), L(rZn));
      },
      [L],
    ));
}
//@ chunk-18hwfzwa.js:1432692-1432696 placement
j();
/**
 * 回合开始/结束时写 OSC 133 语义提示标记。
 */
//@ chunk-18hwfzwa.js:1432696-1432938 placement
function useSemanticPromptMarks() {
  let h = Se(TerminalWriteContext),
    x = QZ(),
    D = ce(() => {
      if (!x || !h) return;
      h(osc(OSC.SEMANTIC_PROMPT, "A", "redraw=0"));
    }, [x, h]),
    L = ce(() => {
      if (!x || !h) return;
      h(osc(OSC.SEMANTIC_PROMPT, "C") + osc(OSC.SEMANTIC_PROMPT, "D"));
    }, [x, h]);
  return { markTurnStart: D, markTurnDone: L };
}
//@ chunk-18hwfzwa.js:1432938-1433029 placement
function QZ() {
  let h = Se(TerminalWriteContext),
    x = useIsFullscreen();
  return (
    h !== null && isScreenReaderMode() && !x && !isDecstbmRendererEnabled() && env.terminal !== "WezTerm"
  );
}
//@ chunk-18hwfzwa.js:1433029-1433068 placement
function selectLastTurnEnd(po) {
  return po.lastTurnEnd;
}
//@ chunk-18hwfzwa.js:1433068-1433107 placement
function selectTaskSummary(ao) {
  return ao.taskSummary;
}
//@ chunk-18hwfzwa.js:1433107-1433165 placement
function hHo(co) {
  return co.postTurnSummary?.status_detail;
}
//@ chunk-18hwfzwa.js:1433165-1433198 placement
function selectTasks4(bo) {
  return bo.tasks;
}
//@ chunk-18hwfzwa.js:1433198-1433237 placement
function selectPromptMarks(Ao) {
  return Ao.promptMarks;
}
//@ chunk-18hwfzwa.js:1433237-1433278 placement
function bHo() {
  return KE.current()?.text;
}
//@ chunk-18hwfzwa.js:1433278-1433333 placement
function wHo(ze) {
  return ze.pendingSandboxRequest?.host;
}
/**
 * 待审批 worker 请求的提示文本。
 */
//@ chunk-18hwfzwa.js:1433333-1433485 placement
function workerRequestText(Xe) {
  return Xe.pendingWorkerRequest === null
    ? void 0
    : c6(`approve ${Xe.pendingWorkerRequest.toolName}: ${Xe.pendingWorkerRequest.description}`);
}
/**
 * 汇总回合、等待、任务等状态并写入终端程序状态。
 */
//@ chunk-18hwfzwa.js:1433485-1434137 placement
function SessionPresenceReporter(h) {
  let $ = w(5),
    { turn: turn, status: status, blockedOn: blockedOn, queued: queued } = h,
    ke = useStoreSelector(turn, selectLastTurnEnd),
    Re = vXe(),
    He;
  if ($[0] !== ke || $[1] !== Re) ((He = { end: ke, logins: Re }), ($[0] = ke), ($[1] = Re), ($[2] = He));
  else He = $[2];
  let [We, ze] = y(He);
  if (We.end !== ke) ze({ end: ke, logins: Re });
  let Xe = We.end === ke && We.logins !== Re,
    rt = useAppState(selectTaskSummary),
    [kt, At] = y(rt);
  if (status === "waiting" && kt !== rt) At(rt);
  let It = rt !== kt ? rt?.text : void 0,
    Ot = useAppState(hHo),
    Et = useAppState(selectTasks4),
    Dt;
  if ($[3] !== Et) ((Dt = describePresenceEntries(Et)), ($[3] = Et), ($[4] = Dt));
  else Dt = $[4];
  let Lt = Dt,
    oo = useStoreSelector(turn, selectPromptMarks),
    Xt = QZ() ? oo : 0,
    io = completedPercent(gye()),
    so = useBlockedText(blockedOn);
  return (
    useTerminalProgramStatus(
      sessionPresenceState({
        status: status,
        blockedOn: blockedOn,
        blockedText: so,
        queued: queued,
        lastTurnEnd: ke,
        signedInSince: Xe,
        workingDetail: It,
        doneDetail: Ot,
        progress: io,
      }),
      Lt,
      Xt,
    ),
    null
  );
}
/**
 * 按阻塞原因生成提示文本。
 */
//@ chunk-18hwfzwa.js:1434137-1434524 placement
function useBlockedText(h) {
  let x = bHo,
    D = yt(KE.subscribe, x, x),
    L = useSandboxNetworkHost(),
    ee = useTopDialogMcpServerName(),
    ke = usePreviousDialogMcpServerName(),
    Re = useAppState(wHo),
    Be = useAppState(workerRequestText);
  switch (h) {
    case "permission prompt":
    case "goal proposal": {
      return D;
    }
    case "input needed": {
      let He = ke ?? ee;
      return He === void 0 ? D : `MCP input: ${He}`;
    }
    case "sandbox request": {
      let We = L ?? Re;
      return We === void 0 ? void 0 : `allow network: ${We}`;
    }
    case "worker request": {
      return Be;
    }
    case "dialog open":
    case void 0: {
      return;
    }
  }
}
//@ chunk-18hwfzwa.js:1434524-1434579 placement = _temp (1)
function hasPendingWorkerRequest(state) {
  return state.pendingWorkerRequest !== null;
}
//@ chunk-18hwfzwa.js:1434579-1434635 placement
function JHo(Qn) {
  return Qn.pendingSandboxRequest !== null;
}
//@ chunk-18hwfzwa.js:1434635-1434693 placement
function XHo(ur) {
  return ur.postTurnSummary?.status_detail;
}
//@ chunk-18hwfzwa.js:1434693-1434730 placement
function selectIsLoading4(Ir) {
  return Ir.isLoading;
}
//@ chunk-18hwfzwa.js:1434730-1434771 placement
function selectIsQueryActive(Pr) {
  return Pr.isQueryActive;
}
//@ chunk-18hwfzwa.js:1434771-1434807 placement
function selectDisabled(ts) {
  return ts.disabled;
}
//@ chunk-18hwfzwa.js:1434807-1434844 placement
function nUo(Gn) {
  return hasActiveAgentTasks(Gn.tasks);
}
//@ chunk-18hwfzwa.js:1434844-1434882 placement
function rUo(Ur) {
  return hasRunningShellTasks(Ur.tasks);
}
//@ chunk-18hwfzwa.js:1434882-1434910 placement
function aUo() {
  return sen();
}
//@ chunk-18hwfzwa.js:1434910-1434994 placement
function cUo(Zr) {
  return Zr.kind === LOCAL_JSX_DIALOG.kind && uOo.has(EO(Zr.payload)?.commandName ?? "");
}
//@ chunk-18hwfzwa.js:1434994-1435051 placement
function lUo(wr) {
  return topAutoDialog(wr) !== null || wr.open.some(cUo);
}
//@ chunk-18hwfzwa.js:1435051-1435146 placement
function dUo(zr) {
  logForDebugging(`session presence: PID-file status write failed: ${errorMessage(zr)}`, { level: "error" });
}
/**
 * useSessionPresence：会话在线状态（同伴、远程客户端）hook。
 */
//@ chunk-18hwfzwa.js:1435146-1438068 placement
function useSessionPresence(h) {
  let $ = w(58),
    {
      turn: turn,
      guard: guard,
      titles: titles,
      transcript: transcript,
      isSessionWorking: isSessionWorking,
    } = h,
    Re = useSession(),
    { storageV5: storageV5 } = Me(),
    He = usePreviousDialogMcpServerName(),
    We = useAppState(hasPendingWorkerRequest),
    ze = useAppState(JHo),
    Xe = useAppState(XHo),
    rt = useStoreSelector(turn, selectIsLoading4),
    kt = useStoreSelector(turn, selectIsQueryActive),
    At = useStoreSelector(titles, selectDisabled),
    It = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    Ot = useAppState(nUo),
    Dt;
  if ($[0] !== Ot || $[1] !== rt) ((Dt = (Lt) => XAe(Lt, rt || Ot)), ($[0] = Ot), ($[1] = rt), ($[2] = Dt));
  else Dt = $[2];
  let oo = useDialogSelector(Dt),
    Xt,
    io;
  if ($[3] !== guard.isRunning)
    ((Xt = () => guard.isRunning),
      (io = () => guard.isRunning),
      ($[3] = guard.isRunning),
      ($[4] = Xt),
      ($[5] = io));
  else ((Xt = $[4]), (io = $[5]));
  let so = yt(guard.subscribe, Xt, io);
  const po = He !== void 0;
  let ao;
  if (
    $[6] !== Ot ||
    $[7] !== It ||
    $[8] !== rt ||
    $[9] !== kt ||
    $[10] !== so ||
    $[11] !== ze ||
    $[12] !== We ||
    $[13] !== po ||
    $[14] !== oo
  )
    ((ao = computeSessionPresence({
      topDialogWaitingFor: oo,
      queuedElicitation: po,
      pendingWorkerRequest: We,
      pendingSandboxRequest: ze,
      isShowingLocalJSXCommand: It,
      isResponseStreaming: so,
      isLoading: rt,
      isQueryActive: kt,
      delegatedActive: Ot,
    })),
      ($[6] = Ot),
      ($[7] = It),
      ($[8] = rt),
      ($[9] = kt),
      ($[10] = so),
      ($[11] = ze),
      ($[12] = We),
      ($[13] = po),
      ($[14] = oo),
      ($[15] = ao));
  else ao = $[15];
  let { status: status, waitingFor: waitingFor, working: working } = ao,
    Bo,
    Ro;
  if ($[16] !== Re || $[17] !== working)
    ((Bo = () => {
      eyt(Re, working);
    }),
      (Ro = [Re, working]),
      ($[16] = Re),
      ($[17] = working),
      ($[18] = Bo),
      ($[19] = Ro));
  else ((Bo = $[18]), (Ro = $[19]));
  P(Bo, Ro);
  let Ho, Io;
  if ($[20] !== Re) ((Ho = () => () => eyt(Re, !1)), (Io = [Re]), ($[20] = Re), ($[21] = Ho), ($[22] = Io));
  else ((Ho = $[21]), (Io = $[22]));
  P(Ho, Io);
  let Wo, mn;
  if ($[23] !== Re || $[24] !== waitingFor)
    ((Wo = () => {
      pzn(Re, waitingFor);
    }),
      (mn = [Re, waitingFor]),
      ($[23] = Re),
      ($[24] = waitingFor),
      ($[25] = Wo),
      ($[26] = mn));
  else ((Wo = $[25]), (mn = $[26]));
  P(Wo, mn);
  let Cn, No;
  if ($[27] !== Re)
    ((Cn = () => () => pzn(Re, void 0)), (No = [Re]), ($[27] = Re), ($[28] = Cn), ($[29] = No));
  else ((Cn = $[28]), (No = $[29]));
  P(Cn, No);
  let vo = useAppState(rUo),
    Yo = status === "idle" && vo ? "shell" : status,
    kn,
    Fn;
  if ($[30] !== status)
    ((kn = () => {
      if (status === "busy") {
        return (oen(), aUo);
      }
    }),
      (Fn = [status]),
      ($[30] = status),
      ($[31] = kn),
      ($[32] = Fn));
  else ((kn = $[31]), (Fn = $[32]));
  P(kn, Fn);
  let bn;
  if ($[33] === MEMO_CACHE_SENTINEL) ((bn = tE()), ($[33] = bn));
  else bn = $[33];
  let Go = bn,
    hn = useDialogSelector(lUo),
    Mn = Nu(),
    Xo;
  if ($[34] !== Mn) ((Xo = () => Mn.getMainThreadQueueLength() > 0), ($[34] = Mn), ($[35] = Xo));
  else Xo = $[35];
  let Sn = yt(Mn.subscribe, Xo),
    $n = waitingFor === "dialog open" && !hn && !Sn,
    on = Go && $n,
    _o;
  if ($[36] !== Yo || $[37] !== storageV5 || $[38] !== waitingFor)
    ((_o = () => {
      updateSessionActivity({ status: Yo, waitingFor: waitingFor, ...{} }, storageV5).catch(dUo);
    }),
      ($[36] = Yo),
      ($[37] = storageV5),
      ($[38] = waitingFor),
      ($[39] = _o));
  else _o = $[39];
  let cn;
  if ($[40] !== Yo || $[41] !== storageV5 || $[42] !== waitingFor || $[43] !== on)
    ((cn = [Yo, waitingFor, on, storageV5]),
      ($[40] = Yo),
      ($[41] = storageV5),
      ($[42] = waitingFor),
      ($[43] = on),
      ($[44] = cn));
  else cn = $[44];
  (P(_o, cn), usePeerIdleNotices(transcript, Yo, isSessionWorking));
  let Dn;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    let wn = getFeatureValue_CACHED_MAY_BE_STALE("tengu_terminal_sidebar", !1);
    Dn = wn && (getGlobalConfig().showStatusInTerminalTab ?? !1);
    $[45] = Dn;
  } else Dn = $[45];
  let mr = Dn;
  useTabStatus(At || !mr ? null : status, Xe);
  let Kn = useProgramStatusSupport();
  const Wn = $n ? void 0 : waitingFor;
  let Fr;
  if ($[46] !== Sn || $[47] !== status || $[48] !== Wn || $[49] !== turn)
    ((Fr = e(SessionPresenceReporter, { turn: turn, status: status, blockedOn: Wn, queued: Sn })),
      ($[46] = Sn),
      ($[47] = status),
      ($[48] = Wn),
      ($[49] = turn),
      ($[50] = Fr));
  else Fr = $[50];
  const Zn = status === "busy",
    Un = mr || Kn;
  let dr;
  if ($[51] !== Zn || $[52] !== Un || $[53] !== titles)
    ((dr = e(AnimatedTerminalTitle, { titles: titles, isAnimating: Zn, noPrefix: Un })),
      ($[51] = Zn),
      ($[52] = Un),
      ($[53] = titles),
      ($[54] = dr));
  else dr = $[54];
  let or;
  if ($[55] !== Fr || $[56] !== dr)
    ((or = r(Fragment, { children: [Fr, dr] })), ($[55] = Fr), ($[56] = dr), ($[57] = or));
  else or = $[57];
  return or;
}

export { useBackgroundAskEmitter, useSemanticPromptMarks, completeLabelOrUndefined, useSessionPresence };
