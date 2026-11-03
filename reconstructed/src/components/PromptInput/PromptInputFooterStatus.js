/**
 * components/PromptInput/PromptInputFooterStatus.tsx
 *
 * 2.1.316 新增。页脚状态段（任务、PR、桥接等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (29)
 * attribution: placement 29
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { A7t } from "../../commands/session/session.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { BridgeStatusIndicator } from "./PromptInputFooter.js";
import { P7 } from "../LogoV2/LogoV2.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PrBadge } from "../PrBadge.js";
import { prStatusHint } from "../../utils/ghPrStatus.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { Byline } from "../design-system/Byline.js";
import { HIPAA_CONFIGURED_LABEL } from "../../services/policyLimits/complianceTaints.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { RemoteControlStatus, shortRcLabel } from "./RemoteControlPill.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { DOWN_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { kJe, N7t } from "../../utils/highlightMatch.js";
import {
  STANDALONE_SYMBOL_PATTERN,
  BLANK_LOOKALIKE_RE,
  INVISIBLE_SYMBOL_RE,
  regExp as regExp_6,
  COMBINING_MARK_RE,
} from "../../utils/emojiPatterns.js";
import { ql } from "../../utils/stringUtils.js";
import { jw } from "./Notifications.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useHasRenderHooks } from "../pluginUi/render/RenderInstance.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import { wt } from "../../remote/remoteMode.js";
import { Q, j } from "../../../vendor/react/cjs/react.production.js";
import { IdeStatusIndicator } from "../IdeStatusIndicator.js";
import { sequential } from "../../utils/sequential.js";
import { truncateToWidth } from "../../utils/format.js";
import { EDITOR_MODES } from "../../utils/configConstants.js";
import { checkHasTrustDialogAccepted } from "../../utils/config.js";

//@ chunk-18hwfzwa.js:795209-795259 placement = _temp5 (1)
function selectRemoteConnectionStatus(s) {
  return s.remoteConnectionStatus;
}
//@ chunk-18hwfzwa.js:795259-795295 placement
function selectPrStatus(ao) {
  return ao.prStatus;
}
//@ chunk-18hwfzwa.js:795295-795334 placement
function selectPrNeedsAuth(co) {
  return co.prNeedsAuth;
}
//@ chunk-18hwfzwa.js:795334-795379 placement
function selectSlackTagConnected(bo) {
  return bo.slackTagConnected;
}
//@ chunk-18hwfzwa.js:795379-795615 placement
function ideStatusSuffix(h) {
  switch (h) {
    case "reconnecting":
      return { suffix: " \xB7 reconnecting\u2026", color: "warning" };
    case "disconnected":
      return { suffix: " \xB7 disconnected", color: "error" };
    case "connecting":
    case "connected":
      return { suffix: "", color: "ide" };
  }
}
//@ chunk-18hwfzwa.js:795615-797818 placement
function FooterStatusLine(h) {
  let $ = w(42),
    { debug: debug, bridgeSelected: bridgeSelected, modeLabels: modeLabels } = h,
    ee = useAppState(A7t),
    ke = useAppState(selectRemoteConnectionStatus),
    Re = useIsFullscreen(),
    Be = BridgeStatusIndicator(!Re),
    He = P7("hipaa");
  useForceRender();
  let ze;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ze = getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_thistle", !1)), ($[0] = ze));
  else ze = $[0];
  let Xe = ze,
    rt = useAppState(selectPrStatus),
    kt = useAppState(selectPrNeedsAuth),
    At = Xe && (rt !== null || kt);
  useAppState(selectSlackTagConnected);
  let It;
  if (
    $[1] !== bridgeSelected ||
    $[2] !== Be ||
    $[3] !== debug ||
    $[4] !== He ||
    $[5] !== kt ||
    $[6] !== rt ||
    $[7] !== ke ||
    $[8] !== ee ||
    $[9] !== At
  ) {
    It = [];
    if (He) {
      let Ot;
      if ($[11] === MEMO_CACHE_SENTINEL) ((Ot = e(PermissionPromptPendingText, {}, "hipaa")), ($[11] = Ot));
      else Ot = $[11];
      It.push(Ot);
    }
    if (ee) {
      let Ot;
      if ($[12] !== ke) ((Ot = ideStatusSuffix(ke)), ($[12] = ke), ($[13] = Ot));
      else Ot = $[13];
      let { suffix: suffix, color: color } = Ot;
      let Lt;
      if ($[14] !== ee || $[15] !== suffix)
        ((Lt = r(Link, { url: ee, children: [re.circleDouble, " cloud", suffix] })),
          ($[14] = ee),
          ($[15] = suffix),
          ($[16] = Lt));
      else Lt = $[16];
      let oo;
      if ($[17] !== color || $[18] !== Lt)
        ((oo = e(Text, { color: color, wrap: "truncate", children: Lt }, "cloud")),
          ($[17] = color),
          ($[18] = Lt),
          ($[19] = oo));
      else oo = $[19];
      It.push(oo);
    }
    if (debug) {
      let Ot;
      if ($[20] === MEMO_CACHE_SENTINEL)
        ((Ot = e(Text, { color: "warning", wrap: "truncate", children: "Debug" }, "debug")), ($[20] = Ot));
      else Ot = $[20];
      It.push(Ot);
    }
    if (Be !== null) {
      let Ot;
      if ($[21] !== bridgeSelected || $[22] !== Be)
        ((Ot = e(FooterOpenSelected, { status: Be, bridgeSelected: bridgeSelected }, "bridge")),
          ($[21] = bridgeSelected),
          ($[22] = Be),
          ($[23] = Ot));
      else Ot = $[23];
      It.push(Ot);
    }
    if (At) {
      if (rt) {
        let Ot;
        if ($[24] !== rt.kind || $[25] !== rt.number || $[26] !== rt.reviewState || $[27] !== rt.url)
          ((Ot = e(
            PrBadge,
            { number: rt.number, url: rt.url, reviewState: rt.reviewState, kind: rt.kind },
            "pr",
          )),
            ($[24] = rt.kind),
            ($[25] = rt.number),
            ($[26] = rt.reviewState),
            ($[27] = rt.url),
            ($[28] = Ot));
        else Ot = $[28];
        It.push(Ot);
      } else if (kt) {
        let Ot;
        if ($[29] !== kt) ((Ot = prStatusHint(kt)), ($[29] = kt), ($[30] = Ot));
        else Ot = $[30];
        let Lt;
        if ($[31] !== Ot) ((Lt = e(Text, { dimColor: !0, children: Ot }, "pr")), ($[31] = Ot), ($[32] = Lt));
        else Lt = $[32];
        It.push(Lt);
      }
    }
    (($[1] = bridgeSelected),
      ($[2] = Be),
      ($[3] = debug),
      ($[4] = He),
      ($[5] = kt),
      ($[6] = rt),
      ($[7] = ke),
      ($[8] = ee),
      ($[9] = At),
      ($[10] = It));
  } else It = $[10];
  let useHasRenderHooks = actionKeysNamespace.useHasRenderHooks("SessionMode"),
    Ot;
  if ($[33] !== useHasRenderHooks || $[34] !== modeLabels || $[35] !== It.length)
    ((Ot =
      modeLabels.length > 0 || useHasRenderHooks
        ? e(SessionModesText, { modes: modeLabels, separated: It.length > 0 })
        : null),
      ($[33] = useHasRenderHooks),
      ($[34] = modeLabels),
      ($[35] = It.length),
      ($[36] = Ot));
  else Ot = $[36];
  let io = Ot;
  if (It.length === 0 && io === null) {
    return null;
  }
  let Lt;
  if ($[37] !== It) ((Lt = e(Byline, { children: It })), ($[37] = It), ($[38] = Lt));
  else Lt = $[38];
  let oo;
  if ($[39] !== io || $[40] !== Lt)
    ((oo = r(Box, { flexShrink: 0, children: [Lt, io] })), ($[39] = io), ($[40] = Lt), ($[41] = oo));
  else oo = $[41];
  return oo;
}
//@ chunk-18hwfzwa.js:797818-797942 placement
function PermissionPromptPendingText() {
  let $ = w(1),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { color: "permission", wrap: "truncate", children: HIPAA_CONFIGURED_LABEL })), ($[0] = x));
  else x = $[0];
  return x;
}
/**
 * 页脚中显示会话模式（以 & 连接）的组件，通过动作键渲染钩子挂载，可加前导分隔点。
 */
