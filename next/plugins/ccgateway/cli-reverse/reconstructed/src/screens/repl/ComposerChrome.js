/**
 * screens/repl/ComposerChrome.ts
 *
 * 2.1.316 新增：REPL 输入区外框状态与相关控制器（IDE 选区去重、退出时费用报告、会话统计读取）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16), chunk-xe7zq1p4.js (2)
 * attribution: placement 18
 */
import {
  useContext,
  init_react_production,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { statsContext } from "../../context/stats.js";
import { PERMISSION_CARD_KINDS } from "../../components/dialogs/dialogKinds.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  unattendedNoticeRows,
  UnattendedNoticeContext,
} from "../../components/permissions/UnattendedAutoBlockNotice.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { alwaysFalseRemoteMode } from "../../remote/remoteMode.js";
import { NOT_IN_CLOUD_SESSIONS } from "../../components/PromptInput/PromptInputModeHints.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { sendDetachRequest, noopBackgroundConfirm } from "./backgroundConfirm.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { backgroundTaskKindLabel } from "../../tasks/backgroundTaskLabels.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { gracefulShutdown, isShuttingDown } from "../../utils/gracefulShutdown.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { awaitScanThenTurn } from "./PromptSubmitController.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import {
  getIsRemoteMode,
  claimCostLedgerForCurrentSession,
  onAttacherCapsChange,
  getAttacherCaps,
} from "../../bootstrap/state.js";
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "../../utils/config.js";
import { getVersionBase } from "../../services/analytics/metadata.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { registerPreExitFlush } from "../../utils/cleanupRegistry.js";
import {
  saveCostsAsync,
  resetCostState as resetCostState_2,
  formatTotalCost,
  saveCostsOnExit,
  flushAndSaveCosts,
} from "../../cost-tracker.js";
import { registerTranscriptExitReStamp } from "../../utils/sessionStorage.js";
import { hasConsoleBillingAccess } from "../../utils/billing.js";
import { useSetAppState, useAppState } from "../../state/AppState.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import {
  isLocalAgent,
  enterTeammateView,
  exitTeammateView,
  isTaskFailedOrStopped,
} from "../../state/teammateViewHelpers.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xe7zq1p4.js:1971-2000 placement
/**
 * 导出函数 `isTerminalInterested`：返回 Se(ie)。
 */
function isTerminalInterested() {
  return useContext(statsContext);
}
//@ chunk-xe7zq1p4.js:2000-2004 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:2000", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1624350-1624603 placement
/**
 * 决定对话框画在窗格中还是输入框上方、是否绘制。
 */
function resolveModalPlacement({
  onScreenBlockingKind,
  modalSlotActive,
  panelHidesPrompt,
  pinnedConsentShowing,
  dialogOverPanel,
  fullscreen,
}) {
  let isPermissionCard =
    onScreenBlockingKind !== null && PERMISSION_CARD_KINDS.includes(onScreenBlockingKind);
  let showInPane = isPermissionCard && modalSlotActive;
  let showAbovePrompt =
    !showInPane && (panelHidesPrompt || pinnedConsentShowing || isPermissionCard || dialogOverPanel);
  return {
    inPane: showInPane,
    abovePrompt: showAbovePrompt,
    drawn: showInPane || (showAbovePrompt && !(fullscreen && modalSlotActive)),
  };
}
//@ chunk-18hwfzwa.js:1624603-1624812 placement
/**
 * 提供无人值守提示占用的行数。
 */
