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
import { So } from "../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { getGlobalConfig } from "../utils/config.js";
import { withHideWhile } from "./dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, U } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-18hwfzwa.js:1195547-1196852 fingerprint = RemoteCallout (0.769)
function RemoteCallout(h) {
  let $ = w(12),
    { onDone: onDone, defaultFocusValue: defaultFocusValue } = h,
    L = useConfirmArmed(So),
    ke;
  if ($[0] !== L || $[1] !== onDone)
    ((ke = function Be(current) {
      if (!L) {
        return;
      }
      onDone(current);
    }),
      ($[0] = L),
      ($[1] = onDone),
      ($[2] = ke));
  else ke = $[2];
  let Be = ke,
    He;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((He = [
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
    ]),
      ($[3] = He));
  else He = $[3];
  let We = He,
    ze;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((ze = r(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: [
        e(Text, {
          children:
            "Take this session with you and pick up right where you left off on any device. Open the Code tab in the Claude mobile app, or visit claude.ai/code in a browser.",
        }),
        e(Text, { children: " " }),
        e(Text, {
          children:
            "The session keeps running on this machine. Use your other devices as a remote control. Disconnect anytime with /remote-control.",
        }),
      ],
    })),
      ($[4] = ze));
  else ze = $[4];
  const Xe = !L;
  let rt;
  if ($[5] !== Be) ((rt = () => Be("dismiss")), ($[5] = Be), ($[6] = rt));
  else rt = $[6];
  let kt;
  if ($[7] !== defaultFocusValue || $[8] !== Be || $[9] !== Xe || $[10] !== rt)
    ((kt = e(PermissionDialog_2, {
      title: "Remote Control",
      children: r(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [
          ze,
          e(Box, {
            children: e(ModelSelector, {
              defaultFocusValue: defaultFocusValue,
              options: We,
              isDisabled: Xe,
              onChange: Be,
              onCancel: rt,
            }),
          }),
        ],
      }),
    })),
      ($[7] = defaultFocusValue),
      ($[8] = Be),
      ($[9] = Xe),
      ($[10] = rt),
      ($[11] = kt));
  else kt = $[11];
  return kt;
}
//@ chunk-18hwfzwa.js:1196852-1196896 fingerprint = shouldShowRemoteCallout (0.779)
function shouldShowRemoteCallout() {
  return !getGlobalConfig().remoteDialogSeen;
}
/**
 * Remote Control 首次提示对话框的定义（结果 enable/dismiss/cancelled，面板或草稿打开时隐藏）。
 */
//@ chunk-drvxna8v.js:299-453 placement
var REMOTE_CALLOUT_DIALOG = withHideWhile({
  kind: "remote_callout",
  payload: DoctorLazy(() => u({})),
  result: DoctorLazy(() => U(["enable", "dismiss", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});

export { REMOTE_CALLOUT_DIALOG, shouldShowRemoteCallout, RemoteCallout };
