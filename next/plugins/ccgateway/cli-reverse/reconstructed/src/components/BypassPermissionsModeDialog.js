/**
 * components/BypassPermissionsModeDialog.tsx
 *
 * 进入 Bypass Permissions 模式前的风险确认对话框，接受后写入 userSettings 并记录事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/BypassPermissionsModeDialog.tsx
 * pieces: chunk-grena0zy.js (3)
 * attribution: placement 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-grena0zy.js:14842-14846 placement
init_react_production();
//@ chunk-grena0zy.js:14846-14910 fingerprint (2.1.88 match: _temp, 1)
function logBypassDialogShown() {
  logEvent("tengu_bypass_permissions_mode_dialog_shown", {});
}
//@ chunk-grena0zy.js:14910-16253 fingerprint (2.1.88 match: BypassPermissionsModeDialog, 0.672)
/**
 * Bypass Permissions 模式确认：说明不会再请求许可的风险，接受写入 userSettings，拒绝退出。
 */
function BypassPermissionsModeDialog(props) {
  let $ = useMemoCache(8);
  let { onAccept, storageV5 } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  useEffect(logBypassDialogShown, t1);
  let answeredRef = useRef(false);
  let selectHandlerCached;
  if ($[1] !== onAccept || $[2] !== storageV5) {
    selectHandlerCached = function onChange(value) {
      if (answeredRef.current || isShuttingDown()) {
        return;
      }
      q: switch (((answeredRef.current = true), value)) {
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
    $[3] = selectHandlerCached;
  } else selectHandlerCached = $[3];
  let onChange = selectHandlerCached;
  let cancelHandler;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    cancelHandler = () => {
      answeredRef.current = true;
      gracefulShutdownSync(0);
    };
    $[4] = cancelHandler;
  } else cancelHandler = $[4];
  let onCancel = cancelHandler;
  let warningElement;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    warningElement = jsxProd_default_2(Box, {
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
    $[5] = warningElement;
  } else warningElement = $[5];
  let t5;
  if ($[6] !== onChange) {
    t5 = jsxProd_default_2(Dialog, {
      title: "WARNING: Claude Code running in Bypass Permissions mode",
      color: "error",
      onCancel,
      children: [
        warningElement,
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
export { BypassPermissionsModeDialog };
