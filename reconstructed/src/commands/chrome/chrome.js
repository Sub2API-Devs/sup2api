/**
 * commands/chrome/chrome.tsx
 *
 * /chrome 实现：Claude in Chrome 设置面板与连接状态提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/chrome/chrome.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-1ztfztfw.js (8), chunk-hthm3h8y.js (1), chunk-s61vbvea.js (1)
 * attribution: fingerprint 5, sole-consumer 5, affinity 1
 */
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  listConnectedBrowsers,
  isChromeBridgeUnreachable,
  selectBrowser,
  logBrowserSwitchFailure,
  NO_BROWSERS_CONNECTED_TEXT,
} from "../../utils/claudeInChrome/browserPicker.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { toError, WireSafeControlError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME, openInChrome } from "../../utils/claudeInChrome/common.js";
import { useAppState, useAppStateSession } from "../../state/AppState.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { logError } from "../../utils/log.js";
import { Iyt } from "../../services/mcp/reconnectHandles.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { handleReconnectResult, handleReconnectError } from "../../components/mcp/utils/reconnectHelpers.js";
import {
  CHROME_EXTENSION_RECONNECT_URL,
  isChromeExtensionInstalled,
} from "../../utils/claudeInChrome/setup.js";
import { getChromeServerPolicyRefusal } from "../../utils/claudeInChrome/serverPolicy.js";
import { canAuthenticateChromeBridge, isClaudeAISubscriber } from "../../utils/auth.js";
import { CHROME_PERMISSIONS_URL as CHROME_PERMISSIONS_URL_2 } from "./chromeDialogResponse.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { LearnMoreLink } from "../../components/LearnMoreLink.js";
import { env } from "../../utils/env.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";

//@ chunk-1ztfztfw.js:14181-14185 sole-consumer
j();
//@ chunk-1ztfztfw.js:14185-14189 sole-consumer
j();
/**
 * /chrome 的浏览器选择面板：列出已连接的浏览器、标记当前配对设备，选择后调用 select_browser。
 */
