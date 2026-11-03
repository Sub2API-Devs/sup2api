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
import "vm";
import * as vmModule_2 from "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import "vm";
import { init_react_production, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { expandContextSignal } from "./messages/expandContext.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Text, Box } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { formatOverflowHint, formatKb } from "../utils/format.js";
import { sanitizeTeammateLabel } from "../utils/swarm/teammateIds.js";
import { firstLineOfPeerBody } from "../utils/peerMessageHeaders.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { markUntrusted } from "../utils/untrustedValues.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-mt2ya4ef.js:523-527 placement
init_react_production();
//@ chunk-mt2ya4ef.js:527-531 placement
init_react_production();
//@ chunk-mt2ya4ef.js:531-544 placement
var SUBAGENT_CONTEXT = qt(false);
//@ chunk-mt2ya4ef.js:544-673 placement
/**
 * 标记子树处于子代理上下文的 Provider 组件。
 */
function SubAgentProvider(props) {
  let $ = w(2);
  let { children } = props;
  let a;
  if ($[0] !== children) {
    a = jsxProd_default(SUBAGENT_CONTEXT.Provider, {
      value: true,
      children,
    });
    $[0] = children;
    $[1] = a;
  } else a = $[1];
  return a;
}
//@ chunk-mt2ya4ef.js:673-973 fingerprint = CtrlOToExpand (0.751)
/**
 * "(ctrl+o to expand)" 提示：按当前 keybinding 显示，子代理上下文内不显示。
 */
function CtrlOToExpand() {
  let $ = w(3);
  let isInSubAgent = Se(SUBAGENT_CONTEXT);
  let inVirtualList = Se(expandContextSignal);
  let expandShortcut = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  if (isInSubAgent || inVirtualList) {
    return null;
  }
  let format;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    format = {
      keyCase: "lower",
    };
    $[0] = format;
  } else format = $[0];
  let d;
  if ($[1] !== expandShortcut) {
    d = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: expandShortcut,
        action: "expand",
        parens: true,
        format,
      }),
    });
    $[1] = expandShortcut;
    $[2] = d;
  } else d = $[2];
  return d;
}
//@ chunk-mt2ya4ef.js:973-1471 placement
/**
 * 显示"+N 行/项"溢出提示（隐藏字符超过 1000 时附 KB 数），可选附加"ctrl+o 展开"提示；count 为 0 时不渲染。
 */
function OverflowHint(props) {
  let $ = w(11);
  let { count, unit, expandable, hiddenChars } = props;
  let d = unit === undefined ? "line" : unit;
  let h = expandable === undefined ? false : expandable;
  if (count <= 0) {
    return null;
  }
  let p;
  if ($[0] !== count || $[1] !== d) {
    p = formatOverflowHint(count, d);
    $[0] = count;
    $[1] = d;
    $[2] = p;
  } else p = $[2];
  let s;
  if ($[3] !== hiddenChars) {
    s = hiddenChars !== undefined && hiddenChars >= 1000 && ` (~${formatKb(hiddenChars)} KB)`;
    $[3] = hiddenChars;
    $[4] = s;
  } else s = $[4];
  let u;
  if ($[5] !== h) {
    u =
      h &&
      jsxProd_default_2(Fragment, {
        children: [" ", jsxProd_default(CtrlOToExpand, {})],
      });
    $[5] = h;
    $[6] = u;
  } else u = $[6];
  let b;
  if ($[7] !== p || $[8] !== s || $[9] !== u) {
    b = jsxProd_default_2(Text, {
      dimColor: true,
      children: [p, s, u],
    });
    $[7] = p;
    $[8] = s;
    $[9] = u;
    $[10] = b;
  } else b = $[10];
  return b;
}
//@ chunk-32akb2g2.js:661-665 placement
init_react_production();
//@ chunk-32akb2g2.js:665-689 placement
var LOWER_KEY_FORMAT = {
  keyCase: "lower",
};
//@ chunk-32akb2g2.js:689-1648 placement
/**
 * 折叠内容的"ctrl+o 展开"提示行（显示名、数量、限定词）。
 */
function CtrlOToExpandHint(props) {
  let o = w(19);
  let { displayName, qualifier, count, addMargin, fallbackLabel, body } = props;
  let R = count === undefined ? 1 : count;
  let U = addMargin === undefined ? true : addMargin;
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let h;
  if (o[0] !== displayName || o[1] !== fallbackLabel) {
    h = sanitizeTeammateLabel(displayName) || fallbackLabel;
    o[0] = displayName;
    o[1] = fallbackLabel;
    o[2] = h;
  } else h = o[2];
  let u = h;
  let A;
  if (o[3] !== body) {
    A = body ? firstLineOfPeerBody(body) : "";
    o[3] = body;
    o[4] = A;
  } else A = o[4];
  let i = A;
  const marginTop = U ? 1 : 0;
  let P;
  if (o[5] === MEMO_CACHE_SENTINEL) {
    P = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    o[5] = P;
  } else P = o[5];
  const y = R === 1 ? "Message" : `${R} messages`;
  const T = qualifier ? ` (${qualifier})` : "";
  let p;
  if (o[6] !== i) {
    p = i
      ? jsxProd_default_2(Text, {
          italic: true,
          children: [": ", i],
        })
      : "";
    o[6] = i;
    o[7] = p;
  } else p = o[7];
  let l;
  if (o[8] !== chord) {
    l = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: "expand",
      parens: true,
      format: LOWER_KEY_FORMAT,
    });
    o[8] = chord;
    o[9] = l;
  } else l = o[9];
  let children;
  if (o[10] !== u || o[11] !== l || o[12] !== y || o[13] !== T || o[14] !== p) {
    children = jsxProd_default_2(Text, {
      dimColor: true,
      children: [P, y, " from @", u, T, p, " ", l],
    });
    o[10] = u;
    o[11] = l;
    o[12] = y;
    o[13] = T;
    o[14] = p;
    o[15] = children;
  } else children = o[15];
  let G;
  if (o[16] !== children || o[17] !== marginTop) {
    G = jsxProd_default(Box, {
      marginTop,
      children,
    });
    o[16] = children;
    o[17] = marginTop;
    o[18] = G;
  } else G = o[18];
  return G;
}
//@ chunk-4121qate.js:49576-49612 affinity
var runInContext = vmModule_2.runInContext;
var EvalErrorClass = EvalError;
//@ chunk-4121qate.js:49612-49745 fingerprint = SubAgentContext (0.609)
function SubAgentContext(e, o) {
  let context = vmModule_2.createContext(e, o);
  let n;
  try {
    n = runInContext("this", context);
  } catch (error) {
    if (!(error instanceof EvalErrorClass)) throw error;
    n = undefined;
  }
  markUntrusted(context, n);
  return context;
}
//@ chunk-bn7jsn5n.js:537-635 fingerprint = ctrlOToExpand (1)
function ctrlOToExpand() {
  let shortcut = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  return sequential.dim(`(${shortcut} to expand)`);
}
export { SubAgentProvider, CtrlOToExpand, OverflowHint, SubAgentContext, ctrlOToExpand, CtrlOToExpandHint };
