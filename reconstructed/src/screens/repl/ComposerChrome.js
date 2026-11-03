/**
 * screens/repl/ComposerChrome.ts
 *
 * 2.1.316 新增。REPL 控制器：输入区外框状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 16
 */
import { PERMISSION_CARD_KINDS } from "../../components/dialogs/dialogKinds.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  unattendedNoticeRows,
  UnattendedNoticeContext,
} from "../../components/permissions/UnattendedAutoBlockNotice.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { j, P, R, yt } from "../../../vendor/react/cjs/react.production.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { Text, Box } from "../../ink/components/Text.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../../utils/log.js";
import { errorMessage } from "../../utils/errors.js";
import { uwr } from "../../remote/remoteMode.js";
import { NOT_IN_CLOUD_SESSIONS } from "../../components/PromptInput/PromptInputModeHints.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { sendDetachRequest, tce } from "./backgroundConfirm.js";
import { getCurrentWorktreeSession } from "../../utils/worktree.js";
import { backgroundTaskKindLabel } from "../../tasks/backgroundTaskLabels.js";
import { ExitFlow } from "../../components/ExitFlow.js";
import { gracefulShutdown, isShuttingDown } from "../../utils/gracefulShutdown.js";
import { getActiveMessageQueue } from "../../query/presenceCheck.js";
import { awaitScanThenTurn } from "./PromptSubmitController.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
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
import { Q9s, resetCostState as resetCostState_2, formatTotalCost, Z9s, Ozt } from "../../cost-tracker.js";
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

/**
 * 决定对话框画在窗格中还是输入框上方、是否绘制。
 */
//@ chunk-18hwfzwa.js:1624350-1624603 placement
function resolveModalPlacement({
  onScreenBlockingKind: onScreenBlockingKind,
  modalSlotActive: modalSlotActive,
  panelHidesPrompt: panelHidesPrompt,
  pinnedConsentShowing: pinnedConsentShowing,
  dialogOverPanel: dialogOverPanel,
  fullscreen: fullscreen,
}) {
  let Re = onScreenBlockingKind !== null && PERMISSION_CARD_KINDS.includes(onScreenBlockingKind),
    Be = Re && modalSlotActive,
    He = !Be && (panelHidesPrompt || pinnedConsentShowing || Re || dialogOverPanel);
  return { inPane: Be, abovePrompt: He, drawn: Be || (He && !(fullscreen && modalSlotActive)) };
}
/**
 * 提供无人值守提示占用的行数。
 */
//@ chunk-18hwfzwa.js:1624603-1624812 placement
function UnattendedNoticeProvider(h) {
  let $ = w(3),
    { drawn: drawn, hideSessionTitle: hideSessionTitle, children: children } = h,
    ee = unattendedNoticeRows(hideSessionTitle);
  const ke = drawn ? ee : 0;
  let Be;
  if ($[0] !== children || $[1] !== ke)
    ((Be = e(UnattendedNoticeContext, { value: ke, children: children })),
      ($[0] = children),
      ($[1] = ke),
      ($[2] = Be));
  else Be = $[2];
  return Be;
}
//@ chunk-18hwfzwa.js:1624812-1624816 placement
j();
//@ chunk-18hwfzwa.js:1626009-1626052 placement
function BV(h) {
  return h.exit.kind !== "none";
}
/**
 * 嵌入模式相关属性键与空状态。
 */
//@ chunk-18hwfzwa.js:1626052-1626185 placement
var EMBEDDED_PROP_KEYS = {
    debug: !0,
    embedded: !0,
    onDetachToCaller: !0,
    hasSuppressedDialogs: !0,
    hideLoginNotice: !0,
  },
  keys = Object.keys(EMBEDDED_PROP_KEYS),
  xvt = { kind: "none" };
/**
 * 输入框外围（chrome）控制器：退出流程（interstitial/shutting-down）、IDE 选区、bash 对话框、rewind 在云会话不可用提示等。
 */