//@ chunk-18hwfzwa.js:797942-798349 placement
var SessionModesText = (h) => {
  let L = w(5),
    { modes: modes, separated: separated } = h,
    ee,
    ke;
  if (L[0] !== modes)
    ((ee = () => ({ requestId: "session-mode", props: { modes: modes } })),
      (ke = [modes]),
      (L[0] = modes),
      (L[1] = ee),
      (L[2] = ke));
  else ((ee = L[1]), (ke = L[2]));
  const useRenderInput = actionKeysNamespace.useRenderInput("SessionMode", ee, ke);
  let Be;
  if (L[3] !== separated)
    ((Be = (He) =>
      He.props.modes.length === 0
        ? null
        : r(Text, { dimColor: !0, children: [separated ? " \xB7 " : "", He.props.modes.join(" & ")] })),
      (L[3] = separated),
      (L[4] = Be));
  else Be = L[4];
  return actionKeysNamespace.useRenderHook(useRenderInput, Be);
};
//@ chunk-18hwfzwa.js:798349-798827 placement
function FooterOpenSelected(h) {
  let $ = w(9),
    { status: status, bridgeSelected: bridgeSelected } = h,
    L = useShortcutDisplay("footer:openSelected", "Footer", "enter"),
    ke;
  if ($[0] !== bridgeSelected || $[1] !== status)
    ((ke = e(RemoteControlStatus, { status: status, highlighted: bridgeSelected })),
      ($[0] = bridgeSelected),
      ($[1] = status),
      ($[2] = ke));
  else ke = $[2];
  let Re;
  if ($[3] !== bridgeSelected || $[4] !== L)
    ((Re =
      bridgeSelected &&
      L &&
      r(Text, {
        dimColor: !0,
        wrap: "truncate",
        children: [" \xB7 ", e(KeyboardShortcutHint, { chord: L, action: "view" })],
      })),
      ($[3] = bridgeSelected),
      ($[4] = L),
      ($[5] = Re));
  else Re = $[5];
  let Be;
  if ($[6] !== ke || $[7] !== Re)
    ((Be = r(Box, { children: [ke, Re] })), ($[6] = ke), ($[7] = Re), ($[8] = Be));
  else Be = $[8];
  return Be;
}
//@ chunk-18hwfzwa.js:798827-798873 placement = SEP_WIDTH (1)
var Nge = `${DOWN_ARROW} `,
  wJe = bunStringWidth(Nge),
  Lge = bunStringWidth(" \xB7 ");
