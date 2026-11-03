/**
 * commands/session/session.tsx
 *
 * 并入已有模块：/session 界面：显示会话浏览器链接与二维码（远程模式）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/session/session.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-3rb87ry3.js (10), chunk-7mtn3rbz.js (5)
 * attribution: fingerprint 2, placement 11, sole-consumer 3
 */
import { init_react_production, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL, Re } from "../../../runtime/bun-runtime.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { toString, create } from "../../../vendor/qrcode/lib/server.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { isRemoteSessionAvailable, hasRemoteCap } from "../../remote/remoteMode.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Pane } from "../../components/design-system/Pane.js";
import { require_utf8 } from "../../../vendor/qrcode/lib/renderer/utf8.js";
import { isReplBridgeActive } from "../../bootstrap/state.js";
import { isRemoteControlOfferable } from "../../bridge/bridgeGates.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";

//@ chunk-3rb87ry3.js:5244-5248 placement
init_react_production();
//@ chunk-3rb87ry3.js:5248-5290 placement = _temp (1)
function selectRemoteSessionUrl(s) {
  return s.remoteSessionUrl;
}
//@ chunk-3rb87ry3.js:5290-5324 placement
function isNonEmptyLine(line) {
  return line.length > 0;
}
//@ chunk-3rb87ry3.js:5324-5370 placement
function qrCodeLines(ie) {
  return ie
    .split(
      `
`,
    )
    .filter(isNonEmptyLine);
}
//@ chunk-3rb87ry3.js:5370-5433 placement
function qrFailureFallback(ne) {
  logForDebugging(`QR code generation failed: ${ne}`);
  return [];
}
//@ chunk-3rb87ry3.js:5433-5476 placement
function renderTextLine(children, x) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    x,
  );
}
//@ chunk-3rb87ry3.js:5476-7356 placement
/**
 * /session 界面：显示会话浏览器链接与二维码（远程模式）。
 */
