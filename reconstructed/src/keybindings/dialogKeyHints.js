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
import { j, qt, Se, y, P, Q, R, ce, zt, l5o } from "../../vendor/react/cjs/react.production.js";
import { useKeybindingContext } from "./KeybindingContext.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
j();
//@ chunk-thjvqmbc.js:967-971 placement
j();
//@ chunk-thjvqmbc.js:971-3093 placement
var DIALOG_ACTION_HINTS = {
  "confirm:yes": { description: "confirm" },
  "confirm:no": { description: "cancel" },
  "confirm:previous": { description: "navigate" },
  "confirm:next": { description: "navigate" },
  "confirm:nextField": { description: "next field" },
  "confirm:previousField": { description: "previous field" },
  "confirm:toggle": { description: "toggle" },
  "confirm:cycleMode": { description: "cycle mode" },
  ...{},
  "select:next": { description: "navigate" },
  "select:previous": { description: "navigate" },
  "select:pageUp": { description: "page up" },
  "select:pageDown": { description: "page down" },
  "select:first": { description: "first" },
  "select:last": { description: "last" },
  "select:accept": { description: "select" },
  "select:cancel": { description: "cancel" },
  "abovePrompt:toggle": { description: "hide/show plugin panel" },
  "abovePrompt:focus": { description: "focus plugin buttons, inputs and selects" },
  "abovePrompt:next": { description: "navigate" },
  "abovePrompt:previous": { description: "navigate" },
  "abovePrompt:press": { description: "press / submit / pick" },
  "abovePrompt:leave": { description: "back to prompt" },
  "abovePrompt:highlightNext": { description: "next option" },
  "abovePrompt:highlightPrevious": { description: "previous option" },
  "pane:scrollUp": { description: "scroll" },
  "pane:scrollDown": { description: "scroll" },
  "pane:pageUp": { description: "page up" },
  "pane:pageDown": { description: "page down" },
  "pane:top": { description: "top" },
  "pane:bottom": { description: "bottom" },
  "pane:grow": { description: "widen / heighten plugin pane" },
  "pane:shrink": { description: "narrow / shorten plugin pane" },
  "pane:close": { description: "close plugin pane" },
  "pane:next": { description: "show next plugin pane" },
  "pane:previous": { description: "show previous plugin pane" },
  "tabs:next": { description: "switch tab" },
  "tabs:previous": { description: "switch tab" },
  "app:toggleReplTab": { description: "switch tab" },
  "app:toggleDiffNoiseFilter": { description: "show/hide tests in diff panel" },
  "app:diffFileListUp": { description: "scroll diff panel file list" },
  "app:diffFileListDown": { description: "scroll diff panel file list" },
  "app:toggleDiffPreSession": { description: "show/hide pre-session changes in diff panel" },
  "app:cycleDiffBase": { description: "switch diff panel base" },
  ...{},
};
//@ chunk-thjvqmbc.js:3093-3180 placement
function Oe(i) {
  if (i.startsWith("command:")) return { description: i.slice(8) };
  return DIALOG_ACTION_HINTS[i];
}
//@ chunk-thjvqmbc.js:3180-3184 placement
j();
//@ chunk-thjvqmbc.js:3184-3199 placement
var J = qt(null);
//@ chunk-thjvqmbc.js:3199-3313 placement
var MAX_DIALOG_HINTS = 4,
  PAIRED_HINT_ACTIONS = [
    ["select:previous", "select:next"],
    ["confirm:previous", "confirm:next"],
    ["tabs:next", "tabs:previous"],
  ];
/**
 * 对话框底部按键提示：按当前焦点与绑定生成“键 动作”列表，可限制数量与宽度。
 */
