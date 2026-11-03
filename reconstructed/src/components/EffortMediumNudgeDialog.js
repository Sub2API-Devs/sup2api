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
import { bQ, die } from "../utils/effortMediumNudge.js";
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
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { modelSupportsMaxEffort, effortCostRatio, getDefaultEffortLevel } from "../utils/effort.js";
import { MAX_EFFORT_DESCRIPTION } from "../utils/settings/permissionRuleCarveOut.js";
import { wrapText } from "../ink/wrap-text.js";
import { truncateToWidth, truncateToWidthNoEllipsis } from "../utils/format.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { truncateToLength } from "../utils/stringUtils.js";
import {
  P5e,
  isCleanText,
  stripTrailingEllipsis,
  labelOr,
} from "../utils/permissions/approvalPayloadSerialization.js";

/**
 * 把倍率格式化成 "~Nx"（<0.1 时两位小数）。旧版名 formatPrice 不准确。
 */
//@ chunk-18hwfzwa.js:1101734-1101913 placement = formatPrice (1)
function formatCostMultiplier(price) {
  if (price < 0.1) return `~${Math.max(0.01, Math.round(price * 100) / 100).toFixed(2)}x`;
  let x = Math.round(price * 10) / 10;
  return Number.isInteger(x) ? `~${x.toFixed(0)}x` : `~${x.toFixed(1)}x`;
}
//@ chunk-18hwfzwa.js:1101913-1101946 placement
function Uwo() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1101946-1102085 placement
var EFFORT_BODY_MAX_LINES = bQ + 1,
  EFFORT_DIALOG_PADDING = 6,
  EFFORT_DIALOG_GAP = 2,
  EFFORT_DIALOG_INSET = EFFORT_DIALOG_PADDING + 4,
  EFFORT_OPTION_MAX_LINES = 2,
  EFFORT_SWITCH_TITLE = "Switch your default effort to {to}?",
  EFFORT_SWITCH_YES_LABEL = "Yes, use {to} effort by default",
  EFFORT_SWITCH_NO_LABEL = "No, keep {from}";
/**
 * EffortMediumNudgeDialog：建议把 effort 调到 medium 的对话框。
 */
