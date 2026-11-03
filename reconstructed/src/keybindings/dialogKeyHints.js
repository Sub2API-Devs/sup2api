/**
 * keybindings/dialogKeyHints.ts
 *
 * 2.1.316 新增：对话框按键提示与对话框作用域按键绑定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-thjvqmbc.js (17)
 * attribution: placement 17
 */
import {
  init_react_production,
  qt,
  Se,
  y,
  P,
  Q,
  R,
  ce,
  zt,
  l5o,
} from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { parseBindings, chordToString } from "./parser.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { pickDisplayChord } from "./resolver.js";
import { formatShortcutHint } from "../components/design-system/KeyboardShortcutHint.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { getFocusManager, isDescendantOf } from "../ink/focus.js";
import { BaseBox } from "../ink/components/Box.js";
import { jsonStringify } from "../utils/slowOperations.js";

//@ chunk-thjvqmbc.js:963-967 placement
init_react_production();
//@ chunk-thjvqmbc.js:967-971 placement
init_react_production();
//@ chunk-thjvqmbc.js:971-3093 placement
var DIALOG_ACTION_HINTS = {
  "confirm:yes": {
    description: "confirm",
  },
  "confirm:no": {
    description: "cancel",
  },
  "confirm:previous": {
    description: "navigate",
  },
  "confirm:next": {
    description: "navigate",
  },
  "confirm:nextField": {
    description: "next field",
  },
  "confirm:previousField": {
    description: "previous field",
  },
  "confirm:toggle": {
    description: "toggle",
  },
  "confirm:cycleMode": {
    description: "cycle mode",
  },
  ...{},
  "select:next": {
    description: "navigate",
  },
  "select:previous": {
    description: "navigate",
  },
  "select:pageUp": {
    description: "page up",
  },
  "select:pageDown": {
    description: "page down",
  },
  "select:first": {
    description: "first",
  },
  "select:last": {
    description: "last",
  },
  "select:accept": {
    description: "select",
  },
  "select:cancel": {
    description: "cancel",
  },
  "abovePrompt:toggle": {
    description: "hide/show plugin panel",
  },
  "abovePrompt:focus": {
    description: "focus plugin buttons, inputs and selects",
  },
  "abovePrompt:next": {
    description: "navigate",
  },
  "abovePrompt:previous": {
    description: "navigate",
  },
  "abovePrompt:press": {
    description: "press / submit / pick",
  },
  "abovePrompt:leave": {
    description: "back to prompt",
  },
  "abovePrompt:highlightNext": {
    description: "next option",
  },
  "abovePrompt:highlightPrevious": {
    description: "previous option",
  },
  "pane:scrollUp": {
    description: "scroll",
  },
  "pane:scrollDown": {
    description: "scroll",
  },
  "pane:pageUp": {
    description: "page up",
  },
  "pane:pageDown": {
    description: "page down",
  },
  "pane:top": {
    description: "top",
  },
  "pane:bottom": {
    description: "bottom",
  },
  "pane:grow": {
    description: "widen / heighten plugin pane",
  },
  "pane:shrink": {
    description: "narrow / shorten plugin pane",
  },
  "pane:close": {
    description: "close plugin pane",
  },
  "pane:next": {
    description: "show next plugin pane",
  },
  "pane:previous": {
    description: "show previous plugin pane",
  },
  "tabs:next": {
    description: "switch tab",
  },
  "tabs:previous": {
    description: "switch tab",
  },
  "app:toggleReplTab": {
    description: "switch tab",
  },
  "app:toggleDiffNoiseFilter": {
    description: "show/hide tests in diff panel",
  },
  "app:diffFileListUp": {
    description: "scroll diff panel file list",
  },
  "app:diffFileListDown": {
    description: "scroll diff panel file list",
  },
  "app:toggleDiffPreSession": {
    description: "show/hide pre-session changes in diff panel",
  },
  "app:cycleDiffBase": {
    description: "switch diff panel base",
  },
  ...{},
};
//@ chunk-thjvqmbc.js:3093-3180 placement
/**
 * 取对话框动作的提示
 */
