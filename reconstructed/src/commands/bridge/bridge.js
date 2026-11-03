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
import { j, y, P, R } from "../../../vendor/react/cjs/react.production.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { getGatewayAuth } from "../../bootstrap/state.js";
import { removeNotificationByKey } from "../../context/notifications.js";
import { BRIDGE_FAILED } from "../../bridge/bridgeStatusUtil.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSetAppState, useAppState } from "../../state/AppState.js";
import { markRemoteControlUsed } from "../../services/tips/remoteControlNudges.js";
import {
  shouldShowRemoteCallout as shouldShowRemoteCallout_2,
  REMOTE_CALLOUT_DIALOG,
} from "../../components/RemoteCallout.js";
import { C0t } from "../../state/dialogQueue.js";
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
import { oAt } from "../../utils/planTiers.js";
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { call as call_2 } from "../usage-credits/usageCredits.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";

//@ chunk-k7ve8htw.js:18017-18021 sole-consumer
j();
//@ chunk-k7ve8htw.js:18021-18067 sole-consumer = _temp (1)
function ao(s) {
  return s.replBridgeConnected;
}
//@ chunk-k7ve8htw.js:18067-18111 affinity = _temp2 (1)
function lo(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-k7ve8htw.js:18111-18160 fingerprint = _temp3 (1)
function co(s_1) {
  return s_1.replBridgeOutboundOnly;
}
//@ chunk-k7ve8htw.js:18160-18259 layout
function po() {
  let V = getOauthAccountInfo();
  return V && { accountUuid: V.accountUuid, organizationUuid: V.organizationUuid };
}
//@ chunk-k7ve8htw.js:18259-18285 layout
function uo() {
  return getGatewayAuth();
}
//@ chunk-k7ve8htw.js:18285-18355 layout = shouldShowRemoteCallout (0.779)
function shouldShowRemoteCallout(x) {
  return x.remoteDialogSeen ? x : { ...x, remoteDialogSeen: !0 };
}
//@ chunk-k7ve8htw.js:18355-18402 layout = _temp4 (1)
function mo(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-k7ve8htw.js:18402-18449 layout = _temp5 (1)
function ho(s_0) {
  return s_0.replBridgeConnectUrl;
}
//@ chunk-k7ve8htw.js:18449-18499 layout = _temp6 (1)
function fo(s_1) {
  return s_1.replBridgeSessionActive;
}
//@ chunk-k7ve8htw.js:18499-18516 layout
function vo(Gr) {}
//@ chunk-k7ve8htw.js:18516-18541 layout
function wo(Ur) {
  return !1;
}
//@ chunk-k7ve8htw.js:18541-18567 layout
function yo() {
  return null;
}
//@ chunk-k7ve8htw.js:18567-18582 layout
function Po() {}
//@ chunk-k7ve8htw.js:18582-18870 layout
function clearBridgeAppState(fe) {
  if (!fe.replBridgeEnabled && fe.replBridgeError === void 0) {
    return fe;
  }
  return {
    ...fe,
    replBridgeEnabled: !1,
    replBridgeExplicit: !1,
    replBridgeOutboundOnly: !1,
    replBridgeError: void 0,
    replBridgeErrorKind: void 0,
    replBridgeSessionGroupingId: void 0,
    notifications: removeNotificationByKey(fe.notifications, BRIDGE_FAILED),
  };
}
//@ chunk-k7ve8htw.js:18870-18896 layout
function _o(Ao) {
  return !Ao;
}
//@ chunk-k7ve8htw.js:18896-18931 file-local
function Ro(l) {
  return l.length > 0;
}
//@ chunk-k7ve8htw.js:18931-18962 layout
function Do(So) {
  return So.port;
}
//@ chunk-k7ve8htw.js:18962-19010 layout
function Oo(No, xo) {
  return e(Text, { children: No }, xo);
}
//@ chunk-k7ve8htw.js:19010-19081 layout
function Lo(en) {
  return e(OrderedListWithItem.Item, { label: en.label, meta: en.meta }, en.key);
}
//@ chunk-k7ve8htw.js:19081-19276 layout
var PROJECT_FIXED_WHEN_CONNECTED_MESSAGE =
  "Remote Control is already connected \u2014 a session's Project is fixed when it's created. Disconnect first, then re-run /remote-control --project to start a new session in the Project.";
//@ chunk-k7ve8htw.js:19276-23125 fingerprint = BridgeToggle (0.346)
function BridgeToggle(t0) {
  let g = w(25),
    { onDone: onDone, name: name, sessionGroupingId: sessionGroupingId, context: context } = t0,
    setAppState = useSetAppState(),
    replBridgeConnected = useAppState(ao),
    replBridgeEnabled = useAppState(lo),
    replBridgeOutboundOnly = useAppState(co),
    [Ze, J] = y(!1),
    [te, ie] = y(!1),
    [se] = y(po),
    [T] = y(uo),
    i;
  if (
    g[0] !== context?.dialogStore ||
    g[1] !== context?.requestDialog ||
    g[2] !== context?.storageV5 ||
    g[3] !== name ||
    g[4] !== onDone ||
    g[5] !== sessionGroupingId ||
    g[6] !== setAppState
  )
    ((i = function k() {
      if ((markRemoteControlUsed(context?.storageV5), shouldShowRemoteCallout_2())) {
        let ae = context?.requestDialog;
        if (!ae) {
          onDone(
            "Remote Control asks for a one-time confirmation before it's first enabled, and this session can't show it. Run /remote-control from an interactive Claude Code session.",
            { display: "system" },
          );
          return;
        }
        let m = context?.dialogStore;
        if (m && C0t(m.getState(), REMOTE_CALLOUT_DIALOG.kind)) {
          onDone("", { display: "system" });
          return;
        }
        (setAppState((W) =>
          W.replBridgeInitialName === name && W.replBridgeSessionGroupingId === sessionGroupingId
            ? W
            : { ...W, replBridgeInitialName: name, replBridgeSessionGroupingId: sessionGroupingId },
        ),
          onDone("", { display: "system" }));
        let A = De(getOauthAccountInfo());
        ae(REMOTE_CALLOUT_DIALOG, {}, { place: "under" })
          .then((_) => {
            let le = _ === "enable" && De(getOauthAccountInfo()) === A;
            if (_ === "enable" && !le)
              logForDebugging(
                "[bridge:repl] Remote Control callout answered under a different account than it was asked for \u2014 not enabling",
              );
            if (le)
              (saveGlobalConfig(shouldShowRemoteCallout, context?.storageV5),
                logEvent("tengu_bridge_command", { action: lit("connect") }));
            setAppState((prev) => {
              if (le) {
                return prev.replBridgeEnabled && prev.replBridgeExplicit && !prev.replBridgeOutboundOnly
                  ? prev
                  : { ...prev, replBridgeEnabled: !0, replBridgeExplicit: !0, replBridgeOutboundOnly: !1 };
              }
              return prev.replBridgeInitialName === void 0 && prev.replBridgeSessionGroupingId === void 0
                ? prev
                : { ...prev, replBridgeInitialName: void 0, replBridgeSessionGroupingId: void 0 };
            });
          })
          .catch(logError);
        return;
      }
      logEvent("tengu_bridge_command", { action: lit("connect") });
      let Oe = !1;
      if (
        (setAppState((prev_0) => {
          if (prev_0.replBridgeEnabled && !prev_0.replBridgeOutboundOnly) {
            if (sessionGroupingId !== void 0) Oe = !0;
            return prev_0;
          }
          return {
            ...prev_0,
            replBridgeEnabled: !0,
            replBridgeExplicit: !0,
            replBridgeOutboundOnly: !1,
            replBridgeInitialName: name,
            replBridgeSessionGroupingId: sessionGroupingId,
          };
        }),
        Oe)
      ) {
        onDone(PROJECT_FIXED_WHEN_CONNECTED_MESSAGE, { display: "system" });
        return;
      }
      onDone("", { display: "system" });
    }),
      (g[0] = context?.dialogStore),
      (g[1] = context?.requestDialog),
      (g[2] = context?.storageV5),
      (g[3] = name),
      (g[4] = onDone),
      (g[5] = sessionGroupingId),
      (g[6] = setAppState),
      (g[7] = i));
  else i = g[7];
  let k = i,
    Le;
  if (
    g[8] !== context?.credentials ||
    g[9] !== k ||
    g[10] !== onDone ||
    g[11] !== replBridgeConnected ||
    g[12] !== replBridgeEnabled ||
    g[13] !== replBridgeOutboundOnly
  )
    ((Le = () => {
      if ((replBridgeConnected || replBridgeEnabled) && !replBridgeOutboundOnly) {
        J(!0);
        return;
      }
      let Te = !1;
      return (
        (async () => {
          let O = await checkBridgePrerequisites(context?.credentials);
          if (Te) {
            return;
          }
          if (O?.kind === "error") {
            (logEvent("tengu_bridge_command", { action: lit("preflight_failed") }),
              onDone(O.message, { display: "system" }));
            return;
          }
          if (O?.kind === "unenrolled-trusted-device") {
            (logEvent("tengu_bridge_command", { action: lit("preflight_login_for_enrollment") }), ie(!0));
            return;
          }
          k();
        })(),
        () => {
          Te = !0;
        }
      );
    }),
      (g[8] = context?.credentials),
      (g[9] = k),
      (g[10] = onDone),
      (g[11] = replBridgeConnected),
      (g[12] = replBridgeEnabled),
      (g[13] = replBridgeOutboundOnly),
      (g[14] = Le));
  else Le = g[14];
  let X;
  if (g[15] === MEMO_CACHE_SENTINEL) ((X = []), (g[15] = X));
  else X = g[15];
  if ((P(Le, X), Ze)) {
    let N;
    if (g[16] !== onDone || g[17] !== sessionGroupingId)
      ((N = e(BridgeDisconnectDialog, { onDone: onDone, sessionGroupingId: sessionGroupingId })),
        (g[16] = onDone),
        (g[17] = sessionGroupingId),
        (g[18] = N));
    else N = g[18];
    return N;
  }
  if (te) {
    if (!context) {
      return (
        onDone(
          "Your organization requires Trusted Devices for Remote Control, but this device is not enrolled. Please run `/login` in Claude Code to enroll this device.",
          { display: "system" },
        ),
        null
      );
    }
    let N;
    if (g[19] !== context || g[20] !== k || g[21] !== onDone || g[22] !== se || g[23] !== T)
      ((N = e(Login, {
        startingMessage: "Sign in to enroll this device for Remote Control.",
        onDone: async (H, ke, de) => {
          let z = await runPostLoginHooks(context, H, {
            setAppState: de,
            awaitEnrollment: !0,
            previousAccount: se,
            previousGatewayAuth: T,
          });
          if (z.gatewayLoginError !== void 0 || z.relaunching) {
            onDone(z.gatewayLoginError, z.gatewayLoginError !== void 0 ? { display: "system" } : void 0);
            return;
          }
          if (!H) {
            (logEvent("tengu_bridge_command", { action: lit("preflight_login_canceled") }),
              onDone("Sign-in canceled. Run /remote-control after enrolling this device.", {
                display: "system",
              }));
            return;
          }
          let h = await checkBridgePrerequisites(context?.credentials);
          if (h?.kind === "error") {
            onDone(h.message, { display: "system" });
            return;
          }
          if (h?.kind === "unenrolled-trusted-device") {
            (logEvent("tengu_bridge_command", { action: lit("preflight_enrollment_did_not_complete") }),
              onDone(
                "Signed in, but device enrollment didn't complete. Run /remote-control again, or check the debug log for [trusted-device] messages.",
                { display: "system" },
              ));
            return;
          }
          k();
        },
      })),
        (g[19] = context),
        (g[20] = k),
        (g[21] = onDone),
        (g[22] = se),
        (g[23] = T),
        (g[24] = N));
    else N = g[24];
    return N;
  }
  return null;
}
//@ chunk-k7ve8htw.js:23125-27247 fingerprint = BridgeDisconnectDialog (0.423)
function BridgeDisconnectDialog(t0) {
  let i = w(91),
    { onDone: onDone, sessionGroupingId: sessionGroupingId } = t0;
  useRegisterOverlay("bridge-disconnect-dialog");
  let setAppState = useSetAppState(),
    sessionUrl = useAppState(mo),
    connectUrl = useAppState(ho),
    sessionActive = useAppState(fo),
    re = useAppState(vo),
    [u, Ze] = y(!1),
    [J, te] = y(""),
    [ie] = y(re),
    se = useAppState(wo);
  y(!se);
  let [T] = y(yo),
    [g] = y(ie),
    ae;
  if (i[0] !== g || i[1] !== T)
    ((ae = () => (T === null || g === "ready" ? T : { ...T, shared: [], shareRows: [] })),
      (i[0] = g),
      (i[1] = T),
      (i[2] = ae));
  else ae = i[2];
  let [m] = y(ae);
  R(null);
  let W;
  if (i[3] !== m) ((W = [m]), (i[3] = m), (i[4] = W));
  else W = i[4];
  P(Po, W);
  let [A] = y(null),
    _ = sessionActive ? sessionUrl : connectUrl,
    le,
    D;
  if (i[5] !== _ || i[6] !== u)
    ((le = () => {
      if (!u || !_) {
        te("");
        return;
      }
      toString(_, { type: "utf8", errorCorrectionLevel: "L", small: !0 })
        .then(te)
        .catch(() => te(""));
    }),
      (D = [u, _]),
      (i[5] = _),
      (i[6] = u),
      (i[7] = le),
      (i[8] = D));
  else ((le = i[7]), (D = i[8]));
  P(le, D);
  let Oe;
  if (i[9] !== onDone || i[10] !== setAppState)
    ((Oe = function B() {
      (setAppState(clearBridgeAppState),
        logEvent("tengu_bridge_command", { action: lit("disconnect") }),
        onDone(REMOTE_CONTROL_DISCONNECTED_MSG, { display: "system" }));
    }),
      (i[9] = onDone),
      (i[10] = setAppState),
      (i[11] = Oe));
  else Oe = i[11];
  let B = Oe,
    k;
  if (i[12] === MEMO_CACHE_SENTINEL)
    ((k = function Le() {
      Ze(_o);
    }),
      (i[12] = k));
  else k = i[12];
  let Le = k,
    Te;
  if (i[13] !== A || i[14] !== onDone)
    ((Te = function O() {
      if (A === null) onDone(void 0, { display: "skip" });
    }),
      (i[13] = A),
      (i[14] = onDone),
      (i[15] = Te));
  else Te = i[15];
  let O = Te,
    X;
  if (i[16] !== B)
    ((X = { key: "disconnect", run: B, label: "Disconnect this session" }), (i[16] = B), (i[17] = X));
  else X = i[17];
  const N = u ? "Hide QR code" : "Show QR code";
  let H;
  if (i[18] !== u) ((H = u ? [] : ["Scan with your phone to open this session"]), (i[18] = u), (i[19] = H));
  else H = i[19];
  let ke;
  if (i[20] !== H || i[21] !== N)
    ((ke = { key: "qr", run: Le, label: N, meta: H }), (i[20] = H), (i[21] = N), (i[22] = ke));
  else ke = i[22];
  let de;
  if (i[23] !== O) ((de = { key: "continue", run: O, label: "Continue" }), (i[23] = O), (i[24] = de));
  else de = i[24];
  let z;
  if (i[25] !== ke || i[26] !== de || i[27] !== X)
    ((z = [X, ke, de]), (i[25] = ke), (i[26] = de), (i[27] = X), (i[28] = z));
  else z = i[28];
  let h = z,
    ce,
    pe,
    ue,
    V,
    x,
    ge,
    me,
    Ce,
    Ae,
    Be,
    Se,
    Ne,
    xe;
  if (
    i[29] !== _ ||
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
        ).filter(Ro)
      : [];
    pe = Dialog;
    Se = "Remote Control";
    Ne = O;
    xe = !0;
    ce = Box;
    ue = "column";
    V = 1;
    if (i[49] !== sessionGroupingId)
      ((x =
        sessionGroupingId !== void 0 &&
        e(Text, {
          children:
            "A session's Project is fixed when it's created \u2014 disconnect first, then re-run /remote-control --project to start a new one.",
        })),
        (i[49] = sessionGroupingId),
        (i[50] = x));
    else x = i[50];
    const he = _ ? ` and at ${_}` : " and claude.ai/code";
    if (i[51] !== he)
      ((ge = r(Text, { children: ["This session is available in the Claude mobile app", he, "."] })),
        (i[51] = he),
        (i[52] = ge));
    else ge = i[52];
    let I;
    if (i[53] !== m?.endedShares) ((I = m?.endedShares ?? []), (i[53] = m?.endedShares), (i[54] = I));
    else I = i[54];
    let U;
    if (i[55] !== m?.shareRows) ((U = m?.shareRows.map(Do) ?? []), (i[55] = m?.shareRows), (i[56] = U));
    else U = i[56];
    const F = g === "ready" && m !== null && m.sharesNothingBecause !== null;
    if (i[57] !== g || i[58] !== I || i[59] !== U || i[60] !== F)
      ((me = e(useLatchedBridgeNotice, {
        inRemoteControl: { stateAtOpen: g, endedShares: I, portsWithRow: U, drewReason: F },
      })),
        (i[57] = g),
        (i[58] = I),
        (i[59] = U),
        (i[60] = F),
        (i[61] = me));
    else me = i[61];
    Ce = !1;
    Ae = !1;
    Be = u && Pn.length > 0 && e(Box, { flexDirection: "column", children: Pn.map(Oo) });
    ((i[29] = _),
      (i[30] = m),
      (i[31] = O),
      (i[32] = g),
      (i[33] = J),
      (i[34] = sessionGroupingId),
      (i[35] = u),
      (i[36] = ce),
      (i[37] = pe),
      (i[38] = ue),
      (i[39] = V),
      (i[40] = x),
      (i[41] = ge),
      (i[42] = me),
      (i[43] = Ce),
      (i[44] = Ae),
      (i[45] = Be),
      (i[46] = Se),
      (i[47] = Ne),
      (i[48] = xe));
  } else
    ((ce = i[36]),
      (pe = i[37]),
      (ue = i[38]),
      (V = i[39]),
      (x = i[40]),
      (ge = i[41]),
      (me = i[42]),
      (Ce = i[43]),
      (Ae = i[44]),
      (Be = i[45]),
      (Se = i[46]),
      (Ne = i[47]),
      (xe = i[48]));
  const he = h.length,
    I = h.length - 1,
    U = A !== null;
  let F;
  if (i[62] !== A || i[63] !== h)
    ((F = (To) => {
      if (A === null) h[To]?.run();
    }),
      (i[62] = A),
      (i[63] = h),
      (i[64] = F));
  else F = i[64];
  let Ie;
  if (i[65] !== h) ((Ie = h.map(Lo)), (i[65] = h), (i[66] = Ie));
  else Ie = i[66];
  let je;
  if (i[67] !== h.length || i[68] !== I || i[69] !== U || i[70] !== F || i[71] !== Ie)
    ((je = e(OrderedListWithItem, {
      visibleCount: he,
      defaultFocusIndex: I,
      wrap: !0,
      declineHomeEnd: !0,
      isDisabled: U,
      onSelect: F,
      children: Ie,
    })),
      (i[67] = h.length),
      (i[68] = I),
      (i[69] = U),
      (i[70] = F),
      (i[71] = Ie),
      (i[72] = je));
  else je = i[72];
  let bn;
  if (i[73] === MEMO_CACHE_SENTINEL)
    ((bn = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
          e(KeyboardShortcutHint, { chord: "escape", action: "continue" }),
        ],
      }),
    })),
      (i[73] = bn));
  else bn = i[73];
  let Ge;
  if (
    i[74] !== ce ||
    i[75] !== ue ||
    i[76] !== V ||
    i[77] !== x ||
    i[78] !== ge ||
    i[79] !== me ||
    i[80] !== Ce ||
    i[81] !== Ae ||
    i[82] !== Be ||
    i[83] !== je
  )
    ((Ge = r(ce, { flexDirection: ue, gap: V, children: [x, ge, me, Ce, Ae, Be, je, bn] })),
      (i[74] = ce),
      (i[75] = ue),
      (i[76] = V),
      (i[77] = x),
      (i[78] = ge),
      (i[79] = me),
      (i[80] = Ce),
      (i[81] = Ae),
      (i[82] = Be),
      (i[83] = je),
      (i[84] = Ge));
  else Ge = i[84];
  let _n;
  if (i[85] !== pe || i[86] !== Se || i[87] !== Ne || i[88] !== xe || i[89] !== Ge)
    ((_n = e(pe, { title: Se, onCancel: Ne, hideInputGuide: xe, children: Ge })),
      (i[85] = pe),
      (i[86] = Se),
      (i[87] = Ne),
      (i[88] = xe),
      (i[89] = Ge),
      (i[90] = _n));
  else _n = i[90];
  return _n;
}
/**
 * /remote-control 启动前检查：功能被禁用（含组织策略）、最低版本、登录令牌、可信设备注册；返回错误或 unenrolled-trusted-device，全部通过返回 null。
 */
