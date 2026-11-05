/**
 * components/permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.tsx
 *
 * 进入计划模式确认："Claude wants to enter plan mode…"。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: callgraph-fingerprint 1, layout 1, fingerprint 1
 */
import { isConsentRow, modeSwitchRow } from "../consentRows.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../../CustomSelect/selectTypeahead.js";
import { useAppState } from "../../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit as lit_2 } from "../../../services/analytics/safeMetadata.js";
import { handlePlanModeTransition } from "../../../bootstrap/state.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";

//@ chunk-czq1j3j2.js:1366392-1366446 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectToolPermissionContextMode_3(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-czq1j3j2.js:1366446-1366632 layout
function enterPlanChoiceToResult(choice, selectedRow) {
  switch (choice) {
    case "yes": {
      if (selectedRow === null || !isConsentRow(selectedRow))
        return {
          behavior: "deny",
        };
      return {
        behavior: "allow",
        updatedInput: {},
        permissionUpdates: selectedRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
      };
  }
}
//@ chunk-czq1j3j2.js:1366632-1368847 fingerprint (2.1.88 match: EnterPlanModePermissionRequest, 0.487)
/**
 * 进入计划模式确认：说明计划模式会做什么，允许/拒绝并记录 tengu_plan_enter。
 */
function EnterPlanModePermissionRequest(props) {
  let $ = useMemoCache(27);
  let { payload, answer, wouldTakeAnswer } = props;
  let isRecentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let refuseInput;
  if ($[0] !== isRecentInput || $[1] !== noteRefused || $[2] !== refusedWithin) {
    refuseInput = function shouldRefuseInput() {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = isRecentInput;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = refuseInput;
  } else refuseInput = $[3];
  let refuseInput_2 = refuseInput;
  let openedAt = useMountTime();
  let remountKeyValue = settleKey(epoch);
  let toolPermissionContextMode = useAppState(selectToolPermissionContextMode_3);
  let memoizedModeRow;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    memoizedModeRow = modeSwitchRow("plan");
    $[4] = memoizedModeRow;
  } else memoizedModeRow = $[4];
  let planModeRow = memoizedModeRow;
  let onChangeHandler;
  if (
    $[5] !== answer ||
    $[6] !== isRecentInput ||
    $[7] !== noteRefused ||
    $[8] !== refusedWithin ||
    $[9] !== toolPermissionContextMode ||
    $[10] !== wouldTakeAnswer
  ) {
    onChangeHandler = (value) => {
      if (isRecentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (value === "yes" && planModeRow !== null) {
        logEvent("tengu_plan_enter", {
          entryMethod: lit_2("tool"),
        });
        handlePlanModeTransition(toolPermissionContextMode, "plan");
      }
      answer(enterPlanChoiceToResult(value, planModeRow));
    };
    $[5] = answer;
    $[6] = isRecentInput;
    $[7] = noteRefused;
    $[8] = refusedWithin;
    $[9] = toolPermissionContextMode;
    $[10] = wouldTakeAnswer;
    $[11] = onChangeHandler;
  } else onChangeHandler = $[11];
  let changeSelection = onChangeHandler;
  let t2;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      children: "Claude wants to enter plan mode to explore and design an implementation approach.",
    });
    $[12] = t2;
  } else t2 = $[12];
  let t3;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "In plan mode, Claude will:",
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 Explore the codebase thoroughly",
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 Identify existing patterns",
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 Design an implementation strategy",
        }),
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 Present a plan for your approval",
        }),
      ],
    });
    $[13] = t3;
  } else t3 = $[13];
  let t4;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: "No code changes will be made until you approve the plan.",
      }),
    });
    $[14] = t4;
  } else t4 = $[14];
  let onConfirm;
  let onCancel;
  if ($[15] !== changeSelection) {
    onConfirm = () => changeSelection("yes");
    onCancel = () => changeSelection("no");
    $[15] = changeSelection;
    $[16] = onConfirm;
    $[17] = onCancel;
  } else {
    onConfirm = $[16];
    onCancel = $[17];
  }
  let children;
  if (
    $[18] !== remountKeyValue.remountKey ||
    $[19] !== refuseInput_2 ||
    $[20] !== openedAt ||
    $[21] !== onConfirm ||
    $[22] !== onCancel
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingX: 1,
      children: [
        t2,
        t3,
        t4,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(
            ConfirmSelect,
            {
              refuseInput: refuseInput_2,
              openedAt,
              hideIndexes: true,
              confirmLabel: planModeRow !== null ? planModeRow.node : "Yes, enter plan mode",
              cancelLabel: "No, start implementing now",
              onConfirm,
              onCancel,
            },
            remountKeyValue.remountKey,
          ),
        }),
      ],
    });
    $[18] = remountKeyValue.remountKey;
    $[19] = refuseInput_2;
    $[20] = openedAt;
    $[21] = onConfirm;
    $[22] = onCancel;
    $[23] = children;
  } else children = $[23];
  let t9;
  if ($[24] !== payload.requestSource || $[25] !== children) {
    t9 = jsxProd_default(PermissionDialog_2, {
      color: "planMode",
      title: "Enter plan mode?",
      requestSource: payload.requestSource,
      children,
    });
    $[24] = payload.requestSource;
    $[25] = children;
    $[26] = t9;
  } else t9 = $[26];
  return t9;
}
export { EnterPlanModePermissionRequest };