function dialogActionHint(action) {
  if (action.startsWith("command:"))
    return {
      description: action.slice(8),
    };
  return DIALOG_ACTION_HINTS[action];
}
//@ chunk-thjvqmbc.js:3180-3184 placement
init_react_production();
//@ chunk-thjvqmbc.js:3184-3199 placement
/**
 * 对话框作用域上下文
 */
var DialogScopeContext = qt(null);
//@ chunk-thjvqmbc.js:3199-3313 placement
var MAX_DIALOG_HINTS = 4;
var PAIRED_HINT_ACTIONS = [
  ["select:previous", "select:next"],
  ["confirm:previous", "confirm:next"],
  ["tabs:next", "tabs:previous"],
];
//@ chunk-thjvqmbc.js:3313-4186 placement
/**
 * 对话框底部按键提示：按当前焦点与绑定生成“键 动作”列表，可限制数量与宽度。
 */
function DialogKeyHints({
  boundary,
  fallback = null,
  order,
  omit,
  max = MAX_DIALOG_HINTS,
  maxWidth,
  terse = false,
  format,
}) {
  let keybindingContext = useKeybindingContext();
  let { focusManager, rootNode } = Se(kp);
  let u = Se(DialogScopeContext);
  let [D, I] = y(0);
  P(() => {
    if (!keybindingContext || !focusManager) return;
    let C = () => I((v) => v + 1);
    let B = focusManager.subscribe(C);
    let T = keybindingContext.keyHandlerRegistry.scopesChanged.subscribe(C);
    C();
    return () => {
      B();
      T();
    };
  }, [keybindingContext, focusManager]);
  let A = Q(
    () =>
      collectKeyHints({
        ctx: keybindingContext,
        activeElement: focusManager?.activeElement ?? null,
        boundaryNode: boundary ? boundary.current : (rootNode ?? null),
        rendered: boundary ? u : null,
        order,
        omit,
        max,
        maxWidth,
        terse,
        format,
      }),
    [keybindingContext, focusManager, boundary, rootNode, u, order, omit, max, maxWidth, terse, format, D],
  );
  let L = R(null);
  P(() => {
    let C = A.fellBack ? "fell_back" : A.hadEntryWithoutDescription ? "no_description" : "ok";
    if (C === L.current) return;
    let B = L.current === null;
    L.current = C;
    if (B && C === "fell_back") return;
    if (C === "ok") logFeatureOk("keybinding_auto_hints");
    else logFeatureSad("keybinding_auto_hints", C);
  }, [A.fellBack, A.hadEntryWithoutDescription]);
  if (A.fellBack) return fallback;
  return jsxProd_default(Text, {
    dimColor: true,
    italic: true,
    children: A.text,
  });
}
//@ chunk-thjvqmbc.js:4186-6015 placement
function collectKeyHints({
  ctx,
  activeElement,
  boundaryNode,
  rendered,
  order,
  omit,
  max,
  maxWidth,
  terse,
  format,
}) {
  let H = {
    fellBack: true,
    text: "",
    hadEntryWithoutDescription: false,
  };
  if (!ctx) return H;
  let u = [];
  let D = false;
  let depth = 0;
  let A = boundaryNode === null ? undefined : (activeElement ?? undefined);
  while (A) {
    let isBoundary = A === boundaryNode;
    let d = ctx.keyHandlerRegistry.decls.get(A);
    if (d) collectScopeHintEntries(u, d, depth, isBoundary);
    if (isBoundary) {
      D = true;
      break;
    }
    A = A.parentNode;
    depth++;
  }
  if (!D) {
    if (!rendered) return H;
    let o = rendered.chain.length - 1;
    let chain = rendered.chain;
    for (let h of rendered.below[o]?.values() ?? [])
      if (h.claimFocus && h.chain.length > chain.length) chain = h.chain;
    u = [];
    for (let k = chain.length - 1; k >= o; k--) {
      let G = chain[k];
      if (G) collectScopeHintEntries(u, G, chain.length - 1 - k, k === o);
    }
  }
  if (!u.some((o) => !o.isBoundary)) return H;
  let L = new Set(omit ?? []);
  let bindings = parseBindings(DEFAULT_BINDINGS);
  let hadEntryWithoutDescription = false;
  let T = [];
  for (let o of u) {
    if (L.has(o.action) || !o.scope) continue;
    let d = pickDisplayChord(o.action, o.scope, ctx.bindings, bindings);
    if (!d) continue;
    let h = o.hint ?? dialogActionHint(o.action)?.description;
    if (!h) {
      hadEntryWithoutDescription = true;
      continue;
    }
    T.push({
      action: o.action,
      description: h,
      chord: chordToString(d),
      depth: o.depth,
    });
  }
  let v = new Map();
  (order ?? []).forEach((o, d) => v.set(o, d));
  let Y = new Set();
  let M = [];
  for (let o of T) {
    if (Y.has(o.description)) continue;
    Y.add(o.description);
    let flattened = PAIRED_HINT_ACTIONS.find((k) => k.some((X) => X === o.action))?.flatMap(
      (k) => T.find((X) => X.action === k && X.description === o.description) ?? [],
    );
    let G = flattened?.length === 2 ? flattened : [o];
    M.push({
      order: Math.min(...G.map((k) => v.get(k.action) ?? 1 / 0)),
      text: formatShortcutHint({
        chord: G.map((k) => k.chord),
        action: o.description,
        terse,
        format,
      }),
      depth: o.depth,
    });
  }
  M.sort((o, d) => {
    if (o.order !== d.order) return o.order - d.order;
    return o.depth - d.depth;
  });
  let U = " \xB7 ";
  let F = bunStringWidth(U);
  let c = 0;
  let m = [];
  for (;;) {
    m = [];
    let o = 0;
    for (let G of M) {
      if (m.length >= max) break;
      let k = (m.length === 0 ? 0 : F) + bunStringWidth(G.text);
      if (maxWidth !== undefined && o + k + c > maxWidth && m.length > 0) break;
      m.push(G.text);
      o += k;
    }
    let d = M.length - m.length;
    if (maxWidth === undefined || d === 0) break;
    let h = bunStringWidth(`${U}+${d} more`);
    if (h <= c) break;
    c = h;
  }
  if (m.length === 0) return H;
  let N = M.length - m.length;
  return {
    fellBack: false,
    text: N > 0 ? `${m.join(U)}${U}+${N} more` : m.join(U),
    hadEntryWithoutDescription,
  };
}
//@ chunk-thjvqmbc.js:6015-6171 placement
function collectScopeHintEntries(i, { scope, entriesRef }, depth, isBoundary) {
  for (let b of entriesRef.current) {
    if (!b.action) continue;
    i.push({
      action: b.action,
      hint: b.hint,
      scope,
      depth,
      isBoundary,
    });
  }
}
//@ chunk-thjvqmbc.js:6171-6175 placement
init_react_production();
//@ chunk-thjvqmbc.js:6175-7625 placement
/**
 * 注册对话框作用域的按键绑定，可抢占、吞掉其他按键或获取焦点。
 */
