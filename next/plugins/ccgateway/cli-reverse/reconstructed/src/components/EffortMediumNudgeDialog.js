/**
 * components/EffortMediumNudgeDialog.tsx
 *
 * 2.1.316 新增。建议改用 medium effort 的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (11)
 * attribution: placement 11
 */
import { MAX_NUDGE_BODY_LINES, normalizeNewlines } from "../utils/effortMediumNudge.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { useOnFirstReveal } from "./permissions/PermissionRequestTitle.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useRefusableAnswer } from "../hooks/useRefusableAnswer.js";
import { useInputClock } from "../ink/components/Input.js";
import { useMountTime, useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";
import { Box, Text } from "../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { modelSupportsMaxEffort, effortCostRatio, getDefaultEffortLevel } from "../utils/effort.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { wrapText } from "../ink/wrap-text.js";
import { truncateToWidth, truncateToWidthNoEllipsis } from "../utils/format.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { truncateToLength } from "../utils/stringUtils.js";
import {
  renderableText,
  isCleanText,
  stripTrailingEllipsis,
  labelOr,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1135707-1135886 placement (2.1.88 match: formatPrice, 1)
/**
 * 把倍率格式化成 "~Nx"（<0.1 时两位小数）。旧版名 formatPrice 不准确。
 */
function formatCostMultiplier(price) {
  if (price < 0.1) return `~${Math.max(0.01, Math.round(price * 100) / 100).toFixed(2)}x`;
  let roundedPrice = Math.round(price * 10) / 10;
  return Number.isInteger(roundedPrice) ? `~${roundedPrice.toFixed(0)}x` : `~${roundedPrice.toFixed(1)}x`;
}
//@ chunk-czq1j3j2.js:1135886-1136025 placement
var EFFORT_BODY_MAX_LINES; // deferred: uses MAX_NUDGE_BODY_CHARS (../utils/effortMediumNudge.js) of its import cycle while loading; runs once the cycle is complete
var EFFORT_DIALOG_PADDING;
var EFFORT_DIALOG_GAP;
var EFFORT_DIALOG_INSET;
var EFFORT_OPTION_MAX_LINES;
var EFFORT_SWITCH_TITLE;
var EFFORT_SWITCH_YES_LABEL;
var EFFORT_SWITCH_NO_LABEL;
deferInit("chunk-czq1j3j2.js:1135886", () => {
  EFFORT_BODY_MAX_LINES = MAX_NUDGE_BODY_LINES + 1;
  EFFORT_DIALOG_PADDING = 6;
  EFFORT_DIALOG_GAP = 2;
  EFFORT_DIALOG_INSET = EFFORT_DIALOG_PADDING + 4;
  EFFORT_OPTION_MAX_LINES = 2;
  EFFORT_SWITCH_TITLE = "Switch your default effort to {to}?";
  EFFORT_SWITCH_YES_LABEL = "Yes, use {to} effort by default";
  EFFORT_SWITCH_NO_LABEL = "No, keep {from}";
});
//@ chunk-czq1j3j2.js:1136025-1139636 placement
/**
 * EffortMediumNudgeDialog：建议把 effort 调到 medium 的对话框。
 */
function EffortMediumNudgeDialog(props) {
  let $ = useMemoCache(75);
  let { model, copy, onDone } = props;
  let optionOrder = useIsScreenReaderEnabled()
    ? "screen_reader"
    : copy.cancelFirst
      ? "cancel_first"
      : "confirm_first";
  let impressionCached;
  if (
    $[0] !== copy.cohort ||
    $[1] !== copy.fromLevel ||
    $[2] !== copy.modelKey ||
    $[3] !== copy.showWarning ||
    $[4] !== copy.toLevel ||
    $[5] !== optionOrder
  ) {
    impressionCached = () => {
      logEvent("tengu_effort_medium_nudge_shown", {
        cohort: fromEnum(copy.cohort),
        option_order: fromEnum(optionOrder),
        nudge_model: telemetrySafeModelName(copy.modelKey),
        from_level: fromEnum(copy.fromLevel),
        to_level: fromEnum(copy.toLevel),
        warning_shown: copy.showWarning === true,
      });
    };
    $[0] = copy.cohort;
    $[1] = copy.fromLevel;
    $[2] = copy.modelKey;
    $[3] = copy.showWarning;
    $[4] = copy.toLevel;
    $[5] = optionOrder;
    $[6] = impressionCached;
  } else impressionCached = $[6];
  useOnFirstReveal("impression", impressionCached);
  useGlobalExitKeybindings();
  let { columns } = useTerminalSize();
  let answerCached;
  if ($[7] !== onDone || $[8] !== optionOrder) {
    answerCached = (selectedValue) => onDone(selectedValue, optionOrder);
    $[7] = onDone;
    $[8] = optionOrder;
    $[9] = answerCached;
  } else answerCached = $[9];
  let refusableAnswer = useRefusableAnswer(answerCached);
  let inputClock = useInputClock();
  let mountTime = useMountTime();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuseInputCached;
  if ($[10] !== inputClock || $[11] !== noteRefused || $[12] !== mountTime || $[13] !== refusedWithin) {
    refuseInputCached = () => {
      if (isWithinRecentInput(inputClock, mountTime()) || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[10] = inputClock;
    $[11] = noteRefused;
    $[12] = mountTime;
    $[13] = refusedWithin;
    $[14] = refuseInputCached;
  } else refuseInputCached = $[14];
  let refuseInput = refuseInputCached;
  let answerHandlerCached;
  if ($[15] !== refuseInput || $[16] !== refusableAnswer) {
    answerHandlerCached = function handleAnswer(value) {
      if (refuseInput()) {
        refusableAnswer.refuse(value);
        return;
      }
      refusableAnswer.answer(value);
    };
    $[15] = refuseInput;
    $[16] = refusableAnswer;
    $[17] = answerHandlerCached;
  } else answerHandlerCached = $[17];
  let answer = answerHandlerCached;
  let focus =
    refusableAnswer.refused !== null
      ? refusableAnswer.refused === "decline"
        ? "cancel"
        : "confirm"
      : copy.cancelFirst === true
        ? "cancel"
        : "confirm";
  let TextComponent;
  let BodyBox;
  let DialogBox;
  let DialogComponent;
  let cancelLabel;
  let confirmLabel;
  let title;
  let children;
  let marginBottom;
  let flexDirection;
  let paddingX;
  let paddingY;
  let warningText;
  if (
    $[18] !== columns ||
    $[19] !== copy.body ||
    $[20] !== copy.cancelLabel ||
    $[21] !== copy.confirmLabel ||
    $[22] !== copy.fromLevel ||
    $[23] !== copy.showWarning ||
    $[24] !== copy.title ||
    $[25] !== copy.toLevel ||
    $[26] !== copy.warningText ||
    $[27] !== model
  ) {
    let modelName = renderModelName(model);
    let fillTemplate = (body) =>
      sanitizeNudgeText(
        body
          .replaceAll("{model}", modelName)
          .replaceAll("{from}", copy.fromLevel)
          .replaceAll("{to}", copy.toLevel),
      );
    let titleText = clampToTwoLines(
      fillTemplate(copy.title ?? EFFORT_SWITCH_TITLE),
      columns,
      EFFORT_DIALOG_GAP,
    );
    let bodyText = fillTemplate(copy.body);
    confirmLabel = clampToTwoLines(
      fillTemplate(copy.confirmLabel ?? EFFORT_SWITCH_YES_LABEL),
      columns,
      EFFORT_DIALOG_INSET,
    );
    cancelLabel = clampToTwoLines(
      fillTemplate(copy.cancelLabel ?? EFFORT_SWITCH_NO_LABEL),
      columns,
      EFFORT_DIALOG_INSET,
    );
    warningText =
      copy.showWarning === true
        ? clampToTwoLines(
            fillTemplate(copy.warningText ?? effortCostDescription(model, copy.fromLevel)),
            columns,
            EFFORT_DIALOG_PADDING,
          )
        : undefined;
    DialogComponent = PermissionDialog_2;
    title = titleText;
    DialogBox = Box;
    flexDirection = "column";
    paddingX = 2;
    paddingY = 1;
    BodyBox = Box;
    marginBottom = 1;
    TextComponent = Text;
    children = clampEffortBody(bodyText, columns);
    $[18] = columns;
    $[19] = copy.body;
    $[20] = copy.cancelLabel;
    $[21] = copy.confirmLabel;
    $[22] = copy.fromLevel;
    $[23] = copy.showWarning;
    $[24] = copy.title;
    $[25] = copy.toLevel;
    $[26] = copy.warningText;
    $[27] = model;
    $[28] = TextComponent;
    $[29] = BodyBox;
    $[30] = DialogBox;
    $[31] = DialogComponent;
    $[32] = cancelLabel;
    $[33] = confirmLabel;
    $[34] = title;
    $[35] = children;
    $[36] = marginBottom;
    $[37] = flexDirection;
    $[38] = paddingX;
    $[39] = paddingY;
    $[40] = warningText;
  } else {
    TextComponent = $[28];
    BodyBox = $[29];
    DialogBox = $[30];
    DialogComponent = $[31];
    cancelLabel = $[32];
    confirmLabel = $[33];
    title = $[34];
    children = $[35];
    marginBottom = $[36];
    flexDirection = $[37];
    paddingX = $[38];
    paddingY = $[39];
    warningText = $[40];
  }
  let children_2;
  if ($[41] !== TextComponent || $[42] !== children) {
    children_2 = jsxProd_default(TextComponent, {
      children,
    });
    $[41] = TextComponent;
    $[42] = children;
    $[43] = children_2;
  } else children_2 = $[43];
  let bodyElement;
  if ($[44] !== BodyBox || $[45] !== children_2 || $[46] !== marginBottom) {
    bodyElement = jsxProd_default(BodyBox, {
      marginBottom,
      children: children_2,
    });
    $[44] = BodyBox;
    $[45] = children_2;
    $[46] = marginBottom;
    $[47] = bodyElement;
  } else bodyElement = $[47];
  let warningElement;
  if ($[48] !== warningText) {
    warningElement =
      warningText !== undefined &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children: warningText,
        }),
      });
    $[48] = warningText;
    $[49] = warningElement;
  } else warningElement = $[49];
  const cancelFirst = copy.cancelFirst === true;
  let onConfirm;
  let onCancel;
  if ($[50] !== answer) {
    onConfirm = () => answer("accept");
    onCancel = () => answer("decline");
    $[50] = answer;
    $[51] = onConfirm;
    $[52] = onCancel;
  } else {
    onConfirm = $[51];
    onCancel = $[52];
  }
  let confirmElement;
  if (
    $[53] !== cancelLabel ||
    $[54] !== confirmLabel ||
    $[55] !== focus ||
    $[56] !== mountTime ||
    $[57] !== refuseInput ||
    $[58] !== refusableAnswer.attempts ||
    $[59] !== cancelFirst ||
    $[60] !== onConfirm ||
    $[61] !== onCancel
  ) {
    confirmElement = jsxProd_default(
      ConfirmSelect,
      {
        openedAt: mountTime,
        confirmLabel,
        cancelLabel,
        cancelFirst,
        focus,
        hideIndexes: true,
        refuseInput,
        onConfirm,
        onCancel,
      },
      refusableAnswer.attempts,
    );
    $[53] = cancelLabel;
    $[54] = confirmLabel;
    $[55] = focus;
    $[56] = mountTime;
    $[57] = refuseInput;
    $[58] = refusableAnswer.attempts;
    $[59] = cancelFirst;
    $[60] = onConfirm;
    $[61] = onCancel;
    $[62] = confirmElement;
  } else confirmElement = $[62];
  let children_3;
  if (
    $[63] !== DialogBox ||
    $[64] !== bodyElement ||
    $[65] !== warningElement ||
    $[66] !== confirmElement ||
    $[67] !== flexDirection ||
    $[68] !== paddingX ||
    $[69] !== paddingY
  ) {
    children_3 = jsxProd_default_2(DialogBox, {
      flexDirection,
      paddingX,
      paddingY,
      children: [bodyElement, warningElement, confirmElement],
    });
    $[63] = DialogBox;
    $[64] = bodyElement;
    $[65] = warningElement;
    $[66] = confirmElement;
    $[67] = flexDirection;
    $[68] = paddingX;
    $[69] = paddingY;
    $[70] = children_3;
  } else children_3 = $[70];
  let dialogElement;
  if ($[71] !== DialogComponent || $[72] !== title || $[73] !== children_3) {
    dialogElement = jsxProd_default(DialogComponent, {
      title,
      children: children_3,
    });
    $[71] = DialogComponent;
    $[72] = title;
    $[73] = children_3;
    $[74] = dialogElement;
  } else dialogElement = $[74];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:1139636-1139864 placement
function effortCostDescription(model, effort) {
  if (effort === "max" && modelSupportsMaxEffort(model)) return MAX_EFFORT_DESCRIPTION;
  let price = effortCostRatio(model, effort);
  let defaultEffortLevel = getDefaultEffortLevel(model);
  if (price === null || effort === defaultEffortLevel)
    return "{from} effort uses more tokens per task than {to}.";
  return `{from} effort is ${formatCostMultiplier(price)} the estimated cost of ${defaultEffortLevel} (the default).`;
}
//@ chunk-czq1j3j2.js:1139864-1140058 placement
function clampEffortBody(body, columns) {
  let width = subtractInsetWidth(columns, EFFORT_DIALOG_PADDING);
  let lines = wrapText(body, width, "wrap").split(`
`);
  if (lines.length <= EFFORT_BODY_MAX_LINES) return body;
  let overflowCount = lines.length - (EFFORT_BODY_MAX_LINES - 1);
  let overflowLine = truncateToWidth(`\u2026 (+${overflowCount} more lines)`, width);
  return `${lines.slice(0, EFFORT_BODY_MAX_LINES - 1).join(`
`)}
${overflowLine}`;
}
//@ chunk-czq1j3j2.js:1140058-1140092 placement
function sanitizeNudgeText(text) {
  return stripNonPrintable(normalizeNewlines(text));
}
//@ chunk-czq1j3j2.js:1140092-1140133 placement
function subtractInsetWidth(columns, inset) {
  return Math.max(1, columns - inset);
}
//@ chunk-czq1j3j2.js:1140133-1140317 placement
function clampToTwoLines(text, columns, inset) {
  let width = subtractInsetWidth(columns, inset);
  let lines = wrapText(text, width, "wrap").split(`
`);
  if (lines.length <= EFFORT_OPTION_MAX_LINES) return text;
  let sliced = lines.slice(0, EFFORT_OPTION_MAX_LINES);
  sliced[EFFORT_OPTION_MAX_LINES - 1] =
    `${truncateToWidthNoEllipsis(sliced[EFFORT_OPTION_MAX_LINES - 1] ?? "", Math.max(0, width - 1))}\u2026`;
  return sliced.join(`
`);
}
//@ chunk-czq1j3j2.js:1142859-1142880 placement
var LABEL_MAX_WIDTH = 160;
var LABEL_MAX_LENGTH = 1024;
//@ chunk-czq1j3j2.js:1142880-1143082 placement
function sanitizeOneLineLabel(text) {
  let truncatedText = truncateToLength(text, LABEL_MAX_LENGTH);
  let flat = renderableText(truncatedText.replace(/[\r\n\t ]+/g, " "));
  if (!isCleanText(flat)) return "";
  let cleaned = stripTrailingEllipsis(flat.replace(/\s+/g, " ").trim()).trimEnd();
  if (!isCleanText(cleaned)) return "";
  return truncateToWidth(truncatedText.length < text.length ? `${cleaned}\u2026` : cleaned, LABEL_MAX_WIDTH);
}
//@ chunk-czq1j3j2.js:1143082-1143277 placement
function LabelValueRow(props) {
  return jsxProd_default_2(
    Box,
    {
      children: [
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: props.label,
          }),
        }),
        jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [" ", labelOr(props.value, props.fallback), props.suffix],
        }),
      ],
    },
    props.label,
  );
}
export { sanitizeOneLineLabel, LabelValueRow, EffortMediumNudgeDialog, formatCostMultiplier };
