/**
 * commands/bridge/bridge.tsx
 *
 * /remote-control 实现：连接/断开 Remote Control 桥接、预检失败提示与遥测 tengu_bridge_command
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/bridge/bridge.tsx
 * pieces: chunk-18hwfzwa.js (6), chunk-fnmk6x3n.js (3), chunk-k7ve8htw.js (26)
 * attribution: fingerprint 10, sole-consumer 7, affinity 1, layout 16, file-local 1
 */
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { idleAmberFinchOn } from "../../utils/planTiers.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { logEvent } from "../../services/analytics/index.js";
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { call as call_2 } from "../usage-credits/usageCredits.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED } from "../../bridge/bridgeStatusUtil.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { useSetAppState, useAppState } from "../../state/AppState.js";
import { markRemoteControlUsed } from "../../services/tips/remoteControlNudges.js";
import {
  shouldShowRemoteCallout as shouldShowRemoteCallout_2,
  REMOTE_CALLOUT_DIALOG,
} from "../../components/RemoteCallout.js";
import { hasOpenDialogOfKind } from "../../state/dialogQueue.js";
import { logForDebugging } from "../../utils/debug.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { Login, runPostLoginHooks } from "../../services/oauth/postLoginHooks.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { toString } from "../../../vendor/qrcode/lib/server.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG, BRIDGE_LOGIN_INSTRUCTION } from "../../bridge/types.js";
import { useLatchedBridgeNotice } from "../../components/PromptInput/Notifications.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { getBridgeDisabledDiagnosis } from "../../bridge/bridgeEntitlement.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { checkEnvLessBridgeMinVersion } from "../../bridge/envLessBridgeConfig.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getBridgeAccessTokenAsync, getBridgeAccessToken } from "../../bridge/bridgeConfig.js";
import {
  enrollTrustedDeviceIfNeeded,
  isTrustedDeviceUnenrolled,
  isProactiveEnrollmentDisabled,
  PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
} from "../../bridge/trustedDevice.js";
import { nullStub3 } from "../../utils/externalBuildStubs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:643741-643788 fingerprint = _temp (1)
function selectBridgeConnected_2(s) {
  return s.replBridgeConnected;
}
//@ chunk-18hwfzwa.js:643788-643839 fingerprint = _temp6 (1)
function selectBridgeSessionActive_2(s_1) {
  return s_1.replBridgeSessionActive;
}
//@ chunk-18hwfzwa.js:643889-643937 fingerprint = _temp5 (1)
function selectBridgeConnectUrl_2(s_0) {
  return s_0.replBridgeConnectUrl;
}
//@ chunk-18hwfzwa.js:643937-643985 fingerprint = _temp4 (1)
function selectBridgeSessionUrl_2(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-18hwfzwa.js:644121-644166 fingerprint = _temp2 (1)
function selectBridgeEnabled_2(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-18hwfzwa.js:1785048-1785137 fingerprint = _temp7 (0.688)
function isBridgeInboundAllowed(prev) {
  let state = prev.getState();
  return state.replBridgeEnabled && !state.replBridgeOutboundOnly;
}
//@ chunk-fnmk6x3n.js:17782-17786 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fnmk6x3n.js:17782", () => {
  init_react_production();
});
//@ chunk-fnmk6x3n.js:17786-18799 sole-consumer
/**
 * Pro 试用到期对话框：提示试用结束，选项"升级到 Max"（非受限账号）与"充值继续用"，记 tengu_pro_trial_expired_choice 后进入对应流程。
 */
