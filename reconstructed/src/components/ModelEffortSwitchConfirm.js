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
import { Lao, truncateLines, g9e } from "./PromptInput/promptInputState.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { displayField } from "../utils/permissions/approvalPayloadSerialization.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:924178-925874 placement
function ModelEffortSwitchConfirm(h) {
  let $ = w(27),
    {
      kind: kind,
      model: model,
      effort: effort,
      hookReason: hookReason,
      overDraft: overDraft,
      onConfirm: onConfirm,
      onCancel: onCancel,
    } = h,
    He = overDraft === void 0 ? !1 : overDraft,
    { columns: columns } = useTerminalSize(),
    ze = useSetAppState(),
    Xe = kind === "model",
    rt = Xe ? "Switch model?" : "Change effort level?",
    kt = Xe ? "model" : "effort level",
    It;
  if ($[0] !== effort || $[1] !== Xe || $[2] !== model)
    ((It = Xe ? renderModelLabel(model) : effort !== void 0 ? effortValueToString(effort) : "auto"),
      ($[0] = effort),
      ($[1] = Xe),
      ($[2] = model),
      ($[3] = It));
  else It = $[3];
  let Ot = It,
    Et;
  if ($[4] !== hookReason || $[5] !== onConfirm || $[6] !== ze)
    ((Et = function Dt() {
      if (hookReason === void 0) ze(Lao);
      onConfirm();
    }),
      ($[4] = hookReason),
      ($[5] = onConfirm),
      ($[6] = ze),
      ($[7] = Et));
  else Et = $[7];
  let Dt = Et;
  const Lt =
    hookReason !== void 0
      ? "A PreModelSwitch hook asked you to confirm"
      : "Your next response will be slower and use more tokens";
  let oo;
  if ($[8] !== columns || $[9] !== hookReason || $[10] !== Ot || $[11] !== kt)
    ((oo =
      hookReason !== void 0
        ? e(Text, { children: truncateLines(displayField(hookReason).text, columns, g9e + 1) })
        : r(Text, {
            children: [
              "This conversation is cached for the current ",
              kt,
              ". Switching to",
              " ",
              e(Text, { bold: !0, children: Ot }),
              " means the full history gets re-read.",
            ],
          })),
      ($[8] = columns),
      ($[9] = hookReason),
      ($[10] = Ot),
      ($[11] = kt),
      ($[12] = oo));
  else oo = $[12];
  const Xt = `Yes, switch to ${Ot}`,
    io = He ? "cancel" : "confirm";
  let so;
  if ($[13] !== Dt || $[14] !== onCancel || $[15] !== He || $[16] !== Xt || $[17] !== io)
    ((so = e(ConfirmSelect, {
      confirmLabel: Xt,
      cancelLabel: "No, go back",
      focus: io,
      hideIndexes: He,
      disablePrintableKeybindings: He,
      onConfirm: Dt,
      onCancel: onCancel,
    })),
      ($[13] = Dt),
      ($[14] = onCancel),
      ($[15] = He),
      ($[16] = Xt),
      ($[17] = io),
      ($[18] = so));
  else so = $[18];
  let po;
  if ($[19] !== oo || $[20] !== so)
    ((po = r(Box, { flexDirection: "column", gap: 1, marginBottom: 1, children: [oo, so] })),
      ($[19] = oo),
      ($[20] = so),
      ($[21] = po));
  else po = $[21];
  let ao;
  if ($[22] !== onCancel || $[23] !== Lt || $[24] !== po || $[25] !== rt)
    ((ao = e(Dialog, {
      title: rt,
      subtitle: Lt,
      color: "warning",
      onCancel: onCancel,
      hideInputGuide: !0,
      children: po,
    })),
      ($[22] = onCancel),
      ($[23] = Lt),
      ($[24] = po),
      ($[25] = rt),
      ($[26] = ao));
  else ao = $[26];
  return ao;
}

export { ModelEffortSwitchConfirm };
