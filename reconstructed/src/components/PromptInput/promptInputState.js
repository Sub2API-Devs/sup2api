/**
 * components/PromptInput/promptInputState.ts
 *
 * 2.1.316 新增。输入框状态管理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
 */
import { j, Se, Q, y, P } from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useFooterTranscript } from "./PromptInputFooter.js";
import { getGlobalConfig } from "../../utils/config.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { lVt } from "../../context/replRootContext.js";
import { leftArrowHintText } from "../../screens/repl/BackgroundGesture.js";
import { Nto, $to, getFastModeRuntimeState, isFastModeEnabled, mf } from "../../utils/fastMode.js";
import { useResetReached } from "../rateLimit/quotaAutoResume.js";
import { useKillRing, egt } from "../../utils/killRing.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useFooterAwareMessageActions } from "../CoordinatorAgentStatus.js";
import { Sv, takeDrawnOffer } from "../../utils/newerModelOffer.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { EHt, savedModelSuccessor, markModelSuccessorAnswered } from "../LogoV2/ModelSuccessorNotice.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { zzt } from "../../utils/messageQueueManager.js";
import { resolveRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { shouldShowEffortChangeNotice } from "../../utils/effort.js";
import { PANE_PADDING, l5, zR } from "../design-system/Pane.js";
import { truncateToWidth } from "../../utils/format.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";

//@ chunk-18hwfzwa.js:922318-922322 placement
j();
//@ chunk-18hwfzwa.js:922322-922709 placement
function useLeftArrowGesture({
  gesture: gesture,
  turn: turn,
  transcript: transcript,
  onDetachToCaller: onDetachToCaller,
}) {
  let ee = useStoreSelector(turn, (ze) => ze.isLoading),
    ke = useStoreSelector(turn, (ze) => ze.isExternalLoading),
    Re = useFooterTranscript({ turn: turn, transcript: transcript }),
    Be = getGlobalConfig().leftArrowOpensAgents !== !1,
    He = useStatusLineSuppressed(),
    We = Se(lVt) !== null;
  return Q(
    () =>
      leftArrowHintText(gesture, {
        onDetachToCaller: We ? void 0 : onDetachToCaller,
        isLoading: ee,
        isExternalLoading: ke,
        betweenCalls: Re,
        leftArrowOpensAgents: Be,
        tabsStandIn: He,
      }),
    [gesture, We, onDetachToCaller, ee, ke, Re, Be, He],
  );
}
//@ chunk-18hwfzwa.js:922709-922827 placement
function touchPlanModeUse(h, x) {
  if (h.lastPlanModeUse !== void 0 && x - h.lastPlanModeUse < 86400000) return h;
  return { ...h, lastPlanModeUse: x };
}
//@ chunk-18hwfzwa.js:922827-922831 placement
j();
//@ chunk-18hwfzwa.js:922831-923004 placement
function useFastModeCooldownActive() {
  let [h, x] = y(p9e);
  P(() => {
    let L = Nto((ke) => x(ke)),
      ee = $to(() => x(null));
    return () => {
      (L(), ee());
    };
  }, []);
  let D = useResetReached(h);
  return (
    P(() => {
      if (D) getFastModeRuntimeState();
    }, [D]),
    isFastModeEnabled() && p9e() !== null && !D
  );
}
//@ chunk-18hwfzwa.js:923004-923085 placement
function p9e() {
  let runtimeState = mf.runtimeState;
  return runtimeState.status === "cooldown" ? runtimeState.resetAt : null;
}
//@ chunk-18hwfzwa.js:923085-923098 placement
var f9e = 1000;
//@ chunk-18hwfzwa.js:923098-923488 placement
function useSavedModelSuccessorKey(h) {
  let x = useKillRing(),
    { storageV5: storageV5 } = Me(),
    L = useInputClock();
  useFooterAwareMessageActions(
    {
      "chat:defaultToNewerModel": () => {
        if (egt(x.state) !== "") return (Sv(), !1);
        if (takeDrawnOffer(L, f9e)) return;
        let savedModelSuccessorDrawnAt = announcementState().savedModelSuccessorDrawnAt,
          Re =
            EHt() &&
            savedModelSuccessorDrawnAt !== null &&
            !isWithinRecentInput(L, savedModelSuccessorDrawnAt, f9e)
              ? savedModelSuccessor()
              : void 0;
        if (!Re) return !1;
        (logEvent("tengu_saved_model_successor_key", {
          from_model: telemetrySafeModelName(Re.from),
          to_model: telemetrySafeModelName(Re.to),
        }),
          markModelSuccessorAnswered(Re, storageV5),
          zzt()?.(`model ${Re.alias}`, { kind: "human" }));
      },
    },
    h,
  );
}
//@ chunk-18hwfzwa.js:923488-923492 placement
j();
/**
 * 判断切换 effort 时是否需要显示提示：分别对当前模型与运行时实际模型检查是否满足提示条件。
 */
//@ chunk-18hwfzwa.js:923492-923761 placement
function shouldShowEffortNotice(h) {
  let { target: target, current: D, model: model, permissionMode: permissionMode, messages: messages } = h,
    model_2 = resolveRuntimeMainLoopModel({
      permissionMode: permissionMode,
      mainLoopModel: model,
      setting: h.setting,
      exceeds200kTokens: permissionMode === "plan" && doesMostRecentAssistantMessageExceed200k(messages),
    }).model;
  return [model, model_2].some((Be) =>
    shouldShowEffortChangeNotice(target, D, Be, h.ackedAtOutputTokens, h.promptCacheMayBeWarm),
  );
}
//@ chunk-18hwfzwa.js:923761-923804 placement
var V3 = 3,
  max = Math.max(2 * PANE_PADDING, 2 * (l5 + zR)),
  zh = 20;
//@ chunk-18hwfzwa.js:923804-924103 placement
function truncateLines(h, x, D = V3 + 1) {
  let max_2 = Math.max(zh, x - max),
    mapped = h
      .split(
        `
`,
      )
      .map((Re) => truncateToWidth(Re, max_2));
  if (mapped.length <= D)
    return mapped.join(`
`);
  if (D <= 1) {
    let Re = ` \u2026 (+${mapped.length - 1} more lines)`;
    return truncateToWidth(getFirstLine(h), Math.max(1, max_2 - bunStringWidth(Re))) + Re;
  }
  let ke = D - 1;
  return (
    mapped.slice(0, ke).join(`
`) +
    `
\u2026 (+${mapped.length - ke} more lines)`
  );
}
//@ chunk-18hwfzwa.js:924103-924168 placement
function Lao(co) {
  return { ...co, cacheMissAckedAtOutputTokens: getTotalOutputTokens() };
}
//@ chunk-18hwfzwa.js:924168-924178 placement
var g9e = 6;

export {
  max,
  useLeftArrowGesture,
  touchPlanModeUse,
  useSavedModelSuccessorKey,
  useFastModeCooldownActive,
  Lao,
  truncateLines,
  g9e,
  shouldShowEffortNotice,
  V3,
  zh,
};
