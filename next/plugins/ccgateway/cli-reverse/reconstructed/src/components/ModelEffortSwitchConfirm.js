/**
 * components/ModelEffortSwitchConfirm.tsx
 *
 * 2.1.316 新增。切换模型时 effort 变化的确认。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useSetAppState } from "../state/AppState.js";
import { renderModelLabel } from "../commands/model/model.js";
import { effortValueToString } from "../utils/effort.js";
import {
  markCacheMissAcked,
  truncateLines,
  MODEL_EFFORT_REASON_MAX_LINES,
} from "./PromptInput/promptInputState.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { displayField } from "../utils/permissions/approvalPayloadSerialization.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-czq1j3j2.js:957128-958825 placement
function ModelEffortSwitchConfirm(props) {
  let $ = useMemoCache(27);
  let { kind, model, effort, hookReason, overDraft, onConfirm, onCancel } = props;
  let isOverDraft = overDraft === undefined ? false : overDraft;
  let { columns } = useTerminalSize();
  let setAppState = useSetAppState();
  let isModelSwitch = kind === "model";
  let title = isModelSwitch ? "Switch model?" : "Change effort level?";
  let kindLabel = isModelSwitch ? "model" : "effort level";
  let targetLabel;
  if ($[0] !== effort || $[1] !== isModelSwitch || $[2] !== model) {
    targetLabel = isModelSwitch
      ? renderModelLabel(model)
      : effort !== undefined
        ? effortValueToString(effort)
        : "auto";
    $[0] = effort;
    $[1] = isModelSwitch;
    $[2] = model;
    $[3] = targetLabel;
  } else targetLabel = $[3];
  let targetLabelText = targetLabel;
  let handleConfirm;
  if ($[4] !== hookReason || $[5] !== onConfirm || $[6] !== setAppState) {
    handleConfirm = function handleConfirm() {
      if (hookReason === undefined) setAppState(markCacheMissAcked);
      onConfirm();
    };
    $[4] = hookReason;
    $[5] = onConfirm;
    $[6] = setAppState;
    $[7] = handleConfirm;
  } else handleConfirm = $[7];
  let onConfirm_2 = handleConfirm;
  const subtitle =
    hookReason !== undefined
      ? "A PreModelSwitch hook asked you to confirm"
      : "Your next response will be slower and use more tokens";
  let cacheWarningText;
  if ($[8] !== columns || $[9] !== hookReason || $[10] !== targetLabelText || $[11] !== kindLabel) {
    cacheWarningText =
      hookReason !== undefined
        ? jsxProd_default(Text, {
            children: truncateLines(
              displayField(hookReason).text,
              columns,
              MODEL_EFFORT_REASON_MAX_LINES + 1,
            ),
          })
        : jsxProd_default_2(Text, {
            children: [
              "This conversation is cached for the current ",
              kindLabel,
              ". Switching to",
              " ",
              jsxProd_default(Text, {
                bold: true,
                children: targetLabelText,
              }),
              " means the full history gets re-read.",
            ],
          });
    $[8] = columns;
    $[9] = hookReason;
    $[10] = targetLabelText;
    $[11] = kindLabel;
    $[12] = cacheWarningText;
  } else cacheWarningText = $[12];
  const confirmLabel = `Yes, switch to ${targetLabelText}`;
  const focus = isOverDraft ? "cancel" : "confirm";
  let confirmSelect;
  if (
    $[13] !== onConfirm_2 ||
    $[14] !== onCancel ||
    $[15] !== isOverDraft ||
    $[16] !== confirmLabel ||
    $[17] !== focus
  ) {
    confirmSelect = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "No, go back",
      focus,
      hideIndexes: isOverDraft,
      disablePrintableKeybindings: isOverDraft,
      onConfirm: onConfirm_2,
      onCancel,
    });
    $[13] = onConfirm_2;
    $[14] = onCancel;
    $[15] = isOverDraft;
    $[16] = confirmLabel;
    $[17] = focus;
    $[18] = confirmSelect;
  } else confirmSelect = $[18];
  let children;
  if ($[19] !== cacheWarningText || $[20] !== confirmSelect) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      marginBottom: 1,
      children: [cacheWarningText, confirmSelect],
    });
    $[19] = cacheWarningText;
    $[20] = confirmSelect;
    $[21] = children;
  } else children = $[21];
  let dialog;
  if ($[22] !== onCancel || $[23] !== subtitle || $[24] !== children || $[25] !== title) {
    dialog = jsxProd_default(Dialog, {
      title,
      subtitle,
      color: "warning",
      onCancel,
      hideInputGuide: true,
      children,
    });
    $[22] = onCancel;
    $[23] = subtitle;
    $[24] = children;
    $[25] = title;
    $[26] = dialog;
  } else dialog = $[26];
  return dialog;
}
export { ModelEffortSwitchConfirm };
