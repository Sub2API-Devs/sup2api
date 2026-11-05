/**
 * components/usageCredits/AdminRequestDialog.tsx
 *
 * 2.1.316 新增。向管理员申请额度对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (6)
 * attribution: placement 5, layout 1
 */
import { logForDebugging } from "../../utils/debug.js";
import { RECENT_INPUT_GUARD_MS_2 } from "../../hooks/useRecentInputGuard.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { logEvent } from "../../services/analytics/index.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { fileAdminLimitRequest } from "../../services/api/adminRequests.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-czq1j3j2.js:1212223-1212234 placement
var MAX_RESOLVE_RETRIES = 40;
//@ chunk-czq1j3j2.js:1212234-1212258 placement
function resolveWhenTaken(resolveFn) {
  resolveWhenTaken_2(resolveFn, 1);
}
//@ chunk-czq1j3j2.js:1212258-1212414 placement
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
//@ chunk-czq1j3j2.js:1212414-1212550 placement
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
//@ chunk-czq1j3j2.js:1212550-1212621 layout
function logConfirmShown() {
  logEvent("tengu_usage_credits_admin_request_confirm_shown", {});
}
//@ chunk-czq1j3j2.js:1212621-1215272 placement
/**
 * 向管理员申请额度的确认对话框。
 */
function AdminRequestConfirmDialog(props) {
  let $ = useMemoCache(36);
  let { extraUsage, onDone, onOutcome, wouldTakeAnswer } = props;
  let { credentials } = useTheme_2();
  let [isSubmitting, setIsSubmitting] = useState(false);
  let hasAnsweredRef = useRef(false);
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let isInputRefused;
  if ($[0] !== isRecentInput || $[1] !== noteRefused || $[2] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = isRecentInput;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = isInputRefused;
  } else isInputRefused = $[3];
  let refuseInput = isInputRefused;
  let openedAt = useMountTime();
  let remount = settleKey(epoch);
  let logShown;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    logShown = [];
    $[4] = logShown;
  } else logShown = $[4];
  useEffect(logConfirmShown, logShown);
  let onConfirm;
  if (
    $[5] !== credentials ||
    $[6] !== extraUsage ||
    $[7] !== isRecentInput ||
    $[8] !== noteRefused ||
    $[9] !== onDone ||
    $[10] !== onOutcome ||
    $[11] !== refusedWithin ||
    $[12] !== wouldTakeAnswer
  ) {
    onConfirm = function onConfirm_() {
      if (hasAnsweredRef.current) {
        return;
      }
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      hasAnsweredRef.current = true;
      logEvent("tengu_usage_credits_admin_request_confirm_result", {
        action: lit_2("confirmed"),
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
    $[5] = credentials;
    $[6] = extraUsage;
    $[7] = isRecentInput;
    $[8] = noteRefused;
    $[9] = onDone;
    $[10] = onOutcome;
    $[11] = refusedWithin;
    $[12] = wouldTakeAnswer;
    $[13] = onConfirm;
  } else onConfirm = $[13];
  let onConfirm_2 = onConfirm;
  let onCancel;
  if (
    $[14] !== isRecentInput ||
    $[15] !== noteRefused ||
    $[16] !== onDone ||
    $[17] !== onOutcome ||
    $[18] !== refusedWithin
  ) {
    onCancel = function onCancel_() {
      if (hasAnsweredRef.current) {
        return;
      }
      if (isRecentInput() || refusedWithin()) {
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
      });
    };
    $[14] = isRecentInput;
    $[15] = noteRefused;
    $[16] = onDone;
    $[17] = onOutcome;
    $[18] = refusedWithin;
    $[19] = onCancel;
  } else onCancel = $[19];
  let onCancel_2 = onCancel;
  if (isSubmitting) {
    let sendingElement;
    if ($[20] === MEMO_CACHE_SENTINEL) {
      sendingElement = jsxProd_default(Box, {
        paddingTop: 1,
        children: jsxProd_default(WorkerBadge, {
          message: "Sending request to your admin\u2026",
        }),
      });
      $[20] = sendingElement;
    } else sendingElement = $[20];
    return sendingElement;
  }
  let bodyText_ =
    extraUsage == null
      ? "turn on or increase your usage credits"
      : extraUsage.is_enabled
        ? "increase your usage credit limit"
        : "turn on usage credits";
  let bodyElement;
  if ($[21] !== bodyText_) {
    bodyElement = jsxProd_default_2(Text, {
      children: ["This will send a request to your organization's admins to ", bodyText_, "."],
    });
    $[21] = bodyText_;
    $[22] = bodyElement;
  } else bodyElement = $[22];
  let noteElement;
  if ($[23] === MEMO_CACHE_SENTINEL) {
    noteElement = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Only send this if you're running into usage limits \u2014 your admins are notified and review each request.",
    });
    $[23] = noteElement;
  } else noteElement = $[23];
  let confirmElement;
  if (
    $[24] !== remount.remountKey ||
    $[25] !== onCancel_2 ||
    $[26] !== onConfirm_2 ||
    $[27] !== refuseInput ||
    $[28] !== openedAt
  ) {
    confirmElement = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput,
        openedAt,
        hideIndexes: true,
        confirmLabel: "Send request",
        cancelLabel: "Cancel",
        focus: "cancel",
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      remount.remountKey,
    );
    $[24] = remount.remountKey;
    $[25] = onCancel_2;
    $[26] = onConfirm_2;
    $[27] = refuseInput;
    $[28] = openedAt;
    $[29] = confirmElement;
  } else confirmElement = $[29];
  let children;
  if ($[30] !== bodyElement || $[31] !== confirmElement) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [bodyElement, noteElement, confirmElement],
    });
    $[30] = bodyElement;
    $[31] = confirmElement;
    $[32] = children;
  } else children = $[32];
  let dialogElement;
  if ($[33] !== onCancel_2 || $[34] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Request usage credits from your admin",
      onCancel: onCancel_2,
      color: "suggestion",
      children,
    });
    $[33] = onCancel_2;
    $[34] = children;
    $[35] = dialogElement;
  } else dialogElement = $[35];
  return dialogElement;
}
export { resolveWhenTaken, AdminRequestConfirmDialog };
