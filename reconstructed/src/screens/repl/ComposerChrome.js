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
import { PERMISSION_CARD_KINDS } from "../../components/dialogs/dialogKinds.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  unattendedNoticeRows,
  UnattendedNoticeContext,
} from "../../components/permissions/UnattendedAutoBlockNotice.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { init_react_production, P, R, yt, Se } from "../../../vendor/react/cjs/react.production.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { statsContext } from "../../context/stats.js";

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
  let Re = onScreenBlockingKind !== null && PERMISSION_CARD_KINDS.includes(onScreenBlockingKind);
  let Be = Re && modalSlotActive;
  let He = !Be && (panelHidesPrompt || pinnedConsentShowing || Re || dialogOverPanel);
  return {
    inPane: Be,
    abovePrompt: He,
    drawn: Be || (He && !(fullscreen && modalSlotActive)),
  };
}
//@ chunk-18hwfzwa.js:1624603-1624812 placement
/**
 * 提供无人值守提示占用的行数。
 */
function UnattendedNoticeProvider(props) {
  let $ = w(3);
  let { drawn, hideSessionTitle, children } = props;
  let ee = unattendedNoticeRows(hideSessionTitle);
  const value = drawn ? ee : 0;
  let Be;
  if ($[0] !== children || $[1] !== value) {
    Be = jsxProd_default(UnattendedNoticeContext, {
      value,
      children,
    });
    $[0] = children;
    $[1] = value;
    $[2] = Be;
  } else Be = $[2];
  return Be;
}
//@ chunk-18hwfzwa.js:1624812-1624816 placement
init_react_production();
//@ chunk-18hwfzwa.js:1626009-1626052 placement
function isExiting(h) {
  return h.exit.kind !== "none";
}
//@ chunk-18hwfzwa.js:1626052-1626185 placement
/**
 * 嵌入模式相关属性键与空状态。
 */