//@ chunk-18hwfzwa.js:1626185-1628696 placement
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
  #a = void 0;
  constructor({ isRemoteSession: h, addNotification: x, store: D, storageV5: L, exitReaders: ee, ...ke }) {
    ((this.#t = h),
      (this.#o = x),
      (this.#n = D),
      (this.#s = L),
      (this.exitReaders = ee),
      (this.#r = { ...ke, ideSelection: void 0, bashesDialog: !1, exit: xvt }));
  }
  subscribe = (h) => this.#e.subscribe(h);
  getSnapshot = () => this.#r;
  #l(h) {
    ((this.#r = h), this.#e.emit());
  }
  setView(h) {
    let x = this.#r;
    if (keys.every((D) => Object.is(h[D], x[D]))) return;
    this.#l({ ...x, ...h });
  }
  setIdeSelection = (h) => {
    if (((this.#i = null), (this.#a = void 0), Object.is(h, this.#r.ideSelection))) return;
    this.#l({ ...this.#r, ideSelection: h });
  };
  offerIdeSelection = (h) => {
    if (this.#r.ideSelection?.source === "diff" && !h.text) return;
    if (ideSelectionKey(h) === this.#i) return;
    this.setIdeSelection(h);
  };
  dismissIdeSelection = () => {
    let ideSelection = this.#r.ideSelection;
    if (!ideSelection) return;
    (this.setIdeSelection(void 0), (this.#i = ideSelectionKey(ideSelection)));
  };
  consumeIdeSelection = (h) => {
    let ideSelection = this.#r.ideSelection;
    if ((this.setIdeSelection(void 0), ideSelection && h))
      this.#a = { selection: ideSelection, promptUuid: h };
  };
  restoreIdeSelectionConsumedBy = (h, x) => {
    if (x !== void 0) this.returnIdeSelection(x);
    else if (this.#a?.promptUuid === h) this.returnIdeSelection(this.#a.selection);
  };
  recordIdeSelectionConsumedBy = (h, x) => {
    this.#a = { selection: x, promptUuid: h };
  };
  returnIdeSelection = (h) => {
    let ideSelection = this.#r.ideSelection;
    if (h !== void 0 && !ideSelection?.text && ideSelection?.source !== "diff") this.setIdeSelection(h);
  };
  openBashesDialog = (h) => {
    this.#d(h ?? !0);
  };
  closeBashesDialog = () => {
    this.#d(!1);
  };
  #d(h) {
    if (h === this.#r.bashesDialog) return;
    this.#l({ ...this.#r, bashesDialog: h });
  }
  openMessageSelector = () => {
    if (this.#t && !uwr()) {
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
    let { onDetachToCaller: onDetachToCaller } = this.#r;
    if (onDetachToCaller) {
      onDetachToCaller();
      return;
    }
    if (isBgSession()) {
      sendDetachRequest({ message: tce({ kind: "quit" }) });
      return;
    }
    let x = getCurrentWorktreeSession() !== null,
      { tasks: tasks, mcp: mcp } = this.#n.getState(),
      ee = backgroundTaskKindLabel(tasks, { mcpClients: mcp.clients });
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
    (this.#l({ ...this.#r, exit: { kind: "shutting-down" } }),
      ExitFlow(
        this.exitReaders.getMessages(),
        { responseStreaming: this.exitReaders.isResponseStreaming() },
        this.#s,
      )
        .catch((ke) => (logError(ke), gracefulShutdown(0, "prompt_input_exit")))
        .catch(logError));
  };
  cancelExit = () => {
    if (this.#r.exit.kind === "none") return;
    this.#l({ ...this.#r, exit: xvt });
  };
  bindHost(h) {
    this.#c = h;
  }
  #m() {
    if (this.#c === null) throw Error("ComposerChrome: used before its screen bound a host");
    return this.#c;
  }
}
/**
 * IDE 选区的去重键。
 */
//@ chunk-18hwfzwa.js:1628696-1628831 placement
function ideSelectionKey(h) {
  let x = `${h.source ?? "ide"}|${h.filePath ?? ""}`;
  return h.text ? `${x}|${h.lineStart ?? ""}|${h.lineCount}|${h.text.length}` : x;
}
//@ chunk-18hwfzwa.js:1628869-1628953 placement
function Avt(h, x) {
  let D = getActiveMessageQueue();
  return D !== void 0 && (x !== void 0 || h()) ? awaitScanThenTurn(D, h, x) : void 0;
}
/**
 * 标记非正常退出、注册退出前刷新；进程退出时打印费用并保存状态。
 */
//@ chunk-18hwfzwa.js:1644111-1644605 placement
function useExitCostReport(h) {
  let x = useIsScreenReaderEnabled(),
    { storageV5: storageV5 } = Me();
  P(() => {
    if (getIsRemoteMode()) return;
    let L = getCurrentProjectConfig(),
      ee = getVersionBase();
    if (L.lastGracefulShutdown !== !1 || L.lastVersionBase !== ee)
      saveCurrentProjectConfig((He) => ({ ...He, lastGracefulShutdown: !1, lastVersionBase: ee }), storageV5);
    let ke = !1,
      Re =
        isStorageV5Enabled() && storageV5 !== void 0
          ? registerPreExitFlush(async () => {
              (await Q9s(h?.(), storageV5), (ke = !0));
            })
          : void 0;
    (claimCostLedgerForCurrentSession(), registerTranscriptExitReStamp(resetCostState_2));
    let Be = () => {
      if (hasConsoleBillingAccess()) {
        let He = x ? "Cost: " : "";
        process.stdout.write(
          `
` +
            He +
            formatTotalCost() +
            `
`,
        );
      }
      if (!ke) Z9s(h?.());
    };
    return (
      process.on("exit", Be),
      () => {
        if ((Re?.(), isShuttingDown())) Ozt(h?.(), storageV5);
        process.off("exit", Be);
      }
    );
  }, [x, storageV5]);
}
//@ chunk-18hwfzwa.js:1644605-1644609 placement
j();
//@ chunk-18hwfzwa.js:1644609-1645075 placement = getViewedTeammateTask (0.79)
function getViewedTeammateTask_2() {
  let h = useSetAppState(),
    x = useAppState((Be) => Be.viewingAgentTaskId),
    D = useAppState((Be) => (Be.viewingAgentTaskId ? Be.tasks[Be.viewingAgentTaskId] : void 0)),
    L = D && isInProcessTeammateTask(D) ? D : void 0,
    ee = D !== void 0,
    ke = R(void 0);
  if (isLocalAgent(D)) ke.current = D.parentAgentId;
  else if (D !== void 0) ke.current = void 0;
  let Re = useAppState((Be) => (ke.current ? Be.tasks[ke.current] !== void 0 : !1));
  P(() => {
    if (!x) return;
    if (!ee) {
      let Be = ke.current;
      if (((ke.current = void 0), Be && Re)) enterTeammateView(Be, h);
      else exitTeammateView(h);
      return;
    }
    if (!L) return;
    if (isTaskFailedOrStopped(L)) {
      exitTeammateView(h);
      return;
    }
  }, [x, ee, Re, L, h]);
}
//@ chunk-18hwfzwa.js:1645075-1645079 placement
j();
//@ chunk-18hwfzwa.js:1645079-1645091 placement
var W$o = 1e4;
/**
 * 一段时间后标记 agents 提示过期。
 */
//@ chunk-18hwfzwa.js:1645091-1645224 placement
function useAgentsHintExpiry() {
  let h = yt(onAttacherCapsChange, j$o),
    x = useTimeout(W$o, h),
    D = useSetAppState();
  P(() => {
    D((L) => ((L.agentsHintExpired ?? !1) === x ? L : { ...L, agentsHintExpired: x }));
  }, [x, D]);
}
//@ chunk-18hwfzwa.js:1645224-1645257 placement
function j$o() {
  return getAttacherCaps() != null;
}
//@ chunk-18hwfzwa.js:1645257-1645261 placement
j();

export {
  ComposerChrome,
  BV,
  useExitCostReport,
  getViewedTeammateTask_2,
  useAgentsHintExpiry,
  UnattendedNoticeProvider,
  resolveModalPlacement,
  Avt,
};
