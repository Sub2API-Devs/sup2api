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
import { init_react_production, y, R, ce, P, zt } from "../../vendor/react/cjs/react.production.js";
import { TerminalEvent } from "../ink/events/terminal-event.js";
import { identity } from "../utils/identity.js";
import { createStore } from "../state/store.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useKeybindingContext, KeybindingProvider } from "./KeybindingContext.js";
import {
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
  asLayoutNode,
  dispatchKeybindingEvent,
  hasWheelHandlerBetween,
} from "../ink/inputSelectionBridge.js";
import { isDescendantOf, getRootNode, getFocusManager } from "../ink/focus.js";
import { BaseBox } from "../ink/components/Box.js";

//@ chunk-xe7zq1p4.js:3563-3567 placement
init_react_production();
//@ chunk-xe7zq1p4.js:3567-3990 placement
/**
 * 快捷键动作事件：冒泡、可取消，带动作名、原始按键事件、是否和弦完成与来源；consume 同时阻止原始事件。
 */
class KeybindingActionEvent extends TerminalEvent {
  action;
  sourceEvent;
  isChordCompletion;
  origin;
  constructor(action, r) {
    super("action", {
      bubbles: true,
      cancelable: true,
    });
    this.action = action;
    this.sourceEvent = r?.sourceEvent ?? null;
    this.isChordCompletion = r?.isChordCompletion ?? false;
    this.origin = r?.origin ?? "single";
  }
  consume() {
    this.stopPropagation();
    this.sourceEvent?.preventDefault();
    this.sourceEvent?.stopImmediatePropagation();
  }
  get consumed() {
    return this._isPropagationStopped();
  }
}
//@ chunk-xe7zq1p4.js:3990-4063 placement
/**
 * 记录各和弦按键使用次数的全局 store（重置时清空）。
 */
var chordCountsStore = identity(
  createStore({
    counts: new Map(),
  }),
  (n) =>
    n.setState(() => ({
      counts: new Map(),
    })),
);
//@ chunk-xe7zq1p4.js:4063-4166 placement
function incrementContextCount(context) {
  chordCountsStore.setState((r) => {
    let i = new Map(r.counts);
    i.set(context, (i.get(context) ?? 0) + 1);
    return {
      counts: i,
    };
  });
}
//@ chunk-xe7zq1p4.js:4166-4326 placement
function decrementContextCount(context) {
  chordCountsStore.setState((r) => {
    let i = r.counts.get(context);
    if (i === undefined) return r;
    let o = new Map(r.counts);
    if (i <= 1) o.delete(context);
    else o.set(context, i - 1);
    return {
      counts: o,
    };
  });
}
//@ chunk-xe7zq1p4.js:4326-4367 placement
/**
 * 是否统计过该和弦
 */
function hasChordCount(n, r) {
  return n.counts.has(r);
}
//@ chunk-xe7zq1p4.js:4367-4379 placement
/**
 * 和弦按键等待下一键的超时（3 秒），超时后取消和弦并提示。
 */
var CHORD_PENDING_TIMEOUT_MS = 3000;
//@ chunk-xe7zq1p4.js:4379-4577 placement
/**
 * 已在快捷键上下文中时直接渲染子元素，否则包一层快捷键初始化组件。
 */
function KeybindingRoot(props) {
  let o = w(4);
  let { children } = props;
  if (useKeybindingContext()) {
    let a;
    if (o[0] !== children) {
      a = jsxProd_default(Fragment, {
        children,
      });
      o[0] = children;
      o[1] = a;
    } else a = o[1];
    return a;
  }
  let a;
  if (o[2] !== children) {
    a = jsxProd_default(KeybindingSetup, {
      children,
    });
    o[2] = children;
    o[3] = a;
  } else a = o[3];
  return a;
}
//@ chunk-xe7zq1p4.js:4577-5904 fingerprint = KeybindingSetup (0.742)
/**
 * 快捷键系统根组件：首次渲染同步加载绑定，挂载后启动文件监视并订阅热重载；维护待定和弦（超时 Je 毫秒自动取消并弹出 "… cancelled" 通知）、活动上下文集合、动作处理器注册表、预分发处理器、单键事件引用；向下提供 KeybindingProvider，外面包一层 ChordInterceptor。
 */
