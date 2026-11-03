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
import { formatTabStatus, programStatusClearById, PROGRAM_STATUS_CLEAR } from "../../ink/terminal.js";
import { init_react_production, P, yt, y, Se, R, ce } from "../../../vendor/react/cjs/react.production.js";
import { isBgSession, updateSessionActivity } from "../../utils/concurrentSessions.js";
import { managedSettingsSecurityDialogDef } from "./StartupNudges.js";
import { sandboxNetworkAccessDialogDef } from "./SandboxNetworkPrompts.js";
import { DIALOG_KIND_META, parseLocalJsxDialogPayload } from "../../components/dialogs/dialogKinds.js";
import { attentionRegistryStore, truncateAttentionText } from "../../components/fleet/sessionAttention.js";
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
import { getTerminalCapabilities } from "../../ink/terminalCapabilities.js";
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
import { useVoiceLoginCompleted } from "../../hooks/useVoiceIntegration.js";
import { useAppState } from "../../state/AppState.js";
import { completedPercent } from "../../components/tasks/RemoteSessionProgress.js";
import { useTaskListSnapshot } from "../../hooks/useTasksV2.js";
import { sessionPresenceState, usePeerIdleNotices } from "./peerIdleNotices.js";
import { hasActiveAgentTasks, hasRunningShellTasks } from "../../tasks/taskStatus.js";
import { releaseSleepPreventer, acquireSleepPreventer } from "../../utils/forkSourceNote.js";
import { LOCAL_JSX_DIALOG, RATE_LIMIT_OPTIONS_COMMANDS } from "../../commands/rate-limit-options/index.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { useSession } from "../../context/session.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { isDialogKindBlocking } from "../../components/dialogs/registry.js";
import { computeSessionPresence } from "../../components/dialogs/dialogStatus.js";
import { setWorking } from "../../services/artifacts/artifactPresence.js";
import { setWaitingFor } from "../../services/artifacts/presenceSocket.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";
import { useCommandQueueOrDefault } from "../../context/QueuedMessageContext.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig } from "../../utils/config.js";
import { useTabStatus } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AnimatedTerminalTitle } from "../REPL.js";

//@ chunk-18hwfzwa.js:1429877-1429934 placement
function completeLabelOrUndefined(description) {
  return description.includes("\u2026") ? undefined : redactSecrets(description);
}
//@ chunk-18hwfzwa.js:1429934-1430004 placement
function describePresenceEntries(appState) {
  return listActiveAgentTaskEntries(appState).map((x) => `${x.id}	${formatTabStatus(x)}`).join(`
`);
}
//@ chunk-18hwfzwa.js:1430004-1430132 placement
/**
 * 每行 “键\t值” 解析为 Map。
 */
function parseTabSeparatedMap(h) {
  let x = new Map();
  for (let line of h.split(`
`)) {
    let index = line.indexOf("\t");
    if (index > 0) x.set(line.slice(0, index), line.slice(index + 1));
  }
  return x;
}
//@ chunk-18hwfzwa.js:1430132-1430136 placement
init_react_production();
//@ chunk-18hwfzwa.js:1430136-1430812 placement
/**
 * 后台会话中把权限、沙箱网络、MCP 输入、托管设置等等待状态发布出去。
 */
