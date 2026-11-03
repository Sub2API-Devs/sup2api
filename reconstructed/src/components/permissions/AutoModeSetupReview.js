/**
 * components/permissions/AutoModeSetupReview.tsx
 *
 * 2.1.316 新增。auto 模式设置审阅。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 16
 */
import { init_react_production, y, R, Q, yt } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { createStore } from "../../state/store.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { useSession } from "../../context/session.js";

//@ chunk-18hwfzwa.js:1312910-1312914 placement
init_react_production();
//@ chunk-18hwfzwa.js:1312914-1312918 placement
init_react_production();
//@ chunk-18hwfzwa.js:1312918-1314841 placement
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
  let ze = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let [Xe, rt] = y(initialPicking);
  let kt = settleKey(Xe, RECENT_INPUT_GUARD_MS_3);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function Et() {
    if (!kt.settled || refusedWithin(RECENT_INPUT_GUARD_MS_3)) {
      noteRefused();
      return true;
    }
    return false;
  }
  function Dt() {
    if (!ze.settled) {
      noteAttempt();
      return true;
    }
    return false;
  }
  let initialSelectionRef = R(initialSelection);
  let oo = Q(() => uniqueLabels(flagged), [flagged]);
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
  function io() {
    noteAttempt();
    onCancel();
  }
  if (Xe)
    return jsxProd_default(Dialog, {
      title: "Pick which to remove",
      onCancel: io,
      exitOnCtrlCD: true,
      inputGuide,
      children: jsxProd_default(
        SelectMultiAccessible,
        {
          refuseInput: Et,
          hideIndexes,
          options: oo.map((so, po) => ({
            value: flagged[po],
            label: String(so),
          })),
          defaultValue: initialSelectionRef.current,
          onChange: (so) => {
            if (!kt.settled) return;
            initialSelectionRef.current = so;
            onSelectionChange(so);
          },
          submitButtonText: "Remove selected",
          onSubmit: () => {
            noteAttempt();
            onResolve(initialSelectionRef.current);
          },
          onCancel: io,
        },
        isScreenReaderEnabled ? "screen-reader" : kt.remountKey,
      ),
    });
  return jsxProd_default(Dialog, {
    title: "Review rules that skip checks",
    onCancel: io,
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
          children: oo.map((so, po) =>
            jsxProd_default_2(
              Text,
              {
                children: [" \xB7 ", String(so)],
              },
              flagged[po],
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
            refuseInput: Dt,
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
            onChange: (so) => {
              noteAttempt();
              if (so === "all") onResolve(flagged);
              else if (so === "pick") {
                if (onPickingChange(true) === false) return;
                rt(true);
              } else onResolve([]);
            },
            onCancel: io,
          },
          ze.remountKey,
        ),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1314841-1314845 placement
init_react_production();
//@ chunk-18hwfzwa.js:1314845-1314876 placement
function stripLineBreaks(kt) {
  return replaceLineBreaks(kt);
}
//@ chunk-18hwfzwa.js:1314876-1317648 placement
function AutoModeSetupReview(props) {
  let $ = w(49);
  let { proposal, hideIndexes, defaultFocusValue, onFocus, onAccept, onDecline, onCancel } = props;
  let { epoch, noteAttempt } = typeaheadEpochTracker();
  let ze = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  let rt;
  if ($[0] !== ze.settled || $[1] !== noteAttempt) {
    rt = function kt() {
      if (!ze.settled) {
        noteAttempt();
        return true;
      }
      return false;
    };
    $[0] = ze.settled;
    $[1] = noteAttempt;
    $[2] = rt;
  } else rt = $[2];
  let refuseInput = rt;
  let At = defaultFocusValue === "decline" && !ze.settled;
  let It = R(false);
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
  let Et;
  if ($[4] !== proposal.environment) {
    Et = jsxProd_default(ReviewEntrySection, {
      label: "Environment",
      entries: proposal.environment,
      headers: true,
    });
    $[4] = proposal.environment;
    $[5] = Et;
  } else Et = $[5];
  let entries;
  if ($[6] !== proposal.allow) {
    entries = withoutDefaultsEntry(proposal.allow);
    $[6] = proposal.allow;
    $[7] = entries;
  } else entries = $[7];
  let Lt;
  if ($[8] !== entries) {
    Lt = jsxProd_default(ReviewEntrySection, {
      label: "Allow carve-outs",
      entries,
      empty: "none suggested \u2014 defaults look like they cover your usage",
    });
    $[8] = entries;
    $[9] = Lt;
  } else Lt = $[9];
  let entries_2;
  if ($[10] !== proposal.soft_deny) {
    entries_2 = withoutDefaultsEntry(proposal.soft_deny);
    $[10] = proposal.soft_deny;
    $[11] = entries_2;
  } else entries_2 = $[11];
  let Xt;
  if ($[12] !== entries_2) {
    Xt = jsxProd_default(ReviewEntrySection, {
      label: "Extra soft blocks",
      entries: entries_2,
      empty: "none suggested",
    });
    $[12] = entries_2;
    $[13] = Xt;
  } else Xt = $[13];
  let entries_3;
  if ($[14] !== proposal.hard_deny) {
    entries_3 = withoutDefaultsEntry(proposal.hard_deny);
    $[14] = proposal.hard_deny;
    $[15] = entries_3;
  } else entries_3 = $[15];
  let so;
  if ($[16] !== entries_3) {
    so = jsxProd_default(ReviewEntrySection, {
      label: "Extra hard blocks",
      entries: entries_3,
      empty: "none suggested",
    });
    $[16] = entries_3;
    $[17] = so;
  } else so = $[17];
  let po;
  if ($[18] !== proposal.notes) {
    po = jsxProd_default(ReviewEntrySection, {
      label: "Notes",
      entries: proposal.notes,
      empty: "none",
      dim: true,
    });
    $[18] = proposal.notes;
    $[19] = po;
  } else po = $[19];
  const ao = At ? "held" : "settled";
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
  if ($[21] !== At || $[22] !== onFocus) {
    onFocus_2 = (Ao) => {
      if (At) {
        return;
      }
      if (!It.current) {
        It.current = true;
        return;
      }
      onFocus?.(Ao);
    };
    $[21] = At;
    $[22] = onFocus;
    $[23] = onFocus_2;
  } else onFocus_2 = $[23];
  let onChange;
  if ($[24] !== noteAttempt || $[25] !== onAccept || $[26] !== onDecline) {
    onChange = (Ro) => {
      noteAttempt();
      if (Ro === "accept") onAccept();
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
  let Io;
  if (
    $[31] !== defaultFocusValue ||
    $[32] !== hideIndexes ||
    $[33] !== refuseInput ||
    $[34] !== ao ||
    $[35] !== onFocus_2 ||
    $[36] !== onChange ||
    $[37] !== onCancel_2
  ) {
    Io = jsxProd_default(
      ModelSelector,
      {
        refuseInput,
        selectedValue: NO_COMMITTED_ROW,
        options,
        hideIndexes,
        defaultFocusValue,
        onFocus: onFocus_2,
        onChange,
        onCancel: onCancel_2,
      },
      ao,
    );
    $[31] = defaultFocusValue;
    $[32] = hideIndexes;
    $[33] = refuseInput;
    $[34] = ao;
    $[35] = onFocus_2;
    $[36] = onChange;
    $[37] = onCancel_2;
    $[38] = Io;
  } else Io = $[38];
  let children;
  if ($[39] !== po || $[40] !== Io || $[41] !== Et || $[42] !== Lt || $[43] !== Xt || $[44] !== so) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Et, Lt, Xt, so, po, Io],
    });
    $[39] = po;
    $[40] = Io;
    $[41] = Et;
    $[42] = Lt;
    $[43] = Xt;
    $[44] = so;
    $[45] = children;
  } else children = $[45];
  let mn;
  if ($[46] !== onCancel || $[47] !== children) {
    mn = jsxProd_default(Dialog, {
      title: "Review proposed auto-mode setup",
      onCancel,
      inputGuide,
      children,
    });
    $[46] = onCancel;
    $[47] = children;
    $[48] = mn;
  } else mn = $[48];
  return mn;
}
//@ chunk-18hwfzwa.js:1317648-1318281 placement
/**
 * auto 模式设置审阅中的一节：粗体标题 + 条目列表（### 开头视为小标题），空时显示 "nothing found"。
 */
