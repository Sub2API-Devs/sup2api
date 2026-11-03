/**
 * screens/replDialogState.ts
 *
 * 2.1.316 新增：REPL 对话框状态：提示改写 store、LSP 推荐对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (16)
 * attribution: placement 16
 */
import { j, yt, Q } from "../../vendor/react/cjs/react.production.js";
import { joinPartialResponse } from "../services/api/partialResponse.js";
import { createStore } from "../state/store.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useAppState } from "../state/AppState.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { useStoreSelector, NRr } from "../hooks/useStoreSelector.js";
import { messagesAfterAreOnlySynthetic } from "../utils/messages.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, hu, U, o, E } from "../../vendor/zod/v4/classic/schemas.js";
import { GOAL_PROPOSAL_DIALOG } from "../components/goal/goalProposalDialog.js";
import { REMOTE_CALLOUT_DIALOG } from "../components/RemoteCallout.js";
import {
  ULTRAPLAN_CHOICE,
  COST_THRESHOLD,
  AUTOCOMPACT_OFFER,
  RESUME_RETURN,
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER,
  FULLSCREEN_UPSELL,
  s9o,
  Xqt,
  NUDGE_IDS,
  est,
} from "../components/nudges/nudgeIds.js";

//@ chunk-ag5x7vhf.js:6718-6722 placement
j();
//@ chunk-ag5x7vhf.js:6722-6795 placement
var jgo = 1,
  yu = 2,
  Su = 4,
  yT = /^\s*\|[^\n]*(\n[ |:\r-]*|\n[ |:\r-]+\n[^\n]*)?$/;
//@ chunk-ag5x7vhf.js:6795-7114 placement
function pickPromptRewrite(m) {
  let { raw: raw, transformed: transformed, rewrite: rewrite, salvage: salvage, exact: exact } = m,
    I =
      rewrite !== null && raw?.startsWith(rewrite.original)
        ? rewrite.text + raw.slice(rewrite.original.length)
        : raw || null,
    D = transformed ?? I,
    L = (salvage !== null ? joinPartialResponse(salvage, D ?? "", exact) : D) || null,
    V =
      L !== null &&
      L.trimStart().includes(`
`) &&
      !yT.test(L);
  return { displayed: L, hideTrailingLine: transformed === null && !!raw, displayedPaintsLine: V };
}
/**
 * 输入框改写状态 store：原文、改写后文本、rewrite/salvage 与是否精确匹配。
 */
//@ chunk-ag5x7vhf.js:7114-7781 placement
function createPromptRewriteStore() {
  let m = createStore({ raw: null, transformed: null, rewrite: null, salvage: null, exact: !1 }),
    h = null,
    x = null;
  function T() {
    let state = m.getState();
    if (x === null || h !== state) ((h = state), (x = pickPromptRewrite(state)));
    return x;
  }
  function k(_, I) {
    m.setState((D) => (D[_] === I ? D : { ...D, [_]: I }));
  }
  return {
    setRaw: (_) => k("raw", _),
    setTransformed: (_) => k("transformed", _),
    setRewrite: (_) => k("rewrite", _),
    setSalvage: (_, I) =>
      m.setState((D) => {
        let A = I ?? D.exact;
        if (D.salvage === _ && D.exact === A) return D;
        return { ...D, salvage: _, exact: A };
      }),
    getState: m.getState,
    getDerived: T,
    getFlags() {
      let state = m.getState(),
        {
          displayed: displayed,
          hideTrailingLine: hideTrailingLine,
          displayedPaintsLine: displayedPaintsLine,
        } = T();
      return (
        (state.raw !== null ? jgo : 0) |
        (displayed !== null ? yu : 0) |
        (displayed !== null && hideTrailingLine && !displayedPaintsLine ? Su : 0)
      );
    },
    subscribe: m.subscribe,
  };
}
//@ chunk-ag5x7vhf.js:7781-7794 placement
var ST = () => 0;
//@ chunk-ag5x7vhf.js:7794-7831 placement
function isMotionAllowed(m, h) {
  return !(m ?? !1) && !h;
}
/**
 * 根据屏幕模式（transcript/全屏）与焦点决定转圈动画显示在 hidden/focus/none 哪里。
 */
