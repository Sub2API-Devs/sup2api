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
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { LinkifiedText } from "./rateLimit/usageCreditsOffer.js";
import { Blockquote } from "./Blockquote.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";

//@ chunk-18hwfzwa.js:1403401-1403405 placement
init_react_production();
//@ chunk-18hwfzwa.js:1403405-1403643 placement
function buildRefusalPausedMessage(model, refusal, fallbackModel) {
  let L = formatRefusalDetails(refusal);
  let ee = renderModelName(model);
  if (!hasVisibleText(ee)) return `${GENERIC_SAFEGUARD_MESSAGE} ${buildSafeguardsLearnMore(model)}${L}`;
  let ke = safeLabel(ee);
  let safeguardLead = getSafeguardLead(ke, model, refusal);
  let Be = renderModelName(fallbackModel);
  let He = hasVisibleText(Be)
    ? safeguardRecoveryLine(
        "paused",
        {
          model: ke,
          fallback: safeLabel(Be),
        },
        model,
        refusal,
      )
    : undefined;
  return `${safeguardLead} ${He === undefined ? "" : `${He} `}${buildSafeguardsLearnMore(model)}${L}`;
}
//@ chunk-18hwfzwa.js:1403643-1403844 placement
function refusalPausedOptionLabels(originalModel, fallbackModel) {
  let D = renderModelName(fallbackModel);
  let L = renderModelName(originalModel);
  return {
    retry_fallback: hasVisibleText(D) ? `Switch to ${safeLabel(D)}` : "Switch to the fallback model",
    edit_prompt: hasVisibleText(L) ? `Edit prompt and retry with ${safeLabel(L)}` : "Edit prompt and retry",
  };
}
//@ chunk-18hwfzwa.js:1403844-1406026 placement
function ModelRefusalPausedDialog(props) {
  let $ = w(48);
  let { payload, answer } = props;
  let ee;
  if ($[0] !== payload.fallbackModel || $[1] !== payload.originalModel) {
    ee = refusalPausedOptionLabels(payload.originalModel, payload.fallbackModel);
    $[0] = payload.fallbackModel;
    $[1] = payload.originalModel;
    $[2] = ee;
  } else ee = $[2];
  let ke = ee;
  let Re;
  if ($[3] !== ke.retry_fallback) {
    Re = {
      value: "retry_fallback",
      label: ke.retry_fallback,
    };
    $[3] = ke.retry_fallback;
    $[4] = Re;
  } else Re = $[4];
  let Be;
  if ($[5] !== ke.edit_prompt) {
    Be = {
      value: "edit_prompt",
      label: ke.edit_prompt,
    };
    $[5] = ke.edit_prompt;
    $[6] = Be;
  } else Be = $[6];
  let He;
  if ($[7] !== Re || $[8] !== Be) {
    He = [Re, Be];
    $[7] = Re;
    $[8] = Be;
    $[9] = He;
  } else He = $[9];
  let options = He;
  let ze;
  let Xe;
  let color;
  let title;
  let flexDirection;
  let marginTop;
  let paddingX;
  let Et;
  let Dt;
  if (
    $[10] !== payload.apiRefusalCategory ||
    $[11] !== payload.fallbackModel ||
    $[12] !== payload.guidanceText ||
    $[13] !== payload.originalModel
  ) {
    let Lt =
      payload.guidanceText === undefined
        ? ""
        : sanitizeDisplayText(payload.guidanceText, {
            maxCodeUnits: 512,
          });
    Xe = PermissionDialog_2;
    color = "warning";
    title = "Session paused";
    ze = Box;
    flexDirection = "column";
    marginTop = 1;
    paddingX = 1;
    let children;
    if (
      $[23] !== payload.apiRefusalCategory ||
      $[24] !== payload.fallbackModel ||
      $[25] !== payload.originalModel
    ) {
      children = buildRefusalPausedMessage(
        payload.originalModel,
        payload.apiRefusalCategory,
        payload.fallbackModel,
      );
      $[23] = payload.apiRefusalCategory;
      $[24] = payload.fallbackModel;
      $[25] = payload.originalModel;
      $[26] = children;
    } else children = $[26];
    if ($[27] !== children) {
      Et = jsxProd_default(LinkifiedText, {
        children,
      });
      $[27] = children;
      $[28] = Et;
    } else Et = $[28];
    Dt =
      Lt !== "" &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Blockquote, {
          multiline: needsGutter(Lt),
          children: jsxProd_default(Text, {
            color: "inactive",
            children: Lt,
          }),
        }),
      });
    $[10] = payload.apiRefusalCategory;
    $[11] = payload.fallbackModel;
    $[12] = payload.guidanceText;
    $[13] = payload.originalModel;
    $[14] = ze;
    $[15] = Xe;
    $[16] = color;
    $[17] = title;
    $[18] = flexDirection;
    $[19] = marginTop;
    $[20] = paddingX;
    $[21] = Et;
    $[22] = Dt;
  } else {
    ze = $[14];
    Xe = $[15];
    color = $[16];
    title = $[17];
    flexDirection = $[18];
    marginTop = $[19];
    paddingX = $[20];
    Et = $[21];
    Dt = $[22];
  }
  let onCancel;
  if ($[29] !== answer) {
    onCancel = () => answer("cancelled");
    $[29] = answer;
    $[30] = onCancel;
  } else onCancel = $[30];
  let Xt;
  if ($[31] !== answer || $[32] !== options || $[33] !== onCancel) {
    Xt = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ModelSelector, {
        selectedValue: NO_COMMITTED_ROW,
        options,
        onChange: answer,
        onCancel,
      }),
    });
    $[31] = answer;
    $[32] = options;
    $[33] = onCancel;
    $[34] = Xt;
  } else Xt = $[34];
  let children;
  if (
    $[35] !== ze ||
    $[36] !== Xt ||
    $[37] !== flexDirection ||
    $[38] !== marginTop ||
    $[39] !== paddingX ||
    $[40] !== Et ||
    $[41] !== Dt
  ) {
    children = jsxProd_default_2(ze, {
      flexDirection,
      marginTop,
      paddingX,
      children: [Et, Dt, Xt],
    });
    $[35] = ze;
    $[36] = Xt;
    $[37] = flexDirection;
    $[38] = marginTop;
    $[39] = paddingX;
    $[40] = Et;
    $[41] = Dt;
    $[42] = children;
  } else children = $[42];
  let so;
  if ($[43] !== Xe || $[44] !== color || $[45] !== title || $[46] !== children) {
    so = jsxProd_default(Xe, {
      color,
      title,
      children,
    });
    $[43] = Xe;
    $[44] = color;
    $[45] = title;
    $[46] = children;
    $[47] = so;
  } else so = $[47];
  return so;
}
export { ModelRefusalPausedDialog };
