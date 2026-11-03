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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../AppRoot.js";
import { getBaseRenderOptions } from "../../utils/renderOptions.js";
import { logError } from "../../utils/log.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputClock } from "../../ink/components/Input.js";
import { ManagedSettingsSecurityDialogHost } from "./ManagedSettingsSecurityDialog.js";

/**
 * 在 REPL 之外单独渲染托管设置安全确认对话框。
 */
//@ chunk-kz1epgqe.js:480-1002 placement = checkManagedSettingsSecurity (0.439)
var showStandaloneSecurityDialog = (g, s, u) =>
  new Promise((a, c) => {
    let n = !1,
      o = null;
    function i(resolve) {
      return o !== null && !isWithinRecentInput(resolve, o);
    }
    (async () => {
      let {
        rerender: rerender,
        unmount: unmount,
        waitUntilExit: waitUntilExit,
      } = await render(
        e(
          AppRoot,
          {
            children: e(StandaloneSecurityDialog, {
              settings: g,
              baseline: u,
              onAccept: (r) => {
                if (!i(r)) return !1;
                if (((n = !0), a("approved"), rerender(null), !s)) unmount();
              },
              onReject: (r) => {
                if (!i(r)) return !1;
                if (((n = !0), a("rejected"), rerender(null), !s)) unmount();
              },
            }),
          },
          "managed-settings-security",
        ),
        getBaseRenderOptions(!1),
      );
      if (((o = Date.now()), await waitUntilExit(), !n)) {
        let r = Error("Managed-settings consent dialog exited without an answer");
        (logError(r), c(r));
      }
    })().catch((t) => {
      (logError(t), c(t));
    });
  });
/**
 * 独立渲染的托管设置安全确认对话框
 */
//@ chunk-kz1epgqe.js:1002-1401 placement
function StandaloneSecurityDialog(g) {
  let o = w(11),
    { settings: settings, baseline: baseline, onAccept: onAccept, onReject: onReject } = g,
    n = useInputClock(),
    i;
  if (o[0] !== n || o[1] !== onAccept) ((i = () => onAccept(n)), (o[0] = n), (o[1] = onAccept), (o[2] = i));
  else i = o[2];
  let t;
  if (o[3] !== n || o[4] !== onReject) ((t = () => onReject(n)), (o[3] = n), (o[4] = onReject), (o[5] = t));
  else t = o[5];
  let p;
  if (o[6] !== baseline || o[7] !== settings || o[8] !== i || o[9] !== t)
    ((p = e(ManagedSettingsSecurityDialogHost, {
      settings: settings,
      baseline: baseline,
      reveal: "default",
      onAccept: i,
      onReject: t,
    })),
      (o[6] = baseline),
      (o[7] = settings),
      (o[8] = i),
      (o[9] = t),
      (o[10] = p));
  else p = o[10];
  return p;
}

export { showStandaloneSecurityDialog };