function UnattendedNoticeProvider(props) {
  let $ = useMemoCache(3);
  let { drawn, hideSessionTitle, children } = props;
  let rows = unattendedNoticeRows(hideSessionTitle);
  const value = drawn ? rows : 0;
  let provider;
  if ($[0] !== children || $[1] !== value) {
    provider = jsxProd_default(UnattendedNoticeContext, {
      value,
      children,
    });
    $[0] = children;
    $[1] = value;
    $[2] = provider;
  } else provider = $[2];
  return provider;
}
//@ chunk-18hwfzwa.js:1624812-1624816 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1624812", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1626009-1626052 placement
function isExiting(chrome) {
  return chrome.exit.kind !== "none";
}
//@ chunk-18hwfzwa.js:1626052-1626185 placement
/**
 * 嵌入模式相关属性键与空状态。
 */
var EMBEDDED_PROP_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var keys;
var NO_EXIT_STATE;
deferInit("chunk-18hwfzwa.js:1626052", () => {
  EMBEDDED_PROP_KEYS = {
    debug: true,
    embedded: true,
    onDetachToCaller: true,
    hasSuppressedDialogs: true,
    hideLoginNotice: true,
  };
  keys = Object.keys(EMBEDDED_PROP_KEYS);
  NO_EXIT_STATE = {
    kind: "none",
  };
});
//@ chunk-18hwfzwa.js:1626185-1628696 placement
/**
 * 输入框外围（chrome）控制器：退出流程（interstitial/shutting-down）、IDE 选区、bash 对话框、rewind 在云会话不可用提示等。
 */
class ComposerChrome {
  #e = createSignal();
  #t;
  #o;
  #n;
  #s;
  exitReaders;
  #r;
  #c = null;
  #i = null;
  #a = undefined;
  constructor({ isRemoteSession, addNotification, store, storageV5, exitReaders, ...initialView }) {
    this.#t = isRemoteSession;
    this.#o = addNotification;
    this.#n = store;
    this.#s = storageV5;
    this.exitReaders = exitReaders;
    this.#r = {
      ...initialView,
      ideSelection: undefined,
      bashesDialog: false,
      exit: NO_EXIT_STATE,
    };
  }
  subscribe = (listener) => this.#e.subscribe(listener);
  getSnapshot = () => this.#r;
  #l(view) {
    this.#r = view;
    this.#e.emit();
  }
  setView(next) {
    let current = this.#r;
    if (keys.every((key) => Object.is(next[key], current[key]))) return;
    this.#l({
      ...current,
      ...next,
    });
  }
  setIdeSelection = (selection) => {
    this.#i = null;
    this.#a = undefined;
    if (Object.is(selection, this.#r.ideSelection)) return;
    this.#l({
      ...this.#r,
      ideSelection: selection,
    });
  };
  offerIdeSelection = (selection) => {
    if (this.#r.ideSelection?.source === "diff" && !selection.text) return;
    if (ideSelectionKey(selection) === this.#i) return;
    this.setIdeSelection(selection);
  };
  dismissIdeSelection = () => {
    let ideSelection = this.#r.ideSelection;
    if (!ideSelection) return;
    this.setIdeSelection(undefined);
    this.#i = ideSelectionKey(ideSelection);
  };
  consumeIdeSelection = (promptUuid) => {
    let ideSelection = this.#r.ideSelection;
    this.setIdeSelection(undefined);
    if (ideSelection && promptUuid)
      this.#a = {
        selection: ideSelection,
        promptUuid,
      };
  };
  restoreIdeSelectionConsumedBy = (promptUuid, replacement) => {
    if (replacement !== undefined) this.returnIdeSelection(replacement);
    else if (this.#a?.promptUuid === promptUuid) this.returnIdeSelection(this.#a.selection);
  };
  recordIdeSelectionConsumedBy = (promptUuid, selection) => {
    this.#a = {
      selection,
      promptUuid,
    };
  };
  returnIdeSelection = (selection) => {
    let ideSelection = this.#r.ideSelection;
    if (selection !== undefined && !ideSelection?.text && ideSelection?.source !== "diff")
      this.setIdeSelection(selection);
  };
  openBashesDialog = (open) => {
    this.#d(open ?? true);
  };
  closeBashesDialog = () => {
    this.#d(false);
  };
  #d(open) {
    if (open === this.#r.bashesDialog) return;
    this.#l({
      ...this.#r,
      bashesDialog: open,
    });
  }
  openMessageSelector = () => {
    if (this.#t && !alwaysFalseRemoteMode()) {
      this.#o({
        key: "remote-rewind-unavailable",
        kind: "feedback",
        text: "Rewind is not yet available in cloud sessions",
        row1Hint: NOT_IN_CLOUD_SESSIONS,
        priority: "medium",
      });
      return;
    }
    this.#m().openMessageSelector();
  };
  requestExit = () => {
    let { onDetachToCaller } = this.#r;
    if (onDetachToCaller) {
      onDetachToCaller();
      return;
    }
    if (isBgSession()) {
      sendDetachRequest({
        message: noopBackgroundConfirm({
          kind: "quit",
        }),
      });
      return;
    }
    let inWorktree = getCurrentWorktreeSession() !== null;
    let { tasks, mcp } = this.#n.getState();
    let backgroundItems = backgroundTaskKindLabel(tasks, {
      mcpClients: mcp.clients,
    });
    if (inWorktree || backgroundItems.length > 0) {
      this.#l({
        ...this.#r,
        exit: {
          kind: "interstitial",
          showWorktree: inWorktree,
          backgroundItems,
          messages: this.exitReaders.getMessages(),
          isMidTurn: this.exitReaders.isMidTurn(),
        },
      });
      return;
    }
    this.#l({
      ...this.#r,
      exit: {
        kind: "shutting-down",
      },
    });
    ExitFlow(
      this.exitReaders.getMessages(),
      {
        responseStreaming: this.exitReaders.isResponseStreaming(),
      },
      this.#s,
    )
      .catch((error) => {
        logError(error);
        return gracefulShutdown(0, "prompt_input_exit");
      })
      .catch(logError);
  };
  cancelExit = () => {
    if (this.#r.exit.kind === "none") return;
    this.#l({
      ...this.#r,
      exit: NO_EXIT_STATE,
    });
  };
  bindHost(host) {
    this.#c = host;
  }
  #m() {
    if (this.#c === null) throw Error("ComposerChrome: used before its screen bound a host");
    return this.#c;
  }
}
//@ chunk-18hwfzwa.js:1628696-1628831 placement
/**
 * IDE 选区的去重键。
 */
