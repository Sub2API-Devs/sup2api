/**
 * components/TokenWarning.tsx
 *
 * 上下文用量告警：显示 "% context used / % until auto-compact" 或 "Context low"。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TokenWarning.tsx
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: sole-consumer 1, affinity 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { calculateTokenWarningState } from "../services/compact/autoCompact.js";
import { getModelContextInfo } from "../utils/model/modelContextInfo.js";
import { useMicroCompactFlag } from "./StatusNotices.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getUpgradeMessage } from "../utils/model/contextWindowUpgradeCheck.js";
import { hasExplicitWindow, effectiveContextWindow } from "../services/compact/autoCompactWindow.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { Ansi } from "../ink/components/AnsiText.js";

//@ chunk-czq1j3j2.js:816964-817009 sole-consumer
function selectAutoCompactWindow(appState) {
  return appState.autoCompactWindow;
}
//@ chunk-czq1j3j2.js:817009-817059 affinity
function selectRemoteAutocompactState(appState) {
  return appState.remoteAutocompactState;
}
//@ chunk-czq1j3j2.js:817059-818286 fingerprint (2.1.88 match: TokenWarning, 0.715)
function TokenWarning(props) {
  let $ = useMemoCache(17);
  let { tokenUsage, model } = props;
  let autoCompactWindow = useAppState(selectAutoCompactWindow);
  let remoteAutocompactState = useAppState(selectRemoteAutocompactState);
  let warningState;
  if (
    $[0] !== autoCompactWindow ||
    $[1] !== model ||
    $[2] !== remoteAutocompactState ||
    $[3] !== tokenUsage
  ) {
    warningState = calculateTokenWarningState(
      tokenUsage,
      getModelContextInfo(model),
      autoCompactWindow,
      remoteAutocompactState,
    );
    $[0] = autoCompactWindow;
    $[1] = model;
    $[2] = remoteAutocompactState;
    $[3] = tokenUsage;
    $[4] = warningState;
  } else warningState = $[4];
  let warningState_ = warningState;
  let suppressWarning = useMicroCompactFlag();
  if (warningState_.level === "ok" || suppressWarning) {
    return null;
  }
  let pctLeft = warningState_.pctLeft;
  let autoCompactEnabled = remoteAutocompactState ? remoteAutocompactState.enabled : isAutoCompactEnabled();
  let upgradeMessage;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    upgradeMessage = getUpgradeMessage("warning");
    $[5] = upgradeMessage;
  } else upgradeMessage = $[5];
  let upgradeText = upgradeMessage;
  let percentLeft = pctLeft;
  let isWindowInexact = remoteAutocompactState
    ? !remoteAutocompactState.enforced
    : !hasExplicitWindow(getModelContextInfo(model), autoCompactWindow);
  if (isWindowInexact) {
    let effectiveWindow;
    if ($[6] !== autoCompactWindow || $[7] !== model || $[8] !== remoteAutocompactState) {
      effectiveWindow = remoteAutocompactState
        ? remoteAutocompactState.effectiveWindow
        : effectiveContextWindow(getModelContextInfo(model), autoCompactWindow);
      $[6] = autoCompactWindow;
      $[7] = model;
      $[8] = remoteAutocompactState;
      $[9] = effectiveWindow;
    } else effectiveWindow = $[9];
    let effectiveWindow_2 = effectiveWindow;
    let roundedPercentLeft;
    if ($[10] !== effectiveWindow_2 || $[11] !== tokenUsage) {
      roundedPercentLeft = Math.round(((effectiveWindow_2 - tokenUsage) / effectiveWindow_2) * 100);
      $[10] = effectiveWindow_2;
      $[11] = tokenUsage;
      $[12] = roundedPercentLeft;
    } else roundedPercentLeft = $[12];
    percentLeft = Math.max(0, roundedPercentLeft);
  }
  let usageLabel = isWindowInexact
    ? `${100 - percentLeft}% context used`
    : `${percentLeft}% until auto-compact`;
  if (autoCompactEnabled) {
    const children = upgradeText ? `${usageLabel} \xB7 ${upgradeText}` : usageLabel;
    let warningElement;
    if ($[13] !== children) {
      warningElement = jsxProd_default(Text, {
        dimColor: true,
        wrap: "truncate",
        children,
      });
      $[13] = children;
      $[14] = warningElement;
    } else warningElement = $[14];
    return warningElement;
  }
  let hasNoCompactHint = remoteAutocompactState !== undefined || isEnvTruthy(process.env.DISABLE_COMPACT);
  const children = upgradeText
    ? `Context low (${pctLeft}% remaining) \xB7 ${upgradeText}`
    : hasNoCompactHint
      ? `Context low (${pctLeft}% remaining)`
      : `Context low (${pctLeft}% remaining) \xB7 Run /compact to compact & continue`;
  let warningElement_;
  if ($[15] !== children) {
    warningElement_ = jsxProd_default(Text, {
      color: "error",
      wrap: "truncate",
      children,
    });
    $[15] = children;
    $[16] = warningElement_;
  } else warningElement_ = $[16];
  return warningElement_;
}
//@ chunk-czq1j3j2.js:835238-835332 fingerprint (2.1.88 match: CollapseLabel, 0.375)
function CollapseLabel(children, key) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      wrap: "truncate",
      children: jsxProd_default(Ansi, {
        children,
      }),
    },
    key,
  );
}
export { CollapseLabel, TokenWarning };