//@ chunk-thjvqmbc.js:3313-4186 placement
function DialogKeyHints({
  boundary: boundary,
  fallback: fallback = null,
  order: order,
  omit: omit,
  max: max = MAX_DIALOG_HINTS,
  maxWidth: maxWidth,
  terse: terse = !1,
  format: format,
}) {
  let K = useKeybindingContext(),
    { focusManager: focusManager, rootNode: rootNode } = Se(kp),
    u = Se(J),
    [D, I] = y(0);
  P(() => {
    if (!K || !focusManager) return;
    let C = () => I((v) => v + 1),
      subscribe = focusManager.subscribe(C),
      subscribe_2 = K.keyHandlerRegistry.scopesChanged.subscribe(C);
    return (
      C(),
      () => {
        (subscribe(), subscribe_2());
      }
    );
  }, [K, focusManager]);
  let A = Q(
      () =>
        collectKeyHints({
          ctx: K,
          activeElement: focusManager?.activeElement ?? null,
          boundaryNode: boundary ? boundary.current : (rootNode ?? null),
          rendered: boundary ? u : null,
          order: order,
          omit: omit,
          max: max,
          maxWidth: maxWidth,
          terse: terse,
          format: format,
        }),
      [K, focusManager, boundary, rootNode, u, order, omit, max, maxWidth, terse, format, D],
    ),
    L = R(null);
  if (
    (P(() => {
      let C = A.fellBack ? "fell_back" : A.hadEntryWithoutDescription ? "no_description" : "ok";
      if (C === L.current) return;
      let B = L.current === null;
      if (((L.current = C), B && C === "fell_back")) return;
      if (C === "ok") logFeatureOk("keybinding_auto_hints");
      else logFeatureSad("keybinding_auto_hints", C);
    }, [A.fellBack, A.hadEntryWithoutDescription]),
    A.fellBack)
  )
    return fallback;
  return e(Text, { dimColor: !0, italic: !0, children: A.text });
}
//@ chunk-thjvqmbc.js:4186-6015 placement
function collectKeyHints({
  ctx: ctx,
  activeElement: activeElement,
  boundaryNode: boundaryNode,
  rendered: rendered,
  order: order,
  omit: omit,
  max: max,
  maxWidth: maxWidth,
  terse: terse,
  format: format,
}) {
  let H = { fellBack: !0, text: "", hadEntryWithoutDescription: !1 };
  if (!ctx) return H;
  let u = [],
    D = !1,
    I = 0,
    A = boundaryNode === null ? void 0 : (activeElement ?? void 0);
  while (A) {
    let o = A === boundaryNode,
      d = ctx.keyHandlerRegistry.decls.get(A);
    if (d) collectScopeHintEntries(u, d, I, o);
    if (o) {
      D = !0;
      break;
    }
    ((A = A.parentNode), I++);
  }
  if (!D) {
    if (!rendered) return H;
    let o = rendered.chain.length - 1,
      chain = rendered.chain;
    for (let h of rendered.below[o]?.values() ?? [])
      if (h.claimFocus && h.chain.length > chain.length) chain = h.chain;
    u = [];
    for (let h = chain.length - 1; h >= o; h--) {
      let G = chain[h];
      if (G) collectScopeHintEntries(u, G, chain.length - 1 - h, h === o);
    }
  }
  if (!u.some((o) => !o.isBoundary)) return H;
  let L = new Set(omit ?? []),
    C = parseBindings(DEFAULT_BINDINGS),
    B = !1,
    T = [];
  for (let o of u) {
    if (L.has(o.action) || !o.scope) continue;
    let d = pickDisplayChord(o.action, o.scope, ctx.bindings, C);
    if (!d) continue;
    let h = o.hint ?? Oe(o.action)?.description;
    if (!h) {
      B = !0;
      continue;
    }
    T.push({ action: o.action, description: h, chord: chordToString(d), depth: o.depth });
  }
  let v = new Map();
  (order ?? []).forEach((o, d) => v.set(o, d));
  let Y = new Set(),
    M = [];
  for (let o of T) {
    if (Y.has(o.description)) continue;
    Y.add(o.description);
    let h = PAIRED_HINT_ACTIONS.find((k) => k.some((X) => X === o.action))?.flatMap(
        (k) => T.find((X) => X.action === k && X.description === o.description) ?? [],
      ),
      G = h?.length === 2 ? h : [o];
    M.push({
      order: Math.min(...G.map((k) => v.get(k.action) ?? 1 / 0)),
      text: formatShortcutHint({
        chord: G.map((k) => k.chord),
        action: o.description,
        terse: terse,
        format: format,
      }),
      depth: o.depth,
    });
  }
  M.sort((o, d) => {
    if (o.order !== d.order) return o.order - d.order;
    return o.depth - d.depth;
  });
  let U = " \xB7 ",
    F = bunStringWidth(U),
    c = 0,
    m = [];
  for (;;) {
    m = [];
    let o = 0;
    for (let G of M) {
      if (m.length >= max) break;
      let k = (m.length === 0 ? 0 : F) + bunStringWidth(G.text);
      if (maxWidth !== void 0 && o + k + c > maxWidth && m.length > 0) break;
      (m.push(G.text), (o += k));
    }
    let d = M.length - m.length;
    if (maxWidth === void 0 || d === 0) break;
    let h = bunStringWidth(`${U}+${d} more`);
    if (h <= c) break;
    c = h;
  }
  if (m.length === 0) return H;
  let N = M.length - m.length;
  return {
    fellBack: !1,
    text: N > 0 ? `${m.join(U)}${U}+${N} more` : m.join(U),
    hadEntryWithoutDescription: B,
  };
}
//@ chunk-thjvqmbc.js:6015-6171 placement
function collectScopeHintEntries(i, { scope: scope, entriesRef: entriesRef }, p, x) {
  for (let b of entriesRef.current) {
    if (!b.action) continue;
    i.push({ action: b.action, hint: b.hint, scope: scope, depth: p, isBoundary: x });
  }
}
//@ chunk-thjvqmbc.js:6171-6175 placement
j();
/**
 * 注册对话框作用域的按键绑定，可抢占、吞掉其他按键或获取焦点。
 */