//@ chunk-18hwfzwa.js:798873-798958 placement
function KA(h) {
  let x = 0;
  for (let D of h) x += D.width;
  return x + Math.max(0, h.length - 1) * Lge;
}
//@ chunk-18hwfzwa.js:799024-799102 placement
function footerStatusStyle(h, x, D) {
  if (!h) return kJe;
  return x ? N7t : { color: D, bold: !0, inverse: !0 };
}
/**
 * 页脚状态行：可选的前导符号（按下时变亮）加分隔排列的段，单行截断。
 */
//@ chunk-18hwfzwa.js:799102-799620 placement
function FooterStatusRow(props) {
  let $ = w(11),
    { left: left, width: width, leading: leading, leadingPressed: leadingPressed } = props,
    Re;
  if ($[0] !== leading || $[1] !== leadingPressed)
    ((Re = leading && e(Text, { dimColor: !leadingPressed, children: Nge })),
      ($[0] = leading),
      ($[1] = leadingPressed),
      ($[2] = Re));
  else Re = $[2];
  let Be;
  if ($[3] !== left) ((Be = e(Byline, { children: left })), ($[3] = left), ($[4] = Be));
  else Be = $[4];
  let He;
  if ($[5] !== Re || $[6] !== Be)
    ((He = r(Text, { wrap: "truncate-end", children: [Re, Be] })), ($[5] = Re), ($[6] = Be), ($[7] = He));
  else He = $[7];
  let We;
  if ($[8] !== He || $[9] !== width)
    ((We = e(Box, { height: 1, width: width, overflow: "hidden", children: He })),
      ($[8] = He),
      ($[9] = width),
      ($[10] = We));
  else We = $[10];
  return We;
}
//@ chunk-18hwfzwa.js:799620-799716 placement
var U7t = /^[\u0021-\u007E\u00A2\u00A3\u00A5\u20AC]+$/u,
  regExp_4 = new RegExp(`(?:${STANDALONE_SYMBOL_PATTERN}\\p{M}*)+`, "gu");
