/**
 * components/BridgeDialog.tsx
 *
 * /remote-control（Remote Control/bridge）对话框：显示连接状态、会话 URL 二维码、环境/会话 ID，可断开或重连。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BridgeDialog.tsx
 * pieces: chunk-18hwfzwa.js (15), chunk-hny2rpzz.js (1)
 * attribution: fingerprint 7, layout 7, callgraph-fingerprint 1, file-local 1
 */
import { basename } from "path";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OutputLine } from "./shell/OutputLine.js";
import { Text, Box } from "../ink/components/Text.js";
import { useRegisterOverlay } from "../context/overlayContext.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import {
  selectBridgeConnected_2,
  selectBridgeSessionActive_2,
  selectBridgeConnectUrl_2,
  selectBridgeSessionUrl_2,
  selectBridgeEnabled_2,
} from "../commands/bridge/bridge.js";
import { useNotifications } from "../context/notifications.js";
import { useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useProject } from "../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getBranch } from "../utils/git.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { saveUserIntentSetting } from "../utils/settings/userIntentSettings.js";
import {
  BRIDGE_FAILED,
  getBridgeStatus,
  BRIDGE_FAILED_FOOTER_TEXT,
  FAILED_FOOTER_TEXT,
  buildActiveFooterText,
  buildIdleFooterText,
} from "../bridge/bridgeStatusUtil.js";
import { BRIDGE_FAILED_INDICATOR, BRIDGE_READY_INDICATOR } from "../constants/figures.js";
import { BRIDGE_REATTACH_UNAVAILABLE_HINT, BRIDGE_SIGNATURE_WANTED_HINT } from "../bridge/types.js";
import { Dialog } from "./design-system/Dialog.js";
import { FocusColumn } from "./design-system/FocusColumn.js";
import { ErrorText } from "./ErrorText.js";
import { useLatchedBridgeNotice } from "./PromptInput/Notifications.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Byline } from "./design-system/Byline.js";

//@ chunk-hny2rpzz.js:2423-2645 fingerprint (2.1.88 match: _temp0, 0.616)
/**
 * MCP 工具结果中的文本条目，用 OutputLine 渲染。
 */
