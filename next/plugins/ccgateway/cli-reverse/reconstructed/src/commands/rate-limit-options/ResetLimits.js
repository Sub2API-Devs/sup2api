/**
 * commands/rate-limit-options/ResetLimits.tsx
 *
 * 重置用量限额界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5cvewgfe.js (7)
 * attribution: placement 7
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
} from "../../components/CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getCedarEmberCopy, formatLimitResetTemplate } from "../limit-reset/index.js";
import {
  resetOfferFields,
  earlyUseLine,
  reportResetDeclined,
  claimReset,
  resetOfferLabel,
  keepResetForLater,
  reportResetSelected,
} from "../../services/rateLimit/rateLimitWall.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-5cvewgfe.js:633-637 placement
init_react_production();
//@ chunk-5cvewgfe.js:637-652 placement
function noop() {}
//@ chunk-5cvewgfe.js:652-2981 placement
/**
 * 重置用量限额的界面：调用重置接口并显示进度
 */
function ResetLimits(props) {
  let $ = useMemoCache(55);
  let { offer, entry, credentials, onDone } = props;
  let [isClaiming, setIsClaiming] = useState(false);
  let submittedRef = useRef(false);
  let recentInput = useRecentInputWithin(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let mountTime = useMountTime();
  let ConfirmComponent;
  let DialogComponent;
  let handleDecline;
  let refuseInput;
  let bodyElement;
  let earlyReturnElement;
  let openedAt;
  let windowMs;
  let hideIndexes;
  let confirmLabel;
  let cancelLabel;
  let title;
  let onCancel;
  let color;
  let onConfirm;
  if (
    $[0] !== isClaiming ||
    $[1] !== credentials ||
    $[2] !== entry ||
    $[3] !== recentInput ||
    $[4] !== noteRefused ||
    $[5] !== offer ||
    $[6] !== onDone ||
    $[7] !== refusedWithin ||
    $[8] !== mountTime
  ) {
    earlyReturnElement = EARLY_RETURN_SENTINEL;
    io: {
      let cedarEmberCopy = getCedarEmberCopy();
      let templateFields = resetOfferFields(offer);
      let earlyUseLineRaw;
      if ($[24] !== offer) {
        earlyUseLineRaw = earlyUseLine(offer);
        $[24] = offer;
        $[25] = earlyUseLineRaw;
      } else earlyUseLineRaw = $[25];
      let earlyUseText = earlyUseLineRaw;
      let shouldRefuseCached;
      if ($[26] !== recentInput || $[27] !== noteRefused || $[28] !== refusedWithin) {
        shouldRefuseCached = function shouldRefuseRecentInput() {
          if (recentInput() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
            noteRefused();
            return true;
          }
          return false;
        };
        $[26] = recentInput;
        $[27] = noteRefused;
        $[28] = refusedWithin;
        $[29] = shouldRefuseCached;
      } else shouldRefuseCached = $[29];
      let shouldRefuseInput = shouldRefuseCached;
      let declineHandlerCached;
      if ($[30] !== entry || $[31] !== offer || $[32] !== onDone || $[33] !== shouldRefuseInput) {
        declineHandlerCached = function handleDeclineInternal() {
          if (submittedRef.current || shouldRefuseInput()) {
            return;
          }
          submittedRef.current = true;
          onDone(reportResetDeclined(entry, offer));
        };
        $[30] = entry;
        $[31] = offer;
        $[32] = onDone;
        $[33] = shouldRefuseInput;
        $[34] = declineHandlerCached;
      } else declineHandlerCached = $[34];
      handleDecline = declineHandlerCached;
      onConfirm = function handleConfirm() {
        if (submittedRef.current || shouldRefuseInput()) {
          return;
        }
        submittedRef.current = true;
        setIsClaiming(true);
        claimReset(entry, credentials, offer)
          .then(onDone)
          .catch(() => {
            onDone({
              outcome: "unavailable",
              text: formatLimitResetTemplate(
                offer.origin === "wall"
                  ? cedarEmberCopy.unconfirmedLine
                  : cedarEmberCopy.unconfirmedAnytimeLine,
                templateFields,
              ),
            });
          });
      };
      if (isClaiming) {
        const title = formatLimitResetTemplate(cedarEmberCopy.confirmTitle, templateFields);
        let children;
        if ($[35] === MEMO_CACHE_SENTINEL) {
          children = jsxProd_default(Text, {
            dimColor: true,
            children: "Resetting your limits\u2026 this usually takes a few seconds",
          });
          $[35] = children;
        } else children = $[35];
        earlyReturnElement = jsxProd_default(Dialog, {
          title,
          onCancel: noop,
          exitOnCtrlCD: true,
          color: "suggestion",
          hideInputGuide: true,
          children,
        });
        break io;
      }
      DialogComponent = Dialog;
      title = formatLimitResetTemplate(cedarEmberCopy.confirmTitle, templateFields);
      onCancel = handleDecline;
      color = "suggestion";
      let earlyUseElement;
      if ($[36] !== earlyUseText) {
        earlyUseElement =
          earlyUseText === undefined
            ? null
            : jsxProd_default(Text, {
                children: earlyUseText,
              });
        $[36] = earlyUseText;
        $[37] = earlyUseElement;
      } else earlyUseElement = $[37];
      bodyElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          earlyUseElement,
          jsxProd_default(Text, {
            children: formatLimitResetTemplate(cedarEmberCopy.confirmBody, templateFields),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: formatLimitResetTemplate(cedarEmberCopy.confirmDetail, templateFields),
          }),
        ],
      });
      ConfirmComponent = ConfirmSelect;
      refuseInput = shouldRefuseInput;
      openedAt = mountTime;
      windowMs = RECENT_INPUT_GUARD_MS;
      hideIndexes = true;
      confirmLabel = formatLimitResetTemplate(cedarEmberCopy.confirmYes, templateFields);
      cancelLabel = formatLimitResetTemplate(cedarEmberCopy.confirmNo, templateFields);
    }
    $[0] = isClaiming;
    $[1] = credentials;
    $[2] = entry;
    $[3] = recentInput;
    $[4] = noteRefused;
    $[5] = offer;
    $[6] = onDone;
    $[7] = refusedWithin;
    $[8] = mountTime;
    $[9] = ConfirmComponent;
    $[10] = DialogComponent;
    $[11] = handleDecline;
    $[12] = refuseInput;
    $[13] = bodyElement;
    $[14] = earlyReturnElement;
    $[15] = openedAt;
    $[16] = windowMs;
    $[17] = hideIndexes;
    $[18] = confirmLabel;
    $[19] = cancelLabel;
    $[20] = title;
    $[21] = onCancel;
    $[22] = color;
    $[23] = onConfirm;
  } else {
    ConfirmComponent = $[9];
    DialogComponent = $[10];
    handleDecline = $[11];
    refuseInput = $[12];
    bodyElement = $[13];
    earlyReturnElement = $[14];
    openedAt = $[15];
    windowMs = $[16];
    hideIndexes = $[17];
    confirmLabel = $[18];
    cancelLabel = $[19];
    title = $[20];
    onCancel = $[21];
    color = $[22];
    onConfirm = $[23];
  }
  if (earlyReturnElement !== EARLY_RETURN_SENTINEL) return earlyReturnElement;
  let confirmSelectElement;
  if (
    $[38] !== ConfirmComponent ||
    $[39] !== handleDecline ||
    $[40] !== refuseInput ||
    $[41] !== openedAt ||
    $[42] !== windowMs ||
    $[43] !== hideIndexes ||
    $[44] !== confirmLabel ||
    $[45] !== cancelLabel ||
    $[46] !== onConfirm
  ) {
    confirmSelectElement = jsxProd_default(ConfirmComponent, {
      refuseInput,
      openedAt,
      windowMs,
      hideIndexes,
      confirmLabel,
      cancelLabel,
      onConfirm,
      onCancel: handleDecline,
    });
    $[38] = ConfirmComponent;
    $[39] = handleDecline;
    $[40] = refuseInput;
    $[41] = openedAt;
    $[42] = windowMs;
    $[43] = hideIndexes;
    $[44] = confirmLabel;
    $[45] = cancelLabel;
    $[46] = onConfirm;
    $[47] = confirmSelectElement;
  } else confirmSelectElement = $[47];
  let dialogElement;
  if (
    $[48] !== DialogComponent ||
    $[49] !== bodyElement ||
    $[50] !== confirmSelectElement ||
    $[51] !== title ||
    $[52] !== onCancel ||
    $[53] !== color
  ) {
    dialogElement = jsxProd_default_2(DialogComponent, {
      title,
      onCancel,
      color,
      children: [bodyElement, confirmSelectElement],
    });
    $[48] = DialogComponent;
    $[49] = bodyElement;
    $[50] = confirmSelectElement;
    $[51] = title;
    $[52] = onCancel;
    $[53] = color;
    $[54] = dialogElement;
  } else dialogElement = $[54];
  return dialogElement;
}
//@ chunk-5cvewgfe.js:2981-2985 placement
init_react_production();
//@ chunk-5cvewgfe.js:2985-3034 placement
function resetOfferOption(offer) {
  return {
    label: resetOfferLabel(offer),
    value: offer.kind,
  };
}
//@ chunk-5cvewgfe.js:3034-3095 placement
function unusableResetOption(unusable) {
  return {
    label: unusable.text,
    value: unusable.kind,
    disabled: true,
  };
}
//@ chunk-5cvewgfe.js:3095-4430 placement
/**
 * 重置限额选项列表（选中后进入确认）。
 */