//@ chunk-18hwfzwa.js:1102085-1105698 placement
function EffortMediumNudgeDialog(h) {
  let $ = w(75),
    { model: model, copy: copy, onDone: onDone } = h,
    ke = useIsScreenReaderEnabled() ? "screen_reader" : copy.cancelFirst ? "cancel_first" : "confirm_first",
    Be;
  if (
    $[0] !== copy.cohort ||
    $[1] !== copy.fromLevel ||
    $[2] !== copy.modelKey ||
    $[3] !== copy.showWarning ||
    $[4] !== copy.toLevel ||
    $[5] !== ke
  )
    ((Be = () => {
      logEvent("tengu_effort_medium_nudge_shown", {
        cohort: fromEnum(copy.cohort),
        option_order: fromEnum(ke),
        nudge_model: telemetrySafeModelName(copy.modelKey),
        from_level: fromEnum(copy.fromLevel),
        to_level: fromEnum(copy.toLevel),
        warning_shown: copy.showWarning === !0,
      });
    }),
      ($[0] = copy.cohort),
      ($[1] = copy.fromLevel),
      ($[2] = copy.modelKey),
      ($[3] = copy.showWarning),
      ($[4] = copy.toLevel),
      ($[5] = ke),
      ($[6] = Be));
  else Be = $[6];
  (useOnFirstReveal("impression", Be), useGlobalExitKeybindings());
  let { columns: columns } = useTerminalSize(),
    We;
  if ($[7] !== onDone || $[8] !== ke)
    ((We = (ze) => onDone(ze, ke)), ($[7] = onDone), ($[8] = ke), ($[9] = We));
  else We = $[9];
  let Xe = useRefusableAnswer(We),
    rt = useInputClock(),
    [kt] = y(Uwo),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Ot;
  if ($[10] !== rt || $[11] !== kt || $[12] !== noteRefused || $[13] !== refusedWithin)
    ((Ot = () => {
      if (isWithinRecentInput(rt, kt) || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[10] = rt),
      ($[11] = kt),
      ($[12] = noteRefused),
      ($[13] = refusedWithin),
      ($[14] = Ot));
  else Ot = $[14];
  let Et = Ot,
    Dt;
  if ($[15] !== Et || $[16] !== Xe)
    ((Dt = function oo(Lt) {
      if (Et()) {
        Xe.refuse(Lt);
        return;
      }
      Xe.answer(Lt);
    }),
      ($[15] = Et),
      ($[16] = Xe),
      ($[17] = Dt));
  else Dt = $[17];
  let oo = Dt,
    Xt =
      Xe.refused !== null
        ? Xe.refused === "decline"
          ? "cancel"
          : "confirm"
        : copy.cancelFirst === !0
          ? "cancel"
          : "confirm",
    io,
    so,
    po,
    ao,
    co,
    bo,
    Ao,
    Bo,
    Ro,
    Ho,
    Io,
    Wo,
    mn;
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
    let vo = (No) =>
      eit(No.replaceAll("{model}", Cn).replaceAll("{from}", copy.fromLevel).replaceAll("{to}", copy.toLevel));
    let Yo = clampToTwoLines(vo(copy.title ?? EFFORT_SWITCH_TITLE), columns, EFFORT_DIALOG_GAP);
    let kn = vo(copy.body);
    bo = clampToTwoLines(vo(copy.confirmLabel ?? EFFORT_SWITCH_YES_LABEL), columns, EFFORT_DIALOG_INSET);
    co = clampToTwoLines(vo(copy.cancelLabel ?? EFFORT_SWITCH_NO_LABEL), columns, EFFORT_DIALOG_INSET);
    mn =
      copy.showWarning === !0
        ? clampToTwoLines(
            vo(copy.warningText ?? effortCostDescription(model, copy.fromLevel)),
            columns,
            EFFORT_DIALOG_PADDING,
          )
        : void 0;
    ao = PermissionDialog_2;
    Ao = Yo;
    po = Box;
    Ho = "column";
    Io = 2;
    Wo = 1;
    so = Box;
    Ro = 1;
    io = Text;
    Bo = clampEffortBody(kn, columns);
    (($[18] = columns),
      ($[19] = copy.body),
      ($[20] = copy.cancelLabel),
      ($[21] = copy.confirmLabel),
      ($[22] = copy.fromLevel),
      ($[23] = copy.showWarning),
      ($[24] = copy.title),
      ($[25] = copy.toLevel),
      ($[26] = copy.warningText),
      ($[27] = model),
      ($[28] = io),
      ($[29] = so),
      ($[30] = po),
      ($[31] = ao),
      ($[32] = co),
      ($[33] = bo),
      ($[34] = Ao),
      ($[35] = Bo),
      ($[36] = Ro),
      ($[37] = Ho),
      ($[38] = Io),
      ($[39] = Wo),
      ($[40] = mn));
  } else
    ((io = $[28]),
      (so = $[29]),
      (po = $[30]),
      (ao = $[31]),
      (co = $[32]),
      (bo = $[33]),
      (Ao = $[34]),
      (Bo = $[35]),
      (Ro = $[36]),
      (Ho = $[37]),
      (Io = $[38]),
      (Wo = $[39]),
      (mn = $[40]));
  let Fn;
  if ($[41] !== io || $[42] !== Bo)
    ((Fn = e(io, { children: Bo })), ($[41] = io), ($[42] = Bo), ($[43] = Fn));
  else Fn = $[43];
  let bn;
  if ($[44] !== so || $[45] !== Fn || $[46] !== Ro)
    ((bn = e(so, { marginBottom: Ro, children: Fn })),
      ($[44] = so),
      ($[45] = Fn),
      ($[46] = Ro),
      ($[47] = bn));
  else bn = $[47];
  let Go;
  if ($[48] !== mn)
    ((Go =
      mn !== void 0 && e(Box, { marginBottom: 1, children: e(Text, { color: "warning", children: mn }) })),
      ($[48] = mn),
      ($[49] = Go));
  else Go = $[49];
  const hn = copy.cancelFirst === !0;
  let Mn, Xo;
  if ($[50] !== oo)
    ((Mn = () => oo("accept")), (Xo = () => oo("decline")), ($[50] = oo), ($[51] = Mn), ($[52] = Xo));
  else ((Mn = $[51]), (Xo = $[52]));
  let Sn;
  if (
    $[53] !== co ||
    $[54] !== bo ||
    $[55] !== Xt ||
    $[56] !== kt ||
    $[57] !== Et ||
    $[58] !== Xe.attempts ||
    $[59] !== hn ||
    $[60] !== Mn ||
    $[61] !== Xo
  )
    ((Sn = e(
      ConfirmSelect,
      {
        openedAt: kt,
        confirmLabel: bo,
        cancelLabel: co,
        cancelFirst: hn,
        focus: Xt,
        hideIndexes: !0,
        refuseInput: Et,
        onConfirm: Mn,
        onCancel: Xo,
      },
      Xe.attempts,
    )),
      ($[53] = co),
      ($[54] = bo),
      ($[55] = Xt),
      ($[56] = kt),
      ($[57] = Et),
      ($[58] = Xe.attempts),
      ($[59] = hn),
      ($[60] = Mn),
      ($[61] = Xo),
      ($[62] = Sn));
  else Sn = $[62];
  let $n;
  if (
    $[63] !== po ||
    $[64] !== bn ||
    $[65] !== Go ||
    $[66] !== Sn ||
    $[67] !== Ho ||
    $[68] !== Io ||
    $[69] !== Wo
  )
    (($n = r(po, { flexDirection: Ho, paddingX: Io, paddingY: Wo, children: [bn, Go, Sn] })),
      ($[63] = po),
      ($[64] = bn),
      ($[65] = Go),
      ($[66] = Sn),
      ($[67] = Ho),
      ($[68] = Io),
      ($[69] = Wo),
      ($[70] = $n));
  else $n = $[70];
  let on;
  if ($[71] !== ao || $[72] !== Ao || $[73] !== $n)
    ((on = e(ao, { title: Ao, children: $n })), ($[71] = ao), ($[72] = Ao), ($[73] = $n), ($[74] = on));
  else on = $[74];
  return on;
}
//@ chunk-18hwfzwa.js:1105698-1105926 placement
function effortCostDescription(model, effort) {
  if (effort === "max" && modelSupportsMaxEffort(model)) return MAX_EFFORT_DESCRIPTION;
  let D = effortCostRatio(model, effort),
    L = getDefaultEffortLevel(model);
  if (D === null || effort === L) return "{from} effort uses more tokens per task than {to}.";
  return `{from} effort is ${formatCostMultiplier(D)} the estimated cost of ${L} (the default).`;
}
//@ chunk-18hwfzwa.js:1105926-1106120 placement
function clampEffortBody(h, x) {
  let D = tit(x, EFFORT_DIALOG_PADDING),
    parts = wrapText(h, D, "wrap").split(`
`);
  if (parts.length <= EFFORT_BODY_MAX_LINES) return h;
  let ee = parts.length - (EFFORT_BODY_MAX_LINES - 1),
    ke = truncateToWidth(`\u2026 (+${ee} more lines)`, D);
  return `${parts.slice(0, EFFORT_BODY_MAX_LINES - 1).join(`
`)}
${ke}`;
}
//@ chunk-18hwfzwa.js:1106120-1106154 placement
function eit(h) {
  return stripNonPrintable(die(h));
}
//@ chunk-18hwfzwa.js:1106154-1106195 placement
function tit(h, x) {
  return Math.max(1, h - x);
}
//@ chunk-18hwfzwa.js:1106195-1106379 placement
function clampToTwoLines(h, x, D) {
  let L = tit(x, D),
    parts = wrapText(h, L, "wrap").split(`
`);
  if (parts.length <= EFFORT_OPTION_MAX_LINES) return h;
  let sliced = parts.slice(0, EFFORT_OPTION_MAX_LINES);
  return (
    (sliced[EFFORT_OPTION_MAX_LINES - 1] =
      `${truncateToWidthNoEllipsis(sliced[EFFORT_OPTION_MAX_LINES - 1] ?? "", Math.max(0, L - 1))}\u2026`),
    sliced.join(`
`)
  );
}
//@ chunk-18hwfzwa.js:1106379-1106400 placement
var Wwo = 160,
  jwo = 1024;
//@ chunk-18hwfzwa.js:1106400-1106603 placement
function sanitizeOneLineLabel(h) {
  let x = truncateToLength(h, jwo),
    D = P5e(x.replace(/[\r\n\t ]+/g, " "));
  if (!isCleanText(D)) return "";
  let trimEnd = stripTrailingEllipsis(D.replace(/\s+/g, " ").trim()).trimEnd();
  if (!isCleanText(trimEnd)) return "";
  return truncateToWidth(x.length < h.length ? `${trimEnd}\u2026` : trimEnd, Wwo);
}
//@ chunk-18hwfzwa.js:1106603-1106798 placement
function LabelValueRow(Cn) {
  return r(
    Box,
    {
      children: [
        e(Box, { flexShrink: 0, children: e(Text, { dimColor: !0, children: Cn.label }) }),
        r(Text, { wrap: "truncate-end", children: [" ", labelOr(Cn.value, Cn.fallback), Cn.suffix] }),
      ],
    },
    Cn.label,
  );
}

export { sanitizeOneLineLabel, LabelValueRow, EffortMediumNudgeDialog, formatCostMultiplier };
