/**
 * components/permissions/AutoModeSetupReview.tsx
 *
 * 2.1.316 新增。auto 模式设置审阅。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useMemo,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { typeaheadEpochTracker, settleKey, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3 } from "../../hooks/useRecentInputGuard.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { uniqueLabels, replaceLineBreaks } from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";
import { SelectMultiAccessible } from "../CustomSelect/SelectMulti.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { createStore } from "../../state/store.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { useSession } from "../../context/session.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1299941-1299945 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1299941", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1321784-1321788 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1321784", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1339032-1339036 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1339032", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1339040-1340963 placement
function AutoModeSetupFlaggedPicker({
  flagged,
  initialPicking,
  onPickingChange,
  initialSelection,
  onSelectionChange,
  onResolve,
  onCancel,
  hideIndexes,
}) {
  let { epoch, noteAttempt } = typeaheadEpochTracker();
  let attemptKey = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let [isPicking, setIsPicking] = useState(initialPicking);
  let activeKey = settleKey(isPicking, RECENT_INPUT_GUARD_MS_3);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function shouldRefuseInput() {
    if (!activeKey.settled || refusedWithin(RECENT_INPUT_GUARD_MS_3)) {
      noteRefused();
      return true;
    }
    return false;
  }
  function shouldRefusePrimaryInput() {
    if (!attemptKey.settled) {
      noteAttempt();
      return true;
    }
    return false;
  }
  let selectionRef = useRef(initialSelection);
  let labelList = useMemo(() => uniqueLabels(flagged), [flagged]);
  let inputGuide = jsxProd_default_2(Byline, {
    children: [
      jsxProd_default(Text, {
        children: "Your setup is saved either way",
      }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "confirm",
      }),
      jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "skip",
      }),
    ],
  });
  function handleCancel() {
    noteAttempt();
    onCancel();
  }
  if (isPicking)
    return jsxProd_default(Dialog, {
      title: "Pick which to remove",
      onCancel: handleCancel,
      exitOnCtrlCD: true,
      inputGuide,
      children: jsxProd_default(
        SelectMultiAccessible,
        {
          refuseInput: shouldRefuseInput,
          hideIndexes,
          options: labelList.map((label, index) => ({
            value: flagged[index],
            label: String(label),
          })),
          defaultValue: selectionRef.current,
          onChange: (selection) => {
            if (!activeKey.settled) return;
            selectionRef.current = selection;
            onSelectionChange(selection);
          },
          submitButtonText: "Remove selected",
          onSubmit: () => {
            noteAttempt();
            onResolve(selectionRef.current);
          },
          onCancel: handleCancel,
        },
        isScreenReaderEnabled ? "screen-reader" : activeKey.remountKey,
      ),
    });
  return jsxProd_default(Dialog, {
    title: "Review rules that skip checks",
    onCancel: handleCancel,
    exitOnCtrlCD: true,
    inputGuide,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children:
            "These permissions.allow entries in your user settings are broad enough that auto mode either ignores them at runtime, or auto-approves destructive commands with no check. Removing one means matching commands prompt again outside auto mode too.",
        }),
        jsxProd_default(Box, {
          flexDirection: "column",
          children: labelList.map((label, index) =>
            jsxProd_default_2(
              Text,
              {
                children: [" \xB7 ", String(label)],
              },
              flagged[index],
            ),
          ),
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: "Removed entries can be restored by re-adding them verbatim.",
        }),
        jsxProd_default(
          ModelSelector,
          {
            refuseInput: shouldRefusePrimaryInput,
            selectedValue: NO_COMMITTED_ROW,
            defaultFocusValue: "all",
            hideIndexes,
            options: [
              {
                value: "all",
                label: "Remove them all",
              },
              {
                value: "pick",
                label: "Pick which to remove",
              },
              {
                value: "leave",
                label: "Leave them",
              },
            ],
            onChange: (choice) => {
              noteAttempt();
              if (choice === "all") onResolve(flagged);
              else if (choice === "pick") {
                if (onPickingChange(true) === false) return;
                setIsPicking(true);
              } else onResolve([]);
            },
            onCancel: handleCancel,
          },
          attemptKey.remountKey,
        ),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:1340967-1340998 placement
function stripLineBreaks(text) {
  return replaceLineBreaks(text);
}
//@ chunk-czq1j3j2.js:1340998-1343770 placement
function AutoModeSetupReview(props) {
  let $ = useMemoCache(49);
  let { proposal, hideIndexes, defaultFocusValue, onFocus, onAccept, onDecline, onCancel } = props;
  let { epoch, noteAttempt } = typeaheadEpochTracker();
  let attemptKey = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let refuseInput;
  if ($[0] !== attemptKey.settled || $[1] !== noteAttempt) {
    refuseInput = function shouldRefuseInput() {
      if (!attemptKey.settled) {
        noteAttempt();
        return true;
      }
      return false;
    };
    $[0] = attemptKey.settled;
    $[1] = noteAttempt;
    $[2] = refuseInput;
  } else refuseInput = $[2];
  let refuseInput_2 = refuseInput;
  let isHeld = defaultFocusValue === "decline" && !attemptKey.settled;
  let submittedRef = useRef(false);
  let inputGuide;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      ],
    });
    $[3] = inputGuide;
  } else inputGuide = $[3];
  let environmentSection;
  if ($[4] !== proposal.environment) {
    environmentSection = jsxProd_default(ReviewEntrySection, {
      label: "Environment",
      entries: proposal.environment,
      headers: true,
    });
    $[4] = proposal.environment;
    $[5] = environmentSection;
  } else environmentSection = $[5];
  let entries;
  if ($[6] !== proposal.allow) {
    entries = withoutDefaultsEntry(proposal.allow);
    $[6] = proposal.allow;
    $[7] = entries;
  } else entries = $[7];
  let allowCarveOutsSection;
  if ($[8] !== entries) {
    allowCarveOutsSection = jsxProd_default(ReviewEntrySection, {
      label: "Allow carve-outs",
      entries,
      empty: "none suggested \u2014 defaults look like they cover your usage",
    });
    $[8] = entries;
    $[9] = allowCarveOutsSection;
  } else allowCarveOutsSection = $[9];
  let entries_2;
  if ($[10] !== proposal.soft_deny) {
    entries_2 = withoutDefaultsEntry(proposal.soft_deny);
    $[10] = proposal.soft_deny;
    $[11] = entries_2;
  } else entries_2 = $[11];
  let extraSoftBlocksSection;
  if ($[12] !== entries_2) {
    extraSoftBlocksSection = jsxProd_default(ReviewEntrySection, {
      label: "Extra soft blocks",
      entries: entries_2,
      empty: "none suggested",
    });
    $[12] = entries_2;
    $[13] = extraSoftBlocksSection;
  } else extraSoftBlocksSection = $[13];
  let entries_3;
  if ($[14] !== proposal.hard_deny) {
    entries_3 = withoutDefaultsEntry(proposal.hard_deny);
    $[14] = proposal.hard_deny;
    $[15] = entries_3;
  } else entries_3 = $[15];
  let extraHardBlocksSection;
  if ($[16] !== entries_3) {
    extraHardBlocksSection = jsxProd_default(ReviewEntrySection, {
      label: "Extra hard blocks",
      entries: entries_3,
      empty: "none suggested",
    });
    $[16] = entries_3;
    $[17] = extraHardBlocksSection;
  } else extraHardBlocksSection = $[17];
  let notesSection;
  if ($[18] !== proposal.notes) {
    notesSection = jsxProd_default(ReviewEntrySection, {
      label: "Notes",
      entries: proposal.notes,
      empty: "none",
      dim: true,
    });
    $[18] = proposal.notes;
    $[19] = notesSection;
  } else notesSection = $[19];
  const stateLabel = isHeld ? "held" : "settled";
  let options;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        value: "accept",
        label: "Looks good \u2014 save it",
      },
      {
        value: "decline",
        label: "Discard and exit",
      },
    ];
    $[20] = options;
  } else options = $[20];
  let onFocus_2;
  if ($[21] !== isHeld || $[22] !== onFocus) {
    onFocus_2 = (value) => {
      if (isHeld) {
        return;
      }
      if (!submittedRef.current) {
        submittedRef.current = true;
        return;
      }
      onFocus?.(value);
    };
    $[21] = isHeld;
    $[22] = onFocus;
    $[23] = onFocus_2;
  } else onFocus_2 = $[23];
  let onChange;
  if ($[24] !== noteAttempt || $[25] !== onAccept || $[26] !== onDecline) {
    onChange = (choice) => {
      noteAttempt();
      if (choice === "accept") onAccept();
      else onDecline();
    };
    $[24] = noteAttempt;
    $[25] = onAccept;
    $[26] = onDecline;
    $[27] = onChange;
  } else onChange = $[27];
  let onCancel_2;
  if ($[28] !== noteAttempt || $[29] !== onCancel) {
    onCancel_2 = () => {
      noteAttempt();
      onCancel();
    };
    $[28] = noteAttempt;
    $[29] = onCancel;
    $[30] = onCancel_2;
  } else onCancel_2 = $[30];
  let modelSelectorElement;
  if (
    $[31] !== defaultFocusValue ||
    $[32] !== hideIndexes ||
    $[33] !== refuseInput_2 ||
    $[34] !== stateLabel ||
    $[35] !== onFocus_2 ||
    $[36] !== onChange ||
    $[37] !== onCancel_2
  ) {
    modelSelectorElement = jsxProd_default(
      ModelSelector,
      {
        refuseInput: refuseInput_2,
        selectedValue: NO_COMMITTED_ROW,
        options,
        hideIndexes,
        defaultFocusValue,
        onFocus: onFocus_2,
        onChange,
        onCancel: onCancel_2,
      },
      stateLabel,
    );
    $[31] = defaultFocusValue;
    $[32] = hideIndexes;
    $[33] = refuseInput_2;
    $[34] = stateLabel;
    $[35] = onFocus_2;
    $[36] = onChange;
    $[37] = onCancel_2;
    $[38] = modelSelectorElement;
  } else modelSelectorElement = $[38];
  let children;
  if (
    $[39] !== notesSection ||
    $[40] !== modelSelectorElement ||
    $[41] !== environmentSection ||
    $[42] !== allowCarveOutsSection ||
    $[43] !== extraSoftBlocksSection ||
    $[44] !== extraHardBlocksSection
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        environmentSection,
        allowCarveOutsSection,
        extraSoftBlocksSection,
        extraHardBlocksSection,
        notesSection,
        modelSelectorElement,
      ],
    });
    $[39] = notesSection;
    $[40] = modelSelectorElement;
    $[41] = environmentSection;
    $[42] = allowCarveOutsSection;
    $[43] = extraSoftBlocksSection;
    $[44] = extraHardBlocksSection;
    $[45] = children;
  } else children = $[45];
  let dialogElement;
  if ($[46] !== onCancel || $[47] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Review proposed auto-mode setup",
      onCancel,
      inputGuide,
      children,
    });
    $[46] = onCancel;
    $[47] = children;
    $[48] = dialogElement;
  } else dialogElement = $[48];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:1343770-1344403 placement
/**
 * auto 模式设置审阅中的一节：粗体标题 + 条目列表（### 开头视为小标题），空时显示 "nothing found"。
 */