function ReviewEntrySection(props) {
  let $ = w(10);
  let { label, entries, empty, dim, headers } = props;
  let Be;
  if ($[0] !== label) {
    Be = jsxProd_default(Text, {
      bold: true,
      children: label,
    });
    $[0] = label;
    $[1] = Be;
  } else Be = $[1];
  let He;
  if ($[2] !== dim || $[3] !== empty || $[4] !== entries || $[5] !== headers) {
    He =
      entries.length === 0
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", empty ?? "nothing found"],
          })
        : entries.map((entry, ze) => {
            let Xe = stripLineBreaks;
            return headers && entry.startsWith("### ")
              ? jsxProd_default_2(
                  Text,
                  {
                    dimColor: true,
                    children: ["  ", Xe(entry.slice(4))],
                  },
                  ze,
                )
              : jsxProd_default_2(
                  Text,
                  {
                    dimColor: dim,
                    children: ["  \xB7 ", Xe(entry)],
                  },
                  ze,
                );
          });
    $[2] = dim;
    $[3] = empty;
    $[4] = entries;
    $[5] = headers;
    $[6] = He;
  } else He = $[6];
  let rt;
  if ($[7] !== Be || $[8] !== He) {
    rt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Be, He],
    });
    $[7] = Be;
    $[8] = He;
    $[9] = rt;
  } else rt = $[9];
  return rt;
}
//@ chunk-18hwfzwa.js:1318281-1318334 placement
function withoutDefaultsEntry(h) {
  return h.filter((x) => x !== "$defaults");
}
//@ chunk-18hwfzwa.js:1318334-1318361 placement
function resetReviewFocus() {
  return null;
}
//@ chunk-18hwfzwa.js:1318361-1318388 placement
function resetFlaggedStash() {
  return null;
}
//@ chunk-18hwfzwa.js:1318388-1318640 placement
function useThrottledRun() {
  let $ = w(4);
  let clock = useClock();
  let D;
  if ($[0] !== clock) {
    D = clock.now();
    $[0] = clock;
    $[1] = D;
  } else D = $[1];
  let L = R(D);
  let ee;
  if ($[2] !== clock) {
    ee = (ke) => {
      let Re = clock.now();
      let Be = L.current;
      L.current = Math.max(Re, Be);
      if (Re - Be < RECENT_INPUT_GUARD_MS_3) {
        return false;
      }
      ke();
      return true;
    };
    $[2] = clock;
    $[3] = ee;
  } else ee = $[3];
  return ee;
}
//@ chunk-18hwfzwa.js:1318640-1318693 placement
class AutoModeSetupReviewStores {
  reviewFocus = createStore(null);
  flaggedStash = createStore(null);
}
//@ chunk-18hwfzwa.js:1318693-1318720 placement
var autoModeSetupReviewStoresSlot = new SessionRootSlot(() => new AutoModeSetupReviewStores());
//@ chunk-18hwfzwa.js:1318720-1319583 placement
function autoModeSetupReviewDialog(props) {
  let $ = w(18);
  let { payload, answer } = props;
  let throttledRun = useThrottledRun();
  let { reviewFocus } = autoModeSetupReviewStoresSlot.of(useSession());
  let ke = yt(reviewFocus.subscribe, reviewFocus.getState);
  let Be;
  if ($[0] !== answer || $[1] !== reviewFocus) {
    Be = (He) => {
      if (answer(He) === false) {
        return;
      }
      reviewFocus.setState(resetReviewFocus);
    };
    $[0] = answer;
    $[1] = reviewFocus;
    $[2] = Be;
  } else Be = $[2];
  let We = Be;
  const defaultFocusValue = ke ?? undefined;
  let onFocus;
  if ($[3] !== reviewFocus) {
    onFocus = (rt) => reviewFocus.setState(() => rt);
    $[3] = reviewFocus;
    $[4] = onFocus;
  } else onFocus = $[4];
  let onAccept;
  let onDecline;
  if ($[5] !== throttledRun || $[6] !== We) {
    onAccept = () => throttledRun(() => We("accept"));
    onDecline = () => throttledRun(() => We("decline"));
    $[5] = throttledRun;
    $[6] = We;
    $[7] = onAccept;
    $[8] = onDecline;
  } else {
    onAccept = $[7];
    onDecline = $[8];
  }
  let onCancel;
  if ($[9] !== We) {
    onCancel = () => We("cancelled");
    $[9] = We;
    $[10] = onCancel;
  } else onCancel = $[10];
  let Ot;
  if (
    $[11] !== payload ||
    $[12] !== defaultFocusValue ||
    $[13] !== onFocus ||
    $[14] !== onAccept ||
    $[15] !== onDecline ||
    $[16] !== onCancel
  ) {
    Ot = jsxProd_default(AutoModeSetupReview, {
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
    $[17] = Ot;
  } else Ot = $[17];
  return Ot;
}
//@ chunk-18hwfzwa.js:1319583-1320919 placement
function autoModeSetupFlaggedDialog(props) {
  let $ = w(27);
  let { payload, answer } = props;
  let throttledRun = useThrottledRun();
  let { flaggedStash } = autoModeSetupReviewStoresSlot.of(useSession());
  let runId = payload.runId;
  let Re = yt(flaggedStash.subscribe, flaggedStash.getState);
  let He;
  if ($[0] !== runId || $[1] !== Re) {
    He =
      Re?.key === runId
        ? Re
        : {
            key: runId,
            picking: false,
            selection: [],
          };
    $[0] = runId;
    $[1] = Re;
    $[2] = He;
  } else He = $[2];
  let We = He;
  let ze;
  if ($[3] !== answer || $[4] !== flaggedStash) {
    ze = (Xe) => {
      if (answer(Xe) === false) {
        return;
      }
      flaggedStash.setState(resetFlaggedStash);
    };
    $[3] = answer;
    $[4] = flaggedStash;
    $[5] = ze;
  } else ze = $[5];
  let rt = ze;
  let onPickingChange;
  if ($[6] !== flaggedStash || $[7] !== throttledRun || $[8] !== runId || $[9] !== We) {
    onPickingChange = (picking) =>
      throttledRun(() => {
        flaggedStash.setState((It) => ({
          ...(It?.key === runId ? It : We),
          picking,
        }));
      });
    $[6] = flaggedStash;
    $[7] = throttledRun;
    $[8] = runId;
    $[9] = We;
    $[10] = onPickingChange;
  } else onPickingChange = $[10];
  let onSelectionChange;
  if ($[11] !== flaggedStash || $[12] !== runId || $[13] !== We) {
    onSelectionChange = (selection) => {
      flaggedStash.setState((Dt) => ({
        ...(Dt?.key === runId ? Dt : We),
        selection,
      }));
    };
    $[11] = flaggedStash;
    $[12] = runId;
    $[13] = We;
    $[14] = onSelectionChange;
  } else onSelectionChange = $[14];
  let onResolve;
  let onCancel;
  if ($[15] !== throttledRun || $[16] !== rt) {
    onResolve = (toRemove) =>
      throttledRun(() =>
        rt({
          toRemove,
        }),
      );
    onCancel = () => throttledRun(() => rt("cancelled"));
    $[15] = throttledRun;
    $[16] = rt;
    $[17] = onResolve;
    $[18] = onCancel;
  } else {
    onResolve = $[17];
    onCancel = $[18];
  }
  let io;
  if (
    $[19] !== payload.flagged ||
    $[20] !== We.picking ||
    $[21] !== We.selection ||
    $[22] !== onPickingChange ||
    $[23] !== onSelectionChange ||
    $[24] !== onResolve ||
    $[25] !== onCancel
  ) {
    io = jsxProd_default(AutoModeSetupFlaggedPicker, {
      hideIndexes: true,
      flagged: payload.flagged,
      initialPicking: We.picking,
      onPickingChange,
      initialSelection: We.selection,
      onSelectionChange,
      onResolve,
      onCancel,
    });
    $[19] = payload.flagged;
    $[20] = We.picking;
    $[21] = We.selection;
    $[22] = onPickingChange;
    $[23] = onSelectionChange;
    $[24] = onResolve;
    $[25] = onCancel;
    $[26] = io;
  } else io = $[26];
  return io;
}
//@ chunk-18hwfzwa.js:1320919-1320936 placement
var REVIEW_HEADER_ROWS = 8;
var REVIEW_DIALOG_WIDTH = 160;
export {
  REVIEW_DIALOG_WIDTH,
  REVIEW_HEADER_ROWS,
  autoModeSetupReviewDialog,
  autoModeSetupFlaggedDialog,
  AutoModeSetupReview,
  AutoModeSetupFlaggedPicker,
};
