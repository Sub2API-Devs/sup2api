/**
 * hooks/notifs/useFastModeNotification.tsx
 *
 * Fast 模式通知：冷却开始/结束、组织变更、超额被拒、过载、可用提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useFastModeNotification.tsx
 * pieces: chunk-18hwfzwa.js (9)
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
  Nto,
  $to,
} from "../../utils/fastMode.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { formatDuration } from "../../utils/format.js";

//@ chunk-18hwfzwa.js:1759555-1759822 callgraph-fingerprint = ORG_CHANGED_KEY (0.268)
var FAST_MODE_COOLDOWN_STARTED = "fast-mode-cooldown-started",
  FAST_MODE_COOLDOWN_EXPIRED = "fast-mode-cooldown-expired",
  FAST_MODE_ORG_CHANGED = "fast-mode-org-changed",
  FAST_MODE_OVERAGE_REJECTED = "fast-mode-overage-rejected",
  FAST_MODE_FALLBACK_MODEL_REJECTED = "fast-mode-fallback-model-rejected",
  uTt = {
    id: "fast-mode-org-changed",
    deps: (h) => [h.addNotification, h.fastMode, h.store],
    setup: () => onOrgFastModeChangeNotice,
  };
/**
 * 监听组织 fast mode 开关变化：变为可用时提示，变为不可用且当前开启时关闭 fast mode 并提示原因。
 */
//@ chunk-18hwfzwa.js:1759822-1760212 file-local
function onOrgFastModeChangeNotice({ addNotification: addNotification, fastMode: fastMode, store: store }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onOrgFastModeChange((L) => {
    if (L)
      addNotification({
        key: FAST_MODE_ORG_CHANGED,
        kind: "event",
        color: "fastMode",
        priority: "immediate",
        text: "Fast mode is now available \xB7 /fast to turn on",
      });
    else if (fastMode && isOrgFastModeDisabledByServer()) {
      let ee = getFastModeUnavailableMessage();
      if (ee === null) return;
      (store.setState((ke) => ({ ...ke, fastMode: !1 })),
        addNotification({
          key: FAST_MODE_ORG_CHANGED,
          kind: "event",
          color: "warning",
          priority: "immediate",
          text: ee,
        }));
    }
  });
}
//@ chunk-18hwfzwa.js:1760212-1760306 fingerprint = OVERAGE_REJECTED_KEY (0.581)
var OVERAGE_REJECTED_KEY = {
  id: "fast-mode-overage-rejected",
  deps: (h) => [h.addNotification, h.store],
  setup: () => onFastModeOverageRejectedNotice,
};
//@ chunk-18hwfzwa.js:1760306-1760507 file-local
function onFastModeOverageRejectedNotice({ addNotification: addNotification, store: store }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onFastModeOverageRejection((D) => {
    (store.setState((L) => ({ ...L, fastMode: !1 })),
      addNotification({
        key: FAST_MODE_OVERAGE_REJECTED,
        kind: "feedback",
        color: "error",
        priority: "immediate",
        text: D,
      }));
  });
}
//@ chunk-18hwfzwa.js:1760507-1760600 layout
var pTt = {
  id: "fast-mode-fallback-model-rejected",
  deps: (h) => [h.addNotification],
  setup: () => onFallbackFastRejectedNotice,
};
//@ chunk-18hwfzwa.js:1760600-1760821 file-last-pair
function onFallbackFastRejectedNotice({ addNotification: addNotification }) {
  if (getIsRemoteMode()) return;
  if (!isFastModeEnabled()) return;
  return onFallbackModelFastRejected((x) => {
    addNotification({
      key: FAST_MODE_FALLBACK_MODEL_REJECTED,
      kind: "warning",
      color: "warning",
      priority: "immediate",
      text: `Using standard speed on ${renderModelName(x)} \xB7 fast mode wasn't available`,
    });
  });
}
//@ chunk-18hwfzwa.js:1760821-1760910 layout
var fTt = {
  id: "fast-mode-cooldown",
  deps: (h) => [h.addNotification, h.fastMode],
  setup: () => useFastModeNotification,
};
//@ chunk-18hwfzwa.js:1760910-1761307 fingerprint = useFastModeNotification (0.722)
function useFastModeNotification({ addNotification: addNotification, fastMode: fastMode }) {
  if (getIsRemoteMode()) return;
  if (!fastMode) return;
  let D = Nto((resetAt, reason) => {
      let resetIn = formatDuration(resetAt - Date.now(), { hideTrailingZeros: !0 }),
        message_0 = getCooldownMessage(reason, resetIn);
      addNotification({
        key: FAST_MODE_COOLDOWN_STARTED,
        invalidates: [FAST_MODE_COOLDOWN_EXPIRED],
        text: message_0,
        color: "warning",
        priority: "immediate",
      });
    }),
    unsubExpired = $to(() => {
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
    (D(), unsubExpired());
  };
}
//@ chunk-18hwfzwa.js:1761307-1761522 fingerprint = getCooldownMessage (1)
function getCooldownMessage(reason, resetIn) {
  switch (reason) {
    case "overloaded":
      return `Fast mode overloaded and is temporarily unavailable \xB7 resets in ${resetIn}`;
    case "rate_limit":
      return `Fast limit reached and temporarily disabled \xB7 resets in ${resetIn}`;
  }
}

export { uTt, OVERAGE_REJECTED_KEY, fTt, pTt };
