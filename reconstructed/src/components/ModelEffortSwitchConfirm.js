/**
 * components/ModelEffortSwitchConfirm.tsx
 *
 * 2.1.316 新增。切换模型时 effort 变化的确认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:924178-925874 placement
function ModelEffortSwitchConfirm(props) {
  let $ = w(27);
  let { kind, model, effort, hookReason, overDraft, onConfirm, onCancel } = props;
  let He = overDraft === undefined ? false : overDraft;
  let { columns } = useTerminalSize();
  let setAppState = useSetAppState();
  let Xe = kind === "model";
  let title = Xe ? "Switch model?" : "Change effort level?";
  let kt = Xe ? "model" : "effort level";
  let It;
  if ($[0] !== effort || $[1] !== Xe || $[2] !== model) {
    It = Xe ? renderModelLabel(model) : effort !== undefined ? effortValueToString(effort) : "auto";
    $[0] = effort;
    $[1] = Xe;
    $[2] = model;
    $[3] = It;
  } else It = $[3];
  let Ot = It;
  let Et;
  if ($[4] !== hookReason || $[5] !== onConfirm || $[6] !== setAppState) {
    Et = function Dt() {
      if (hookReason === undefined) setAppState(markCacheMissAcked);
      onConfirm();
    };
    $[4] = hookReason;
    $[5] = onConfirm;
    $[6] = setAppState;
    $[7] = Et;
  } else Et = $[7];
  let onConfirm_2 = Et;
  const subtitle =
    hookReason !== undefined
      ? "A PreModelSwitch hook asked you to confirm"
      : "Your next response will be slower and use more tokens";
  let oo;
  if ($[8] !== columns || $[9] !== hookReason || $[10] !== Ot || $[11] !== kt) {
    oo =
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
              kt,
              ". Switching to",
              " ",
              jsxProd_default(Text, {
                bold: true,
                children: Ot,
              }),
              " means the full history gets re-read.",
            ],
          });
    $[8] = columns;
    $[9] = hookReason;
    $[10] = Ot;
    $[11] = kt;
    $[12] = oo;
  } else oo = $[12];
  const confirmLabel = `Yes, switch to ${Ot}`;
  const focus = He ? "cancel" : "confirm";
  let so;
  if (
    $[13] !== onConfirm_2 ||
    $[14] !== onCancel ||
    $[15] !== He ||
    $[16] !== confirmLabel ||
    $[17] !== focus
  ) {
    so = jsxProd_default(ConfirmSelect, {
      confirmLabel,
      cancelLabel: "No, go back",
      focus,
      hideIndexes: He,
      disablePrintableKeybindings: He,
      onConfirm: onConfirm_2,
      onCancel,
    });
    $[13] = onConfirm_2;
    $[14] = onCancel;
    $[15] = He;
    $[16] = confirmLabel;
    $[17] = focus;
    $[18] = so;
  } else so = $[18];
  let children;
  if ($[19] !== oo || $[20] !== so) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      marginBottom: 1,
      children: [oo, so],
    });
    $[19] = oo;
    $[20] = so;
    $[21] = children;
  } else children = $[21];
  let ao;
  if ($[22] !== onCancel || $[23] !== subtitle || $[24] !== children || $[25] !== title) {
    ao = jsxProd_default(Dialog, {
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
    $[26] = ao;
  } else ao = $[26];
  return ao;
}
export { ModelEffortSwitchConfirm };
