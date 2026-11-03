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
import { RECENT_INPUT_GUARD_MS_2 } from "../../hooks/useRecentInputGuard.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1181445-1181456 placement
var MAX_RESOLVE_RETRIES = 40;
//@ chunk-18hwfzwa.js:1181456-1181480 placement
function resolveWhenTaken(h) {
  resolveWhenTaken_2(h, 1);
}
//@ chunk-18hwfzwa.js:1181480-1181636 placement
function resolveWhenTaken_2(h, x) {
  if (h() !== false) return;
  if (x >= MAX_RESOLVE_RETRIES) {
    logForDebugging("resolveWhenTaken: gave up retrying a refused resolution", {
      level: "warn",
    });
    return;
  }
  setTimeout(retryResolveWhenTaken, RECENT_INPUT_GUARD_MS_2, h, x + 1);
}
//@ chunk-18hwfzwa.js:1181636-1181772 placement
function retryResolveWhenTaken(h, x) {
  try {
    resolveWhenTaken_2(h, x);
  } catch (error) {
    if (isAbortError(error)) {
      logForDebugging("resolveWhenTaken: retry abandoned, its flow aborted", {
        level: "debug",
      });
      return;
    }
    logError(error);
  }
}
//@ chunk-18hwfzwa.js:1181772-1185083 placement
/**
 * 向管理员申请额度的确认对话框。
 */
function AdminRequestConfirmDialog(props) {
  let $ = w(50);
  let { extraUsage, flag, onDone, onOutcome, wouldTakeAnswer } = props;
  let { credentials } = useTheme_2();
  let [Be, He] = y(false);
  let We = R(false);
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let It;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    It = function Ot() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = It;
  } else It = $[3];
  let refuseInput = It;
  let openedAt = useMountTime();
  let Dt = settleKey(epoch);
  let Lt = flag?.mode === "confirm" ? flag : undefined;
  const mode = flag?.mode ?? "default";
  let Xt;
  if ($[4] !== mode) {
    Xt = fromEnum(mode);
    $[4] = mode;
    $[5] = Xt;
  } else Xt = $[5];
  let io = Xt;
  let so;
  let po;
  if ($[6] !== io) {
    so = () => {
      logEvent("tengu_usage_credits_admin_request_confirm_shown", {
        mode: io,
      });
    };
    po = [io];
    $[6] = io;
    $[7] = so;
    $[8] = po;
  } else {
    so = $[7];
    po = $[8];
  }
  P(so, po);
  let ao;
  if (
    $[9] !== credentials ||
    $[10] !== extraUsage ||
    $[11] !== inputRefusalWindow ||
    $[12] !== io ||
    $[13] !== noteRefused ||
    $[14] !== onDone ||
    $[15] !== onOutcome ||
    $[16] !== refusedWithin ||
    $[17] !== wouldTakeAnswer
  ) {
    ao = function bo() {
      if (We.current) {
        return;
      }
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      We.current = true;
      logEvent("tengu_usage_credits_admin_request_confirm_result", {
        action: lit_2("confirmed"),
        mode: io,
      });
      He(true);
      fileAdminLimitRequest(extraUsage, credentials).then((co) => {
        if (co.outcome === "granted" && co.grantLine !== undefined)
          onOutcome?.({
            outcome: "granted",
            grantLine: co.grantLine,
          });
        else
          onOutcome?.({
            outcome: co.filed ? "filed" : "failed",
          });
        resolveWhenTaken(() => onDone(co.value));
      });
    };
    $[9] = credentials;
    $[10] = extraUsage;
    $[11] = inputRefusalWindow;
    $[12] = io;
    $[13] = noteRefused;
    $[14] = onDone;
    $[15] = onOutcome;
    $[16] = refusedWithin;
    $[17] = wouldTakeAnswer;
    $[18] = ao;
  } else ao = $[18];
  let onConfirm = ao;
  let Ao;
  if (
    $[19] !== inputRefusalWindow ||
    $[20] !== io ||
    $[21] !== noteRefused ||
    $[22] !== onDone ||
    $[23] !== onOutcome ||
    $[24] !== refusedWithin
  ) {
    Ao = function Bo() {
      if (We.current) {
        return;
      }
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (onDone("No request sent to your admin.") === false) {
        return;
      }
      onOutcome?.({
        outcome: "cancelled",
      });
      We.current = true;
      logEvent("tengu_usage_credits_admin_request_confirm_result", {
        action: lit_2("cancelled"),
        mode: io,
      });
    };
    $[19] = inputRefusalWindow;
    $[20] = io;
    $[21] = noteRefused;
    $[22] = onDone;
    $[23] = onOutcome;
    $[24] = refusedWithin;
    $[25] = Ao;
  } else Ao = $[25];
  let onCancel = Ao;
  if (Be) {
    let Ro;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      Ro = jsxProd_default(Box, {
        paddingTop: 1,
        children: jsxProd_default(WorkerBadge, {
          message: "Sending request to your admin\u2026",
        }),
      });
      $[26] = Ro;
    } else Ro = $[26];
    return Ro;
  }
  let Ho =
    extraUsage == null
      ? "turn on or increase your usage credits"
      : extraUsage.is_enabled
        ? "increase your usage credit limit"
        : "turn on usage credits";
  let Ro;
  if ($[27] !== Ho || $[28] !== Lt?.body) {
    Ro =
      Lt?.body?.replaceAll("{ask}", Ho) ?? `This will send a request to your organization's admins to ${Ho}.`;
    $[27] = Ho;
    $[28] = Lt?.body;
    $[29] = Ro;
  } else Ro = $[29];
  let Io = Ro;
  let note =
    Lt?.note ??
    "Only send this if you're running into usage limits \u2014 your admins are notified and review each request.";
  const title = Lt?.title ?? "Request usage credits from your admin";
  let Cn;
  if ($[30] !== Io) {
    Cn =
      Io !== "" &&
      jsxProd_default(Text, {
        children: Io,
      });
    $[30] = Io;
    $[31] = Cn;
  } else Cn = $[31];
  let No;
  if ($[32] !== note) {
    No =
      note !== "" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: note,
      });
    $[32] = note;
    $[33] = No;
  } else No = $[33];
  const confirmLabel = Lt?.send ?? "Send request";
  const cancelLabel = Lt?.cancel ?? "Cancel";
  let kn;
  if (
    $[34] !== Dt.remountKey ||
    $[35] !== onCancel ||
    $[36] !== onConfirm ||
    $[37] !== refuseInput ||
    $[38] !== openedAt ||
    $[39] !== confirmLabel ||
    $[40] !== cancelLabel
  ) {
    kn = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        confirmLabel,
        cancelLabel,
        focus: "cancel",
        onConfirm,
        onCancel,
      },
      Dt.remountKey,
    );
    $[34] = Dt.remountKey;
    $[35] = onCancel;
    $[36] = onConfirm;
    $[37] = refuseInput;
    $[38] = openedAt;
    $[39] = confirmLabel;
    $[40] = cancelLabel;
    $[41] = kn;
  } else kn = $[41];
  let children;
  if ($[42] !== Cn || $[43] !== No || $[44] !== kn) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Cn, No, kn],
    });
    $[42] = Cn;
    $[43] = No;
    $[44] = kn;
    $[45] = children;
  } else children = $[45];
  let bn;
  if ($[46] !== onCancel || $[47] !== children || $[48] !== title) {
    bn = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "suggestion",
      children,
    });
    $[46] = onCancel;
    $[47] = children;
    $[48] = title;
    $[49] = bn;
  } else bn = $[49];
  return bn;
}
export { resolveWhenTaken, AdminRequestConfirmDialog };
