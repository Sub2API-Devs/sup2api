/**
 * commands/chrome/chrome.tsx
 *
 * /chrome 实现：Claude in Chrome 设置面板与连接状态提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/chrome/chrome.tsx
 * pieces: chunk-7bp1kqcq.js (8), chunk-7jxyna5q.js (1), chunk-9kwkaaet.js (1), chunk-czq1j3j2.js (1)
 * attribution: sole-consumer 5, affinity 1, fingerprint 5
 */
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import {
  codeModeHidesToolNamesFromApi,
  offInCodeModeToast,
  offInCodeModeNotice,
} from "../../utils/codeMode.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:422364-422436 fingerprint (2.1.88 match: CHROME_EXTENSION_URL, 0.667)
var HTTPS_CLAUDE_AI_CHROME = "https://claude.ai/chrome";
var FCOEOABGFENEJGLBFFODGKKBKCDHCGFN = "fcoeoabgfenejglbffodgkkbkcdhcgfn";
//@ chunk-9kwkaaet.js:5855-5898 fingerprint (2.1.88 match: CHROME_PERMISSIONS_URL, 1)
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions";
//@ chunk-czq1j3j2.js:122043-122094 fingerprint (2.1.88 match: _temp, 1)
function useIdeConnectionStatusValue(s) {
  return useIdeConnectionStatus(s.mcp.clients).status;
}
//@ chunk-7bp1kqcq.js:15382-15386 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7bp1kqcq.js:15382", () => {
  init_react_production();
});
//@ chunk-7bp1kqcq.js:15386-15390 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7bp1kqcq.js:15386", () => {
  init_react_production();
});
//@ chunk-7bp1kqcq.js:15390-18086 sole-consumer
/**
 * /chrome 的浏览器选择面板：列出已连接的浏览器、标记当前配对设备，选择后调用 select_browser。
 */