function ProTrialExpiredDialog(props) {
  let $ = useMemoCache(15);
  let { onDone, caller } = props;
  let [error, setError] = useState(null);
  if (error) {
    return error;
  }
  let content;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    content = [
      ...(idleAmberFinchOn()
        ? []
        : [
            {
              label: "Upgrade to Max",
              value: "upgrade",
            },
          ]),
      {
        label: "Add funds to continue with usage credits",
        value: "extra-usage",
      },
    ];
    $[0] = content;
  } else content = $[0];
  let options = content;
  let footer;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    footer = jsxProd_default(Box, {
      paddingX: 2,
      children: jsxProd_default(Text, {
        color: "error",
        children: "Your Claude Code trial has ended.",
      }),
    });
    $[1] = footer;
  } else footer = $[1];
  let onCancel;
  if ($[2] !== onDone) {
    onCancel = () => onDone();
    $[2] = onDone;
    $[3] = onCancel;
  } else onCancel = $[3];
  let onCancel_2;
  if ($[4] !== onDone) {
    onCancel_2 = () => onDone();
    $[4] = onDone;
    $[5] = onCancel_2;
  } else onCancel_2 = $[5];
  let onChange;
  if ($[6] !== caller || $[7] !== onDone) {
    onChange = (choice) => {
      logEvent("tengu_pro_trial_expired_choice", {
        chose_upgrade: choice === "upgrade",
      });
      if (choice === "upgrade")
        callUpgradeFromSurface(onDone, caller, "pro_trial_expired_dialog").then((result) => setError(result));
      else call_2(onDone, caller).then((message) => setError(message));
    };
    $[6] = caller;
    $[7] = onDone;
    $[8] = onChange;
  } else onChange = $[8];
  let children;
  if ($[9] !== onCancel_2 || $[10] !== onChange) {
    children = jsxProd_default(ModelSelector, {
      options,
      onCancel: onCancel_2,
      onChange,
    });
    $[9] = onCancel_2;
    $[10] = onChange;
    $[11] = children;
  } else children = $[11];
  let body;
  if ($[12] !== onCancel || $[13] !== children) {
    body = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        footer,
        jsxProd_default(Dialog, {
          title: "What do you want to do?",
          onCancel,
          children,
        }),
      ],
    });
    $[12] = onCancel;
    $[13] = children;
    $[14] = body;
  } else body = $[14];
  return body;
}
//@ chunk-fnmk6x3n.js:18799-18853 fingerprint = call (0.627)
/**
 * /pro-trial-expired 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  return jsxProd_default(ProTrialExpiredDialog, {
    onDone,
    caller: context,
  });
}
//@ chunk-k7ve8htw.js:18017-18021 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-k7ve8htw.js:18017", () => {
  init_react_production();
});
//@ chunk-k7ve8htw.js:18021-18067 sole-consumer = _temp (1)
function selectBridgeConnected(s) {
  return s.replBridgeConnected;
}
//@ chunk-k7ve8htw.js:18067-18111 affinity = _temp2 (1)
function selectBridgeEnabled(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-k7ve8htw.js:18111-18160 fingerprint = _temp3 (1)
function selectBridgeOutboundOnly(s_1) {
  return s_1.replBridgeOutboundOnly;
}
//@ chunk-k7ve8htw.js:18160-18259 layout
function oauthAccountKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  return (
    oauthAccountInfo && {
      accountUuid: oauthAccountInfo.accountUuid,
      organizationUuid: oauthAccountInfo.organizationUuid,
    }
  );
}
//@ chunk-k7ve8htw.js:18259-18285 layout
function gatewayAuthSnapshot() {
  return getGatewayAuth();
}
//@ chunk-k7ve8htw.js:18285-18355 layout = shouldShowRemoteCallout (0.779)
function shouldShowRemoteCallout(state) {
  return state.remoteDialogSeen
    ? state
    : {
        ...state,
        remoteDialogSeen: true,
      };
}
//@ chunk-k7ve8htw.js:18355-18402 layout = _temp4 (1)
function selectBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-k7ve8htw.js:18402-18449 layout = _temp5 (1)
function selectBridgeConnectUrl(s_0) {
  return s_0.replBridgeConnectUrl;
}
//@ chunk-k7ve8htw.js:18449-18499 layout = _temp6 (1)
function selectBridgeSessionActive(s_1) {
  return s_1.replBridgeSessionActive;
}
//@ chunk-k7ve8htw.js:18499-18516 layout
function selectNothing(state) {}
//@ chunk-k7ve8htw.js:18516-18541 layout
function selectFalse(state) {
  return false;
}
//@ chunk-k7ve8htw.js:18541-18567 layout
function selectNull() {
  return null;
}
//@ chunk-k7ve8htw.js:18567-18582 layout
function noopEffect() {}
//@ chunk-k7ve8htw.js:18582-18870 layout
function clearBridgeAppState(prev) {
  if (!prev.replBridgeEnabled && prev.replBridgeError === undefined) {
    return prev;
  }
  return {
    ...prev,
    replBridgeEnabled: false,
    replBridgeExplicit: false,
    replBridgeOutboundOnly: false,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    replBridgeSessionGroupingId: undefined,
    notifications: removeNotificationByKey(prev.notifications, BRIDGE_FAILED),
  };
}
//@ chunk-k7ve8htw.js:18870-18896 layout
function logicalNot(value) {
  return !value;
}
//@ chunk-k7ve8htw.js:18896-18931 file-local
function isNonEmpty(l) {
  return l.length > 0;
}
//@ chunk-k7ve8htw.js:18931-18962 layout
function shareRowPort(row) {
  return row.port;
}
//@ chunk-k7ve8htw.js:18962-19010 layout
function renderTextRow(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-k7ve8htw.js:19010-19081 layout
function renderListItem(item) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: item.label,
      meta: item.meta,
    },
    item.key,
  );
}
//@ chunk-k7ve8htw.js:19081-19276 layout
var PROJECT_FIXED_WHEN_CONNECTED_MESSAGE =
  "Remote Control is already connected \u2014 a session's Project is fixed when it's created. Disconnect first, then re-run /remote-control --project to start a new session in the Project.";
//@ chunk-k7ve8htw.js:19276-23125 fingerprint = BridgeToggle (0.346)
function BridgeToggle(props) {
  let $ = useMemoCache(25);
  let { onDone, name, sessionGroupingId, context } = props;
  let setAppState = useSetAppState();
  let replBridgeConnected = useAppState(selectBridgeConnected);
  let replBridgeEnabled = useAppState(selectBridgeEnabled);
  let replBridgeOutboundOnly = useAppState(selectBridgeOutboundOnly);
  let [connecting, setConnecting] = useState(false);
  let [enabling, setEnabling] = useState(false);
  let [accountKey] = useState(oauthAccountKey);
  let [initialAuth] = useState(gatewayAuthSnapshot);
  let handleEnable;
  if (
    $[0] !== context?.dialogStore ||
    $[1] !== context?.requestDialog ||
    $[2] !== context?.storageV5 ||
    $[3] !== name ||
    $[4] !== onDone ||
    $[5] !== sessionGroupingId ||
    $[6] !== setAppState
  ) {
    handleEnable = function handleEnable() {
      markRemoteControlUsed(context?.storageV5);
      if (shouldShowRemoteCallout_2()) {
        let requestDialog = context?.requestDialog;
        if (!requestDialog) {
          onDone(
            "Remote Control asks for a one-time confirmation before it's first enabled, and this session can't show it. Run /remote-control from an interactive Claude Code session.",
            {
              display: "system",
            },
          );
          return;
        }
        let dialogStore = context?.dialogStore;
        if (dialogStore && hasOpenDialogOfKind(dialogStore.getState(), REMOTE_CALLOUT_DIALOG.kind)) {
          onDone("", {
            display: "system",
          });
          return;
        }
        setAppState((state) =>
          state.replBridgeInitialName === name && state.replBridgeSessionGroupingId === sessionGroupingId
            ? state
            : {
                ...state,
                replBridgeInitialName: name,
                replBridgeSessionGroupingId: sessionGroupingId,
              },
        );
        onDone("", {
          display: "system",
        });
        let accountAtPrompt = accountKeyOf(getOauthAccountInfo());
        requestDialog(
          REMOTE_CALLOUT_DIALOG,
          {},
          {
            place: "under",
          },
        )
          .then((answer) => {
            let sameAccount = answer === "enable" && accountKeyOf(getOauthAccountInfo()) === accountAtPrompt;
            if (answer === "enable" && !sameAccount)
              logForDebugging(
                "[bridge:repl] Remote Control callout answered under a different account than it was asked for \u2014 not enabling",
              );
            if (sameAccount) {
              saveGlobalConfig(shouldShowRemoteCallout, context?.storageV5);
              logEvent("tengu_bridge_command", {
                action: lit("connect"),
              });
            }
            setAppState((prev) => {
              if (sameAccount) {
                return prev.replBridgeEnabled && prev.replBridgeExplicit && !prev.replBridgeOutboundOnly
                  ? prev
                  : {
                      ...prev,
                      replBridgeEnabled: true,
                      replBridgeExplicit: true,
                      replBridgeOutboundOnly: false,
                    };
              }
              return prev.replBridgeInitialName === undefined &&
                prev.replBridgeSessionGroupingId === undefined
                ? prev
                : {
                    ...prev,
                    replBridgeInitialName: undefined,
                    replBridgeSessionGroupingId: undefined,
                  };
            });
          })
          .catch(logError);
        return;
      }
      logEvent("tengu_bridge_command", {
        action: lit("connect"),
      });
      let prereqOk = false;
      setAppState((prev) => {
        if (prev.replBridgeEnabled && !prev.replBridgeOutboundOnly) {
          if (sessionGroupingId !== undefined) prereqOk = true;
          return prev;
        }
        return {
          ...prev,
          replBridgeEnabled: true,
          replBridgeExplicit: true,
          replBridgeOutboundOnly: false,
          replBridgeInitialName: name,
          replBridgeSessionGroupingId: sessionGroupingId,
        };
      });
      if (prereqOk) {
        onDone(PROJECT_FIXED_WHEN_CONNECTED_MESSAGE, {
          display: "system",
        });
        return;
      }
      onDone("", {
        display: "system",
      });
    };
    $[0] = context?.dialogStore;
    $[1] = context?.requestDialog;
    $[2] = context?.storageV5;
    $[3] = name;
    $[4] = onDone;
    $[5] = sessionGroupingId;
    $[6] = setAppState;
    $[7] = handleEnable;
  } else handleEnable = $[7];
  let enable = handleEnable;
  let prereq;
  if (
    $[8] !== context?.credentials ||
    $[9] !== enable ||
    $[10] !== onDone ||
    $[11] !== replBridgeConnected ||
    $[12] !== replBridgeEnabled ||
    $[13] !== replBridgeOutboundOnly
  ) {
    prereq = () => {
      if ((replBridgeConnected || replBridgeEnabled) && !replBridgeOutboundOnly) {
        setConnecting(true);
        return;
      }
      let loggedIn = false;
      (async () => {
        let prerequisites = await checkBridgePrerequisites(context?.credentials);
        if (loggedIn) {
          return;
        }
        if (prerequisites?.kind === "error") {
          logEvent("tengu_bridge_command", {
            action: lit("preflight_failed"),
          });
          onDone(prerequisites.message, {
            display: "system",
          });
          return;
        }
        if (prerequisites?.kind === "unenrolled-trusted-device") {
          logEvent("tengu_bridge_command", {
            action: lit("preflight_login_for_enrollment"),
          });
          setEnabling(true);
          return;
        }
        enable();
      })();
      return () => {
        loggedIn = true;
      };
    };
    $[8] = context?.credentials;
    $[9] = enable;
    $[10] = onDone;
    $[11] = replBridgeConnected;
    $[12] = replBridgeEnabled;
    $[13] = replBridgeOutboundOnly;
    $[14] = prereq;
  } else prereq = $[14];
  let content;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    content = [];
    $[15] = content;
  } else content = $[15];
  useEffect(prereq, content);
  if (connecting) {
    let footer;
    if ($[16] !== onDone || $[17] !== sessionGroupingId) {
      footer = jsxProd_default(BridgeDisconnectDialog, {
        onDone,
        sessionGroupingId,
      });
      $[16] = onDone;
      $[17] = sessionGroupingId;
      $[18] = footer;
    } else footer = $[18];
    return footer;
  }
  if (enabling) {
    if (!context) {
      onDone(
        "Your organization requires Trusted Devices for Remote Control, but this device is not enrolled. Please run `/login` in Claude Code to enroll this device.",
        {
          display: "system",
        },
      );
      return null;
    }
    let status;
    if (
      $[19] !== context ||
      $[20] !== enable ||
      $[21] !== onDone ||
      $[22] !== accountKey ||
      $[23] !== initialAuth
    ) {
      status = jsxProd_default(Login, {
        startingMessage: "Sign in to enroll this device for Remote Control.",
        onDone: async (result, agentId, setAppState) => {
          let postLogin = await runPostLoginHooks(context, result, {
            setAppState,
            awaitEnrollment: true,
            previousAccount: accountKey,
            previousGatewayAuth: initialAuth,
          });
          if (postLogin.gatewayLoginError !== undefined || postLogin.relaunching) {
            onDone(
              postLogin.gatewayLoginError,
              postLogin.gatewayLoginError !== undefined
                ? {
                    display: "system",
                  }
                : undefined,
            );
            return;
          }
          if (!result) {
            logEvent("tengu_bridge_command", {
              action: lit("preflight_login_canceled"),
            });
            onDone("Sign-in canceled. Run /remote-control after enrolling this device.", {
              display: "system",
            });
            return;
          }
          let recheck = await checkBridgePrerequisites(context?.credentials);
          if (recheck?.kind === "error") {
            onDone(recheck.message, {
              display: "system",
            });
            return;
          }
          if (recheck?.kind === "unenrolled-trusted-device") {
            logEvent("tengu_bridge_command", {
              action: lit("preflight_enrollment_did_not_complete"),
            });
            onDone(
              "Signed in, but device enrollment didn't complete. Run /remote-control again, or check the debug log for [trusted-device] messages.",
              {
                display: "system",
              },
            );
            return;
          }
          enable();
        },
      });
      $[19] = context;
      $[20] = enable;
      $[21] = onDone;
      $[22] = accountKey;
      $[23] = initialAuth;
      $[24] = status;
    } else status = $[24];
    return status;
  }
  return null;
}
//@ chunk-k7ve8htw.js:23125-27247 fingerprint = BridgeDisconnectDialog (0.423)
function BridgeDisconnectDialog(props) {
  let $ = useMemoCache(91);
  let { onDone, sessionGroupingId } = props;
  useRegisterOverlay("bridge-disconnect-dialog");
  let setAppState = useSetAppState();
  let sessionUrl = useAppState(selectBridgeSessionUrl);
  let connectUrl = useAppState(selectBridgeConnectUrl);
  let sessionActive = useAppState(selectBridgeSessionActive);
  let appState = useAppState(selectNothing);
  let [connecting, setConnecting] = useState(false);
  let [statusText, setStatusText] = useState("");
  let [initialState] = useState(appState);
  let appState_2 = useAppState(selectFalse);
  useState(!appState_2);
  let [snapshot] = useState(selectNull);
  let [state] = useState(initialState);
  let store;
  if ($[0] !== state || $[1] !== snapshot) {
    store = () =>
      snapshot === null || state === "ready"
        ? snapshot
        : {
            ...snapshot,
            shared: [],
            shareRows: [],
          };
    $[0] = state;
    $[1] = snapshot;
    $[2] = store;
  } else store = $[2];
  let [storeSnapshot] = useState(store);
  useRef(null);
  let helpText;
  if ($[3] !== storeSnapshot) {
    helpText = [storeSnapshot];
    $[3] = storeSnapshot;
    $[4] = helpText;
  } else helpText = $[4];
  useEffect(noopEffect, helpText);
  let [error] = useState(null);
  let text = sessionActive ? sessionUrl : connectUrl;
  let body;
  let footer;
  if ($[5] !== text || $[6] !== connecting) {
    body = () => {
      if (!connecting || !text) {
        setStatusText("");
        return;
      }
      toString(text, {
        type: "utf8",
        errorCorrectionLevel: "L",
        small: true,
      })
        .then(setStatusText)
        .catch(() => setStatusText(""));
    };
    footer = [connecting, text];
    $[5] = text;
    $[6] = connecting;
    $[7] = body;
    $[8] = footer;
  } else {
    body = $[7];
    footer = $[8];
  }
  useEffect(body, footer);
  let statusLine;
  if ($[9] !== onDone || $[10] !== setAppState) {
    statusLine = function handleDisconnect() {
      setAppState(clearBridgeAppState);
      logEvent("tengu_bridge_command", {
        action: lit("disconnect"),
      });
      onDone(REMOTE_CONTROL_DISCONNECTED_MSG, {
        display: "system",
      });
    };
    $[9] = onDone;
    $[10] = setAppState;
    $[11] = statusLine;
  } else statusLine = $[11];
  let run = statusLine;
  let urlLine;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    urlLine = function handleShowQR() {
      setConnecting(logicalNot);
    };
    $[12] = urlLine;
  } else urlLine = $[12];
  let run_2 = urlLine;
  let content;
  if ($[13] !== error || $[14] !== onDone) {
    content = function handleContinue() {
      if (error === null)
        onDone(undefined, {
          display: "skip",
        });
    };
    $[13] = error;
    $[14] = onDone;
    $[15] = content;
  } else content = $[15];
  let contentBlock = content;
  let links;
  if ($[16] !== run) {
    links = {
      key: "disconnect",
      run,
      label: "Disconnect this session",
    };
    $[16] = run;
    $[17] = links;
  } else links = $[17];
  const label = connecting ? "Hide QR code" : "Show QR code";
  let meta;
  if ($[18] !== connecting) {
    meta = connecting ? [] : ["Scan with your phone to open this session"];
    $[18] = connecting;
    $[19] = meta;
  } else meta = $[19];
  let hintFooter;
  if ($[20] !== meta || $[21] !== label) {
    hintFooter = {
      key: "qr",
      run: run_2,
      label,
      meta,
    };
    $[20] = meta;
    $[21] = label;
    $[22] = hintFooter;
  } else hintFooter = $[22];
  let hintRow;
  if ($[23] !== contentBlock) {
    hintRow = {
      key: "continue",
      run: contentBlock,
      label: "Continue",
    };
    $[23] = contentBlock;
    $[24] = hintRow;
  } else hintRow = $[24];
  let bodyRows;
  if ($[25] !== hintFooter || $[26] !== hintRow || $[27] !== links) {
    bodyRows = [links, hintFooter, hintRow];
    $[25] = hintFooter;
    $[26] = hintRow;
    $[27] = links;
    $[28] = bodyRows;
  } else bodyRows = $[28];
  let panelBody = bodyRows;
  let statusRow;
  let helpRow;
  let flexDirection;
  let gap;
  let dialogBody;
  let box;
  let titleRow;
  let urlRow;
  let hintLine;
  let footerLine;
  let title;
  let onCancel;
  let hideInputGuide;
  if (
    $[29] !== text ||
    $[30] !== storeSnapshot ||
    $[31] !== contentBlock ||
    $[32] !== state ||
    $[33] !== statusText ||
    $[34] !== sessionGroupingId ||
    $[35] !== connecting
  ) {
    let groupingId = statusText
      ? statusText
          .split(
            `
`,
          )
          .filter(isNonEmpty)
      : [];
    helpRow = Dialog;
    title = "Remote Control";
    onCancel = contentBlock;
    hideInputGuide = true;
    statusRow = Box;
    flexDirection = "column";
    gap = 1;
    if ($[49] !== sessionGroupingId) {
      dialogBody =
        sessionGroupingId !== undefined &&
        jsxProd_default(Text, {
          children:
            "A session's Project is fixed when it's created \u2014 disconnect first, then re-run /remote-control --project to start a new one.",
        });
      $[49] = sessionGroupingId;
      $[50] = dialogBody;
    } else dialogBody = $[50];
    const atText = text ? ` and at ${text}` : " and claude.ai/code";
    if ($[51] !== atText) {
      box = jsxProd_default_2(Text, {
        children: ["This session is available in the Claude mobile app", atText, "."],
      });
      $[51] = atText;
      $[52] = box;
    } else box = $[52];
    let endedShares;
    if ($[53] !== storeSnapshot?.endedShares) {
      endedShares = storeSnapshot?.endedShares ?? [];
      $[53] = storeSnapshot?.endedShares;
      $[54] = endedShares;
    } else endedShares = $[54];
    let portsWithRow;
    if ($[55] !== storeSnapshot?.shareRows) {
      portsWithRow = storeSnapshot?.shareRows.map(shareRowPort) ?? [];
      $[55] = storeSnapshot?.shareRows;
      $[56] = portsWithRow;
    } else portsWithRow = $[56];
    const drewReason =
      state === "ready" && storeSnapshot !== null && storeSnapshot.sharesNothingBecause !== null;
    if ($[57] !== state || $[58] !== endedShares || $[59] !== portsWithRow || $[60] !== drewReason) {
      titleRow = jsxProd_default(useLatchedBridgeNotice, {
        inRemoteControl: {
          stateAtOpen: state,
          endedShares,
          portsWithRow,
          drewReason,
        },
      });
      $[57] = state;
      $[58] = endedShares;
      $[59] = portsWithRow;
      $[60] = drewReason;
      $[61] = titleRow;
    } else titleRow = $[61];
    urlRow = false;
    hintLine = false;
    footerLine =
      connecting &&
      groupingId.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        children: groupingId.map(renderTextRow),
      });
    $[29] = text;
    $[30] = storeSnapshot;
    $[31] = contentBlock;
    $[32] = state;
    $[33] = statusText;
    $[34] = sessionGroupingId;
    $[35] = connecting;
    $[36] = statusRow;
    $[37] = helpRow;
    $[38] = flexDirection;
    $[39] = gap;
    $[40] = dialogBody;
    $[41] = box;
    $[42] = titleRow;
    $[43] = urlRow;
    $[44] = hintLine;
    $[45] = footerLine;
    $[46] = title;
    $[47] = onCancel;
    $[48] = hideInputGuide;
  } else {
    statusRow = $[36];
    helpRow = $[37];
    flexDirection = $[38];
    gap = $[39];
    dialogBody = $[40];
    box = $[41];
    titleRow = $[42];
    urlRow = $[43];
    hintLine = $[44];
    footerLine = $[45];
    title = $[46];
    onCancel = $[47];
    hideInputGuide = $[48];
  }
  const visibleCount = panelBody.length;
  const defaultFocusIndex = panelBody.length - 1;
  const isDisabled = error !== null;
  let onSelect;
  if ($[62] !== error || $[63] !== panelBody) {
    onSelect = (index) => {
      if (error === null) panelBody[index]?.run();
    };
    $[62] = error;
    $[63] = panelBody;
    $[64] = onSelect;
  } else onSelect = $[64];
  let children;
  if ($[65] !== panelBody) {
    children = panelBody.map(renderListItem);
    $[65] = panelBody;
    $[66] = children;
  } else children = $[66];
  let result;
  if (
    $[67] !== panelBody.length ||
    $[68] !== defaultFocusIndex ||
    $[69] !== isDisabled ||
    $[70] !== onSelect ||
    $[71] !== children
  ) {
    result = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      wrap: true,
      declineHomeEnd: true,
      isDisabled,
      onSelect,
      children,
    });
    $[67] = panelBody.length;
    $[68] = defaultFocusIndex;
    $[69] = isDisabled;
    $[70] = onSelect;
    $[71] = children;
    $[72] = result;
  } else result = $[72];
  let status;
  if ($[73] === MEMO_CACHE_SENTINEL) {
    status = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "select",
          }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: "escape",
            action: "continue",
          }),
        ],
      }),
    });
    $[73] = status;
  } else status = $[73];
  let children_2;
  if (
    $[74] !== statusRow ||
    $[75] !== flexDirection ||
    $[76] !== gap ||
    $[77] !== dialogBody ||
    $[78] !== box ||
    $[79] !== titleRow ||
    $[80] !== urlRow ||
    $[81] !== hintLine ||
    $[82] !== footerLine ||
    $[83] !== result
  ) {
    children_2 = jsxProd_default_2(statusRow, {
      flexDirection,
      gap,
      children: [dialogBody, box, titleRow, urlRow, hintLine, footerLine, result, status],
    });
    $[74] = statusRow;
    $[75] = flexDirection;
    $[76] = gap;
    $[77] = dialogBody;
    $[78] = box;
    $[79] = titleRow;
    $[80] = urlRow;
    $[81] = hintLine;
    $[82] = footerLine;
    $[83] = result;
    $[84] = children_2;
  } else children_2 = $[84];
  let reason;
  if (
    $[85] !== helpRow ||
    $[86] !== title ||
    $[87] !== onCancel ||
    $[88] !== hideInputGuide ||
    $[89] !== children_2
  ) {
    reason = jsxProd_default(helpRow, {
      title,
      onCancel,
      hideInputGuide,
      children: children_2,
    });
    $[85] = helpRow;
    $[86] = title;
    $[87] = onCancel;
    $[88] = hideInputGuide;
    $[89] = children_2;
    $[90] = reason;
  } else reason = $[90];
  return reason;
}
//@ chunk-k7ve8htw.js:27247-27751 sole-consumer
/**
 * /remote-control 启动前检查：功能被禁用（含组织策略）、最低版本、登录令牌、可信设备注册；返回错误或 unenrolled-trusted-device，全部通过返回 null。
 */
