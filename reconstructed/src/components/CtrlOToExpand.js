/**
 * components/CtrlOToExpand.tsx
 *
 * "(ctrl+o to expand)" 提示组件与字符串版本；子代理上下文内不显示（SubAgentContext）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CtrlOToExpand.tsx
 * pieces: chunk-32akb2g2.js (3), chunk-4121qate.js (2), chunk-bn7jsn5n.js (1), chunk-mt2ya4ef.js (6)
 * attribution: placement 8, affinity 1, fingerprint 3
 */
import * as vmModule from "vm";
import * as vmModule_2 from "vm";
import * as vmModule_3 from "vm";
import * as vmModule_4 from "vm";
import * as vmModule_5 from "vm";
import * as vmModule_6 from "vm";
import * as vmModule_7 from "vm";
import * as vmModule_8 from "vm";
import * as vmModule_9 from "vm";
import * as vmModule_10 from "vm";
import * as vmModule_11 from "vm";
import * as vmModule_12 from "vm";
import * as vmModule_13 from "vm";
import * as vmModule_14 from "vm";
import { j, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { d5 } from "./messages/expandContext.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Text, Box } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { formatOverflowHint, formatKb } from "../utils/format.js";
import { sanitizeTeammateLabel } from "../utils/swarm/teammateIds.js";
import { sPn } from "../utils/peerMessageHeaders.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { jSi } from "../utils/untrustedValues.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-mt2ya4ef.js:523-527 placement
j();
//@ chunk-mt2ya4ef.js:527-531 placement
j();
//@ chunk-mt2ya4ef.js:531-544 placement
var c = qt(!1);
/**
 * 标记子树处于子代理上下文的 Provider 组件。
 */
//@ chunk-mt2ya4ef.js:544-673 placement
function SubAgentProvider(m) {
  let $ = w(2),
    { children: children } = m,
    a;
  if ($[0] !== children)
    ((a = e(c.Provider, { value: !0, children: children })), ($[0] = children), ($[1] = a));
  else a = $[1];
  return a;
}
/**
 * "(ctrl+o to expand)" 提示：按当前 keybinding 显示，子代理上下文内不显示。
 */
//@ chunk-mt2ya4ef.js:673-973 fingerprint = CtrlOToExpand (0.751)
function CtrlOToExpand() {
  let $ = w(3),
    isInSubAgent = Se(c),
    inVirtualList = Se(d5),
    expandShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  if (isInSubAgent || inVirtualList) {
    return null;
  }
  let t;
  if ($[0] === MEMO_CACHE_SENTINEL) ((t = { keyCase: "lower" }), ($[0] = t));
  else t = $[0];
  let d;
  if ($[1] !== expandShortcut)
    ((d = e(Text, {
      dimColor: !0,
      children: e(KeyboardShortcutHint, { chord: expandShortcut, action: "expand", parens: !0, format: t }),
    })),
      ($[1] = expandShortcut),
      ($[2] = d));
  else d = $[2];
  return d;
}
/**
 * 显示"+N 行/项"溢出提示（隐藏字符超过 1000 时附 KB 数），可选附加"ctrl+o 展开"提示；count 为 0 时不渲染。
 */
//@ chunk-mt2ya4ef.js:973-1471 placement
function OverflowHint(props) {
  let $ = w(11),
    { count: count, unit: unit, expandable: expandable, hiddenChars: hiddenChars } = props,
    d = unit === void 0 ? "line" : unit,
    h = expandable === void 0 ? !1 : expandable;
  if (count <= 0) {
    return null;
  }
  let p;
  if ($[0] !== count || $[1] !== d)
    ((p = formatOverflowHint(count, d)), ($[0] = count), ($[1] = d), ($[2] = p));
  else p = $[2];
  let s;
  if ($[3] !== hiddenChars)
    ((s = hiddenChars !== void 0 && hiddenChars >= 1000 && ` (~${formatKb(hiddenChars)} KB)`),
      ($[3] = hiddenChars),
      ($[4] = s));
  else s = $[4];
  let u;
  if ($[5] !== h) ((u = h && r(Fragment, { children: [" ", e(CtrlOToExpand, {})] })), ($[5] = h), ($[6] = u));
  else u = $[6];
  let b;
  if ($[7] !== p || $[8] !== s || $[9] !== u)
    ((b = r(Text, { dimColor: !0, children: [p, s, u] })), ($[7] = p), ($[8] = s), ($[9] = u), ($[10] = b));
  else b = $[10];
  return b;
}
//@ chunk-32akb2g2.js:661-665 placement
j();
//@ chunk-32akb2g2.js:665-689 placement
var N = { keyCase: "lower" };
/**
 * 折叠内容的"ctrl+o 展开"提示行（显示名、数量、限定词）。
 */
//@ chunk-32akb2g2.js:689-1648 placement
function CtrlOToExpandHint(a) {
  let o = w(19),
    {
      displayName: displayName,
      qualifier: qualifier,
      count: count,
      addMargin: addMargin,
      fallbackLabel: fallbackLabel,
      body: body,
    } = a,
    R = count === void 0 ? 1 : count,
    U = addMargin === void 0 ? !0 : addMargin,
    b = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    h;
  if (o[0] !== displayName || o[1] !== fallbackLabel)
    ((h = sanitizeTeammateLabel(displayName) || fallbackLabel),
      (o[0] = displayName),
      (o[1] = fallbackLabel),
      (o[2] = h));
  else h = o[2];
  let u = h,
    A;
  if (o[3] !== body) ((A = body ? sPn(body) : ""), (o[3] = body), (o[4] = A));
  else A = o[4];
  let i = A;
  const g = U ? 1 : 0;
  let P;
  if (o[5] === MEMO_CACHE_SENTINEL)
    ((P = r(Text, { "aria-hidden": !0, children: [re.pointerSmall, " "] })), (o[5] = P));
  else P = o[5];
  const y = R === 1 ? "Message" : `${R} messages`,
    T = qualifier ? ` (${qualifier})` : "";
  let p;
  if (o[6] !== i) ((p = i ? r(Text, { italic: !0, children: [": ", i] }) : ""), (o[6] = i), (o[7] = p));
  else p = o[7];
  let l;
  if (o[8] !== b)
    ((l = e(KeyboardShortcutHint, { chord: b, action: "expand", parens: !0, format: N })),
      (o[8] = b),
      (o[9] = l));
  else l = o[9];
  let m;
  if (o[10] !== u || o[11] !== l || o[12] !== y || o[13] !== T || o[14] !== p)
    ((m = r(Text, { dimColor: !0, children: [P, y, " from @", u, T, p, " ", l] })),
      (o[10] = u),
      (o[11] = l),
      (o[12] = y),
      (o[13] = T),
      (o[14] = p),
      (o[15] = m));
  else m = o[15];
  let G;
  if (o[16] !== m || o[17] !== g)
    ((G = e(Box, { marginTop: g, children: m })), (o[16] = m), (o[17] = g), (o[18] = G));
  else G = o[18];
  return G;
}
//@ chunk-4121qate.js:49576-49612 affinity
var runInContext = vmModule_2.runInContext,
  ky = EvalError;
//@ chunk-4121qate.js:49612-49745 fingerprint = SubAgentContext (0.609)
function SubAgentContext(e, o) {
  let context = vmModule_2.createContext(e, o),
    n;
  try {
    n = runInContext("this", context);
  } catch (error) {
    if (!(error instanceof ky)) throw error;
    n = void 0;
  }
  return (jSi(context, n), context);
}
//@ chunk-bn7jsn5n.js:537-635 fingerprint = ctrlOToExpand (1)
function ctrlOToExpand() {
  let shortcut = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  return sequential.dim(`(${shortcut} to expand)`);
}

export { SubAgentProvider, CtrlOToExpand, OverflowHint, SubAgentContext, ctrlOToExpand, CtrlOToExpandHint };
