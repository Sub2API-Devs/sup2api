/**
 * keybindings/KeybindingContext.tsx
 *
 * KeybindingContext 与 Provider：解析按键、取显示文字、注册动作处理器、活动上下文登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/KeybindingContext.tsx
 * pieces: chunk-7wgjt81y.js (5)
 * attribution: affinity 1, fingerprint 2, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createContext, useContext, useLayoutEffect } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { resolveKeyWithChordState } from "./resolver.js";
import { toInkKeyEvent, noop, didHandlerConsume } from "./keyNames.js";
import { getActionDisplayText } from "./match.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7wgjt81y.js:1788-1803 affinity
var KeybindingContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7wgjt81y.js:1788", () => {
  KeybindingContext = createContext(null);
});
//@ chunk-7wgjt81y.js:1803-3504 fingerprint (2.1.88 match: KeybindingProvider, 0.563)
/**
 * KeybindingContext 的 Provider：对外提供 resolve（按当前待定和弦解析）、getDisplayText、registerHandler（按动作登记处理器并发 handlersChanged）、hasHandler/runAction（只算非回退处理器）、registerPreDispatch、singleKeyEvent、活动上下文登记等。
 */
function KeybindingProvider(props) {
  let $ = useMemoCache(32);
  let {
    bindings,
    pendingChordRef,
    pendingChord,
    activeContexts,
    registerActiveContext,
    unregisterActiveContext,
    handlerRegistryRef,
    preDispatchRef,
    singleKeyEventRef,
    keyHandlerRegistry,
    children,
  } = props;
  let resolve;
  if ($[0] !== bindings || $[1] !== pendingChordRef) {
    resolve = (action, context, contexts) =>
      resolveKeyWithChordState(toInkKeyEvent(action, context), contexts, bindings, pendingChordRef.current);
    $[0] = bindings;
    $[1] = pendingChordRef;
    $[2] = resolve;
  } else resolve = $[2];
  let getDisplayText;
  if ($[3] !== bindings) {
    getDisplayText = (action, context) => getActionDisplayText(action, context, bindings);
    $[3] = bindings;
    $[4] = getDisplayText;
  } else getDisplayText = $[4];
  let registerHandler;
  if ($[5] !== handlerRegistryRef || $[6] !== keyHandlerRegistry) {
    registerHandler = (registration) => {
      let registry = handlerRegistryRef.current;
      if (!registry) {
        return noop;
      }
      if (!registry.has(registration.action)) registry.set(registration.action, new Set());
      registry.get(registration.action).add(registration);
      keyHandlerRegistry.handlersChanged.emit();
      return () => {
        let handlers = registry.get(registration.action);
        if (handlers) {
          handlers.delete(registration);
          if (handlers.size === 0) registry.delete(registration.action);
          keyHandlerRegistry.handlersChanged.emit();
        }
      };
    };
    $[5] = handlerRegistryRef;
    $[6] = keyHandlerRegistry;
    $[7] = registerHandler;
  } else registerHandler = $[7];
  let hasHandler;
  let runAction;
  if ($[8] !== handlerRegistryRef) {
    hasHandler = (action) => getPrimaryHandlers(handlerRegistryRef.current, action).length > 0;
    runAction = (action) => {
      try {
        return getPrimaryHandlers(handlerRegistryRef.current, action).some(didHandlerConsume);
      } catch (error) {
        let error_2 = error;
        logError(withTelemetryMessage(toError(error_2), "Key action handler threw"));
        return false;
      }
    };
    $[8] = handlerRegistryRef;
    $[9] = hasHandler;
    $[10] = runAction;
  } else {
    hasHandler = $[9];
    runAction = $[10];
  }
  let registerPreDispatch;
  if ($[11] !== preDispatchRef) {
    registerPreDispatch = (action_0) => {
      preDispatchRef.current.add(action_0);
      return () => preDispatchRef.current.delete(action_0);
    };
    $[11] = preDispatchRef;
    $[12] = registerPreDispatch;
  } else registerPreDispatch = $[12];
  let singleKeyEvent;
  if ($[13] !== singleKeyEventRef) {
    singleKeyEvent = () => singleKeyEventRef.current;
    $[13] = singleKeyEventRef;
    $[14] = singleKeyEvent;
  } else singleKeyEvent = $[14];
  let contextValue;
  if (
    $[15] !== activeContexts ||
    $[16] !== bindings ||
    $[17] !== keyHandlerRegistry ||
    $[18] !== pendingChord ||
    $[19] !== registerActiveContext ||
    $[20] !== resolve ||
    $[21] !== getDisplayText ||
    $[22] !== registerHandler ||
    $[23] !== hasHandler ||
    $[24] !== runAction ||
    $[25] !== registerPreDispatch ||
    $[26] !== singleKeyEvent ||
    $[27] !== unregisterActiveContext
  ) {
    contextValue = {
      resolve,
      getDisplayText,
      bindings,
      pendingChord,
      activeContexts,
      registerActiveContext,
      unregisterActiveContext,
      registerHandler,
      hasHandler,
      runAction,
      registerPreDispatch,
      singleKeyEvent,
      keyHandlerRegistry,
    };
    $[15] = activeContexts;
    $[16] = bindings;
    $[17] = keyHandlerRegistry;
    $[18] = pendingChord;
    $[19] = registerActiveContext;
    $[20] = resolve;
    $[21] = getDisplayText;
    $[22] = registerHandler;
    $[23] = hasHandler;
    $[24] = runAction;
    $[25] = registerPreDispatch;
    $[26] = singleKeyEvent;
    $[27] = unregisterActiveContext;
    $[28] = contextValue;
  } else contextValue = $[28];
  let value = contextValue;
  let t6;
  if ($[29] !== children || $[30] !== value) {
    t6 = jsxProd_default(KeybindingContext.Provider, {
      value,
      children,
    });
    $[29] = children;
    $[30] = value;
    $[31] = t6;
  } else t6 = $[31];
  return t6;
}
//@ chunk-7wgjt81y.js:3504-3569 layout
function getPrimaryHandlers(registry, action) {
  return [...(registry.get(action) ?? [])].filter((registration) => !registration.fallback);
}
//@ chunk-7wgjt81y.js:3569-3596 layout
function useKeybindingContext() {
  return useContext(KeybindingContext);
}
//@ chunk-7wgjt81y.js:3596-3852 fingerprint (2.1.88 match: useRegisterKeybindingContext, 1)
/**
 * 组件挂载且 isActive 时把上下文加入活动集合，卸载时移除（layout effect，保证首个按键前生效）。
 */
function useRegisterKeybindingContext(context, t0) {
  let $ = useMemoCache(5);
  let isActive = t0 === undefined ? true : t0;
  let keybindingContext = useKeybindingContext();
  let t1;
  let t2;
  if ($[0] !== context || $[1] !== isActive || $[2] !== keybindingContext) {
    t1 = () => {
      if (!keybindingContext || !isActive) {
        return;
      }
      keybindingContext.registerActiveContext(context);
      return () => {
        keybindingContext.unregisterActiveContext(context);
      };
    };
    t2 = [context, keybindingContext, isActive];
    $[0] = context;
    $[1] = isActive;
    $[2] = keybindingContext;
    $[3] = t1;
    $[4] = t2;
  } else {
    t1 = $[3];
    t2 = $[4];
  }
  useLayoutEffect(t1, t2);
}
export { useKeybindingContext, KeybindingProvider, useRegisterKeybindingContext };
