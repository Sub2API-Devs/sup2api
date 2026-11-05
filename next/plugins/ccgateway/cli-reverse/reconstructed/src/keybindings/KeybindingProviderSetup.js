/**
 * keybindings/KeybindingProviderSetup.tsx
 *
 * 并入已有模块：快捷键 Provider。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/KeybindingProviderSetup.tsx
 * pieces: chunk-swe0kb5q.js (15)
 * attribution: placement 8, fingerprint 2, layout 4, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
import { TerminalEvent } from "../ink/events/terminal-event.js";
import { identity } from "../utils/identity.js";
import { createStore } from "../state/store.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-swe0kb5q.js:3565-3569 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:3565", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:3569-3992 placement
/**
 * 快捷键动作事件：冒泡、可取消，带动作名、原始按键事件、是否和弦完成与来源；consume 同时阻止原始事件。
 */
let KeybindingActionEvent; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:3569", () => {
  KeybindingActionEvent = class KeybindingActionEvent extends TerminalEvent {
    action;
    sourceEvent;
    isChordCompletion;
    origin;
    constructor(action, options) {
      super("action", {
        bubbles: true,
        cancelable: true,
      });
      this.action = action;
      this.sourceEvent = options?.sourceEvent ?? null;
      this.isChordCompletion = options?.isChordCompletion ?? false;
      this.origin = options?.origin ?? "single";
    }
    consume() {
      this.stopPropagation();
      this.sourceEvent?.preventDefault();
      this.sourceEvent?.stopImmediatePropagation();
    }
    get consumed() {
      return this._isPropagationStopped();
    }
  };
});
//@ chunk-swe0kb5q.js:3992-4065 placement
/**
 * 记录各和弦按键使用次数的全局 store（重置时清空）。
 */
var chordCountsStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:3992", () => {
  chordCountsStore = identity(
    createStore({
      counts: new Map(),
    }),
    (store) =>
      store.setState(() => ({
        counts: new Map(),
      })),
  );
});
//@ chunk-swe0kb5q.js:4065-4168 placement
function incrementContextCount(context) {
  chordCountsStore.setState((prevState) => {
    let nextCounts = new Map(prevState.counts);
    nextCounts.set(context, (nextCounts.get(context) ?? 0) + 1);
    return {
      counts: nextCounts,
    };
  });
}
//@ chunk-swe0kb5q.js:4168-4328 placement
function decrementContextCount(context) {
  chordCountsStore.setState((prevState) => {
    let currentCount = prevState.counts.get(context);
    if (currentCount === undefined) return prevState;
    let nextCounts = new Map(prevState.counts);
    if (currentCount <= 1) nextCounts.delete(context);
    else nextCounts.set(context, currentCount - 1);
    return {
      counts: nextCounts,
    };
  });
}
//@ chunk-swe0kb5q.js:4328-4369 placement
/**
 * 是否统计过该和弦
 */
function hasChordCount(state, context) {
  return state.counts.has(context);
}
//@ chunk-swe0kb5q.js:4369-4381 placement
/**
 * 和弦按键等待下一键的超时（3 秒），超时后取消和弦并提示。
 */
var CHORD_PENDING_TIMEOUT_MS = 3000;
//@ chunk-swe0kb5q.js:4381-4580 placement
/**
 * 已在快捷键上下文中时直接渲染子元素，否则包一层快捷键初始化组件。
 */
