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
import { toInkKeyEvent, he, fe } from "./keyNames.js";
import { getActionDisplayText } from "./match.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-8pssrarc.js:1788-1803 affinity
var KeybindingContext = qt(null);
/**
 * KeybindingContext 的 Provider：对外提供 resolve（按当前待定和弦解析）、getDisplayText、registerHandler（按动作登记处理器并发 handlersChanged）、hasHandler/runAction（只算非回退处理器）、registerPreDispatch、singleKeyEvent、活动上下文登记等。
 */
//@ chunk-8pssrarc.js:1803-3569 fingerprint = KeybindingProvider (0.611)
function KeybindingProvider(t0) {
  let o = w(33),
    {
      bindings: bindings,
      pendingChordRef: pendingChordRef,
      pendingChord: pendingChord,
      setPendingChord: setPendingChord,
      activeContexts: activeContexts,
      registerActiveContext: registerActiveContext,
      unregisterActiveContext: unregisterActiveContext,
      handlerRegistryRef: handlerRegistryRef,
      preDispatchRef: preDispatchRef,
      singleKeyEventRef: singleKeyEventRef,
      keyHandlerRegistry: keyHandlerRegistry,
      children: children,
    } = t0,
    resolve;
  if (o[0] !== bindings || o[1] !== pendingChordRef)
    ((resolve = (xe, me, be) =>
      resolveKeyWithChordState(toInkKeyEvent(xe, me), be, bindings, pendingChordRef.current)),
      (o[0] = bindings),
      (o[1] = pendingChordRef),
      (o[2] = resolve));
  else resolve = o[2];
  let getDisplayText;
  if (o[3] !== bindings)
    ((getDisplayText = (action, context) => getActionDisplayText(action, context, bindings)),
      (o[3] = bindings),
      (o[4] = getDisplayText));
  else getDisplayText = o[4];
  let registerHandler;
  if (o[5] !== handlerRegistryRef || o[6] !== keyHandlerRegistry)
    ((registerHandler = (registration) => {
      let registry = handlerRegistryRef.current;
      if (!registry) {
        return he;
      }
      if (!registry.has(registration.action)) registry.set(registration.action, new Set());
      return (
        registry.get(registration.action).add(registration),
        keyHandlerRegistry.handlersChanged.emit(),
        () => {
          let handlers = registry.get(registration.action);
          if (handlers) {
            if ((handlers.delete(registration), handlers.size === 0)) registry.delete(registration.action);
            keyHandlerRegistry.handlersChanged.emit();
          }
        }
      );
    }),
      (o[5] = handlerRegistryRef),
      (o[6] = keyHandlerRegistry),
      (o[7] = registerHandler));
  else registerHandler = o[7];
  let hasHandler, runAction;
  if (o[8] !== handlerRegistryRef)
    ((hasHandler = (Ke) => getPrimaryHandlers(handlerRegistryRef.current, Ke).length > 0),
      (runAction = (Re) => {
        try {
          return getPrimaryHandlers(handlerRegistryRef.current, Re).some(fe);
        } catch (error) {
          let we = error;
          return (logError(withTelemetryMessage(toError(we), "Key action handler threw")), !1);
        }
      }),
      (o[8] = handlerRegistryRef),
      (o[9] = hasHandler),
      (o[10] = runAction));
  else ((hasHandler = o[9]), (runAction = o[10]));
  let y;
  if (o[11] !== preDispatchRef)
    ((y = (action_0) => (
      preDispatchRef.current.add(action_0),
      () => preDispatchRef.current.delete(action_0)
    )),
      (o[11] = preDispatchRef),
      (o[12] = y));
  else y = o[12];
  let getSingleKeyEvent;
  if (o[13] !== singleKeyEventRef)
    ((getSingleKeyEvent = () => singleKeyEventRef.current),
      (o[13] = singleKeyEventRef),
      (o[14] = getSingleKeyEvent));
  else getSingleKeyEvent = o[14];
  let contextValue;
  if (
    o[15] !== activeContexts ||
    o[16] !== bindings ||
    o[17] !== keyHandlerRegistry ||
    o[18] !== pendingChord ||
    o[19] !== registerActiveContext ||
    o[20] !== setPendingChord ||
    o[21] !== resolve ||
    o[22] !== getDisplayText ||
    o[23] !== registerHandler ||
    o[24] !== hasHandler ||
    o[25] !== runAction ||
    o[26] !== y ||
    o[27] !== getSingleKeyEvent ||
    o[28] !== unregisterActiveContext
  )
    ((contextValue = {
      resolve: resolve,
      setPendingChord: setPendingChord,
      getDisplayText: getDisplayText,
      bindings: bindings,
      pendingChord: pendingChord,
      activeContexts: activeContexts,
      registerActiveContext: registerActiveContext,
      unregisterActiveContext: unregisterActiveContext,
      registerHandler: registerHandler,
      hasHandler: hasHandler,
      runAction: runAction,
      registerPreDispatch: y,
      singleKeyEvent: getSingleKeyEvent,
      keyHandlerRegistry: keyHandlerRegistry,
    }),
      (o[15] = activeContexts),
      (o[16] = bindings),
      (o[17] = keyHandlerRegistry),
      (o[18] = pendingChord),
      (o[19] = registerActiveContext),
      (o[20] = setPendingChord),
      (o[21] = resolve),
      (o[22] = getDisplayText),
      (o[23] = registerHandler),
      (o[24] = hasHandler),
      (o[25] = runAction),
      (o[26] = y),
      (o[27] = getSingleKeyEvent),
      (o[28] = unregisterActiveContext),
      (o[29] = contextValue));
  else contextValue = o[29];
  let _ = contextValue,
    te;
  if (o[30] !== children || o[31] !== _)
    ((te = e(KeybindingContext.Provider, { value: _, children: children })),
      (o[30] = children),
      (o[31] = _),
      (o[32] = te));
  else te = o[32];
  return te;
}
//@ chunk-8pssrarc.js:3569-3634 layout
function getPrimaryHandlers(n, t) {
  return [...(n.get(t) ?? [])].filter((r) => !r.fallback);
}
//@ chunk-8pssrarc.js:3634-3661 layout
function useKeybindingContext() {
  return Se(KeybindingContext);
}
/**
 * 组件挂载且 isActive 时把上下文加入活动集合，卸载时移除（layout effect，保证首个按键前生效）。
 */
//@ chunk-8pssrarc.js:3661-3917 fingerprint = useRegisterKeybindingContext (1)
function useRegisterKeybindingContext(context, t0) {
  let K = w(5),
    isActive = t0 === void 0 ? !0 : t0,
    keybindingContext = useKeybindingContext(),
    u,
    h;
  if (K[0] !== context || K[1] !== isActive || K[2] !== keybindingContext)
    ((u = () => {
      if (!keybindingContext || !isActive) {
        return;
      }
      return (
        keybindingContext.registerActiveContext(context),
        () => {
          keybindingContext.unregisterActiveContext(context);
        }
      );
    }),
      (h = [context, keybindingContext, isActive]),
      (K[0] = context),
      (K[1] = isActive),
      (K[2] = keybindingContext),
      (K[3] = u),
      (K[4] = h));
  else ((u = K[3]), (h = K[4]));
  zt(u, h);
}

export { useKeybindingContext, useRegisterKeybindingContext, KeybindingProvider };
