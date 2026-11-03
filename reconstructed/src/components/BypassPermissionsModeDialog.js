/**
 * components/BypassPermissionsModeDialog.tsx
 *
 * 进入 Bypass Permissions 模式前的风险确认对话框，接受后写入 userSettings 并记录事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BypassPermissionsModeDialog.tsx
 * pieces: chunk-styvqsd2.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { j, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isShuttingDown, gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { Newline } from "../ink/components/Input.js";
import { Dialog } from "./design-system/Dialog.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-styvqsd2.js:13694-13698 placement
j();
//@ chunk-styvqsd2.js:13698-13762 fingerprint = _temp (1)
function logBypassDialogShown() {
  logEvent("tengu_bypass_permissions_mode_dialog_shown", {});
}
/**
 * Bypass Permissions 模式确认：说明不会再请求许可的风险，接受写入 userSettings，拒绝退出。
 */
//@ chunk-styvqsd2.js:13762-15105 fingerprint = BypassPermissionsModeDialog (0.672)
function BypassPermissionsModeDialog(t0) {
  let $ = w(8),
    { onAccept: onAccept, storageV5: storageV5 } = t0,
    l;
  if ($[0] === MEMO_CACHE_SENTINEL) ((l = []), ($[0] = l));
  else l = $[0];
  P(logBypassDialogShown, l);
  let p = R(!1),
    u;
  if ($[1] !== onAccept || $[2] !== storageV5)
    ((u = function i(value) {
      if (p.current || isShuttingDown()) {
        return;
      }
      q: switch (((p.current = !0), value)) {
        case "accept": {
          (logEvent("tengu_bypass_permissions_mode_dialog_accept", {}),
            updateSettingsForSource(
              "userSettings",
              { skipDangerousModePermissionPrompt: !0 },
              void 0,
              storageV5,
            ),
            onAccept());
          break q;
        }
        case "decline": {
          gracefulShutdownSync(1);
        }
      }
    }),
      ($[1] = onAccept),
      ($[2] = storageV5),
      ($[3] = u));
  else u = $[3];
  let i = u,
    f;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((f = () => {
      ((p.current = !0), gracefulShutdownSync(0));
    }),
      ($[4] = f));
  else f = $[4];
  let M = f,
    g;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((g = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        r(Text, {
          children: [
            "In Bypass Permissions mode, Claude Code will not ask for your approval before running potentially dangerous commands.",
            e(Newline, {}),
            "This mode should only be used in a sandboxed container/VM that has restricted internet access and can easily be restored if damaged.",
          ],
        }),
        e(Text, {
          children:
            "By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.",
        }),
        e(Link, { url: "https://code.claude.com/docs/en/security" }),
      ],
    })),
      ($[5] = g));
  else g = $[5];
  let y;
  if ($[6] !== i)
    ((y = r(Dialog, {
      title: "WARNING: Claude Code running in Bypass Permissions mode",
      color: "error",
      onCancel: M,
      children: [
        g,
        e(ConfirmSelect, {
          hideIndexes: !0,
          cancelFirst: !0,
          focus: "cancel",
          confirmLabel: "Yes, I accept",
          cancelLabel: "No, exit",
          onConfirm: () => i("accept"),
          onCancel: () => i("decline"),
        }),
      ],
    })),
      ($[6] = i),
      ($[7] = y));
  else y = $[7];
  return y;
}
