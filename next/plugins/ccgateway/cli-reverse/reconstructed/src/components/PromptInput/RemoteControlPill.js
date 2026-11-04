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
import { init_react_production, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { sequential } from "../../utils/sequential.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:46516-46546 placement
var RC_ACTIVE_BADGE_KEY = "rc-active-badge";
var MAX_VERBOSE_RC_IMPRESSIONS = 5;
//@ chunk-ag5x7vhf.js:46546-46681 placement
function isVerboseRcActive() {
  let hostState = bridgeHostState();
  if (hostState.verboseRcActive === undefined)
    hostState.verboseRcActive =
      (getGlobalConfig().seenNotifications?.[RC_ACTIVE_BADGE_KEY] ?? 0) < MAX_VERBOSE_RC_IMPRESSIONS;
  return hostState.verboseRcActive;
}
//@ chunk-ag5x7vhf.js:46681-46735 placement
function rcPillLabel(label) {
  return label === "/rc active" && !isVerboseRcActive() ? "/rc" : label;
}
//@ chunk-ag5x7vhf.js:46735-46840 placement
function withFromCliParam(appState) {
  try {
    let url = new URL(appState);
    url.searchParams.set("from", "cli");
    return url.toString();
  } catch {
    return appState;
  }
}
//@ chunk-ag5x7vhf.js:46840-46910 placement
function logRcPillClicked(trigger, label) {
  logEvent("tengu_rc_pill_clicked", {
    trigger: fromEnum(trigger),
    label: fromEnum(label),
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
  let hostState = bridgeHostState();
  if (hostState.rcActiveImpressionRecorded) return;
  if (!isVerboseRcActive()) return;
  hostState.rcActiveImpressionRecorded = true;
  saveGlobalConfig((config) => {
    let seenNotifications = config.seenNotifications ?? {};
    return {
      ...config,
      seenNotifications: {
        ...seenNotifications,
        [RC_ACTIVE_BADGE_KEY]: (seenNotifications[RC_ACTIVE_BADGE_KEY] ?? 0) + 1,
      },
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:47313-47317 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:47313", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:47317-47364 placement = _temp4 (1)
function selectBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-ag5x7vhf.js:47788-47883 placement
function shortRcLabel(label) {
  return sequential.level === 0 && label.label !== "/rc active" ? label.label.replace(/^\/rc/, "rc") : "rc";
}
//@ chunk-ag5x7vhf.js:47883-48674 placement
function RemoteControlStatus(props) {
  let $ = useMemoCache(16);
  let { status, highlighted, compact } = props;
  let isHighlighted = highlighted === undefined ? false : highlighted;
  let appState = useAppState(selectBridgeSessionUrl);
  let { storageV5 } = useTheme_2();
  let isCompact = compact !== undefined;
  let onPress;
  let deps;
  if ($[0] !== isCompact || $[1] !== status.label || $[2] !== storageV5) {
    onPress = () => {
      if (!isCompact && status.label === "/rc active") recordRcActiveImpression(storageV5);
    };
    deps = [isCompact, status.label, storageV5];
    $[0] = isCompact;
    $[1] = status.label;
    $[2] = storageV5;
    $[3] = onPress;
    $[4] = deps;
  } else {
    onPress = $[3];
    deps = $[4];
  }
  useEffect(onPress, deps);
  let labelText;
  if ($[5] !== compact?.label || $[6] !== status.label) {
    labelText = compact?.label ?? rcPillLabel(status.label);
    $[5] = compact?.label;
    $[6] = status.label;
    $[7] = labelText;
  } else labelText = $[7];
  let rcLabel = labelText;
  let backgroundColor = isHighlighted ? "background" : undefined;
  const color = compact?.ink.color ?? backgroundColor ?? status.color;
  const bold = compact?.ink.bold;
  const inverse = compact?.ink.inverse ?? isHighlighted;
  let children;
  if ($[8] !== rcLabel || $[9] !== appState) {
    children = appState
      ? jsxProd_default(Link, {
          url: withFromCliParam(appState),
          children: rcLabel,
        })
      : rcLabel;
    $[8] = rcLabel;
    $[9] = appState;
    $[10] = children;
  } else children = $[10];
  let textElement;
  if ($[11] !== color || $[12] !== bold || $[13] !== inverse || $[14] !== children) {
    textElement = jsxProd_default(Text, {
      color,
      bold,
      inverse,
      wrap: "truncate",
      children,
    });
    $[11] = color;
    $[12] = bold;
    $[13] = inverse;
    $[14] = children;
    $[15] = textElement;
  } else textElement = $[15];
  return textElement;
}
//@ chunk-ag5x7vhf.js:48674-48678 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:48674", () => {
  init_react_production();
});
export { RemoteControlPill, RemoteControlStatus, shortRcLabel, rcPillLabel, logRcPillClicked };