var EMBEDDED_PROP_KEYS = {
  debug: true,
  embedded: true,
  onDetachToCaller: true,
  hasSuppressedDialogs: true,
  hideLoginNotice: true,
};
var keys = Object.keys(EMBEDDED_PROP_KEYS);
var NO_EXIT_STATE = {
  kind: "none",
};
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
  constructor({ isRemoteSession, addNotification, store, storageV5, exitReaders, ...ke }) {
    this.#t = isRemoteSession;
    this.#o = addNotification;
    this.#n = store;
    this.#s = storageV5;
    this.exitReaders = exitReaders;
    this.#r = {
      ...ke,
      ideSelection: undefined,
      bashesDialog: false,
      exit: NO_EXIT_STATE,
    };
  }
  subscribe = (h) => this.#e.subscribe(h);
  getSnapshot = () => this.#r;
  #l(h) {
    this.#r = h;
    this.#e.emit();
  }
  setView(h) {
    let x = this.#r;
    if (keys.every((D) => Object.is(h[D], x[D]))) return;
    this.#l({
      ...x,
      ...h,
    });
  }
  setIdeSelection = (h) => {
    this.#i = null;
    this.#a = undefined;
    if (Object.is(h, this.#r.ideSelection)) return;
    this.#l({
      ...this.#r,
      ideSelection: h,
    });
  };
  offerIdeSelection = (h) => {
    if (this.#r.ideSelection?.source === "diff" && !h.text) return;
    if (ideSelectionKey(h) === this.#i) return;
    this.setIdeSelection(h);
  };
  dismissIdeSelection = () => {
    let ideSelection = this.#r.ideSelection;
    if (!ideSelection) return;
    this.setIdeSelection(undefined);
    this.#i = ideSelectionKey(ideSelection);
  };
  consumeIdeSelection = (h) => {
    let ideSelection = this.#r.ideSelection;
    this.setIdeSelection(undefined);
    if (ideSelection && h)
      this.#a = {
        selection: ideSelection,
        promptUuid: h,
      };
  };
  restoreIdeSelectionConsumedBy = (h, x) => {
    if (x !== undefined) this.returnIdeSelection(x);
    else if (this.#a?.promptUuid === h) this.returnIdeSelection(this.#a.selection);
  };
  recordIdeSelectionConsumedBy = (promptUuid, selection) => {
    this.#a = {
      selection,
      promptUuid,
    };
  };
  returnIdeSelection = (h) => {
    let ideSelection = this.#r.ideSelection;
    if (h !== undefined && !ideSelection?.text && ideSelection?.source !== "diff") this.setIdeSelection(h);
  };
  openBashesDialog = (h) => {
    this.#d(h ?? true);
  };
  closeBashesDialog = () => {
    this.#d(false);
  };
  #d(h) {
    if (h === this.#r.bashesDialog) return;
    this.#l({
      ...this.#r,
      bashesDialog: h,
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
    let x = getCurrentWorktreeSession() !== null;
    let { tasks, mcp } = this.#n.getState();
    let ee = backgroundTaskKindLabel(tasks, {
      mcpClients: mcp.clients,
    });
    if (x || ee.length > 0) {
      this.#l({
        ...this.#r,
        exit: {
          kind: "interstitial",
          showWorktree: x,
          backgroundItems: ee,
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
  bindHost(h) {
    this.#c = h;
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
function ideSelectionKey(h) {
  let x = `${h.source ?? "ide"}|${h.filePath ?? ""}`;
  return h.text ? `${x}|${h.lineStart ?? ""}|${h.lineCount}|${h.text.length}` : x;
}
//@ chunk-18hwfzwa.js:1628869-1628953 placement
function scanQueueBeforeTurn(h, x) {
  let activeMessageQueue = getActiveMessageQueue();
  return activeMessageQueue !== undefined && (x !== undefined || h())
    ? awaitScanThenTurn(activeMessageQueue, h, x)
    : undefined;
}
//@ chunk-18hwfzwa.js:1644111-1644605 placement
/**
 * 标记非正常退出、注册退出前刷新；进程退出时打印费用并保存状态。
 */
function useExitCostReport(h) {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { storageV5 } = useTheme_2();
  P(() => {
    if (getIsRemoteMode()) return;
    let currentProjectConfig = getCurrentProjectConfig();
    let versionBase = getVersionBase();
    if (
      currentProjectConfig.lastGracefulShutdown !== false ||
      currentProjectConfig.lastVersionBase !== versionBase
    )
      saveCurrentProjectConfig(
        (He) => ({
          ...He,
          lastGracefulShutdown: false,
          lastVersionBase: versionBase,
        }),
        storageV5,
      );
    let ke = false;
    let Re =
      isStorageV5Enabled() && storageV5 !== undefined
        ? registerPreExitFlush(async () => {
            await saveCostsAsync(h?.(), storageV5);
            ke = true;
          })
        : undefined;
    claimCostLedgerForCurrentSession();
    registerTranscriptExitReStamp(resetCostState_2);
    let Be = () => {
      if (hasConsoleBillingAccess()) {
        let He = isScreenReaderEnabled ? "Cost: " : "";
        process.stdout.write(
          `
` +
            He +
            formatTotalCost() +
            `
`,
        );
      }
      if (!ke) saveCostsOnExit(h?.());
    };
    process.on("exit", Be);
    return () => {
      Re?.();
      if (isShuttingDown()) flushAndSaveCosts(h?.(), storageV5);
      process.off("exit", Be);
    };
  }, [isScreenReaderEnabled, storageV5]);
}
//@ chunk-18hwfzwa.js:1644605-1644609 placement
init_react_production();
//@ chunk-18hwfzwa.js:1644609-1645075 placement = getViewedTeammateTask (0.79)
function getViewedTeammateTask_2() {
  let setAppState = useSetAppState();
  let x = useAppState((Be) => Be.viewingAgentTaskId);
  let D = useAppState((Be) => (Be.viewingAgentTaskId ? Be.tasks[Be.viewingAgentTaskId] : undefined));
  let L = D && isInProcessTeammateTask(D) ? D : undefined;
  let ee = D !== undefined;
  let parentAgentIdRef = R(undefined);
  if (isLocalAgent(D)) parentAgentIdRef.current = D.parentAgentId;
  else if (D !== undefined) parentAgentIdRef.current = undefined;
  let Re = useAppState((Be) =>
    parentAgentIdRef.current ? Be.tasks[parentAgentIdRef.current] !== undefined : false,
  );
  P(() => {
    if (!x) return;
    if (!ee) {
      let Be = parentAgentIdRef.current;
      parentAgentIdRef.current = undefined;
      if (Be && Re) enterTeammateView(Be, setAppState);
      else exitTeammateView(setAppState);
      return;
    }
    if (!L) return;
    if (isTaskFailedOrStopped(L)) {
      exitTeammateView(setAppState);
      return;
    }
  }, [x, ee, Re, L, setAppState]);
}
//@ chunk-18hwfzwa.js:1645075-1645079 placement
init_react_production();
//@ chunk-18hwfzwa.js:1645079-1645091 placement
var AGENTS_HINT_TIMEOUT_MS = 1e4;
//@ chunk-18hwfzwa.js:1645091-1645224 placement
/**
 * 一段时间后标记 agents 提示过期。
 */
function useAgentsHintExpiry() {
  let h = yt(onAttacherCapsChange, hasAttacherCaps);
  let timeout = useTimeout(AGENTS_HINT_TIMEOUT_MS, h);
  let setAppState = useSetAppState();
  P(() => {
    setAppState((L) =>
      (L.agentsHintExpired ?? false) === timeout
        ? L
        : {
            ...L,
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
init_react_production();
//@ chunk-xe7zq1p4.js:1971-2000 placement
/**
 * 导出函数 `isTerminalInterested`：返回 Se(ie)。
 */
function isTerminalInterested() {
  return Se(statsContext);
}
//@ chunk-xe7zq1p4.js:2000-2004 placement
init_react_production();
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