function ideSelectionKey(selection) {
  let head = `${selection.source ?? "ide"}|${selection.filePath ?? ""}`;
  return selection.text
    ? `${head}|${selection.lineStart ?? ""}|${selection.lineCount}|${selection.text.length}`
    : head;
}
//@ chunk-18hwfzwa.js:1628869-1628953 placement
function scanQueueBeforeTurn(isBusy, queued) {
  let activeMessageQueue = getActiveMessageQueue();
  return activeMessageQueue !== undefined && (queued !== undefined || isBusy())
    ? awaitScanThenTurn(activeMessageQueue, isBusy, queued)
    : undefined;
}
//@ chunk-18hwfzwa.js:1644111-1644605 placement
/**
 * 标记非正常退出、注册退出前刷新；进程退出时打印费用并保存状态。
 */
function useExitCostReport(enabled) {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { storageV5 } = useTheme_2();
  useEffect(() => {
    if (getIsRemoteMode()) return;
    let currentProjectConfig = getCurrentProjectConfig();
    let versionBase = getVersionBase();
    if (
      currentProjectConfig.lastGracefulShutdown !== false ||
      currentProjectConfig.lastVersionBase !== versionBase
    )
      saveCurrentProjectConfig(
        (config) => ({
          ...config,
          lastGracefulShutdown: false,
          lastVersionBase: versionBase,
        }),
        storageV5,
      );
    let costsFlushed = false;
    let unregisterExitFlush =
      isStorageV5Enabled() && storageV5 !== undefined
        ? registerPreExitFlush(async () => {
            await saveCostsAsync(enabled?.(), storageV5);
            costsFlushed = true;
          })
        : undefined;
    claimCostLedgerForCurrentSession();
    registerTranscriptExitReStamp(resetCostState_2);
    let onProcessExit = () => {
      if (hasConsoleBillingAccess()) {
        let costPrefix = isScreenReaderEnabled ? "Cost: " : "";
        process.stdout.write(
          `
` +
            costPrefix +
            formatTotalCost() +
            `
`,
        );
      }
      if (!costsFlushed) saveCostsOnExit(enabled?.());
    };
    process.on("exit", onProcessExit);
    return () => {
      unregisterExitFlush?.();
      if (isShuttingDown()) flushAndSaveCosts(enabled?.(), storageV5);
      process.off("exit", onProcessExit);
    };
  }, [isScreenReaderEnabled, storageV5]);
}
//@ chunk-18hwfzwa.js:1644605-1644609 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1644605", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1644609-1645075 placement (2.1.88 match: getViewedTeammateTask, 0.79)
function getViewedTeammateTask_2() {
  let setAppState = useSetAppState();
  let viewingTaskId = useAppState((state) => state.viewingAgentTaskId);
  let viewedTask = useAppState((state) =>
    state.viewingAgentTaskId ? state.tasks[state.viewingAgentTaskId] : undefined,
  );
  let inProcessTask = viewedTask && isInProcessTeammateTask(viewedTask) ? viewedTask : undefined;
  let hasTask = viewedTask !== undefined;
  let parentAgentIdRef = useRef(undefined);
  if (isLocalAgent(viewedTask)) parentAgentIdRef.current = viewedTask.parentAgentId;
  else if (viewedTask !== undefined) parentAgentIdRef.current = undefined;
  let isParentTaskPresent = useAppState((state) =>
    parentAgentIdRef.current ? state.tasks[parentAgentIdRef.current] !== undefined : false,
  );
  useEffect(() => {
    if (!viewingTaskId) return;
    if (!hasTask) {
      let parentAgentId = parentAgentIdRef.current;
      parentAgentIdRef.current = undefined;
      if (parentAgentId && isParentTaskPresent) enterTeammateView(parentAgentId, setAppState);
      else exitTeammateView(setAppState);
      return;
    }
    if (!inProcessTask) return;
    if (isTaskFailedOrStopped(inProcessTask)) {
      exitTeammateView(setAppState);
      return;
    }
  }, [viewingTaskId, hasTask, isParentTaskPresent, inProcessTask, setAppState]);
}
//@ chunk-18hwfzwa.js:1645075-1645079 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1645075", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1645079-1645091 placement
var AGENTS_HINT_TIMEOUT_MS = 1e4;
//@ chunk-18hwfzwa.js:1645091-1645224 placement
/**
 * 一段时间后标记 agents 提示过期。
 */
function useAgentsHintExpiry() {
  let expired = useSyncExternalStore(onAttacherCapsChange, hasAttacherCaps);
  let timeout = useTimeout(AGENTS_HINT_TIMEOUT_MS, expired);
  let setAppState = useSetAppState();
  useEffect(() => {
    setAppState((state) =>
      (state.agentsHintExpired ?? false) === timeout
        ? state
        : {
            ...state,
            agentsHintExpired: timeout,
          },
    );
  }, [timeout, setAppState]);
}
//@ chunk-18hwfzwa.js:1645224-1645257 placement
function hasAttacherCaps() {
  return getAttacherCaps() != null;
}
//@ chunk-18hwfzwa.js:1645257-1645261 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1645257", () => {
  init_react_production();
});
export {
  ComposerChrome,
  isExiting,
  useExitCostReport,
  isTerminalInterested,
  getViewedTeammateTask_2,
  useAgentsHintExpiry,
  UnattendedNoticeProvider,
  resolveModalPlacement,
  scanQueueBeforeTurn,
};