function KeybindingRoot(props) {
  let $ = useMemoCache(4);
  let { children } = props;
  if (useKeybindingContext()) {
    let plainChildren;
    if ($[0] !== children) {
      plainChildren = jsxProd_default(Fragment, {
        children,
      });
      $[0] = children;
      $[1] = plainChildren;
    } else plainChildren = $[1];
    return plainChildren;
  }
  let wrappedChildren;
  if ($[2] !== children) {
    wrappedChildren = jsxProd_default(KeybindingSetup, {
      children,
    });
    $[2] = children;
    $[3] = wrappedChildren;
  } else wrappedChildren = $[3];
  return wrappedChildren;
}
//@ chunk-swe0kb5q.js:4580-5923 fingerprint (2.1.88 match: KeybindingSetup, 0.71)
/**
 * 快捷键系统根组件：首次渲染同步加载绑定，挂载后启动文件监视并订阅热重载；维护待定和弦（超时 Je 毫秒自动取消并弹出 "… cancelled" 通知）、活动上下文集合、动作处理器注册表、预分发处理器、单键事件引用；向下提供 KeybindingProvider，外面包一层 ChordInterceptor。
 */
function KeybindingSetup({ children }) {
  let [{ bindings }, setLoadResult] = useState(() => {
    let result = loadKeybindingsSync(keybindingsState);
    logForDebugging(
      `[keybindings] KeybindingSetup initialized with ${result.bindings.length} bindings, ${result.warnings.length} warnings`,
    );
    return result;
  });
  let timers = useClock();
  let { addNotification } = useNotifications();
  let pendingChordRef = useRef(null);
  let [pendingChord, setPendingChordState] = useState(null);
  let chordTimeoutRef = useRef(null);
  let handlerRegistryRef = useRef(new Map());
  let activeContextsRef = useRef(new Set());
  let preDispatchRef = useRef(new Set());
  let singleKeyEventRef = useRef(null);
  let [keyHandlerRegistry] = useState(createKeybindingRegistryState);
  let registerActiveContext = useCallback((context) => {
    activeContextsRef.current.add(context);
    incrementContextCount(context);
  }, []);
  let unregisterActiveContext = useCallback((context) => {
    activeContextsRef.current.delete(context);
    decrementContextCount(context);
  }, []);
  let clearChordTimeout = useCallback(() => {
    chordTimeoutRef.current?.();
    chordTimeoutRef.current = null;
  }, []);
  let setPendingChord = useCallback(
    (pending) => {
      clearChordTimeout();
      if (pending !== null)
        chordTimeoutRef.current = timers.setTimeout(() => {
          logForDebugging("[keybindings] Chord timeout - cancelling");
          pendingChordRef.current = null;
          setPendingChordState(null);
          let pendingChordText = chordToDisplayString(pending, getShortcutDisplayPlatform());
          addNotification({
            key: "chord-timeout",
            kind: "feedback",
            text: `${pendingChordText} cancelled \u2014 no next key within ${CHORD_PENDING_TIMEOUT_MS / 1000}s`,
            row1Hint: `${pendingChordText} timed out`,
            priority: "immediate",
            timeoutMs: 3000,
          });
        }, CHORD_PENDING_TIMEOUT_MS);
      pendingChordRef.current = pending;
      setPendingChordState(pending);
    },
    [addNotification, clearChordTimeout, timers],
  );
  useEffect(() => {
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
//@ chunk-swe0kb5q.js:5923-6093 layout
/**
 * 处理器排序：非回退处理器在前；同动作已有非回退处理器时丢弃回退处理器。
 */
function orderNonFallbackFirst(registrations) {
  let copy = [...registrations];
  let coveredActions = new Set(
    copy.filter((registration) => !registration.fallback).map((registration) => registration.action),
  );
  return [
    ...copy.filter((registration) => !registration.fallback),
    ...copy.filter((registration) => registration.fallback && !coveredActions.has(registration.action)),
  ];
}
//@ chunk-swe0kb5q.js:6093-6144 layout
function isUnmodifiedKey(keyEvent) {
  return !keyEvent.ctrl && !keyEvent.meta && !keyEvent.superKey;
}
//@ chunk-swe0kb5q.js:6144-6176 layout
var RESERVED_KEYSTROKES; // deferred: uses NON_REBINDABLE (./reservedShortcuts.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-swe0kb5q.js:6144", () => {
  RESERVED_KEYSTROKES = NON_REBINDABLE.map((entry) => parseKeystroke(entry.key));
});
//@ chunk-swe0kb5q.js:6176-6244 layout
function isReservedKeyEvent(keyEvent) {
  let keystroke = keyEventToKeystroke(keyEvent);
  return (
    keystroke !== null &&
    RESERVED_KEYSTROKES.some((reservedKeystroke) => keystrokesEqual(reservedKeystroke, keystroke))
  );
}
//@ chunk-swe0kb5q.js:6244-10425 fingerprint (2.1.88 match: ChordInterceptor, 0.408)
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
  let scopeChainContexts = useRef([]);
  let chordStartTarget = useRef(null);
  let chordMode = useRef("legacy");
  let runPreDispatch = useCallback(
    (event, key, nativeEvent, context) => {
      for (let preDispatch of preDispatchRef.current)
        try {
          if (preDispatch.handler(event, key, nativeEvent) === true) {
            context();
            return true;
          }
        } catch (error) {
          logError(error);
        }
      return false;
    },
    [preDispatchRef],
  );
  let dispatchChordAction = (event, key, action, contexts) => {
    let registry = handlerRegistryRef.current;
    if (!registry) return false;
    let flattened = [...registry.values()].flatMap((entriesA) => [...entriesA]);
    let scopes = [
      ...new Set(
        flattened
          .filter((registration) => !registration.fallback)
          .map((registration) => registration.context),
      ),
      ...activeContexts,
      "Global",
    ];
    let keyWithChordState = resolveKeyWithChordState(event, scopes, bindings, key);
    let action_2 =
      keyWithChordState.type === "match" &&
      flattened.some(
        (registration) => !registration.fallback && registration.action === keyWithChordState.action,
      )
        ? keyWithChordState.action
        : null;
    let actions = action_2 === null ? [action] : [action_2, action];
    let isReserved = isReservedKeyEvent(event);
    for (let candidateAction of actions) {
      let [handler] = orderNonFallbackFirst(registry.get(candidateAction) ?? []).filter(
        (registration) => !(registration.fallback && isReserved),
      );
      if (handler) {
        handler.handler();
        logKeybindingFired(candidateAction);
        contexts();
        return true;
      }
    }
    return false;
  };
  let dispatchLegacy = (event, key, nativeEvent, context, contexts, isChordContinuation = false) => {
    let registry = handlerRegistryRef.current;
    let isReserved = isReservedKeyEvent(event);
    let handlerContexts = new Set();
    if (registry) {
      for (let handlers of registry.values())
        for (let registration of handlers)
          if (!(isReserved && registration.fallback)) handlerContexts.add(registration.context);
    }
    let contexts_2 = [...handlerContexts, ...activeContexts, "Global"];
    let pendingChord = pendingChordRef.current;
    let wasInChord = pendingChord !== null;
    let keyWithChordState = resolveKeyWithChordState(event, contexts_2, bindings, pendingChord);
    switch (keyWithChordState.type) {
      case "chord_started":
        chordMode.current = "legacy";
        setPendingChord(keyWithChordState.pending);
        contexts();
        return;
      case "chord_cancelled":
        setPendingChord(null);
        contexts();
        return;
      case "unbound":
        setPendingChord(null);
        if (wasInChord) {
          contexts();
          return;
        }
        break;
      case "match":
        setPendingChord(null);
        if (wasInChord) {
          dispatchChordAction(event, pendingChord, keyWithChordState.action, contexts);
          return;
        }
        break;
      case "none":
        break;
    }
    if (!registry) return;
    if (!isChordContinuation && runPreDispatch(key, nativeEvent, context, contexts)) return;
    let handledByContext = new Map();
    let registrations = orderNonFallbackFirst([...registry.values()].flatMap((entriesB) => [...entriesB]));
    let allowFallback = isUnmodifiedKey(event) || isReserved;
    let handled;
    for (let registration_0 of registrations) {
      if (!registration_0.singleKey || (registration_0.fallback && allowFallback)) continue;
      let result;
      if (registration_0.fallback && !activeContexts.has(registration_0.context)) {
        handled ??= (() => {
          let keyWithChordState = resolveKeyWithChordState(
            event,
            [...activeContexts, "Global"],
            bindings,
            null,
          );
          return keyWithChordState.type === "match" ? keyWithChordState.action : null;
        })();
        result = handled;
      } else result = handledByContext.get(registration_0.context);
      if (result === undefined) {
        let keyWithChordState = resolveKeyWithChordState(
          event,
          [...activeContexts, registration_0.context, "Global"],
          bindings,
          null,
        );
        result = keyWithChordState.type === "match" ? keyWithChordState.action : null;
        handledByContext.set(registration_0.context, result);
      }
      if (result === registration_0.action) {
        let singleKeyEvent = singleKeyEventRef.current;
        singleKeyEventRef.current = event;
        let outcome;
        try {
          outcome = registration_0.handler();
        } finally {
          singleKeyEventRef.current = singleKeyEvent;
        }
        if (outcome !== false) {
          logKeybindingFired(result);
          contexts();
          return;
        }
      }
    }
  };
  let dispatchKey = (sourceEvent, key, nativeEvent, context, contexts, isChordContinuation) => {
    let handleInput = keyHandlerRegistry;
    let noopHandler = (action, context) => {};
    if (handleInput.swallowAll.size > 0) {
      noopHandler(null, true);
      isChordContinuation();
      return;
    }
    if (pendingChordRef.current !== null && chordMode.current === "legacy") {
      noopHandler(null, false);
      dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation);
      return;
    }
    let contexts_2 = getKeybindingScopes(sourceEvent.target);
    let usesScopeChain = pendingChordRef.current !== null && chordMode.current === "scopeChain";
    if (contexts_2.length === 0 && handleInput.preemptiveScopes.size === 0 && !usesScopeChain) {
      noopHandler(null, false);
      dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation);
      return;
    }
    let targetNode = asLayoutNode(sourceEvent.target);
    if (handleInput.preemptiveScopes.size > 0 && !usesScopeChain) {
      let scopes = [...handleInput.preemptiveScopes.keys(), "Global"];
      let keyInScopeChain = resolveKeyInScopeChain(key, scopes, bindings, null);
      if (keyInScopeChain.type === "match" && targetNode) {
        if (
          dispatchKeybindingEvent(
            targetNode,
            sourceEvent,
            keyInScopeChain.action,
            false,
            sourceEvent.type === "wheel" ? "wheel" : "single",
          )
        ) {
          noopHandler(keyInScopeChain.action, true);
          logKeybindingFired(keyInScopeChain.action);
          return;
        }
      }
    }
    if (
      !usesScopeChain &&
      targetNode?.attributes.textEntry === true &&
      isUnmodifiedKey(key) &&
      [...key.key].length === 1
    ) {
      noopHandler(null, runPreDispatch(nativeEvent, context, contexts, isChordContinuation));
      return;
    }
    if (usesScopeChain) {
      let pendingChord = pendingChordRef.current;
      let keyInScopeChain = resolveKeyInScopeChain(key, scopeChainContexts.current, bindings, pendingChord);
      if (keyInScopeChain.type === "chord_started") {
        chordMode.current = "scopeChain";
        setPendingChord(keyInScopeChain.pending);
        isChordContinuation();
        noopHandler(null, true);
        return;
      }
      if (keyInScopeChain.type === "match") {
        setPendingChord(null);
        let chordStartTarget_2 = chordStartTarget.current;
        chordStartTarget.current = null;
        scopeChainContexts.current = [];
        let ownerNode =
          chordStartTarget_2 && targetNode && isDescendantOf(chordStartTarget_2, getRootNode(targetNode))
            ? chordStartTarget_2
            : targetNode;
        if (ownerNode) {
          if (dispatchKeybindingEvent(ownerNode, sourceEvent, keyInScopeChain.action, true, "chord")) {
            noopHandler(keyInScopeChain.action, true);
            logKeybindingFired(keyInScopeChain.action);
            return;
          }
        }
        let handled = dispatchChordAction(key, pendingChord, keyInScopeChain.action, isChordContinuation);
        noopHandler(keyInScopeChain.action, handled);
        return;
      }
      chordStartTarget.current = null;
      scopeChainContexts.current = [];
      noopHandler(null, false);
      dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation);
      return;
    }
    let keyInScopeChain = resolveKeyInScopeChain(key, contexts_2, bindings, null);
    switch (keyInScopeChain.type) {
      case "chord_started":
        scopeChainContexts.current = contexts_2;
        chordStartTarget.current = targetNode ?? null;
        chordMode.current = "scopeChain";
        setPendingChord(keyInScopeChain.pending);
        isChordContinuation();
        noopHandler(null, true);
        return;
      case "match": {
        if (!targetNode) {
          noopHandler(keyInScopeChain.action, false);
          dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation);
          return;
        }
        if (runPreDispatch(nativeEvent, context, contexts, isChordContinuation)) {
          setPendingChord(null);
          noopHandler(keyInScopeChain.action, true);
          return;
        }
        if (
          dispatchKeybindingEvent(
            targetNode,
            sourceEvent,
            keyInScopeChain.action,
            false,
            sourceEvent.type === "wheel" ? "wheel" : "single",
          )
        ) {
          setPendingChord(null);
          noopHandler(keyInScopeChain.action, true);
          logKeybindingFired(keyInScopeChain.action);
          return;
        }
        noopHandler(keyInScopeChain.action, false);
        dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation, true);
        return;
      }
      case "unbound":
        if (runPreDispatch(nativeEvent, context, contexts, isChordContinuation)) {
          setPendingChord(null);
          noopHandler(null, true);
          return;
        }
        setPendingChord(null);
        noopHandler(null, false);
        return;
      default:
        noopHandler(null, false);
        dispatchLegacy(key, nativeEvent, context, contexts, isChordContinuation);
        return;
    }
  };
  let onKeyDownCapture = (keyEvent) => {
    let { input, key } = toInkKey(keyEvent);
    dispatchKey(keyEvent, keyEvent, input, key, keyEvent.sequence, () => consumeKeyEvent(keyEvent));
  };
  let onWheelCapture = (event) => {
    if (hasWheelHandlerBetween(event.target, event.currentTarget, event.col, event.row)) return;
    let value = {
      name: event.deltaY < 0 ? "wheelup" : "wheeldown",
      key: "",
      ctrl: event.ctrl,
      shift: event.shift,
      meta: event.meta,
      superKey: false,
    };
    let value_2 = {
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
    dispatchKey(event, value, "", value_2, "", () => consumeKeyEvent(event));
  };
  let rootRef = useRef(null);
  useLayoutEffect(() => {
    if (!rootRef.current) return;
    let focusManager = getFocusManager(rootRef.current);
    let cleanup = () => {
      let root = rootRef.current;
      if (!root || focusManager.activeElement === root) return;
      if (focusManager.activeElement === null) {
        focusManager.focus(root);
        return;
      }
      let parentNode = root.parentNode;
      while (parentNode) {
        if (parentNode === focusManager.activeElement) {
          focusManager.focus(root);
          return;
        }
        parentNode = parentNode.parentNode;
      }
    };
    cleanup();
    return focusManager.subscribe(cleanup);
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
//@ chunk-swe0kb5q.js:10425-10488 affinity
function consumeKeyEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}
export { KeybindingRoot, KeybindingActionEvent };
