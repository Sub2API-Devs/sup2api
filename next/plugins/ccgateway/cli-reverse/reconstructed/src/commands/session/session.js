/**
 * commands/session/session.tsx
 *
 * 并入已有模块：/session 界面：显示会话浏览器链接与二维码（远程模式）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/session/session.tsx
 * pieces: chunk-5wayr1tc.js (5), chunk-czq1j3j2.js (1), chunk-zn7314wm.js (10)
 * attribution: sole-consumer 3, fingerprint 2, placement 11
 */
import { __toESM, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { require_utf8 } from "../../../vendor/qrcode/lib/renderer/utf8.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { create, toString } from "../../../vendor/qrcode/lib/server.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Pane } from "../../components/design-system/Pane.js";
import {
  init_react_production,
  suspenseTypeExport,
  use,
} from "../../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../../utils/debug.js";
import { useAppState } from "../../state/AppState.js";
import { isRemoteSessionAvailable, hasRemoteCap } from "../../remote/remoteMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:827784-827828 fingerprint (2.1.88 match: _temp, 1)
function selectRemoteSessionUrl_2(s) {
  return s.remoteSessionUrl;
}
//@ chunk-5wayr1tc.js:5712-5730 sole-consumer
var _; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5wayr1tc.js:5712", () => {
  _ = __toESM(require_utf8(), 1);
});
//@ chunk-5wayr1tc.js:5730-5773 sole-consumer
function renderTextLine_2(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-5wayr1tc.js:5773-5983 sole-consumer
var CLAUDE_MOBILE_APP_URL; // deferred: uses _ of its import cycle while loading; runs once the cycle is complete
var CLAUDE_AI_MOBILE;
var GET_MOBILE_APP_LABEL;
var MOBILE_APP_QR_LINES;
deferInit("chunk-5wayr1tc.js:5773", () => {
  CLAUDE_MOBILE_APP_URL = "https://claude.ai/mobile?entrypoint=claude_code_cli";
  CLAUDE_AI_MOBILE = "claude.ai/mobile";
  GET_MOBILE_APP_LABEL = "Get the Claude app on your phone";
  MOBILE_APP_QR_LINES = _.render(
    create(CLAUDE_MOBILE_APP_URL, {
      errorCorrectionLevel: "L",
    }),
    {
      margin: 2,
    },
  )
    .split(
      `
`,
    )
    .filter((line) => line.length > 0);
});
//@ chunk-5wayr1tc.js:5983-7569 fingerprint (2.1.88 match: SessionInfo, 0.309)
function SessionInfo(props) {
  let $ = useMemoCache(25);
  let { onDone } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let rcHint;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    rcHint = isReplBridgeActive()
      ? jsxProd_default(Text, {
          dimColor: true,
          children: "Find this session in the Code tab of the Claude app",
        })
      : isRemoteControlOfferable()
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Then run ",
              jsxProd_default(Text, {
                color: "suggestion",
                children: "/rc",
              }),
              " to continue this session from your phone",
            ],
          })
        : null;
    $[0] = rcHint;
  } else rcHint = $[0];
  let rcHintNode = rcHint;
  let keybindingsContext;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    keybindingsContext = {
      context: "Confirmation",
    };
    $[1] = keybindingsContext;
  } else keybindingsContext = $[1];
  useKeybinding("confirm:no", onDone, keybindingsContext);
  let remoteSessionUrl = useGlobalExitKeybindings(onDone);
  let handleKeyDown;
  if ($[2] !== onDone) {
    handleKeyDown = function onKeyDown(event) {
      if (event.key === "q" && !event.ctrl && !event.meta) {
        event.preventDefault();
        onDone();
      }
    };
    $[2] = onDone;
    $[3] = handleKeyDown;
  } else handleKeyDown = $[3];
  let onKeyDown = handleKeyDown;
  let titleText;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: GET_MOBILE_APP_LABEL,
      }),
    });
    $[4] = titleText;
  } else titleText = $[4];
  const children = isScreenReaderEnabled ? "Visit on your phone: " : "Scan the QR code, or visit ";
  let visitLabel;
  if ($[5] !== children) {
    visitLabel = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[5] = children;
    $[6] = visitLabel;
  } else visitLabel = $[6];
  let mobileLink;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    mobileLink = jsxProd_default(Link, {
      url: CLAUDE_MOBILE_APP_URL,
      children: jsxProd_default(Text, {
        color: "ide",
        children: CLAUDE_AI_MOBILE,
      }),
    });
    $[7] = mobileLink;
  } else mobileLink = $[7];
  let visitRow;
  if ($[8] !== visitLabel) {
    visitRow = jsxProd_default_2(Box, {
      children: [visitLabel, mobileLink],
    });
    $[8] = visitLabel;
    $[9] = visitRow;
  } else visitRow = $[9];
  let children_2;
  if ($[10] !== remoteSessionUrl.keyName || $[11] !== remoteSessionUrl.pending) {
    children_2 = remoteSessionUrl.pending
      ? `Press ${remoteSessionUrl.keyName} again to close`
      : jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "close",
          ...stableEmptyObject(false),
        });
    $[10] = remoteSessionUrl.keyName;
    $[11] = remoteSessionUrl.pending;
    $[12] = children_2;
  } else children_2 = $[12];
  let closeHint;
  if ($[13] !== children_2) {
    closeHint = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: children_2,
      }),
    });
    $[13] = children_2;
    $[14] = closeHint;
  } else closeHint = $[14];
  let qrLines;
  if ($[15] !== isScreenReaderEnabled) {
    qrLines = !isScreenReaderEnabled && MOBILE_APP_QR_LINES.map(renderTextLine_2);
    $[15] = isScreenReaderEnabled;
    $[16] = qrLines;
  } else qrLines = $[16];
  let rcHintBox;
  if ($[17] !== isScreenReaderEnabled) {
    rcHintBox =
      rcHintNode &&
      jsxProd_default(Box, {
        marginTop: isScreenReaderEnabled ? 1 : 0,
        children: rcHintNode,
      });
    $[17] = isScreenReaderEnabled;
    $[18] = rcHintBox;
  } else rcHintBox = $[18];
  let pane;
  if (
    $[19] !== onKeyDown ||
    $[20] !== closeHint ||
    $[21] !== qrLines ||
    $[22] !== rcHintBox ||
    $[23] !== visitRow
  ) {
    let children = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [titleText, visitRow, closeHint, qrLines, rcHintBox],
    });
    pane = jsxProd_default(Pane, {
      children,
    });
    $[19] = onKeyDown;
    $[20] = closeHint;
    $[21] = qrLines;
    $[22] = rcHintBox;
    $[23] = visitRow;
    $[24] = pane;
  } else pane = $[24];
  return pane;
}
//@ chunk-5wayr1tc.js:7569-7613 placement
/**
 * /mobile 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function sessionInfoCall(onDone) {
  return jsxProd_default(SessionInfo, {
    onDone,
  });
}
//@ chunk-zn7314wm.js:5581-5585 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zn7314wm.js:5581", () => {
  init_react_production();
});
//@ chunk-zn7314wm.js:5585-5625 placement (2.1.88 match: _temp, 1)
function selectRemoteSessionUrl(s) {
  return s.remoteSessionUrl;
}
//@ chunk-zn7314wm.js:5625-5659 placement
function isNonEmptyLine(line) {
  return line.length > 0;
}
//@ chunk-zn7314wm.js:5659-5705 placement
function qrCodeLines(qrText) {
  return qrText
    .split(
      `
`,
    )
    .filter(isNonEmptyLine);
}
//@ chunk-zn7314wm.js:5705-5768 placement
function qrFailureFallback(error) {
  logForDebugging(`QR code generation failed: ${error}`);
  return [];
}
//@ chunk-zn7314wm.js:5768-5811 placement
function renderTextLine(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-zn7314wm.js:5811-7691 placement
/**
 * /session 界面：显示会话浏览器链接与二维码（远程模式）。
 */