//@ chunk-ag5x7vhf.js:7831-7933 placement
function spinnerPlacement(m, h, x, T) {
  if (m === "transcript" || h) return "hidden";
  return x && T === "fullscreen" ? "focus" : "none";
}
//@ chunk-ag5x7vhf.js:7933-8399 placement
function TurnSpinnerRow({ turn: turn, messages: messages, screen: screen }) {
  let T = useIsFullscreen(),
    k = isMotionAllowed(
      useAppState((z) => z.settings.prefersReducedMotion),
      isWindowsTerminal(),
    ),
    _ = useAppState((z) => z.briefTranscript),
    I = useStoreSelector(turn, (z) => z.isLoading) ?? !1,
    D = useStoreSelector(turn?.stream, (z) => z.streamingToolUses.length) ?? 0,
    A = turn?.stream.previewStore,
    L = yt(A ? A.subscribe : NRr, A ? A.getFlags : ST),
    V = (L & Su) !== 0,
    W = Q(
      () => I && _ && screen !== "transcript" && T && (V || D > 0 || messagesAfterAreOnlySynthetic(messages)),
      [I, _, screen, T, V, D, messages],
    );
  return {
    showStreamingText: k,
    hasDisplayedStreamingText: k && (L & yu) !== 0,
    tailBlank: V,
    focusFoldHoldsPreview: W,
  };
}
/**
 * REPL 对话框注册项：IDE 引导对话（kind=ide_onboarding）的载荷与结果 schema。
 */
//@ chunk-ag5x7vhf.js:8399-8587 placement
var IDE_ONBOARDING_DIALOG = withHideWhile({
  kind: "ide_onboarding",
  payload: DoctorLazy(() =>
    u({ installationStatus: hu((m) => typeof m === "object" && m !== null).nullable() }),
  ),
  result: DoctorLazy(() => U(["dismissed", "cancelled"])),
  default: "cancelled",
});
/**
 * 对话框注册项：按 ← 离开当前代理视图时的确认对话（confirm/stay）。
 */
//@ chunk-ag5x7vhf.js:8587-8835 placement
var LEFT_ARROW_CONFIRM_DIALOG = withHideWhile({
  kind: "left_arrow_confirm",
  payload: DoctorLazy(() =>
    u({
      summary: o(),
      carryOverCount: E(),
      monitorParkCount: E(),
      workflowAgents: u({ running: E(), finished: E(), rerun: E() }),
    }),
  ),
  result: DoctorLazy(() => U(["confirm", "stay", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-ag5x7vhf.js:8835-9334 placement
var LSP_RECOMMENDATION_DIALOG = withHideWhile({
    kind: "lsp_recommendation",
    payload: DoctorLazy(() =>
      u({ pluginName: o(), pluginDescription: o().optional(), marketplaceName: o(), fileExtension: o() }),
    ),
    result: DoctorLazy(() => U(["yes", "no", "timeout", "never", "disable", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  }),
  HXe = withHideWhile({
    kind: "plugin_hint",
    payload: DoctorLazy(() =>
      u({ pluginName: o(), pluginDescription: o().optional(), marketplaceName: o(), sourceCommand: o() }),
    ),
    result: DoctorLazy(() => U(["yes", "no", "disable", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
//@ chunk-ag5x7vhf.js:9334-9507 placement
var NON_BLOCKING_DIALOG_KINDS = new Set([
  LSP_RECOMMENDATION_DIALOG.kind,
  HXe.kind,
  LEFT_ARROW_CONFIRM_DIALOG.kind,
  GOAL_PROPOSAL_DIALOG.kind,
  REMOTE_CALLOUT_DIALOG.kind,
  ULTRAPLAN_CHOICE,
  COST_THRESHOLD,
  AUTOCOMPACT_OFFER,
  RESUME_RETURN,
  COLD_RESUME_QUOTA,
  NEWER_MODEL_OFFER,
  IDE_ONBOARDING_DIALOG.kind,
  FULLSCREEN_UPSELL,
  ...(s9o === null ? [] : [s9o]),
  ...(Xqt === null ? [] : [Xqt]),
  NUDGE_IDS,
  ...(est === null ? [] : [est]),
]);
//@ chunk-ag5x7vhf.js:9507-9594 placement
function topBlockingDialog(m) {
  return m.open.findLast((h) => h.userInvoked !== !0 && !NON_BLOCKING_DIALOG_KINDS.has(h.kind)) ?? null;
}
//@ chunk-ag5x7vhf.js:9594-9689 placement
function topAskOrder(m) {
  return m.open.findLast((h) => h.userInvoked !== !0 && h.askOrder !== void 0)?.askOrder;
}
//@ chunk-ag5x7vhf.js:9689-9693 placement
j();
//@ chunk-ag5x7vhf.js:9693-9697 placement
j();

export {
  topBlockingDialog,
  LEFT_ARROW_CONFIRM_DIALOG,
  isMotionAllowed,
  TurnSpinnerRow,
  spinnerPlacement,
  IDE_ONBOARDING_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  HXe,
  jgo,
  NON_BLOCKING_DIALOG_KINDS,
  topAskOrder,
  createPromptRewriteStore,
};