//@ chunk-thjvqmbc.js:6175-7625 placement
function useDialogKeybindings({
  scope: scope,
  bindings: bindings,
  active: active = !0,
  preemptive: preemptive = !1,
  swallowAll: swallowAll = !1,
  claimFocus: claimFocus = !1,
  ref: ref,
  flexGrow: flexGrow = 0,
  flexDirection: flexDirection,
  flexShrink: flexShrink,
  children: children,
}) {
  let u = R(null),
    D = useKeybindingContext(),
    I = R([]);
  I.current = active ? bindings : [];
  let A = ce((c) => runMatchingKeyEntry(c, I.current), []),
    L = dialogHintsKey(scope, active, preemptive, swallowAll, I.current),
    C = active && preemptive && Boolean(scope),
    B = C && swallowAll;
  zt(() => {
    if (!D) return;
    let c = u.current;
    if (!c) return;
    let {
        decls: decls,
        scopesChanged: scopesChanged,
        preemptiveScopes: preemptiveScopes,
        swallowAll: swallowAll_2,
      } = D.keyHandlerRegistry,
      d = { scope: scope, active: active, preemptive: preemptive, swallowAll: swallowAll, entriesRef: I };
    if ((decls.set(c, d), C && scope)) {
      if ((Te(preemptiveScopes, scope), B)) Te(swallowAll_2, scope);
    }
    return (
      scopesChanged.emit(),
      () => {
        if ((decls.delete(c), C && scope)) {
          if ((Pe(preemptiveScopes, scope), B)) Pe(swallowAll_2, scope);
        }
        scopesChanged.emit();
      }
    );
  }, [D, scope, C, B, L]);
  let T = Se(J),
    v = l5o(),
    [Y] = y(() => new Map()),
    M = Q(
      () => ({
        chain: [...(T?.chain ?? []), { scope: scope, entriesRef: I }],
        below: [...(T?.below ?? []), Y],
      }),
      [T, scope, Y],
    );
  for (let c of T?.below ?? []) c.set(v, { chain: M.chain, claimFocus: claimFocus });
  (P(() => {
    let c = T?.below ?? [];
    for (let m of c) m.set(v, { chain: M.chain, claimFocus: claimFocus });
    return () => {
      for (let m of c) m.delete(v);
    };
  }, [T, v, M, claimFocus]),
    zt(() => {
      if (!claimFocus) return;
      let c = u.current;
      if (!c) return;
      let m = getFocusManager(c),
        N = !1,
        W = () => {
          if (N) return;
          let o = u.current;
          if (!o) return;
          let activeElement = m.activeElement;
          if (activeElement && isDescendantOf(activeElement, o)) return;
          N = !0;
          try {
            m.focus(o);
          } finally {
            N = !1;
          }
        };
      return (m.pushAutoFocusFallback(c), W(), m.subscribe(W));
    }, [claimFocus]));
  let U = R(!1);
  zt(() => {
    return;
  }, [scope, claimFocus, D]);
  let F = ce(
    (c) => {
      if (((u.current = c), typeof ref === "function")) ref(c);
      else if (ref) ref.current = c;
    },
    [ref],
  );
  return e(BaseBox, {
    ref: F,
    keybindingScope: scope,
    onAction: A,
    tabIndex: claimFocus ? -1 : void 0,
    flexGrow: flexGrow,
    flexDirection: flexDirection,
    flexShrink: flexShrink,
    children: e(J, { value: M, children: children }),
  });
}
//@ chunk-thjvqmbc.js:7625-7781 placement
function runMatchingKeyEntry(i, l) {
  for (let a of l) {
    if (a.action !== i.action) continue;
    if (a.chordOnly && !i.isChordCompletion) continue;
    if (a.run() === !1) continue;
    i.consume();
    return;
  }
}
//@ chunk-thjvqmbc.js:7781-7823 placement
function Te(i, l) {
  i.set(l, (i.get(l) ?? 0) + 1);
}
//@ chunk-thjvqmbc.js:7823-7898 placement
function Pe(i, l) {
  let a = (i.get(l) ?? 0) - 1;
  if (a <= 0) i.delete(l);
  else i.set(l, a);
}
//@ chunk-thjvqmbc.js:7898-8004 placement
function dialogHintsKey(i, l, a, p, x) {
  return jsonStringify([
    i ?? "",
    l,
    a,
    p,
    x.map((b) => [b.action ?? "", b.hint ?? "", Boolean(b.chordOnly)]),
  ]);
}
//@ chunk-thjvqmbc.js:8004-8008 placement
j();

export { useDialogKeybindings, DialogKeyHints };
