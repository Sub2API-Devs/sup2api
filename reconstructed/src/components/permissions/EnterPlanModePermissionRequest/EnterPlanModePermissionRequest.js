/**
 * components/permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.tsx
 *
 * 进入计划模式确认："Claude wants to enter plan mode…"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/EnterPlanModePermissionRequest/EnterPlanModePermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: callgraph-fingerprint 1, layout 1, fingerprint 1
 */
import { isConsentRow, modeSwitchRow } from "../consentRows.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import {
  useInputRefusalWindow,
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

//@ chunk-18hwfzwa.js:1344087-1344141 callgraph-fingerprint = _temp (1)
function selectToolPermissionContextMode_3(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1344141-1344327 layout
function enterPlanChoiceToResult(h, x) {
  switch (h) {
    case "yes": {
      if (x === null || !isConsentRow(x))
        return {
          behavior: "deny",
        };
      return {
        behavior: "allow",
        updatedInput: {},
        permissionUpdates: x.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
      };
  }
}
//@ chunk-18hwfzwa.js:1344327-1346542 fingerprint = EnterPlanModePermissionRequest (0.487)
/**
 * 进入计划模式确认：说明计划模式会做什么，允许/拒绝并记录 tengu_plan_enter。
 */
function EnterPlanModePermissionRequest(props) {
  let $ = w(27);
  let { payload, answer, wouldTakeAnswer } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let We;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    We = function ze() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = We;
  } else We = $[3];
  let refuseInput = We;
  let openedAt = useMountTime();
  let rt = settleKey(epoch);
  let toolPermissionContextMode = useAppState(selectToolPermissionContextMode_3);
  let At;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    At = modeSwitchRow("plan");
    $[4] = At;
  } else At = $[4];
  let It = At;
  let Ot;
  if (
    $[5] !== answer ||
    $[6] !== inputRefusalWindow ||
    $[7] !== noteRefused ||
    $[8] !== refusedWithin ||
    $[9] !== toolPermissionContextMode ||
    $[10] !== wouldTakeAnswer
  ) {
    Ot = (value) => {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (value === "yes" && It !== null) {
        logEvent("tengu_plan_enter", {
          entryMethod: lit_2("tool"),
        });
        handlePlanModeTransition(toolPermissionContextMode, "plan");
      }
      answer(enterPlanChoiceToResult(value, It));
    };
    $[5] = answer;
    $[6] = inputRefusalWindow;
    $[7] = noteRefused;
    $[8] = refusedWithin;
    $[9] = toolPermissionContextMode;
    $[10] = wouldTakeAnswer;
    $[11] = Ot;
  } else Ot = $[11];
  let Dt = Ot;
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
  if ($[15] !== Dt) {
    onConfirm = () => Dt("yes");
    onCancel = () => Dt("no");
    $[15] = Dt;
    $[16] = onConfirm;
    $[17] = onCancel;
  } else {
    onConfirm = $[16];
    onCancel = $[17];
  }
  let children;
  if (
    $[18] !== rt.remountKey ||
    $[19] !== refuseInput ||
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
              refuseInput,
              openedAt,
              hideIndexes: true,
              confirmLabel: It !== null ? It.node : "Yes, enter plan mode",
              cancelLabel: "No, start implementing now",
              onConfirm,
              onCancel,
            },
            rt.remountKey,
          ),
        }),
      ],
    });
    $[18] = rt.remountKey;
    $[19] = refuseInput;
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
