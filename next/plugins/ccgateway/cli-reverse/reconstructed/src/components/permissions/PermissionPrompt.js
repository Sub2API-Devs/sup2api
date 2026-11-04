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
import {
  init_react_production,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { useShellPermissionFeedback } from "./useShellPermissionFeedback.js";
import { KillAgentsConfirm } from "../KillAgentsConfirm.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0e8j1zzj.js:25579-25583 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0e8j1zzj.js:25579", () => {
  init_react_production();
});
//@ chunk-0e8j1zzj.js:25583-25686 fingerprint (2.1.88 match: _temp, 1)
/**
 * 把权限提示归因状态中的 Esc 次数加一。
 */
function incrementEscapeCount(prev) {
  return {
    ...prev,
    attribution: {
      ...prev.attribution,
      escapeCount: prev.attribution.escapeCount + 1,
    },
  };
}
//@ chunk-0e8j1zzj.js:28285-28375 fingerprint (2.1.88 match: DEFAULT_PLACEHOLDERS, 1)
var DEFAULT_PLACEHOLDERS = {
  accept: "tell Claude what to do next",
  reject: "tell Claude what to do differently",
};
//@ chunk-0e8j1zzj.js:28375-30168 fingerprint (2.1.88 match: PermissionPrompt, 0.469)
/**
 * 权限选择提示：Select 列出选项，选中带 input 的选项时展开反馈输入框（默认占位 "tell Claude what to do differently"）；Esc 视为拒绝。
 */
function PermissionPrompt({
  options,
  onSelect,
  onCancel,
  question = "Do you want to proceed?",
  toolAnalyticsContext,
  defaultFocusValue,
  hideIndexes,
  requestSource,
}) {
  let [selectedValue, setSelectedValue] = useState(defaultFocusValue);
  useEffect(() => {
    setSelectedValue(undefined);
  }, []);
  let feedbackTypeOf = useCallback(
    (feedbackTypeOf) => options.find((option) => option.value === feedbackTypeOf)?.feedbackConfig?.type,
    [options],
  );
  let {
    acceptFeedback,
    rejectFeedback,
    setAcceptFeedback,
    setRejectFeedback,
    acceptInputMode,
    rejectInputMode,
    handleInputModeToggle,
    handleFocus,
    logSubmitted,
    logEscape,
    hintNode,
  } = useShellPermissionFeedback({
    feedbackTypeOf,
    toolName: toolAnalyticsContext?.toolName,
    isMcp: toolAnalyticsContext?.isMcp ?? false,
  });
  let killAgentsConfirm = KillAgentsConfirm(requestSource);
  let options_2 = useMemo(
    () =>
      options.map((opt) => {
        let { value, label, feedbackConfig } = opt;
        if (!feedbackConfig)
          return {
            label,
            value,
            description: opt.description,
            disabled: opt.disabled,
          };
        let { type, placeholder } = feedbackConfig;
        let isInputMode = type === "accept" ? acceptInputMode : rejectInputMode;
        let onChange = type === "accept" ? setAcceptFeedback : setRejectFeedback;
        let defaultPlaceholder = DEFAULT_PLACEHOLDERS[type];
        if (isInputMode)
          return {
            type: "input",
            label,
            value,
            placeholder: placeholder ?? defaultPlaceholder,
            onChange,
            allowEmptySubmitToCancel: true,
          };
        return {
          label,
          value,
          description: opt.description,
          disabled: opt.disabled,
        };
      }),
    [options, acceptInputMode, rejectInputMode],
  );
  let onChange = useCallback(
    (value_0) => {
      let option = options.find((opt_1) => opt_1.value === value_0);
      if (!option || option.disabled) return;
      let feedbackConfig = option.feedbackConfig;
      let onSubmit;
      let typedFeedback = "";
      if (feedbackConfig) {
        typedFeedback = (feedbackConfig.type === "accept" ? acceptFeedback : rejectFeedback).trim();
        if (typedFeedback) onSubmit = typedFeedback;
      }
      if (onSelect(value_0, onSubmit) === false) return false;
      if (feedbackConfig) logSubmitted(feedbackConfig.type, typedFeedback);
    },
    [options, acceptFeedback, rejectFeedback, onSelect, logSubmitted],
  );
  let feedbackEffect = useMemo(() => {
    let option_0 = options.find(
      (opt_2) =>
        (opt_2.feedbackConfig?.type === "accept" && acceptInputMode) ||
        (opt_2.feedbackConfig?.type === "reject" && rejectInputMode),
    );
    let keybindingHandlers = {};
    for (let opt_3 of options)
      if (opt_3.keybinding)
        keybindingHandlers[opt_3.keybinding] = () =>
          option_0 ? handleInputModeToggle(option_0.value) : onChange(opt_3.value);
    return keybindingHandlers;
  }, [options, acceptInputMode, rejectInputMode, handleInputModeToggle, onChange]);
  MessageActionsKeybindings(feedbackEffect, {
    context: "Confirmation",
  });
  let onCancel_2 = useCallback(() => {
    if (onCancel?.() === false) return;
    logEscape();
  }, [onCancel, logEscape]);
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      typeof question === "string"
        ? jsxProd_default(Text, {
            children: question,
          })
        : question,
      jsxProd_default(ModelSelector, {
        selectedValue: NO_COMMITTED_ROW,
        options: options_2,
        defaultFocusValue: selectedValue,
        hideIndexes,
        inlineDescriptions: true,
        onChange,
        onCancel: onCancel_2,
        onFocus: handleFocus,
        onInputModeToggle: handleInputModeToggle,
      }),
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: killAgentsConfirm ? "truncate" : undefined,
          children: jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "cancel",
              }),
              hintNode,
              killAgentsConfirm,
            ],
          }),
        }),
      }),
    ],
  });
}
export { incrementEscapeCount, PermissionPrompt };
