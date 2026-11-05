/**
 * commands/bridge/bridge.tsx
 *
 * /remote-control 实现：连接/断开 Remote Control 桥接、预检失败提示与遥测 tengu_bridge_command
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/bridge/bridge.tsx
 * pieces: chunk-163scjsz.js (25), chunk-46zjpx8m.js (1), chunk-gzk78dcy.js (3), chunk-vax9bfta.js (5)
 * attribution: placement 4, fingerprint 9, layout 9, affinity 2, sole-consumer 8, file-local 1, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getBridgeDisabledDiagnosis } from "../../bridge/bridgeEntitlement.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { checkEnvLessBridgeMinVersion } from "../../bridge/envLessBridgeConfig.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getBridgeAccessTokenAsync, getBridgeAccessToken } from "../../bridge/bridgeConfig.js";
import {
  BRIDGE_LOGIN_INSTRUCTION,
  BRIDGE_LOGIN_HINT,
  BRIDGE_SIGNATURE_WANTED_HINT,
  REMOTE_CONTROL_DISCONNECTED_MSG,
} from "../../bridge/types.js";
import {
  enrollTrustedDeviceIfNeeded,
  isTrustedDeviceUnenrolled,
  isProactiveEnrollmentDisabled,
  PROACTIVE_ENROLLMENT_DISABLED_MESSAGE,
} from "../../bridge/trustedDevice.js";
import { nullStub3 } from "../../utils/externalBuildStubs.js";
import { logForDebugging } from "../../utils/debug.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { markRemoteControlUsed } from "../../services/tips/remoteControlNudges.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { REMOTE_CALLOUT_DIALOG, shouldShowRemoteCallout } from "../../components/RemoteCallout.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { sleep } from "../../utils/sleep.js";
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
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { call as call_2 } from "../usage-credits/usageCredits.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED, isActionableHint, getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { useSetAppState, useAppState } from "../../state/AppState.js";
import { logError } from "../../utils/log.js";
import { Login, runPostLoginHooks } from "../../services/oauth/postLoginHooks.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { reconnecting, enabled, error } from "../../components/BridgeDialog.js";
import { useOfferRoom } from "../../components/AutocompactOfferDialog.js";
import { measureElement, topWithin } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { useGrownOverflow } from "../../components/useMaxOverflow.js";
import { toString } from "../../../vendor/qrcode/lib/server.js";
import { BRIDGE_FAILED_INDICATOR } from "../../constants/figures.js";
import { ErrorText } from "../../components/ErrorText.js";
import { useLatchedBridgeNotice } from "../../components/PromptInput/Notifications.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";

//@ chunk-vax9bfta.js:832-1337 placement
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
//@ chunk-vax9bfta.js:1337-1376 layout
function bridgeAskedAs() {
  return {
    askedAs: accountKeyOf(getOauthAccountInfo()),
  };
}
//@ chunk-vax9bfta.js:1376-3229 layout
async function enableRemoteControlWithConsent({
  setAppState,
  requestDialog,
  dialogStore,
  storageV5,
  via,
  name: initialName,
  sessionGroupingId,
  consent,
  onCalloutRequested,
}) {
  markRemoteControlUsed(storageV5);
  let logFields = {
    action: lit("connect"),
    via: lit(via),
  };
  if (consent !== undefined && accountKeyOf(getOauthAccountInfo()) !== consent.askedAs) {
    logForDebugging(
      "[bridge:repl] Remote Control consent was given under a different account than is signed in now \u2014 not enabling",
    );
    return {
      kind: "account_changed",
    };
  }
  if (dialogStore?.getState().open.some((dialog) => dialog.kind === REMOTE_CALLOUT_DIALOG.kind))
    return {
      kind: "already_asking",
    };
  if (shouldShowRemoteCallout()) {
    let mayEnable;
    if (consent !== undefined) mayEnable = true;
    else {
      if (!requestDialog)
        return {
          kind: "cannot_ask",
        };
      setAppState((state) =>
        state.replBridgeInitialName === initialName && state.replBridgeSessionGroupingId === sessionGroupingId
          ? state
          : {
              ...state,
              replBridgeInitialName: initialName,
              replBridgeSessionGroupingId: sessionGroupingId,
            },
      );
      onCalloutRequested?.();
      let askedAs = bridgeAskedAs();
      let answer = await requestDialog(
        REMOTE_CALLOUT_DIALOG,
        {},
        {
          place: "under",
        },
      );
      mayEnable = answer === "enable" && accountKeyOf(getOauthAccountInfo()) === askedAs.askedAs;
      if (answer === "enable" && !mayEnable)
        logForDebugging(
          "[bridge:repl] Remote Control callout answered under a different account than it was asked for \u2014 not enabling",
        );
    }
    if (mayEnable && consent === undefined)
      saveGlobalConfig(
        (state) =>
          state.remoteDialogSeen
            ? state
            : {
                ...state,
                remoteDialogSeen: true,
              },
        storageV5,
      );
    if (mayEnable) logEvent("tengu_bridge_command", logFields);
    setAppState((state) => {
      if (mayEnable)
        return state.replBridgeEnabled && state.replBridgeExplicit && !state.replBridgeOutboundOnly
          ? state
          : {
              ...state,
              replBridgeEnabled: true,
              replBridgeExplicit: true,
              replBridgeOutboundOnly: false,
              replBridgeError: undefined,
              replBridgeErrorKind: undefined,
              ...(consent !== undefined && {
                replBridgeInitialName: initialName,
                replBridgeSessionGroupingId: sessionGroupingId,
              }),
            };
      return state.replBridgeInitialName === undefined && state.replBridgeSessionGroupingId === undefined
        ? state
        : {
            ...state,
            replBridgeInitialName: undefined,
            replBridgeSessionGroupingId: undefined,
          };
    });
    return mayEnable
      ? {
          kind: "enabled",
        }
      : {
          kind: "declined",
        };
  }
  logEvent("tengu_bridge_command", logFields);
  let enabled = false;
  setAppState((state) => {
    if (state.replBridgeEnabled && !state.replBridgeOutboundOnly) {
      if (sessionGroupingId !== undefined) enabled = true;
      return state;
    }
    return {
      ...state,
      replBridgeEnabled: true,
      replBridgeExplicit: true,
      replBridgeOutboundOnly: false,
      replBridgeInitialName: initialName,
      replBridgeSessionGroupingId: sessionGroupingId,
      replBridgeError: undefined,
      replBridgeErrorKind: undefined,
    };
  });
  return enabled
    ? {
        kind: "already_on_project_fixed",
      }
    : {
        kind: "enabled",
      };
}
//@ chunk-vax9bfta.js:3229-3533 layout
async function waitForBridgeConnected({ getAppState, signal, timeoutMs, pollMs = 200 }) {
  let deadline = Date.now() + timeoutMs;
  for (;;) {
    signal.throwIfAborted();
    let replBridgeHandle = getReplBridgeHandle();
    if (replBridgeHandle !== null && replBridgeHandle.outboundOnly !== true) return "connected";
    let appState = getAppState();
    if (!appState.replBridgeEnabled || appState.replBridgeError !== undefined) return "failed";
    if (Date.now() >= deadline) return "timed_out";
    await sleep(pollMs, signal);
  }
}
//@ chunk-vax9bfta.js:3533-3602 placement
function accountKeyOf(oauthAccountInfo) {
  return oauthAccountInfo && `${oauthAccountInfo.accountUuid}/${oauthAccountInfo.organizationUuid || ""}`;
}
//@ chunk-46zjpx8m.js:15299-15367 fingerprint (2.1.88 match: _temp7, 0.785)
function isBridgeEnabledInbound(prev) {
  return prev.replBridgeEnabled && !prev.replBridgeOutboundOnly;
}
//@ chunk-gzk78dcy.js:18986-18990 sole-consumer
init_react_production();
//@ chunk-gzk78dcy.js:18990-20003 sole-consumer
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
//@ chunk-gzk78dcy.js:20003-20057 fingerprint (2.1.88 match: call, 0.627)
/**
 * /pro-trial-expired 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function call(onDone, context) {
  return jsxProd_default(ProTrialExpiredDialog, {
    onDone,
    caller: context,
  });
}
//@ chunk-163scjsz.js:19199-19203 placement
init_react_production();
//@ chunk-163scjsz.js:19203-19247 fingerprint (2.1.88 match: _temp, 1)
function selectBridgeConnected(s) {
  return s.replBridgeConnected;
}
//@ chunk-163scjsz.js:19247-19291 fingerprint (2.1.88 match: _temp2, 1)
function selectBridgeEnabled(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-163scjsz.js:19291-19340 fingerprint (2.1.88 match: _temp3, 1)
function selectBridgeOutboundOnly(s_1) {
  return s_1.replBridgeOutboundOnly;
}
//@ chunk-163scjsz.js:19340-19443 layout
function oauthAccountKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  return (
    oauthAccountInfo && {
      accountUuid: oauthAccountInfo.accountUuid,
      organizationUuid: oauthAccountInfo.organizationUuid,
    }
  );
}
//@ chunk-163scjsz.js:19443-19469 layout
function gatewayAuthSnapshot() {
  return getGatewayAuth();
}
//@ chunk-163scjsz.js:19469-19516 fingerprint (2.1.88 match: _temp4, 1)
function selectBridgeSessionUrl(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-163scjsz.js:19516-19563 fingerprint (2.1.88 match: _temp5, 1)
function selectBridgeConnectUrl(s_0) {
  return s_0.replBridgeConnectUrl;
}
//@ chunk-163scjsz.js:19563-19613 fingerprint (2.1.88 match: _temp6, 1)
function selectBridgeSessionActive(s_1) {
  return s_1.replBridgeSessionActive;
}
//@ chunk-163scjsz.js:19613-19659 affinity (2.1.88 match: _temp, 1)
function selectNothing(state) {
  return state.replBridgeConnected;
}
//@ chunk-163scjsz.js:19794-19840 sole-consumer
function bridgeErrorKind(state) {
  return state.replBridgeErrorKind;
}
//@ chunk-163scjsz.js:19840-19857 sole-consumer
function noopBridgeHook(state) {}
//@ chunk-163scjsz.js:19857-19882 sole-consumer
function selectFalse(state) {
  return false;
}
//@ chunk-163scjsz.js:19882-19908 sole-consumer
function selectNull() {
  return null;
}
//@ chunk-163scjsz.js:19908-19923 sole-consumer
function noopEffect() {}
//@ chunk-163scjsz.js:19923-20211 sole-consumer
function clearBridgeAppState(state) {
  if (!state.replBridgeEnabled && state.replBridgeError === undefined) {
    return state;
  }
  return {
    ...state,
    replBridgeEnabled: false,
    replBridgeExplicit: false,
    replBridgeOutboundOnly: false,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    replBridgeSessionGroupingId: undefined,
    notifications: removeNotificationByKey(state.notifications, BRIDGE_FAILED),
  };
}
//@ chunk-163scjsz.js:20211-20237 affinity
function logicalNot(value) {
  return !value;
}
//@ chunk-163scjsz.js:20237-20272 file-local
function isNonEmpty(l) {
  return l.length > 0;
}
//@ chunk-163scjsz.js:20272-20303 layout
function shareRowPort(row) {
  return row.port;
}
//@ chunk-163scjsz.js:20303-20351 layout
function renderTextRow(children, key) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    key,
  );
}
//@ chunk-163scjsz.js:20351-20422 layout
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
//@ chunk-163scjsz.js:20422-20882 layout
var PROJECT_FIXED_WHEN_CONNECTED_MESSAGE =
  "Remote Control is already connected \u2014 a session's Project is fixed when it's created. Disconnect first, then re-run /remote-control --project to start a new session in the Project.";
var REMOTE_CONTROL_RETRY_HINT =
  "To try again, choose Continue, wait about 10 seconds for Remote Control to switch off, then run /remote-control.";
var REMOTE_CONTROL_KEEP_WORKING_HINT = "You can keep working here without Remote Control.";
var REMOTE_CONTROL_RECOVERY_HINTS = {
  auth: "Run /login to restore Remote Control.",
  network: REMOTE_CONTROL_RETRY_HINT,
  terminal: REMOTE_CONTROL_RETRY_HINT,
  ended_elsewhere: REMOTE_CONTROL_KEEP_WORKING_HINT,
};
//@ chunk-163scjsz.js:20882-23899 callgraph-witnessed (2.1.88 match: BridgeToggle, 0.17)
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
      let accountAtPrompt = false;
      enableRemoteControlWithConsent({
        setAppState,
        requestDialog: context?.requestDialog,
        dialogStore: context?.dialogStore,
        storageV5: context?.storageV5,
        via: "remote_control",
        name,
        sessionGroupingId,
        onCalloutRequested: () => {
          accountAtPrompt = true;
          onDone("", {
            display: "system",
          });
        },
      })
        .then((prev) => {
          switch (prev.kind) {
            case "cannot_ask": {
              onDone(
                "Remote Control asks for a one-time confirmation before it's first enabled, and this session can't show it. Run /remote-control from an interactive Claude Code session.",
                {
                  display: "system",
                },
              );
              return;
            }
            case "already_on_project_fixed": {
              onDone(PROJECT_FIXED_WHEN_CONNECTED_MESSAGE, {
                display: "system",
              });
              return;
            }
            case "already_asking":
            case "enabled":
            case "declined":
            case "account_changed": {
              if (!accountAtPrompt)
                onDone("", {
                  display: "system",
                });
              return;
            }
          }
        })
        .catch(logError);
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
            via: lit("remote_control"),
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
//@ chunk-163scjsz.js:23899-29714 fingerprint (2.1.88 match: BridgeDisconnectDialog, 0.34)
function BridgeDisconnectDialog(props) {
  let $ = useMemoCache(124);
  let { onDone, sessionGroupingId } = props;
  useRegisterOverlay("bridge-disconnect-dialog");
  let setAppState = useSetAppState();
  let sessionUrl = useAppState(selectBridgeSessionUrl);
  let connectUrl = useAppState(selectBridgeConnectUrl);
  let sessionActive = useAppState(selectBridgeSessionActive);
  let appState = useAppState(selectNothing);
  let appState_2 = useAppState(reconnecting);
  let appState_3 = useAppState(enabled);
  let message = useAppState(error);
  let appState_4 = useAppState(bridgeErrorKind);
  let hasSessionUrl = appState && !appState_2;
  let hasErrorText = !hasSessionUrl && Boolean(message);
  let [canShowQr] = useState(hasSessionUrl);
  let appState_5 = useAppState(noopBridgeHook);
  let [isQrShown, setIsQrShown] = useState(false);
  let [statusText, setStatusText] = useState("");
  let [initialState] = useState(appState_5);
  let appState_6 = useAppState(selectFalse);
  let [blockedByStore] = useState(!appState_6 && !hasErrorText);
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
  let [error_2] = useState(null);
  let { box, rows } = useOfferRoom();
  let rowsRef = useRef(null);
  let measureBodyHeight;
  if ($[5] !== box) {
    measureBodyHeight = () => {
      if (box.current === null || rowsRef.current === null) {
        return null;
      }
      let height = measureElement(box.current).height;
      return height === 0 ? null : height - topWithin(rowsRef.current, box.current);
    };
    $[5] = box;
    $[6] = measureBodyHeight;
  } else measureBodyHeight = $[6];
  let measured = useMeasured(measureBodyHeight);
  let overflowRows = useGrownOverflow(measured === null ? -Infinity : measured - rows);
  if (measured !== null) overflowRows <= 0;
  let text = sessionActive ? sessionUrl : connectUrl;
  let needsSession = hasErrorText || (!appState && !appState_3);
  let errorHelp = REMOTE_CONTROL_RECOVERY_HINTS[appState_4 ?? "terminal"];
  let isHelpAlreadyCovered =
    errorHelp === REMOTE_CONTROL_RETRY_HINT
      ? isActionableHint(message) && !message?.includes("/remote-control")
      : appState_4 === "auth" && message !== BRIDGE_LOGIN_HINT && message?.includes("/login") === true;
  let helpLine = !hasErrorText
    ? ""
    : message === BRIDGE_SIGNATURE_WANTED_HINT
      ? REMOTE_CONTROL_KEEP_WORKING_HINT
      : isHelpAlreadyCovered
        ? ""
        : errorHelp;
  let body;
  let footer;
  if ($[7] !== text || $[8] !== isQrShown) {
    body = () => {
      if (!isQrShown || !text) {
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
    footer = [isQrShown, text];
    $[7] = text;
    $[8] = isQrShown;
    $[9] = body;
    $[10] = footer;
  } else {
    body = $[9];
    footer = $[10];
  }
  useEffect(body, footer);
  let statusLine;
  if ($[11] !== onDone || $[12] !== setAppState) {
    statusLine = function handleDisconnect() {
      setAppState(clearBridgeAppState);
      logEvent("tengu_bridge_command", {
        action: lit("disconnect"),
      });
      onDone(REMOTE_CONTROL_DISCONNECTED_MSG, {
        display: "system",
      });
    };
    $[11] = onDone;
    $[12] = setAppState;
    $[13] = statusLine;
  } else statusLine = $[13];
  let run = statusLine;
  let urlLine;
  if ($[14] !== hasSessionUrl) {
    urlLine = function showQr() {
      if (hasSessionUrl) setIsQrShown(logicalNot);
    };
    $[14] = hasSessionUrl;
    $[15] = urlLine;
  } else urlLine = $[15];
  let run_2 = urlLine;
  let content;
  if ($[16] !== error_2 || $[17] !== onDone) {
    content = function continueOnDone() {
      if (error_2 === null)
        onDone(undefined, {
          display: "skip",
        });
    };
    $[16] = error_2;
    $[17] = onDone;
    $[18] = content;
  } else content = $[18];
  let continueAction = content;
  let meta;
  if ($[19] !== hasErrorText) {
    meta = hasErrorText ? ["Can archive it now and stop a later --resume reconnecting it"] : [];
    $[19] = hasErrorText;
    $[20] = meta;
  } else meta = $[20];
  let disconnectRow;
  if ($[21] !== run || $[22] !== meta) {
    disconnectRow = {
      key: "disconnect",
      run,
      label: "Disconnect this session",
      meta,
    };
    $[21] = run;
    $[22] = meta;
    $[23] = disconnectRow;
  } else disconnectRow = $[23];
  let qrRows;
  if ($[24] !== run_2 || $[25] !== canShowQr || $[26] !== hasSessionUrl || $[27] !== isQrShown) {
    qrRows =
      hasSessionUrl || canShowQr
        ? [
            {
              key: "qr",
              run: run_2,
              label: !hasSessionUrl ? "QR code unavailable" : isQrShown ? "Hide QR code" : "Show QR code",
              meta: hasSessionUrl && !isQrShown ? ["Scan with your phone to open this session"] : [],
            },
          ]
        : [];
    $[24] = run_2;
    $[25] = canShowQr;
    $[26] = hasSessionUrl;
    $[27] = isQrShown;
    $[28] = qrRows;
  } else qrRows = $[28];
  let continueRow;
  if ($[29] !== continueAction) {
    continueRow = {
      key: "continue",
      run: continueAction,
      label: "Continue",
    };
    $[29] = continueAction;
    $[30] = continueRow;
  } else continueRow = $[30];
  let bodyRows;
  if ($[31] !== disconnectRow || $[32] !== qrRows || $[33] !== continueRow) {
    bodyRows = [disconnectRow, ...qrRows, continueRow];
    $[31] = disconnectRow;
    $[32] = qrRows;
    $[33] = continueRow;
    $[34] = bodyRows;
  } else bodyRows = $[34];
  let panelBody = bodyRows;
  let statusRow;
  let helpRow;
  let ref;
  let flexDirection;
  let gap;
  let projectFixedNotice;
  let qrLines;
  let panelTitle;
  let cancelHandler;
  let hideInputGuide;
  let statusBox;
  let statusRef;
  let title;
  let onCancel;
  let hideInputGuide_2;
  if (
    $[35] !== box ||
    $[36] !== appState ||
    $[37] !== text ||
    $[38] !== storeSnapshot ||
    $[39] !== message ||
    $[40] !== hasErrorText ||
    $[41] !== continueAction ||
    $[42] !== blockedByStore ||
    $[43] !== state ||
    $[44] !== helpLine ||
    $[45] !== needsSession ||
    $[46] !== statusText ||
    $[47] !== hasSessionUrl ||
    $[48] !== appState_2 ||
    $[49] !== sessionActive ||
    $[50] !== sessionGroupingId ||
    $[51] !== isQrShown
  ) {
    let groupingId = statusText
      ? statusText
          .split(
            `
`,
          )
          .filter(isNonEmpty)
      : [];
    let statusDisplay;
    if ($[67] !== appState || $[68] !== message || $[69] !== appState_2 || $[70] !== sessionActive) {
      statusDisplay = getBridgeStatus({
        error: message,
        connected: appState,
        sessionActive,
        reconnecting: appState_2,
      });
      $[67] = appState;
      $[68] = message;
      $[69] = appState_2;
      $[70] = sessionActive;
      $[71] = statusDisplay;
    } else statusDisplay = $[71];
    let { label, color } = statusDisplay;
    helpRow = Dialog;
    title = "Remote Control";
    onCancel = continueAction;
    hideInputGuide_2 = true;
    statusRow = Box;
    ref = box;
    flexDirection = "column";
    gap = 1;
    if ($[72] !== sessionGroupingId) {
      projectFixedNotice =
        sessionGroupingId !== undefined &&
        jsxProd_default(Text, {
          children:
            "A session's Project is fixed when it's created \u2014 disconnect first, then re-run /remote-control --project to start a new one.",
        });
      $[72] = sessionGroupingId;
      $[73] = projectFixedNotice;
    } else projectFixedNotice = $[73];
    if (
      $[74] !== text ||
      $[75] !== message ||
      $[76] !== needsSession ||
      $[77] !== hasSessionUrl ||
      $[78] !== color ||
      $[79] !== label
    ) {
      qrLines = hasSessionUrl
        ? jsxProd_default_2(Text, {
            children: [
              "This session is available in the Claude mobile app",
              text ? ` and at ${text}` : " and claude.ai/code",
              ".",
            ],
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                color,
                children: needsSession ? `${BRIDGE_FAILED_INDICATOR} Remote Control isn't connected.` : label,
              }),
              jsxProd_default(ErrorText, {
                error: message === BRIDGE_LOGIN_HINT ? "Remote Control needs a claude.ai sign-in." : message,
              }),
            ],
          });
      $[74] = text;
      $[75] = message;
      $[76] = needsSession;
      $[77] = hasSessionUrl;
      $[78] = color;
      $[79] = label;
      $[80] = qrLines;
    } else qrLines = $[80];
    if ($[81] !== helpLine) {
      panelTitle =
        helpLine &&
        jsxProd_default(Text, {
          children: helpLine,
        });
      $[81] = helpLine;
      $[82] = panelTitle;
    } else panelTitle = $[82];
    let endedShares;
    if ($[83] !== storeSnapshot?.endedShares) {
      endedShares = storeSnapshot?.endedShares ?? [];
      $[83] = storeSnapshot?.endedShares;
      $[84] = endedShares;
    } else endedShares = $[84];
    let portsWithRow;
    if ($[85] !== storeSnapshot?.shareRows) {
      portsWithRow = storeSnapshot?.shareRows.map(shareRowPort) ?? [];
      $[85] = storeSnapshot?.shareRows;
      $[86] = portsWithRow;
    } else portsWithRow = $[86];
    const hasDialRow = blockedByStore && !hasErrorText;
    const drewReason =
      state === "ready" && storeSnapshot !== null && storeSnapshot.sharesNothingBecause !== null;
    if (
      $[87] !== state ||
      $[88] !== endedShares ||
      $[89] !== portsWithRow ||
      $[90] !== hasDialRow ||
      $[91] !== drewReason
    ) {
      cancelHandler = jsxProd_default(useLatchedBridgeNotice, {
        inRemoteControl: {
          stateAtOpen: state,
          endedShares,
          portsWithRow,
          hasDialRow,
          drewReason,
        },
      });
      $[87] = state;
      $[88] = endedShares;
      $[89] = portsWithRow;
      $[90] = hasDialRow;
      $[91] = drewReason;
      $[92] = cancelHandler;
    } else cancelHandler = $[92];
    hideInputGuide = false;
    statusBox = false;
    statusRef =
      hasSessionUrl &&
      isQrShown &&
      groupingId.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        children: groupingId.map(renderTextRow),
      });
    $[35] = box;
    $[36] = appState;
    $[37] = text;
    $[38] = storeSnapshot;
    $[39] = message;
    $[40] = hasErrorText;
    $[41] = continueAction;
    $[42] = blockedByStore;
    $[43] = state;
    $[44] = helpLine;
    $[45] = needsSession;
    $[46] = statusText;
    $[47] = hasSessionUrl;
    $[48] = appState_2;
    $[49] = sessionActive;
    $[50] = sessionGroupingId;
    $[51] = isQrShown;
    $[52] = statusRow;
    $[53] = helpRow;
    $[54] = ref;
    $[55] = flexDirection;
    $[56] = gap;
    $[57] = projectFixedNotice;
    $[58] = qrLines;
    $[59] = panelTitle;
    $[60] = cancelHandler;
    $[61] = hideInputGuide;
    $[62] = statusBox;
    $[63] = statusRef;
    $[64] = title;
    $[65] = onCancel;
    $[66] = hideInputGuide_2;
  } else {
    statusRow = $[52];
    helpRow = $[53];
    ref = $[54];
    flexDirection = $[55];
    gap = $[56];
    projectFixedNotice = $[57];
    qrLines = $[58];
    panelTitle = $[59];
    cancelHandler = $[60];
    hideInputGuide = $[61];
    statusBox = $[62];
    statusRef = $[63];
    title = $[64];
    onCancel = $[65];
    hideInputGuide_2 = $[66];
  }
  const { length: rowCount, length: defaultFocusIndex } = panelBody;
  const defaultFocusIndex_2 = panelBody.length - 1;
  const isDisabled = error_2 !== null;
  let onSelect;
  if ($[93] !== error_2 || $[94] !== panelBody) {
    onSelect = (index) => {
      if (error_2 === null) panelBody[index]?.run();
    };
    $[93] = error_2;
    $[94] = panelBody;
    $[95] = onSelect;
  } else onSelect = $[95];
  let children;
  if ($[96] !== panelBody) {
    children = panelBody.map(renderListItem);
    $[96] = panelBody;
    $[97] = children;
  } else children = $[97];
  let optionElement;
  if (
    $[98] !== panelBody.length ||
    $[99] !== defaultFocusIndex_2 ||
    $[100] !== isDisabled ||
    $[101] !== onSelect ||
    $[102] !== children
  ) {
    optionElement = jsxProd_default(
      OrderedListWithItem,
      {
        visibleCount: defaultFocusIndex,
        defaultFocusIndex: defaultFocusIndex_2,
        wrap: true,
        declineHomeEnd: true,
        isDisabled,
        onSelect,
        children,
      },
      rowCount,
    );
    $[98] = panelBody.length;
    $[99] = defaultFocusIndex_2;
    $[100] = isDisabled;
    $[101] = onSelect;
    $[102] = children;
    $[103] = optionElement;
  } else optionElement = $[103];
  let status;
  if ($[104] === MEMO_CACHE_SENTINEL) {
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
    $[104] = status;
  } else status = $[104];
  let children_2;
  if (
    $[105] !== statusRow ||
    $[106] !== ref ||
    $[107] !== flexDirection ||
    $[108] !== gap ||
    $[109] !== projectFixedNotice ||
    $[110] !== qrLines ||
    $[111] !== panelTitle ||
    $[112] !== cancelHandler ||
    $[113] !== hideInputGuide ||
    $[114] !== statusBox ||
    $[115] !== statusRef ||
    $[116] !== optionElement
  ) {
    children_2 = jsxProd_default_2(statusRow, {
      ref,
      flexDirection,
      gap,
      children: [
        projectFixedNotice,
        qrLines,
        panelTitle,
        cancelHandler,
        hideInputGuide,
        statusBox,
        statusRef,
        optionElement,
        status,
      ],
    });
    $[105] = statusRow;
    $[106] = ref;
    $[107] = flexDirection;
    $[108] = gap;
    $[109] = projectFixedNotice;
    $[110] = qrLines;
    $[111] = panelTitle;
    $[112] = cancelHandler;
    $[113] = hideInputGuide;
    $[114] = statusBox;
    $[115] = statusRef;
    $[116] = optionElement;
    $[117] = children_2;
  } else children_2 = $[117];
  let reason;
  if (
    $[118] !== helpRow ||
    $[119] !== title ||
    $[120] !== onCancel ||
    $[121] !== hideInputGuide_2 ||
    $[122] !== children_2
  ) {
    reason = jsxProd_default(helpRow, {
      title,
      onCancel,
      hideInputGuide: hideInputGuide_2,
      children: children_2,
    });
    $[118] = helpRow;
    $[119] = title;
    $[120] = onCancel;
    $[121] = hideInputGuide_2;
    $[122] = children_2;
    $[123] = reason;
  } else reason = $[123];
  return reason;
}
//@ chunk-163scjsz.js:29714-29827 placement
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
export {
  isBridgeEnabledInbound,
  bridgeAskedAs,
  checkBridgePrerequisites,
  enableRemoteControlWithConsent,
  waitForBridgeConnected,
  call,
  remoteControlCall,
};
