/**
 * components/EffortMediumNudgeDialog.tsx
 *
 * 2.1.316 新增。建议改用 medium effort 的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 12
 */
import { MAX_NUDGE_BODY_LINES, normalizeNewlines } from "../utils/effortMediumNudge.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../utils/model/telemetryModelName.js";
import { useOnFirstReveal } from "./permissions/PermissionRequestTitle.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useRefusableAnswer } from "../hooks/useRefusableAnswer.js";
import { useInputClock } from "../ink/components/Input.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
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

//@ chunk-18hwfzwa.js:1101734-1101913 placement = formatPrice (1)
/**
 * 把倍率格式化成 "~Nx"（<0.1 时两位小数）。旧版名 formatPrice 不准确。
 */
function formatCostMultiplier(price) {
  if (price < 0.1) return `~${Math.max(0.01, Math.round(price * 100) / 100).toFixed(2)}x`;
  let x = Math.round(price * 10) / 10;
  return Number.isInteger(x) ? `~${x.toFixed(0)}x` : `~${x.toFixed(1)}x`;
}
//@ chunk-18hwfzwa.js:1101913-1101946 placement
function getDialogOpenedAtMs() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1101946-1102085 placement
var EFFORT_BODY_MAX_LINES = MAX_NUDGE_BODY_LINES + 1;
var EFFORT_DIALOG_PADDING = 6;
var EFFORT_DIALOG_GAP = 2;
var EFFORT_DIALOG_INSET = EFFORT_DIALOG_PADDING + 4;
var EFFORT_OPTION_MAX_LINES = 2;
var EFFORT_SWITCH_TITLE = "Switch your default effort to {to}?";
var EFFORT_SWITCH_YES_LABEL = "Yes, use {to} effort by default";
var EFFORT_SWITCH_NO_LABEL = "No, keep {from}";
//@ chunk-18hwfzwa.js:1102085-1105698 placement
/**
 * EffortMediumNudgeDialog：建议把 effort 调到 medium 的对话框。
 */
