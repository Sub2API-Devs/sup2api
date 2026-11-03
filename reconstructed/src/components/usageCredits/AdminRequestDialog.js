/**
 * components/usageCredits/AdminRequestDialog.tsx
 *
 * 2.1.316 新增。向管理员申请额度对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { logForDebugging } from "../../utils/debug.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { fileAdminLimitRequest } from "../../services/api/adminRequests.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1181445-1181456 placement
var TTo = 40;
//@ chunk-18hwfzwa.js:1181456-1181480 placement
function hS(h) {
  resolveWhenTaken(h, 1);
}
//@ chunk-18hwfzwa.js:1181480-1181636 placement
function resolveWhenTaken(h, x) {
  if (h() !== !1) return;
  if (x >= TTo) {
    logForDebugging("resolveWhenTaken: gave up retrying a refused resolution", { level: "warn" });
    return;
  }
  setTimeout(retryResolveWhenTaken, RECENT_INPUT_GUARD_MS, h, x + 1);
}
//@ chunk-18hwfzwa.js:1181636-1181772 placement
function retryResolveWhenTaken(h, x) {
  try {
    resolveWhenTaken(h, x);
  } catch (error) {
    if (isAbortError(error)) {
      logForDebugging("resolveWhenTaken: retry abandoned, its flow aborted", { level: "debug" });
      return;
    }
    logError(error);
  }
}
/**
 * 向管理员申请额度的确认对话框。
 */
