/**
 * components/PromptInput/effortStepKeys.ts
 *
 * 2.1.316 新增。调整 effort 的按键处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cr, useSetAppState } from "../../state/AppState.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { useSelection } from "../../ink/components/Input.js";
import { useNotifications } from "../../context/notifications.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { y, P } from "../../../vendor/react/cjs/react.production.js";
import { dg } from "../../context/QueuedMessageContext.js";
import {
  getEffortLevelOrHigh,
  resolveEffortLevel,
  shouldShowEffortHint,
  findAdjacentEffortLevel,
  isOnlyMaxAboveEffort,
} from "../../utils/effort.js";
import { applyEffortCommand } from "../../commands/effort/effort.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { UP_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { EFFORT_LEVEL_KEY } from "../EffortIndicator.js";
import { shouldShowEffortNotice } from "./promptInputState.js";
import { isMainThreadSource } from "../../utils/querySource.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { ModelEffortSwitchConfirm } from "../ModelEffortSwitchConfirm.js";
import { useFooterAwareMessageActions } from "../CoordinatorAgentStatus.js";

//@ chunk-18hwfzwa.js:925874-925910 placement
var EFFORT_STEP_MAX_VIA_EFFORT = "effort-step-max-via-effort";
//@ chunk-18hwfzwa.js:925910-927945 placement
function useEffortStepKeys(h, x) {
  let $ = w(32),
    D = Cr(),
    L = useSetAppState(),
    ee = useMainLoopModel_3(),
    ke = useSelection(),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    He = useKeybindingContext(),
    [We, ze] = y(null),
    Xe = dg(),
    kt;
  if ($[0] !== Xe || $[1] !== ee)
    ((kt = getEffortLevelOrHigh(ee, Xe)), ($[0] = Xe), ($[1] = ee), ($[2] = kt));
  else kt = $[2];
  let At = kt,
    It;
  if ($[3] !== removeNotification)
    ((It = () => {
      removeNotification(EFFORT_STEP_MAX_VIA_EFFORT);
    }),
      ($[3] = removeNotification),
      ($[4] = It));
  else It = $[4];
  let Ot;
  if ($[5] !== ee || $[6] !== removeNotification || $[7] !== At)
    ((Ot = [At, ee, removeNotification]), ($[5] = ee), ($[6] = removeNotification), ($[7] = At), ($[8] = Ot));
  else Ot = $[8];
  P(It, Ot);
  let Et,
    Dt = null,
    Lt;
  if ($[9] !== L || $[10] !== D)
    ((Lt = (oo) => {
      let state = D.getState();
      (applyEffortCommand(
        oo,
        { effort: resolveEffortLevel(state), ultracode: state.ultracode, route: "step_keys" },
        L,
        !1,
      ),
        logFeatureOk("effort_step_keybinding"));
    }),
      ($[9] = L),
      ($[10] = D),
      ($[11] = Lt));
  else Lt = $[11];
  let io;
  if (
    $[12] !== addNotification ||
    $[13] !== Lt ||
    $[14] !== He ||
    $[15] !== ee ||
    $[16] !== removeNotification ||
    $[17] !== ke ||
    $[18] !== D ||
    $[19] !== h
  )
    ((io = (so) => {
      if (ke.hasSelection() || !shouldShowEffortHint(ee)) {
        return !1;
      }
      let state = D.getState();
      let ao = resolveEffortLevel(state);
      let co = getEffortLevelOrHigh(ee, ao);
      let bo = findAdjacentEffortLevel(ee, co, so);
      if (bo === void 0) {
        if (so === 1 && isOnlyMaxAboveEffort(ee, co)) {
          let Ao = He?.getDisplayText("chat:increaseEffort", "Chat") ?? `shift+${UP_ARROW}`;
          (removeNotification(EFFORT_LEVEL_KEY),
            addNotification({
              key: EFFORT_STEP_MAX_VIA_EFFORT,
              kind: "feedback",
              text: `${Ao} stops below max \xB7 /effort max to set it`,
              priority: "immediate",
            }));
        }
        return;
      }
      if (
        shouldShowEffortNotice({
          target: bo,
          current: ao,
          model: ee,
          permissionMode: state.toolPermissionContext.mode,
          messages: h.getSnapshot(),
          ackedAtOutputTokens: state.cacheMissAckedAtOutputTokens,
          promptCacheMayBeWarm: isMainThreadSource(h.getSnapshot()),
        })
      ) {
        (removeNotification(EFFORT_STEP_MAX_VIA_EFFORT), ze(bo));
        return;
      }
      Lt(bo);
    }),
      ($[12] = addNotification),
      ($[13] = Lt),
      ($[14] = He),
      ($[15] = ee),
      ($[16] = removeNotification),
      ($[17] = ke),
      ($[18] = D),
      ($[19] = h),
      ($[20] = io));
  else io = $[20];
  let Bo = io,
    Ro;
  if ($[21] !== Bo || $[22] !== We)
    ((Ro = ((Et = { "chat:increaseEffort": () => Bo(1), "chat:decreaseEffort": () => Bo(-1) }), We !== null)),
      ($[21] = Bo),
      ($[22] = We),
      ($[23] = Ro),
      ($[24] = Et));
  else ((Ro = $[23]), (Et = $[24]));
  if (Ro) {
    let Ho;
    if ($[25] !== Lt || $[26] !== We)
      ((Ho = () => {
        (ze(null), Lt(We));
      }),
        ($[25] = Lt),
        ($[26] = We),
        ($[27] = Ho));
    else Ho = $[27];
    let Io;
    if ($[28] === MEMO_CACHE_SENTINEL) ((Io = () => ze(null)), ($[28] = Io));
    else Io = $[28];
    let Wo;
    if ($[29] !== Ho || $[30] !== We)
      ((Wo = e(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: e(ModelEffortSwitchConfirm, {
          kind: "effort",
          model: null,
          effort: We,
          overDraft: !0,
          onConfirm: Ho,
          onCancel: Io,
        }),
      })),
        ($[29] = Ho),
        ($[30] = We),
        ($[31] = Wo));
    else Wo = $[31];
    Dt = Wo;
  }
  return (useFooterAwareMessageActions(Et, x), Dt);
}

export { useEffortStepKeys };
