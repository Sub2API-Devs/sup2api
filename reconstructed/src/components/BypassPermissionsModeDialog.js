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
import { init_react_production, P, R } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isShuttingDown, gracefulShutdownSync } from "../utils/gracefulShutdown.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { Newline } from "../ink/components/Input.js";
import { Dialog } from "./design-system/Dialog.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-styvqsd2.js:13694-13698 placement
init_react_production();
//@ chunk-styvqsd2.js:13698-13762 fingerprint = _temp (1)
function logBypassDialogShown() {
  logEvent("tengu_bypass_permissions_mode_dialog_shown", {});
}
//@ chunk-styvqsd2.js:13762-15105 fingerprint = BypassPermissionsModeDialog (0.672)
/**
 * Bypass Permissions 模式确认：说明不会再请求许可的风险，接受写入 userSettings，拒绝退出。
 */
function BypassPermissionsModeDialog(props) {
  let $ = w(8);
  let { onAccept, storageV5 } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  P(logBypassDialogShown, t1);
  let p = R(false);
  let u;
  if ($[1] !== onAccept || $[2] !== storageV5) {
    u = function onChange(value) {
      if (p.current || isShuttingDown()) {
        return;
      }
      q: switch (((p.current = true), value)) {
        case "accept": {
          logEvent("tengu_bypass_permissions_mode_dialog_accept", {});
          updateSettingsForSource(
            "userSettings",
            {
              skipDangerousModePermissionPrompt: true,
            },
            undefined,
            storageV5,
          );
          onAccept();
          break q;
        }
        case "decline": {
          gracefulShutdownSync(1);
        }
      }
    };
    $[1] = onAccept;
    $[2] = storageV5;
    $[3] = u;
  } else u = $[3];
  let onChange = u;
  let f;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    f = () => {
      p.current = true;
      gracefulShutdownSync(0);
    };
    $[4] = f;
  } else f = $[4];
  let onCancel = f;
  let g;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    g = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Text, {
          children: [
            "In Bypass Permissions mode, Claude Code will not ask for your approval before running potentially dangerous commands.",
            jsxProd_default(Newline, {}),
            "This mode should only be used in a sandboxed container/VM that has restricted internet access and can easily be restored if damaged.",
          ],
        }),
        jsxProd_default(Text, {
          children:
            "By proceeding, you accept all responsibility for actions taken while running in Bypass Permissions mode.",
        }),
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/security",
        }),
      ],
    });
    $[5] = g;
  } else g = $[5];
  let t5;
  if ($[6] !== onChange) {
    t5 = jsxProd_default_2(Dialog, {
      title: "WARNING: Claude Code running in Bypass Permissions mode",
      color: "error",
      onCancel,
      children: [
        g,
        jsxProd_default(ConfirmSelect, {
          hideIndexes: true,
          cancelFirst: true,
          focus: "cancel",
          confirmLabel: "Yes, I accept",
          cancelLabel: "No, exit",
          onConfirm: () => onChange("accept"),
          onCancel: () => onChange("decline"),
        }),
      ],
    });
    $[6] = onChange;
    $[7] = t5;
  } else t5 = $[7];
  return t5;
}