function McpTextOutputItem(s_8) {
  let $ = useMemoCache(3);
  let { item, verbose } = s_8;
  let content =
    item.type === "text" && "text" in item && item.text !== null && item.text !== undefined
      ? String(item.text)
      : "";
  let props;
  if ($[0] !== content || $[1] !== verbose) {
    props = jsxProd_default(OutputLine, {
      content,
      verbose,
    });
    $[0] = content;
    $[1] = verbose;
    $[2] = props;
  } else props = $[2];
  return props;
}
//@ chunk-18hwfzwa.js:643839-643889 fingerprint (2.1.88 match: _temp3, 1)
function selectReplBridgeReconnecting(s_1) {
  return s_1.replBridgeReconnecting;
}
//@ chunk-18hwfzwa.js:643985-644028 fingerprint (2.1.88 match: _temp6, 1)
function selectReplBridgeError(s_4) {
  return s_4.replBridgeError;
}
//@ chunk-18hwfzwa.js:644028-644075 layout
function selectReplBridgeErrorKind(state) {
  return state.replBridgeErrorKind;
}
//@ chunk-18hwfzwa.js:644075-644121 fingerprint (2.1.88 match: _temp7, 1)
function selectReplBridgeExplicit(s_5) {
  return s_5.replBridgeExplicit;
}
//@ chunk-18hwfzwa.js:644166-644217 fingerprint (2.1.88 match: _temp8, 1)
function selectReplBridgeEnvironmentId(s_6) {
  return s_6.replBridgeEnvironmentId;
}
//@ chunk-18hwfzwa.js:644217-644264 fingerprint (2.1.88 match: _temp9, 1)
function selectReplBridgeSessionId(s_7) {
  return s_7.replBridgeSessionId;
}
//@ chunk-18hwfzwa.js:644264-644299 layout
function selectVerbose(s_8) {
  return s_8.verbose;
}
//@ chunk-18hwfzwa.js:644299-644338 layout
function selectOriginalCwd(state) {
  return state.originalCwd;
}
//@ chunk-18hwfzwa.js:644338-644354 layout
function noop_2() {}
//@ chunk-18hwfzwa.js:644354-644381 layout
function negate(value) {
  return !value;
}
//@ chunk-18hwfzwa.js:644381-644583 layout
function disableReplBridgeState(prev) {
  if (!prev.replBridgeEnabled && prev.replBridgeError === undefined) {
    return prev;
  }
  return {
    ...prev,
    replBridgeEnabled: false,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    replBridgeSessionGroupingId: undefined,
  };
}
//@ chunk-18hwfzwa.js:644583-644771 callgraph-fingerprint (2.1.88 match: _temp12, 0.368)
function enableReplBridgeState(prev) {
  if (prev.replBridgeEnabled || prev.replBridgeError === undefined) {
    return prev;
  }
  return {
    ...prev,
    replBridgeEnabled: true,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    replBridgeExplicit: true,
  };
}
//@ chunk-18hwfzwa.js:644771-644807 file-local
function isNonEmptyLine_2(l) {
  return l.length > 0;
}
//@ chunk-18hwfzwa.js:644807-644856 layout
function renderTextLine_4(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-18hwfzwa.js:644856-649982 fingerprint (2.1.88 match: BridgeDialog, 0.557)
/**
 * Remote Control 对话框：显示连接/会话状态与 URL（可切换二维码），d 键断开并关闭启动时自动连接，重试错误状态，显示 cwd 与分支。
 */
function BridgeDialog(props) {
  let $ = useMemoCache(112);
  let { onDone } = props;
  useRegisterOverlay("bridge-dialog");
  let { storageV5 } = useTheme_2();
  let connected = useAppState(selectBridgeConnected_2);
  let sessionActive = useAppState(selectBridgeSessionActive_2);
  let reconnecting = useAppState(selectReplBridgeReconnecting);
  let connectUrl = useAppState(selectBridgeConnectUrl_2);
  let sessionUrl = useAppState(selectBridgeSessionUrl_2);
  let error = useAppState(selectReplBridgeError);
  let replBridgeErrorKind = useAppState(selectReplBridgeErrorKind);
  let replBridgeExplicit = useAppState(selectReplBridgeExplicit);
  let replBridgeEnabled = useAppState(selectBridgeEnabled_2);
  let replBridgeEnvironmentId = useAppState(selectReplBridgeEnvironmentId);
  let replBridgeSessionId = useAppState(selectReplBridgeSessionId);
  let verbose = useAppState(selectVerbose);
  let setAppState = useSetAppState();
  let { removeNotification } = useNotifications();
  let [showQR, setShowQR] = useState(false);
  let [qrText, setQrText] = useState("");
  let [branchName, setBranchName] = useState("");
  let originalCwd = useProject(selectOriginalCwd);
  let cwdBase;
  if ($[0] !== originalCwd) {
    cwdBase = basename(originalCwd);
    $[0] = originalCwd;
    $[1] = cwdBase;
  } else cwdBase = $[1];
  let projectName = cwdBase;
  let t2;
  let t3;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = () => {
      getBranch().then(setBranchName).catch(noop_2);
    };
    t3 = [];
    $[2] = t2;
    $[3] = t3;
  } else {
    t2 = $[2];
    t3 = $[3];
  }
  useEffect(t2, t3);
  let displayUrl = sessionActive ? sessionUrl : connectUrl;
  let qrEffect;
  let t5;
  if ($[4] !== displayUrl || $[5] !== showQR) {
    qrEffect = () => {
      if (!showQR || !displayUrl) {
        setQrText("");
        return;
      }
      import("../../vendor/qrcode/lib/server.js")
        .then((qrModule) => {
          let { toString } = qrModule;
          return toString(displayUrl, {
            type: "utf8",
            errorCorrectionLevel: "L",
            small: true,
          });
        })
        .then(setQrText)
        .catch(() => setQrText(""));
    };
    t5 = [showQR, displayUrl];
    $[4] = displayUrl;
    $[5] = showQR;
    $[6] = qrEffect;
    $[7] = t5;
  } else {
    qrEffect = $[6];
    t5 = $[7];
  }
  useEffect(qrEffect, t5);
  let t6;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    t6 = () => {
      setShowQR(negate);
    };
    $[8] = t6;
  } else t6 = $[8];
  let t7;
  if ($[9] !== onDone) {
    t7 = {
      "confirm:yes": onDone,
      "confirm:toggle": t6,
    };
    $[9] = onDone;
    $[10] = t7;
  } else t7 = $[10];
  let t8;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    t8 = {
      context: "Confirmation",
    };
    $[11] = t8;
  } else t8 = $[11];
  MessageActionsKeybindings(t7, t8);
  let handleKeyDown;
  if (
    $[12] !== replBridgeEnabled ||
    $[13] !== error ||
    $[14] !== replBridgeErrorKind ||
    $[15] !== replBridgeExplicit ||
    $[16] !== onDone ||
    $[17] !== removeNotification ||
    $[18] !== setAppState ||
    $[19] !== storageV5
  ) {
    handleKeyDown = function event(input) {
      if (input.key === "d" && !input.ctrl && !input.meta) {
        input.preventDefault();
        if (replBridgeExplicit && replBridgeEnabled && error === undefined)
          saveUserIntentSetting("remoteControlAtStartup", false, storageV5);
        removeNotification(BRIDGE_FAILED);
        setAppState(disableReplBridgeState);
        onDone();
      }
      if (
        input.key === "r" &&
        !input.ctrl &&
        !input.meta &&
        !replBridgeEnabled &&
        error !== undefined &&
        replBridgeErrorKind === "auth"
      ) {
        input.preventDefault();
        removeNotification(BRIDGE_FAILED);
        setAppState(enableReplBridgeState);
        onDone();
      }
    };
    $[12] = replBridgeEnabled;
    $[13] = error;
    $[14] = replBridgeErrorKind;
    $[15] = replBridgeExplicit;
    $[16] = onDone;
    $[17] = removeNotification;
    $[18] = setAppState;
    $[19] = storageV5;
    $[20] = handleKeyDown;
  } else handleKeyDown = $[20];
  let handleKeyDown_ = handleKeyDown;
  let t10;
  if ($[21] !== connected || $[22] !== error || $[23] !== reconnecting || $[24] !== sessionActive) {
    t10 = getBridgeStatus({
      error,
      connected,
      sessionActive,
      reconnecting,
    });
    $[21] = connected;
    $[22] = error;
    $[23] = reconnecting;
    $[24] = sessionActive;
    $[25] = t10;
  } else t10 = $[25];
  let { label: statusLabel, color: statusColor } = t10;
  let statusIndicator = error ? BRIDGE_FAILED_INDICATOR : BRIDGE_READY_INDICATOR;
  let qrLines;
  let bodyTree;
  let footerText;
  let gap;
  let onKeyDown;
  let statusText;
  let qrCodeElement;
  let title;
  let onCancel;
  let hideInputGuide;
  if (
    $[26] !== branchName ||
    $[27] !== displayUrl ||
    $[28] !== replBridgeEnvironmentId ||
    $[29] !== error ||
    $[30] !== replBridgeErrorKind ||
    $[31] !== handleKeyDown_ ||
    $[32] !== statusIndicator ||
    $[33] !== onDone ||
    $[34] !== qrText ||
    $[35] !== projectName ||
    $[36] !== sessionActive ||
    $[37] !== replBridgeSessionId ||
    $[38] !== showQR ||
    $[39] !== statusColor ||
    $[40] !== statusLabel ||
    $[41] !== verbose
  ) {
    let qrLines_2 = qrText
      ? qrText
          .split(
            `
`,
          )
          .filter(isNonEmptyLine_2)
      : [];
    let contextParts;
    if ($[52] !== branchName || $[53] !== projectName) {
      contextParts = [];
      if (projectName) contextParts.push(projectName);
      if (branchName) contextParts.push(branchName);
      $[52] = branchName;
      $[53] = projectName;
      $[54] = contextParts;
    } else contextParts = $[54];
    let contextSuffix = contextParts.length > 0 ? " \xB7 " + contextParts.join(" \xB7 ") : "";
    let t18;
    if ($[55] !== displayUrl || $[56] !== error || $[57] !== replBridgeErrorKind || $[58] !== sessionActive) {
      t18 =
        error === BRIDGE_FAILED_FOOTER_TEXT ||
        error === BRIDGE_REATTACH_UNAVAILABLE_HINT ||
        error === BRIDGE_SIGNATURE_WANTED_HINT ||
        (error !== undefined && replBridgeErrorKind === "ended_elsewhere")
          ? undefined
          : error
            ? FAILED_FOOTER_TEXT
            : displayUrl
              ? sessionActive
                ? buildActiveFooterText(displayUrl)
                : buildIdleFooterText(displayUrl)
              : undefined;
      $[55] = displayUrl;
      $[56] = error;
      $[57] = replBridgeErrorKind;
      $[58] = sessionActive;
      $[59] = t18;
    } else t18 = $[59];
    footerText = t18;
    bodyTree = Dialog;
    title = "Remote Control";
    onCancel = onDone;
    hideInputGuide = true;
    qrLines = FocusColumn;
    gap = 1;
    onKeyDown = handleKeyDown_;
    let t19;
    if ($[60] !== statusIndicator || $[61] !== statusColor || $[62] !== statusLabel) {
      t19 = jsxProd_default_2(Text, {
        color: statusColor,
        children: [statusIndicator, " ", statusLabel],
      });
      $[60] = statusIndicator;
      $[61] = statusColor;
      $[62] = statusLabel;
      $[63] = t19;
    } else t19 = $[63];
    let t20;
    if ($[64] !== contextSuffix) {
      t20 = jsxProd_default(Text, {
        dimColor: true,
        children: contextSuffix,
      });
      $[64] = contextSuffix;
      $[65] = t20;
    } else t20 = $[65];
    let t21;
    if ($[66] !== t19 || $[67] !== t20) {
      t21 = jsxProd_default_2(Text, {
        children: [t19, t20],
      });
      $[66] = t19;
      $[67] = t20;
      $[68] = t21;
    } else t21 = $[68];
    let t22;
    if ($[69] !== error) {
      t22 = jsxProd_default(ErrorText, {
        error,
      });
      $[69] = error;
      $[70] = t22;
    } else t22 = $[70];
    let qrLineList;
    if ($[71] === MEMO_CACHE_SENTINEL) {
      qrLineList = jsxProd_default(useLatchedBridgeNotice, {
        saysWhatToDo: true,
      });
      $[71] = qrLineList;
    } else qrLineList = $[71];
    let statusLine;
    if ($[72] !== replBridgeEnvironmentId || $[73] !== verbose) {
      statusLine =
        verbose &&
        replBridgeEnvironmentId &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Environment: ", replBridgeEnvironmentId],
        });
      $[72] = replBridgeEnvironmentId;
      $[73] = verbose;
      $[74] = statusLine;
    } else statusLine = $[74];
    let t24;
    if ($[75] !== replBridgeSessionId || $[76] !== verbose) {
      t24 =
        verbose &&
        replBridgeSessionId &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Session: ", replBridgeSessionId],
        });
      $[75] = replBridgeSessionId;
      $[76] = verbose;
      $[77] = t24;
    } else t24 = $[77];
    if ($[78] !== t21 || $[79] !== t22 || $[80] !== statusLine || $[81] !== t24) {
      statusText = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [t21, t22, qrLineList, statusLine, t24],
      });
      $[78] = t21;
      $[79] = t22;
      $[80] = statusLine;
      $[81] = t24;
      $[82] = statusText;
    } else statusText = $[82];
    qrCodeElement =
      showQR &&
      qrLines_2.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        children: qrLines_2.map(renderTextLine_4),
      });
    $[26] = branchName;
    $[27] = displayUrl;
    $[28] = replBridgeEnvironmentId;
    $[29] = error;
    $[30] = replBridgeErrorKind;
    $[31] = handleKeyDown_;
    $[32] = statusIndicator;
    $[33] = onDone;
    $[34] = qrText;
    $[35] = projectName;
    $[36] = sessionActive;
    $[37] = replBridgeSessionId;
    $[38] = showQR;
    $[39] = statusColor;
    $[40] = statusLabel;
    $[41] = verbose;
    $[42] = qrLines;
    $[43] = bodyTree;
    $[44] = footerText;
    $[45] = gap;
    $[46] = onKeyDown;
    $[47] = statusText;
    $[48] = qrCodeElement;
    $[49] = title;
    $[50] = onCancel;
    $[51] = hideInputGuide;
  } else {
    qrLines = $[42];
    bodyTree = $[43];
    footerText = $[44];
    gap = $[45];
    onKeyDown = $[46];
    statusText = $[47];
    qrCodeElement = $[48];
    title = $[49];
    onCancel = $[50];
    hideInputGuide = $[51];
  }
  let bodyChildren;
  if ($[83] !== footerText) {
    bodyChildren =
      footerText &&
      jsxProd_default(Text, {
        dimColor: true,
        children: footerText,
      });
    $[83] = footerText;
    $[84] = bodyChildren;
  } else bodyChildren = $[84];
  const action = error !== undefined ? "dismiss" : "disconnect";
  let dialog;
  if ($[85] !== action) {
    dialog = jsxProd_default(KeyboardShortcutHint, {
      chord: "d",
      action,
    });
    $[85] = action;
    $[86] = dialog;
  } else dialog = $[86];
  let errorActions;
  if ($[87] !== replBridgeEnabled || $[88] !== error || $[89] !== replBridgeErrorKind) {
    errorActions =
      error !== undefined &&
      !replBridgeEnabled &&
      replBridgeErrorKind === "auth" &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "r",
        action: "reconnect",
      });
    $[87] = replBridgeEnabled;
    $[88] = error;
    $[89] = replBridgeErrorKind;
    $[90] = errorActions;
  } else errorActions = $[90];
  let mainContent;
  if ($[91] !== displayUrl) {
    mainContent =
      Boolean(displayUrl) &&
      jsxProd_default(Text, {
        children: "space for QR code",
      });
    $[91] = displayUrl;
    $[92] = mainContent;
  } else mainContent = $[92];
  let layout;
  if ($[93] === MEMO_CACHE_SENTINEL) {
    layout = jsxProd_default(KeyboardShortcutHint, {
      chord: ["enter", "escape"],
      action: "close",
    });
    $[93] = layout;
  } else layout = $[93];
  let dialogElement;
  if ($[94] !== dialog || $[95] !== errorActions || $[96] !== mainContent) {
    dialogElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [dialog, errorActions, mainContent, layout],
      }),
    });
    $[94] = dialog;
    $[95] = errorActions;
    $[96] = mainContent;
    $[97] = dialogElement;
  } else dialogElement = $[97];
  let children;
  if (
    $[98] !== qrLines ||
    $[99] !== gap ||
    $[100] !== onKeyDown ||
    $[101] !== statusText ||
    $[102] !== qrCodeElement ||
    $[103] !== bodyChildren ||
    $[104] !== dialogElement
  ) {
    children = jsxProd_default_2(qrLines, {
      gap,
      onKeyDown,
      children: [statusText, qrCodeElement, bodyChildren, dialogElement],
    });
    $[98] = qrLines;
    $[99] = gap;
    $[100] = onKeyDown;
    $[101] = statusText;
    $[102] = qrCodeElement;
    $[103] = bodyChildren;
    $[104] = dialogElement;
    $[105] = children;
  } else children = $[105];
  let t21;
  if (
    $[106] !== bodyTree ||
    $[107] !== title ||
    $[108] !== onCancel ||
    $[109] !== hideInputGuide ||
    $[110] !== children
  ) {
    t21 = jsxProd_default(bodyTree, {
      title,
      onCancel,
      hideInputGuide,
      children,
    });
    $[106] = bodyTree;
    $[107] = title;
    $[108] = onCancel;
    $[109] = hideInputGuide;
    $[110] = children;
    $[111] = t21;
  } else t21 = $[111];
  return t21;
}
export { BridgeDialog, McpTextOutputItem };