function BrowserPicker(props) {
  let $ = useMemoCache(41);
  let { chromeClient, onDone } = props;
  let [browsers, setBrowsers] = useState(null);
  let [listError, setListError] = useState(null);
  let [selecting, setSelecting] = useState(false);
  let doneRef = useRef(false);
  let pairedDeviceId;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    pairedDeviceId = getGlobalConfig().chromeExtension?.pairedDeviceId;
    $[0] = pairedDeviceId;
  } else pairedDeviceId = $[0];
  let pairedDeviceId_2 = pairedDeviceId;
  let loadEffect;
  let deps;
  if ($[1] !== chromeClient) {
    loadEffect = () => {
      doneRef.current = false;
      listConnectedBrowsers(chromeClient)
        .then((list) => {
          if (!doneRef.current) setBrowsers(list);
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
    deps = [chromeClient];
    $[1] = chromeClient;
    $[2] = loadEffect;
    $[3] = deps;
  } else {
    loadEffect = $[2];
    deps = $[3];
  }
  useEffect(loadEffect, deps);
  let finish;
  if ($[4] !== onDone) {
    finish = function onSelectFinish(message) {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      onDone(message);
    };
    $[4] = onDone;
    $[5] = finish;
  } else finish = $[5];
  let finish_2 = finish;
  let selectById;
  if ($[6] !== browsers || $[7] !== chromeClient || $[8] !== finish_2 || $[9] !== selecting) {
    selectById = function selectByDevice(deviceId) {
      if (selecting) {
        return;
      }
      setSelecting(true);
      let found = browsers?.find((browser) => browser.deviceId === deviceId);
      selectBrowser(chromeClient, deviceId)
        .then(() => {
          logFeatureOk("chrome_browser_picker");
          finish_2(found ? `Now using browser "${found.name}" for Chrome actions.` : undefined);
        })
        .catch((error) => {
          logBrowserSwitchFailure(error);
          logForDebugging(`claude-in-chrome select_browser failed: ${toError(error).message}`, {
            level: "error",
          });
          finish_2(`Couldn't switch browser: ${toError(error).message}`);
        });
    };
    $[6] = browsers;
    $[7] = chromeClient;
    $[8] = finish_2;
    $[9] = selecting;
    $[10] = selectById;
  } else selectById = $[10];
  let selectBrowserById = selectById;
  if (listError) {
    const children = `Couldn't list connected browsers: ${listError}`;
    let children_2;
    if ($[11] !== children) {
      children_2 = jsxProd_default(Text, {
        color: "error",
        children,
      });
      $[11] = children;
      $[12] = children_2;
    } else children_2 = $[12];
    let errorFrame;
    if ($[13] !== finish_2 || $[14] !== children_2) {
      errorFrame = jsxProd_default(BackOnlyFrame, {
        onDone: finish_2,
        children: children_2,
      });
      $[13] = finish_2;
      $[14] = children_2;
      $[15] = errorFrame;
    } else errorFrame = $[15];
    return errorFrame;
  }
  if (browsers === null) {
    let children;
    if ($[16] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        dimColor: true,
        children: "Looking for connected browsers\u2026",
      });
      $[16] = children;
    } else children = $[16];
    let loadingFrame;
    if ($[17] !== finish_2) {
      loadingFrame = jsxProd_default(BackOnlyFrame, {
        onDone: finish_2,
        children,
      });
      $[17] = finish_2;
      $[18] = loadingFrame;
    } else loadingFrame = $[18];
    return loadingFrame;
  }
  if (browsers.length === 0) {
    let children;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        children: NO_BROWSERS_CONNECTED_TEXT,
      });
      $[19] = children;
    } else children = $[19];
    let emptyFrame;
    if ($[20] !== finish_2) {
      emptyFrame = jsxProd_default(BackOnlyFrame, {
        onDone: finish_2,
        children,
      });
      $[20] = finish_2;
      $[21] = emptyFrame;
    } else emptyFrame = $[21];
    return emptyFrame;
  }
  const children =
    browsers.length === 1
      ? "One browser is connected:"
      : `Choose which browser to use (${browsers.length} connected):`;
  let title;
  if ($[22] !== children) {
    title = jsxProd_default(Text, {
      children,
    });
    $[22] = children;
    $[23] = title;
  } else title = $[23];
  const visibleCount = Math.min(browsers.length, 5);
  let focusIndex;
  if ($[24] !== browsers) {
    let pairMatch;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      pairMatch = (browser) => browser.deviceId === pairedDeviceId_2;
      $[26] = pairMatch;
    } else pairMatch = $[26];
    focusIndex = browsers.findIndex(pairMatch);
    $[24] = browsers;
    $[25] = focusIndex;
  } else focusIndex = $[25];
  const defaultFocusIndex = Math.max(0, focusIndex);
  let onSelect;
  if ($[27] !== browsers || $[28] !== selectBrowserById) {
    onSelect = (index) => {
      let browser = browsers[index];
      if (browser) selectBrowserById(browser.deviceId);
    };
    $[27] = browsers;
    $[28] = selectBrowserById;
    $[29] = onSelect;
  } else onSelect = $[29];
  let children_2;
  if ($[30] !== browsers) {
    let renderItem;
    if ($[32] === MEMO_CACHE_SENTINEL) {
      renderItem = (browser) =>
        jsxProd_default(
          OrderedListWithItem.Item,
          {
            label: browser.name,
            icon:
              browser.deviceId === pairedDeviceId_2
                ? jsxProd_default(StatusIcon, {
                    status: "success",
                    "aria-label": "current:",
                  })
                : undefined,
            meta: [browser.osPlatform ?? "unknown OS"],
          },
          browser.deviceId,
        );
      $[32] = renderItem;
    } else renderItem = $[32];
    children_2 = browsers.map(renderItem);
    $[30] = browsers;
    $[31] = children_2;
  } else children_2 = $[31];
  let list;
  if ($[33] !== defaultFocusIndex || $[34] !== onSelect || $[35] !== children_2 || $[36] !== visibleCount) {
    list = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      onSelect,
      children: children_2,
    });
    $[33] = defaultFocusIndex;
    $[34] = onSelect;
    $[35] = children_2;
    $[36] = visibleCount;
    $[37] = list;
  } else list = $[37];
  let layout;
  if ($[38] !== list || $[39] !== title) {
    layout = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [title, list],
    });
    $[38] = list;
    $[39] = title;
    $[40] = layout;
  } else layout = $[40];
  return layout;
}
//@ chunk-7bp1kqcq.js:18086-18443 sole-consumer
/**
 * 内容下方只带一个“Back”选项的外框。
 */
