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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME, openInChrome } from "../../utils/claudeInChrome/common.js";
import { useAppState, useAppStateSession } from "../../state/AppState.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { logError } from "../../utils/log.js";
import { getReconnectHandle } from "../../services/mcp/reconnectHandles.js";
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
init_react_production();
//@ chunk-1ztfztfw.js:14185-14189 sole-consumer
init_react_production();
//@ chunk-1ztfztfw.js:14189-16885 sole-consumer
/**
 * /chrome 的浏览器选择面板：列出已连接的浏览器、标记当前配对设备，选择后调用 select_browser。
 */
function BrowserPicker(props) {
  let u = w(41);
  let { chromeClient, onDone } = props;
  let [browsers, setBrowsers] = y(null);
  let [listError, setListError] = y(null);
  let [selecting, setSelecting] = y(false);
  let doneRef = R(false);
  let oe;
  if (u[0] === MEMO_CACHE_SENTINEL) {
    oe = getGlobalConfig().chromeExtension?.pairedDeviceId;
    u[0] = oe;
  } else oe = u[0];
  let pairedDeviceId = oe;
  let Y;
  let ne;
  if (u[1] !== chromeClient) {
    Y = () => {
      doneRef.current = false;
      listConnectedBrowsers(chromeClient)
        .then((le) => {
          if (!doneRef.current) setBrowsers(le);
        })
        .catch((error) => {
          if (isChromeBridgeUnreachable(error)) {
            logFeatureSad("chrome_browser_picker", "bridge_unreachable");
            if (!doneRef.current) setBrowsers([]);
            return;
          }
          logFeatureBad("chrome_browser_picker", "list_failed");
          if (!doneRef.current) setListError(toError(error).message);
        });
      return () => {
        doneRef.current = true;
      };
    };
    ne = [chromeClient];
    u[1] = chromeClient;
    u[2] = Y;
    u[3] = ne;
  } else {
    Y = u[2];
    ne = u[3];
  }
  P(Y, ne);
  let ae;
  if (u[4] !== onDone) {
    ae = function h(Ie) {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      onDone(Ie);
    };
    u[4] = onDone;
    u[5] = ae;
  } else ae = u[5];
  let finish = ae;
  let J;
  if (u[6] !== browsers || u[7] !== chromeClient || u[8] !== finish || u[9] !== selecting) {
    J = function W(v) {
      if (selecting) {
        return;
      }
      setSelecting(true);
      let found = browsers?.find((browser) => browser.deviceId === v);
      selectBrowser(chromeClient, v)
        .then(() => {
          logFeatureOk("chrome_browser_picker");
          finish(found ? `Now using browser "${found.name}" for Chrome actions.` : undefined);
        })
        .catch((error) => {
          logBrowserSwitchFailure(error);
          logForDebugging(`claude-in-chrome select_browser failed: ${toError(error).message}`, {
            level: "error",
          });
          finish(`Couldn't switch browser: ${toError(error).message}`);
        });
    };
    u[6] = browsers;
    u[7] = chromeClient;
    u[8] = finish;
    u[9] = selecting;
    u[10] = J;
  } else J = u[10];
  let selectBrowserById = J;
  if (listError) {
    const children = `Couldn't list connected browsers: ${listError}`;
    let children_2;
    if (u[11] !== children) {
      children_2 = jsxProd_default(Text, {
        color: "error",
        children,
      });
      u[11] = children;
      u[12] = children_2;
    } else children_2 = u[12];
    let I;
    if (u[13] !== finish || u[14] !== children_2) {
      I = jsxProd_default(BackOnlyFrame, {
        onDone: finish,
        children: children_2,
      });
      u[13] = finish;
      u[14] = children_2;
      u[15] = I;
    } else I = u[15];
    return I;
  }
  if (browsers === null) {
    let children;
    if (u[16] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        dimColor: true,
        children: "Looking for connected browsers\u2026",
      });
      u[16] = children;
    } else children = u[16];
    let b;
    if (u[17] !== finish) {
      b = jsxProd_default(BackOnlyFrame, {
        onDone: finish,
        children,
      });
      u[17] = finish;
      u[18] = b;
    } else b = u[18];
    return b;
  }
  if (browsers.length === 0) {
    let children;
    if (u[19] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        children: NO_BROWSERS_CONNECTED_TEXT,
      });
      u[19] = children;
    } else children = u[19];
    let b;
    if (u[20] !== finish) {
      b = jsxProd_default(BackOnlyFrame, {
        onDone: finish,
        children,
      });
      u[20] = finish;
      u[21] = b;
    } else b = u[21];
    return b;
  }
  const children =
    browsers.length === 1
      ? "One browser is connected:"
      : `Choose which browser to use (${browsers.length} connected):`;
  let b;
  if (u[22] !== children) {
    b = jsxProd_default(Text, {
      children,
    });
    u[22] = children;
    u[23] = b;
  } else b = u[23];
  const visibleCount = Math.min(browsers.length, 5);
  let te;
  if (u[24] !== browsers) {
    let A;
    if (u[26] === MEMO_CACHE_SENTINEL) {
      A = (de) => de.deviceId === pairedDeviceId;
      u[26] = A;
    } else A = u[26];
    te = browsers.findIndex(A);
    u[24] = browsers;
    u[25] = te;
  } else te = u[25];
  const defaultFocusIndex = Math.max(0, te);
  let onSelect;
  if (u[27] !== browsers || u[28] !== selectBrowserById) {
    onSelect = (re) => {
      let me = browsers[re];
      if (me) selectBrowserById(me.deviceId);
    };
    u[27] = browsers;
    u[28] = selectBrowserById;
    u[29] = onSelect;
  } else onSelect = u[29];
  let children_2;
  if (u[30] !== browsers) {
    let c;
    if (u[32] === MEMO_CACHE_SENTINEL) {
      c = (k) =>
        jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: k.name,
            icon:
              k.deviceId === pairedDeviceId
                ? jsxProd_default(StatusIcon, {
                    status: "success",
                    "aria-label": "current:",
                  })
                : undefined,
            meta: [k.osPlatform ?? "unknown OS"],
          },
          k.deviceId,
        );
      u[32] = c;
    } else c = u[32];
    children_2 = browsers.map(c);
    u[30] = browsers;
    u[31] = children_2;
  } else children_2 = u[31];
  let c;
  if (u[33] !== defaultFocusIndex || u[34] !== onSelect || u[35] !== children_2 || u[36] !== visibleCount) {
    c = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      onSelect,
      children: children_2,
    });
    u[33] = defaultFocusIndex;
    u[34] = onSelect;
    u[35] = children_2;
    u[36] = visibleCount;
    u[37] = c;
  } else c = u[37];
  let B;
  if (u[38] !== c || u[39] !== b) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [b, c],
    });
    u[38] = c;
    u[39] = b;
    u[40] = B;
  } else B = u[40];
  return B;
}
//@ chunk-1ztfztfw.js:16885-17242 sole-consumer
/**
 * 内容下方只带一个“Back”选项的外框。
 */
