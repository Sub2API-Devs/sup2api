/**
 * state/uiSignals.ts
 *
 * UI 信号（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yetvfygf.js (3)
 * attribution: placement 3
 */
import { createSignal } from "../utils/signal.js";
import { createStore } from "./store.js";
import { identity } from "../utils/identity.js";

//@ chunk-yetvfygf.js:299-431 placement
var INITIAL_FEEDBACK_NOTICE = {
  notice: null,
  shownLoggedForDraftId: null,
  promptedCount: 0,
  sessionDraftCount: 0,
  seededFromDisk: false,
  seedStarted: false,
  toolCallCount: 0,
};
//@ chunk-yetvfygf.js:431-1045 placement
/**
 * UI 信号集合：自动拒绝、主循环忙、阻塞工具进度、对话框宿主状态、终端焦点、反馈提示、各种已看过标记等。
 */
class UiSignals {
  autoDenyPresence = createSignal();
  mainLoopBusy = createStore({
    busy: false,
  });
  blockingToolProgress = createStore({
    active: false,
  });
  dialogHostUnmounted = createStore({
    unmounted: false,
  });
  onScreenBlockingDialog = createStore({
    surfaceMounted: false,
    kind: null,
  });
  headerGauge = createStore({
    mounts: 0,
  });
  pendingSurveyFeedbackSource = null;
  terminalFocus = "unknown";
  terminalFocusGainedAt = Number.NEGATIVE_INFINITY;
  terminalFocusChanged = createSignal();
  feedbackNotice = createStore(INITIAL_FEEDBACK_NOTICE);
  promptDigitCaptures = createStore({
    count: 0,
  });
  clawdEntranceTaken = false;
  startupUpdateSummary = undefined;
  experimentEnrollmentsUnseen = undefined;
  orgMemoryWritesRowSeen = false;
  orgMemoryReadRowSeen = false;
  remoteHomeSettingsRowSeen = false;
  configRowsSeen = new Set();
  configRowNotices = new Map();
}
//@ chunk-yetvfygf.js:1045-1225 placement
/**
 * UI 信号的单例（重置时清空已看过记录与忙碌状态）。
 */
var uiSignals = identity(new UiSignals(), (o) => {
  o.configRowsSeen.clear();
  o.configRowNotices.clear();
  o.mainLoopBusy.setState((e) =>
    e.busy
      ? {
          busy: false,
        }
      : e,
  );
  o.headerGauge.setState((e) =>
    e.mounts === 0
      ? e
      : {
          mounts: 0,
        },
  );
});
export { uiSignals };
