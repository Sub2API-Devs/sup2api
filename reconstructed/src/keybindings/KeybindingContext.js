/**
 * keybindings/KeybindingContext.tsx
 *
 * KeybindingContext 与 Provider：解析按键、取显示文字、注册动作处理器、活动上下文登记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/KeybindingContext.tsx
 * pieces: chunk-8pssrarc.js (5)
 * attribution: affinity 1, fingerprint 2, layout 2
 */
import { qt, Se, zt } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { resolveKeyWithChordState } from "./resolver.js";
import { toInkKeyEvent, noop, didHandlerConsume } from "./keyNames.js";
import { getActionDisplayText } from "./match.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-8pssrarc.js:1788-1803 affinity
var KeybindingContext = qt(null);
//@ chunk-8pssrarc.js:1803-3569 fingerprint = KeybindingProvider (0.611)
/**
 * KeybindingContext 的 Provider：对外提供 resolve（按当前待定和弦解析）、getDisplayText、registerHandler（按动作登记处理器并发 handlersChanged）、hasHandler/runAction（只算非回退处理器）、registerPreDispatch、singleKeyEvent、活动上下文登记等。
 */
function KeybindingProvider(props) {
  let $ = w(33);
  let {
    bindings,
    pendingChordRef,
    pendingChord,
    setPendingChord,
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
    hasHandler = (Ke) => getPrimaryHandlers(handlerRegistryRef.current, Ke).length > 0;
    runAction = (Re) => {
      try {
        return getPrimaryHandlers(handlerRegistryRef.current, Re).some(didHandlerConsume);
      } catch (error) {
        let we = error;
        logError(withTelemetryMessage(toError(we), "Key action handler threw"));
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
  let getSingleKeyEvent;
  if ($[13] !== singleKeyEventRef) {
    getSingleKeyEvent = () => singleKeyEventRef.current;
    $[13] = singleKeyEventRef;
    $[14] = getSingleKeyEvent;
  } else getSingleKeyEvent = $[14];
  let contextValue;
  if (
    $[15] !== activeContexts ||
    $[16] !== bindings ||
    $[17] !== keyHandlerRegistry ||
    $[18] !== pendingChord ||
    $[19] !== registerActiveContext ||
    $[20] !== setPendingChord ||
    $[21] !== resolve ||
    $[22] !== getDisplayText ||
    $[23] !== registerHandler ||
    $[24] !== hasHandler ||
    $[25] !== runAction ||
    $[26] !== registerPreDispatch ||
    $[27] !== getSingleKeyEvent ||
    $[28] !== unregisterActiveContext
  ) {
    contextValue = {
      resolve,
      setPendingChord,
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
      singleKeyEvent: getSingleKeyEvent,
      keyHandlerRegistry,
    };
    $[15] = activeContexts;
    $[16] = bindings;
    $[17] = keyHandlerRegistry;
    $[18] = pendingChord;
    $[19] = registerActiveContext;
    $[20] = setPendingChord;
    $[21] = resolve;
    $[22] = getDisplayText;
    $[23] = registerHandler;
    $[24] = hasHandler;
    $[25] = runAction;
    $[26] = registerPreDispatch;
    $[27] = getSingleKeyEvent;
    $[28] = unregisterActiveContext;
    $[29] = contextValue;
  } else contextValue = $[29];
  let value = contextValue;
  let t6;
  if ($[30] !== children || $[31] !== value) {
    t6 = jsxProd_default(KeybindingContext.Provider, {
      value,
      children,
    });
    $[30] = children;
    $[31] = value;
    $[32] = t6;
  } else t6 = $[32];
  return t6;
}
//@ chunk-8pssrarc.js:3569-3634 layout
function getPrimaryHandlers(n, t) {
  return [...(n.get(t) ?? [])].filter((r) => !r.fallback);
}
//@ chunk-8pssrarc.js:3634-3661 layout
function useKeybindingContext() {
  return Se(KeybindingContext);
}
//@ chunk-8pssrarc.js:3661-3917 fingerprint = useRegisterKeybindingContext (1)
/**
 * 组件挂载且 isActive 时把上下文加入活动集合，卸载时移除（layout effect，保证首个按键前生效）。
 */
function useRegisterKeybindingContext(context, t0) {
  let $ = w(5);
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
  zt(t1, t2);
}
export { useKeybindingContext, useRegisterKeybindingContext, KeybindingProvider };