//@ chunk-1ztfztfw.js:14189-16885 sole-consumer
function BrowserPicker(T) {
  let u = w(41),
    { chromeClient: chromeClient, onDone: onDone } = T,
    [browsers, setBrowsers] = y(null),
    [listError, setListError] = y(null),
    [selecting, setSelecting] = y(!1),
    doneRef = R(!1),
    oe;
  if (u[0] === MEMO_CACHE_SENTINEL) ((oe = getGlobalConfig().chromeExtension?.pairedDeviceId), (u[0] = oe));
  else oe = u[0];
  let pairedDeviceId = oe,
    Y,
    ne;
  if (u[1] !== chromeClient)
    ((Y = () => (
      (doneRef.current = !1),
      listConnectedBrowsers(chromeClient)
        .then((le) => {
          if (!doneRef.current) setBrowsers(le);
        })
        .catch((z) => {
          if (isChromeBridgeUnreachable(z)) {
            if ((logFeatureSad("chrome_browser_picker", "bridge_unreachable"), !doneRef.current))
              setBrowsers([]);
            return;
          }
          if ((logFeatureBad("chrome_browser_picker", "list_failed"), !doneRef.current))
            setListError(toError(z).message);
        }),
      () => {
        doneRef.current = !0;
      }
    )),
      (ne = [chromeClient]),
      (u[1] = chromeClient),
      (u[2] = Y),
      (u[3] = ne));
  else ((Y = u[2]), (ne = u[3]));
  P(Y, ne);
  let ae;
  if (u[4] !== onDone)
    ((ae = function h(Ie) {
      if (doneRef.current) {
        return;
      }
      ((doneRef.current = !0), onDone(Ie));
    }),
      (u[4] = onDone),
      (u[5] = ae));
  else ae = u[5];
  let finish = ae,
    J;
  if (u[6] !== browsers || u[7] !== chromeClient || u[8] !== finish || u[9] !== selecting)
    ((J = function W(v) {
      if (selecting) {
        return;
      }
      setSelecting(!0);
      let E = browsers?.find((Q) => Q.deviceId === v);
      selectBrowser(chromeClient, v)
        .then(() => {
          (logFeatureOk("chrome_browser_picker"),
            finish(E ? `Now using browser "${E.name}" for Chrome actions.` : void 0));
        })
        .catch((U) => {
          (logBrowserSwitchFailure(U),
            logForDebugging(`claude-in-chrome select_browser failed: ${toError(U).message}`, {
              level: "error",
            }),
            finish(`Couldn't switch browser: ${toError(U).message}`));
        });
    }),
      (u[6] = browsers),
      (u[7] = chromeClient),
      (u[8] = finish),
      (u[9] = selecting),
      (u[10] = J));
  else J = u[10];
  let selectBrowserById = J;
  if (listError) {
    const C = `Couldn't list connected browsers: ${listError}`;
    let b;
    if (u[11] !== C) ((b = e(Text, { color: "error", children: C })), (u[11] = C), (u[12] = b));
    else b = u[12];
    let I;
    if (u[13] !== finish || u[14] !== b)
      ((I = e(BackOnlyFrame, { onDone: finish, children: b })), (u[13] = finish), (u[14] = b), (u[15] = I));
    else I = u[15];
    return I;
  }
  if (browsers === null) {
    let C;
    if (u[16] === MEMO_CACHE_SENTINEL)
      ((C = e(Text, { dimColor: !0, children: "Looking for connected browsers\u2026" })), (u[16] = C));
    else C = u[16];
    let b;
    if (u[17] !== finish)
      ((b = e(BackOnlyFrame, { onDone: finish, children: C })), (u[17] = finish), (u[18] = b));
    else b = u[18];
    return b;
  }
  if (browsers.length === 0) {
    let C;
    if (u[19] === MEMO_CACHE_SENTINEL) ((C = e(Text, { children: NO_BROWSERS_CONNECTED_TEXT })), (u[19] = C));
    else C = u[19];
    let b;
    if (u[20] !== finish)
      ((b = e(BackOnlyFrame, { onDone: finish, children: C })), (u[20] = finish), (u[21] = b));
    else b = u[21];
    return b;
  }
  const C =
    browsers.length === 1
      ? "One browser is connected:"
      : `Choose which browser to use (${browsers.length} connected):`;
  let b;
  if (u[22] !== C) ((b = e(Text, { children: C })), (u[22] = C), (u[23] = b));
  else b = u[23];
  const min = Math.min(browsers.length, 5);
  let te;
  if (u[24] !== browsers) {
    let A;
    if (u[26] === MEMO_CACHE_SENTINEL) ((A = (de) => de.deviceId === pairedDeviceId), (u[26] = A));
    else A = u[26];
    te = browsers.findIndex(A);
    ((u[24] = browsers), (u[25] = te));
  } else te = u[25];
  const max = Math.max(0, te);
  let _;
  if (u[27] !== browsers || u[28] !== selectBrowserById)
    ((_ = (re) => {
      let me = browsers[re];
      if (me) selectBrowserById(me.deviceId);
    }),
      (u[27] = browsers),
      (u[28] = selectBrowserById),
      (u[29] = _));
  else _ = u[29];
  let a;
  if (u[30] !== browsers) {
    let c;
    if (u[32] === MEMO_CACHE_SENTINEL)
      ((c = (k) =>
        e(
          OrderedListWithItem.Item,
          {
            label: k.name,
            icon:
              k.deviceId === pairedDeviceId
                ? e(StatusIcon, { status: "success", "aria-label": "current:" })
                : void 0,
            meta: [k.osPlatform ?? "unknown OS"],
          },
          k.deviceId,
        )),
        (u[32] = c));
    else c = u[32];
    a = browsers.map(c);
    ((u[30] = browsers), (u[31] = a));
  } else a = u[31];
  let c;
  if (u[33] !== max || u[34] !== _ || u[35] !== a || u[36] !== min)
    ((c = e(OrderedListWithItem, { visibleCount: min, defaultFocusIndex: max, onSelect: _, children: a })),
      (u[33] = max),
      (u[34] = _),
      (u[35] = a),
      (u[36] = min),
      (u[37] = c));
  else c = u[37];
  let B;
  if (u[38] !== c || u[39] !== b)
    ((B = r(Box, { flexDirection: "column", gap: 1, children: [b, c] })),
      (u[38] = c),
      (u[39] = b),
      (u[40] = B));
  else B = u[40];
  return B;
}
/**
 * 内容下方只带一个“Back”选项的外框。
 */