async function checkBridgePrerequisites(storageV5) {
  let disabledDiagnosis = await getBridgeDisabledDiagnosis();
  if (disabledDiagnosis) {
    if (disabledDiagnosis.orgPolicyDenied) logOrgPolicyDenied("allow_remote_control", "slash_command");
    return {
      kind: "error",
      message: disabledDiagnosis.reason,
    };
  }
  let versionError = await checkEnvLessBridgeMinVersion();
  if (versionError)
    return {
      kind: "error",
      message: versionError,
    };
  if (
    !(isStorageV5Enabled() && storageV5 !== undefined
      ? await getBridgeAccessTokenAsync(storageV5)
      : getBridgeAccessToken())
  )
    return {
      kind: "error",
      message: BRIDGE_LOGIN_INSTRUCTION,
    };
  await enrollTrustedDeviceIfNeeded(storageV5);
  if (await isTrustedDeviceUnenrolled()) {
    let stub = nullStub3();
    if (stub !== null)
      return {
        kind: "error",
        message: stub,
      };
    if (isProactiveEnrollmentDisabled())
      return {
        kind: "error",
        message: PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
      };
    return {
      kind: "unenrolled-trusted-device",
    };
  }
  logForDebugging("[bridge] Prerequisites passed, enabling bridge");
  return null;
}
//@ chunk-k7ve8htw.js:27751-27862 sole-consumer
/**
 * /remote-control 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function remoteControlCall(onDone, context, args) {
  let sessionGroupingId;
  let name = args.trim() || undefined;
  return jsxProd_default(BridgeToggle, {
    onDone,
    name,
    sessionGroupingId,
    context,
  });
}
//@ chunk-k7ve8htw.js:27862-27932 sole-consumer
function accountKeyOf(oauthAccountInfo) {
  return oauthAccountInfo && `${oauthAccountInfo.accountUuid}/${oauthAccountInfo.organizationUuid || ""}`;
}
export {
  selectBridgeConnected_2,
  selectBridgeSessionActive_2,
  selectBridgeConnectUrl_2,
  selectBridgeSessionUrl_2,
  selectBridgeEnabled_2,
  isBridgeInboundAllowed,
  call,
  remoteControlCall,
};
