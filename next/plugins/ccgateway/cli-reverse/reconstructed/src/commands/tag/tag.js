/**
 * commands/tag/tag.tsx
 *
 * （切分有误）确认对话框、tagName 判断、主题设置组件；/tag 已删除
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/tag/tag.tsx
 * pieces: chunk-t7736nf9.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  REMOTE_CONTROL_OFF_BODY,
  TURN_ON_AND_SEND_LABEL,
  REMOTE_CONTROL_OFF_TITLE,
} from "../send-to-project/remoteControlOffRequest.js";
import { ConfirmSelect, CONFIRM_ARM_DELAY_MS } from "../../components/design-system/ConfirmSelect.js";
import { Dialog } from "../../components/design-system/Dialog.js";

//@ chunk-t7736nf9.js:14820-15344 callgraph-fingerprint (2.1.88 match: ConfirmRemoveTag, 0.216)
function ConfirmRemoveTag(props) {
  let $ = useMemoCache(8);
  let { answer } = props;
  let onCancel;
  if ($[0] !== answer) {
    onCancel = () =>
      answer({
        choice: "no",
      });
    $[0] = answer;
    $[1] = onCancel;
  } else onCancel = $[1];
  let bodyText;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    bodyText = jsxProd_default(Text, {
      children: REMOTE_CONTROL_OFF_BODY,
    });
    $[2] = bodyText;
  } else bodyText = $[2];
  let children;
  if ($[3] !== answer) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        bodyText,
        jsxProd_default(ConfirmSelect, {
          armAfterMs: CONFIRM_ARM_DELAY_MS,
          hideIndexes: true,
          confirmLabel: TURN_ON_AND_SEND_LABEL,
          cancelLabel: "No",
          onConfirm: () =>
            answer({
              choice: "turn_on",
            }),
          onCancel: () =>
            answer({
              choice: "no",
            }),
        }),
      ],
    });
    $[3] = answer;
    $[4] = children;
  } else children = $[4];
  let dialog;
  if ($[5] !== onCancel || $[6] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: REMOTE_CONTROL_OFF_TITLE,
      color: "suggestion",
      onCancel,
      children,
    });
    $[5] = onCancel;
    $[6] = children;
    $[7] = dialog;
  } else dialog = $[7];
  return dialog;
}
export { ConfirmRemoveTag };