//@ chunk-18hwfzwa.js:799716-799954 placement
function normalizeIdeSelectionLabel(h) {
  return ql(h.replace(BLANK_LOOKALIKE_RE, " ").replace(INVISIBLE_SYMBOL_RE, " ").replace(/\s+/gu, " "))
    .replace(regExp_6, (x, D) => (U7t.test(x.slice(D.length)) ? x : D))
    .replace(COMBINING_MARK_RE, "$1")
    .replace(regExp_4, (x, D, L) => (CJe(L, D - 1) || CJe(L, D + x.length) ? "" : x))
    .replace(/\s+/gu, " ")
    .trim();
}
//@ chunk-18hwfzwa.js:799954-800008 placement
function CJe(h, x) {
  return x < 0 || x >= h.length || h[x] === " ";
}
/**
 * 页脚状态段的常量：文件名宽度上下限、Bridge/IDE 各连接状态的颜色与后缀文案。
 */
//@ chunk-18hwfzwa.js:800008-800408 placement
var FOOTER_FILENAME_SHARE = 0.4,
  MAX_FILENAME_WIDTH = 16,
  MIN_FILENAME_WIDTH = 8,
  EMPTY_SEGMENTS = [],
  BRIDGE_STATUS_COLORS = { connected: "background", pending: "error", disconnected: "error" },
  IDE_STATUS_COLORS = {
    connecting: "warning",
    connected: "ide",
    reconnecting: "warning",
    disconnected: "error",
  },
  BRIDGE_STATUS_SUFFIXES = {
    connected: "",
    pending: " \xB7 connecting\u2026",
    disconnected: " \xB7 disconnected",
  },
  IDE_STATUS_SUFFIXES = {
    connecting: " \xB7 connecting\u2026",
    connected: "",
    reconnecting: " \xB7 reconnecting\u2026",
    disconnected: " \xB7 disconnected",
  };
