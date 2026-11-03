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
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
      if (x === null || !isConsentRow(x)) return { behavior: "deny" };
      return { behavior: "allow", updatedInput: {}, permissionUpdates: x.applies };
    }
    case "no":
      return { behavior: "deny" };
  }
}
/**
 * 进入计划模式确认：说明计划模式会做什么，允许/拒绝并记录 tengu_plan_enter。
 */
//@ chunk-18hwfzwa.js:1344327-1346542 fingerprint = EnterPlanModePermissionRequest (0.487)
function EnterPlanModePermissionRequest(t0) {
  let $ = w(27),
    { payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer } = t0,
    ee = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    We;
  if ($[0] !== ee || $[1] !== noteRefused || $[2] !== refusedWithin)
    ((We = function ze() {
      if (ee() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[0] = ee),
      ($[1] = noteRefused),
      ($[2] = refusedWithin),
      ($[3] = We));
  else We = $[3];
  let ze = We,
    Xe = useMountTime(),
    rt = settleKey(epoch),
    toolPermissionContextMode = useAppState(selectToolPermissionContextMode_3),
    At;
  if ($[4] === MEMO_CACHE_SENTINEL) ((At = modeSwitchRow("plan")), ($[4] = At));
  else At = $[4];
  let It = At,
    Ot;
  if (
    $[5] !== answer ||
    $[6] !== ee ||
    $[7] !== noteRefused ||
    $[8] !== refusedWithin ||
    $[9] !== toolPermissionContextMode ||
    $[10] !== wouldTakeAnswer
  )
    ((Ot = (value) => {
      if (ee() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) {
        return;
      }
      if (value === "yes" && It !== null)
        (logEvent("tengu_plan_enter", { entryMethod: lit_2("tool") }),
          handlePlanModeTransition(toolPermissionContextMode, "plan"));
      answer(enterPlanChoiceToResult(value, It));
    }),
      ($[5] = answer),
      ($[6] = ee),
      ($[7] = noteRefused),
      ($[8] = refusedWithin),
      ($[9] = toolPermissionContextMode),
      ($[10] = wouldTakeAnswer),
      ($[11] = Ot));
  else Ot = $[11];
  let Dt = Ot,
    Lt;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((Lt = e(Text, {
      children: "Claude wants to enter plan mode to explore and design an implementation approach.",
    })),
      ($[12] = Lt));
  else Lt = $[12];
  let oo;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((oo = r(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [
        e(Text, { dimColor: !0, children: "In plan mode, Claude will:" }),
        e(Text, { dimColor: !0, children: " \xB7 Explore the codebase thoroughly" }),
        e(Text, { dimColor: !0, children: " \xB7 Identify existing patterns" }),
        e(Text, { dimColor: !0, children: " \xB7 Design an implementation strategy" }),
        e(Text, { dimColor: !0, children: " \xB7 Present a plan for your approval" }),
      ],
    })),
      ($[13] = oo));
  else oo = $[13];
  let Xt;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((Xt = e(Box, {
      marginTop: 1,
      children: e(Text, {
        dimColor: !0,
        children: "No code changes will be made until you approve the plan.",
      }),
    })),
      ($[14] = Xt));
  else Xt = $[14];
  let io, so;
  if ($[15] !== Dt) ((io = () => Dt("yes")), (so = () => Dt("no")), ($[15] = Dt), ($[16] = io), ($[17] = so));
  else ((io = $[16]), (so = $[17]));
  let po;
  if ($[18] !== rt.remountKey || $[19] !== ze || $[20] !== Xe || $[21] !== io || $[22] !== so)
    ((po = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      paddingX: 1,
      children: [
        Lt,
        oo,
        Xt,
        e(Box, {
          marginTop: 1,
          children: e(
            ConfirmSelect,
            {
              refuseInput: ze,
              openedAt: Xe,
              hideIndexes: !0,
              confirmLabel: It !== null ? It.node : "Yes, enter plan mode",
              cancelLabel: "No, start implementing now",
              onConfirm: io,
              onCancel: so,
            },
            rt.remountKey,
          ),
        }),
      ],
    })),
      ($[18] = rt.remountKey),
      ($[19] = ze),
      ($[20] = Xe),
      ($[21] = io),
      ($[22] = so),
      ($[23] = po));
  else po = $[23];
  let ao;
  if ($[24] !== payload.requestSource || $[25] !== po)
    ((ao = e(PermissionDialog_2, {
      color: "planMode",
      title: "Enter plan mode?",
      requestSource: payload.requestSource,
      children: po,
    })),
      ($[24] = payload.requestSource),
      ($[25] = po),
      ($[26] = ao));
  else ao = $[26];
  return ao;
}

export { EnterPlanModePermissionRequest };
