/**
 * components/ModelPinUpdateDialog.tsx
 *
 * 2.1.316 新增：提示把设置里固定的模型更新为同档新版本的对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jxwr2fwk.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-jxwr2fwk.js:13623-14918 placement
/**
 * 提示"有更新的同档模型"，可把设置里固定的模型更新为最新版本（需重启）。
 */
function ModelPinUpdateDialog(props) {
  let $ = useMemoCache(27);
  let { tierLabel, fromName, toName, toProviderId, onDone } = props;
  const title = `Newer ${tierLabel} model available`;
  let onCancel;
  if ($[0] !== onDone) {
    onCancel = () => onDone(false);
    $[0] = onDone;
    $[1] = onCancel;
  } else onCancel = $[1];
  let pinnedText;
  if ($[2] !== fromName) {
    pinnedText = jsxProd_default_2(Text, {
      children: [
        "Currently pinned: ",
        jsxProd_default(Text, {
          bold: true,
          children: fromName,
        }),
      ],
    });
    $[2] = fromName;
    $[3] = pinnedText;
  } else pinnedText = $[3];
  let toNameText;
  if ($[4] !== toName) {
    toNameText = jsxProd_default(Text, {
      bold: true,
      children: toName,
    });
    $[4] = toName;
    $[5] = toNameText;
  } else toNameText = $[5];
  let noteText;
  if ($[6] !== toProviderId) {
    noteText = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["(", toProviderId, ")"],
    });
    $[6] = toProviderId;
    $[7] = noteText;
  } else noteText = $[7];
  let bodyElement;
  if ($[8] !== toNameText || $[9] !== noteText) {
    bodyElement = jsxProd_default_2(Text, {
      children: ["Latest available: ", toNameText, " ", noteText],
    });
    $[8] = toNameText;
    $[9] = noteText;
    $[10] = bodyElement;
  } else bodyElement = $[10];
  let boxElement;
  if ($[11] !== pinnedText || $[12] !== bodyElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [pinnedText, bodyElement],
    });
    $[11] = pinnedText;
    $[12] = bodyElement;
    $[13] = boxElement;
  } else boxElement = $[13];
  let actionsElement;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    actionsElement = jsxProd_default(Text, {
      dimColor: true,
      children: "Claude Code will restart to apply.",
    });
    $[14] = actionsElement;
  } else actionsElement = $[14];
  let dialogElement;
  if ($[15] !== toName) {
    dialogElement = jsxProd_default_2(Text, {
      children: ["Update settings to use ", toName, "?", " ", actionsElement],
    });
    $[15] = toName;
    $[16] = dialogElement;
  } else dialogElement = $[16];
  let confirmSelectElement;
  if ($[17] !== onDone) {
    confirmSelectElement = jsxProd_default(ConfirmSelect, {
      onConfirm: () => onDone(true),
      onCancel: () => onDone(false),
    });
    $[17] = onDone;
    $[18] = confirmSelectElement;
  } else confirmSelectElement = $[18];
  let children;
  if ($[19] !== confirmSelectElement || $[20] !== boxElement || $[21] !== dialogElement) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [boxElement, dialogElement, confirmSelectElement],
    });
    $[19] = confirmSelectElement;
    $[20] = boxElement;
    $[21] = dialogElement;
    $[22] = children;
  } else children = $[22];
  let updateDialogElement;
  if ($[23] !== title || $[24] !== children || $[25] !== onCancel) {
    updateDialogElement = jsxProd_default(Dialog, {
      title,
      color: "permission",
      onCancel,
      exitOnCtrlCD: true,
      children,
    });
    $[23] = title;
    $[24] = children;
    $[25] = onCancel;
    $[26] = updateDialogElement;
  } else updateDialogElement = $[26];
  return updateDialogElement;
}
export { ModelPinUpdateDialog };