//@ chunk-k7ve8htw.js:27247-27751 sole-consumer
async function checkBridgePrerequisites(storageV5) {
  let disabledDiagnosis = await getBridgeDisabledDiagnosis();
  if (disabledDiagnosis) {
    if (disabledDiagnosis.orgPolicyDenied) logOrgPolicyDenied("allow_remote_control", "slash_command");
    return { kind: "error", message: disabledDiagnosis.reason };
  }
  let versionError = await checkEnvLessBridgeMinVersion();
  if (versionError) return { kind: "error", message: versionError };
  if (
    !(isStorageV5Enabled() && storageV5 !== void 0
      ? await getBridgeAccessTokenAsync(storageV5)
      : getBridgeAccessToken())
  )
    return { kind: "error", message: BRIDGE_LOGIN_INSTRUCTION };
  if ((await enrollTrustedDeviceIfNeeded(storageV5), await isTrustedDeviceUnenrolled())) {
    let d = nullStub3();
    if (d !== null) return { kind: "error", message: d };
    if (isProactiveEnrollmentDisabled())
      return { kind: "error", message: PROACTIVE_ENROLLMENT_DISABLED_MESSAGE };
    return { kind: "unenrolled-trusted-device" };
  }
  return (logForDebugging("[bridge] Prerequisites passed, enabling bridge"), null);
}
/**
 * /remote-control 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-k7ve8htw.js:27751-27862 sole-consumer
async function remoteControlCall(onDone, context, args) {
  let p,
    C = args.trim() || void 0;
  return e(BridgeToggle, { onDone: onDone, name: C, sessionGroupingId: p, context: context });
}
//@ chunk-k7ve8htw.js:27862-27932 sole-consumer
function De(v) {
  return v && `${v.accountUuid}/${v.organizationUuid || ""}`;
}
//@ chunk-18hwfzwa.js:643741-643788 fingerprint = _temp (1)
function Vzt(s) {
  return s.replBridgeConnected;
}
//@ chunk-18hwfzwa.js:643788-643839 fingerprint = _temp6 (1)
function Kzt(s_1) {
  return s_1.replBridgeSessionActive;
}
//@ chunk-18hwfzwa.js:643889-643937 fingerprint = _temp5 (1)
function Qzt(s_0) {
  return s_0.replBridgeConnectUrl;
}
//@ chunk-18hwfzwa.js:643937-643985 fingerprint = _temp4 (1)
function Jzt(s) {
  return s.replBridgeSessionUrl;
}
//@ chunk-18hwfzwa.js:644121-644166 fingerprint = _temp2 (1)
function tYt(s_0) {
  return s_0.replBridgeEnabled;
}
//@ chunk-18hwfzwa.js:1785048-1785137 fingerprint = _temp7 (0.688)
function VTt(prev) {
  let state = prev.getState();
  return state.replBridgeEnabled && !state.replBridgeOutboundOnly;
}
//@ chunk-fnmk6x3n.js:17782-17786 sole-consumer
j();
/**
 * Pro 试用到期对话框：提示试用结束，选项"升级到 Max"（非受限账号）与"充值继续用"，记 tengu_pro_trial_expired_choice 后进入对应流程。
 */
