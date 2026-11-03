/**
 * components/SlashCommandLink.tsx
 *
 * 2.1.316 新增：斜杠命令链接与提示行组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-07xmkrj2.js (8)
 * attribution: placement 8
 */
import { j, y, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { zzt } from "../utils/messageQueueManager.js";
import { useStrayClickGuard } from "./CustomSelect/strayClickGuard.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { LinkifiedText } from "./LinkifiedText.js";
import { SPINNER_DOTS, PROPORTION } from "../utils/permissions/autoModeRulesPrompt.js";
import { i0t } from "./messages/transcriptModeContext.js";
import { Imt } from "../context/QueuedMessageContext.js";
import { tE } from "../utils/permissions/currentPermissionContext.js";

//@ chunk-07xmkrj2.js:708-712 placement
j();
//@ chunk-07xmkrj2.js:712-1509 placement
function SlashCommandLink(p) {
  let C = w(17),
    { command: command, args: args, color: color } = p,
    t = args === void 0 ? command : `${command} ${args}`,
    i;
  if (C[0] === MEMO_CACHE_SENTINEL) ((i = zzt()), (C[0] = i));
  else i = C[0];
  let U = i,
    [x, h] = y(!1),
    b = useStrayClickGuard();
  if (!U) {
    let d;
    if (C[1] !== color || C[2] !== t)
      ((d = r(Text, { underline: !0, color: color, children: ["/", t] })),
        (C[1] = color),
        (C[2] = t),
        (C[3] = d));
    else d = C[3];
    return d;
  }
  let d;
  if (C[4] !== command || C[5] !== t || C[6] !== b)
    ((d = (v) => {
      if (b(v)) {
        return;
      }
      (logEvent("tengu_slash_link_clicked", { command: fromEnum(command) }), U(t, { kind: "human" }));
    }),
      (C[4] = command),
      (C[5] = t),
      (C[6] = b),
      (C[7] = d));
  else d = C[7];
  let k, u;
  if (C[8] === MEMO_CACHE_SENTINEL) ((k = () => h(!0)), (u = () => h(!1)), (C[8] = k), (C[9] = u));
  else ((k = C[8]), (u = C[9]));
  let f;
  if (C[10] !== color || C[11] !== x || C[12] !== t)
    ((f = r(Text, { underline: !0, bold: x, color: color, children: ["/", t] })),
      (C[10] = color),
      (C[11] = x),
      (C[12] = t),
      (C[13] = f));
  else f = C[13];
  let T;
  if (C[14] !== d || C[15] !== f)
    ((T = e(Box, { onClick: d, onMouseEnter: k, onMouseLeave: u, children: f })),
      (C[14] = d),
      (C[15] = f),
      (C[16] = T));
  else T = C[16];
  return T;
}
//@ chunk-07xmkrj2.js:1509-1513 placement
j();
//@ chunk-07xmkrj2.js:1513-1517 placement
j();
//@ chunk-07xmkrj2.js:1517-1543 placement
var SlashLinkContexts = qt(!1),
  ynn = qt(!1);
//@ chunk-07xmkrj2.js:1543-2829 placement
function NoticeLine(p) {
  let u = w(26),
    { tone: tone, text: text, detail: detail, subLines: subLines, linkify: linkify } = p,
    i = linkify ? LinkifiedText : Text,
    x = Se(ynn)
      ? " "
      : p.state === "live" && !p.reducedMotion
        ? SPINNER_DOTS[p.frame % SPINNER_DOTS.length]
        : PROPORTION,
    h = tone === "gold" ? "warning" : tone === "red" ? "error" : void 0,
    b = tone === "red";
  const d = tone === "dim",
    v = tone === "red" ? "error:" : tone === "gold" ? "warning:" : void 0,
    k = tone === "dim";
  let f;
  if (u[0] !== x || u[1] !== h || u[2] !== d || u[3] !== v || u[4] !== k)
    ((f = r(Text, {
      "aria-hidden": d,
      "aria-label": v,
      italic: !0,
      color: h,
      dimColor: k,
      children: [x, " "],
    })),
      (u[0] = x),
      (u[1] = h),
      (u[2] = d),
      (u[3] = v),
      (u[4] = k),
      (u[5] = f));
  else f = u[5];
  const T = b ? "error" : void 0,
    N = !b;
  let L;
  if (u[6] !== i || u[7] !== text) ((L = e(i, { children: text })), (u[6] = i), (u[7] = text), (u[8] = L));
  else L = u[8];
  let R;
  if (u[9] !== i || u[10] !== detail)
    ((R = detail !== void 0 && r(Text, { dimColor: !0, children: [" \xB7 ", e(i, { children: detail })] })),
      (u[9] = i),
      (u[10] = detail),
      (u[11] = R));
  else R = u[11];
  let H;
  if (u[12] !== T || u[13] !== N || u[14] !== L || u[15] !== R)
    ((H = r(Text, { italic: !0, color: T, dimColor: N, children: [L, R] })),
      (u[12] = T),
      (u[13] = N),
      (u[14] = L),
      (u[15] = R),
      (u[16] = H));
  else H = u[16];
  let M;
  if (u[17] !== i || u[18] !== subLines)
    ((M = subLines?.map((ne, re) => e(Text, { dimColor: !0, children: e(i, { children: ne }) }, re))),
      (u[17] = i),
      (u[18] = subLines),
      (u[19] = M));
  else M = u[19];
  let P;
  if (u[20] !== H || u[21] !== M)
    ((P = r(Box, { flexDirection: "column", flexGrow: 1, children: [H, M] })),
      (u[20] = H),
      (u[21] = M),
      (u[22] = P));
  else P = u[22];
  let z;
  if (u[23] !== P || u[24] !== f)
    ((z = r(Box, { flexDirection: "row", children: [f, P] })), (u[23] = P), (u[24] = f), (u[25] = z));
  else z = u[25];
  return z;
}
//@ chunk-07xmkrj2.js:2829-2902 placement
function shouldShowNotice(p) {
  let o = i0t(),
    l = Imt()?.isQueued === !0;
  return !p && !o && !l && tE();
}
//@ chunk-07xmkrj2.js:2902-2984 placement
function noticeSystemLines(p) {
  let o = shouldShowNotice(p),
    l = Imt();
  return l?.isQueued === !0 ? l.noticeSystemLines : o;
}

export { shouldShowNotice, NoticeLine, ynn, SlashCommandLink, SlashLinkContexts, noticeSystemLines };
