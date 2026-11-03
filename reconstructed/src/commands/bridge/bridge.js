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
import { init_react_production, y, P, R } from "../../../vendor/react/cjs/react.production.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED } from "../../bridge/bridgeStatusUtil.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSetAppState, useAppState } from "../../state/AppState.js";
import { markRemoteControlUsed } from "../../services/tips/remoteControlNudges.js";
import {
  shouldShowRemoteCallout as shouldShowRemoteCallout_2,
  REMOTE_CALLOUT_DIALOG,
} from "../../components/RemoteCallout.js";
import { hasOpenDialogOfKind } from "../../state/dialogQueue.js";
import { logForDebugging } from "../../utils/debug.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Login, runPostLoginHooks } from "../../services/oauth/postLoginHooks.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { toString } from "../../../vendor/qrcode/lib/server.js";
import { REMOTE_CONTROL_DISCONNECTED_MSG, BRIDGE_LOGIN_INSTRUCTION } from "../../bridge/types.js";
import { Dialog } from "../../components/design-system/Dialog.js";
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
import { idleAmberFinchOn } from "../../utils/planTiers.js";
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { call as call_2 } from "../usage-credits/usageCredits.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-k7ve8htw.js:18017-18021 sole-consumer
init_react_production();
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
function shouldShowRemoteCallout(x) {
  return x.remoteDialogSeen
    ? x
    : {
        ...x,
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
function selectNothing(Gr) {}
//@ chunk-k7ve8htw.js:18516-18541 layout
function selectFalse(Ur) {
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
function logicalNot(Ao) {
  return !Ao;
}
//@ chunk-k7ve8htw.js:18896-18931 file-local
function isNonEmpty(l) {
  return l.length > 0;
}
//@ chunk-k7ve8htw.js:18931-18962 layout
function shareRowPort(So) {
  return So.port;
}
//@ chunk-k7ve8htw.js:18962-19010 layout
function renderTextRow(children, xo) {
  return jsxProd_default(
    Text,
    {
      children,
    },
    xo,
  );
}
//@ chunk-k7ve8htw.js:19010-19081 layout
function renderListItem(en) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: en.label,
      meta: en.meta,
    },
    en.key,
  );
}
//@ chunk-k7ve8htw.js:19081-19276 layout
var PROJECT_FIXED_WHEN_CONNECTED_MESSAGE =
  "Remote Control is already connected \u2014 a session's Project is fixed when it's created. Disconnect first, then re-run /remote-control --project to start a new session in the Project.";