//@ chunk-18hwfzwa.js:1181772-1185083 placement
function AdminRequestConfirmDialog(h) {
  let $ = w(50),
    {
      extraUsage: extraUsage,
      flag: flag,
      onDone: onDone,
      onOutcome: onOutcome,
      wouldTakeAnswer: wouldTakeAnswer,
    } = h,
    { credentials: credentials } = Me(),
    [Be, He] = y(!1),
    We = R(!1),
    ze = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    It;
  if ($[0] !== ze || $[1] !== noteRefused || $[2] !== refusedWithin)
    ((It = function Ot() {
      if (ze() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[0] = ze),
      ($[1] = noteRefused),
      ($[2] = refusedWithin),
      ($[3] = It));
  else It = $[3];
  let Ot = It,
    Et = useMountTime(),
    Dt = settleKey(epoch),
    Lt = flag?.mode === "confirm" ? flag : void 0;
  const oo = flag?.mode ?? "default";
  let Xt;
  if ($[4] !== oo) ((Xt = fromEnum(oo)), ($[4] = oo), ($[5] = Xt));
  else Xt = $[5];
  let io = Xt,
    so,
    po;
  if ($[6] !== io)
    ((so = () => {
      logEvent("tengu_usage_credits_admin_request_confirm_shown", { mode: io });
    }),
      (po = [io]),
      ($[6] = io),
      ($[7] = so),
      ($[8] = po));
  else ((so = $[7]), (po = $[8]));
  P(so, po);
  let ao;
  if (
    $[9] !== credentials ||
    $[10] !== extraUsage ||
    $[11] !== ze ||
    $[12] !== io ||
    $[13] !== noteRefused ||
    $[14] !== onDone ||
    $[15] !== onOutcome ||
    $[16] !== refusedWithin ||
    $[17] !== wouldTakeAnswer
  )
    ((ao = function bo() {
      if (We.current) {
        return;
      }
      if (ze() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      ((We.current = !0),
        logEvent("tengu_usage_credits_admin_request_confirm_result", {
          action: lit_2("confirmed"),
          mode: io,
        }),
        He(!0),
        fileAdminLimitRequest(extraUsage, credentials).then((co) => {
          if (co.outcome === "granted" && co.grantLine !== void 0)
            onOutcome?.({ outcome: "granted", grantLine: co.grantLine });
          else onOutcome?.({ outcome: co.filed ? "filed" : "failed" });
          hS(() => onDone(co.value));
        }));
    }),
      ($[9] = credentials),
      ($[10] = extraUsage),
      ($[11] = ze),
      ($[12] = io),
      ($[13] = noteRefused),
      ($[14] = onDone),
      ($[15] = onOutcome),
      ($[16] = refusedWithin),
      ($[17] = wouldTakeAnswer),
      ($[18] = ao));
  else ao = $[18];
  let bo = ao,
    Ao;
  if (
    $[19] !== ze ||
    $[20] !== io ||
    $[21] !== noteRefused ||
    $[22] !== onDone ||
    $[23] !== onOutcome ||
    $[24] !== refusedWithin
  )
    ((Ao = function Bo() {
      if (We.current) {
        return;
      }
      if (ze() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("No request sent to your admin.") === !1) {
        return;
      }
      (onOutcome?.({ outcome: "cancelled" }),
        (We.current = !0),
        logEvent("tengu_usage_credits_admin_request_confirm_result", {
          action: lit_2("cancelled"),
          mode: io,
        }));
    }),
      ($[19] = ze),
      ($[20] = io),
      ($[21] = noteRefused),
      ($[22] = onDone),
      ($[23] = onOutcome),
      ($[24] = refusedWithin),
      ($[25] = Ao));
  else Ao = $[25];
  let Bo = Ao;
  if (Be) {
    let Ro;
    if ($[26] === MEMO_CACHE_SENTINEL)
      ((Ro = e(Box, {
        paddingTop: 1,
        children: e(WorkerBadge, { message: "Sending request to your admin\u2026" }),
      })),
        ($[26] = Ro));
    else Ro = $[26];
    return Ro;
  }
  let Ho =
      extraUsage == null
        ? "turn on or increase your usage credits"
        : extraUsage.is_enabled
          ? "increase your usage credit limit"
          : "turn on usage credits",
    Ro;
  if ($[27] !== Ho || $[28] !== Lt?.body)
    ((Ro =
      Lt?.body?.replaceAll("{ask}", Ho) ??
      `This will send a request to your organization's admins to ${Ho}.`),
      ($[27] = Ho),
      ($[28] = Lt?.body),
      ($[29] = Ro));
  else Ro = $[29];
  let Io = Ro,
    Wo =
      Lt?.note ??
      "Only send this if you're running into usage limits \u2014 your admins are notified and review each request.";
  const mn = Lt?.title ?? "Request usage credits from your admin";
  let Cn;
  if ($[30] !== Io) ((Cn = Io !== "" && e(Text, { children: Io })), ($[30] = Io), ($[31] = Cn));
  else Cn = $[31];
  let No;
  if ($[32] !== Wo) ((No = Wo !== "" && e(Text, { dimColor: !0, children: Wo })), ($[32] = Wo), ($[33] = No));
  else No = $[33];
  const vo = Lt?.send ?? "Send request",
    Yo = Lt?.cancel ?? "Cancel";
  let kn;
  if (
    $[34] !== Dt.remountKey ||
    $[35] !== Bo ||
    $[36] !== bo ||
    $[37] !== Ot ||
    $[38] !== Et ||
    $[39] !== vo ||
    $[40] !== Yo
  )
    ((kn = e(
      ConfirmSelect,
      {
        refuseInput: Ot,
        openedAt: Et,
        hideIndexes: !0,
        confirmLabel: vo,
        cancelLabel: Yo,
        focus: "cancel",
        onConfirm: bo,
        onCancel: Bo,
      },
      Dt.remountKey,
    )),
      ($[34] = Dt.remountKey),
      ($[35] = Bo),
      ($[36] = bo),
      ($[37] = Ot),
      ($[38] = Et),
      ($[39] = vo),
      ($[40] = Yo),
      ($[41] = kn));
  else kn = $[41];
  let Fn;
  if ($[42] !== Cn || $[43] !== No || $[44] !== kn)
    ((Fn = r(Box, { flexDirection: "column", gap: 1, children: [Cn, No, kn] })),
      ($[42] = Cn),
      ($[43] = No),
      ($[44] = kn),
      ($[45] = Fn));
  else Fn = $[45];
  let bn;
  if ($[46] !== Bo || $[47] !== Fn || $[48] !== mn)
    ((bn = e(Dialog, { title: mn, onCancel: Bo, color: "suggestion", children: Fn })),
      ($[46] = Bo),
      ($[47] = Fn),
      ($[48] = mn),
      ($[49] = bn));
  else bn = $[49];
  return bn;
}

export { hS, AdminRequestConfirmDialog };
