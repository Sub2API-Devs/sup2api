/**
 * screens/replDialogState.ts
 *
 * 2.1.316 新增：REPL 对话框状态：提示改写 store、LSP 推荐对话框等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fpa5emn1.js (6), chunk-hnxhr3bs.js (10)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  custom,
  _enum,
  stringSchema,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
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
  hasNoBridgeControl,
  EFFORT_MEDIUM_NUDGE,
  PROGRAM_USE_CASE_QUESTION,
  NUDGE_ID_C,
} from "../components/nudges/nudgeIds.js";
import {
  init_react_production,
  useSyncExternalStore,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import { joinPartialResponse } from "../services/api/partialResponse.js";
import { createStore } from "../state/store.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useAppState } from "../state/AppState.js";
import { isWindowsTerminal } from "../ink/clearTerminal.js";
import { useStoreSelector, ZERO_SELECTOR } from "../hooks/useStoreSelector.js";
import { sanitizeFileName } from "../utils/messages.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-fpa5emn1.js:465-653 placement
/**
 * REPL 对话框注册项：IDE 引导对话（kind=ide_onboarding）的载荷与结果 schema。
 */
var IDE_ONBOARDING_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fpa5emn1.js:465", () => {
  IDE_ONBOARDING_DIALOG = withHideWhile({
    kind: "ide_onboarding",
    payload: DoctorLazy(() =>
      objectSchema({
        installationStatus: custom((value) => typeof value === "object" && value !== null).nullable(),
      }),
    ),
    result: DoctorLazy(() => _enum(["dismissed", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-fpa5emn1.js:653-901 placement
/**
 * 对话框注册项：按 ← 离开当前代理视图时的确认对话（confirm/stay）。
 */
var LEFT_ARROW_CONFIRM_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fpa5emn1.js:653", () => {
  LEFT_ARROW_CONFIRM_DIALOG = withHideWhile({
    kind: "left_arrow_confirm",
    payload: DoctorLazy(() =>
      objectSchema({
        summary: stringSchema(),
        carryOverCount: numberSchema(),
        monitorParkCount: numberSchema(),
        workflowAgents: objectSchema({
          running: numberSchema(),
          finished: numberSchema(),
          rerun: numberSchema(),
        }),
      }),
    ),
    result: DoctorLazy(() => _enum(["confirm", "stay", "cancelled"])),
    default: "cancelled",
    hideWhile: [],
  });
});
//@ chunk-fpa5emn1.js:901-1400 placement
/**
 * LSP 推荐对话框与插件提示对话框的定义：kind、payload/result schema、默认结果与隐藏条件。
 */
var LSP_RECOMMENDATION_DIALOG; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PLUGIN_HINT_DIALOG;
deferInit("chunk-fpa5emn1.js:901", () => {
  LSP_RECOMMENDATION_DIALOG = withHideWhile({
    kind: "lsp_recommendation",
    payload: DoctorLazy(() =>
      objectSchema({
        pluginName: stringSchema(),
        pluginDescription: stringSchema().optional(),
        marketplaceName: stringSchema(),
        fileExtension: stringSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["yes", "no", "timeout", "never", "disable", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
  PLUGIN_HINT_DIALOG = withHideWhile({
    kind: "plugin_hint",
    payload: DoctorLazy(() =>
      objectSchema({
        pluginName: stringSchema(),
        pluginDescription: stringSchema().optional(),
        marketplaceName: stringSchema(),
        sourceCommand: stringSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["yes", "no", "disable", "cancelled"])),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-fpa5emn1.js:1400-1601 placement
var NON_BLOCKING_DIALOG_KINDS; // deferred: uses LSP_RECOMMENDATION_DIALOG of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fpa5emn1.js:1400", () => {
  NON_BLOCKING_DIALOG_KINDS = new Set([
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
    ...(hasNoBridgeControl === null ? [] : [hasNoBridgeControl]),
    EFFORT_MEDIUM_NUDGE,
    PROGRAM_USE_CASE_QUESTION,
    ...(NUDGE_ID_C === null ? [] : [NUDGE_ID_C]),
  ]);
});
//@ chunk-fpa5emn1.js:1601-1688 placement
function topBlockingDialog(state) {
  return (
    state.open.findLast(
      (dialog) => dialog.userInvoked !== true && !NON_BLOCKING_DIALOG_KINDS.has(dialog.kind),
    ) ?? null
  );
}
//@ chunk-fpa5emn1.js:1688-1783 placement
function topAskOrder(state) {
  return state.open.findLast((dialog) => dialog.userInvoked !== true && dialog.askOrder !== undefined)
    ?.askOrder;
}
//@ chunk-hnxhr3bs.js:6855-6859 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:6855", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:6859-6932 placement
/**
 * 导出常量或表 `STATE_HAS_RAW`：值为 1, yu = 2, Su = 4, yT = /^\s*\|[^\n]*(\n[ |:\r-]*|\n[ |:\r-]+\n[^\n]*)?$/。
 */
var STATE_HAS_RAW = 1;
var STATE_HAS_DISPLAYED = 2;
var STATE_HIDES_TRAILING = 4;
var MARKDOWN_TABLE_LINE_RE = /^\s*\|[^\n]*(\n[ |:\r-]*|\n[ |:\r-]+\n[^\n]*)?$/;
//@ chunk-hnxhr3bs.js:6932-7251 placement
function pickPromptRewrite(state) {
  let { raw, transformed, rewrite, salvage, exact } = state;
  let rewritten =
    rewrite !== null && raw?.startsWith(rewrite.original)
      ? rewrite.text + raw.slice(rewrite.original.length)
      : raw || null;
  let transformedValue = transformed ?? rewritten;
  let withSalvage =
    (salvage !== null ? joinPartialResponse(salvage, transformedValue ?? "", exact) : transformedValue) ||
    null;
  let displayedPaintsLine =
    withSalvage !== null &&
    withSalvage.trimStart().includes(`
`) &&
    !MARKDOWN_TABLE_LINE_RE.test(withSalvage);
  return {
    displayed: withSalvage,
    hideTrailingLine: transformed === null && !!raw,
    displayedPaintsLine,
  };
}
//@ chunk-hnxhr3bs.js:7251-7918 placement
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
  let lastState = null;
  let lastPicked = null;
  function getPicked() {
    let state = store.getState();
    if (lastPicked === null || lastState !== state) {
      lastState = state;
      lastPicked = pickPromptRewrite(state);
    }
    return lastPicked;
  }
  function update(patch, options) {
    store.setState((state) =>
      state[patch] === options
        ? state
        : {
            ...state,
            [patch]: options,
          },
    );
  }
  return {
    setRaw: (raw) => update("raw", raw),
    setTransformed: (transformed) => update("transformed", transformed),
    setRewrite: (rewrite) => update("rewrite", rewrite),
    setSalvage: (salvage, exact) =>
      store.setState((state) => {
        let nextExact = exact ?? state.exact;
        if (state.salvage === salvage && state.exact === nextExact) return state;
        return {
          ...state,
          salvage,
          exact: nextExact,
        };
      }),
    getState: store.getState,
    getDerived: getPicked,
    getFlags() {
      let state = store.getState();
      let { displayed, hideTrailingLine, displayedPaintsLine } = getPicked();
      return (
        (state.raw !== null ? STATE_HAS_RAW : 0) |
        (displayed !== null ? STATE_HAS_DISPLAYED : 0) |
        (displayed !== null && hideTrailingLine && !displayedPaintsLine ? STATE_HIDES_TRAILING : 0)
      );
    },
    subscribe: store.subscribe,
  };
}
//@ chunk-hnxhr3bs.js:7918-7931 placement
var zeroFlagReader = () => 0;
//@ chunk-hnxhr3bs.js:7931-7968 placement
function isMotionAllowed(prefersReduced, isWindows) {
  return !(prefersReduced ?? false) && !isWindows;
}
//@ chunk-hnxhr3bs.js:7968-8070 placement
/**
 * 根据屏幕模式（transcript/全屏）与焦点决定转圈动画显示在 hidden/focus/none 哪里。
 */
function spinnerPlacement(screen, isBriefOnly, briefTranscript, presentation) {
  if (screen === "transcript" || isBriefOnly) return "hidden";
  return briefTranscript && presentation === "fullscreen" ? "focus" : "none";
}
//@ chunk-hnxhr3bs.js:8070-8536 placement
function TurnSpinnerRow({ turn, messages, screen }) {
  let isFullscreen = useIsFullscreen();
  let motionAllowed = isMotionAllowed(
    useAppState((state) => state.settings.prefersReducedMotion),
    isWindowsTerminal(),
  );
  let briefTranscript = useAppState((state) => state.briefTranscript);
  let isLoading = useStoreSelector(turn, (turn) => turn.isLoading) ?? false;
  let streamingCount = useStoreSelector(turn?.stream, (stream) => stream.streamingToolUses.length) ?? 0;
  let previewStore = turn?.stream.previewStore;
  let flags = useSyncExternalStore(
    previewStore ? previewStore.subscribe : ZERO_SELECTOR,
    previewStore ? previewStore.getFlags : zeroFlagReader,
  );
  let hidesTrailing = (flags & STATE_HIDES_TRAILING) !== 0;
  let focusFoldHoldsPreview = useMemo(
    () =>
      isLoading &&
      briefTranscript &&
      screen !== "transcript" &&
      isFullscreen &&
      (hidesTrailing || streamingCount > 0 || sanitizeFileName(messages)),
    [isLoading, briefTranscript, screen, isFullscreen, hidesTrailing, streamingCount, messages],
  );
  return {
    showStreamingText: motionAllowed,
    hasDisplayedStreamingText: motionAllowed && (flags & STATE_HAS_DISPLAYED) !== 0,
    tailBlank: hidesTrailing,
    focusFoldHoldsPreview,
  };
}
//@ chunk-hnxhr3bs.js:8536-8540 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:8536", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:8540-8544 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:8540", () => {
  init_react_production();
});
export {
  TurnSpinnerRow,
  topBlockingDialog,
  LEFT_ARROW_CONFIRM_DIALOG,
  isMotionAllowed,
  spinnerPlacement,
  IDE_ONBOARDING_DIALOG,
  LSP_RECOMMENDATION_DIALOG,
  PLUGIN_HINT_DIALOG,
  STATE_HAS_RAW,
  NON_BLOCKING_DIALOG_KINDS,
  topAskOrder,
  createPromptRewriteStore,
};