//@ chunk-k7ve8htw.js:19276-23125 fingerprint = BridgeToggle (0.346)
function BridgeToggle(props) {
  let g = w(25);
  let { onDone, name, sessionGroupingId, context } = props;
  let setAppState = useSetAppState();
  let replBridgeConnected = useAppState(selectBridgeConnected);
  let replBridgeEnabled = useAppState(selectBridgeEnabled);
  let replBridgeOutboundOnly = useAppState(selectBridgeOutboundOnly);
  let [Ze, J] = y(false);
  let [te, ie] = y(false);
  let [se] = y(oauthAccountKey);
  let [T] = y(gatewayAuthSnapshot);
  let i;
  if (
    g[0] !== context?.dialogStore ||
    g[1] !== context?.requestDialog ||
    g[2] !== context?.storageV5 ||
    g[3] !== name ||
    g[4] !== onDone ||
    g[5] !== sessionGroupingId ||
    g[6] !== setAppState
  ) {
    i = function k() {
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
        setAppState((W) =>
          W.replBridgeInitialName === name && W.replBridgeSessionGroupingId === sessionGroupingId
            ? W
            : {
                ...W,
                replBridgeInitialName: name,
                replBridgeSessionGroupingId: sessionGroupingId,
              },
        );
        onDone("", {
          display: "system",
        });
        let A = accountKeyOf(getOauthAccountInfo());
        requestDialog(
          REMOTE_CALLOUT_DIALOG,
          {},
          {
            place: "under",
          },
        )
          .then((_) => {
            let le = _ === "enable" && accountKeyOf(getOauthAccountInfo()) === A;
            if (_ === "enable" && !le)
              logForDebugging(
                "[bridge:repl] Remote Control callout answered under a different account than it was asked for \u2014 not enabling",
              );
            if (le) {
              saveGlobalConfig(shouldShowRemoteCallout, context?.storageV5);
              logEvent("tengu_bridge_command", {
                action: lit("connect"),
              });
            }
            setAppState((prev) => {
              if (le) {
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
      let Oe = false;
      setAppState((prev) => {
        if (prev.replBridgeEnabled && !prev.replBridgeOutboundOnly) {
          if (sessionGroupingId !== undefined) Oe = true;
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
      if (Oe) {
        onDone(PROJECT_FIXED_WHEN_CONNECTED_MESSAGE, {
          display: "system",
        });
        return;
      }
      onDone("", {
        display: "system",
      });
    };
    g[0] = context?.dialogStore;
    g[1] = context?.requestDialog;
    g[2] = context?.storageV5;
    g[3] = name;
    g[4] = onDone;
    g[5] = sessionGroupingId;
    g[6] = setAppState;
    g[7] = i;
  } else i = g[7];
  let k = i;
  let Le;
  if (
    g[8] !== context?.credentials ||
    g[9] !== k ||
    g[10] !== onDone ||
    g[11] !== replBridgeConnected ||
    g[12] !== replBridgeEnabled ||
    g[13] !== replBridgeOutboundOnly
  ) {
    Le = () => {
      if ((replBridgeConnected || replBridgeEnabled) && !replBridgeOutboundOnly) {
        J(true);
        return;
      }
      let Te = false;
      (async () => {
        let O = await checkBridgePrerequisites(context?.credentials);
        if (Te) {
          return;
        }
        if (O?.kind === "error") {
          logEvent("tengu_bridge_command", {
            action: lit("preflight_failed"),
          });
          onDone(O.message, {
            display: "system",
          });
          return;
        }
        if (O?.kind === "unenrolled-trusted-device") {
          logEvent("tengu_bridge_command", {
            action: lit("preflight_login_for_enrollment"),
          });
          ie(true);
          return;
        }
        k();
      })();
      return () => {
        Te = true;
      };
    };
    g[8] = context?.credentials;
    g[9] = k;
    g[10] = onDone;
    g[11] = replBridgeConnected;
    g[12] = replBridgeEnabled;
    g[13] = replBridgeOutboundOnly;
    g[14] = Le;
  } else Le = g[14];
  let X;
  if (g[15] === MEMO_CACHE_SENTINEL) {
    X = [];
    g[15] = X;
  } else X = g[15];
  P(Le, X);
  if (Ze) {
    let N;
    if (g[16] !== onDone || g[17] !== sessionGroupingId) {
      N = jsxProd_default(BridgeDisconnectDialog, {
        onDone,
        sessionGroupingId,
      });
      g[16] = onDone;
      g[17] = sessionGroupingId;
      g[18] = N;
    } else N = g[18];
    return N;
  }
  if (te) {
    if (!context) {
      onDone(
        "Your organization requires Trusted Devices for Remote Control, but this device is not enrolled. Please run `/login` in Claude Code to enroll this device.",
        {
          display: "system",
        },
      );
      return null;
    }
    let N;
    if (g[19] !== context || g[20] !== k || g[21] !== onDone || g[22] !== se || g[23] !== T) {
      N = jsxProd_default(Login, {
        startingMessage: "Sign in to enroll this device for Remote Control.",
        onDone: async (H, ke, setAppState) => {
          let z = await runPostLoginHooks(context, H, {
            setAppState,
            awaitEnrollment: true,
            previousAccount: se,
            previousGatewayAuth: T,
          });
          if (z.gatewayLoginError !== undefined || z.relaunching) {
            onDone(
              z.gatewayLoginError,
              z.gatewayLoginError !== undefined
                ? {
                    display: "system",
                  }
                : undefined,
            );
            return;
          }
          if (!H) {
            logEvent("tengu_bridge_command", {
              action: lit("preflight_login_canceled"),
            });
            onDone("Sign-in canceled. Run /remote-control after enrolling this device.", {
              display: "system",
            });
            return;
          }
          let h = await checkBridgePrerequisites(context?.credentials);
          if (h?.kind === "error") {
            onDone(h.message, {
              display: "system",
            });
            return;
          }
          if (h?.kind === "unenrolled-trusted-device") {
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
          k();
        },
      });
      g[19] = context;
      g[20] = k;
      g[21] = onDone;
      g[22] = se;
      g[23] = T;
      g[24] = N;
    } else N = g[24];
    return N;
  }
  return null;
}
//@ chunk-k7ve8htw.js:23125-27247 fingerprint = BridgeDisconnectDialog (0.423)
function BridgeDisconnectDialog(props) {
  let i = w(91);
  let { onDone, sessionGroupingId } = props;
  useRegisterOverlay("bridge-disconnect-dialog");
  let setAppState = useSetAppState();
  let sessionUrl = useAppState(selectBridgeSessionUrl);
  let connectUrl = useAppState(selectBridgeConnectUrl);
  let sessionActive = useAppState(selectBridgeSessionActive);
  let appState = useAppState(selectNothing);
  let [u, Ze] = y(false);
  let [J, te] = y("");
  let [ie] = y(appState);
  let appState_2 = useAppState(selectFalse);
  y(!appState_2);
  let [T] = y(selectNull);
  let [g] = y(ie);
  let ae;
  if (i[0] !== g || i[1] !== T) {
    ae = () =>
      T === null || g === "ready"
        ? T
        : {
            ...T,
            shared: [],
            shareRows: [],
          };
    i[0] = g;
    i[1] = T;
    i[2] = ae;
  } else ae = i[2];
  let [m] = y(ae);
  R(null);
  let W;
  if (i[3] !== m) {
    W = [m];
    i[3] = m;
    i[4] = W;
  } else W = i[4];
  P(noopEffect, W);
  let [A] = y(null);
  let text = sessionActive ? sessionUrl : connectUrl;
  let le;
  let D;
  if (i[5] !== text || i[6] !== u) {
    le = () => {
      if (!u || !text) {
        te("");
        return;
      }
      toString(text, {
        type: "utf8",
        errorCorrectionLevel: "L",
        small: true,
      })
        .then(te)
        .catch(() => te(""));
    };
    D = [u, text];
    i[5] = text;
    i[6] = u;
    i[7] = le;
    i[8] = D;
  } else {
    le = i[7];
    D = i[8];
  }
  P(le, D);
  let Oe;
  if (i[9] !== onDone || i[10] !== setAppState) {
    Oe = function handleDisconnect() {
      setAppState(clearBridgeAppState);
      logEvent("tengu_bridge_command", {
        action: lit("disconnect"),
      });
      onDone(REMOTE_CONTROL_DISCONNECTED_MSG, {
        display: "system",
      });
    };
    i[9] = onDone;
    i[10] = setAppState;
    i[11] = Oe;
  } else Oe = i[11];
  let run = Oe;
  let k;
  if (i[12] === MEMO_CACHE_SENTINEL) {
    k = function handleShowQR() {
      Ze(logicalNot);
    };
    i[12] = k;
  } else k = i[12];
  let run_2 = k;
  let Te;
  if (i[13] !== A || i[14] !== onDone) {
    Te = function handleContinue() {
      if (A === null)
        onDone(undefined, {
          display: "skip",
        });
    };
    i[13] = A;
    i[14] = onDone;
    i[15] = Te;
  } else Te = i[15];
  let O = Te;
  let X;
  if (i[16] !== run) {
    X = {
      key: "disconnect",
      run,
      label: "Disconnect this session",
    };
    i[16] = run;
    i[17] = X;
  } else X = i[17];
  const label = u ? "Hide QR code" : "Show QR code";
  let meta;
  if (i[18] !== u) {
    meta = u ? [] : ["Scan with your phone to open this session"];
    i[18] = u;
    i[19] = meta;
  } else meta = i[19];
  let ke;
  if (i[20] !== meta || i[21] !== label) {
    ke = {
      key: "qr",
      run: run_2,
      label,
      meta,
    };
    i[20] = meta;
    i[21] = label;
    i[22] = ke;
  } else ke = i[22];
  let de;
  if (i[23] !== O) {
    de = {
      key: "continue",
      run: O,
      label: "Continue",
    };
    i[23] = O;
    i[24] = de;
  } else de = i[24];
  let z;
  if (i[25] !== ke || i[26] !== de || i[27] !== X) {
    z = [X, ke, de];
    i[25] = ke;
    i[26] = de;
    i[27] = X;
    i[28] = z;
  } else z = i[28];
  let h = z;
  let ce;
  let pe;
  let flexDirection;
  let gap;
  let x;
  let ge;
  let me;
  let Ce;
  let Ae;
  let Be;
  let title;
  let onCancel;
  let hideInputGuide;
  if (
    i[29] !== text ||
    i[30] !== m ||
    i[31] !== O ||
    i[32] !== g ||
    i[33] !== J ||
    i[34] !== sessionGroupingId ||
    i[35] !== u
  ) {
    let Pn = J
      ? J.split(
          `
`,
        ).filter(isNonEmpty)
      : [];
    pe = Dialog;
    title = "Remote Control";
    onCancel = O;
    hideInputGuide = true;
    ce = Box;
    flexDirection = "column";
    gap = 1;
    if (i[49] !== sessionGroupingId) {
      x =
        sessionGroupingId !== undefined &&
        jsxProd_default(Text, {
          children:
            "A session's Project is fixed when it's created \u2014 disconnect first, then re-run /remote-control --project to start a new one.",
        });
      i[49] = sessionGroupingId;
      i[50] = x;
    } else x = i[50];
    const he = text ? ` and at ${text}` : " and claude.ai/code";
    if (i[51] !== he) {
      ge = jsxProd_default_2(Text, {
        children: ["This session is available in the Claude mobile app", he, "."],
      });
      i[51] = he;
      i[52] = ge;
    } else ge = i[52];
    let endedShares;
    if (i[53] !== m?.endedShares) {
      endedShares = m?.endedShares ?? [];
      i[53] = m?.endedShares;
      i[54] = endedShares;
    } else endedShares = i[54];
    let portsWithRow;
    if (i[55] !== m?.shareRows) {
      portsWithRow = m?.shareRows.map(shareRowPort) ?? [];
      i[55] = m?.shareRows;
      i[56] = portsWithRow;
    } else portsWithRow = i[56];
    const drewReason = g === "ready" && m !== null && m.sharesNothingBecause !== null;
    if (i[57] !== g || i[58] !== endedShares || i[59] !== portsWithRow || i[60] !== drewReason) {
      me = jsxProd_default(useLatchedBridgeNotice, {
        inRemoteControl: {
          stateAtOpen: g,
          endedShares,
          portsWithRow,
          drewReason,
        },
      });
      i[57] = g;
      i[58] = endedShares;
      i[59] = portsWithRow;
      i[60] = drewReason;
      i[61] = me;
    } else me = i[61];
    Ce = false;
    Ae = false;
    Be =
      u &&
      Pn.length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        children: Pn.map(renderTextRow),
      });
    i[29] = text;
    i[30] = m;
    i[31] = O;
    i[32] = g;
    i[33] = J;
    i[34] = sessionGroupingId;
    i[35] = u;
    i[36] = ce;
    i[37] = pe;
    i[38] = flexDirection;
    i[39] = gap;
    i[40] = x;
    i[41] = ge;
    i[42] = me;
    i[43] = Ce;
    i[44] = Ae;
    i[45] = Be;
    i[46] = title;
    i[47] = onCancel;
    i[48] = hideInputGuide;
  } else {
    ce = i[36];
    pe = i[37];
    flexDirection = i[38];
    gap = i[39];
    x = i[40];
    ge = i[41];
    me = i[42];
    Ce = i[43];
    Ae = i[44];
    Be = i[45];
    title = i[46];
    onCancel = i[47];
    hideInputGuide = i[48];
  }
  const visibleCount = h.length;
  const defaultFocusIndex = h.length - 1;
  const isDisabled = A !== null;
  let onSelect;
  if (i[62] !== A || i[63] !== h) {
    onSelect = (To) => {
      if (A === null) h[To]?.run();
    };
    i[62] = A;
    i[63] = h;
    i[64] = onSelect;
  } else onSelect = i[64];
  let children;
  if (i[65] !== h) {
    children = h.map(renderListItem);
    i[65] = h;
    i[66] = children;
  } else children = i[66];
  let je;
  if (
    i[67] !== h.length ||
    i[68] !== defaultFocusIndex ||
    i[69] !== isDisabled ||
    i[70] !== onSelect ||
    i[71] !== children
  ) {
    je = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      wrap: true,
      declineHomeEnd: true,
      isDisabled,
      onSelect,
      children,
    });
    i[67] = h.length;
    i[68] = defaultFocusIndex;
    i[69] = isDisabled;
    i[70] = onSelect;
    i[71] = children;
    i[72] = je;
  } else je = i[72];
  let bn;
  if (i[73] === MEMO_CACHE_SENTINEL) {
    bn = jsxProd_default(Text, {
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
    i[73] = bn;
  } else bn = i[73];
  let children_2;
  if (
    i[74] !== ce ||
    i[75] !== flexDirection ||
    i[76] !== gap ||
    i[77] !== x ||
    i[78] !== ge ||
    i[79] !== me ||
    i[80] !== Ce ||
    i[81] !== Ae ||
    i[82] !== Be ||
    i[83] !== je
  ) {
    children_2 = jsxProd_default_2(ce, {
      flexDirection,
      gap,
      children: [x, ge, me, Ce, Ae, Be, je, bn],
    });
    i[74] = ce;
    i[75] = flexDirection;
    i[76] = gap;
    i[77] = x;
    i[78] = ge;
    i[79] = me;
    i[80] = Ce;
    i[81] = Ae;
    i[82] = Be;
    i[83] = je;
    i[84] = children_2;
  } else children_2 = i[84];
  let _n;
  if (
    i[85] !== pe ||
    i[86] !== title ||
    i[87] !== onCancel ||
    i[88] !== hideInputGuide ||
    i[89] !== children_2
  ) {
    _n = jsxProd_default(pe, {
      title,
      onCancel,
      hideInputGuide,
      children: children_2,
    });
    i[85] = pe;
    i[86] = title;
    i[87] = onCancel;
    i[88] = hideInputGuide;
    i[89] = children_2;
    i[90] = _n;
  } else _n = i[90];
  return _n;
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
    let d = nullStub3();
    if (d !== null)
      return {
        kind: "error",
        message: d,
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
init_react_production();
//@ chunk-fnmk6x3n.js:17786-18799 sole-consumer
/**
 * Pro 试用到期对话框：提示试用结束，选项"升级到 Max"（非受限账号）与"充值继续用"，记 tengu_pro_trial_expired_choice 后进入对应流程。
 */
function ProTrialExpiredDialog(props) {
  let t = w(15);
  let { onDone, caller } = props;
  let [J, h] = y(null);
  if (J) {
    return J;
  }
  let x;
  if (t[0] === MEMO_CACHE_SENTINEL) {
    x = [
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
    t[0] = x;
  } else x = t[0];
  let options = x;
  let L;
  if (t[1] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default(Box, {
      paddingX: 2,
      children: jsxProd_default(Text, {
        color: "error",
        children: "Your Claude Code trial has ended.",
      }),
    });
    t[1] = L;
  } else L = t[1];
  let onCancel;
  if (t[2] !== onDone) {
    onCancel = () => onDone();
    t[2] = onDone;
    t[3] = onCancel;
  } else onCancel = t[3];
  let onCancel_2;
  if (t[4] !== onDone) {
    onCancel_2 = () => onDone();
    t[4] = onDone;
    t[5] = onCancel_2;
  } else onCancel_2 = t[5];
  let onChange;
  if (t[6] !== caller || t[7] !== onDone) {
    onChange = (R) => {
      logEvent("tengu_pro_trial_expired_choice", {
        chose_upgrade: R === "upgrade",
      });
      if (R === "upgrade")
        callUpgradeFromSurface(onDone, caller, "pro_trial_expired_dialog").then((N) => h(N));
      else call_2(onDone, caller).then((T) => h(T));
    };
    t[6] = caller;
    t[7] = onDone;
    t[8] = onChange;
  } else onChange = t[8];
  let children;
  if (t[9] !== onCancel_2 || t[10] !== onChange) {
    children = jsxProd_default(ModelSelector, {
      options,
      onCancel: onCancel_2,
      onChange,
    });
    t[9] = onCancel_2;
    t[10] = onChange;
    t[11] = children;
  } else children = t[11];
  let _;
  if (t[12] !== onCancel || t[13] !== children) {
    _ = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        L,
        jsxProd_default(Dialog, {
          title: "What do you want to do?",
          onCancel,
          children,
        }),
      ],
    });
    t[12] = onCancel;
    t[13] = children;
    t[14] = _;
  } else _ = t[14];
  return _;
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
export {
  selectBridgeConnected_2,
  selectBridgeSessionActive_2,
  selectBridgeConnectUrl_2,
  selectBridgeSessionUrl_2,
  selectBridgeEnabled_2,
  isBridgeInboundAllowed,
};