function SessionQrDialog(props) {
  let o = w(25);
  let { onDone } = props;
  let text = useAppState(selectRemoteSessionUrl);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let h;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    h = stableEmptyObject(false);
    o[0] = h;
  } else h = o[0];
  let b = h;
  let x;
  if (o[1] !== text) {
    x = text
      ? toString(text, {
          type: "utf8",
          errorCorrectionLevel: "L",
          margin: 0,
        })
          .then(qrCodeLines)
          .catch(qrFailureFallback)
      : null;
    o[1] = text;
    o[2] = x;
  } else x = o[2];
  let C = x;
  let B;
  if (o[3] === MEMO_CACHE_SENTINEL) {
    B = {
      context: "Confirmation",
    };
    o[3] = B;
  } else B = o[3];
  useKeybinding("confirm:no", onDone, B);
  let globalExitKeybindings = useGlobalExitKeybindings(onDone);
  if (!text) {
    let u;
    if (o[4] === MEMO_CACHE_SENTINEL) {
      u = isRemoteSessionAvailable()
        ? jsxProd_default(Text, {
            children: hasRemoteCap("fanout")
              ? "This session's browser link isn't available from this view."
              : "This session is connected directly and has no browser link \u2014 only sessions started with `claude --cloud` can be opened in the browser.",
          })
        : jsxProd_default(Text, {
            color: "warning",
            children: "Not in remote mode. Start with `claude --cloud` to use this command.",
          });
      o[4] = u;
    } else u = o[4];
    let children;
    if (o[5] !== globalExitKeybindings.keyName || o[6] !== globalExitKeybindings.pending) {
      children = globalExitKeybindings.pending
        ? `Press ${globalExitKeybindings.keyName} again to close`
        : jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "close",
            ...b,
          });
      o[5] = globalExitKeybindings.keyName;
      o[6] = globalExitKeybindings.pending;
      o[7] = children;
    } else children = o[7];
    let c;
    if (o[8] !== children) {
      c = jsxProd_default_2(CloudSessionPane, {
        isRedesign: false,
        children: [
          u,
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
      o[8] = children;
      o[9] = c;
    } else c = o[9];
    return c;
  }
  let u;
  if (o[10] === MEMO_CACHE_SENTINEL) {
    u = jsxProd_default(Text, {
      dimColor: true,
      children: "Open in browser: ",
    });
    o[10] = u;
  } else u = o[10];
  let l;
  if (o[11] !== text) {
    l = jsxProd_default_2(Box, {
      children: [
        u,
        jsxProd_default(Text, {
          color: "ide",
          children: text,
        }),
      ],
    });
    o[11] = text;
    o[12] = l;
  } else l = o[12];
  let children;
  if (o[13] !== globalExitKeybindings.keyName || o[14] !== globalExitKeybindings.pending) {
    children = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
          parens: true,
          ...b,
        });
    o[13] = globalExitKeybindings.keyName;
    o[14] = globalExitKeybindings.pending;
    o[15] = children;
  } else children = o[15];
  let D;
  if (o[16] !== children) {
    D = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children,
      }),
    });
    o[16] = children;
    o[17] = D;
  } else D = o[17];
  let P;
  if (o[18] !== isScreenReaderEnabled || o[19] !== C) {
    P =
      !isScreenReaderEnabled &&
      C &&
      jsxProd_default(fo, {
        fallback: jsxProd_default(Text, {
          dimColor: true,
          children: "Generating QR code\u2026",
        }),
        children: jsxProd_default(SessionQrCode, {
          qrLinesPromise: C,
        }),
      });
    o[18] = isScreenReaderEnabled;
    o[19] = C;
    o[20] = P;
  } else P = o[20];
  let v;
  if (o[21] !== l || o[22] !== D || o[23] !== P) {
    v = jsxProd_default_2(CloudSessionPane, {
      isRedesign: false,
      children: [l, D, P],
    });
    o[21] = l;
    o[22] = D;
    o[23] = P;
    o[24] = v;
  } else v = o[24];
  return v;
}
//@ chunk-3rb87ry3.js:7356-7580 placement
function CloudSessionPane(props) {
  let i = w(3);
  let { children } = props;
  let m;
  if (i[0] === MEMO_CACHE_SENTINEL) {
    m = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: "Cloud session",
      }),
    });
    i[0] = m;
  } else m = i[0];
  let o;
  if (i[1] !== children) {
    o = jsxProd_default_2(Pane, {
      children: [m, children],
    });
    i[1] = children;
    i[2] = o;
  } else o = i[2];
  return o;
}
//@ chunk-3rb87ry3.js:7580-7791 placement
function SessionQrCode(props) {
  let m = w(4);
  let { qrLinesPromise } = props;
  let i = Qr(qrLinesPromise);
  if (i.length === 0) {
    return null;
  }
  let children;
  if (m[0] !== i) {
    children = i.map(renderTextLine);
    m[0] = i;
    m[1] = children;
  } else children = m[1];
  let h;
  if (m[2] !== children) {
    h = jsxProd_default(Fragment, {
      children,
    });
    m[2] = children;
    m[3] = h;
  } else h = m[3];
  return h;
}
//@ chunk-3rb87ry3.js:7791-7824 placement
/**
 * /session 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone) =>
  jsxProd_default(SessionQrDialog, {
    onDone,
  });
//@ chunk-7mtn3rbz.js:5404-5422 sole-consumer
var _ = Re(require_utf8(), 1);
//@ chunk-7mtn3rbz.js:5422-5465 sole-consumer
function renderTextLine_2(children, z) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    z,
  );
}
//@ chunk-7mtn3rbz.js:5465-5675 sole-consumer
var CLAUDE_MOBILE_APP_URL = "https://claude.ai/mobile?entrypoint=claude_code_cli";
var CLAUDE_AI_MOBILE = "claude.ai/mobile";
var GET_MOBILE_APP_LABEL = "Get the Claude app on your phone";
var MOBILE_APP_QR_LINES = _.render(
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
//@ chunk-7mtn3rbz.js:5675-7261 fingerprint = SessionInfo (0.309)
function SessionInfo(props) {
  let o = w(25);
  let { onDone } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let K;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    K = isReplBridgeActive()
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
    o[0] = K;
  } else K = o[0];
  let P = K;
  let T;
  if (o[1] === MEMO_CACHE_SENTINEL) {
    T = {
      context: "Confirmation",
    };
    o[1] = T;
  } else T = o[1];
  useKeybinding("confirm:no", onDone, T);
  let remoteSessionUrl = useGlobalExitKeybindings(onDone);
  let B;
  if (o[2] !== onDone) {
    B = function l(event) {
      if (event.key === "q" && !event.ctrl && !event.meta) {
        event.preventDefault();
        onDone();
      }
    };
    o[2] = onDone;
    o[3] = B;
  } else B = o[3];
  let onKeyDown = B;
  let O;
  if (o[4] === MEMO_CACHE_SENTINEL) {
    O = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        bold: true,
        children: GET_MOBILE_APP_LABEL,
      }),
    });
    o[4] = O;
  } else O = o[4];
  const children = isScreenReaderEnabled ? "Visit on your phone: " : "Scan the QR code, or visit ";
  let p;
  if (o[5] !== children) {
    p = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    o[5] = children;
    o[6] = p;
  } else p = o[6];
  let N;
  if (o[7] === MEMO_CACHE_SENTINEL) {
    N = jsxProd_default(Link, {
      url: CLAUDE_MOBILE_APP_URL,
      children: jsxProd_default(Text, {
        color: "ide",
        children: CLAUDE_AI_MOBILE,
      }),
    });
    o[7] = N;
  } else N = o[7];
  let f;
  if (o[8] !== p) {
    f = jsxProd_default_2(Box, {
      children: [p, N],
    });
    o[8] = p;
    o[9] = f;
  } else f = o[9];
  let children_2;
  if (o[10] !== remoteSessionUrl.keyName || o[11] !== remoteSessionUrl.pending) {
    children_2 = remoteSessionUrl.pending
      ? `Press ${remoteSessionUrl.keyName} again to close`
      : jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "close",
          ...stableEmptyObject(false),
        });
    o[10] = remoteSessionUrl.keyName;
    o[11] = remoteSessionUrl.pending;
    o[12] = children_2;
  } else children_2 = o[12];
  let u;
  if (o[13] !== children_2) {
    u = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: children_2,
      }),
    });
    o[13] = children_2;
    o[14] = u;
  } else u = o[14];
  let y;
  if (o[15] !== isScreenReaderEnabled) {
    y = !isScreenReaderEnabled && MOBILE_APP_QR_LINES.map(renderTextLine_2);
    o[15] = isScreenReaderEnabled;
    o[16] = y;
  } else y = o[16];
  let D;
  if (o[17] !== isScreenReaderEnabled) {
    D =
      P &&
      jsxProd_default(Box, {
        marginTop: isScreenReaderEnabled ? 1 : 0,
        children: P,
      });
    o[17] = isScreenReaderEnabled;
    o[18] = D;
  } else D = o[18];
  let Q;
  if (o[19] !== onKeyDown || o[20] !== u || o[21] !== y || o[22] !== D || o[23] !== f) {
    let children = jsxProd_default_2(FocusColumn, {
      onKeyDown,
      children: [O, f, u, y, D],
    });
    Q = jsxProd_default(Pane, {
      children,
    });
    o[19] = onKeyDown;
    o[20] = u;
    o[21] = y;
    o[22] = D;
    o[23] = f;
    o[24] = Q;
  } else Q = o[24];
  return Q;
}
//@ chunk-7mtn3rbz.js:7261-7305 placement
/**
 * /mobile 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function sessionInfoCall(onDone) {
  return jsxProd_default(SessionInfo, {
    onDone,
  });
}
//@ chunk-18hwfzwa.js:795165-795209 fingerprint = _temp (1)
function selectRemoteSessionUrl_2(s) {
  return s.remoteSessionUrl;
}
export { selectRemoteSessionUrl_2 };