function ResetLimitsOffers(props) {
  let $ = useMemoCache(30);
  let { offers, unusable, entry, credentials, onDone } = props;
  let [selectedOffer, setSelectedOffer] = useState(null);
  let submittedRef = useRef(false);
  let recentInput = useRecentInputWithin(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  if (selectedOffer !== null) {
    let resetLimitsElement;
    if ($[0] !== selectedOffer || $[1] !== credentials || $[2] !== entry || $[3] !== onDone) {
      resetLimitsElement = jsxProd_default(ResetLimits, {
        offer: selectedOffer,
        entry,
        credentials,
        onDone,
      });
      $[0] = selectedOffer;
      $[1] = credentials;
      $[2] = entry;
      $[3] = onDone;
      $[4] = resetLimitsElement;
    } else resetLimitsElement = $[4];
    return resetLimitsElement;
  }
  let shouldRefuseCached;
  if ($[5] !== recentInput || $[6] !== noteRefused || $[7] !== refusedWithin) {
    shouldRefuseCached = function shouldRefuseRecentInput() {
      if (recentInput() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[5] = recentInput;
    $[6] = noteRefused;
    $[7] = refusedWithin;
    $[8] = shouldRefuseCached;
  } else shouldRefuseCached = $[8];
  let shouldRefuseInput = shouldRefuseCached;
  let cancelHandlerCached;
  if ($[9] !== entry || $[10] !== offers || $[11] !== onDone || $[12] !== shouldRefuseInput) {
    cancelHandlerCached = function handleCancelInternal() {
      if (submittedRef.current || shouldRefuseInput()) {
        return;
      }
      submittedRef.current = true;
      onDone(keepResetForLater(entry, offers));
    };
    $[9] = entry;
    $[10] = offers;
    $[11] = onDone;
    $[12] = shouldRefuseInput;
    $[13] = cancelHandlerCached;
  } else cancelHandlerCached = $[13];
  let onCancel = cancelHandlerCached;
  let changeHandlerCached;
  if ($[14] !== entry || $[15] !== offers || $[16] !== shouldRefuseInput) {
    changeHandlerCached = function handleChangeInternal(kind) {
      let offer = offers.find((offer) => offer.kind === kind);
      if (offer === undefined || submittedRef.current || shouldRefuseInput()) {
        return;
      }
      reportResetSelected(entry, offer);
      setSelectedOffer(offer);
    };
    $[14] = entry;
    $[15] = offers;
    $[16] = shouldRefuseInput;
    $[17] = changeHandlerCached;
  } else changeHandlerCached = $[17];
  let onChange = changeHandlerCached;
  let optionsDraft;
  if ($[18] !== offers || $[19] !== unusable) {
    optionsDraft = [...offers.map(resetOfferOption), ...unusable.map(unusableResetOption)];
    $[18] = offers;
    $[19] = unusable;
    $[20] = optionsDraft;
  } else optionsDraft = $[20];
  let options = optionsDraft;
  let copy;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    copy = getCedarEmberCopy();
    $[21] = copy;
  } else copy = $[21];
  let children;
  if ($[22] !== onChange || $[23] !== onCancel || $[24] !== options || $[25] !== shouldRefuseInput) {
    children = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
      refuseInput: shouldRefuseInput,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: true,
      visibleOptionCount: options.length,
    });
    $[22] = onChange;
    $[23] = onCancel;
    $[24] = options;
    $[25] = shouldRefuseInput;
    $[26] = children;
  } else children = $[26];
  let dialogElement;
  if ($[27] !== onCancel || $[28] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: copy.chooseTitle,
      onCancel,
      color: "suggestion",
      children,
    });
    $[27] = onCancel;
    $[28] = children;
    $[29] = dialogElement;
  } else dialogElement = $[29];
  return dialogElement;
}
export { ResetLimits, ResetLimitsOffers };
