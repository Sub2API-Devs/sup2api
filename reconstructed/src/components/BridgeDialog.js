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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../context/overlayContext.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { Vzt, Kzt, Qzt, Jzt, tYt } from "../commands/bridge/bridge.js";
import { useNotifications } from "../context/notifications.js";
import { y, P } from "../../vendor/react/cjs/react.production.js";
import { useProject } from "../context/session.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getBranch } from "../utils/git.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { saveUserIntentSetting } from "../utils/settings/userIntentSettings.js";
import {
  BRIDGE_FAILED,
  getBridgeStatus,
  cgt,
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
import { OutputLine } from "./shell/OutputLine.js";

//@ chunk-18hwfzwa.js:643839-643889 fingerprint = _temp3 (1)
function selectReplBridgeReconnecting(s_1) {
  return s_1.replBridgeReconnecting;
}
//@ chunk-18hwfzwa.js:643985-644028 fingerprint = _temp6 (1)
function selectReplBridgeError(s_4) {
  return s_4.replBridgeError;
}
//@ chunk-18hwfzwa.js:644028-644075 layout
function selectReplBridgeErrorKind(zr) {
  return zr.replBridgeErrorKind;
}
//@ chunk-18hwfzwa.js:644075-644121 fingerprint = _temp7 (1)
function selectReplBridgeExplicit(s_5) {
  return s_5.replBridgeExplicit;
}
//@ chunk-18hwfzwa.js:644166-644217 fingerprint = _temp8 (1)
function selectReplBridgeEnvironmentId(s_6) {
  return s_6.replBridgeEnvironmentId;
}
//@ chunk-18hwfzwa.js:644217-644264 fingerprint = _temp9 (1)
function selectReplBridgeSessionId(s_7) {
  return s_7.replBridgeSessionId;
}
//@ chunk-18hwfzwa.js:644264-644299 layout
function selectVerbose(Er) {
  return Er.verbose;
}
//@ chunk-18hwfzwa.js:644299-644338 layout
function selectOriginalCwd(Vr) {
  return Vr.originalCwd;
}
//@ chunk-18hwfzwa.js:644338-644354 layout
function noop_2() {}
//@ chunk-18hwfzwa.js:644354-644381 layout
function negate(ms) {
  return !ms;
}
//@ chunk-18hwfzwa.js:644381-644583 layout
function disableReplBridgeState(Xs) {
  if (!Xs.replBridgeEnabled && Xs.replBridgeError === void 0) {
    return Xs;
  }
  return {
    ...Xs,
    replBridgeEnabled: !1,
    replBridgeError: void 0,
    replBridgeErrorKind: void 0,
    replBridgeSessionGroupingId: void 0,
  };
}
//@ chunk-18hwfzwa.js:644583-644771 callgraph-fingerprint = _temp12 (0.368)
function enableReplBridgeState(prev_0) {
  if (prev_0.replBridgeEnabled || prev_0.replBridgeError === void 0) {
    return prev_0;
  }
  return {
    ...prev_0,
    replBridgeEnabled: !0,
    replBridgeError: void 0,
    replBridgeErrorKind: void 0,
    replBridgeExplicit: !0,
  };
}
//@ chunk-18hwfzwa.js:644771-644807 file-local
function cYt(l) {
  return l.length > 0;
}
//@ chunk-18hwfzwa.js:644807-644856 layout
function uYt(ws, Ci) {
  return e(Text, { children: ws }, Ci);
}
/**
 * Remote Control 对话框：显示连接/会话状态与 URL（可切换二维码），d 键断开并关闭启动时自动连接，重试错误状态，显示 cwd 与分支。
 */
//@ chunk-18hwfzwa.js:644856-649982 fingerprint = BridgeDialog (0.557)
function BridgeDialog(t0) {
  let $ = w(112),
    { onDone: onDone } = t0;
  useRegisterOverlay("bridge-dialog");
  let { storageV5: storageV5 } = Me(),
    connected = useAppState(Vzt),
    sessionActive = useAppState(Kzt),
    reconnecting = useAppState(selectReplBridgeReconnecting),
    connectUrl = useAppState(Qzt),
    sessionUrl = useAppState(Jzt),
    error = useAppState(selectReplBridgeError),
    replBridgeErrorKind = useAppState(selectReplBridgeErrorKind),
    replBridgeExplicit = useAppState(selectReplBridgeExplicit),
    replBridgeEnabled = useAppState(tYt),
    replBridgeEnvironmentId = useAppState(selectReplBridgeEnvironmentId),
    replBridgeSessionId = useAppState(selectReplBridgeSessionId),
    verbose = useAppState(selectVerbose),
    setAppState = useSetAppState(),
    { removeNotification: removeNotification } = useNotifications(),
    [Et, Dt] = y(!1),
    [Lt, oo] = y(""),
    [Xt, io] = y(""),
    originalCwd = useProject(selectOriginalCwd),
    ao;
  if ($[0] !== originalCwd) ((ao = basename_4(originalCwd)), ($[0] = originalCwd), ($[1] = ao));
  else ao = $[1];
  let co = ao,
    bo,
    Ao;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((bo = () => {
      getBranch().then(io).catch(noop_2);
    }),
      (Ao = []),
      ($[2] = bo),
      ($[3] = Ao));
  else ((bo = $[2]), (Ao = $[3]));
  P(bo, Ao);
  let Bo = sessionActive ? sessionUrl : connectUrl,
    Ro,
    Ho;
  if ($[4] !== Bo || $[5] !== Et)
    ((Ro = () => {
      if (!Et || !Bo) {
        oo("");
        return;
      }
      import("./chunk-y21f2heg.js")
        .then((Io) => {
          let { toString: toString } = Io;
          return toString(Bo, { type: "utf8", errorCorrectionLevel: "L", small: !0 });
        })
        .then(oo)
        .catch(() => oo(""));
    }),
      (Ho = [Et, Bo]),
      ($[4] = Bo),
      ($[5] = Et),
      ($[6] = Ro),
      ($[7] = Ho));
  else ((Ro = $[6]), (Ho = $[7]));
  P(Ro, Ho);
  let Io;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((Io = () => {
      Dt(negate);
    }),
      ($[8] = Io));
  else Io = $[8];
  let mn;
  if ($[9] !== onDone)
    ((mn = { "confirm:yes": onDone, "confirm:toggle": Io }), ($[9] = onDone), ($[10] = mn));
  else mn = $[10];
  let Cn;
  if ($[11] === MEMO_CACHE_SENTINEL) ((Cn = { context: "Confirmation" }), ($[11] = Cn));
  else Cn = $[11];
  MessageActionsKeybindings(mn, Cn);
  let No;
  if (
    $[12] !== replBridgeEnabled ||
    $[13] !== error ||
    $[14] !== replBridgeErrorKind ||
    $[15] !== replBridgeExplicit ||
    $[16] !== onDone ||
    $[17] !== removeNotification ||
    $[18] !== setAppState ||
    $[19] !== storageV5
  )
    ((No = function Yo(input) {
      if (input.key === "d" && !input.ctrl && !input.meta) {
        if ((input.preventDefault(), replBridgeExplicit && replBridgeEnabled && error === void 0))
          saveUserIntentSetting("remoteControlAtStartup", !1, storageV5);
        (removeNotification(BRIDGE_FAILED), setAppState(disableReplBridgeState), onDone());
      }
      if (
        input.key === "r" &&
        !input.ctrl &&
        !input.meta &&
        !replBridgeEnabled &&
        error !== void 0 &&
        replBridgeErrorKind === "auth"
      )
        (input.preventDefault(),
          removeNotification(BRIDGE_FAILED),
          setAppState(enableReplBridgeState),
          onDone());
    }),
      ($[12] = replBridgeEnabled),
      ($[13] = error),
      ($[14] = replBridgeErrorKind),
      ($[15] = replBridgeExplicit),
      ($[16] = onDone),
      ($[17] = removeNotification),
      ($[18] = setAppState),
      ($[19] = storageV5),
      ($[20] = No));
  else No = $[20];
  let Yo = No,
    kn;
  if ($[21] !== connected || $[22] !== error || $[23] !== reconnecting || $[24] !== sessionActive)
    ((kn = getBridgeStatus({
      error: error,
      connected: connected,
      sessionActive: sessionActive,
      reconnecting: reconnecting,
    })),
      ($[21] = connected),
      ($[22] = error),
      ($[23] = reconnecting),
      ($[24] = sessionActive),
      ($[25] = kn));
  else kn = $[25];
  let { label: statusLabel, color: statusColor } = kn,
    Go = error ? BRIDGE_FAILED_INDICATOR : BRIDGE_READY_INDICATOR,
    hn,
    Mn,
    Xo,
    Sn,
    $n,
    on,
    _o,
    cn,
    Dn,
    wn;
  if (
    $[26] !== Xt ||
    $[27] !== Bo ||
    $[28] !== replBridgeEnvironmentId ||
    $[29] !== error ||
    $[30] !== replBridgeErrorKind ||
    $[31] !== Yo ||
    $[32] !== Go ||
    $[33] !== onDone ||
    $[34] !== Lt ||
    $[35] !== co ||
    $[36] !== sessionActive ||
    $[37] !== replBridgeSessionId ||
    $[38] !== Et ||
    $[39] !== statusColor ||
    $[40] !== statusLabel ||
    $[41] !== verbose
  ) {
    let mr = Lt
      ? Lt.split(
          `
`,
        ).filter(cYt)
      : [];
    let Kn;
    if ($[52] !== Xt || $[53] !== co) {
      Kn = [];
      if (co) Kn.push(co);
      if (Xt) Kn.push(Xt);
      (($[52] = Xt), ($[53] = co), ($[54] = Kn));
    } else Kn = $[54];
    let Wn = Kn.length > 0 ? " \xB7 " + Kn.join(" \xB7 ") : "";
    let Fr;
    if ($[55] !== Bo || $[56] !== error || $[57] !== replBridgeErrorKind || $[58] !== sessionActive)
      ((Fr =
        error === cgt ||
        error === BRIDGE_REATTACH_UNAVAILABLE_HINT ||
        error === BRIDGE_SIGNATURE_WANTED_HINT ||
        (error !== void 0 && replBridgeErrorKind === "ended_elsewhere")
          ? void 0
          : error
            ? FAILED_FOOTER_TEXT
            : Bo
              ? sessionActive
                ? buildActiveFooterText(Bo)
                : buildIdleFooterText(Bo)
              : void 0),
        ($[55] = Bo),
        ($[56] = error),
        ($[57] = replBridgeErrorKind),
        ($[58] = sessionActive),
        ($[59] = Fr));
    else Fr = $[59];
    Xo = Fr;
    Mn = Dialog;
    cn = "Remote Control";
    Dn = onDone;
    wn = !0;
    hn = FocusColumn;
    Sn = 1;
    $n = Yo;
    let Zn;
    if ($[60] !== Go || $[61] !== statusColor || $[62] !== statusLabel)
      ((Zn = r(Text, { color: statusColor, children: [Go, " ", statusLabel] })),
        ($[60] = Go),
        ($[61] = statusColor),
        ($[62] = statusLabel),
        ($[63] = Zn));
    else Zn = $[63];
    let Un;
    if ($[64] !== Wn) ((Un = e(Text, { dimColor: !0, children: Wn })), ($[64] = Wn), ($[65] = Un));
    else Un = $[65];
    let dr;
    if ($[66] !== Zn || $[67] !== Un)
      ((dr = r(Text, { children: [Zn, Un] })), ($[66] = Zn), ($[67] = Un), ($[68] = dr));
    else dr = $[68];
    let or;
    if ($[69] !== error) ((or = e(ErrorText, { error: error })), ($[69] = error), ($[70] = or));
    else or = $[70];
    let pr;
    if ($[71] === MEMO_CACHE_SENTINEL) ((pr = e(useLatchedBridgeNotice, { saysWhatToDo: !0 })), ($[71] = pr));
    else pr = $[71];
    let Qn;
    if ($[72] !== replBridgeEnvironmentId || $[73] !== verbose)
      ((Qn =
        verbose &&
        replBridgeEnvironmentId &&
        r(Text, { dimColor: !0, children: ["Environment: ", replBridgeEnvironmentId] })),
        ($[72] = replBridgeEnvironmentId),
        ($[73] = verbose),
        ($[74] = Qn));
    else Qn = $[74];
    let ur;
    if ($[75] !== replBridgeSessionId || $[76] !== verbose)
      ((ur =
        verbose &&
        replBridgeSessionId &&
        r(Text, { dimColor: !0, children: ["Session: ", replBridgeSessionId] })),
        ($[75] = replBridgeSessionId),
        ($[76] = verbose),
        ($[77] = ur));
    else ur = $[77];
    if ($[78] !== dr || $[79] !== or || $[80] !== Qn || $[81] !== ur)
      ((on = r(Box, { flexDirection: "column", children: [dr, or, pr, Qn, ur] })),
        ($[78] = dr),
        ($[79] = or),
        ($[80] = Qn),
        ($[81] = ur),
        ($[82] = on));
    else on = $[82];
    _o = Et && mr.length > 0 && e(Box, { flexDirection: "column", children: mr.map(uYt) });
    (($[26] = Xt),
      ($[27] = Bo),
      ($[28] = replBridgeEnvironmentId),
      ($[29] = error),
      ($[30] = replBridgeErrorKind),
      ($[31] = Yo),
      ($[32] = Go),
      ($[33] = onDone),
      ($[34] = Lt),
      ($[35] = co),
      ($[36] = sessionActive),
      ($[37] = replBridgeSessionId),
      ($[38] = Et),
      ($[39] = statusColor),
      ($[40] = statusLabel),
      ($[41] = verbose),
      ($[42] = hn),
      ($[43] = Mn),
      ($[44] = Xo),
      ($[45] = Sn),
      ($[46] = $n),
      ($[47] = on),
      ($[48] = _o),
      ($[49] = cn),
      ($[50] = Dn),
      ($[51] = wn));
  } else
    ((hn = $[42]),
      (Mn = $[43]),
      (Xo = $[44]),
      (Sn = $[45]),
      ($n = $[46]),
      (on = $[47]),
      (_o = $[48]),
      (cn = $[49]),
      (Dn = $[50]),
      (wn = $[51]));
  let Fr;
  if ($[83] !== Xo) ((Fr = Xo && e(Text, { dimColor: !0, children: Xo })), ($[83] = Xo), ($[84] = Fr));
  else Fr = $[84];
  const Zn = error !== void 0 ? "dismiss" : "disconnect";
  let Un;
  if ($[85] !== Zn) ((Un = e(KeyboardShortcutHint, { chord: "d", action: Zn })), ($[85] = Zn), ($[86] = Un));
  else Un = $[86];
  let dr;
  if ($[87] !== replBridgeEnabled || $[88] !== error || $[89] !== replBridgeErrorKind)
    ((dr =
      error !== void 0 &&
      !replBridgeEnabled &&
      replBridgeErrorKind === "auth" &&
      e(KeyboardShortcutHint, { chord: "r", action: "reconnect" })),
      ($[87] = replBridgeEnabled),
      ($[88] = error),
      ($[89] = replBridgeErrorKind),
      ($[90] = dr));
  else dr = $[90];
  let or;
  if ($[91] !== Bo)
    ((or = Boolean(Bo) && e(Text, { children: "space for QR code" })), ($[91] = Bo), ($[92] = or));
  else or = $[92];
  let pr;
  if ($[93] === MEMO_CACHE_SENTINEL)
    ((pr = e(KeyboardShortcutHint, { chord: ["enter", "escape"], action: "close" })), ($[93] = pr));
  else pr = $[93];
  let Qn;
  if ($[94] !== Un || $[95] !== dr || $[96] !== or)
    ((Qn = e(Text, { dimColor: !0, children: r(Byline, { children: [Un, dr, or, pr] }) })),
      ($[94] = Un),
      ($[95] = dr),
      ($[96] = or),
      ($[97] = Qn));
  else Qn = $[97];
  let ur;
  if (
    $[98] !== hn ||
    $[99] !== Sn ||
    $[100] !== $n ||
    $[101] !== on ||
    $[102] !== _o ||
    $[103] !== Fr ||
    $[104] !== Qn
  )
    ((ur = r(hn, { gap: Sn, onKeyDown: $n, children: [on, _o, Fr, Qn] })),
      ($[98] = hn),
      ($[99] = Sn),
      ($[100] = $n),
      ($[101] = on),
      ($[102] = _o),
      ($[103] = Fr),
      ($[104] = Qn),
      ($[105] = ur));
  else ur = $[105];
  let Ir;
  if ($[106] !== Mn || $[107] !== cn || $[108] !== Dn || $[109] !== wn || $[110] !== ur)
    ((Ir = e(Mn, { title: cn, onCancel: Dn, hideInputGuide: wn, children: ur })),
      ($[106] = Mn),
      ($[107] = cn),
      ($[108] = Dn),
      ($[109] = wn),
      ($[110] = ur),
      ($[111] = Ir));
  else Ir = $[111];
  return Ir;
}
/**
 * MCP 工具结果中的文本条目，用 OutputLine 渲染。
 */
//@ chunk-hny2rpzz.js:2423-2645 fingerprint = _temp0 (0.616)
function McpTextOutputItem(s_8) {
  let $ = w(3),
    { item: item, verbose: verbose } = s_8,
    u =
      item.type === "text" && "text" in item && item.text !== null && item.text !== void 0
        ? String(item.text)
        : "",
    i;
  if ($[0] !== u || $[1] !== verbose)
    ((i = e(OutputLine, { content: u, verbose: verbose })), ($[0] = u), ($[1] = verbose), ($[2] = i));
  else i = $[2];
  return i;
}

export { BridgeDialog, McpTextOutputItem };
