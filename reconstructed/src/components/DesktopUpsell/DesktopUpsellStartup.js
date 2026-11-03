/**
 * components/DesktopUpsell/DesktopUpsellStartup.tsx
 *
 * 启动时的桌面版/插件推荐提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DesktopUpsell/DesktopUpsellStartup.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-4t8fx0s8.js (2)
 * attribution: affinity 1, callgraph-fingerprint 1, fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { So } from "../../hooks/useRecentInputGuard.js";
import { sanitizeOneLineLabel, LabelValueRow } from "../EffortMediumNudgeDialog.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-18hwfzwa.js:1106798-1106812 affinity
var oit = 30000;
//@ chunk-18hwfzwa.js:1106812-1108717 callgraph-fingerprint = DesktopUpsellStartup (0.167)
function DesktopUpsellStartup(t0) {
  let $ = w(33),
    {
      title: title,
      intro: intro,
      pluginName: pluginName,
      pluginDescription: pluginDescription,
      marketplaceName: marketplaceName,
      extraIdentityRow: extraIdentityRow,
      question: question,
      options: options,
      unansweredResponse: unansweredResponse,
      onResponse: onResponse,
    } = t0,
    Xe = useTimeout(So),
    rt = [
      { label: "Plugin:", value: pluginName, fallback: "(unnamed plugin)", suffix: "" },
      { label: "Marketplace:", value: marketplaceName, fallback: "(unnamed marketplace)", suffix: "" },
      ...(extraIdentityRow ? [extraIdentityRow] : []),
    ],
    At;
  if ($[0] !== pluginDescription)
    ((At = pluginDescription === void 0 ? void 0 : sanitizeOneLineLabel(pluginDescription)),
      ($[0] = pluginDescription),
      ($[1] = At));
  else At = $[1];
  let It = At,
    Ot;
  if ($[2] !== onResponse || $[3] !== unansweredResponse)
    ((Ot = () => onResponse(isUnattendedInteractiveSession() ? "cancelled" : unansweredResponse)),
      ($[2] = onResponse),
      ($[3] = unansweredResponse),
      ($[4] = Ot));
  else Ot = $[4];
  let Et;
  if ($[5] === MEMO_CACHE_SENTINEL) ((Et = []), ($[5] = Et));
  else Et = $[5];
  useTimeout(Ot, oit, Et);
  let Dt;
  if ($[6] !== Xe || $[7] !== onResponse)
    ((Dt = function oo(value) {
      if (!Xe) {
        return;
      }
      if (isUnattendedInteractiveSession()) {
        onResponse("cancelled");
        return;
      }
      onResponse(value);
    }),
      ($[6] = Xe),
      ($[7] = onResponse),
      ($[8] = Dt));
  else Dt = $[8];
  let oo = Dt;
  const Xt = PermissionDialog_2,
    io = Box,
    so = "column",
    po = 2,
    ao = 1;
  let co;
  if ($[9] !== intro) ((co = e(Box, { marginBottom: 1, children: intro })), ($[9] = intro), ($[10] = co));
  else co = $[10];
  const mapped = rt.map(LabelValueRow);
  let Ao;
  if ($[11] !== It)
    ((Ao =
      It &&
      r(Box, {
        children: [
          e(Box, { flexShrink: 0, children: e(Text, { dimColor: !0, children: "Description:" }) }),
          r(Text, { dimColor: !0, wrap: "truncate-end", children: [" ", It] }),
        ],
      })),
      ($[11] = It),
      ($[12] = Ao));
  else Ao = $[12];
  let Bo;
  if ($[13] !== question)
    ((Bo = e(Box, { marginTop: 1, children: e(Text, { children: question }) })),
      ($[13] = question),
      ($[14] = Bo));
  else Bo = $[14];
  const Ro = !Xe;
  let Ho;
  if ($[15] !== oo) ((Ho = () => oo("no")), ($[15] = oo), ($[16] = Ho));
  else Ho = $[16];
  let Io;
  if ($[17] !== options || $[18] !== oo || $[19] !== Ro || $[20] !== Ho)
    ((Io = e(Box, {
      children: e(ModelSelector, { options: options, isDisabled: Ro, onChange: oo, onCancel: Ho }),
    })),
      ($[17] = options),
      ($[18] = oo),
      ($[19] = Ro),
      ($[20] = Ho),
      ($[21] = Io));
  else Io = $[21];
  let Wo;
  if ($[22] !== io || $[23] !== Ao || $[24] !== Bo || $[25] !== Io || $[26] !== co || $[27] !== mapped)
    ((Wo = r(io, { flexDirection: so, paddingX: po, paddingY: ao, children: [co, mapped, Ao, Bo, Io] })),
      ($[22] = io),
      ($[23] = Ao),
      ($[24] = Bo),
      ($[25] = Io),
      ($[26] = co),
      ($[27] = mapped),
      ($[28] = Wo));
  else Wo = $[28];
  let mn;
  if ($[29] !== Xt || $[30] !== Wo || $[31] !== title)
    ((mn = e(Xt, { title: title, children: Wo })), ($[29] = Xt), ($[30] = Wo), ($[31] = title), ($[32] = mn));
  else mn = $[32];
  return mn;
}
//@ chunk-4t8fx0s8.js:13747-13804 fingerprint = DESKTOP_UPSELL_DEFAULT (0.667)
var DESKTOP_UPSELL_DEFAULT = { enable_shortcut_tip: !1, enable_contextual_tip: !1 };
//@ chunk-4t8fx0s8.js:13804-13854 fingerprint = getDesktopUpsellConfig (1)
function getDesktopUpsellConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_desktop_upsell", DESKTOP_UPSELL_DEFAULT);
}

export { DesktopUpsellStartup, getDesktopUpsellConfig };
