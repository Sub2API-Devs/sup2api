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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputClock } from "../../ink/components/Input.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog.js";

//@ chunk-kz1epgqe.js:480-1002 placement = checkManagedSettingsSecurity (0.439)
/**
 * 在 REPL 之外单独渲染托管设置安全确认对话框。
 */
var showStandaloneSecurityDialog = (settings, s, baseline) =>
  new Promise((resolve, reject) => {
    let n = false;
    let o = null;
    function i(resolve) {
      return o !== null && !isWithinRecentInput(resolve, o);
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
                if (!i(resolve_2)) return false;
                n = true;
                resolve("approved");
                rerender(null);
                if (!s) unmount();
              },
              onReject: (resolve_2) => {
                if (!i(resolve_2)) return false;
                n = true;
                resolve("rejected");
                rerender(null);
                if (!s) unmount();
              },
            }),
          },
          "managed-settings-security",
        ),
        getBaseRenderOptions(false),
      );
      o = Date.now();
      await waitUntilExit();
      if (!n) {
        let r = Error("Managed-settings consent dialog exited without an answer");
        logError(r);
        reject(r);
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
  let o = w(11);
  let { settings, baseline, onAccept, onReject } = props;
  let inputClock = useInputClock();
  let onAccept_2;
  if (o[0] !== inputClock || o[1] !== onAccept) {
    onAccept_2 = () => onAccept(inputClock);
    o[0] = inputClock;
    o[1] = onAccept;
    o[2] = onAccept_2;
  } else onAccept_2 = o[2];
  let onReject_2;
  if (o[3] !== inputClock || o[4] !== onReject) {
    onReject_2 = () => onReject(inputClock);
    o[3] = inputClock;
    o[4] = onReject;
    o[5] = onReject_2;
  } else onReject_2 = o[5];
  let p;
  if (o[6] !== baseline || o[7] !== settings || o[8] !== onAccept_2 || o[9] !== onReject_2) {
    p = jsxProd_default(ManagedSettingsSecurityDialogHost, {
      settings,
      baseline,
      reveal: "default",
      onAccept: onAccept_2,
      onReject: onReject_2,
    });
    o[6] = baseline;
    o[7] = settings;
    o[8] = onAccept_2;
    o[9] = onReject_2;
    o[10] = p;
  } else p = o[10];
  return p;
}
export { showStandaloneSecurityDialog };