//@ chunk-fnmk6x3n.js:17786-18799 sole-consumer
function ProTrialExpiredDialog(props) {
  let t = w(15),
    { onDone: onDone, caller: caller } = props,
    [J, h] = y(null);
  if (J) {
    return J;
  }
  let x;
  if (t[0] === MEMO_CACHE_SENTINEL)
    ((x = [
      ...(oAt() ? [] : [{ label: "Upgrade to Max", value: "upgrade" }]),
      { label: "Add funds to continue with usage credits", value: "extra-usage" },
    ]),
      (t[0] = x));
  else x = t[0];
  let P = x,
    L;
  if (t[1] === MEMO_CACHE_SENTINEL)
    ((L = e(Box, {
      paddingX: 2,
      children: e(Text, { color: "error", children: "Your Claude Code trial has ended." }),
    })),
      (t[1] = L));
  else L = t[1];
  let i;
  if (t[2] !== onDone) ((i = () => onDone()), (t[2] = onDone), (t[3] = i));
  else i = t[3];
  let p;
  if (t[4] !== onDone) ((p = () => onDone()), (t[4] = onDone), (t[5] = p));
  else p = t[5];
  let d;
  if (t[6] !== caller || t[7] !== onDone)
    ((d = (R) => {
      if ((logEvent("tengu_pro_trial_expired_choice", { chose_upgrade: R === "upgrade" }), R === "upgrade"))
        callUpgradeFromSurface(onDone, caller, "pro_trial_expired_dialog").then((N) => h(N));
      else call_2(onDone, caller).then((T) => h(T));
    }),
      (t[6] = caller),
      (t[7] = onDone),
      (t[8] = d));
  else d = t[8];
  let c;
  if (t[9] !== p || t[10] !== d)
    ((c = e(ModelSelector, { options: P, onCancel: p, onChange: d })), (t[9] = p), (t[10] = d), (t[11] = c));
  else c = t[11];
  let _;
  if (t[12] !== i || t[13] !== c)
    ((_ = r(Box, {
      flexDirection: "column",
      children: [L, e(Dialog, { title: "What do you want to do?", onCancel: i, children: c })],
    })),
      (t[12] = i),
      (t[13] = c),
      (t[14] = _));
  else _ = t[14];
  return _;
}
/**
 * /pro-trial-expired 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-fnmk6x3n.js:18799-18853 fingerprint = call (0.627)
async function call(onDone, context) {
  return e(ProTrialExpiredDialog, { onDone: onDone, caller: context });
}

export { Vzt, Kzt, Qzt, Jzt, tYt, VTt };
