/**
 * hooks/useExitOnCtrlCD.ts
 *
 * 双击 Ctrl-C / Ctrl-D 退出：第一次提示 "Press Ctrl-C again to exit"，超时重置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useExitOnCtrlCD.ts
 * pieces: chunk-1kwgxcw6.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { Q, y, ce } from "../../vendor/react/cjs/react.production.js";
import { useApp } from "../ink/components/Input.js";
import { CC } from "../utils/kbCohesionFixes.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";

/**
 * 把双击 Ctrl-C/Ctrl-D 退出逻辑包装成键绑定条目（app:interrupt、app:exit），enabled=false 时返回空列表；同时返回退出提示状态。
 */
//@ chunk-1kwgxcw6.js:710-897 placement
function useExitKeybindingEntries(l, a, n = !0) {
  let {
    handleInterrupt: handleInterrupt,
    handleExit: handleExit,
    exitState: exitState,
  } = useExitOnCtrlCD(a, l);
  return {
    entries: Q(
      () =>
        n
          ? [
              { action: "app:interrupt", run: handleInterrupt },
              { action: "app:exit", run: handleExit },
            ]
          : [],
      [n, handleInterrupt, handleExit],
    ),
    exitState: exitState,
  };
}
/**
 * 双击退出：app:interrupt（Ctrl-C）/app:exit（Ctrl-D）第一次只显示 "Press X again to exit"，超时内再按才退出。
 */
//@ chunk-1kwgxcw6.js:897-1290 fingerprint = useExitOnCtrlCD (0.787)
function useExitOnCtrlCD(l, a) {
  let { exit: exit } = useApp(),
    [o, r] = y({ pending: !1, keyName: null }),
    exitFn = Q(() => a ?? exit, [a, exit]),
    i = CC(),
    u = useShortcutDisplay("app:interrupt", "Global", "Ctrl-C"),
    p = useShortcutDisplay("app:exit", "Global", "Ctrl-D"),
    x = i && u ? u : "Ctrl-C",
    m = i && p ? p : "Ctrl-D",
    handleCtrlCDoublePress = useDoublePress((pending) => r({ pending: pending, keyName: x }), exitFn),
    handleCtrlDDoublePress = useDoublePress((pending) => r({ pending: pending, keyName: m }), exitFn),
    handleInterrupt = ce(() => {
      if (l?.()) return;
      handleCtrlCDoublePress();
    }, [handleCtrlCDoublePress, l]),
    handleExit = ce(() => {
      handleCtrlDDoublePress();
    }, [handleCtrlDDoublePress]);
  return { handleInterrupt: handleInterrupt, handleExit: handleExit, exitState: o };
}

export { useExitOnCtrlCD, useExitKeybindingEntries };
