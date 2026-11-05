/**
 * hooks/notifs/useFastModeNotification.tsx
 *
 * Fast 模式通知：冷却开始/结束、组织变更、超额被拒、过载、可用提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useFastModeNotification.tsx
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: callgraph-fingerprint 1, file-local 2, fingerprint 3, layout 2, file-last-pair 1
 */
import { getIsRemoteMode } from "../../bootstrap/state.js";
import {
  isFastModeEnabled,
  onOrgFastModeChange,
  isOrgFastModeDisabledByServer,
  getFastModeUnavailableMessage,
  onFastModeOverageRejection,
  onFallbackModelFastRejected,
  onFastModeCooldownTriggered,
  onFastModeCooldownExpired,
} from "../../utils/fastMode.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { formatDuration } from "../../utils/format.js";

//@ chunk-czq1j3j2.js:1806816-1807083 callgraph-fingerprint (2.1.88 match: ORG_CHANGED_KEY, 0.268)
var FAST_MODE_COOLDOWN_STARTED = "fast-mode-cooldown-started";
var FAST_MODE_COOLDOWN_EXPIRED = "fast-mode-cooldown-expired";
var FAST_MODE_ORG_CHANGED = "fast-mode-org-changed";
var FAST_MODE_OVERAGE_REJECTED = "fast-mode-overage-rejected";
var FAST_MODE_FALLBACK_MODEL_REJECTED = "fast-mode-fallback-model-rejected";
var fastModeOrgChangedNoticeSpec = {
  id: "fast-mode-org-changed",
  deps: (noticeState) => [noticeState.addNotification, noticeState.fastMode, noticeState.store],
  setup: () => onOrgFastModeChangeNotice,
};
//@ chunk-czq1j3j2.js:1807083-1807473 file-local
/**
 * 监听组织 fast mode 开关变化：变为可用时提示，变为不可用且当前开启时关闭 fast mode 并提示原因。
 */
function onOrgFastModeChangeNotice({ addNotification, fastMode, store }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onOrgFastModeChange((orgEnabled) => {
    if (orgEnabled)
      addNotification({
        key: FAST_MODE_ORG_CHANGED,
        kind: "event",
        color: "fastMode",
        priority: "immediate",
        text: "Fast mode is now available \xB7 /fast to turn on",
      });
    else if (fastMode && isOrgFastModeDisabledByServer()) {
      let fastModeUnavailableMessage = getFastModeUnavailableMessage();
      if (fastModeUnavailableMessage === null) return;
      store.setState((state) => ({
        ...state,
        fastMode: false,
      }));
      addNotification({
        key: FAST_MODE_ORG_CHANGED,
        kind: "event",
        color: "warning",
        priority: "immediate",
        text: fastModeUnavailableMessage,
      });
    }
  });
}
//@ chunk-czq1j3j2.js:1807473-1807567 fingerprint (2.1.88 match: OVERAGE_REJECTED_KEY, 0.581)
var OVERAGE_REJECTED_KEY = {
  id: "fast-mode-overage-rejected",
  deps: (noticeState) => [noticeState.addNotification, noticeState.store],
  setup: () => onFastModeOverageRejectedNotice,
};
//@ chunk-czq1j3j2.js:1807567-1807768 file-local
function onFastModeOverageRejectedNotice({ addNotification, store }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onFastModeOverageRejection((message) => {
    store.setState((state) => ({
      ...state,
      fastMode: false,
    }));
    addNotification({
      key: FAST_MODE_OVERAGE_REJECTED,
      kind: "feedback",
      color: "error",
      priority: "immediate",
      text: message,
    });
  });
}
//@ chunk-czq1j3j2.js:1807768-1807861 layout
var fastModeFallbackRejectedNoticeSpec = {
  id: "fast-mode-fallback-model-rejected",
  deps: (noticeState) => [noticeState.addNotification],
  setup: () => onFallbackFastRejectedNotice,
};
//@ chunk-czq1j3j2.js:1807861-1808082 file-last-pair
function onFallbackFastRejectedNotice({ addNotification }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onFallbackModelFastRejected((model) => {
    addNotification({
      key: FAST_MODE_FALLBACK_MODEL_REJECTED,
      kind: "warning",
      color: "warning",
      priority: "immediate",
      text: `Using standard speed on ${renderModelName(model)} \xB7 fast mode wasn't available`,
    });
  });
}
//@ chunk-czq1j3j2.js:1808082-1808171 layout
var fastModeCooldownNoticeSpec = {
  id: "fast-mode-cooldown",
  deps: (noticeState) => [noticeState.addNotification, noticeState.fastMode],
  setup: () => useFastModeNotification,
};
//@ chunk-czq1j3j2.js:1808171-1808568 fingerprint (2.1.88 match: useFastModeNotification, 0.722)
function useFastModeNotification({ addNotification, fastMode }) {
  if (getIsRemoteMode()) return;
  if (!fastMode) return;
  let unsubTriggered = onFastModeCooldownTriggered((resetAt, reason) => {
    let resetIn = formatDuration(resetAt - Date.now(), {
      hideTrailingZeros: true,
    });
    let message = getCooldownMessage(reason, resetIn);
    addNotification({
      key: FAST_MODE_COOLDOWN_STARTED,
      invalidates: [FAST_MODE_COOLDOWN_EXPIRED],
      text: message,
      color: "warning",
      priority: "immediate",
    });
  });
  let unsubExpired = onFastModeCooldownExpired(() => {
    addNotification({
      key: FAST_MODE_COOLDOWN_EXPIRED,
      kind: "event",
      invalidates: [FAST_MODE_COOLDOWN_STARTED],
      color: "fastMode",
      text: "Fast limit reset \xB7 now using fast mode",
      priority: "immediate",
    });
  });
  return () => {
    unsubTriggered();
    unsubExpired();
  };
}
//@ chunk-czq1j3j2.js:1808568-1808783 fingerprint (2.1.88 match: getCooldownMessage, 1)
function getCooldownMessage(reason, resetIn) {
  switch (reason) {
    case "overloaded":
      return `Fast mode overloaded and is temporarily unavailable \xB7 resets in ${resetIn}`;
    case "rate_limit":
      return `Fast limit reached and temporarily disabled \xB7 resets in ${resetIn}`;
  }
}
export {
  fastModeOrgChangedNoticeSpec,
  OVERAGE_REJECTED_KEY,
  fastModeCooldownNoticeSpec,
  fastModeFallbackRejectedNoticeSpec,
};
