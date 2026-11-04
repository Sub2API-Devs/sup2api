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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
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
function resolveWhenTaken(resolveFn) {
  resolveWhenTaken_2(resolveFn, 1);
}
//@ chunk-18hwfzwa.js:1181480-1181636 placement
function resolveWhenTaken_2(resolveFn, retryCount) {
  if (resolveFn() !== false) return;
  if (retryCount >= MAX_RESOLVE_RETRIES) {
    logForDebugging("resolveWhenTaken: gave up retrying a refused resolution", {
      level: "warn",
    });
    return;
  }
  setTimeout(retryResolveWhenTaken, RECENT_INPUT_GUARD_MS_2, resolveFn, retryCount + 1);
}
//@ chunk-18hwfzwa.js:1181636-1181772 placement
function retryResolveWhenTaken(resolveFn, retryCount) {
  try {
    resolveWhenTaken_2(resolveFn, retryCount);
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
  let $ = useMemoCache(50);
  let { extraUsage, flag, onDone, onOutcome, wouldTakeAnswer } = props;
  let { credentials } = useTheme_2();
  let [isSubmitting, setIsSubmitting] = useState(false);
  let hasAnsweredRef = useRef(false);
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let isInputRefused;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = isInputRefused;
  } else isInputRefused = $[3];
  let refuseInput = isInputRefused;
  let openedAt = useMountTime();
  let remount = settleKey(epoch);
  let flagOverride = flag?.mode === "confirm" ? flag : undefined;
  const mode = flag?.mode ?? "default";
  let mode_2;
  if ($[4] !== mode) {
    mode_2 = fromEnum(mode);
    $[4] = mode;
    $[5] = mode_2;
  } else mode_2 = $[5];
  let modeName = mode_2;
  let logShown;
  let logShownDeps;
  if ($[6] !== modeName) {
    logShown = () => {
      logEvent("tengu_usage_credits_admin_request_confirm_shown", {
        mode: modeName,
      });
    };
    logShownDeps = [modeName];
    $[6] = modeName;
    $[7] = logShown;
    $[8] = logShownDeps;
  } else {
    logShown = $[7];
    logShownDeps = $[8];
  }
  useEffect(logShown, logShownDeps);
  let onConfirm;
  if (
    $[9] !== credentials ||
    $[10] !== extraUsage ||
    $[11] !== inputRefusalWindow ||
    $[12] !== modeName ||
    $[13] !== noteRefused ||
    $[14] !== onDone ||
    $[15] !== onOutcome ||
    $[16] !== refusedWithin ||
    $[17] !== wouldTakeAnswer
  ) {
    onConfirm = function onConfirm_() {
      if (hasAnsweredRef.current) {
        return;
      }
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      hasAnsweredRef.current = true;
      logEvent("tengu_usage_credits_admin_request_confirm_result", {
        action: lit_2("confirmed"),
        mode: modeName,
      });
      setIsSubmitting(true);
      fileAdminLimitRequest(extraUsage, credentials).then((result) => {
        if (result.outcome === "granted" && result.grantLine !== undefined)
          onOutcome?.({
            outcome: "granted",
            grantLine: result.grantLine,
          });
        else
          onOutcome?.({
            outcome: result.filed ? "filed" : "failed",
          });
        resolveWhenTaken(() => onDone(result.value));
      });
    };
    $[9] = credentials;
    $[10] = extraUsage;
    $[11] = inputRefusalWindow;
    $[12] = modeName;
    $[13] = noteRefused;
    $[14] = onDone;
    $[15] = onOutcome;
    $[16] = refusedWithin;
    $[17] = wouldTakeAnswer;
    $[18] = onConfirm;
  } else onConfirm = $[18];
  let onConfirm_2 = onConfirm;
  let onCancel;
  if (
    $[19] !== inputRefusalWindow ||
    $[20] !== modeName ||
    $[21] !== noteRefused ||
    $[22] !== onDone ||
    $[23] !== onOutcome ||
    $[24] !== refusedWithin
  ) {
    onCancel = function onCancel_() {
      if (hasAnsweredRef.current) {
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
      hasAnsweredRef.current = true;
      logEvent("tengu_usage_credits_admin_request_confirm_result", {
        action: lit_2("cancelled"),
        mode: modeName,
      });
    };
    $[19] = inputRefusalWindow;
    $[20] = modeName;
    $[21] = noteRefused;
    $[22] = onDone;
    $[23] = onOutcome;
    $[24] = refusedWithin;
    $[25] = onCancel;
  } else onCancel = $[25];
  let onCancel_2 = onCancel;
  if (isSubmitting) {
    let sendingElement;
    if ($[26] === MEMO_CACHE_SENTINEL) {
      sendingElement = jsxProd_default(Box, {
        paddingTop: 1,
        children: jsxProd_default(WorkerBadge, {
          message: "Sending request to your admin\u2026",
        }),
      });
      $[26] = sendingElement;
    } else sendingElement = $[26];
    return sendingElement;
  }
  let askPhrase =
    extraUsage == null
      ? "turn on or increase your usage credits"
      : extraUsage.is_enabled
        ? "increase your usage credit limit"
        : "turn on usage credits";
  let bodyText;
  if ($[27] !== askPhrase || $[28] !== flagOverride?.body) {
    bodyText =
      flagOverride?.body?.replaceAll("{ask}", askPhrase) ??
      `This will send a request to your organization's admins to ${askPhrase}.`;
    $[27] = askPhrase;
    $[28] = flagOverride?.body;
    $[29] = bodyText;
  } else bodyText = $[29];
  let bodyText_ = bodyText;
  let note =
    flagOverride?.note ??
    "Only send this if you're running into usage limits \u2014 your admins are notified and review each request.";
  const title = flagOverride?.title ?? "Request usage credits from your admin";
  let bodyElement;
  if ($[30] !== bodyText_) {
    bodyElement =
      bodyText_ !== "" &&
      jsxProd_default(Text, {
        children: bodyText_,
      });
    $[30] = bodyText_;
    $[31] = bodyElement;
  } else bodyElement = $[31];
  let noteElement;
  if ($[32] !== note) {
    noteElement =
      note !== "" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: note,
      });
    $[32] = note;
    $[33] = noteElement;
  } else noteElement = $[33];
  const confirmLabel = flagOverride?.send ?? "Send request";
  const cancelLabel = flagOverride?.cancel ?? "Cancel";
  let confirmElement;
  if (
    $[34] !== remount.remountKey ||
    $[35] !== onCancel_2 ||
    $[36] !== onConfirm_2 ||
    $[37] !== refuseInput ||
    $[38] !== openedAt ||
    $[39] !== confirmLabel ||
    $[40] !== cancelLabel
  ) {
    confirmElement = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        confirmLabel,
        cancelLabel,
        focus: "cancel",
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      remount.remountKey,
    );
    $[34] = remount.remountKey;
    $[35] = onCancel_2;
    $[36] = onConfirm_2;
    $[37] = refuseInput;
    $[38] = openedAt;
    $[39] = confirmLabel;
    $[40] = cancelLabel;
    $[41] = confirmElement;
  } else confirmElement = $[41];
  let children;
  if ($[42] !== bodyElement || $[43] !== noteElement || $[44] !== confirmElement) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [bodyElement, noteElement, confirmElement],
    });
    $[42] = bodyElement;
    $[43] = noteElement;
    $[44] = confirmElement;
    $[45] = children;
  } else children = $[45];
  let dialogElement;
  if ($[46] !== onCancel_2 || $[47] !== children || $[48] !== title) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      onCancel: onCancel_2,
      color: "suggestion",
      children,
    });
    $[46] = onCancel_2;
    $[47] = children;
    $[48] = title;
    $[49] = dialogElement;
  } else dialogElement = $[49];
  return dialogElement;
}
export { resolveWhenTaken, AdminRequestConfirmDialog };
