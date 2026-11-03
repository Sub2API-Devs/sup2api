/**
 * keybindings/KeybindingProviderSetup.tsx
 *
 * 并入已有模块：快捷键 Provider。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/KeybindingProviderSetup.tsx
 * pieces: chunk-xe7zq1p4.js (15)
 * attribution: placement 8, fingerprint 2, layout 4, affinity 1
 */
import { j, y, R, ce, P, zt } from "../../vendor/react/cjs/react.production.js";
import { TerminalEvent } from "../ink/events/terminal-event.js";
import { ge } from "../utils/identity.js";
import { createStore } from "../state/store.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext, KeybindingProvider } from "./KeybindingContext.js";
import { e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { loadKeybindingsSync, keybindingsState, initializeKeybindingWatcher } from "./loadUserBindings.js";
import { logForDebugging } from "../utils/debug.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useNotifications } from "../context/notifications.js";
import { createKeybindingRegistryState, toInkKey } from "./keyNames.js";
import { chordToDisplayString, parseKeystroke } from "./parser.js";
import { getShortcutDisplayPlatform } from "../utils/keyboardShortcuts.js";
import { NON_REBINDABLE } from "./reservedShortcuts.js";
import { keyEventToKeystroke } from "./match.js";
import {
  keystrokesEqual,
  resolveKeyWithChordState,
  logKeybindingFired,
  resolveKeyInScopeChain,
} from "./resolver.js";
import { logError } from "../utils/log.js";
import {
  getKeybindingScopes,
  ue,
  dispatchKeybindingEvent,
  hasWheelHandlerBetween,
} from "../ink/inputSelectionBridge.js";
import { isDescendantOf, getRootNode, getFocusManager } from "../ink/focus.js";
import { BaseBox } from "../ink/components/Box.js";

//@ chunk-xe7zq1p4.js:3563-3567 placement
j();
/**
 * 快捷键动作事件：冒泡、可取消，带动作名、原始按键事件、是否和弦完成与来源；consume 同时阻止原始事件。
 */
//@ chunk-xe7zq1p4.js:3567-3990 placement
class KeybindingActionEvent extends TerminalEvent {
  action;
  sourceEvent;
  isChordCompletion;
  origin;
  constructor(n, r) {
    super("action", { bubbles: !0, cancelable: !0 });
    ((this.action = n),
      (this.sourceEvent = r?.sourceEvent ?? null),
      (this.isChordCompletion = r?.isChordCompletion ?? !1),
      (this.origin = r?.origin ?? "single"));
  }
  consume() {
    (this.stopPropagation(),
      this.sourceEvent?.preventDefault(),
      this.sourceEvent?.stopImmediatePropagation());
  }
  get consumed() {
    return this._isPropagationStopped();
  }
}
//@ chunk-xe7zq1p4.js:3990-4063 placement
var m0t = ge(createStore({ counts: new Map() }), (n) => n.setState(() => ({ counts: new Map() })));
//@ chunk-xe7zq1p4.js:4063-4166 placement
function incrementContextCount(n) {
  m0t.setState((r) => {
    let i = new Map(r.counts);
    return (i.set(n, (i.get(n) ?? 0) + 1), { counts: i });
  });
}
//@ chunk-xe7zq1p4.js:4166-4326 placement
function decrementContextCount(n) {
  m0t.setState((r) => {
    let i = r.counts.get(n);
    if (i === void 0) return r;
    let o = new Map(r.counts);
    if (i <= 1) o.delete(n);
    else o.set(n, i - 1);
    return { counts: o };
  });
}
//@ chunk-xe7zq1p4.js:4326-4367 placement
function sUn(n, r) {
  return n.counts.has(r);
}
//@ chunk-xe7zq1p4.js:4367-4379 placement
var Je = 3000;
/**
 * 已在快捷键上下文中时直接渲染子元素，否则包一层快捷键初始化组件。
 */
//@ chunk-xe7zq1p4.js:4379-4577 placement
function KeybindingRoot(n) {
  let o = w(4),
    { children: children } = n;
  if (useKeybindingContext()) {
    let a;
    if (o[0] !== children) ((a = e(Fragment, { children: children })), (o[0] = children), (o[1] = a));
    else a = o[1];
    return a;
  }
  let a;
  if (o[2] !== children) ((a = e(KeybindingSetup, { children: children })), (o[2] = children), (o[3] = a));
  else a = o[3];
  return a;
}
/**
 * 快捷键系统根组件：首次渲染同步加载绑定，挂载后启动文件监视并订阅热重载；维护待定和弦（超时 Je 毫秒自动取消并弹出 "… cancelled" 通知）、活动上下文集合、动作处理器注册表、预分发处理器、单键事件引用；向下提供 KeybindingProvider，外面包一层 ChordInterceptor。
 */
//@ chunk-xe7zq1p4.js:4577-5904 fingerprint = KeybindingSetup (0.742)
function KeybindingSetup({ children: children }) {
  let [{ bindings: bindings }, setLoadResult] = y(() => {
      let x = loadKeybindingsSync(keybindingsState);
      return (
        logForDebugging(
          `[keybindings] KeybindingSetup initialized with ${x.bindings.length} bindings, ${x.warnings.length} warnings`,
        ),
        x
      );
    }),
    timers = useClock(),
    { addNotification: addNotification } = useNotifications(),
    pendingChordRef = R(null),
    [pendingChord, setPendingChordState] = y(null),
    chordTimeoutRef = R(null),
    handlerRegistryRef = R(new Map()),
    activeContextsRef = R(new Set()),
    preDispatchRef = R(new Set()),
    singleKeyEventRef = R(null),
    [keyHandlerRegistry] = y(createKeybindingRegistryState),
    registerActiveContext = ce((context) => {
      (activeContextsRef.current.add(context), incrementContextCount(context));
    }, []),
    unregisterActiveContext = ce((context_0) => {
      (activeContextsRef.current.delete(context_0), decrementContextCount(context_0));
    }, []),
    clearChordTimeout = ce(() => {
      (chordTimeoutRef.current?.(), (chordTimeoutRef.current = null));
    }, []),
    setPendingChord = ce(
      (pending) => {
        if ((clearChordTimeout(), pending !== null))
          chordTimeoutRef.current = timers.setTimeout(() => {
            (logForDebugging("[keybindings] Chord timeout - cancelling"),
              (pendingChordRef.current = null),
              setPendingChordState(null),
              addNotification({
                key: "chord-timeout",
                kind: "feedback",
                text: `${chordToDisplayString(pending, getShortcutDisplayPlatform())} cancelled \u2014 no next key within ${Je / 1000}s`,
                priority: "immediate",
                timeoutMs: 3000,
              }));
          }, Je);
        ((pendingChordRef.current = pending), setPendingChordState(pending));
      },
      [addNotification, clearChordTimeout, timers],
    );
  return (
    P(() => {
      initializeKeybindingWatcher(keybindingsState);
      let subscribe = keybindingsState.changed.subscribe((result_0) => {
        (setLoadResult(result_0),
          logForDebugging(
            `[keybindings] Reloaded: ${result_0.bindings.length} bindings, ${result_0.warnings.length} warnings`,
          ));
      });
      return () => {
        (subscribe(), clearChordTimeout());
      };
    }, [clearChordTimeout]),
    e(KeybindingProvider, {
      bindings: bindings,
      pendingChordRef: pendingChordRef,
      pendingChord: pendingChord,
      setPendingChord: setPendingChord,
      activeContexts: activeContextsRef.current,
      registerActiveContext: registerActiveContext,
      unregisterActiveContext: unregisterActiveContext,
      handlerRegistryRef: handlerRegistryRef,
      preDispatchRef: preDispatchRef,
      singleKeyEventRef: singleKeyEventRef,
      keyHandlerRegistry: keyHandlerRegistry,
      children: e(ChordInterceptor, {
        bindings: bindings,
        pendingChordRef: pendingChordRef,
        setPendingChord: setPendingChord,
        activeContexts: activeContextsRef.current,
        handlerRegistryRef: handlerRegistryRef,
        preDispatchRef: preDispatchRef,
        singleKeyEventRef: singleKeyEventRef,
        keyHandlerRegistry: keyHandlerRegistry,
        children: children,
      }),
    })
  );
}
/**
 * 处理器排序：非回退处理器在前；同动作已有非回退处理器时丢弃回退处理器。
 */
//@ chunk-xe7zq1p4.js:5904-6074 layout
function orderNonFallbackFirst(n) {
  let r = [...n],
    i = new Set(r.filter((o) => !o.fallback).map((o) => o.action));
  return [...r.filter((o) => !o.fallback), ...r.filter((o) => o.fallback && !i.has(o.action))];
}
//@ chunk-xe7zq1p4.js:6074-6125 layout
function isUnmodifiedKey(n) {
  return !n.ctrl && !n.meta && !n.superKey;
}
//@ chunk-xe7zq1p4.js:6125-6157 layout
var RESERVED_KEYSTROKES = NON_REBINDABLE.map((n) => parseKeystroke(n.key));
//@ chunk-xe7zq1p4.js:6157-6225 layout
function isReservedKeyEvent(n) {
  let r = keyEventToKeystroke(n);
  return r !== null && RESERVED_KEYSTROKES.some((i) => keystrokesEqual(i, r));
}
/**
 * 根 Box（keybindingScope=Global、tabIndex=-1，始终在焦点链上）的捕获阶段键盘/滚轮处理器，统一做快捷键分发。两种模式：legacy——在「有处理器的上下文 + 活动上下文 + Global」里 resolveKeyWithChordState，处理和弦开始/取消/解绑/匹配，匹配后按注册表调用单键处理器（回退处理器在保留键或无修饰键时跳过）；scopeChain——按焦点节点到根的 keybindingScope 链（以及抢先作用域 preemptiveScopes）解析，匹配后先把动作作为事件派给 DOM 节点（onAction），未处理再落回注册表；文本输入框获得焦点时无修饰单字符直接交给预分发。消费的事件 preventDefault + stopImmediatePropagation。滚轮事件转成 wheelup/wheeldown 按键参与同一套解析。
 */
//@ chunk-xe7zq1p4.js:6225-10406 fingerprint = ChordInterceptor (0.407)
function ChordInterceptor({
  bindings: bindings,
  pendingChordRef: pendingChordRef,
  setPendingChord: setPendingChord,
  activeContexts: activeContexts,
  handlerRegistryRef: handlerRegistryRef,
  preDispatchRef: preDispatchRef,
  singleKeyEventRef: singleKeyEventRef,
  keyHandlerRegistry: keyHandlerRegistry,
  children: children,
}) {
  let scopeChainContexts = R([]),
    chordStartTarget = R(null),
    chordMode = R("legacy"),
    runPreDispatch = ce(
      (s, d, f, C) => {
        for (let g of preDispatchRef.current)
          try {
            if (g.handler(s, d, f) === !0) return (C(), !0);
          } catch (error) {
            logError(error);
          }
        return !1;
      },
      [preDispatchRef],
    ),
    dispatchChordAction = (s, d, f, C) => {
      let g = handlerRegistryRef.current;
      if (!g) return !1;
      let flattened = [...g.values()].flatMap((v) => [...v]),
        A = [
          ...new Set(flattened.filter((v) => !v.fallback).map((v) => v.context)),
          ...activeContexts,
          "Global",
        ],
        m = resolveKeyWithChordState(s, A, bindings, d),
        H =
          m.type === "match" && flattened.some((v) => !v.fallback && v.action === m.action) ? m.action : null,
        V = H === null ? [f] : [H, f],
        k = isReservedKeyEvent(s);
      for (let v of V) {
        let [O] = orderNonFallbackFirst(g.get(v) ?? []).filter((E) => !(E.fallback && k));
        if (O) return (O.handler(), logKeybindingFired(v), C(), !0);
      }
      return !1;
    },
    dispatchLegacy = (s, d, f, C, g, h = !1) => {
      let registry = handlerRegistryRef.current,
        m = isReservedKeyEvent(s),
        handlerContexts = new Set();
      if (registry) {
        for (let handlers of registry.values())
          for (let registration of handlers)
            if (!(m && registration.fallback)) handlerContexts.add(registration.context);
      }
      let contexts = [...handlerContexts, ...activeContexts, "Global"],
        k = pendingChordRef.current,
        wasInChord = k !== null,
        O = resolveKeyWithChordState(s, contexts, bindings, k);
      switch (O.type) {
        case "chord_started":
          ((chordMode.current = "legacy"), setPendingChord(O.pending), g());
          return;
        case "chord_cancelled":
          (setPendingChord(null), g());
          return;
        case "unbound":
          if ((setPendingChord(null), wasInChord)) {
            g();
            return;
          }
          break;
        case "match":
          if ((setPendingChord(null), wasInChord)) {
            dispatchChordAction(s, k, O.action, g);
            return;
          }
          break;
        case "none":
          break;
      }
      if (!registry) return;
      if (!h && runPreDispatch(d, f, C, g)) return;
      let E = new Map(),
        q = orderNonFallbackFirst([...registry.values()].flatMap((D) => [...D])),
        K = isUnmodifiedKey(s) || m,
        ne;
      for (let registration_0 of q) {
        if (!registration_0.singleKey || (registration_0.fallback && K)) continue;
        let L;
        if (registration_0.fallback && !activeContexts.has(registration_0.context))
          ((ne ??= (() => {
            let z = resolveKeyWithChordState(s, [...activeContexts, "Global"], bindings, null);
            return z.type === "match" ? z.action : null;
          })()),
            (L = ne));
        else L = E.get(registration_0.context);
        if (L === void 0) {
          let z = resolveKeyWithChordState(
            s,
            [...activeContexts, registration_0.context, "Global"],
            bindings,
            null,
          );
          ((L = z.type === "match" ? z.action : null), E.set(registration_0.context, L));
        }
        if (L === registration_0.action) {
          let z = singleKeyEventRef.current;
          singleKeyEventRef.current = s;
          let re;
          try {
            re = registration_0.handler();
          } finally {
            singleKeyEventRef.current = z;
          }
          if (re !== !1) {
            (logKeybindingFired(L), g());
            return;
          }
        }
      }
    },
    dispatchKey = (s, d, f, C, g, h) => {
      let handleInput = keyHandlerRegistry,
        m = (O, E) => {};
      if (handleInput.swallowAll.size > 0) {
        (m(null, !0), h());
        return;
      }
      if (pendingChordRef.current !== null && chordMode.current === "legacy") {
        (m(null, !1), dispatchLegacy(d, f, C, g, h));
        return;
      }
      let H = getKeybindingScopes(s.target),
        V = pendingChordRef.current !== null && chordMode.current === "scopeChain";
      if (H.length === 0 && handleInput.preemptiveScopes.size === 0 && !V) {
        (m(null, !1), dispatchLegacy(d, f, C, g, h));
        return;
      }
      let k = ue(s.target);
      if (handleInput.preemptiveScopes.size > 0 && !V) {
        let O = [...handleInput.preemptiveScopes.keys(), "Global"],
          E = resolveKeyInScopeChain(d, O, bindings, null);
        if (E.type === "match" && k) {
          if (dispatchKeybindingEvent(k, s, E.action, !1, s.type === "wheel" ? "wheel" : "single")) {
            (m(E.action, !0), logKeybindingFired(E.action));
            return;
          }
        }
      }
      if (!V && k?.attributes.textEntry === !0 && isUnmodifiedKey(d) && [...d.key].length === 1) {
        m(null, runPreDispatch(f, C, g, h));
        return;
      }
      if (V) {
        let O = pendingChordRef.current,
          E = resolveKeyInScopeChain(d, scopeChainContexts.current, bindings, O);
        if (E.type === "chord_started") {
          ((chordMode.current = "scopeChain"), setPendingChord(E.pending), h(), m(null, !0));
          return;
        }
        if (E.type === "match") {
          setPendingChord(null);
          let q = chordStartTarget.current;
          ((chordStartTarget.current = null), (scopeChainContexts.current = []));
          let K = q && k && isDescendantOf(q, getRootNode(k)) ? q : k;
          if (K) {
            if (dispatchKeybindingEvent(K, s, E.action, !0, "chord")) {
              (m(E.action, !0), logKeybindingFired(E.action));
              return;
            }
          }
          let ne = dispatchChordAction(d, O, E.action, h);
          m(E.action, ne);
          return;
        }
        ((chordStartTarget.current = null),
          (scopeChainContexts.current = []),
          m(null, !1),
          dispatchLegacy(d, f, C, g, h));
        return;
      }
      let v = resolveKeyInScopeChain(d, H, bindings, null);
      switch (v.type) {
        case "chord_started":
          ((scopeChainContexts.current = H),
            (chordStartTarget.current = k ?? null),
            (chordMode.current = "scopeChain"),
            setPendingChord(v.pending),
            h(),
            m(null, !0));
          return;
        case "match": {
          if (!k) {
            (m(v.action, !1), dispatchLegacy(d, f, C, g, h));
            return;
          }
          if (runPreDispatch(f, C, g, h)) {
            (setPendingChord(null), m(v.action, !0));
            return;
          }
          if (dispatchKeybindingEvent(k, s, v.action, !1, s.type === "wheel" ? "wheel" : "single")) {
            (setPendingChord(null), m(v.action, !0), logKeybindingFired(v.action));
            return;
          }
          (m(v.action, !1), dispatchLegacy(d, f, C, g, h, !0));
          return;
        }
        case "unbound":
          if (runPreDispatch(f, C, g, h)) {
            (setPendingChord(null), m(null, !0));
            return;
          }
          (setPendingChord(null), m(null, !1));
          return;
        default:
          (m(null, !1), dispatchLegacy(d, f, C, g, h));
          return;
      }
    },
    onKeyDownCapture = (s) => {
      let { input: input, key: key } = toInkKey(s);
      dispatchKey(s, s, input, key, s.sequence, () => consumeKeyEvent(s));
    },
    onWheelCapture = (s) => {
      if (hasWheelHandlerBetween(s.target, s.currentTarget, s.col, s.row)) return;
      let d = {
          name: s.deltaY < 0 ? "wheelup" : "wheeldown",
          key: "",
          ctrl: s.ctrl,
          shift: s.shift,
          meta: s.meta,
          superKey: !1,
        },
        f = {
          upArrow: !1,
          downArrow: !1,
          leftArrow: !1,
          rightArrow: !1,
          pageDown: !1,
          pageUp: !1,
          wheelUp: s.deltaY < 0,
          wheelDown: s.deltaY > 0,
          home: !1,
          end: !1,
          return: !1,
          escape: !1,
          tab: !1,
          backspace: !1,
          delete: !1,
          ctrl: s.ctrl,
          shift: s.shift,
          meta: s.meta,
          super: !1,
        };
      dispatchKey(s, d, "", f, "", () => consumeKeyEvent(s));
    },
    rootRef = R(null);
  return (
    zt(() => {
      if (!rootRef.current) return;
      let s = getFocusManager(rootRef.current),
        d = () => {
          let f = rootRef.current;
          if (!f || s.activeElement === f) return;
          if (s.activeElement === null) {
            s.focus(f);
            return;
          }
          let parentNode = f.parentNode;
          while (parentNode) {
            if (parentNode === s.activeElement) {
              s.focus(f);
              return;
            }
            parentNode = parentNode.parentNode;
          }
        };
      return (d(), s.subscribe(d));
    }, []),
    e(BaseBox, {
      ref: rootRef,
      keybindingScope: "Global",
      tabIndex: -1,
      flexDirection: "column",
      flexGrow: 1,
      onKeyDownCapture: onKeyDownCapture,
      onWheelCapture: onWheelCapture,
      children: children,
    })
  );
}
//@ chunk-xe7zq1p4.js:10406-10469 affinity
function consumeKeyEvent(n) {
  (n.preventDefault(), n.stopImmediatePropagation());
}

export { KeybindingRoot, KeybindingActionEvent };
