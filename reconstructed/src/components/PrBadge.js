/**
 * components/PrBadge.tsx
 *
 * PR 徽章：PR 号 + 审查状态颜色（approved/changes_requested/pending/merged…）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PrBadge.tsx
 * pieces: chunk-qgpgvvwv.js (7)
 * attribution: fingerprint 2, layout 4, placement 1
 */
import { P } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { See } from "../utils/ghPrStatus.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-qgpgvvwv.js:808-976 fingerprint = getPrStatusColor (1)
function getPrStatusColor(state) {
  switch (state) {
    case "approved":
      return "success";
    case "changes_requested":
      return "error";
    case "pending":
      return "warning";
    case "merged":
      return "merged";
    default:
      return;
  }
}
//@ chunk-qgpgvvwv.js:976-1001 layout
function S(s, o, d) {
  return;
}
//@ chunk-qgpgvvwv.js:1001-1085 layout
function jho(s, o, d) {
  P(() => {
    if (o === void 0) return;
    S(s, o, d === "cr" || d === "mr");
  }, [s, o, d]);
}
//@ chunk-qgpgvvwv.js:1085-1135 layout
function fe(ge) {
  return ge.settings?.prUrlTemplate;
}
//@ chunk-qgpgvvwv.js:1135-2596 fingerprint = PrBadge (0.723)
function PrBadge(t0) {
  let $ = w(41),
    {
      number: number,
      url: url,
      reviewState: reviewState,
      bold: bold,
      color: color,
      dimColor: dimColor,
      inverse: inverse,
      underline: underline,
      hidePrefix: hidePrefix,
      kind: kind,
    } = t0,
    be = underline === void 0 ? !0 : underline,
    R = kind === "cr" && !1,
    m = kind === "mr",
    C = m ? "!" : "#",
    I = useAppState(fe),
    ee;
  if ($[0] !== R || $[1] !== m || $[2] !== I || $[3] !== url)
    ((ee = R || m ? url : See(url, I)), ($[0] = R), ($[1] = m), ($[2] = I), ($[3] = url), ($[4] = ee));
  else ee = $[4];
  let v = ee,
    re,
    oe;
  if ($[5] !== R || $[6] !== m || $[7] !== url || $[8] !== v)
    ((re = () => {
      S(v, url, R || m);
    }),
      (oe = [v, url, R, m]),
      ($[5] = R),
      ($[6] = m),
      ($[7] = url),
      ($[8] = v),
      ($[9] = re),
      ($[10] = oe));
  else ((re = $[9]), (oe = $[10]));
  P(re, oe);
  let te;
  if ($[11] !== color || $[12] !== reviewState)
    ((te = color ?? getPrStatusColor_2(reviewState)), ($[11] = color), ($[12] = reviewState), ($[13] = te));
  else te = $[13];
  let _ = te,
    k = !inverse && (dimColor || (!_ && !bold)),
    ne;
  if ($[14] !== bold || $[15] !== k || $[16] !== C || $[17] !== inverse || $[18] !== number || $[19] !== _)
    ((ne = r(Text, { color: _, dimColor: k, bold: bold, inverse: inverse, children: [C, number] })),
      ($[14] = bold),
      ($[15] = k),
      ($[16] = C),
      ($[17] = inverse),
      ($[18] = number),
      ($[19] = _),
      ($[20] = ne));
  else ne = $[20];
  let B = ne,
    U;
  if ($[21] !== bold || $[22] !== dimColor || $[23] !== hidePrefix || $[24] !== m)
    ((U =
      !hidePrefix &&
      r(Fragment, { children: [e(Text, { dimColor: dimColor || !bold, children: m ? "MR" : "PR" }), " "] })),
      ($[21] = bold),
      ($[22] = dimColor),
      ($[23] = hidePrefix),
      ($[24] = m),
      ($[25] = U));
  else U = $[25];
  const D = !inverse && be;
  let F;
  if (
    $[26] !== bold ||
    $[27] !== k ||
    $[28] !== C ||
    $[29] !== inverse ||
    $[30] !== number ||
    $[31] !== _ ||
    $[32] !== D
  )
    ((F = r(Text, {
      color: _,
      dimColor: k,
      underline: D,
      bold: bold,
      inverse: inverse,
      children: [C, number],
    })),
      ($[26] = bold),
      ($[27] = k),
      ($[28] = C),
      ($[29] = inverse),
      ($[30] = number),
      ($[31] = _),
      ($[32] = D),
      ($[33] = F));
  else F = $[33];
  let O;
  if ($[34] !== B || $[35] !== F || $[36] !== v)
    ((O = e(Link, { url: v, fallback: B, assumeSupport: !0, children: F })),
      ($[34] = B),
      ($[35] = F),
      ($[36] = v),
      ($[37] = O));
  else O = $[37];
  let ie;
  if ($[38] !== O || $[39] !== U)
    ((ie = r(Text, { children: [U, O] })), ($[38] = O), ($[39] = U), ($[40] = ie));
  else ie = $[40];
  return ie;
}
//@ chunk-qgpgvvwv.js:2596-2763 layout = getPrStatusColor (1)
function getPrStatusColor_2(state) {
  switch (state) {
    case "approved":
      return "success";
    case "changes_requested":
      return "error";
    case "pending":
      return "warning";
    case "merged":
      return "merged";
    default:
      return;
  }
}
/**
 * 显示增删行数（+N 绿色、-N 红色），都为 0 时不渲染。
 */
//@ chunk-qgpgvvwv.js:2763-3227 placement
function DiffStatCounts(s) {
  let $ = w(10),
    { added: added, removed: removed, bold: bold } = s;
  if (added === 0 && removed === 0) {
    return null;
  }
  let c;
  if ($[0] !== added || $[1] !== bold)
    ((c = added > 0 && r(Text, { color: "diffAddedWord", bold: bold, children: ["+", added] })),
      ($[0] = added),
      ($[1] = bold),
      ($[2] = c));
  else c = $[2];
  const b = added > 0 && removed > 0 && " ";
  let a;
  if ($[3] !== bold || $[4] !== removed)
    ((a = removed > 0 && r(Text, { color: "diffRemovedWord", bold: bold, children: ["-", removed] })),
      ($[3] = bold),
      ($[4] = removed),
      ($[5] = a));
  else a = $[5];
  let x;
  if ($[6] !== c || $[7] !== b || $[8] !== a)
    ((x = r(Text, { children: [c, b, a] })), ($[6] = c), ($[7] = b), ($[8] = a), ($[9] = x));
  else x = $[9];
  return x;
}

export { DiffStatCounts, jho, PrBadge, getPrStatusColor };