function BackOnlyFrame(props) {
  let $ = useMemoCache(6);
  let { onDone, children } = props;
  let options;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        value: "back",
        label: "\u2039 Back",
      },
    ];
    $[0] = options;
  } else options = $[0];
  let selector;
  if ($[1] !== onDone) {
    selector = jsxProd_default(ModelSelector, {
      options,
      onChange: () => onDone(),
      onCancel: () => onDone(),
      hideIndexes: true,
    });
    $[1] = onDone;
    $[2] = selector;
  } else selector = $[2];
  let layout;
  if ($[3] !== children || $[4] !== selector) {
    layout = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [children, selector],
    });
    $[3] = children;
    $[4] = selector;
    $[5] = layout;
  } else layout = $[5];
  return layout;
}
//@ chunk-7bp1kqcq.js:18443-18716 sole-consumer
/**
 * Claude in Chrome MCP 服务器状态：connected/connecting/disabled/failed/absent。
 */
function getChromeMcpConnectionState(clients) {
  let filtered = clients.filter((client) => client.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME);
  if (filtered.some((client) => client.type === "connected" || client.type === "cached")) return "connected";
  if (filtered.some((client) => client.type === "pending")) return "connecting";
  if (filtered.some((client) => client.type === "disabled")) return "disabled";
  if (filtered.length > 0) return "failed";
  return "absent";
}
//@ chunk-7bp1kqcq.js:18716-19356 affinity
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
//@ chunk-7bp1kqcq.js:19356-23615 fingerprint (2.1.88 match: ClaudeInChromeMenu, 0.467)
function ClaudeInChromeMenu({ onDone, isExtensionInstalled, configEnabled, isClaudeAISubscriber, isWSL }) {
  let clients = useAppState((state) => state.mcp.clients);
  let { storageV5 } = useTheme_2();
  let [listKey, setListKey] = useState(0);
  let [defaultEnabled, setDefaultEnabled] = useState(configEnabled ?? false);
  let [justInstalled, setJustInstalled] = useState(false);
  let [installed, setInstalled] = useState(isExtensionInstalled);
  let [view, setView] = useState("menu");
  let wslFlag = false;
  let isSubscriber = codeModeAccepted() && codeModeHidesToolNamesFromApi();
  let found = clients.find(
    (client) => client.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && client.type === "connected",
  );
  let connected = found !== undefined;
  let chromeMcpConnectionState = getChromeMcpConnectionState(clients);
  let [notice, setNotice] = useState(null);
  let reconnecting = useRef(false);
  let mcpClients = useRef(true);
  useEffect(
    () => () => {
      mcpClients.current = false;
    },
    [],
  );
  let appStateSession = useAppStateSession();
  let pairedDeviceName = getGlobalConfig().chromeExtension?.pairedDeviceName;
  function openUrl(url) {
    openInChrome(url).catch(logError);
  }
  async function reconnectNow() {
    let reconnectHandle = getReconnectHandle();
    if (!reconnectHandle) {
      setNotice({
        text: "Reconnect isn't available from this view. Open /mcp, select claude-in-chrome, and choose Reconnect.",
        color: "warning",
      });
      return;
    }
    let context = {
      persistsOffBox: isBridgeOrTransport(appStateSession),
      config: clients.find((client) => client.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME)?.config,
    };
    let retryHint =
      ' Select "Reconnect extension" to try again, or open /mcp and select claude-in-chrome for details.';
    reconnecting.current = true;
    setNotice({
      text: "Reconnecting\u2026",
      color: "warning",
    });
    try {
      let result = await reconnectHandle(CLAUDE_IN_CHROME_MCP_SERVER_NAME);
      let { message, success } = handleReconnectResult(result, CLAUDE_IN_CHROME_MCP_SERVER_NAME, context);
      if (!mcpClients.current) return;
      if (success) {
        openUrl(CHROME_EXTENSION_RECONNECT_URL);
        onDone(
          `${message} Its browser tools are back in this session. If a browser action still doesn't work, check that Chrome is open and the extension is signed in.`,
        );
      } else
        setNotice({
          text: message + retryHint,
          color: "error",
        });
    } catch (error) {
      setNotice({
        text:
          handleReconnectError(error, CLAUDE_IN_CHROME_MCP_SERVER_NAME, context) +
          (error instanceof WireSafeControlError ? "" : retryHint),
        color: "error",
      });
    } finally {
      reconnecting.current = false;
    }
  }
  function reconnect() {
    if (isSubscriber) {
      setNotice({
        text: offInCodeModeToast(),
        color: "warning",
      });
      return;
    }
    if (chromeMcpConnectionState === "disabled") {
      setNotice(CHROME_DISABLED_IN_MCP_NOTICE);
      return;
    }
    let chromeServerPolicyRefusal = getChromeServerPolicyRefusal();
    if (chromeServerPolicyRefusal) {
      setNotice({
        text: chromeServerPolicyRefusal,
        color: "warning",
      });
      return;
    }
    if (chromeMcpConnectionState === "absent") {
      setNotice(canAuthenticateChromeBridge() ? CHROME_NOT_ENABLED_NOTICE : CHROME_NEEDS_CLAUDE_AI_NOTICE);
      return;
    }
    reconnectNow();
  }
  function handleAction(action) {
    switch (action) {
      case "install-extension":
        setListKey((n) => n + 1);
        setJustInstalled(true);
        openUrl(HTTPS_CLAUDE_AI_CHROME);
        break;
      case "reconnect":
        setListKey((url) => url + 1);
        isChromeExtensionInstalled()
          .then((installed) => {
            setInstalled(installed);
            if (installed) setJustInstalled(false);
          })
          .catch(logError);
        if (reconnecting.current) break;
        if (chromeMcpConnectionState === "connected" || chromeMcpConnectionState === "connecting") {
          setNotice(null);
          openUrl(CHROME_EXTENSION_RECONNECT_URL);
        } else reconnect();
        break;
      case "manage-permissions":
        setListKey((installed_0) => installed_0 + 1);
        openUrl(CHROME_PERMISSIONS_URL_2);
        break;
      case "toggle-default": {
        let newValue = !defaultEnabled;
        saveGlobalConfig(
          (current) => ({
            ...current,
            claudeInChromeDefaultEnabled: newValue,
          }),
          storageV5,
        );
        setDefaultEnabled(newValue);
        break;
      }
      case "select-browser":
        setView("select-browser");
        break;
    }
  }
  let options = [];
  let requiresExtensionSuffix = installed ? "" : " (requires extension)";
  if (!installed)
    options.push({
      label: "Install Chrome extension",
      value: "install-extension",
    });
  if (connected)
    options.push({
      label: "Select browser\u2026",
      value: "select-browser",
    });
  options.push(
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
      label: `Enabled by default: ${defaultEnabled ? "Yes" : "No"}`,
      value: "toggle-default",
    },
  );
  let isBlocked = isWSL || !isClaudeAISubscriber;
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
        isSubscriber &&
          jsxProd_default(Text, {
            color: "warning",
            children: offInCodeModeNotice(),
          }),
        !isClaudeAISubscriber &&
          jsxProd_default(Text, {
            color: "error",
            children: "Claude in Chrome requires a claude.ai subscription.",
          }),
        !isBlocked &&
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
                      installed
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
                  connected && pairedDeviceName
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
              view === "select-browser" && found
                ? jsxProd_default(BrowserPicker, {
                    chromeClient: found,
                    onDone: (message) => {
                      setView("menu");
                      setListKey((n) => n + 1);
                      if (message) onDone(message);
                    },
                  })
                : jsxProd_default(
                    ModelSelector,
                    {
                      options,
                      onChange: handleAction,
                      hideIndexes: true,
                    },
                    listKey,
                  ),
              notice &&
                jsxProd_default(Text, {
                  color: notice.color,
                  children: notice.text,
                }),
              justInstalled &&
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
//@ chunk-7bp1kqcq.js:23615-23945 fingerprint (2.1.88 match: call, 0.872)
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
export {
  HTTPS_CLAUDE_AI_CHROME,
  FCOEOABGFENEJGLBFFODGKKBKCDHCGFN,
  CHROME_PERMISSIONS_URL,
  useIdeConnectionStatusValue,
  call,
};
