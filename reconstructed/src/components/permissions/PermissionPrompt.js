/**
 * components/permissions/PermissionPrompt.tsx
 *
 * 通用权限选择提示：选项列表 + 可展开的反馈输入（"tell Claude what to do differently"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionPrompt.tsx
 * pieces: chunk-0e8j1zzj.js (4)
 * attribution: placement 1, fingerprint 3
 */
import { j, y, P, ce, Q } from "../../../vendor/react/cjs/react.production.js";
import { useShellPermissionFeedback } from "./useShellPermissionFeedback.js";
import { KillAgentsConfirm } from "../KillAgentsConfirm.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-0e8j1zzj.js:25579-25583 placement
j();
/**
 * 把权限提示归因状态中的 Esc 次数加一。
 */
//@ chunk-0e8j1zzj.js:25583-25686 fingerprint = _temp (1)
function incrementEscapeCount(prev) {
  return { ...prev, attribution: { ...prev.attribution, escapeCount: prev.attribution.escapeCount + 1 } };
}
//@ chunk-0e8j1zzj.js:28285-28375 fingerprint = DEFAULT_PLACEHOLDERS (1)
var DEFAULT_PLACEHOLDERS = {
  accept: "tell Claude what to do next",
  reject: "tell Claude what to do differently",
};
/**
 * 权限选择提示：Select 列出选项，选中带 input 的选项时展开反馈输入框（默认占位 "tell Claude what to do differently"）；Esc 视为拒绝。
 */
//@ chunk-0e8j1zzj.js:28375-30168 fingerprint = PermissionPrompt (0.469)
function PermissionPrompt({
  options: options,
  onSelect: onSelect,
  onCancel: onCancel,
  question: question = "Do you want to proceed?",
  toolAnalyticsContext: toolAnalyticsContext,
  defaultFocusValue: defaultFocusValue,
  hideIndexes: hideIndexes,
  requestSource: requestSource,
}) {
  let [k, f] = y(defaultFocusValue);
  P(() => {
    f(void 0);
  }, []);
  let g = ce((F) => options.find((U) => U.value === F)?.feedbackConfig?.type, [options]),
    {
      acceptFeedback: acceptFeedback,
      rejectFeedback: rejectFeedback,
      setAcceptFeedback: setAcceptFeedback,
      setRejectFeedback: setRejectFeedback,
      acceptInputMode: acceptInputMode,
      rejectInputMode: rejectInputMode,
      handleInputModeToggle: handleInputModeToggle,
      handleFocus: handleFocus,
      logSubmitted: logSubmitted,
      logEscape: logEscape,
      hintNode: hintNode,
    } = useShellPermissionFeedback({
      feedbackTypeOf: g,
      toolName: toolAnalyticsContext?.toolName,
      isMcp: toolAnalyticsContext?.isMcp ?? !1,
    }),
    le = KillAgentsConfirm(requestSource),
    V = Q(
      () =>
        options.map((opt) => {
          let { value: value, label: label, feedbackConfig: feedbackConfig } = opt;
          if (!feedbackConfig)
            return { label: label, value: value, description: opt.description, disabled: opt.disabled };
          let { type: type, placeholder: placeholder } = feedbackConfig,
            K = type === "accept" ? acceptInputMode : rejectInputMode,
            Ne = type === "accept" ? setAcceptFeedback : setRejectFeedback,
            defaultPlaceholder = DEFAULT_PLACEHOLDERS[type];
          if (K)
            return {
              type: "input",
              label: label,
              value: value,
              placeholder: placeholder ?? defaultPlaceholder,
              onChange: Ne,
              allowEmptySubmitToCancel: !0,
            };
          return { label: label, value: value, description: opt.description, disabled: opt.disabled };
        }),
      [options, acceptInputMode, rejectInputMode],
    ),
    X = ce(
      (value_0) => {
        let option = options.find((opt_1) => opt_1.value === value_0);
        if (!option || option.disabled) return;
        let feedbackConfig = option.feedbackConfig,
          de,
          oe = "";
        if (feedbackConfig) {
          if (((oe = (feedbackConfig.type === "accept" ? acceptFeedback : rejectFeedback).trim()), oe))
            de = oe;
        }
        if (onSelect(value_0, de) === !1) return !1;
        if (feedbackConfig) logSubmitted(feedbackConfig.type, oe);
      },
      [options, acceptFeedback, rejectFeedback, onSelect, logSubmitted],
    ),
    Y = Q(() => {
      let option_0 = options.find(
          (opt_2) =>
            (opt_2.feedbackConfig?.type === "accept" && acceptInputMode) ||
            (opt_2.feedbackConfig?.type === "reject" && rejectInputMode),
        ),
        U = {};
      for (let opt_3 of options)
        if (opt_3.keybinding)
          U[opt_3.keybinding] = () => (option_0 ? handleInputModeToggle(option_0.value) : X(opt_3.value));
      return U;
    }, [options, acceptInputMode, rejectInputMode, handleInputModeToggle, X]);
  MessageActionsKeybindings(Y, { context: "Confirmation" });
  let z = ce(() => {
    if (onCancel?.() === !1) return;
    logEscape();
  }, [onCancel, logEscape]);
  return r(Box, {
    flexDirection: "column",
    children: [
      typeof question === "string" ? e(Text, { children: question }) : question,
      e(ModelSelector, {
        selectedValue: NO_COMMITTED_ROW,
        options: V,
        defaultFocusValue: k,
        hideIndexes: hideIndexes,
        inlineDescriptions: !0,
        onChange: X,
        onCancel: z,
        onFocus: handleFocus,
        onInputModeToggle: handleInputModeToggle,
      }),
      e(Box, {
        marginTop: 1,
        children: e(Text, {
          dimColor: !0,
          wrap: le ? "truncate" : void 0,
          children: r(Byline, {
            children: [e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }), hintNode, le],
          }),
        }),
      }),
    ],
  });
}

export { incrementEscapeCount, PermissionPrompt };