function BackOnlyFrame(props) {
  let o = w(6);
  let { onDone, children } = props;
  let options;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        value: "back",
        label: "\u2039 Back",
      },
    ];
    o[0] = options;
  } else options = o[0];
  let x;
  if (o[1] !== onDone) {
    x = jsxProd_default(ModelSelector, {
      options,
      onChange: () => onDone(),
      onCancel: () => onDone(),
      hideIndexes: true,
    });
    o[1] = onDone;
    o[2] = x;
  } else x = o[2];
  let V;
  if (o[3] !== children || o[4] !== x) {
    V = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [children, x],
    });
    o[3] = children;
    o[4] = x;
    o[5] = V;
  } else V = o[5];
  return V;
}
//@ chunk-1ztfztfw.js:17242-17515 sole-consumer
/**
 * Claude in Chrome MCP 服务器状态：connected/connecting/disabled/failed/absent。
 */
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
};
var CHROME_NEEDS_CLAUDE_AI_NOTICE = {
  text: "Claude in Chrome needs a claude.ai account sign-in, and this session uses an API key or a long-lived token, such as one from claude setup-token. Run /login, then exit, unset CLAUDE_CODE_OAUTH_TOKEN if it is set, and start Claude Code again with claude --chrome.",
  color: "warning",
};
var CHROME_DISABLED_IN_MCP_NOTICE = {
  text: "Claude in Chrome is turned off in /mcp. Open /mcp, select claude-in-chrome, and enable it.",
  color: "warning",
};
//@ chunk-1ztfztfw.js:18155-22310 fingerprint = ClaudeInChromeMenu (0.467)
function ClaudeInChromeMenu({ onDone, isExtensionInstalled, configEnabled, isClaudeAISubscriber, isWSL }) {
  let x = useAppState((a) => a.mcp.clients);
  let { storageV5 } = useTheme_2();
  let [K, F] = y(0);
  let [D, u] = y(configEnabled ?? false);
  let [oe, X] = y(false);
  let [Y, ne] = y(isExtensionInstalled);
  let [le, z] = y("menu");
  let ae = false;
  let Ie = false;
  let found = x.find((a) => a.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && a.type === "connected");
  let J = found !== undefined;
  let chromeMcpConnectionState = getChromeMcpConnectionState(x);
  let [Q, E] = y(null);
  let U = R(false);
  let mcpClients = R(true);
  P(
    () => () => {
      mcpClients.current = false;
    },
    [],
  );
  let appStateSession = useAppStateSession();
  let pairedDeviceName = getGlobalConfig().chromeExtension?.pairedDeviceName;
  function I(a) {
    openInChrome(a).catch(logError);
  }
  async function te() {
    let reconnectHandle = getReconnectHandle();
    if (!reconnectHandle) {
      E({
        text: "Reconnect isn't available from this view. Open /mcp, select claude-in-chrome, and choose Reconnect.",
        color: "warning",
      });
      return;
    }
    let c = {
      persistsOffBox: isBridgeOrTransport(appStateSession),
      config: x.find((B) => B.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME)?.config,
    };
    let k =
      ' Select "Reconnect extension" to try again, or open /mcp and select claude-in-chrome for details.';
    U.current = true;
    E({
      text: "Reconnecting\u2026",
      color: "warning",
    });
    try {
      let B = await reconnectHandle(CLAUDE_IN_CHROME_MCP_SERVER_NAME);
      let { message, success } = handleReconnectResult(B, CLAUDE_IN_CHROME_MCP_SERVER_NAME, c);
      if (!mcpClients.current) return;
      if (success) {
        I(CHROME_EXTENSION_RECONNECT_URL);
        onDone(
          `${message} Its browser tools are back in this session. If a browser action still doesn't work, check that Chrome is open and the extension is signed in.`,
        );
      } else
        E({
          text: message + k,
          color: "error",
        });
    } catch (error) {
      E({
        text:
          handleReconnectError(error, CLAUDE_IN_CHROME_MCP_SERVER_NAME, c) +
          (error instanceof WireSafeControlError ? "" : k),
        color: "error",
      });
    } finally {
      U.current = false;
    }
  }
  function A() {
    if (chromeMcpConnectionState === "disabled") {
      E(CHROME_DISABLED_IN_MCP_NOTICE);
      return;
    }
    let chromeServerPolicyRefusal = getChromeServerPolicyRefusal();
    if (chromeServerPolicyRefusal) {
      E({
        text: chromeServerPolicyRefusal,
        color: "warning",
      });
      return;
    }
    if (chromeMcpConnectionState === "absent") {
      E(canAuthenticateChromeBridge() ? CHROME_NOT_ENABLED_NOTICE : CHROME_NEEDS_CLAUDE_AI_NOTICE);
      return;
    }
    te();
  }
  function handleAction(action) {
    switch (action) {
      case "install-extension":
        F((c) => c + 1);
        X(true);
        I(HTTPS_CLAUDE_AI_CHROME);
        break;
      case "reconnect":
        F((url) => url + 1);
        isChromeExtensionInstalled()
          .then((installed) => {
            ne(installed);
            if (installed) X(false);
          })
          .catch(logError);
        if (U.current) break;
        if (chromeMcpConnectionState === "connected" || chromeMcpConnectionState === "connecting") {
          E(null);
          I(CHROME_EXTENSION_RECONNECT_URL);
        } else A();
        break;
      case "manage-permissions":
        F((installed_0) => installed_0 + 1);
        I(CHROME_PERMISSIONS_URL_2);
        break;
      case "toggle-default": {
        let newValue = !D;
        saveGlobalConfig(
          (current) => ({
            ...current,
            claudeInChromeDefaultEnabled: newValue,
          }),
          storageV5,
        );
        u(newValue);
        break;
      }
      case "select-browser":
        z("select-browser");
        break;
    }
  }
  let _ = [];
  let requiresExtensionSuffix = Y ? "" : " (requires extension)";
  if (!Y)
    _.push({
      label: "Install Chrome extension",
      value: "install-extension",
    });
  if (J)
    _.push({
      label: "Select browser\u2026",
      value: "select-browser",
    });
  _.push(
    {
      label: jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            children: "Manage permissions",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: requiresExtensionSuffix,
          }),
        ],
      }),
      value: "manage-permissions",
    },
    {
      label: jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Text, {
            children: "Reconnect extension",
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: requiresExtensionSuffix,
          }),
        ],
      }),
      value: "reconnect",
    },
    {
      label: `Enabled by default: ${D ? "Yes" : "No"}`,
      value: "toggle-default",
    },
  );
  return jsxProd_default(Dialog, {
    title: "Claude in Chrome",
    onCancel: () => onDone(),
    color: "chromeYellow",
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default(Text, {
          children:
            "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. Navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
        }),
        isWSL &&
          jsxProd_default(Text, {
            color: "error",
            children: "Claude in Chrome is not supported in WSL at this time.",
          }),
        false,
        !isClaudeAISubscriber &&
          jsxProd_default(Text, {
            color: "error",
            children: "Claude in Chrome requires a claude.ai subscription.",
          }),
        !(isWSL || !isClaudeAISubscriber) &&
          jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                children: [
                  jsxProd_default_2(Text, {
                    children: [
                      "Status:",
                      " ",
                      chromeMcpConnectionState === "connected"
                        ? jsxProd_default(Text, {
                            color: "success",
                            children: "Enabled",
                          })
                        : chromeMcpConnectionState === "connecting"
                          ? jsxProd_default(Text, {
                              color: "warning",
                              children: "Connecting\u2026",
                            })
                          : chromeMcpConnectionState === "failed"
                            ? jsxProd_default(Text, {
                                color: "warning",
                                children: "Not connected",
                              })
                            : chromeMcpConnectionState === "disabled"
                              ? jsxProd_default(Text, {
                                  color: "inactive",
                                  children: "Turned off in /mcp",
                                })
                              : jsxProd_default(Text, {
                                  color: "inactive",
                                  children: "Not enabled in this session",
                                }),
                    ],
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      "Extension:",
                      " ",
                      Y
                        ? jsxProd_default(Text, {
                            color: "success",
                            children: "Installed",
                          })
                        : jsxProd_default(Text, {
                            color: "warning",
                            children: "Not detected",
                          }),
                    ],
                  }),
                  J && pairedDeviceName
                    ? jsxProd_default_2(Text, {
                        children: [
                          "Browser: ",
                          jsxProd_default(Text, {
                            color: "success",
                            children: pairedDeviceName,
                          }),
                        ],
                      })
                    : null,
                ],
              }),
              le === "select-browser" && found
                ? jsxProd_default(BrowserPicker, {
                    chromeClient: found,
                    onDone: (a) => {
                      z("menu");
                      F((c) => c + 1);
                      if (a) onDone(a);
                    },
                  })
                : jsxProd_default(
                    ModelSelector,
                    {
                      options: _,
                      onChange: handleAction,
                      hideIndexes: true,
                    },
                    K,
                  ),
              Q &&
                jsxProd_default(Text, {
                  color: Q.color,
                  children: Q.text,
                }),
              oe &&
                jsxProd_default_2(Text, {
                  color: "warning",
                  children: ["Once installed, select ", '"Reconnect extension"', " to connect."],
                }),
              jsxProd_default_2(Text, {
                children: [
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: "Usage: ",
                  }),
                  jsxProd_default(Text, {
                    children: "claude --chrome",
                  }),
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: " or ",
                  }),
                  jsxProd_default(Text, {
                    children: "claude --no-chrome",
                  }),
                ],
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children:
                  "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on.",
              }),
            ],
          }),
        jsxProd_default(LearnMoreLink, {
          url: "https://code.claude.com/docs/en/chrome",
        }),
      ],
    }),
  });
}
//@ chunk-1ztfztfw.js:22310-22640 fingerprint = call (0.872)
/**
 * /chrome 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async function (onDone) {
  let isExtensionInstalled = await isChromeExtensionInstalled().catch((error) => {
    logForDebugging(
      `[Claude in Chrome] Extension detection failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return false;
  });
  let config = getGlobalConfig();
  let isSubscriber = isClaudeAISubscriber();
  let isWSL = env.isWslEnvironment();
  return jsxProd_default(ClaudeInChromeMenu, {
    onDone,
    isExtensionInstalled,
    configEnabled: config.claudeInChromeDefaultEnabled,
    isClaudeAISubscriber: isSubscriber,
    isWSL,
  });
};
//@ chunk-18hwfzwa.js:121042-121093 fingerprint = _temp (1)
function useIdeConnectionStatusValue(s) {
  return useIdeConnectionStatus(s.mcp.clients).status;
}
//@ chunk-hthm3h8y.js:5518-5561 fingerprint = CHROME_PERMISSIONS_URL (1)
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions";
//@ chunk-s61vbvea.js:505261-505333 fingerprint = CHROME_EXTENSION_URL (0.667)
var HTTPS_CLAUDE_AI_CHROME = "https://claude.ai/chrome";
var FCOEOABGFENEJGLBFFODGKKBKCDHCGFN = "fcoeoabgfenejglbffodgkkbkcdhcgfn";
export {
  useIdeConnectionStatusValue,
  HTTPS_CLAUDE_AI_CHROME,
  CHROME_PERMISSIONS_URL,
  FCOEOABGFENEJGLBFFODGKKBKCDHCGFN,
};