//@ chunk-18hwfzwa.js:800408-801898 placement
function FooterIndicators({
  width: width,
  chrome: chrome,
  initialMcpClients: initialMcpClients,
  bridgeSelected: bridgeSelected,
  ideSelectionSelected: ideSelectionSelected,
}) {
  let ke = jw(
      initialMcpClients,
      useAppState((so) => so.mcp.clients),
    ),
    Re = useStoreSelector(chrome, (so) => so.ideSelection),
    Be = useAppState((so) => so.viewingAgentTaskId !== void 0),
    He = useAppState((so) => so.remoteSessionUrl),
    We = useAppState((so) => so.remoteConnectionStatus),
    ze = BridgeStatusIndicator(!0),
    Xe = P7("hipaa"),
    rt = useHasRenderHooks("SessionMode"),
    kt = useIdeConnectionStatus(ke),
    At = wt(),
    It = kt.ideName !== null && !At ? kt.status : null,
    Ot = Q(
      () =>
        IdeStatusIndicator({
          ideStatus: kt.status,
          ideName: kt.ideName,
          isRemoteWorkspace: At,
          isViewingAgent: Be,
          ideSelection: Re,
        }),
      [kt.status, kt.ideName, At, Be, Re],
    ),
    Et = sequential.level === 0,
    Dt = null;
  if (It !== null) {
    let so = `ide${Et ? BRIDGE_STATUS_SUFFIXES[It] : ""}`,
      po = footerStatusStyle(ideSelectionSelected, Et, BRIDGE_STATUS_COLORS[It]);
    Dt = {
      key: "ide",
      width: bunStringWidth(so),
      node: e(Text, { ...po, color: po.color ?? BRIDGE_STATUS_COLORS[It], children: so }, "ide"),
    };
  }
  let Lt = [];
  if (ze !== null) {
    let so = shortRcLabel(ze);
    Lt.push({
      key: "bridge",
      width: bunStringWidth(so),
      node: e(
        RemoteControlStatus,
        { status: ze, compact: { label: so, ink: footerStatusStyle(bridgeSelected, Et, ze.color) } },
        "bridge",
      ),
    });
  }
  if (He) {
    let so = `cloud${Et ? IDE_STATUS_SUFFIXES[We] : ""}`;
    Lt.push({
      key: "cloud",
      width: bunStringWidth(so),
      node: e(Text, { color: IDE_STATUS_COLORS[We], children: e(Link, { url: He, children: so }) }, "cloud"),
    });
  }
  if (Xe)
    Lt.push({
      key: "hipaa",
      width: bunStringWidth(HIPAA_CONFIGURED_LABEL),
      node: e(PermissionPromptPendingText, {}, "hipaa"),
    });
  let floored = Math.floor(width * FOOTER_FILENAME_SHARE),
    Xt;
  if (Dt === null || Ot === null) Xt = Dt === null ? Lt : [Dt, ...Lt];
  else {
    let so = withIdeSelectionSegment(Dt, Ot, Lt, floored);
    Xt =
      KA(so) <= floored
        ? so
        : withIdeSelectionSegment(
            Dt,
            Ot,
            Lt.filter((po) => po.key !== "cloud"),
            floored,
          );
  }
  let io = rt ? e(SessionModesText, { modes: EMPTY_SEGMENTS, separated: Xt.length > 0 }) : null;
  if (Xt.length === 0 && io === null) return null;
  return r(Box, {
    flexShrink: 0,
    children: [
      e(Box, {
        maxWidth: Math.max(floored, KA(Xt)),
        children: e(Text, {
          wrap: "truncate-end",
          children: e(Byline, { children: Xt.map((so) => so.node) }),
        }),
      }),
      io,
    ],
  });
}
//@ chunk-18hwfzwa.js:801898-802132 placement
function withIdeSelectionSegment(h, x, D, L) {
  let ee = L - KA([h, ...D]) - Lge,
    ke =
      x.kind === "fileName"
        ? truncateToWidth(
            normalizeIdeSelectionLabel(x.label),
            Math.max(MIN_FILENAME_WIDTH, Math.min(MAX_FILENAME_WIDTH, ee)),
          )
        : x.label,
    Re = {
      key: "ide-selection",
      width: bunStringWidth(ke),
      node: e(Text, { dimColor: !0, children: ke }, "ide-selection"),
    };
  return [h, Re, ...D];
}
//@ chunk-18hwfzwa.js:802132-802136 placement
j();
//@ chunk-18hwfzwa.js:802136-802190 placement
function selectToolPermissionContextMode4(vo) {
  return vo.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:802190-802268 placement
function selectToolPermissionContextAdditionalWorkingDirectories(Yo) {
  return Yo.toolPermissionContext.additionalWorkingDirectories;
}
//@ chunk-18hwfzwa.js:802268-802308 placement
function bZt(kn) {
  return kn.fastMode ?? !1;
}
//@ chunk-18hwfzwa.js:802308-802351 placement
function selectThinkingEnabled(Fn) {
  return Fn.thinkingEnabled;
}
//@ chunk-18hwfzwa.js:802351-802387 placement
function selectPrStatus2(bn) {
  return bn.prStatus;
}
//@ chunk-18hwfzwa.js:802387-802432 placement
function selectRemoteSessionName(Go) {
  return Go.remoteSessionName;
}
//@ chunk-18hwfzwa.js:802432-802459 placement
function CZt() {
  return EDITOR_MODES();
}
//@ chunk-18hwfzwa.js:802459-802486 placement
function _Zt() {
  return checkHasTrustDialogAccepted();
}
//@ chunk-18hwfzwa.js:802486-802616 placement
function capStatuslineIssueCount(hn) {
  return hn.setupIssues.statuslineIssueCount === 1
    ? hn
    : { ...hn, setupIssues: { ...hn.setupIssues, statuslineIssueCount: 1 } };
}

export {
  normalizeIdeSelectionLabel,
  wJe,
  FooterStatusRow,
  KA,
  footerStatusStyle,
  selectToolPermissionContextMode4,
  selectToolPermissionContextAdditionalWorkingDirectories,
  bZt,
  selectThinkingEnabled,
  selectPrStatus2,
  selectRemoteSessionName,
  CZt,
  _Zt,
  capStatuslineIssueCount,
  FooterIndicators,
  FooterStatusLine,
};
