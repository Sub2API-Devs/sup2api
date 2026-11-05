/**
 * components/ModelRefusalPausedDialog.tsx
 *
 * 2.1.316 新增。模型拒答后暂停、选择回退模型的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: placement 4
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  formatErrorDetails,
  GENERIC_SAFEGUARD_MESSAGE,
  getSafeguardLead,
  safeguardRecoveryLine,
} from "../services/api/safeguardMessages.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { hasVisibleText, safeLabel, needsGutter } from "../utils/permissions/approvalPayloadSerialization.js";
import { buildSafeguardsLearnMore } from "../services/api/refusalFallback.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1434160-1434164 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1434160", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1442482-1442720 placement
function buildRefusalPausedMessage(model, refusal, fallbackModel) {
  let refusalDetails = formatErrorDetails(refusal);
  let modelLabel = renderModelName(model);
  if (!hasVisibleText(modelLabel))
    return `${GENERIC_SAFEGUARD_MESSAGE} ${buildSafeguardsLearnMore(model)}${refusalDetails}`;
  let modelName = safeLabel(modelLabel);
  let safeguardLead = getSafeguardLead(modelName, model, refusal);
  let fallbackLabel = renderModelName(fallbackModel);
  let recoveryLine = hasVisibleText(fallbackLabel)
    ? safeguardRecoveryLine(
        "paused",
        {
          model: modelName,
          fallback: safeLabel(fallbackLabel),
        },
        model,
        refusal,
      )
    : undefined;
  return `${safeguardLead} ${recoveryLine === undefined ? "" : `${recoveryLine} `}${buildSafeguardsLearnMore(model)}${refusalDetails}`;
}
//@ chunk-czq1j3j2.js:1442720-1442921 placement
function refusalPausedOptionLabels(originalModel, fallbackModel) {
  let fallbackLabel = renderModelName(fallbackModel);
  let originalLabel = renderModelName(originalModel);
  return {
    retry_fallback: hasVisibleText(fallbackLabel)
      ? `Switch to ${safeLabel(fallbackLabel)}`
      : "Switch to the fallback model",
    edit_prompt: hasVisibleText(originalLabel)
      ? `Edit prompt and retry with ${safeLabel(originalLabel)}`
      : "Edit prompt and retry",
  };
}
//@ chunk-czq1j3j2.js:1442921-1445103 placement
function ModelRefusalPausedDialog(props) {
  let $ = useMemoCache(48);
  let { payload, answer } = props;
  let optionLabels;
  if ($[0] !== payload.fallbackModel || $[1] !== payload.originalModel) {
    optionLabels = refusalPausedOptionLabels(payload.originalModel, payload.fallbackModel);
    $[0] = payload.fallbackModel;
    $[1] = payload.originalModel;
    $[2] = optionLabels;
  } else optionLabels = $[2];
  let optionLabelsMemo = optionLabels;
  let retryOption;
  if ($[3] !== optionLabelsMemo.retry_fallback) {
    retryOption = {
      value: "retry_fallback",
      label: optionLabelsMemo.retry_fallback,
    };
    $[3] = optionLabelsMemo.retry_fallback;
    $[4] = retryOption;
  } else retryOption = $[4];
  let editOption;
  if ($[5] !== optionLabelsMemo.edit_prompt) {
    editOption = {
      value: "edit_prompt",
      label: optionLabelsMemo.edit_prompt,
    };
    $[5] = optionLabelsMemo.edit_prompt;
    $[6] = editOption;
  } else editOption = $[6];
  let optionList;
  if ($[7] !== retryOption || $[8] !== editOption) {
    optionList = [retryOption, editOption];
    $[7] = retryOption;
    $[8] = editOption;
    $[9] = optionList;
  } else optionList = $[9];
  let options = optionList;
  let containerComponent;
  let dialogComponent;
  let color;
  let title;
  let flexDirection;
  let marginTop;
  let paddingX;
  let messageElement;
  let guidanceElement;
  if (
    $[10] !== payload.apiRefusalCategory ||
    $[11] !== payload.fallbackModel ||
    $[12] !== payload.guidanceText ||
    $[13] !== payload.originalModel
  ) {
    let guidanceText =
      payload.guidanceText === undefined
        ? ""
        : sanitizeDisplayText(payload.guidanceText, {
            maxCodeUnits: 512,
          });
    dialogComponent = PermissionDialog_2;
    color = "warning";
    title = "Session paused";
    containerComponent = Box;
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
      messageElement = jsxProd_default(LinkifiedText, {
        children,
      });
      $[27] = children;
      $[28] = messageElement;
    } else messageElement = $[28];
    guidanceElement =
      guidanceText !== "" &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Blockquote, {
          multiline: needsGutter(guidanceText),
          children: jsxProd_default(Text, {
            color: "inactive",
            children: guidanceText,
          }),
        }),
      });
    $[10] = payload.apiRefusalCategory;
    $[11] = payload.fallbackModel;
    $[12] = payload.guidanceText;
    $[13] = payload.originalModel;
    $[14] = containerComponent;
    $[15] = dialogComponent;
    $[16] = color;
    $[17] = title;
    $[18] = flexDirection;
    $[19] = marginTop;
    $[20] = paddingX;
    $[21] = messageElement;
    $[22] = guidanceElement;
  } else {
    containerComponent = $[14];
    dialogComponent = $[15];
    color = $[16];
    title = $[17];
    flexDirection = $[18];
    marginTop = $[19];
    paddingX = $[20];
    messageElement = $[21];
    guidanceElement = $[22];
  }
  let onCancel;
  if ($[29] !== answer) {
    onCancel = () => answer("cancelled");
    $[29] = answer;
    $[30] = onCancel;
  } else onCancel = $[30];
  let actionsElement;
  if ($[31] !== answer || $[32] !== options || $[33] !== onCancel) {
    actionsElement = jsxProd_default(Box, {
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
    $[34] = actionsElement;
  } else actionsElement = $[34];
  let children;
  if (
    $[35] !== containerComponent ||
    $[36] !== actionsElement ||
    $[37] !== flexDirection ||
    $[38] !== marginTop ||
    $[39] !== paddingX ||
    $[40] !== messageElement ||
    $[41] !== guidanceElement
  ) {
    children = jsxProd_default_2(containerComponent, {
      flexDirection,
      marginTop,
      paddingX,
      children: [messageElement, guidanceElement, actionsElement],
    });
    $[35] = containerComponent;
    $[36] = actionsElement;
    $[37] = flexDirection;
    $[38] = marginTop;
    $[39] = paddingX;
    $[40] = messageElement;
    $[41] = guidanceElement;
    $[42] = children;
  } else children = $[42];
  let dialogElement;
  if ($[43] !== dialogComponent || $[44] !== color || $[45] !== title || $[46] !== children) {
    dialogElement = jsxProd_default(dialogComponent, {
      color,
      title,
      children,
    });
    $[43] = dialogComponent;
    $[44] = color;
    $[45] = title;
    $[46] = children;
    $[47] = dialogElement;
  } else dialogElement = $[47];
  return dialogElement;
}
export { ModelRefusalPausedDialog };