//@ chunk-1ztfztfw.js:16885-17242 sole-consumer
function BackOnlyFrame(T) {
  let o = w(6),
    { onDone: onDone, children: children } = T,
    O;
  if (o[0] === MEMO_CACHE_SENTINEL) ((O = [{ value: "back", label: "\u2039 Back" }]), (o[0] = O));
  else O = o[0];
  let x;
  if (o[1] !== onDone)
    ((x = e(ModelSelector, {
      options: O,
      onChange: () => onDone(),
      onCancel: () => onDone(),
      hideIndexes: !0,
    })),
      (o[1] = onDone),
      (o[2] = x));
  else x = o[2];
  let V;
  if (o[3] !== children || o[4] !== x)
    ((V = r(Box, { flexDirection: "column", gap: 1, children: [children, x] })),
      (o[3] = children),
      (o[4] = x),
      (o[5] = V));
  else V = o[5];
  return V;
}
/**
 * Claude in Chrome MCP 服务器状态：connected/connecting/disabled/failed/absent。
 */
//@ chunk-1ztfztfw.js:17242-17515 sole-consumer
function getChromeMcpConnectionState(T) {
  let filtered = T.filter((p) => p.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME);
  if (filtered.some((p) => p.type === "connected" || p.type === "cached")) return "connected";
  if (filtered.some((p) => p.type === "pending")) return "connecting";
  if (filtered.some((p) => p.type === "disabled")) return "disabled";
  if (filtered.length > 0) return "failed";
  return "absent";
}
//@ chunk-1ztfztfw.js:17515-18155 affinity
var CHROME_NOT_ENABLED_NOTICE = {
    text: "Claude in Chrome is not enabled in this session, so reconnecting cannot add its browser tools. Exit and start Claude Code again with claude --chrome (add --resume to pick this conversation back up).",
    color: "warning",
  },
  CHROME_NEEDS_CLAUDE_AI_NOTICE = {
    text: "Claude in Chrome needs a claude.ai account sign-in, and this session uses an API key or a long-lived token, such as one from claude setup-token. Run /login, then exit, unset CLAUDE_CODE_OAUTH_TOKEN if it is set, and start Claude Code again with claude --chrome.",
    color: "warning",
  },
  CHROME_DISABLED_IN_MCP_NOTICE = {
    text: "Claude in Chrome is turned off in /mcp. Open /mcp, select claude-in-chrome, and enable it.",
    color: "warning",
  };