function useDialogKeybindings({
  scope,
  bindings,
  active = true,
  preemptive = false,
  swallowAll = false,
  claimFocus = false,
  ref,
  flexGrow = 0,
  flexDirection,
  flexShrink,
  children,
}) {
  let u = R(null);
  let keybindingContext = useKeybindingContext();
  let I = R([]);
  I.current = active ? bindings : [];
  let onAction = ce((c) => runMatchingKeyEntry(c, I.current), []);
  let L = dialogHintsKey(scope, active, preemptive, swallowAll, I.current);
  let C = active && preemptive && Boolean(scope);
  let B = C && swallowAll;
  zt(() => {
    if (!keybindingContext) return;
    let c = u.current;
    if (!c) return;
    let {
      decls,
      scopesChanged,
      preemptiveScopes,
      swallowAll: swallowAll_2,
    } = keybindingContext.keyHandlerRegistry;
    let d = {
      scope,
      active,
      preemptive,
      swallowAll,
      entriesRef: I,
    };
    decls.set(c, d);
    if (C && scope) {
      addRefCount(preemptiveScopes, scope);
      if (B) addRefCount(swallowAll_2, scope);
    }
    scopesChanged.emit();
    return () => {
      decls.delete(c);
      if (C && scope) {
        releaseRefCount(preemptiveScopes, scope);
        if (B) releaseRefCount(swallowAll_2, scope);
      }
      scopesChanged.emit();
    };
  }, [keybindingContext, scope, C, B, L]);
  let T = Se(DialogScopeContext);
  let v = l5o();
  let [Y] = y(() => new Map());
  let M = Q(
    () => ({
      chain: [
        ...(T?.chain ?? []),
        {
          scope,
          entriesRef: I,
        },
      ],
      below: [...(T?.below ?? []), Y],
    }),
    [T, scope, Y],
  );
  for (let c of T?.below ?? [])
    c.set(v, {
      chain: M.chain,
      claimFocus,
    });
  P(() => {
    let below = T?.below ?? [];
    for (let m of below)
      m.set(v, {
        chain: M.chain,
        claimFocus,
      });
    return () => {
      for (let m of below) m.delete(v);
    };
  }, [T, v, M, claimFocus]);
  zt(() => {
    if (!claimFocus) return;
    let c = u.current;
    if (!c) return;
    let focusManager = getFocusManager(c);
    let N = false;
    let W = () => {
      if (N) return;
      let o = u.current;
      if (!o) return;
      let activeElement = focusManager.activeElement;
      if (activeElement && isDescendantOf(activeElement, o)) return;
      N = true;
      try {
        focusManager.focus(o);
      } finally {
        N = false;
      }
    };
    focusManager.pushAutoFocusFallback(c);
    W();
    return focusManager.subscribe(W);
  }, [claimFocus]);
  let U = R(false);
  zt(() => {
    return;
  }, [scope, claimFocus, keybindingContext]);
  let ref_2 = ce(
    (c) => {
      u.current = c;
      if (typeof ref === "function") ref(c);
      else if (ref) ref.current = c;
    },
    [ref],
  );
  return jsxProd_default(BaseBox, {
    ref: ref_2,
    keybindingScope: scope,
    onAction,
    tabIndex: claimFocus ? -1 : undefined,
    flexGrow,
    flexDirection,
    flexShrink,
    children: jsxProd_default(DialogScopeContext, {
      value: M,
      children,
    }),
  });
}
//@ chunk-thjvqmbc.js:7625-7781 placement
function runMatchingKeyEntry(i, l) {
  for (let a of l) {
    if (a.action !== i.action) continue;
    if (a.chordOnly && !i.isChordCompletion) continue;
    if (a.run() === false) continue;
    i.consume();
    return;
  }
}
//@ chunk-thjvqmbc.js:7781-7823 placement
/**
 * 计数 +1
 */
function addRefCount(i, scope) {
  i.set(scope, (i.get(scope) ?? 0) + 1);
}
//@ chunk-thjvqmbc.js:7823-7898 placement
/**
 * 计数 −1，归零时删除
 */
function releaseRefCount(i, scope) {
  let a = (i.get(scope) ?? 0) - 1;
  if (a <= 0) i.delete(scope);
  else i.set(scope, a);
}
//@ chunk-thjvqmbc.js:7898-8004 placement
function dialogHintsKey(scope, active, preemptive, swallowAll, x) {
  return jsonStringify([
    scope ?? "",
    active,
    preemptive,
    swallowAll,
    x.map((b) => [b.action ?? "", b.hint ?? "", Boolean(b.chordOnly)]),
  ]);
}
//@ chunk-thjvqmbc.js:8004-8008 placement
init_react_production();
export { useDialogKeybindings, DialogKeyHints };
