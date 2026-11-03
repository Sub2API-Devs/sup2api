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
import { init_react_production, yt, Q } from "../../vendor/react/cjs/react.production.js";
import { joinPartialResponse } from "../services/api/partialResponse.js";
import { createStore } from "../state/store.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useAppState } from "../state/AppState.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { useStoreSelector, ZERO_SELECTOR } from "../hooks/useStoreSelector.js";
import { messagesAfterAreOnlySynthetic } from "../utils/messages.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, hu, _enum, string, E } from "../../vendor/zod/v4/classic/schemas.js";
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
  NUDGE_ID_A,
  NUDGE_ID_B,
  NUDGE_IDS,
  NUDGE_ID_C,
} from "../components/nudges/nudgeIds.js";

//@ chunk-ag5x7vhf.js:6718-6722 placement
init_react_production();
//@ chunk-ag5x7vhf.js:6722-6795 placement
/**
 * 导出常量或表 `STATE_HAS_RAW`：值为 1, yu = 2, Su = 4, yT = /^\s*\|[^\n]*(\n[ |:\r-]*|\n[ |:\r-]+\n[^\n]*)?$/。
 */
var STATE_HAS_RAW = 1;
var STATE_HAS_DISPLAYED = 2;
var STATE_HIDES_TRAILING = 4;
var MARKDOWN_TABLE_LINE_RE = /^\s*\|[^\n]*(\n[ |:\r-]*|\n[ |:\r-]+\n[^\n]*)?$/;
//@ chunk-ag5x7vhf.js:6795-7114 placement
function pickPromptRewrite(m) {
  let { raw, transformed, rewrite, salvage, exact } = m;
  let I =
    rewrite !== null && raw?.startsWith(rewrite.original)
      ? rewrite.text + raw.slice(rewrite.original.length)
      : raw || null;
  let D = transformed ?? I;
  let L = (salvage !== null ? joinPartialResponse(salvage, D ?? "", exact) : D) || null;
  let displayedPaintsLine =
    L !== null &&
    L.trimStart().includes(`
`) &&
    !MARKDOWN_TABLE_LINE_RE.test(L);
  return {
    displayed: L,
    hideTrailingLine: transformed === null && !!raw,
    displayedPaintsLine,
  };
}
//@ chunk-ag5x7vhf.js:7114-7781 placement
/**
 * 输入框改写状态 store：原文、改写后文本、rewrite/salvage 与是否精确匹配。
 */
function createPromptRewriteStore() {
  let store = createStore({
    raw: null,
    transformed: null,
    rewrite: null,
    salvage: null,
    exact: false,
  });
  let h = null;
  let x = null;
  function T() {
    let state = store.getState();
    if (x === null || h !== state) {
      h = state;
      x = pickPromptRewrite(state);
    }
    return x;
  }
  function k(_, I) {
    store.setState((D) =>
      D[_] === I
        ? D
        : {
            ...D,
            [_]: I,
          },
    );
  }
  return {
    setRaw: (_) => k("raw", _),
    setTransformed: (_) => k("transformed", _),
    setRewrite: (_) => k("rewrite", _),
    setSalvage: (_, I) =>
      store.setState((D) => {
        let A = I ?? D.exact;
        if (D.salvage === _ && D.exact === A) return D;
        return {
          ...D,
          salvage: _,
          exact: A,
        };
      }),
    getState: store.getState,
    getDerived: T,
    getFlags() {
      let state = store.getState();
      let { displayed, hideTrailingLine, displayedPaintsLine } = T();
      return (
        (state.raw !== null ? STATE_HAS_RAW : 0) |
        (displayed !== null ? STATE_HAS_DISPLAYED : 0) |
        (displayed !== null && hideTrailingLine && !displayedPaintsLine ? STATE_HIDES_TRAILING : 0)
      );
    },
    subscribe: store.subscribe,
  };
}
//@ chunk-ag5x7vhf.js:7781-7794 placement
var zeroFlagReader = () => 0;
//@ chunk-ag5x7vhf.js:7794-7831 placement
function isMotionAllowed(m, h) {
  return !(m ?? false) && !h;
}
//@ chunk-ag5x7vhf.js:7831-7933 placement
/**
 * 根据屏幕模式（transcript/全屏）与焦点决定转圈动画显示在 hidden/focus/none 哪里。
 */