function useBackgroundAskEmitter() {
  let h = isBgSession();
  let topBlockingDialogKind = selectTopBlockingDialogKind();
  let D = topBlockingDialogKind === managedSettingsSecurityDialogDef.kind;
  let sandboxNetworkHost = useSandboxNetworkHost();
  let ee = topBlockingDialogKind === sandboxNetworkAccessDialogDef.kind;
  let topDialogMcpServerName = useTopDialogMcpServerName();
  let previousDialogMcpServerName = usePreviousDialogMcpServerName();
  let peerApprovalAsk = usePeerApprovalAsk();
  let needs =
    topBlockingDialogKind === undefined ? undefined : DIALOG_KIND_META[topBlockingDialogKind]?.needs;
  let topAskOrder = selectTopAskOrder();
  P(() => {
    if (!h) return;
    attentionRegistryStore.showAsk(topAskOrder ?? null);
  }, [h, topAskOrder]);
  P(() => {
    if (!h) return;
    let ze = sandboxNetworkHost ? `allow network: ${sandboxNetworkHost}` : null;
    attentionRegistryStore.emit(ee ? ze : null, "sandbox");
    attentionRegistryStore.emit(ee ? null : ze, "sandbox-queued");
  }, [h, sandboxNetworkHost, ee]);
  P(() => {
    if (!h) return;
    attentionRegistryStore.emit(
      topDialogMcpServerName ? `MCP input: ${topDialogMcpServerName}` : null,
      "elicitation",
    );
  }, [h, topDialogMcpServerName]);
  P(() => {
    if (!h) return;
    attentionRegistryStore.emit(
      previousDialogMcpServerName ? `MCP input: ${previousDialogMcpServerName}` : null,
      "elicitation-queued",
    );
  }, [h, previousDialogMcpServerName]);
  P(() => {
    if (!h) return;
    attentionRegistryStore.emit(D ? "review: managed settings change" : null, "managed-settings");
  }, [h, D]);
  P(() => {
    if (!h) return;
    attentionRegistryStore.emit(
      peerApprovalAsk !== undefined
        ? {
            text: peerApprovalAsk,
            overlay: true,
          }
        : (needs ?? null),
      "dialog",
    );
  }, [h, peerApprovalAsk, needs]);
}
//@ chunk-18hwfzwa.js:1430812-1430889 placement
function selectTopAskOrder() {
  let dialogStore = useDialogStore();
  let x = () => topAskOrder(dialogStore.getState());
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1430889-1430971 placement
function selectTopBlockingDialogKind() {
  let dialogStore = useDialogStore();
  let x = () => topBlockingDialog(dialogStore.getState())?.kind;
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1430971-1431356 placement
/**
 * 来自其他会话的消息审批对话框的提示文本。
 */
function usePeerApprovalAsk() {
  let dialogStore = useDialogStore();
  let x = () => {
    let D = topBlockingDialog(dialogStore.getState());
    if (D?.kind !== peerInboundApprovalDialogDef.kind) return;
    let L = peerInboundApprovalDialogDef.payload().safeParse(D.payload);
    let fromAddress = L.success ? L.data.fromAddress : undefined;
    let ke = L.success
      ? (L.data.claimedName ?? "")
          .replace(/[^A-Za-z0-9 ._-]/g, " ")
          .replace(/ {2,}/g, " ")
          .trim()
      : "";
    return truncateAttentionText(
      `approve message from ${fromAddress ?? "another session"}${ke ? ` (claims name: ${ke})` : ""}`,
    );
  };
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1431356-1431580 placement
/**
 * 当前沙箱网络访问对话框请求的主机。
 */
function useSandboxNetworkHost() {
  let dialogStore = useDialogStore();
  let x = () => {
    let last = dialogStore
      .getState()
      .open.findLast((ee) => !ee.userInvoked && ee.kind === sandboxNetworkAccessDialogDef.kind);
    if (!last) return;
    let L = sandboxNetworkAccessDialogDef.payload().safeParse(last.payload);
    return L.success ? L.data.host : undefined;
  };
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1431580-1431813 placement = isToolFromMcpServer (0.657)
/**
 * getDialogMcpServerName：从对话框栈条目 payload 取服务器名。
 */
function getDialogMcpServerName(h) {
  if (h?.kind === MCP_ELICITATION_DIALOG.kind) {
    let x = MCP_ELICITATION_DIALOG.payload().safeParse(h.payload);
    return x.success ? x.data.serverName : undefined;
  }
  if (h?.kind === MCP_ELICITATION_WAITING_DIALOG.kind) {
    let x = MCP_ELICITATION_WAITING_DIALOG.payload().safeParse(h.payload);
    return x.success ? x.data.serverName : undefined;
  }
  return;
}
//@ chunk-18hwfzwa.js:1431813-1431893 placement
function useTopDialogMcpServerName() {
  let dialogStore = useDialogStore();
  let x = () => getDialogMcpServerName(topAutoDialog(dialogStore.getState()));
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1431893-1432047 placement
function usePreviousDialogMcpServerName() {
  let dialogStore = useDialogStore();
  let x = () => {
    let state = dialogStore.getState();
    let L = topAutoDialog(state);
    let last = state.open.findLast((ke) => ke !== L && ke.kind === MCP_ELICITATION_DIALOG.kind);
    return getDialogMcpServerName(last);
  };
  return yt(dialogStore.subscribe, x, x);
}
//@ chunk-18hwfzwa.js:1432047-1432051 placement
init_react_production();
//@ chunk-18hwfzwa.js:1432051-1432062 placement
var LOCAL_TERM_NAME = "";
//@ chunk-18hwfzwa.js:1432062-1432170 placement
/**
 * 终端是否支持程序状态（异步结果）。
 */
function useProgramStatusSupport() {
  let [h, x] = y(() => getTerminalCapabilities().now("programStatus"));
  P(() => getTerminalCapabilities().onSettle("programStatus", x), []);
  return h;
}
//@ chunk-18hwfzwa.js:1432170-1432692 placement
/**
 * 把会话状态写入终端程序状态序列（只写变化的项，卸载时清除）。
 */
function useTerminalProgramStatus(h, x, D) {
  let L = Se(TerminalWriteContext);
  let programStatusSupport = useProgramStatusSupport();
  let ke = R(new Map());
  let Re = R(false);
  let Be = R(D);
  let He = formatTabStatus(h);
  P(() => {
    if (L && programStatusSupport && !isTerminalShutdown()) {
      if (Be.current !== D) {
        Be.current = D;
        ke.current.clear();
      }
      let We = new Map([[LOCAL_TERM_NAME, He], ...parseTabSeparatedMap(x)]);
      let ze = "";
      for (let [Xe, rt] of We)
        if (ke.current.get(Xe) !== rt) {
          ke.current.set(Xe, rt);
          ze += rt;
        }
      for (let key of ke.current.keys())
        if (!We.has(key)) {
          ke.current.delete(key);
          ze += programStatusClearById(key);
        }
      if (ze === "") return;
      if (!Re.current) {
        Re.current = true;
        logFeatureOk("terminal_program_status");
      }
      L(ze);
    }
  }, [He, x, programStatusSupport, L, D]);
  P(
    () => () => {
      if (ke.current.size > 0 && L) {
        ke.current.clear();
        L(PROGRAM_STATUS_CLEAR);
      }
    },
    [L],
  );
}
//@ chunk-18hwfzwa.js:1432692-1432696 placement
init_react_production();
//@ chunk-18hwfzwa.js:1432696-1432938 placement
/**
 * 回合开始/结束时写 OSC 133 语义提示标记。
 */
function useSemanticPromptMarks() {
  let h = Se(TerminalWriteContext);
  let x = usesProgramStatus();
  let markTurnStart = ce(() => {
    if (!x || !h) return;
    h(osc(OSC.SEMANTIC_PROMPT, "A", "redraw=0"));
  }, [x, h]);
  let markTurnDone = ce(() => {
    if (!x || !h) return;
    h(osc(OSC.SEMANTIC_PROMPT, "C") + osc(OSC.SEMANTIC_PROMPT, "D"));
  }, [x, h]);
  return {
    markTurnStart,
    markTurnDone,
  };
}
//@ chunk-18hwfzwa.js:1432938-1433029 placement
/**
 * 屏幕阅读器/全屏/WezTerm 下是否启用程序状态（会话在线状态行）。
 */
function usesProgramStatus() {
  let h = Se(TerminalWriteContext);
  let isFullscreen = useIsFullscreen();
  return (
    h !== null &&
    isScreenReaderMode() &&
    !isFullscreen &&
    !isDecstbmRendererEnabled() &&
    env.terminal !== "WezTerm"
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
function selectTurnStatusDetail(co) {
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
function currentSpinnerText() {
  return attentionRegistryStore.current()?.text;
}
//@ chunk-18hwfzwa.js:1433278-1433333 placement
function selectSandboxRequestHost(ze) {
  return ze.pendingSandboxRequest?.host;
}
//@ chunk-18hwfzwa.js:1433333-1433485 placement
/**
 * 待审批 worker 请求的提示文本。
 */
function workerRequestText(Xe) {
  return Xe.pendingWorkerRequest === null
    ? undefined
    : truncateAttentionText(
        `approve ${Xe.pendingWorkerRequest.toolName}: ${Xe.pendingWorkerRequest.description}`,
      );
}
//@ chunk-18hwfzwa.js:1433485-1434137 placement
/**
 * 汇总回合、等待、任务等状态并写入终端程序状态。
 */
function SessionPresenceReporter(props) {
  let $ = w(5);
  let { turn, status, blockedOn, queued } = props;
  let storeSelector = useStoreSelector(turn, selectLastTurnEnd);
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let He;
  if ($[0] !== storeSelector || $[1] !== voiceLoginCompleted) {
    He = {
      end: storeSelector,
      logins: voiceLoginCompleted,
    };
    $[0] = storeSelector;
    $[1] = voiceLoginCompleted;
    $[2] = He;
  } else He = $[2];
  let [We, ze] = y(He);
  if (We.end !== storeSelector)
    ze({
      end: storeSelector,
      logins: voiceLoginCompleted,
    });
  let signedInSince = We.end === storeSelector && We.logins !== voiceLoginCompleted;
  let appState = useAppState(selectTaskSummary);
  let [kt, At] = y(appState);
  if (status === "waiting" && kt !== appState) At(appState);
  let workingDetail = appState !== kt ? appState?.text : undefined;
  let doneDetail = useAppState(selectTurnStatusDetail);
  let appState_2 = useAppState(selectTasks4);
  let Dt;
  if ($[3] !== appState_2) {
    Dt = describePresenceEntries(appState_2);
    $[3] = appState_2;
    $[4] = Dt;
  } else Dt = $[4];
  let Lt = Dt;
  let storeSelector_2 = useStoreSelector(turn, selectPromptMarks);
  let Xt = usesProgramStatus() ? storeSelector_2 : 0;
  let progress = completedPercent(useTaskListSnapshot());
  let blockedText = useBlockedText(blockedOn);
  useTerminalProgramStatus(
    sessionPresenceState({
      status,
      blockedOn,
      blockedText,
      queued,
      lastTurnEnd: storeSelector,
      signedInSince,
      workingDetail,
      doneDetail,
      progress,
    }),
    Lt,
    Xt,
  );
  return null;
}
//@ chunk-18hwfzwa.js:1434137-1434524 placement
/**
 * 按阻塞原因生成提示文本。
 */
function useBlockedText(blockedOn) {
  let x = currentSpinnerText;
  let D = yt(attentionRegistryStore.subscribe, x, x);
  let sandboxNetworkHost = useSandboxNetworkHost();
  let topDialogMcpServerName = useTopDialogMcpServerName();
  let previousDialogMcpServerName = usePreviousDialogMcpServerName();
  let appState = useAppState(selectSandboxRequestHost);
  let appState_2 = useAppState(workerRequestText);
  switch (blockedOn) {
    case "permission prompt":
    case "goal proposal": {
      return D;
    }
    case "input needed": {
      let He = previousDialogMcpServerName ?? topDialogMcpServerName;
      return He === undefined ? D : `MCP input: ${He}`;
    }
    case "sandbox request": {
      let We = sandboxNetworkHost ?? appState;
      return We === undefined ? undefined : `allow network: ${We}`;
    }
    case "worker request": {
      return appState_2;
    }
    case "dialog open":
    case undefined: {
      return;
    }
  }
}
//@ chunk-18hwfzwa.js:1434524-1434579 placement = _temp (1)
function hasPendingWorkerRequest(state) {
  return state.pendingWorkerRequest !== null;
}
//@ chunk-18hwfzwa.js:1434579-1434635 placement
function hasPendingSandboxRequest(Qn) {
  return Qn.pendingSandboxRequest !== null;
}
//@ chunk-18hwfzwa.js:1434635-1434693 placement
function selectTurnStatusDetailB(ur) {
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
function selectHasActiveAgentTasks(Gn) {
  return hasActiveAgentTasks(Gn.tasks);
}
//@ chunk-18hwfzwa.js:1434844-1434882 placement
function selectHasRunningShellTasks(Ur) {
  return hasRunningShellTasks(Ur.tasks);
}
//@ chunk-18hwfzwa.js:1434882-1434910 placement
function readTerminalSize() {
  return releaseSleepPreventer();
}
//@ chunk-18hwfzwa.js:1434910-1434994 placement
function isAutoreactCommandDialog(Zr) {
  return (
    Zr.kind === LOCAL_JSX_DIALOG.kind &&
    RATE_LIMIT_OPTIONS_COMMANDS.has(parseLocalJsxDialogPayload(Zr.payload)?.commandName ?? "")
  );
}
//@ chunk-18hwfzwa.js:1434994-1435051 placement
function hasBlockingDialogOrCommand(wr) {
  return topAutoDialog(wr) !== null || wr.open.some(isAutoreactCommandDialog);
}
//@ chunk-18hwfzwa.js:1435051-1435146 placement
function logPresenceWriteFailure(zr) {
  logForDebugging(`session presence: PID-file status write failed: ${errorMessage(zr)}`, {
    level: "error",
  });
}
//@ chunk-18hwfzwa.js:1435146-1438068 placement
/**
 * useSessionPresence：会话在线状态（同伴、远程客户端）hook。
 */
function useSessionPresence(props) {
  let $ = w(58);
  let { turn, guard, titles, transcript, isSessionWorking } = props;
  let session = useSession();
  let { storageV5 } = useTheme_2();
  let previousDialogMcpServerName = usePreviousDialogMcpServerName();
  let pendingWorkerRequest = useAppState(hasPendingWorkerRequest);
  let pendingSandboxRequest = useAppState(hasPendingSandboxRequest);
  let idleText = useAppState(selectTurnStatusDetailB);
  let storeSelector = useStoreSelector(turn, selectIsLoading4);
  let isQueryActive = useStoreSelector(turn, selectIsQueryActive);
  let storeSelector_2 = useStoreSelector(titles, selectDisabled);
  let isShowingLocalJSXCommand = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let appState = useAppState(selectHasActiveAgentTasks);
  let Dt;
  if ($[0] !== appState || $[1] !== storeSelector) {
    Dt = (Lt) => isDialogKindBlocking(Lt, storeSelector || appState);
    $[0] = appState;
    $[1] = storeSelector;
    $[2] = Dt;
  } else Dt = $[2];
  let topDialogWaitingFor = useDialogSelector(Dt);
  let Xt;
  let io;
  if ($[3] !== guard.isRunning) {
    Xt = () => guard.isRunning;
    io = () => guard.isRunning;
    $[3] = guard.isRunning;
    $[4] = Xt;
    $[5] = io;
  } else {
    Xt = $[4];
    io = $[5];
  }
  let isResponseStreaming = yt(guard.subscribe, Xt, io);
  const queuedElicitation = previousDialogMcpServerName !== undefined;
  let ao;
  if (
    $[6] !== appState ||
    $[7] !== isShowingLocalJSXCommand ||
    $[8] !== storeSelector ||
    $[9] !== isQueryActive ||
    $[10] !== isResponseStreaming ||
    $[11] !== pendingSandboxRequest ||
    $[12] !== pendingWorkerRequest ||
    $[13] !== queuedElicitation ||
    $[14] !== topDialogWaitingFor
  ) {
    ao = computeSessionPresence({
      topDialogWaitingFor,
      queuedElicitation,
      pendingWorkerRequest,
      pendingSandboxRequest,
      isShowingLocalJSXCommand,
      isResponseStreaming,
      isLoading: storeSelector,
      isQueryActive,
      delegatedActive: appState,
    });
    $[6] = appState;
    $[7] = isShowingLocalJSXCommand;
    $[8] = storeSelector;
    $[9] = isQueryActive;
    $[10] = isResponseStreaming;
    $[11] = pendingSandboxRequest;
    $[12] = pendingWorkerRequest;
    $[13] = queuedElicitation;
    $[14] = topDialogWaitingFor;
    $[15] = ao;
  } else ao = $[15];
  let { status, waitingFor, working } = ao;
  let Bo;
  let Ro;
  if ($[16] !== session || $[17] !== working) {
    Bo = () => {
      setWorking(session, working);
    };
    Ro = [session, working];
    $[16] = session;
    $[17] = working;
    $[18] = Bo;
    $[19] = Ro;
  } else {
    Bo = $[18];
    Ro = $[19];
  }
  P(Bo, Ro);
  let Ho;
  let Io;
  if ($[20] !== session) {
    Ho = () => () => setWorking(session, false);
    Io = [session];
    $[20] = session;
    $[21] = Ho;
    $[22] = Io;
  } else {
    Ho = $[21];
    Io = $[22];
  }
  P(Ho, Io);
  let Wo;
  let mn;
  if ($[23] !== session || $[24] !== waitingFor) {
    Wo = () => {
      setWaitingFor(session, waitingFor);
    };
    mn = [session, waitingFor];
    $[23] = session;
    $[24] = waitingFor;
    $[25] = Wo;
    $[26] = mn;
  } else {
    Wo = $[25];
    mn = $[26];
  }
  P(Wo, mn);
  let Cn;
  let No;
  if ($[27] !== session) {
    Cn = () => () => setWaitingFor(session, undefined);
    No = [session];
    $[27] = session;
    $[28] = Cn;
    $[29] = No;
  } else {
    Cn = $[28];
    No = $[29];
  }
  P(Cn, No);
  let appState_2 = useAppState(selectHasRunningShellTasks);
  let Yo = status === "idle" && appState_2 ? "shell" : status;
  let kn;
  let Fn;
  if ($[30] !== status) {
    kn = () => {
      if (status === "busy") {
        acquireSleepPreventer();
        return readTerminalSize;
      }
    };
    Fn = [status];
    $[30] = status;
    $[31] = kn;
    $[32] = Fn;
  } else {
    kn = $[31];
    Fn = $[32];
  }
  P(kn, Fn);
  let bn;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    bn = currentToolPermissionContext();
    $[33] = bn;
  } else bn = $[33];
  let Go = bn;
  let dialogSelector = useDialogSelector(hasBlockingDialogOrCommand);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let Xo;
  if ($[34] !== commandQueueOrDefault) {
    Xo = () => commandQueueOrDefault.getMainThreadQueueLength() > 0;
    $[34] = commandQueueOrDefault;
    $[35] = Xo;
  } else Xo = $[35];
  let Sn = yt(commandQueueOrDefault.subscribe, Xo);
  let $n = waitingFor === "dialog open" && !dialogSelector && !Sn;
  let on = Go && $n;
  let _o;
  if ($[36] !== Yo || $[37] !== storageV5 || $[38] !== waitingFor) {
    _o = () => {
      updateSessionActivity(
        {
          status: Yo,
          waitingFor,
          ...{},
        },
        storageV5,
      ).catch(logPresenceWriteFailure);
    };
    $[36] = Yo;
    $[37] = storageV5;
    $[38] = waitingFor;
    $[39] = _o;
  } else _o = $[39];
  let cn;
  if ($[40] !== Yo || $[41] !== storageV5 || $[42] !== waitingFor || $[43] !== on) {
    cn = [Yo, waitingFor, on, storageV5];
    $[40] = Yo;
    $[41] = storageV5;
    $[42] = waitingFor;
    $[43] = on;
    $[44] = cn;
  } else cn = $[44];
  P(_o, cn);
  usePeerIdleNotices(transcript, Yo, isSessionWorking);
  let Dn;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_terminal_sidebar",
      false,
    );
    Dn = featureValue_CACHED_MAY_BE_STALE && (getGlobalConfig().showStatusInTerminalTab ?? false);
    $[45] = Dn;
  } else Dn = $[45];
  let mr = Dn;
  useTabStatus(storeSelector_2 || !mr ? null : status, idleText);
  let programStatusSupport = useProgramStatusSupport();
  const blockedOn = $n ? undefined : waitingFor;
  let Fr;
  if ($[46] !== Sn || $[47] !== status || $[48] !== blockedOn || $[49] !== turn) {
    Fr = jsxProd_default(SessionPresenceReporter, {
      turn,
      status,
      blockedOn,
      queued: Sn,
    });
    $[46] = Sn;
    $[47] = status;
    $[48] = blockedOn;
    $[49] = turn;
    $[50] = Fr;
  } else Fr = $[50];
  const isAnimating = status === "busy";
  const noPrefix = mr || programStatusSupport;
  let dr;
  if ($[51] !== isAnimating || $[52] !== noPrefix || $[53] !== titles) {
    dr = jsxProd_default(AnimatedTerminalTitle, {
      titles,
      isAnimating,
      noPrefix,
    });
    $[51] = isAnimating;
    $[52] = noPrefix;
    $[53] = titles;
    $[54] = dr;
  } else dr = $[54];
  let or;
  if ($[55] !== Fr || $[56] !== dr) {
    or = jsxProd_default_2(Fragment, {
      children: [Fr, dr],
    });
    $[55] = Fr;
    $[56] = dr;
    $[57] = or;
  } else or = $[57];
  return or;
}
export { useBackgroundAskEmitter, useSemanticPromptMarks, completeLabelOrUndefined, useSessionPresence };