function SessionQrDialog(props) {
  let $ = useMemoCache(25);
  let { onDone } = props;
  let text = useAppState(selectRemoteSessionUrl);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let emptyHintProps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyHintProps = stableEmptyObject(false);
    $[0] = emptyHintProps;
  } else emptyHintProps = $[0];
  let hintProps = emptyHintProps;
  let qrLinesPromise;
  if ($[1] !== text) {
    qrLinesPromise = text
      ? toString(text, {
          type: "utf8",
          errorCorrectionLevel: "L",
          margin: 0,
        })
          .then(qrCodeLines)
          .catch(qrFailureFallback)
      : null;
    $[1] = text;
    $[2] = qrLinesPromise;
  } else qrLinesPromise = $[2];
  let composed = qrLinesPromise;
  let keybindingsContext;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    keybindingsContext = {
      context: "Confirmation",
    };
    $[3] = keybindingsContext;
  } else keybindingsContext = $[3];
  useKeybinding("confirm:no", onDone, keybindingsContext);
  let globalExitKeybindings = useGlobalExitKeybindings(onDone);
  if (!text) {
    let noLinkMessage;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      noLinkMessage = isRemoteSessionAvailable()
        ? jsxProd_default(Text, {
            children: hasRemoteCap("fanout")
              ? "This session's browser link isn't available from this view."
              : "This session is connected directly and has no browser link \u2014 only sessions started with `claude --cloud` can be opened in the browser.",
          })
        : jsxProd_default(Text, {
            color: "warning",
            children: "Not in remote mode. Start with `claude --cloud` to use this command.",
          });
      $[4] = noLinkMessage;
    } else noLinkMessage = $[4];
    let children;
    if ($[5] !== globalExitKeybindings.keyName || $[6] !== globalExitKeybindings.pending) {
      children = globalExitKeybindings.pending
        ? `Press ${globalExitKeybindings.keyName} again to close`
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "close",
            ...hintProps,
          });
      $[5] = globalExitKeybindings.keyName;
      $[6] = globalExitKeybindings.pending;
      $[7] = children;
    } else children = $[7];
    let pane;
    if ($[8] !== children) {
      pane = jsxProd_default_2(CloudSessionPane, {
        isRedesign: false,
        children: [
          noLinkMessage,
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              dimColor: true,
              italic: false,
              children,
            }),
          }),
        ],
      });
      $[8] = children;
      $[9] = pane;
    } else pane = $[9];
    return pane;
  }
  let openLabel;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    openLabel = jsxProd_default(Text, {
      dimColor: true,
      children: "Open in browser: ",
    });
    $[10] = openLabel;
  } else openLabel = $[10];
  let urlRow;
  if ($[11] !== text) {
    urlRow = jsxProd_default_2(Box, {
      children: [
        openLabel,
        jsxProd_default(Text, {
          color: "ide",
          children: text,
        }),
      ],
    });
    $[11] = text;
    $[12] = urlRow;
  } else urlRow = $[12];
  let children;
  if ($[13] !== globalExitKeybindings.keyName || $[14] !== globalExitKeybindings.pending) {
    children = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
          parens: true,
          ...hintProps,
        });
    $[13] = globalExitKeybindings.keyName;
    $[14] = globalExitKeybindings.pending;
    $[15] = children;
  } else children = $[15];
  let cancelHint;
  if ($[16] !== children) {
    cancelHint = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children,
      }),
    });
    $[16] = children;
    $[17] = cancelHint;
  } else cancelHint = $[17];
  let qrSection;
  if ($[18] !== isScreenReaderEnabled || $[19] !== composed) {
    qrSection =
      !isScreenReaderEnabled &&
      composed &&
      jsxProd_default(suspenseTypeExport, {
        fallback: jsxProd_default(Text, {
          dimColor: true,
          children: "Generating QR code\u2026",
        }),
        children: jsxProd_default(SessionQrCode, {
          qrLinesPromise: composed,
        }),
      });
    $[18] = isScreenReaderEnabled;
    $[19] = composed;
    $[20] = qrSection;
  } else qrSection = $[20];
  let dialogPane;
  if ($[21] !== urlRow || $[22] !== cancelHint || $[23] !== qrSection) {
    dialogPane = jsxProd_default_2(CloudSessionPane, {
      isRedesign: false,
      children: [urlRow, cancelHint, qrSection],
    });
    $[21] = urlRow;
    $[22] = cancelHint;
    $[23] = qrSection;
    $[24] = dialogPane;
  } else dialogPane = $[24];
  return dialogPane;
}
//@ chunk-zn7314wm.js:7691-7915 placement
function CloudSessionPane(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let header;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    header = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Cloud session",
      }),
    });
    $[0] = header;
  } else header = $[0];
  let pane;
  if ($[1] !== children) {
    pane = jsxProd_default_2(Pane, {
      children: [header, children],
    });
    $[1] = children;
    $[2] = pane;
  } else pane = $[2];
  return pane;
}
//@ chunk-zn7314wm.js:7915-8127 placement
function SessionQrCode(props) {
  let $ = useMemoCache(4);
  let { qrLinesPromise } = props;
  let qrLines = use(qrLinesPromise);
  if (qrLines.length === 0) {
    return null;
  }
  let children;
  if ($[0] !== qrLines) {
    children = qrLines.map(renderTextLine);
    $[0] = qrLines;
    $[1] = children;
  } else children = $[1];
  let fragment;
  if ($[2] !== children) {
    fragment = jsxProd_default(Fragment, {
      children,
    });
    $[2] = children;
    $[3] = fragment;
  } else fragment = $[3];
  return fragment;
}
//@ chunk-zn7314wm.js:8127-8160 placement
/**
 * /session 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var sessionQrDialogCall = async (onDone) =>
  jsxProd_default(SessionQrDialog, {
    onDone,
  });
export { selectRemoteSessionUrl_2, sessionInfoCall, sessionQrDialogCall };