function KeybindingSetup({ children }) {
  let [{ bindings }, setLoadResult] = y(() => {
    let result = loadKeybindingsSync(keybindingsState);
    logForDebugging(
      `[keybindings] KeybindingSetup initialized with ${result.bindings.length} bindings, ${result.warnings.length} warnings`,
    );
    return result;
  });
  let timers = useClock();
  let { addNotification } = useNotifications();
  let pendingChordRef = R(null);
  let [pendingChord, setPendingChordState] = y(null);
  let chordTimeoutRef = R(null);
  let handlerRegistryRef = R(new Map());
  let activeContextsRef = R(new Set());
  let preDispatchRef = R(new Set());
  let singleKeyEventRef = R(null);
  let [keyHandlerRegistry] = y(createKeybindingRegistryState);
  let registerActiveContext = ce((context) => {
    activeContextsRef.current.add(context);
    incrementContextCount(context);
  }, []);
  let unregisterActiveContext = ce((context) => {
    activeContextsRef.current.delete(context);
    decrementContextCount(context);
  }, []);
  let clearChordTimeout = ce(() => {
    chordTimeoutRef.current?.();
    chordTimeoutRef.current = null;
  }, []);
  let setPendingChord = ce(
    (pending) => {
      clearChordTimeout();
      if (pending !== null)
        chordTimeoutRef.current = timers.setTimeout(() => {
          logForDebugging("[keybindings] Chord timeout - cancelling");
          pendingChordRef.current = null;
          setPendingChordState(null);
          addNotification({
            key: "chord-timeout",
            kind: "feedback",
            text: `${chordToDisplayString(pending, getShortcutDisplayPlatform())} cancelled \u2014 no next key within ${CHORD_PENDING_TIMEOUT_MS / 1000}s`,
            priority: "immediate",
            timeoutMs: 3000,
          });
        }, CHORD_PENDING_TIMEOUT_MS);
      pendingChordRef.current = pending;
      setPendingChordState(pending);
    },
    [addNotification, clearChordTimeout, timers],
  );
  P(() => {
    initializeKeybindingWatcher(keybindingsState);
    let unsubscribe = keybindingsState.changed.subscribe((result) => {
      setLoadResult(result);
      logForDebugging(
        `[keybindings] Reloaded: ${result.bindings.length} bindings, ${result.warnings.length} warnings`,
      );
    });
    return () => {
      unsubscribe();
      clearChordTimeout();
    };
  }, [clearChordTimeout]);
  return jsxProd_default(KeybindingProvider, {
    bindings,
    pendingChordRef,
    pendingChord,
    setPendingChord,
    activeContexts: activeContextsRef.current,
    registerActiveContext,
    unregisterActiveContext,
    handlerRegistryRef,
    preDispatchRef,
    singleKeyEventRef,
    keyHandlerRegistry,
    children: jsxProd_default(ChordInterceptor, {
      bindings,
      pendingChordRef,
      setPendingChord,
      activeContexts: activeContextsRef.current,
      handlerRegistryRef,
      preDispatchRef,
      singleKeyEventRef,
      keyHandlerRegistry,
      children,
    }),
  });
}
//@ chunk-xe7zq1p4.js:5904-6074 layout
/**
 * 处理器排序：非回退处理器在前；同动作已有非回退处理器时丢弃回退处理器。
 */
