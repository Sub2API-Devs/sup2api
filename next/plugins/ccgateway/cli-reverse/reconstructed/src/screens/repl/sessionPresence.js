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
import {
  init_react_production,
  useEffect,
  useSyncExternalStore,
  useState,
  useContext,
  useRef,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1429877-1429934 placement
function completeLabelOrUndefined(description) {
  return description.includes("\u2026") ? undefined : redactSecrets(description);
}
//@ chunk-18hwfzwa.js:1429934-1430004 placement
function describePresenceEntries(appState) {
  return listActiveAgentTaskEntries(appState).map((task) => `${task.id}	${formatTabStatus(task)}`).join(`
`);
}
//@ chunk-18hwfzwa.js:1430004-1430132 placement
/**
 * 每行 “键\t值” 解析为 Map。
 */
function parseTabSeparatedMap(text) {
  let map = new Map();
  for (let line of text.split(`
`)) {
    let index = line.indexOf("\t");
    if (index > 0) map.set(line.slice(0, index), line.slice(index + 1));
  }
  return map;
}
//@ chunk-18hwfzwa.js:1430132-1430136 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1430132", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1430136-1430812 placement
/**
 * 后台会话中把权限、沙箱网络、MCP 输入、托管设置等等待状态发布出去。
 */
function useBackgroundAskEmitter() {
  let isBackground = isBgSession();
  let topBlockingDialogKind = selectTopBlockingDialogKind();
  let isSettingsDialog = topBlockingDialogKind === managedSettingsSecurityDialogDef.kind;
  let sandboxNetworkHost = useSandboxNetworkHost();
  let isSandboxDialog = topBlockingDialogKind === sandboxNetworkAccessDialogDef.kind;
  let topDialogMcpServerName = useTopDialogMcpServerName();
  let previousDialogMcpServerName = usePreviousDialogMcpServerName();
  let peerApprovalAsk = usePeerApprovalAsk();
  let needs =
    topBlockingDialogKind === undefined ? undefined : DIALOG_KIND_META[topBlockingDialogKind]?.needs;
  let topAskOrder = selectTopAskOrder();
  useEffect(() => {
    if (!isBackground) return;
    attentionRegistryStore.showAsk(topAskOrder ?? null);
  }, [isBackground, topAskOrder]);
  useEffect(() => {
    if (!isBackground) return;
    let sandboxAsk = sandboxNetworkHost ? `allow network: ${sandboxNetworkHost}` : null;
    attentionRegistryStore.emit(isSandboxDialog ? sandboxAsk : null, "sandbox");
    attentionRegistryStore.emit(isSandboxDialog ? null : sandboxAsk, "sandbox-queued");
  }, [isBackground, sandboxNetworkHost, isSandboxDialog]);
  useEffect(() => {
    if (!isBackground) return;
    attentionRegistryStore.emit(
      topDialogMcpServerName ? `MCP input: ${topDialogMcpServerName}` : null,
      "elicitation",
    );
  }, [isBackground, topDialogMcpServerName]);
  useEffect(() => {
    if (!isBackground) return;
    attentionRegistryStore.emit(
      previousDialogMcpServerName ? `MCP input: ${previousDialogMcpServerName}` : null,
      "elicitation-queued",
    );
  }, [isBackground, previousDialogMcpServerName]);
  useEffect(() => {
    if (!isBackground) return;
    attentionRegistryStore.emit(
      isSettingsDialog ? "review: managed settings change" : null,
      "managed-settings",
    );
  }, [isBackground, isSettingsDialog]);
  useEffect(() => {
    if (!isBackground) return;
    attentionRegistryStore.emit(
      peerApprovalAsk !== undefined
        ? {
            text: peerApprovalAsk,
            overlay: true,
          }
        : (needs ?? null),
      "dialog",
    );
  }, [isBackground, peerApprovalAsk, needs]);
}
//@ chunk-18hwfzwa.js:1430812-1430889 placement
function selectTopAskOrder() {
  let dialogStore = useDialogStore();
  let read = () => topAskOrder(dialogStore.getState());
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1430889-1430971 placement
function selectTopBlockingDialogKind() {
  let dialogStore = useDialogStore();
  let read = () => topBlockingDialog(dialogStore.getState())?.kind;
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1430971-1431356 placement
/**
 * 来自其他会话的消息审批对话框的提示文本。
 */
function usePeerApprovalAsk() {
  let dialogStore = useDialogStore();
  let read = () => {
    let dialog = topBlockingDialog(dialogStore.getState());
    if (dialog?.kind !== peerInboundApprovalDialogDef.kind) return;
    let parsed = peerInboundApprovalDialogDef.payload().safeParse(dialog.payload);
    let fromAddress = parsed.success ? parsed.data.fromAddress : undefined;
    let name = parsed.success
      ? (parsed.data.claimedName ?? "")
          .replace(/[^A-Za-z0-9 ._-]/g, " ")
          .replace(/ {2,}/g, " ")
          .trim()
      : "";
    return truncateAttentionText(
      `approve message from ${fromAddress ?? "another session"}${name ? ` (claims name: ${name})` : ""}`,
    );
  };
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1431356-1431580 placement
/**
 * 当前沙箱网络访问对话框请求的主机。
 */
function useSandboxNetworkHost() {
  let dialogStore = useDialogStore();
  let read = () => {
    let last = dialogStore
      .getState()
      .open.findLast((dialog) => !dialog.userInvoked && dialog.kind === sandboxNetworkAccessDialogDef.kind);
    if (!last) return;
    let parsed = sandboxNetworkAccessDialogDef.payload().safeParse(last.payload);
    return parsed.success ? parsed.data.host : undefined;
  };
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1431580-1431813 placement (2.1.88 match: isToolFromMcpServer, 0.657)
/**
 * getDialogMcpServerName：从对话框栈条目 payload 取服务器名。
 */
function getDialogMcpServerName(dialog) {
  if (dialog?.kind === MCP_ELICITATION_DIALOG.kind) {
    let parsed = MCP_ELICITATION_DIALOG.payload().safeParse(dialog.payload);
    return parsed.success ? parsed.data.serverName : undefined;
  }
  if (dialog?.kind === MCP_ELICITATION_WAITING_DIALOG.kind) {
    let parsed = MCP_ELICITATION_WAITING_DIALOG.payload().safeParse(dialog.payload);
    return parsed.success ? parsed.data.serverName : undefined;
  }
  return;
}
//@ chunk-18hwfzwa.js:1431813-1431893 placement
function useTopDialogMcpServerName() {
  let dialogStore = useDialogStore();
  let read = () => getDialogMcpServerName(topAutoDialog(dialogStore.getState()));
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1431893-1432047 placement
function usePreviousDialogMcpServerName() {
  let dialogStore = useDialogStore();
  let read = () => {
    let state = dialogStore.getState();
    let top = topAutoDialog(state);
    let dialog = state.open.findLast(
      (dialog) => dialog !== top && dialog.kind === MCP_ELICITATION_DIALOG.kind,
    );
    return getDialogMcpServerName(dialog);
  };
  return useSyncExternalStore(dialogStore.subscribe, read, read);
}
//@ chunk-18hwfzwa.js:1432047-1432051 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1432047", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1432051-1432062 placement
var LOCAL_TERM_NAME = "";
//@ chunk-18hwfzwa.js:1432062-1432170 placement
/**
 * 终端是否支持程序状态（异步结果）。
 */
function useProgramStatusSupport() {
  let [supported, setSupported] = useState(() => getTerminalCapabilities().now("programStatus"));
  useEffect(() => getTerminalCapabilities().onSettle("programStatus", setSupported), []);
  return supported;
}
//@ chunk-18hwfzwa.js:1432170-1432692 placement
/**
 * 把会话状态写入终端程序状态序列（只写变化的项，卸载时清除）。
 */
function useTerminalProgramStatus(status, blockedOn, queued) {
  let write = useContext(TerminalWriteContext);
  let programStatusSupport = useProgramStatusSupport();
  let timers = useRef(new Map());
  let cleared = useRef(false);
  let queuedRef = useRef(queued);
  let label = formatTabStatus(status);
  useEffect(() => {
    if (write && programStatusSupport && !isTerminalShutdown()) {
      if (queuedRef.current !== queued) {
        queuedRef.current = queued;
        timers.current.clear();
      }
      let statusByTab = new Map([[LOCAL_TERM_NAME, label], ...parseTabSeparatedMap(blockedOn)]);
      let output = "";
      for (let [tabName, statusText] of statusByTab)
        if (timers.current.get(tabName) !== statusText) {
          timers.current.set(tabName, statusText);
          output += statusText;
        }
      for (let key of timers.current.keys())
        if (!statusByTab.has(key)) {
          timers.current.delete(key);
          output += programStatusClearById(key);
        }
      if (output === "") return;
      if (!cleared.current) {
        cleared.current = true;
        logFeatureOk("terminal_program_status");
      }
      write(output);
    }
  }, [label, blockedOn, programStatusSupport, write, queued]);
  useEffect(
    () => () => {
      if (timers.current.size > 0 && write) {
        timers.current.clear();
        write(PROGRAM_STATUS_CLEAR);
      }
    },
    [write],
  );
}
//@ chunk-18hwfzwa.js:1432692-1432696 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1432692", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1432696-1432938 placement
/**
 * 回合开始/结束时写 OSC 133 语义提示标记。
 */
function useSemanticPromptMarks() {
  let write = useContext(TerminalWriteContext);
  let usesMarks = usesProgramStatus();
  let markTurnStart = useCallback(() => {
    if (!usesMarks || !write) return;
    write(osc(OSC.SEMANTIC_PROMPT, "A", "redraw=0"));
  }, [usesMarks, write]);
  let markTurnDone = useCallback(() => {
    if (!usesMarks || !write) return;
    write(osc(OSC.SEMANTIC_PROMPT, "C") + osc(OSC.SEMANTIC_PROMPT, "D"));
  }, [usesMarks, write]);
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
  let write = useContext(TerminalWriteContext);
  let isFullscreen = useIsFullscreen();
  return (
    write !== null &&
    isScreenReaderMode() &&
    !isFullscreen &&
    !isDecstbmRendererEnabled() &&
    env.terminal !== "WezTerm"
  );
}
//@ chunk-18hwfzwa.js:1433029-1433068 placement
function selectLastTurnEnd(state) {
  return state.lastTurnEnd;
}
//@ chunk-18hwfzwa.js:1433068-1433107 placement
function selectTaskSummary(state) {
  return state.taskSummary;
}
//@ chunk-18hwfzwa.js:1433107-1433165 placement
function selectTurnStatusDetail(state) {
  return state.postTurnSummary?.status_detail;
}
//@ chunk-18hwfzwa.js:1433165-1433198 placement
function selectTasks4(state) {
  return state.tasks;
}
//@ chunk-18hwfzwa.js:1433198-1433237 placement
function selectPromptMarks(state) {
  return state.promptMarks;
}
//@ chunk-18hwfzwa.js:1433237-1433278 placement
function currentSpinnerText() {
  return attentionRegistryStore.current()?.text;
}
//@ chunk-18hwfzwa.js:1433278-1433333 placement
function selectSandboxRequestHost(state) {
  return state.pendingSandboxRequest?.host;
}
//@ chunk-18hwfzwa.js:1433333-1433485 placement
/**
 * 待审批 worker 请求的提示文本。
 */
function workerRequestText(state) {
  return state.pendingWorkerRequest === null
    ? undefined
    : truncateAttentionText(
        `approve ${state.pendingWorkerRequest.toolName}: ${state.pendingWorkerRequest.description}`,
      );
}
//@ chunk-18hwfzwa.js:1433485-1434137 placement
/**
 * 汇总回合、等待、任务等状态并写入终端程序状态。
 */
function SessionPresenceReporter(props) {
  let $ = useMemoCache(5);
  let { turn, status, blockedOn, queued } = props;
  let storeSelector = useStoreSelector(turn, selectLastTurnEnd);
  let voiceLoginCompleted = useVoiceLoginCompleted();
  let args;
  if ($[0] !== storeSelector || $[1] !== voiceLoginCompleted) {
    args = {
      end: storeSelector,
      logins: voiceLoginCompleted,
    };
    $[0] = storeSelector;
    $[1] = voiceLoginCompleted;
    $[2] = args;
  } else args = $[2];
  let [argsState, setArgs] = useState(args);
  if (argsState.end !== storeSelector)
    setArgs({
      end: storeSelector,
      logins: voiceLoginCompleted,
    });
  let signedInSince = argsState.end === storeSelector && argsState.logins !== voiceLoginCompleted;
  let appState = useAppState(selectTaskSummary);
  let [entries, setEntries] = useState(appState);
  if (status === "waiting" && entries !== appState) setEntries(appState);
  let workingDetail = appState !== entries ? appState?.text : undefined;
  let doneDetail = useAppState(selectTurnStatusDetail);
  let appState_2 = useAppState(selectTasks4);
  let described;
  if ($[3] !== appState_2) {
    described = describePresenceEntries(appState_2);
    $[3] = appState_2;
    $[4] = described;
  } else described = $[4];
  let entryList = described;
  let storeSelector_2 = useStoreSelector(turn, selectPromptMarks);
  let tickInterval = usesProgramStatus() ? storeSelector_2 : 0;
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
    entryList,
    tickInterval,
  );
  return null;
}
//@ chunk-18hwfzwa.js:1434137-1434524 placement
/**
 * 按阻塞原因生成提示文本。
 */
function useBlockedText(blockedOn) {
  let read = currentSpinnerText;
  let currentText = useSyncExternalStore(attentionRegistryStore.subscribe, read, read);
  let sandboxNetworkHost = useSandboxNetworkHost();
  let topDialogMcpServerName = useTopDialogMcpServerName();
  let previousDialogMcpServerName = usePreviousDialogMcpServerName();
  let appState = useAppState(selectSandboxRequestHost);
  let appState_2 = useAppState(workerRequestText);
  switch (blockedOn) {
    case "permission prompt":
    case "goal proposal": {
      return currentText;
    }
    case "input needed": {
      let serverName = previousDialogMcpServerName ?? topDialogMcpServerName;
      return serverName === undefined ? currentText : `MCP input: ${serverName}`;
    }
    case "sandbox request": {
      let host = sandboxNetworkHost ?? appState;
      return host === undefined ? undefined : `allow network: ${host}`;
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
//@ chunk-18hwfzwa.js:1434524-1434579 placement (2.1.88 match: _temp, 1)
function hasPendingWorkerRequest(state) {
  return state.pendingWorkerRequest !== null;
}
//@ chunk-18hwfzwa.js:1434579-1434635 placement
function hasPendingSandboxRequest(state) {
  return state.pendingSandboxRequest !== null;
}
//@ chunk-18hwfzwa.js:1434635-1434693 placement
function selectTurnStatusDetailB(state) {
  return state.postTurnSummary?.status_detail;
}
//@ chunk-18hwfzwa.js:1434693-1434730 placement
function selectIsLoading4(state) {
  return state.isLoading;
}
//@ chunk-18hwfzwa.js:1434730-1434771 placement
function selectIsQueryActive(state) {
  return state.isQueryActive;
}
//@ chunk-18hwfzwa.js:1434771-1434807 placement
function selectDisabled(state) {
  return state.disabled;
}
//@ chunk-18hwfzwa.js:1434807-1434844 placement
function selectHasActiveAgentTasks(state) {
  return hasActiveAgentTasks(state.tasks);
}
//@ chunk-18hwfzwa.js:1434844-1434882 placement
function selectHasRunningShellTasks(state) {
  return hasRunningShellTasks(state.tasks);
}
//@ chunk-18hwfzwa.js:1434882-1434910 placement
function readTerminalSize() {
  return releaseSleepPreventer();
}
//@ chunk-18hwfzwa.js:1434910-1434994 placement
function isAutoreactCommandDialog(dialog) {
  return (
    dialog.kind === LOCAL_JSX_DIALOG.kind &&
    RATE_LIMIT_OPTIONS_COMMANDS.has(parseLocalJsxDialogPayload(dialog.payload)?.commandName ?? "")
  );
}
//@ chunk-18hwfzwa.js:1434994-1435051 placement
function hasBlockingDialogOrCommand(state) {
  return topAutoDialog(state) !== null || state.open.some(isAutoreactCommandDialog);
}
//@ chunk-18hwfzwa.js:1435051-1435146 placement
function logPresenceWriteFailure(error) {
  logForDebugging(`session presence: PID-file status write failed: ${errorMessage(error)}`, {
    level: "error",
  });
}
//@ chunk-18hwfzwa.js:1435146-1438068 placement
/**
 * useSessionPresence：会话在线状态（同伴、远程客户端）hook。
 */
function useSessionPresence(props) {
  let $ = useMemoCache(58);
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
  let isBlockingDialog;
  if ($[0] !== appState || $[1] !== storeSelector) {
    isBlockingDialog = (kind) => isDialogKindBlocking(kind, storeSelector || appState);
    $[0] = appState;
    $[1] = storeSelector;
    $[2] = isBlockingDialog;
  } else isBlockingDialog = $[2];
  let topDialogWaitingFor = useDialogSelector(isBlockingDialog);
  let getIsRunning;
  let subscribeGuard;
  if ($[3] !== guard.isRunning) {
    getIsRunning = () => guard.isRunning;
    subscribeGuard = () => guard.isRunning;
    $[3] = guard.isRunning;
    $[4] = getIsRunning;
    $[5] = subscribeGuard;
  } else {
    getIsRunning = $[4];
    subscribeGuard = $[5];
  }
  let isResponseStreaming = useSyncExternalStore(guard.subscribe, getIsRunning, subscribeGuard);
  const queuedElicitation = previousDialogMcpServerName !== undefined;
  let presence;
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
    presence = computeSessionPresence({
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
    $[15] = presence;
  } else presence = $[15];
  let { status, waitingFor, working } = presence;
  let workingEffect;
  let workingDeps;
  if ($[16] !== session || $[17] !== working) {
    workingEffect = () => {
      setWorking(session, working);
    };
    workingDeps = [session, working];
    $[16] = session;
    $[17] = working;
    $[18] = workingEffect;
    $[19] = workingDeps;
  } else {
    workingEffect = $[18];
    workingDeps = $[19];
  }
  useEffect(workingEffect, workingDeps);
  let clearWorking;
  let clearWorkingDeps;
  if ($[20] !== session) {
    clearWorking = () => () => setWorking(session, false);
    clearWorkingDeps = [session];
    $[20] = session;
    $[21] = clearWorking;
    $[22] = clearWorkingDeps;
  } else {
    clearWorking = $[21];
    clearWorkingDeps = $[22];
  }
  useEffect(clearWorking, clearWorkingDeps);
  let waitingEffect;
  let waitingDeps;
  if ($[23] !== session || $[24] !== waitingFor) {
    waitingEffect = () => {
      setWaitingFor(session, waitingFor);
    };
    waitingDeps = [session, waitingFor];
    $[23] = session;
    $[24] = waitingFor;
    $[25] = waitingEffect;
    $[26] = waitingDeps;
  } else {
    waitingEffect = $[25];
    waitingDeps = $[26];
  }
  useEffect(waitingEffect, waitingDeps);
  let clearWaiting;
  let clearWaitingDeps;
  if ($[27] !== session) {
    clearWaiting = () => () => setWaitingFor(session, undefined);
    clearWaitingDeps = [session];
    $[27] = session;
    $[28] = clearWaiting;
    $[29] = clearWaitingDeps;
  } else {
    clearWaiting = $[28];
    clearWaitingDeps = $[29];
  }
  useEffect(clearWaiting, clearWaitingDeps);
  let appState_2 = useAppState(selectHasRunningShellTasks);
  let reportedStatus = status === "idle" && appState_2 ? "shell" : status;
  let sleepEffect;
  let sleepDeps;
  if ($[30] !== status) {
    sleepEffect = () => {
      if (status === "busy") {
        acquireSleepPreventer();
        return readTerminalSize;
      }
    };
    sleepDeps = [status];
    $[30] = status;
    $[31] = sleepEffect;
    $[32] = sleepDeps;
  } else {
    sleepEffect = $[31];
    sleepDeps = $[32];
  }
  useEffect(sleepEffect, sleepDeps);
  let permissionContext;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    permissionContext = currentToolPermissionContext();
    $[33] = permissionContext;
  } else permissionContext = $[33];
  let permissionContext_2 = permissionContext;
  let dialogSelector = useDialogSelector(hasBlockingDialogOrCommand);
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let hasQueued;
  if ($[34] !== commandQueueOrDefault) {
    hasQueued = () => commandQueueOrDefault.getMainThreadQueueLength() > 0;
    $[34] = commandQueueOrDefault;
    $[35] = hasQueued;
  } else hasQueued = $[35];
  let hasQueuedCommands = useSyncExternalStore(commandQueueOrDefault.subscribe, hasQueued);
  let staleDialogWait = waitingFor === "dialog open" && !dialogSelector && !hasQueuedCommands;
  let reportIdle = permissionContext_2 && staleDialogWait;
  let presenceWriteEffect;
  if ($[36] !== reportedStatus || $[37] !== storageV5 || $[38] !== waitingFor) {
    presenceWriteEffect = () => {
      updateSessionActivity(
        {
          status: reportedStatus,
          waitingFor,
          ...{},
        },
        storageV5,
      ).catch(logPresenceWriteFailure);
    };
    $[36] = reportedStatus;
    $[37] = storageV5;
    $[38] = waitingFor;
    $[39] = presenceWriteEffect;
  } else presenceWriteEffect = $[39];
  let presenceWriteDeps;
  if ($[40] !== reportedStatus || $[41] !== storageV5 || $[42] !== waitingFor || $[43] !== reportIdle) {
    presenceWriteDeps = [reportedStatus, waitingFor, reportIdle, storageV5];
    $[40] = reportedStatus;
    $[41] = storageV5;
    $[42] = waitingFor;
    $[43] = reportIdle;
    $[44] = presenceWriteDeps;
  } else presenceWriteDeps = $[44];
  useEffect(presenceWriteEffect, presenceWriteDeps);
  usePeerIdleNotices(transcript, reportedStatus, isSessionWorking);
  let showTabStatus;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      "tengu_terminal_sidebar",
      false,
    );
    showTabStatus = featureValue_CACHED_MAY_BE_STALE && (getGlobalConfig().showStatusInTerminalTab ?? false);
    $[45] = showTabStatus;
  } else showTabStatus = $[45];
  let showTabStatus_2 = showTabStatus;
  useTabStatus(storeSelector_2 || !showTabStatus_2 ? null : status, idleText);
  let programStatusSupport = useProgramStatusSupport();
  const blockedOn = staleDialogWait ? undefined : waitingFor;
  let presenceReporter;
  if ($[46] !== hasQueuedCommands || $[47] !== status || $[48] !== blockedOn || $[49] !== turn) {
    presenceReporter = jsxProd_default(SessionPresenceReporter, {
      turn,
      status,
      blockedOn,
      queued: hasQueuedCommands,
    });
    $[46] = hasQueuedCommands;
    $[47] = status;
    $[48] = blockedOn;
    $[49] = turn;
    $[50] = presenceReporter;
  } else presenceReporter = $[50];
  const isAnimating = status === "busy";
  const noPrefix = showTabStatus_2 || programStatusSupport;
  let animatedTitle;
  if ($[51] !== isAnimating || $[52] !== noPrefix || $[53] !== titles) {
    animatedTitle = jsxProd_default(AnimatedTerminalTitle, {
      titles,
      isAnimating,
      noPrefix,
    });
    $[51] = isAnimating;
    $[52] = noPrefix;
    $[53] = titles;
    $[54] = animatedTitle;
  } else animatedTitle = $[54];
  let presenceFragment;
  if ($[55] !== presenceReporter || $[56] !== animatedTitle) {
    presenceFragment = jsxProd_default_2(Fragment, {
      children: [presenceReporter, animatedTitle],
    });
    $[55] = presenceReporter;
    $[56] = animatedTitle;
    $[57] = presenceFragment;
  } else presenceFragment = $[57];
  return presenceFragment;
}
export { useBackgroundAskEmitter, useSemanticPromptMarks, completeLabelOrUndefined, useSessionPresence };
