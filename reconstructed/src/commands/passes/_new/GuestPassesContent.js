/**
 * commands/passes/_new/GuestPassesContent.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aa3cndeh.js (8)
 * attribution: sole-consumer-new 8
 */
import { j, y, fo, Qr } from "../../../../vendor/react/cjs/react.production.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Passes } from "../../../components/Passes/Passes.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { Me } from "../../../components/design-system/ThemeProvider.js";
import { loadGuestPassStatus } from "./_new/loadGuestPassStatus.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Text, Box, Link } from "../../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../../../components/design-system/KeyboardShortcutHint.js";
import { nd } from "../../../utils/stableEmptyObject.js";
import { setClipboard } from "../../../ink/termio/osc.js";
import { logEvent } from "../../../services/analytics/index.js";
import { FocusColumn } from "../../../components/design-system/FocusColumn.js";
import { count } from "../../../utils/collections.js";
import { formatMinorUnits } from "../../../services/api/referral.js";
import { Byline } from "../../../components/design-system/Byline.js";
import { Pane } from "../../../components/design-system/Pane.js";

//@ chunk-aa3cndeh.js:5303-5307 sole-consumer-new
j();
//@ chunk-aa3cndeh.js:5307-5322 sole-consumer-new
function Be() {}
//@ chunk-aa3cndeh.js:5322-5360 sole-consumer-new
function Ae($e) {
  return $e.isAvailable;
}
//@ chunk-aa3cndeh.js:5360-5417 sole-consumer-new
function Ge(Ue, Ie) {
  return +Ie.isAvailable - +Ue.isAvailable;
}
//@ chunk-aa3cndeh.js:5417-5470 sole-consumer-new
function Oe(fe) {
  return e(Passes, { pass: fe }, fe.passNumber);
}
/**
 * 访客通行证（guest passes）对话框组件。
 */
//@ chunk-aa3cndeh.js:5470-6628 sole-consumer-new
function GuestPassesDialog(props) {
  let l = w(19),
    { onDone: onDone } = props,
    { storageV5: storageV5, credentials: credentials } = Me(),
    m;
  if (l[0] !== credentials || l[1] !== storageV5)
    ((m = () => loadGuestPassStatus(credentials, storageV5)),
      (l[0] = credentials),
      (l[1] = storageV5),
      (l[2] = m));
  else m = l[2];
  let [o] = y(m),
    h;
  if (l[3] !== onDone)
    ((h = () => onDone("Guest passes dialog dismissed", { display: "system" })), (l[3] = onDone), (l[4] = h));
  else h = l[4];
  let p = useGlobalExitKeybindings(h),
    b;
  if (l[5] !== onDone)
    ((b = () => {
      onDone("Guest passes dialog dismissed", { display: "system" });
    }),
      (l[5] = onDone),
      (l[6] = b));
  else b = l[6];
  let u = b,
    v;
  if (l[7] === MEMO_CACHE_SENTINEL) ((v = { context: "Confirmation" }), (l[7] = v));
  else v = l[7];
  useKeybinding("confirm:no", u, v);
  let R;
  if (l[8] === MEMO_CACHE_SENTINEL)
    ((R = e(Text, { dimColor: !0, children: "Loading guest pass information\u2026" })), (l[8] = R));
  else R = l[8];
  let C;
  if (l[9] !== p.keyName || l[10] !== p.pending)
    ((C = e(PassesPane, {
      isRedesign: !1,
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        tabIndex: 0,
        autoFocus: !0,
        children: [
          R,
          e(Text, {
            dimColor: !0,
            italic: !0,
            children: p.pending
              ? r(Fragment, { children: ["Press ", p.keyName, " again to exit"] })
              : e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...nd(!1) }),
          }),
        ],
      }),
    })),
      (l[9] = p.keyName),
      (l[10] = p.pending),
      (l[11] = C));
  else C = l[11];
  let f;
  if (l[12] !== p || l[13] !== onDone || l[14] !== o)
    ((f = e(GuestPassesContent, { passesPromise: o, onDone: onDone, exitState: p })),
      (l[12] = p),
      (l[13] = onDone),
      (l[14] = o),
      (l[15] = f));
  else f = l[15];
  let D;
  if (l[16] !== C || l[17] !== f)
    ((D = e(fo, { fallback: C, children: f })), (l[16] = C), (l[17] = f), (l[18] = D));
  else D = l[18];
  return D;
}
/**
 * 访客通行证内容：不可用时提示；否则显示剩余张数、通行证状态、推荐链接、说明与条款链接，回车复制链接。
 */