function ReviewEntrySection(props) {
  let $ = useMemoCache(10);
  let { label, entries, empty, dim, headers } = props;
  let labelElement;
  if ($[0] !== label) {
    labelElement = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[0] = label;
    $[1] = labelElement;
  } else labelElement = $[1];
  let entriesElement;
  if ($[2] !== dim || $[3] !== empty || $[4] !== entries || $[5] !== headers) {
    entriesElement =
      entries.length === 0
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", empty ?? "nothing found"],
          })
        : entries.map((entry, index) => {
            let stripBreaks = stripLineBreaks;
            return headers && entry.startsWith("### ")
              ? jsxProd_default_2(
                  Text,
                  {
                    dimColor: true,
                    children: ["  ", stripBreaks(entry.slice(4))],
                  },
                  index,
                )
              : jsxProd_default_2(
                  Text,
                  {
                    dimColor: dim,
                    children: ["  \xB7 ", stripBreaks(entry)],
                  },
                  index,
                );
          });
    $[2] = dim;
    $[3] = empty;
    $[4] = entries;
    $[5] = headers;
    $[6] = entriesElement;
  } else entriesElement = $[6];
  let sectionElement;
  if ($[7] !== labelElement || $[8] !== entriesElement) {
    sectionElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [labelElement, entriesElement],
    });
    $[7] = labelElement;
    $[8] = entriesElement;
    $[9] = sectionElement;
  } else sectionElement = $[9];
  return sectionElement;
}
//@ chunk-czq1j3j2.js:1344403-1344456 placement
function withoutDefaultsEntry(entries) {
  return entries.filter((entry) => entry !== "$defaults");
}
//@ chunk-czq1j3j2.js:1344456-1344483 placement
function resetReviewFocus() {
  return null;
}
//@ chunk-czq1j3j2.js:1344483-1344510 placement
function resetFlaggedStash() {
  return null;
}
//@ chunk-czq1j3j2.js:1344510-1344762 placement
function useThrottledRun() {
  let $ = useMemoCache(4);
  let clock = useClock();
  let now;
  if ($[0] !== clock) {
    now = clock.now();
    $[0] = clock;
    $[1] = now;
  } else now = $[1];
  let lastRunAtRef = useRef(now);
  let runThrottled;
  if ($[2] !== clock) {
    runThrottled = (callback) => {
      let nowMs = clock.now();
      let lastRunAt = lastRunAtRef.current;
      lastRunAtRef.current = Math.max(nowMs, lastRunAt);
      if (nowMs - lastRunAt < RECENT_INPUT_GUARD_MS_3) {
        return false;
      }
      callback();
      return true;
    };
    $[2] = clock;
    $[3] = runThrottled;
  } else runThrottled = $[3];
  return runThrottled;
}
//@ chunk-czq1j3j2.js:1344762-1344815 placement
class AutoModeSetupReviewStores {
  reviewFocus = createStore(null);
  flaggedStash = createStore(null);
}
//@ chunk-czq1j3j2.js:1344815-1344842 placement
var autoModeSetupReviewStoresSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1344815", () => {
  autoModeSetupReviewStoresSlot = new SessionRootSlot(() => new AutoModeSetupReviewStores());
});
//@ chunk-czq1j3j2.js:1344842-1345705 placement
function autoModeSetupReviewDialog(props) {
  let $ = useMemoCache(18);
  let { payload, answer } = props;
  let throttledRun = useThrottledRun();
  let { reviewFocus } = autoModeSetupReviewStoresSlot.of(useSession());
  let focusedValue = useSyncExternalStore(reviewFocus.subscribe, reviewFocus.getState);
  let handleAnswer;
  if ($[0] !== answer || $[1] !== reviewFocus) {
    handleAnswer = (response) => {
      if (answer(response) === false) {
        return;
      }
      reviewFocus.setState(resetReviewFocus);
    };
    $[0] = answer;
    $[1] = reviewFocus;
    $[2] = handleAnswer;
  } else handleAnswer = $[2];
  let answerOnce = handleAnswer;
  const defaultFocusValue = focusedValue ?? undefined;
  let onFocus;
  if ($[3] !== reviewFocus) {
    onFocus = (value) => reviewFocus.setState(() => value);
    $[3] = reviewFocus;
    $[4] = onFocus;
  } else onFocus = $[4];
  let onAccept;
  let onDecline;
  if ($[5] !== throttledRun || $[6] !== answerOnce) {
    onAccept = () => throttledRun(() => answerOnce("accept"));
    onDecline = () => throttledRun(() => answerOnce("decline"));
    $[5] = throttledRun;
    $[6] = answerOnce;
    $[7] = onAccept;
    $[8] = onDecline;
  } else {
    onAccept = $[7];
    onDecline = $[8];
  }
  let onCancel;
  if ($[9] !== answerOnce) {
    onCancel = () => answerOnce("cancelled");
    $[9] = answerOnce;
    $[10] = onCancel;
  } else onCancel = $[10];
  let reviewDialog;
  if (
    $[11] !== payload ||
    $[12] !== defaultFocusValue ||
    $[13] !== onFocus ||
    $[14] !== onAccept ||
    $[15] !== onDecline ||
    $[16] !== onCancel
  ) {
    reviewDialog = jsxProd_default(AutoModeSetupReview, {
      proposal: payload,
      hideIndexes: true,
      defaultFocusValue,
      onFocus,
      onAccept,
      onDecline,
      onCancel,
    });
    $[11] = payload;
    $[12] = defaultFocusValue;
    $[13] = onFocus;
    $[14] = onAccept;
    $[15] = onDecline;
    $[16] = onCancel;
    $[17] = reviewDialog;
  } else reviewDialog = $[17];
  return reviewDialog;
}
//@ chunk-czq1j3j2.js:1345705-1347041 placement
function autoModeSetupFlaggedDialog(props) {
  let $ = useMemoCache(27);
  let { payload, answer } = props;
  let throttledRun = useThrottledRun();
  let { flaggedStash } = autoModeSetupReviewStoresSlot.of(useSession());
  let runId = payload.runId;
  let stashState = useSyncExternalStore(flaggedStash.subscribe, flaggedStash.getState);
  let pickerState;
  if ($[0] !== runId || $[1] !== stashState) {
    pickerState =
      stashState?.key === runId
        ? stashState
        : {
            key: runId,
            picking: false,
            selection: [],
          };
    $[0] = runId;
    $[1] = stashState;
    $[2] = pickerState;
  } else pickerState = $[2];
  let stashedPickerState = pickerState;
  let handleAnswer;
  if ($[3] !== answer || $[4] !== flaggedStash) {
    handleAnswer = (response) => {
      if (answer(response) === false) {
        return;
      }
      flaggedStash.setState(resetFlaggedStash);
    };
    $[3] = answer;
    $[4] = flaggedStash;
    $[5] = handleAnswer;
  } else handleAnswer = $[5];
  let answerOnce = handleAnswer;
  let onPickingChange;
  if ($[6] !== flaggedStash || $[7] !== throttledRun || $[8] !== runId || $[9] !== stashedPickerState) {
    onPickingChange = (picking) =>
      throttledRun(() => {
        flaggedStash.setState((state) => ({
          ...(state?.key === runId ? state : stashedPickerState),
          picking,
        }));
      });
    $[6] = flaggedStash;
    $[7] = throttledRun;
    $[8] = runId;
    $[9] = stashedPickerState;
    $[10] = onPickingChange;
  } else onPickingChange = $[10];
  let onSelectionChange;
  if ($[11] !== flaggedStash || $[12] !== runId || $[13] !== stashedPickerState) {
    onSelectionChange = (selection) => {
      flaggedStash.setState((state) => ({
        ...(state?.key === runId ? state : stashedPickerState),
        selection,
      }));
    };
    $[11] = flaggedStash;
    $[12] = runId;
    $[13] = stashedPickerState;
    $[14] = onSelectionChange;
  } else onSelectionChange = $[14];
  let onResolve;
  let onCancel;
  if ($[15] !== throttledRun || $[16] !== answerOnce) {
    onResolve = (toRemove) =>
      throttledRun(() =>
        answerOnce({
          toRemove,
        }),
      );
    onCancel = () => throttledRun(() => answerOnce("cancelled"));
    $[15] = throttledRun;
    $[16] = answerOnce;
    $[17] = onResolve;
    $[18] = onCancel;
  } else {
    onResolve = $[17];
    onCancel = $[18];
  }
  let pickerElement;
  if (
    $[19] !== payload.flagged ||
    $[20] !== stashedPickerState.picking ||
    $[21] !== stashedPickerState.selection ||
    $[22] !== onPickingChange ||
    $[23] !== onSelectionChange ||
    $[24] !== onResolve ||
    $[25] !== onCancel
  ) {
    pickerElement = jsxProd_default(AutoModeSetupFlaggedPicker, {
      hideIndexes: true,
      flagged: payload.flagged,
      initialPicking: stashedPickerState.picking,
      onPickingChange,
      initialSelection: stashedPickerState.selection,
      onSelectionChange,
      onResolve,
      onCancel,
    });
    $[19] = payload.flagged;
    $[20] = stashedPickerState.picking;
    $[21] = stashedPickerState.selection;
    $[22] = onPickingChange;
    $[23] = onSelectionChange;
    $[24] = onResolve;
    $[25] = onCancel;
    $[26] = pickerElement;
  } else pickerElement = $[26];
  return pickerElement;
}
//@ chunk-czq1j3j2.js:1347041-1347058 placement
var REVIEW_HEADER_ROWS = 8;
var REVIEW_DIALOG_WIDTH = 160;
export {
  REVIEW_DIALOG_WIDTH,
  REVIEW_HEADER_ROWS,
  AutoModeSetupReview,
  AutoModeSetupFlaggedPicker,
  autoModeSetupReviewDialog,
  autoModeSetupFlaggedDialog,
};