function EffortMediumNudgeDialog(props) {
  let $ = w(75);
  let { model, copy, onDone } = props;
  let ke = useIsScreenReaderEnabled() ? "screen_reader" : copy.cancelFirst ? "cancel_first" : "confirm_first";
  let Be;
  if (
    $[0] !== copy.cohort ||
    $[1] !== copy.fromLevel ||
    $[2] !== copy.modelKey ||
    $[3] !== copy.showWarning ||
    $[4] !== copy.toLevel ||
    $[5] !== ke
  ) {
    Be = () => {
      logEvent("tengu_effort_medium_nudge_shown", {
        cohort: fromEnum(copy.cohort),
        option_order: fromEnum(ke),
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
    $[5] = ke;
    $[6] = Be;
  } else Be = $[6];
  useOnFirstReveal("impression", Be);
  useGlobalExitKeybindings();
  let { columns } = useTerminalSize();
  let We;
  if ($[7] !== onDone || $[8] !== ke) {
    We = (ze) => onDone(ze, ke);
    $[7] = onDone;
    $[8] = ke;
    $[9] = We;
  } else We = $[9];
  let refusableAnswer = useRefusableAnswer(We);
  let inputClock = useInputClock();
  let [kt] = y(getDialogOpenedAtMs);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Ot;
  if ($[10] !== inputClock || $[11] !== kt || $[12] !== noteRefused || $[13] !== refusedWithin) {
    Ot = () => {
      if (isWithinRecentInput(inputClock, kt) || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[10] = inputClock;
    $[11] = kt;
    $[12] = noteRefused;
    $[13] = refusedWithin;
    $[14] = Ot;
  } else Ot = $[14];
  let Et = Ot;
  let Dt;
  if ($[15] !== Et || $[16] !== refusableAnswer) {
    Dt = function oo(Lt) {
      if (Et()) {
        refusableAnswer.refuse(Lt);
        return;
      }
      refusableAnswer.answer(Lt);
    };
    $[15] = Et;
    $[16] = refusableAnswer;
    $[17] = Dt;
  } else Dt = $[17];
  let oo = Dt;
  let focus =
    refusableAnswer.refused !== null
      ? refusableAnswer.refused === "decline"
        ? "cancel"
        : "confirm"
      : copy.cancelFirst === true
        ? "cancel"
        : "confirm";
  let io;
  let so;
  let po;
  let ao;
  let cancelLabel;
  let confirmLabel;
  let title;
  let children;
  let marginBottom;
  let flexDirection;
  let paddingX;
  let paddingY;
  let mn;
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
    let Cn = renderModelName(model);
    let vo = (body) =>
      sanitizeNudgeText(
        body.replaceAll("{model}", Cn).replaceAll("{from}", copy.fromLevel).replaceAll("{to}", copy.toLevel),
      );
    let Yo = clampToTwoLines(vo(copy.title ?? EFFORT_SWITCH_TITLE), columns, EFFORT_DIALOG_GAP);
    let kn = vo(copy.body);
    confirmLabel = clampToTwoLines(
      vo(copy.confirmLabel ?? EFFORT_SWITCH_YES_LABEL),
      columns,
      EFFORT_DIALOG_INSET,
    );
    cancelLabel = clampToTwoLines(
      vo(copy.cancelLabel ?? EFFORT_SWITCH_NO_LABEL),
      columns,
      EFFORT_DIALOG_INSET,
    );
    mn =
      copy.showWarning === true
        ? clampToTwoLines(
            vo(copy.warningText ?? effortCostDescription(model, copy.fromLevel)),
            columns,
            EFFORT_DIALOG_PADDING,
          )
        : undefined;
    ao = PermissionDialog_2;
    title = Yo;
    po = Box;
    flexDirection = "column";
    paddingX = 2;
    paddingY = 1;
    so = Box;
    marginBottom = 1;
    io = Text;
    children = clampEffortBody(kn, columns);
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
    $[28] = io;
    $[29] = so;
    $[30] = po;
    $[31] = ao;
    $[32] = cancelLabel;
    $[33] = confirmLabel;
    $[34] = title;
    $[35] = children;
    $[36] = marginBottom;
    $[37] = flexDirection;
    $[38] = paddingX;
    $[39] = paddingY;
    $[40] = mn;
  } else {
    io = $[28];
    so = $[29];
    po = $[30];
    ao = $[31];
    cancelLabel = $[32];
    confirmLabel = $[33];
    title = $[34];
    children = $[35];
    marginBottom = $[36];
    flexDirection = $[37];
    paddingX = $[38];
    paddingY = $[39];
    mn = $[40];
  }
  let children_2;
  if ($[41] !== io || $[42] !== children) {
    children_2 = jsxProd_default(io, {
      children,
    });
    $[41] = io;
    $[42] = children;
    $[43] = children_2;
  } else children_2 = $[43];
  let bn;
  if ($[44] !== so || $[45] !== children_2 || $[46] !== marginBottom) {
    bn = jsxProd_default(so, {
      marginBottom,
      children: children_2,
    });
    $[44] = so;
    $[45] = children_2;
    $[46] = marginBottom;
    $[47] = bn;
  } else bn = $[47];
  let Go;
  if ($[48] !== mn) {
    Go =
      mn !== undefined &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children: mn,
        }),
      });
    $[48] = mn;
    $[49] = Go;
  } else Go = $[49];
  const cancelFirst = copy.cancelFirst === true;
  let onConfirm;
  let onCancel;
  if ($[50] !== oo) {
    onConfirm = () => oo("accept");
    onCancel = () => oo("decline");
    $[50] = oo;
    $[51] = onConfirm;
    $[52] = onCancel;
  } else {
    onConfirm = $[51];
    onCancel = $[52];
  }
  let Sn;
  if (
    $[53] !== cancelLabel ||
    $[54] !== confirmLabel ||
    $[55] !== focus ||
    $[56] !== kt ||
    $[57] !== Et ||
    $[58] !== refusableAnswer.attempts ||
    $[59] !== cancelFirst ||
    $[60] !== onConfirm ||
    $[61] !== onCancel
  ) {
    Sn = jsxProd_default(
      ConfirmSelect,
      {
        openedAt: kt,
        confirmLabel,
        cancelLabel,
        cancelFirst,
        focus,
        hideIndexes: true,
        refuseInput: Et,
        onConfirm,
        onCancel,
      },
      refusableAnswer.attempts,
    );
    $[53] = cancelLabel;
    $[54] = confirmLabel;
    $[55] = focus;
    $[56] = kt;
    $[57] = Et;
    $[58] = refusableAnswer.attempts;
    $[59] = cancelFirst;
    $[60] = onConfirm;
    $[61] = onCancel;
    $[62] = Sn;
  } else Sn = $[62];
  let children_3;
  if (
    $[63] !== po ||
    $[64] !== bn ||
    $[65] !== Go ||
    $[66] !== Sn ||
    $[67] !== flexDirection ||
    $[68] !== paddingX ||
    $[69] !== paddingY
  ) {
    children_3 = jsxProd_default_2(po, {
      flexDirection,
      paddingX,
      paddingY,
      children: [bn, Go, Sn],
    });
    $[63] = po;
    $[64] = bn;
    $[65] = Go;
    $[66] = Sn;
    $[67] = flexDirection;
    $[68] = paddingX;
    $[69] = paddingY;
    $[70] = children_3;
  } else children_3 = $[70];
  let on;
  if ($[71] !== ao || $[72] !== title || $[73] !== children_3) {
    on = jsxProd_default(ao, {
      title,
      children: children_3,
    });
    $[71] = ao;
    $[72] = title;
    $[73] = children_3;
    $[74] = on;
  } else on = $[74];
  return on;
}
//@ chunk-18hwfzwa.js:1105698-1105926 placement
function effortCostDescription(model, effort) {
  if (effort === "max" && modelSupportsMaxEffort(model)) return MAX_EFFORT_DESCRIPTION;
  let price = effortCostRatio(model, effort);
  let defaultEffortLevel = getDefaultEffortLevel(model);
  if (price === null || effort === defaultEffortLevel)
    return "{from} effort uses more tokens per task than {to}.";
  return `{from} effort is ${formatCostMultiplier(price)} the estimated cost of ${defaultEffortLevel} (the default).`;
}
//@ chunk-18hwfzwa.js:1105926-1106120 placement
function clampEffortBody(h, columns) {
  let D = subtractInsetWidth(columns, EFFORT_DIALOG_PADDING);
  let lines = wrapText(h, D, "wrap").split(`
`);
  if (lines.length <= EFFORT_BODY_MAX_LINES) return h;
  let ee = lines.length - (EFFORT_BODY_MAX_LINES - 1);
  let ke = truncateToWidth(`\u2026 (+${ee} more lines)`, D);
  return `${lines.slice(0, EFFORT_BODY_MAX_LINES - 1).join(`
`)}
${ke}`;
}
//@ chunk-18hwfzwa.js:1106120-1106154 placement
function sanitizeNudgeText(h) {
  return stripNonPrintable(normalizeNewlines(h));
}
//@ chunk-18hwfzwa.js:1106154-1106195 placement
function subtractInsetWidth(h, x) {
  return Math.max(1, h - x);
}
//@ chunk-18hwfzwa.js:1106195-1106379 placement
function clampToTwoLines(h, columns, D) {
  let L = subtractInsetWidth(columns, D);
  let lines = wrapText(h, L, "wrap").split(`
`);
  if (lines.length <= EFFORT_OPTION_MAX_LINES) return h;
  let sliced = lines.slice(0, EFFORT_OPTION_MAX_LINES);
  sliced[EFFORT_OPTION_MAX_LINES - 1] =
    `${truncateToWidthNoEllipsis(sliced[EFFORT_OPTION_MAX_LINES - 1] ?? "", Math.max(0, L - 1))}\u2026`;
  return sliced.join(`
`);
}
//@ chunk-18hwfzwa.js:1106379-1106400 placement
var LABEL_MAX_WIDTH = 160;
var LABEL_MAX_LENGTH = 1024;
//@ chunk-18hwfzwa.js:1106400-1106603 placement
function sanitizeOneLineLabel(h) {
  let x = truncateToLength(h, LABEL_MAX_LENGTH);
  let D = renderableText(x.replace(/[\r\n\t ]+/g, " "));
  if (!isCleanText(D)) return "";
  let L = stripTrailingEllipsis(D.replace(/\s+/g, " ").trim()).trimEnd();
  if (!isCleanText(L)) return "";
  return truncateToWidth(x.length < h.length ? `${L}\u2026` : L, LABEL_MAX_WIDTH);
}
//@ chunk-18hwfzwa.js:1106603-1106798 placement
function LabelValueRow(Cn) {
  return jsxProd_default_2(
    Box,
    {
      children: [
        jsxProd_default(Box, {
          flexShrink: 0,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: Cn.label,
          }),
        }),
        jsxProd_default_2(Text, {
          wrap: "truncate-end",
          children: [" ", labelOr(Cn.value, Cn.fallback), Cn.suffix],
        }),
      ],
    },
    Cn.label,
  );
}
export { sanitizeOneLineLabel, LabelValueRow, EffortMediumNudgeDialog, formatCostMultiplier };
