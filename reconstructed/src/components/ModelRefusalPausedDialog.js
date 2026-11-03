/**
 * components/ModelRefusalPausedDialog.tsx
 *
 * 2.1.316 新增。模型拒答后暂停、选择回退模型的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import {
  formatRefusalDetails,
  GENERIC_SAFEGUARD_MESSAGE,
  getSafeguardLead,
  safeguardRecoveryLine,
} from "../services/api/safeguardMessages.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { hasVisibleText, safeLabel, needsGutter } from "../utils/permissions/approvalPayloadSerialization.js";
import { buildSafeguardsLearnMore } from "../services/api/refusalFallback.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { sanitizeDisplayText } from "../utils/resultError.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { Box, Text } from "../ink/components/Text.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LinkifiedText } from "./rateLimit/usageCreditsOffer.js";
import { Blockquote } from "./Blockquote.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";

//@ chunk-18hwfzwa.js:1403401-1403405 placement
j();
//@ chunk-18hwfzwa.js:1403405-1403643 placement
function buildRefusalPausedMessage(model, refusal, fallbackModel) {
  let L = formatRefusalDetails(refusal),
    ee = renderModelName(model);
  if (!hasVisibleText(ee)) return `${GENERIC_SAFEGUARD_MESSAGE} ${buildSafeguardsLearnMore(model)}${L}`;
  let ke = safeLabel(ee),
    Re = getSafeguardLead(ke, model, refusal),
    Be = renderModelName(fallbackModel),
    He = hasVisibleText(Be)
      ? safeguardRecoveryLine("paused", { model: ke, fallback: safeLabel(Be) }, model, refusal)
      : void 0;
  return `${Re} ${He === void 0 ? "" : `${He} `}${buildSafeguardsLearnMore(model)}${L}`;
}
//@ chunk-18hwfzwa.js:1403643-1403844 placement
function refusalPausedOptionLabels(h, x) {
  let D = renderModelName(x),
    L = renderModelName(h);
  return {
    retry_fallback: hasVisibleText(D) ? `Switch to ${safeLabel(D)}` : "Switch to the fallback model",
    edit_prompt: hasVisibleText(L) ? `Edit prompt and retry with ${safeLabel(L)}` : "Edit prompt and retry",
  };
}
//@ chunk-18hwfzwa.js:1403844-1406026 placement
function ModelRefusalPausedDialog(h) {
  let $ = w(48),
    { payload: payload, answer: answer } = h,
    ee;
  if ($[0] !== payload.fallbackModel || $[1] !== payload.originalModel)
    ((ee = refusalPausedOptionLabels(payload.originalModel, payload.fallbackModel)),
      ($[0] = payload.fallbackModel),
      ($[1] = payload.originalModel),
      ($[2] = ee));
  else ee = $[2];
  let ke = ee,
    Re;
  if ($[3] !== ke.retry_fallback)
    ((Re = { value: "retry_fallback", label: ke.retry_fallback }), ($[3] = ke.retry_fallback), ($[4] = Re));
  else Re = $[4];
  let Be;
  if ($[5] !== ke.edit_prompt)
    ((Be = { value: "edit_prompt", label: ke.edit_prompt }), ($[5] = ke.edit_prompt), ($[6] = Be));
  else Be = $[6];
  let He;
  if ($[7] !== Re || $[8] !== Be) ((He = [Re, Be]), ($[7] = Re), ($[8] = Be), ($[9] = He));
  else He = $[9];
  let We = He,
    ze,
    Xe,
    rt,
    kt,
    At,
    It,
    Ot,
    Et,
    Dt;
  if (
    $[10] !== payload.apiRefusalCategory ||
    $[11] !== payload.fallbackModel ||
    $[12] !== payload.guidanceText ||
    $[13] !== payload.originalModel
  ) {
    let Lt =
      payload.guidanceText === void 0 ? "" : sanitizeDisplayText(payload.guidanceText, { maxCodeUnits: 512 });
    Xe = PermissionDialog_2;
    rt = "warning";
    kt = "Session paused";
    ze = Box;
    At = "column";
    It = 1;
    Ot = 1;
    let oo;
    if (
      $[23] !== payload.apiRefusalCategory ||
      $[24] !== payload.fallbackModel ||
      $[25] !== payload.originalModel
    )
      ((oo = buildRefusalPausedMessage(
        payload.originalModel,
        payload.apiRefusalCategory,
        payload.fallbackModel,
      )),
        ($[23] = payload.apiRefusalCategory),
        ($[24] = payload.fallbackModel),
        ($[25] = payload.originalModel),
        ($[26] = oo));
    else oo = $[26];
    if ($[27] !== oo) ((Et = e(LinkifiedText, { children: oo })), ($[27] = oo), ($[28] = Et));
    else Et = $[28];
    Dt =
      Lt !== "" &&
      e(Box, {
        marginTop: 1,
        children: e(Blockquote, {
          multiline: needsGutter(Lt),
          children: e(Text, { color: "inactive", children: Lt }),
        }),
      });
    (($[10] = payload.apiRefusalCategory),
      ($[11] = payload.fallbackModel),
      ($[12] = payload.guidanceText),
      ($[13] = payload.originalModel),
      ($[14] = ze),
      ($[15] = Xe),
      ($[16] = rt),
      ($[17] = kt),
      ($[18] = At),
      ($[19] = It),
      ($[20] = Ot),
      ($[21] = Et),
      ($[22] = Dt));
  } else
    ((ze = $[14]),
      (Xe = $[15]),
      (rt = $[16]),
      (kt = $[17]),
      (At = $[18]),
      (It = $[19]),
      (Ot = $[20]),
      (Et = $[21]),
      (Dt = $[22]));
  let oo;
  if ($[29] !== answer) ((oo = () => answer("cancelled")), ($[29] = answer), ($[30] = oo));
  else oo = $[30];
  let Xt;
  if ($[31] !== answer || $[32] !== We || $[33] !== oo)
    ((Xt = e(Box, {
      marginTop: 1,
      children: e(ModelSelector, {
        selectedValue: NO_COMMITTED_ROW,
        options: We,
        onChange: answer,
        onCancel: oo,
      }),
    })),
      ($[31] = answer),
      ($[32] = We),
      ($[33] = oo),
      ($[34] = Xt));
  else Xt = $[34];
  let io;
  if (
    $[35] !== ze ||
    $[36] !== Xt ||
    $[37] !== At ||
    $[38] !== It ||
    $[39] !== Ot ||
    $[40] !== Et ||
    $[41] !== Dt
  )
    ((io = r(ze, { flexDirection: At, marginTop: It, paddingX: Ot, children: [Et, Dt, Xt] })),
      ($[35] = ze),
      ($[36] = Xt),
      ($[37] = At),
      ($[38] = It),
      ($[39] = Ot),
      ($[40] = Et),
      ($[41] = Dt),
      ($[42] = io));
  else io = $[42];
  let so;
  if ($[43] !== Xe || $[44] !== rt || $[45] !== kt || $[46] !== io)
    ((so = e(Xe, { color: rt, title: kt, children: io })),
      ($[43] = Xe),
      ($[44] = rt),
      ($[45] = kt),
      ($[46] = io),
      ($[47] = so));
  else so = $[47];
  return so;
}

export { ModelRefusalPausedDialog };
