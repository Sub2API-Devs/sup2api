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
import { markUntrusted } from "../utils/untrustedValues.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { sequential } from "../utils/sequential.js";
import { init_react_production, createContext, useContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-4121qate.js:49576-49612 affinity
var runInContext = vmModule_2.runInContext;
var EvalErrorClass = EvalError;
//@ chunk-4121qate.js:49612-49745 fingerprint = SubAgentContext (0.609)
function SubAgentContext(sandbox, options) {
  let context = vmModule_2.createContext(sandbox, options);
  let subject;
  try {
    subject = runInContext("this", context);
  } catch (error) {
    if (!(error instanceof EvalErrorClass)) throw error;
    subject = undefined;
  }
  markUntrusted(context, subject);
  return context;
}
//@ chunk-bn7jsn5n.js:537-635 fingerprint = ctrlOToExpand (1)
function ctrlOToExpand() {
  let shortcut = getShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  return sequential.dim(`(${shortcut} to expand)`);
}
//@ chunk-mt2ya4ef.js:523-527 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mt2ya4ef.js:523", () => {
  init_react_production();
});
//@ chunk-mt2ya4ef.js:527-531 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mt2ya4ef.js:527", () => {
  init_react_production();
});
//@ chunk-mt2ya4ef.js:531-544 placement
var SUBAGENT_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mt2ya4ef.js:531", () => {
  SUBAGENT_CONTEXT = createContext(false);
});
//@ chunk-mt2ya4ef.js:544-673 placement
/**
 * 标记子树处于子代理上下文的 Provider 组件。
 */
function SubAgentProvider(props) {
  let $ = useMemoCache(2);
  let { children } = props;
  let fragment;
  if ($[0] !== children) {
    fragment = jsxProd_default(SUBAGENT_CONTEXT.Provider, {
      value: true,
      children,
    });
    $[0] = children;
    $[1] = fragment;
  } else fragment = $[1];
  return fragment;
}
//@ chunk-mt2ya4ef.js:673-973 fingerprint = CtrlOToExpand (0.751)
/**
 * "(ctrl+o to expand)" 提示：按当前 keybinding 显示，子代理上下文内不显示。
 */
function CtrlOToExpand() {
  let $ = useMemoCache(3);
  let isInSubAgent = useContext(SUBAGENT_CONTEXT);
  let inVirtualList = useContext(expandContextSignal);
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
  let hintNode;
  if ($[1] !== expandShortcut) {
    hintNode = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: expandShortcut,
        action: "expand",
        parens: true,
        format,
      }),
    });
    $[1] = expandShortcut;
    $[2] = hintNode;
  } else hintNode = $[2];
  return hintNode;
}
//@ chunk-mt2ya4ef.js:973-1471 placement
/**
 * 显示"+N 行/项"溢出提示（隐藏字符超过 1000 时附 KB 数），可选附加"ctrl+o 展开"提示；count 为 0 时不渲染。
 */
function OverflowHint(props) {
  let $ = useMemoCache(11);
  let { count, unit, expandable, hiddenChars } = props;
  let unitWord = unit === undefined ? "line" : unit;
  let canExpand = expandable === undefined ? false : expandable;
  if (count <= 0) {
    return null;
  }
  let countText;
  if ($[0] !== count || $[1] !== unitWord) {
    countText = formatOverflowHint(count, unitWord);
    $[0] = count;
    $[1] = unitWord;
    $[2] = countText;
  } else countText = $[2];
  let sizeText;
  if ($[3] !== hiddenChars) {
    sizeText = hiddenChars !== undefined && hiddenChars >= 1000 && ` (~${formatKb(hiddenChars)} KB)`;
    $[3] = hiddenChars;
    $[4] = sizeText;
  } else sizeText = $[4];
  let expandHint;
  if ($[5] !== canExpand) {
    expandHint =
      canExpand &&
      jsxProd_default_2(Fragment, {
        children: [" ", jsxProd_default(CtrlOToExpand, {})],
      });
    $[5] = canExpand;
    $[6] = expandHint;
  } else expandHint = $[6];
  let hintText;
  if ($[7] !== countText || $[8] !== sizeText || $[9] !== expandHint) {
    hintText = jsxProd_default_2(Text, {
      dimColor: true,
      children: [countText, sizeText, expandHint],
    });
    $[7] = countText;
    $[8] = sizeText;
    $[9] = expandHint;
    $[10] = hintText;
  } else hintText = $[10];
  return hintText;
}
//@ chunk-32akb2g2.js:661-665 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-32akb2g2.js:661", () => {
  init_react_production();
});
//@ chunk-32akb2g2.js:665-689 placement
var LOWER_KEY_FORMAT = {
  keyCase: "lower",
};
//@ chunk-32akb2g2.js:689-1648 placement
/**
 * 折叠内容的"ctrl+o 展开"提示行（显示名、数量、限定词）。
 */
function CtrlOToExpandHint(props) {
  let $ = useMemoCache(19);
  let { displayName, qualifier, count, addMargin, fallbackLabel, body } = props;
  let messageCount = count === undefined ? 1 : count;
  let withMargin = addMargin === undefined ? true : addMargin;
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let safeName;
  if ($[0] !== displayName || $[1] !== fallbackLabel) {
    safeName = sanitizeTeammateLabel(displayName) || fallbackLabel;
    $[0] = displayName;
    $[1] = fallbackLabel;
    $[2] = safeName;
  } else safeName = $[2];
  let label = safeName;
  let preview;
  if ($[3] !== body) {
    preview = body ? firstLineOfPeerBody(body) : "";
    $[3] = body;
    $[4] = preview;
  } else preview = $[4];
  let firstLine = preview;
  const marginTop = withMargin ? 1 : 0;
  let caret;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    caret = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    $[5] = caret;
  } else caret = $[5];
  const nounText = messageCount === 1 ? "Message" : `${messageCount} messages`;
  const qualifierText = qualifier ? ` (${qualifier})` : "";
  let previewText;
  if ($[6] !== firstLine) {
    previewText = firstLine
      ? jsxProd_default_2(Text, {
          italic: true,
          children: [": ", firstLine],
        })
      : "";
    $[6] = firstLine;
    $[7] = previewText;
  } else previewText = $[7];
  let hint;
  if ($[8] !== chord) {
    hint = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: "expand",
      parens: true,
      format: LOWER_KEY_FORMAT,
    });
    $[8] = chord;
    $[9] = hint;
  } else hint = $[9];
  let children;
  if (
    $[10] !== label ||
    $[11] !== hint ||
    $[12] !== nounText ||
    $[13] !== qualifierText ||
    $[14] !== previewText
  ) {
    children = jsxProd_default_2(Text, {
      dimColor: true,
      children: [caret, nounText, " from @", label, qualifierText, previewText, " ", hint],
    });
    $[10] = label;
    $[11] = hint;
    $[12] = nounText;
    $[13] = qualifierText;
    $[14] = previewText;
    $[15] = children;
  } else children = $[15];
  let container;
  if ($[16] !== children || $[17] !== marginTop) {
    container = jsxProd_default(Box, {
      marginTop,
      children,
    });
    $[16] = children;
    $[17] = marginTop;
    $[18] = container;
  } else container = $[18];
  return container;
}
export { SubAgentProvider, CtrlOToExpand, OverflowHint, SubAgentContext, ctrlOToExpand, CtrlOToExpandHint };
