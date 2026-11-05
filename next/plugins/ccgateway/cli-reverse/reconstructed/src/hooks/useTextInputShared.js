/**
 * hooks/useTextInputShared.ts
 *
 * 文本输入共享逻辑（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3t80v0fz.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { clipboardImageHintNoticeSpec } from "./useClipboardImageHint.js";
import { useNotifications } from "../context/notifications.js";
import { useClock } from "../ink/components/ClockContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3t80v0fz.js:1468-1472 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3t80v0fz.js:1468", () => {
  init_react_production();
});
//@ chunk-3t80v0fz.js:1472-2039 placement
/**
 * 依次运行一组 effect 槽（依赖变化时重跑）。
 */
function useEffectSlots(specs, props) {
  let [slots] = useState(() =>
    specs.map((spec) => {
      let setupResult = spec.setup();
      return {
        effect: typeof setupResult === "function" ? setupResult : setupResult.effect,
        dispose: typeof setupResult === "function" ? undefined : setupResult.dispose,
        deps: null,
        cleanup: undefined,
      };
    }),
  );
  let propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
    let getProps = () => propsRef.current;
    let dirtySlots = [];
    specs.forEach((spec, index) => {
      let slot = slots[index];
      if (!slot) return;
      let deps = spec.deps ? spec.deps(props) : [];
      if (slot.deps !== null && shallowArrayEqual(slot.deps, deps)) return;
      dirtySlots.push({
        slot,
        deps,
      });
    });
    for (let { slot } of dirtySlots) {
      slot.cleanup?.();
      slot.cleanup = undefined;
    }
    for (let { slot, deps } of dirtySlots) {
      slot.deps = deps;
      slot.cleanup = slot.effect(props, getProps);
    }
  });
  useEffect(
    () => () => {
      for (let slot of slots) {
        slot.cleanup?.();
        slot.cleanup = undefined;
        slot.deps = null;
        slot.dispose?.();
      }
    },
    [slots],
  );
}
//@ chunk-3t80v0fz.js:2039-2158 placement
function shallowArrayEqual(deps, previousDeps) {
  if (deps.length !== previousDeps.length) return false;
  for (let index = 0; index < deps.length; index++)
    if (!Object.is(deps[index], previousDeps[index])) return false;
  return true;
}
//@ chunk-3t80v0fz.js:2158-2170 placement
var SHARED_NOTICE_SPECS = [clipboardImageHintNoticeSpec];
//@ chunk-3t80v0fz.js:2170-2331 placement
/**
 * 文本输入共享 effect（焦点、粘贴图片、通知）。
 */
function useTextInputEffects({ isTerminalFocused, canPasteImages }) {
  let { addNotification } = useNotifications();
  let clock = useClock();
  useEffectSlots(SHARED_NOTICE_SPECS, {
    isTerminalFocused,
    canPasteImages,
    addNotification,
    clock,
  });
}
//@ chunk-3t80v0fz.js:2331-2335 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3t80v0fz.js:2331", () => {
  init_react_production();
});
//@ chunk-3t80v0fz.js:2335-2339 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3t80v0fz.js:2335", () => {
  init_react_production();
});
export { useTextInputEffects, useEffectSlots };
