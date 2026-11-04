/**
 * components/ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.tsx
 *
 * 2.1.316 新增。在 REPL 之外单独渲染托管设置安全确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kz1epgqe.js (2)
 * attribution: placement 2
 */
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { render } from "../../ink/hooks/useTerminalHooks.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../AppRoot.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import { logError } from "../../utils/log.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useInputClock } from "../../ink/components/Input.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog.js";

//@ chunk-kz1epgqe.js:480-1002 placement (2.1.88 match: checkManagedSettingsSecurity, 0.439)
/**
 * 在 REPL 之外单独渲染托管设置安全确认对话框。
 */
var showStandaloneSecurityDialog = (settings, keepOpen, baseline) =>
  new Promise((resolve, reject) => {
    let answered = false;
    let openedAt = null;
    function isRecentInput(resolve) {
      return openedAt !== null && !isWithinRecentInput(resolve, openedAt);
    }
    (async () => {
      let { rerender, unmount, waitUntilExit } = await render(
        jsxProd_default(
          AppRoot,
          {
            children: jsxProd_default(StandaloneSecurityDialog, {
              settings,
              baseline,
              onAccept: (resolve_2) => {
                if (!isRecentInput(resolve_2)) return false;
                answered = true;
                resolve("approved");
                rerender(null);
                if (!keepOpen) unmount();
              },
              onReject: (resolve_2) => {
                if (!isRecentInput(resolve_2)) return false;
                answered = true;
                resolve("rejected");
                rerender(null);
                if (!keepOpen) unmount();
              },
            }),
          },
          "managed-settings-security",
        ),
        getBaseRenderOptions(false),
      );
      openedAt = Date.now();
      await waitUntilExit();
      if (!answered) {
        let error = Error("Managed-settings consent dialog exited without an answer");
        logError(error);
        reject(error);
      }
    })().catch((error) => {
      logError(error);
      reject(error);
    });
  });
//@ chunk-kz1epgqe.js:1002-1401 placement
/**
 * 独立渲染的托管设置安全确认对话框
 */
function StandaloneSecurityDialog(props) {
  let $ = useMemoCache(11);
  let { settings, baseline, onAccept, onReject } = props;
  let inputClock = useInputClock();
  let onAccept_2;
  if ($[0] !== inputClock || $[1] !== onAccept) {
    onAccept_2 = () => onAccept(inputClock);
    $[0] = inputClock;
    $[1] = onAccept;
    $[2] = onAccept_2;
  } else onAccept_2 = $[2];
  let onReject_2;
  if ($[3] !== inputClock || $[4] !== onReject) {
    onReject_2 = () => onReject(inputClock);
    $[3] = inputClock;
    $[4] = onReject;
    $[5] = onReject_2;
  } else onReject_2 = $[5];
  let host;
  if ($[6] !== baseline || $[7] !== settings || $[8] !== onAccept_2 || $[9] !== onReject_2) {
    host = jsxProd_default(ManagedSettingsSecurityDialogHost, {
      settings,
      baseline,
      reveal: "default",
      onAccept: onAccept_2,
      onReject: onReject_2,
    });
    $[6] = baseline;
    $[7] = settings;
    $[8] = onAccept_2;
    $[9] = onReject_2;
    $[10] = host;
  } else host = $[10];
  return host;
}
export { showStandaloneSecurityDialog };