//@ chunk-1ztfztfw.js:18155-22310 fingerprint = ClaudeInChromeMenu (0.467)
function ClaudeInChromeMenu({
  onDone: onDone,
  isExtensionInstalled: isExtensionInstalled,
  configEnabled: configEnabled,
  isClaudeAISubscriber: isClaudeAISubscriber,
  isWSL: isWSL,
}) {
  let x = useAppState((a) => a.mcp.clients),
    { storageV5: storageV5 } = Me(),
    [K, F] = y(0),
    [D, u] = y(configEnabled ?? !1),
    [oe, X] = y(!1),
    [Y, ne] = y(isExtensionInstalled),
    [le, z] = y("menu"),
    ae = !1,
    Ie = !1,
    found = x.find((a) => a.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && a.type === "connected"),
    J = found !== void 0,
    v = getChromeMcpConnectionState(x),
    [Q, E] = y(null),
    U = R(!1),
    mcpClients = R(!0);
  P(
    () => () => {
      mcpClients.current = !1;
    },
    [],
  );
  let C = useAppStateSession(),
    b = getGlobalConfig().chromeExtension?.pairedDeviceName;
  function I(a) {
    openInChrome(a).catch(logError);
  }
  async function te() {
    let a = Iyt();
    if (!a) {
      E({
        text: "Reconnect isn't available from this view. Open /mcp, select claude-in-chrome, and choose Reconnect.",
        color: "warning",
      });
      return;
    }
    let c = {
        persistsOffBox: isBridgeOrTransport(C),
        config: x.find((B) => B.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME)?.config,
      },
      k = ' Select "Reconnect extension" to try again, or open /mcp and select claude-in-chrome for details.';
    ((U.current = !0), E({ text: "Reconnecting\u2026", color: "warning" }));
    try {
      let B = await a(CLAUDE_IN_CHROME_MCP_SERVER_NAME),
        { message: message, success: success } = handleReconnectResult(
          B,
          CLAUDE_IN_CHROME_MCP_SERVER_NAME,
          c,
        );
      if (!mcpClients.current) return;
      if (success)
        (I(CHROME_EXTENSION_RECONNECT_URL),
          onDone(
            `${message} Its browser tools are back in this session. If a browser action still doesn't work, check that Chrome is open and the extension is signed in.`,
          ));
      else E({ text: message + k, color: "error" });
    } catch (error) {
      E({
        text:
          handleReconnectError(error, CLAUDE_IN_CHROME_MCP_SERVER_NAME, c) +
          (error instanceof WireSafeControlError ? "" : k),
        color: "error",
      });
    } finally {
      U.current = !1;
    }
  }
  function A() {
    if (v === "disabled") {
      E(CHROME_DISABLED_IN_MCP_NOTICE);
      return;
    }
    let a = getChromeServerPolicyRefusal();
    if (a) {
      E({ text: a, color: "warning" });
      return;
    }
    if (v === "absent") {
      E(canAuthenticateChromeBridge() ? CHROME_NOT_ENABLED_NOTICE : CHROME_NEEDS_CLAUDE_AI_NOTICE);
      return;
    }
    te();
  }
  function de(a) {
    switch (a) {
      case "install-extension":
        (F((c) => c + 1), X(!0), I(HTTPS_CLAUDE_AI_CHROME));
        break;
      case "reconnect":
        if (
          (F((url) => url + 1),
          isChromeExtensionInstalled()
            .then((action) => {
              if ((ne(action), action)) X(!1);
            })
            .catch(logError),
          U.current)
        )
          break;
        if (v === "connected" || v === "connecting") (E(null), I(CHROME_EXTENSION_RECONNECT_URL));
        else A();
        break;
      case "manage-permissions":
        (F((installed_0) => installed_0 + 1), I(CHROME_PERMISSIONS_URL_2));
        break;
      case "toggle-default": {
        let newValue = !D;
        (saveGlobalConfig((current) => ({ ...current, claudeInChromeDefaultEnabled: newValue }), storageV5),
          u(newValue));
        break;
      }
      case "select-browser":
        z("select-browser");
        break;
    }
  }
  let _ = [],
    requiresExtensionSuffix = Y ? "" : " (requires extension)";
  if (!Y) _.push({ label: "Install Chrome extension", value: "install-extension" });
  if (J) _.push({ label: "Select browser\u2026", value: "select-browser" });
  return (
    _.push(
      {
        label: r(Fragment, {
          children: [
            e(Text, { children: "Manage permissions" }),
            e(Text, { dimColor: !0, children: requiresExtensionSuffix }),
          ],
        }),
        value: "manage-permissions",
      },
      {
        label: r(Fragment, {
          children: [
            e(Text, { children: "Reconnect extension" }),
            e(Text, { dimColor: !0, children: requiresExtensionSuffix }),
          ],
        }),
        value: "reconnect",
      },
      { label: `Enabled by default: ${D ? "Yes" : "No"}`, value: "toggle-default" },
    ),
    e(Dialog, {
      title: "Claude in Chrome",
      onCancel: () => onDone(),
      color: "chromeYellow",
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          e(Text, {
            children:
              "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. Navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
          }),
          isWSL &&
            e(Text, { color: "error", children: "Claude in Chrome is not supported in WSL at this time." }),
          !1,
          !isClaudeAISubscriber &&
            e(Text, { color: "error", children: "Claude in Chrome requires a claude.ai subscription." }),
          !(isWSL || !isClaudeAISubscriber) &&
            r(Fragment, {
              children: [
                r(Box, {
                  flexDirection: "column",
                  children: [
                    r(Text, {
                      children: [
                        "Status:",
                        " ",
                        v === "connected"
                          ? e(Text, { color: "success", children: "Enabled" })
                          : v === "connecting"
                            ? e(Text, { color: "warning", children: "Connecting\u2026" })
                            : v === "failed"
                              ? e(Text, { color: "warning", children: "Not connected" })
                              : v === "disabled"
                                ? e(Text, { color: "inactive", children: "Turned off in /mcp" })
                                : e(Text, { color: "inactive", children: "Not enabled in this session" }),
                      ],
                    }),
                    r(Text, {
                      children: [
                        "Extension:",
                        " ",
                        Y
                          ? e(Text, { color: "success", children: "Installed" })
                          : e(Text, { color: "warning", children: "Not detected" }),
                      ],
                    }),
                    J && b
                      ? r(Text, { children: ["Browser: ", e(Text, { color: "success", children: b })] })
                      : null,
                  ],
                }),
                le === "select-browser" && found
                  ? e(BrowserPicker, {
                      chromeClient: found,
                      onDone: (a) => {
                        if ((z("menu"), F((c) => c + 1), a)) onDone(a);
                      },
                    })
                  : e(ModelSelector, { options: _, onChange: de, hideIndexes: !0 }, K),
                Q && e(Text, { color: Q.color, children: Q.text }),
                oe &&
                  r(Text, {
                    color: "warning",
                    children: ["Once installed, select ", '"Reconnect extension"', " to connect."],
                  }),
                r(Text, {
                  children: [
                    e(Text, { dimColor: !0, children: "Usage: " }),
                    e(Text, { children: "claude --chrome" }),
                    e(Text, { dimColor: !0, children: " or " }),
                    e(Text, { children: "claude --no-chrome" }),
                  ],
                }),
                e(Text, {
                  dimColor: !0,
                  children:
                    "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on.",
                }),
              ],
            }),
          e(LearnMoreLink, { url: "https://code.claude.com/docs/en/chrome" }),
        ],
      }),
    })
  );
}
/**
 * /chrome 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-1ztfztfw.js:22310-22640 fingerprint = call (0.872)
var call = async function (onDone) {
  let d = await isChromeExtensionInstalled().catch(
      (x) => (
        logForDebugging(
          `[Claude in Chrome] Extension detection failed: ${x instanceof Error ? x.message : String(x)}`,
          { level: "error" },
        ),
        !1
      ),
    ),
    config = getGlobalConfig(),
    isSubscriber = isClaudeAISubscriber(),
    isWSL = env.isWslEnvironment();
  return e(ClaudeInChromeMenu, {
    onDone: onDone,
    isExtensionInstalled: d,
    configEnabled: config.claudeInChromeDefaultEnabled,
    isClaudeAISubscriber: isSubscriber,
    isWSL: isWSL,
  });
};
//@ chunk-18hwfzwa.js:121042-121093 fingerprint = _temp (1)
function $Et(s) {
  return useIdeConnectionStatus(s.mcp.clients).status;
}
//@ chunk-hthm3h8y.js:5518-5561 fingerprint = CHROME_PERMISSIONS_URL (1)
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions";
//@ chunk-s61vbvea.js:505261-505333 fingerprint = CHROME_EXTENSION_URL (0.667)
var HTTPS_CLAUDE_AI_CHROME = "https://claude.ai/chrome",
  FCOEOABGFENEJGLBFFODGKKBKCDHCGFN = "fcoeoabgfenejglbffodgkkbkcdhcgfn";

export { $Et, HTTPS_CLAUDE_AI_CHROME, CHROME_PERMISSIONS_URL, FCOEOABGFENEJGLBFFODGKKBKCDHCGFN };