function spinnerPlacement(screen, isBriefOnly, briefTranscript, presentation) {
  if (screen === "transcript" || isBriefOnly) return "hidden";
  return briefTranscript && presentation === "fullscreen" ? "focus" : "none";
}
//@ chunk-ag5x7vhf.js:7933-8399 placement
function TurnSpinnerRow({ turn, messages, screen }) {
  let isFullscreen = useIsFullscreen();
  let k = isMotionAllowed(
    useAppState((z) => z.settings.prefersReducedMotion),
    isWindowsTerminal(),
  );
  let _ = useAppState((z) => z.briefTranscript);
  let I = useStoreSelector(turn, (z) => z.isLoading) ?? false;
  let D = useStoreSelector(turn?.stream, (z) => z.streamingToolUses.length) ?? 0;
  let previewStore = turn?.stream.previewStore;
  let L = yt(
    previewStore ? previewStore.subscribe : ZERO_SELECTOR,
    previewStore ? previewStore.getFlags : zeroFlagReader,
  );
  let V = (L & STATE_HIDES_TRAILING) !== 0;
  let focusFoldHoldsPreview = Q(
    () =>
      I &&
      _ &&
      screen !== "transcript" &&
      isFullscreen &&
      (V || D > 0 || messagesAfterAreOnlySynthetic(messages)),
    [I, _, screen, isFullscreen, V, D, messages],
  );
  return {
    showStreamingText: k,
    hasDisplayedStreamingText: k && (L & STATE_HAS_DISPLAYED) !== 0,
    tailBlank: V,
    focusFoldHoldsPreview,
  };
}
//@ chunk-ag5x7vhf.js:8399-8587 placement
/**
 * REPL 对话框注册项：IDE 引导对话（kind=ide_onboarding）的载荷与结果 schema。
 */
var IDE_ONBOARDING_DIALOG = withHideWhile({
  kind: "ide_onboarding",
  payload: DoctorLazy(() =>
    u({
      installationStatus: hu((m) => typeof m === "object" && m !== null).nullable(),
    }),
  ),
  result: DoctorLazy(() => _enum(["dismissed", "cancelled"])),
  default: "cancelled",
});
//@ chunk-ag5x7vhf.js:8587-8835 placement
/**
 * 对话框注册项：按 ← 离开当前代理视图时的确认对话（confirm/stay）。
 */
var LEFT_ARROW_CONFIRM_DIALOG = withHideWhile({
  kind: "left_arrow_confirm",
  payload: DoctorLazy(() =>
    u({
      summary: string(),
      carryOverCount: E(),
      monitorParkCount: E(),
      workflowAgents: u({
        running: E(),
        finished: E(),
        rerun: E(),
      }),
    }),
  ),
  result: DoctorLazy(() => _enum(["confirm", "stay", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-ag5x7vhf.js:8835-9334 placement
/**
 * LSP 推荐对话框与插件提示对话框的定义：kind、payload/result schema、默认结果与隐藏条件。
 */
var LSP_RECOMMENDATION_DIALOG = withHideWhile({
  kind: "lsp_recommendation",
  payload: DoctorLazy(() =>
    u({
      pluginName: string(),
      pluginDescription: string().optional(),
      marketplaceName: string(),
      fileExtension: string(),
    }),
  ),
  result: DoctorLazy(() => _enum(["yes", "no", "timeout", "never", "disable", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
var PLUGIN_HINT_DIALOG = withHideWhile({
  kind: "plugin_hint",
  payload: DoctorLazy(() =>
    u({
      pluginName: string(),
      pluginDescription: string().optional(),
      marketplaceName: string(),
      sourceCommand: string(),
    }),
  ),
  result: DoctorLazy(() => _enum(["yes", "no", "disable", "cancelled"])),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-ag5x7vhf.js:9334-9507 placement
var NON_BLOCKING_DIALOG_KINDS = new Set([
  LSP_RECOMMENDATION_DIALOG.kind,
  PLUGIN_HINT_DIALOG.kind,
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
  ...(NUDGE_ID_A === null ? [] : [NUDGE_ID_A]),
  ...(NUDGE_ID_B === null ? [] : [NUDGE_ID_B]),
  NUDGE_IDS,
  ...(NUDGE_ID_C === null ? [] : [NUDGE_ID_C]),
]);
//@ chunk-ag5x7vhf.js:9507-9594 placement
function topBlockingDialog(m) {
  return m.open.findLast((h) => h.userInvoked !== true && !NON_BLOCKING_DIALOG_KINDS.has(h.kind)) ?? null;
}
//@ chunk-ag5x7vhf.js:9594-9689 placement
function topAskOrder(state) {
  return state.open.findLast((h) => h.userInvoked !== true && h.askOrder !== undefined)?.askOrder;
}
//@ chunk-ag5x7vhf.js:9689-9693 placement
init_react_production();
//@ chunk-ag5x7vhf.js:9693-9697 placement
init_react_production();
export {
  topBlockingDialog,
  LEFT_ARROW_CONFIRM_DIALOG,
  isMotionAllowed,
  TurnSpinnerRow,
  spinnerPlacement,
  IDE_ONBOARDING_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  PLUGIN_HINT_DIALOG,
  STATE_HAS_RAW,
  NON_BLOCKING_DIALOG_KINDS,
  topAskOrder,
  createPromptRewriteStore,
};