//@ chunk-aa3cndeh.js:6628-9584 sole-consumer-new
function GuestPassesContent(props) {
  let o = w(52),
    { passesPromise: passesPromise, onDone: onDone, exitState: exitState } = props,
    l = Qr(passesPromise),
    m = l.available ? l.referralLink : null,
    h;
  if (o[0] === MEMO_CACHE_SENTINEL) ((h = nd(!1)), (o[0] = h));
  else h = o[0];
  let p = h,
    b;
  if (o[1] !== onDone || o[2] !== m)
    ((b = function R(u) {
      if (u.ctrl || u.meta) {
        return;
      }
      if (u.key === "return" && m)
        (u.preventDefault(),
          setClipboard(m)
            .then((v) => {
              if (v) process.stdout.write(v);
              (logEvent("tengu_guest_passes_link_copied", {}), onDone("Referral link copied to clipboard!"));
            })
            .catch(Be));
    }),
      (o[1] = onDone),
      (o[2] = m),
      (o[3] = b));
  else b = o[3];
  let R = b;
  if (!l.available) {
    let C;
    if (o[4] === MEMO_CACHE_SENTINEL)
      ((C = e(Text, { children: "Guest passes are not currently available." })), (o[4] = C));
    else C = o[4];
    let f;
    if (o[5] !== exitState.keyName || o[6] !== exitState.pending)
      ((f = e(Text, {
        dimColor: !0,
        italic: !0,
        children: exitState.pending
          ? r(Fragment, { children: ["Press ", exitState.keyName, " again to exit"] })
          : e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...p }),
      })),
        (o[5] = exitState.keyName),
        (o[6] = exitState.pending),
        (o[7] = f));
    else f = o[7];
    let D;
    if (o[8] !== R || o[9] !== f)
      ((D = e(PassesPane, {
        isRedesign: !1,
        children: r(FocusColumn, { gap: 1, onKeyDown: R, children: [C, f] }),
      })),
        (o[8] = R),
        (o[9] = f),
        (o[10] = D));
    else D = o[10];
    return D;
  }
  let { passStatuses: passStatuses, referrerReward: referrerReward } = l,
    C;
  if (o[11] !== passStatuses) ((C = count(passStatuses, Ae)), (o[11] = passStatuses), (o[12] = C));
  else C = o[12];
  let te = C,
    A,
    G,
    f,
    D,
    O,
    V,
    U,
    _;
  if (o[13] !== te || o[14] !== R || o[15] !== passStatuses) {
    let sorted = [...passStatuses].sort(Ge);
    let re = `Guest passes \xB7 ${te} left`;
    G = FocusColumn;
    V = 1;
    U = R;
    if (o[24] !== re) ((_ = e(Text, { color: "permission", children: re })), (o[24] = re), (o[25] = _));
    else _ = o[25];
    A = Box;
    f = "row";
    D = 2;
    O = sorted.slice(0, 3).map(Oe);
    ((o[13] = te),
      (o[14] = R),
      (o[15] = passStatuses),
      (o[16] = A),
      (o[17] = G),
      (o[18] = f),
      (o[19] = D),
      (o[20] = O),
      (o[21] = V),
      (o[22] = U),
      (o[23] = _));
  } else
    ((A = o[16]), (G = o[17]), (f = o[18]), (D = o[19]), (O = o[20]), (V = o[21]), (U = o[22]), (_ = o[23]));
  let I;
  if (o[26] !== A || o[27] !== f || o[28] !== D || o[29] !== O)
    ((I = e(A, { flexDirection: f, marginLeft: D, children: O })),
      (o[26] = A),
      (o[27] = f),
      (o[28] = D),
      (o[29] = O),
      (o[30] = I));
  else I = o[30];
  let K;
  if (o[31] !== m)
    ((K = m && e(Box, { marginLeft: 2, children: e(Text, { children: m }) })), (o[31] = m), (o[32] = K));
  else K = o[32];
  let J;
  if (o[33] !== referrerReward)
    ((J = referrerReward
      ? `Share a free week of Claude Code with friends. If they love it and subscribe, you'll get ${formatMinorUnits(referrerReward)} in usage credits to keep building. `
      : "Share a free week of Claude Code with friends. "),
      (o[33] = referrerReward),
      (o[34] = J));
  else J = o[34];
  const ie = referrerReward
    ? "https://support.claude.com/en/articles/13456702-claude-code-guest-passes"
    : "https://support.claude.com/en/articles/12875061-claude-code-guest-passes";
  let X;
  if (o[35] !== ie) ((X = e(Link, { url: ie, children: "Terms apply." })), (o[35] = ie), (o[36] = X));
  else X = o[36];
  let z;
  if (o[37] !== J || o[38] !== X)
    ((z = e(Box, {
      flexDirection: "column",
      marginLeft: 2,
      children: r(Text, { dimColor: !0, children: [J, X] }),
    })),
      (o[37] = J),
      (o[38] = X),
      (o[39] = z));
  else z = o[39];
  let M;
  if (o[40] !== exitState.keyName || o[41] !== exitState.pending)
    ((M = e(Box, {
      children: e(Text, {
        dimColor: !0,
        italic: !0,
        children: exitState.pending
          ? r(Fragment, { children: ["Press ", exitState.keyName, " again to exit"] })
          : r(Byline, {
              children: [
                e(KeyboardShortcutHint, { chord: "enter", action: "copy link", ...p }),
                e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...p }),
              ],
            }),
      }),
    })),
      (o[40] = exitState.keyName),
      (o[41] = exitState.pending),
      (o[42] = M));
  else M = o[42];
  let pe;
  if (
    o[43] !== G ||
    o[44] !== I ||
    o[45] !== K ||
    o[46] !== z ||
    o[47] !== M ||
    o[48] !== V ||
    o[49] !== U ||
    o[50] !== _
  ) {
    let je = r(G, { gap: V, onKeyDown: U, children: [_, I, K, z, M] });
    pe = e(Pane, { children: je });
    ((o[43] = G),
      (o[44] = I),
      (o[45] = K),
      (o[46] = z),
      (o[47] = M),
      (o[48] = V),
      (o[49] = U),
      (o[50] = _),
      (o[51] = pe));
  } else pe = o[51];
  return pe;
}
//@ chunk-aa3cndeh.js:9584-9694 sole-consumer-new
function PassesPane(g) {
  let d = w(2),
    { children: children } = g,
    i;
  if (d[0] !== children) ((i = e(Pane, { children: children })), (d[0] = children), (d[1] = i));
  else i = d[1];
  return i;
}

export { GuestPassesDialog };
