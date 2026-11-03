/**
 * components/PromptInput/RemoteControlPill.tsx
 *
 * 2.1.316 新增：输入框底部的 Remote Control 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (12)
 * attribution: placement 12
 */
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { init_react_production, P } from "../../../vendor/react/cjs/react.production.js";
import { sequential } from "../../utils/sequential.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:46516-46546 placement
var RC_ACTIVE_BADGE_KEY = "rc-active-badge";
var MAX_VERBOSE_RC_IMPRESSIONS = 5;
//@ chunk-ag5x7vhf.js:46546-46681 placement
function isVerboseRcActive() {
  let m = bridgeHostState();
  if (m.verboseRcActive === undefined)
    m.verboseRcActive =
      (getGlobalConfig().seenNotifications?.[RC_ACTIVE_BADGE_KEY] ?? 0) < MAX_VERBOSE_RC_IMPRESSIONS;
  return m.verboseRcActive;
}
//@ chunk-ag5x7vhf.js:46681-46735 placement
function rcPillLabel(label) {
  return label === "/rc active" && !isVerboseRcActive() ? "/rc" : label;
}
//@ chunk-ag5x7vhf.js:46735-46840 placement
function withFromCliParam(appState) {
  try {
    let h = new URL(appState);
    h.searchParams.set("from", "cli");
    return h.toString();
  } catch {
    return appState;
  }
}
//@ chunk-ag5x7vhf.js:46840-46910 placement
function logRcPillClicked(m, h) {
  logEvent("tengu_rc_pill_clicked", {
    trigger: fromEnum(m),
    label: fromEnum(h),
  });
}
//@ chunk-ag5x7vhf.js:46910-47101 placement
/**
 * 输入框底部的 Remote Control 状态胶囊（/rc active）：显示连接/错误状态，点击打开会话链接。
 */
function RemoteControlPill(state) {
  let { label } = getBridgeStatus({
    error: state.replBridgeError,
    connected: state.replBridgeConnected,
    sessionActive: state.replBridgeSessionActive,
    reconnecting: state.replBridgeReconnecting,
  });
  logRcPillClicked("keyboard", rcPillLabel(label));
}
//@ chunk-ag5x7vhf.js:47101-47313 placement
function recordRcActiveImpression(storageV5) {
  let h = bridgeHostState();
  if (h.rcActiveImpressionRecorded) return;
  if (!isVerboseRcActive()) return;
  h.rcActiveImpressionRecorded = true;
  saveGlobalConfig((x) => {
    let seenNotifications = x.seenNotifications ?? {};
    return {
      ...x,
      seenNotifications: {
        ...seenNotifications,
        [RC_ACTIVE_BADGE_KEY]: (seenNotifications[RC_ACTIVE_BADGE_KEY] ?? 0) + 1,
      },
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:47313-47317 placement
init_react_production();
//@ chunk-ag5x7vhf.js:47317-47364 placement = _temp4 (1)
function selectBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-ag5x7vhf.js:47788-47883 placement
function shortRcLabel(m) {
  return sequential.level === 0 && m.label !== "/rc active" ? m.label.replace(/^\/rc/, "rc") : "rc";
}
//@ chunk-ag5x7vhf.js:47883-48674 placement
function RemoteControlStatus(props) {
  let A = w(16);
  let { status, highlighted, compact } = props;
  let k = highlighted === undefined ? false : highlighted;
  let appState = useAppState(selectBridgeSessionUrl);
  let { storageV5 } = useTheme_2();
  let D = compact !== undefined;
  let L;
  let V;
  if (A[0] !== D || A[1] !== status.label || A[2] !== storageV5) {
    L = () => {
      if (!D && status.label === "/rc active") recordRcActiveImpression(storageV5);
    };
    V = [D, status.label, storageV5];
    A[0] = D;
    A[1] = status.label;
    A[2] = storageV5;
    A[3] = L;
    A[4] = V;
  } else {
    L = A[3];
    V = A[4];
  }
  P(L, V);
  let W;
  if (A[5] !== compact?.label || A[6] !== status.label) {
    W = compact?.label ?? rcPillLabel(status.label);
    A[5] = compact?.label;
    A[6] = status.label;
    A[7] = W;
  } else W = A[7];
  let z = W;
  let K = k ? "background" : undefined;
  const color = compact?.ink.color ?? K ?? status.color;
  const bold = compact?.ink.bold;
  const inverse = compact?.ink.inverse ?? k;
  let children;
  if (A[8] !== z || A[9] !== appState) {
    children = appState
      ? jsxProd_default(Link, {
          url: withFromCliParam(appState),
          children: z,
        })
      : z;
    A[8] = z;
    A[9] = appState;
    A[10] = children;
  } else children = A[10];
  let ge;
  if (A[11] !== color || A[12] !== bold || A[13] !== inverse || A[14] !== children) {
    ge = jsxProd_default(Text, {
      color,
      bold,
      inverse,
      wrap: "truncate",
      children,
    });
    A[11] = color;
    A[12] = bold;
    A[13] = inverse;
    A[14] = children;
    A[15] = ge;
  } else ge = A[15];
  return ge;
}
//@ chunk-ag5x7vhf.js:48674-48678 placement
init_react_production();
export { RemoteControlPill, RemoteControlStatus, shortRcLabel, rcPillLabel, logRcPillClicked };
