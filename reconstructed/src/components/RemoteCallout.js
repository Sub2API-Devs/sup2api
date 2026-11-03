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
import { w } from "../../vendor/react/compiler-runtime.js";
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
import { withHideWhile } from "./dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, _enum } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-18hwfzwa.js:1195547-1196852 fingerprint = RemoteCallout (0.769)
function RemoteCallout(props) {
  let $ = w(12);
  let { onDone, defaultFocusValue } = props;
  let confirmArmed = useConfirmArmed(RECENT_INPUT_GUARD_MS_3);
  let ke;
  if ($[0] !== confirmArmed || $[1] !== onDone) {
    ke = function Be(current) {
      if (!confirmArmed) {
        return;
      }
      onDone(current);
    };
    $[0] = confirmArmed;
    $[1] = onDone;
    $[2] = ke;
  } else ke = $[2];
  let Be = ke;
  let He;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    He = [
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
    $[3] = He;
  } else He = $[3];
  let options = He;
  let ze;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    ze = jsxProd_default_2(Box, {
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
    $[4] = ze;
  } else ze = $[4];
  const isDisabled = !confirmArmed;
  let onCancel;
  if ($[5] !== Be) {
    onCancel = () => Be("dismiss");
    $[5] = Be;
    $[6] = onCancel;
  } else onCancel = $[6];
  let kt;
  if ($[7] !== defaultFocusValue || $[8] !== Be || $[9] !== isDisabled || $[10] !== onCancel) {
    kt = jsxProd_default(PermissionDialog_2, {
      title: "Remote Control",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [
          ze,
          jsxProd_default(Box, {
            children: jsxProd_default(ModelSelector, {
              defaultFocusValue,
              options,
              isDisabled,
              onChange: Be,
              onCancel,
            }),
          }),
        ],
      }),
    });
    $[7] = defaultFocusValue;
    $[8] = Be;
    $[9] = isDisabled;
    $[10] = onCancel;
    $[11] = kt;
  } else kt = $[11];
  return kt;
}
//@ chunk-18hwfzwa.js:1196852-1196896 fingerprint = shouldShowRemoteCallout (0.779)
function shouldShowRemoteCallout() {
  return !getGlobalConfig().remoteDialogSeen;
}
//@ chunk-drvxna8v.js:299-453 placement
/**
 * Remote Control 首次提示对话框的定义（结果 enable/dismiss/cancelled，面板或草稿打开时隐藏）。
 */
var REMOTE_CALLOUT_DIALOG = withHideWhile({
  kind: "remote_callout",
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => _enum(["enable", "dismiss", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
export { REMOTE_CALLOUT_DIALOG, shouldShowRemoteCallout, RemoteCallout };
