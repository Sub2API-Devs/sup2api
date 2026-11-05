/**
 * hooks/useExitOnCtrlCD.ts
 *
 * 双击 Ctrl-C / Ctrl-D 退出：第一次提示 "Press Ctrl-C again to exit"，超时重置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useExitOnCtrlCD.ts
 * pieces: chunk-2nf232h2.js (2)
 * attribution: placement 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemo, useState, useCallback } from "../../vendor/react/cjs/react.production.js";
import { useApp } from "../ink/components/Input.js";
import { isKbCohesionFixesOn } from "../utils/kbCohesionFixes.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";

//@ chunk-2nf232h2.js:710-897 placement
/**
 * 把双击 Ctrl-C/Ctrl-D 退出逻辑包装成键绑定条目（app:interrupt、app:exit），enabled=false 时返回空列表；同时返回退出提示状态。
 */
function useExitKeybindingEntries(shouldIntercept, exitOverride, isEnabled = true) {
  let { handleInterrupt, handleExit, exitState } = useExitOnCtrlCD(exitOverride, shouldIntercept);
  return {
    entries: useMemo(
      () =>
        isEnabled
          ? [
              {
                action: "app:interrupt",
                run: handleInterrupt,
              },
              {
                action: "app:exit",
                run: handleExit,
              },
            ]
          : [],
      [isEnabled, handleInterrupt, handleExit],
    ),
    exitState,
  };
}
//@ chunk-2nf232h2.js:897-1290 fingerprint (2.1.88 match: useExitOnCtrlCD, 0.787)
/**
 * 双击退出：app:interrupt（Ctrl-C）/app:exit（Ctrl-D）第一次只显示 "Press X again to exit"，超时内再按才退出。
 */
function useExitOnCtrlCD(shouldIntercept, exitOverride) {
  let { exit } = useApp();
  let [exitState, setExitState] = useState({
    pending: false,
    keyName: null,
  });
  let exitFn = useMemo(() => exitOverride ?? exit, [exitOverride, exit]);
  let usesShortcutDisplay = isKbCohesionFixesOn();
  let shortcutDisplay = useShortcutDisplay("app:interrupt", "Global", "Ctrl-C");
  let shortcutDisplay_2 = useShortcutDisplay("app:exit", "Global", "Ctrl-D");
  let keyName = usesShortcutDisplay && shortcutDisplay ? shortcutDisplay : "Ctrl-C";
  let keyName_2 = usesShortcutDisplay && shortcutDisplay_2 ? shortcutDisplay_2 : "Ctrl-D";
  let handleCtrlCDoublePress = useDoublePress(
    (pending) =>
      setExitState({
        pending,
        keyName,
      }),
    exitFn,
  );
  let handleCtrlDDoublePress = useDoublePress(
    (pending) =>
      setExitState({
        pending,
        keyName: keyName_2,
      }),
    exitFn,
  );
  let handleInterrupt = useCallback(() => {
    if (shouldIntercept?.()) return;
    handleCtrlCDoublePress();
  }, [handleCtrlCDoublePress, shouldIntercept]);
  let handleExit = useCallback(() => {
    handleCtrlDDoublePress();
  }, [handleCtrlDDoublePress]);
  return {
    handleInterrupt,
    handleExit,
    exitState,
  };
}
export { useExitOnCtrlCD, useExitKeybindingEntries };