function orderNonFallbackFirst(n) {
  let r = [...n];
  let i = new Set(r.filter((o) => !o.fallback).map((o) => o.action));
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
//@ chunk-xe7zq1p4.js:6225-10406 fingerprint = ChordInterceptor (0.407)
/**
 * 根 Box（keybindingScope=Global、tabIndex=-1，始终在焦点链上）的捕获阶段键盘/滚轮处理器，统一做快捷键分发。两种模式：legacy——在「有处理器的上下文 + 活动上下文 + Global」里 resolveKeyWithChordState，处理和弦开始/取消/解绑/匹配，匹配后按注册表调用单键处理器（回退处理器在保留键或无修饰键时跳过）；scopeChain——按焦点节点到根的 keybindingScope 链（以及抢先作用域 preemptiveScopes）解析，匹配后先把动作作为事件派给 DOM 节点（onAction），未处理再落回注册表；文本输入框获得焦点时无修饰单字符直接交给预分发。消费的事件 preventDefault + stopImmediatePropagation。滚轮事件转成 wheelup/wheeldown 按键参与同一套解析。
 */
function ChordInterceptor({
  bindings,
  pendingChordRef,
  setPendingChord,
  activeContexts,
  handlerRegistryRef,
  preDispatchRef,
  singleKeyEventRef,
  keyHandlerRegistry,
  children,
}) {
  let scopeChainContexts = R([]);
  let chordStartTarget = R(null);
  let chordMode = R("legacy");
  let runPreDispatch = ce(
    (s, d, f, C) => {
      for (let g of preDispatchRef.current)
        try {
          if (g.handler(s, d, f) === true) {
            C();
            return true;
          }
        } catch (error) {
          logError(error);
        }
      return false;
    },
    [preDispatchRef],
  );
  let dispatchChordAction = (s, d, action, C) => {
    let g = handlerRegistryRef.current;
    if (!g) return false;
    let flattened = [...g.values()].flatMap((v) => [...v]);
    let A = [
      ...new Set(flattened.filter((v) => !v.fallback).map((v) => v.context)),
      ...activeContexts,
      "Global",
    ];
    let keyWithChordState = resolveKeyWithChordState(s, A, bindings, d);
    let action_2 =
      keyWithChordState.type === "match" &&
      flattened.some((v) => !v.fallback && v.action === keyWithChordState.action)
        ? keyWithChordState.action
        : null;
    let V = action_2 === null ? [action] : [action_2, action];
    let k = isReservedKeyEvent(s);
    for (let v of V) {
      let [O] = orderNonFallbackFirst(g.get(v) ?? []).filter((E) => !(E.fallback && k));
      if (O) {
        O.handler();
        logKeybindingFired(v);
        C();
        return true;
      }
    }
    return false;
  };
  let dispatchLegacy = (s, d, f, C, g, h = false) => {
    let registry = handlerRegistryRef.current;
    let m = isReservedKeyEvent(s);
    let handlerContexts = new Set();
    if (registry) {
      for (let handlers of registry.values())
        for (let registration of handlers)
          if (!(m && registration.fallback)) handlerContexts.add(registration.context);
    }
    let contexts = [...handlerContexts, ...activeContexts, "Global"];
    let k = pendingChordRef.current;
    let wasInChord = k !== null;
    let keyWithChordState = resolveKeyWithChordState(s, contexts, bindings, k);
    switch (keyWithChordState.type) {
      case "chord_started":
        chordMode.current = "legacy";
        setPendingChord(keyWithChordState.pending);
        g();
        return;
      case "chord_cancelled":
        setPendingChord(null);
        g();
        return;
      case "unbound":
        setPendingChord(null);
        if (wasInChord) {
          g();
          return;
        }
        break;
      case "match":
        setPendingChord(null);
        if (wasInChord) {
          dispatchChordAction(s, k, keyWithChordState.action, g);
          return;
        }
        break;
      case "none":
        break;
    }
    if (!registry) return;
    if (!h && runPreDispatch(d, f, C, g)) return;
    let E = new Map();
    let q = orderNonFallbackFirst([...registry.values()].flatMap((D) => [...D]));
    let K = isUnmodifiedKey(s) || m;
    let ne;
    for (let registration_0 of q) {
      if (!registration_0.singleKey || (registration_0.fallback && K)) continue;
      let L;
      if (registration_0.fallback && !activeContexts.has(registration_0.context)) {
        ne ??= (() => {
          let keyWithChordState = resolveKeyWithChordState(s, [...activeContexts, "Global"], bindings, null);
          return keyWithChordState.type === "match" ? keyWithChordState.action : null;
        })();
        L = ne;
      } else L = E.get(registration_0.context);
      if (L === undefined) {
        let keyWithChordState = resolveKeyWithChordState(
          s,
          [...activeContexts, registration_0.context, "Global"],
          bindings,
          null,
        );
        L = keyWithChordState.type === "match" ? keyWithChordState.action : null;
        E.set(registration_0.context, L);
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
        if (re !== false) {
          logKeybindingFired(L);
          g();
          return;
        }
      }
    }
  };
  let dispatchKey = (sourceEvent, d, f, C, g, h) => {
    let handleInput = keyHandlerRegistry;
    let m = (action, E) => {};
    if (handleInput.swallowAll.size > 0) {
      m(null, true);
      h();
      return;
    }
    if (pendingChordRef.current !== null && chordMode.current === "legacy") {
      m(null, false);
      dispatchLegacy(d, f, C, g, h);
      return;
    }
    let keybindingScopes = getKeybindingScopes(sourceEvent.target);
    let V = pendingChordRef.current !== null && chordMode.current === "scopeChain";
    if (keybindingScopes.length === 0 && handleInput.preemptiveScopes.size === 0 && !V) {
      m(null, false);
      dispatchLegacy(d, f, C, g, h);
      return;
    }
    let node = asLayoutNode(sourceEvent.target);
    if (handleInput.preemptiveScopes.size > 0 && !V) {
      let O = [...handleInput.preemptiveScopes.keys(), "Global"];
      let keyInScopeChain = resolveKeyInScopeChain(d, O, bindings, null);
      if (keyInScopeChain.type === "match" && node) {
        if (
          dispatchKeybindingEvent(
            node,
            sourceEvent,
            keyInScopeChain.action,
            false,
            sourceEvent.type === "wheel" ? "wheel" : "single",
          )
        ) {
          m(keyInScopeChain.action, true);
          logKeybindingFired(keyInScopeChain.action);
          return;
        }
      }
    }
    if (!V && node?.attributes.textEntry === true && isUnmodifiedKey(d) && [...d.key].length === 1) {
      m(null, runPreDispatch(f, C, g, h));
      return;
    }
    if (V) {
      let O = pendingChordRef.current;
      let keyInScopeChain = resolveKeyInScopeChain(d, scopeChainContexts.current, bindings, O);
      if (keyInScopeChain.type === "chord_started") {
        chordMode.current = "scopeChain";
        setPendingChord(keyInScopeChain.pending);
        h();
        m(null, true);
        return;
      }
      if (keyInScopeChain.type === "match") {
        setPendingChord(null);
        let q = chordStartTarget.current;
        chordStartTarget.current = null;
        scopeChainContexts.current = [];
        let K = q && node && isDescendantOf(q, getRootNode(node)) ? q : node;
        if (K) {
          if (dispatchKeybindingEvent(K, sourceEvent, keyInScopeChain.action, true, "chord")) {
            m(keyInScopeChain.action, true);
            logKeybindingFired(keyInScopeChain.action);
            return;
          }
        }
        let ne = dispatchChordAction(d, O, keyInScopeChain.action, h);
        m(keyInScopeChain.action, ne);
        return;
      }
      chordStartTarget.current = null;
      scopeChainContexts.current = [];
      m(null, false);
      dispatchLegacy(d, f, C, g, h);
      return;
    }
    let keyInScopeChain = resolveKeyInScopeChain(d, keybindingScopes, bindings, null);
    switch (keyInScopeChain.type) {
      case "chord_started":
        scopeChainContexts.current = keybindingScopes;
        chordStartTarget.current = node ?? null;
        chordMode.current = "scopeChain";
        setPendingChord(keyInScopeChain.pending);
        h();
        m(null, true);
        return;
      case "match": {
        if (!node) {
          m(keyInScopeChain.action, false);
          dispatchLegacy(d, f, C, g, h);
          return;
        }
        if (runPreDispatch(f, C, g, h)) {
          setPendingChord(null);
          m(keyInScopeChain.action, true);
          return;
        }
        if (
          dispatchKeybindingEvent(
            node,
            sourceEvent,
            keyInScopeChain.action,
            false,
            sourceEvent.type === "wheel" ? "wheel" : "single",
          )
        ) {
          setPendingChord(null);
          m(keyInScopeChain.action, true);
          logKeybindingFired(keyInScopeChain.action);
          return;
        }
        m(keyInScopeChain.action, false);
        dispatchLegacy(d, f, C, g, h, true);
        return;
      }
      case "unbound":
        if (runPreDispatch(f, C, g, h)) {
          setPendingChord(null);
          m(null, true);
          return;
        }
        setPendingChord(null);
        m(null, false);
        return;
      default:
        m(null, false);
        dispatchLegacy(d, f, C, g, h);
        return;
    }
  };
  let onKeyDownCapture = (event) => {
    let { input, key } = toInkKey(event);
    dispatchKey(event, event, input, key, event.sequence, () => consumeKeyEvent(event));
  };
  let onWheelCapture = (event) => {
    if (hasWheelHandlerBetween(event.target, event.currentTarget, event.col, event.row)) return;
    let d = {
      name: event.deltaY < 0 ? "wheelup" : "wheeldown",
      key: "",
      ctrl: event.ctrl,
      shift: event.shift,
      meta: event.meta,
      superKey: false,
    };
    let f = {
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      pageDown: false,
      pageUp: false,
      wheelUp: event.deltaY < 0,
      wheelDown: event.deltaY > 0,
      home: false,
      end: false,
      return: false,
      escape: false,
      tab: false,
      backspace: false,
      delete: false,
      ctrl: event.ctrl,
      shift: event.shift,
      meta: event.meta,
      super: false,
    };
    dispatchKey(event, d, "", f, "", () => consumeKeyEvent(event));
  };
  let rootRef = R(null);
  zt(() => {
    if (!rootRef.current) return;
    let focusManager = getFocusManager(rootRef.current);
    let d = () => {
      let f = rootRef.current;
      if (!f || focusManager.activeElement === f) return;
      if (focusManager.activeElement === null) {
        focusManager.focus(f);
        return;
      }
      let parentNode = f.parentNode;
      while (parentNode) {
        if (parentNode === focusManager.activeElement) {
          focusManager.focus(f);
          return;
        }
        parentNode = parentNode.parentNode;
      }
    };
    d();
    return focusManager.subscribe(d);
  }, []);
  return jsxProd_default(BaseBox, {
    ref: rootRef,
    keybindingScope: "Global",
    tabIndex: -1,
    flexDirection: "column",
    flexGrow: 1,
    onKeyDownCapture,
    onWheelCapture,
    children,
  });
}
//@ chunk-xe7zq1p4.js:10406-10469 affinity
function consumeKeyEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}
export { KeybindingRoot, KeybindingActionEvent };
