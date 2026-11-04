/**
 * components/RemoteCallout.tsx
 *
 * 首次使用时提示启用 Remote Control（连接到 claude.ai）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/RemoteCallout.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-drvxna8v.js (1)
 * attribution: fingerprint 2, placement 1
 */
import { withHideWhile } from "./dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useConfirmArmed } from "./design-system/ConfirmSelect.js";
import { RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3 } from "../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { getGlobalConfig } from "../utils/config.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-drvxna8v.js:299-453 placement
/**
 * Remote Control 首次提示对话框的定义（结果 enable/dismiss/cancelled，面板或草稿打开时隐藏）。
 */
var REMOTE_CALLOUT_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-drvxna8v.js:299", () => {
  REMOTE_CALLOUT_DIALOG = withHideWhile({
    kind: "remote_callout",
    payload: DoctorLazy(() => objectSchema({})),
    result: DoctorLazy(() => _enum(["enable", "dismiss", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-18hwfzwa.js:1195547-1196852 fingerprint (2.1.88 match: RemoteCallout, 0.769)
function RemoteCallout(props) {
  let $ = useMemoCache(12);
  let { onDone, defaultFocusValue } = props;
  let confirmArmed = useConfirmArmed(RECENT_INPUT_GUARD_MS_3);
  let handleSelect;
  if ($[0] !== confirmArmed || $[1] !== onDone) {
    handleSelect = function choice(current) {
      if (!confirmArmed) {
        return;
      }
      onDone(current);
    };
    $[0] = confirmArmed;
    $[1] = onDone;
    $[2] = handleSelect;
  } else handleSelect = $[2];
  let handleSelectMemo = handleSelect;
  let options;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Enable Remote Control",
        description: "Opens a secure connection to claude.ai.",
        value: "enable",
      },
      {
        label: "Never mind",
        description: "You can always enable it later with /remote-control.",
        value: "dismiss",
      },
    ];
    $[3] = options;
  } else options = $[3];
  let options_2 = options;
  let boxElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    boxElement = jsxProd_default_2(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          children:
            "Take this session with you and pick up right where you left off on any device. Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser.",
        }),
        jsxProd_default(Text, {
          children: " ",
        }),
        jsxProd_default(Text, {
          children:
            "The session keeps running on this machine. Use your other devices as a remote control. Disconnect anytime with /remote-control.",
        }),
      ],
    });
    $[4] = boxElement;
  } else boxElement = $[4];
  const isDisabled = !confirmArmed;
  let onCancel;
  if ($[5] !== handleSelectMemo) {
    onCancel = () => handleSelectMemo("dismiss");
    $[5] = handleSelectMemo;
    $[6] = onCancel;
  } else onCancel = $[6];
  let dialogElement;
  if ($[7] !== defaultFocusValue || $[8] !== handleSelectMemo || $[9] !== isDisabled || $[10] !== onCancel) {
    dialogElement = jsxProd_default(PermissionDialog_2, {
      title: "Remote Control",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [
          boxElement,
          jsxProd_default(Box, {
            children: jsxProd_default(ModelSelector, {
              defaultFocusValue,
              options: options_2,
              isDisabled,
              onChange: handleSelectMemo,
              onCancel,
            }),
          }),
        ],
      }),
    });
    $[7] = defaultFocusValue;
    $[8] = handleSelectMemo;
    $[9] = isDisabled;
    $[10] = onCancel;
    $[11] = dialogElement;
  } else dialogElement = $[11];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1196852-1196896 fingerprint (2.1.88 match: shouldShowRemoteCallout, 0.779)
function shouldShowRemoteCallout() {
  return !getGlobalConfig().remoteDialogSeen;
}
export { REMOTE_CALLOUT_DIALOG, shouldShowRemoteCallout, RemoteCallout };
