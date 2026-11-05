/**
 * components/permissions/PermissionPrompt.tsx
 *
 * 通用权限选择提示：选项列表 + 可展开的反馈输入（"tell Claude what to do differently"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionPrompt.tsx
 * pieces: chunk-8prszgkd.js (5)
 * attribution: placement 2, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useSetAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { KillAgentsConfirm } from "../KillAgentsConfirm.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8prszgkd.js:30292-30296 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8prszgkd.js:30292", () => {
  init_react_production();
});
//@ chunk-8prszgkd.js:34717-34820 fingerprint (2.1.88 match: _temp, 1)
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
//@ chunk-8prszgkd.js:34887-36822 fingerprint (2.1.88 match: PermissionPrompt, 0.556)
/**
 * 反馈模式状态：在 accept/reject 选项上按 Tab 进入附加说明输入，记录 tengu_accept/reject_feedback_mode_entered/collapsed。
 */
function PermissionPrompt(props) {
  let $ = useMemoCache(35);
  let { feedbackTypeOf, toolName, isMcp, initialFocusedType } = props;
  let setAppState = useSetAppState();
  let setAppState_2 = useIsScreenReaderEnabled();
  let [acceptFeedback, setAcceptFeedback] = useState("");
  let [rejectFeedback, setRejectFeedback] = useState("");
  let [acceptInputMode, setAcceptInputMode] = useState(false);
  let [rejectInputMode, setRejectInputMode] = useState(false);
  let [acceptModeEntered, setAcceptModeEntered] = useState(false);
  let [rejectModeEntered, setRejectModeEntered] = useState(false);
  let [feedbackObj, setFeedback] = useState(undefined);
  let focusedType;
  if ($[0] !== feedbackTypeOf || $[1] !== feedbackObj || $[2] !== initialFocusedType) {
    focusedType = feedbackObj === undefined ? initialFocusedType : feedbackTypeOf(feedbackObj);
    $[0] = feedbackTypeOf;
    $[1] = feedbackObj;
    $[2] = initialFocusedType;
    $[3] = focusedType;
  } else focusedType = $[3];
  let focusedType_2 = focusedType;
  let handleInputModeToggle;
  if (
    $[4] !== acceptInputMode ||
    $[5] !== feedbackTypeOf ||
    $[6] !== isMcp ||
    $[7] !== rejectInputMode ||
    $[8] !== toolName
  ) {
    handleInputModeToggle = (opt_0) => {
      let type = feedbackTypeOf(opt_0);
      let analyticsProps = {
        toolName,
        isMcp,
      };
      if (type === "accept") {
        if (acceptInputMode) {
          setAcceptInputMode(false);
          logEvent("tengu_accept_feedback_mode_collapsed", analyticsProps);
        } else {
          setAcceptInputMode(true);
          setAcceptModeEntered(true);
          logEvent("tengu_accept_feedback_mode_entered", analyticsProps);
        }
      } else if (type === "reject") {
        if (rejectInputMode) {
          setRejectInputMode(false);
          logEvent("tengu_reject_feedback_mode_collapsed", analyticsProps);
        } else {
          setRejectInputMode(true);
          setRejectModeEntered(true);
          logEvent("tengu_reject_feedback_mode_entered", analyticsProps);
        }
      }
    };
    $[4] = acceptInputMode;
    $[5] = feedbackTypeOf;
    $[6] = isMcp;
    $[7] = rejectInputMode;
    $[8] = toolName;
    $[9] = handleInputModeToggle;
  } else handleInputModeToggle = $[9];
  let handleInputModeToggle_2 = handleInputModeToggle;
  let handleFocus;
  if (
    $[10] !== acceptFeedback ||
    $[11] !== acceptInputMode ||
    $[12] !== feedbackTypeOf ||
    $[13] !== rejectFeedback ||
    $[14] !== rejectInputMode
  ) {
    handleFocus = (value) => {
      let type = feedbackTypeOf(value);
      if (type !== "accept" && acceptInputMode && !acceptFeedback.trim()) setAcceptInputMode(false);
      if (type !== "reject" && rejectInputMode && !rejectFeedback.trim()) setRejectInputMode(false);
      setFeedback(value);
    };
    $[10] = acceptFeedback;
    $[11] = acceptInputMode;
    $[12] = feedbackTypeOf;
    $[13] = rejectFeedback;
    $[14] = rejectInputMode;
    $[15] = handleFocus;
  } else handleFocus = $[15];
  let handleFocus_2 = handleFocus;
  let logSubmitted;
  if ($[16] !== acceptModeEntered || $[17] !== isMcp || $[18] !== rejectModeEntered || $[19] !== toolName) {
    logSubmitted = (kind, instructions) => {
      logEvent(kind === "accept" ? "tengu_accept_submitted" : "tengu_reject_submitted", {
        toolName,
        isMcp,
        has_instructions: !!instructions,
        instructions_length: instructions?.length ?? 0,
        entered_feedback_mode: kind === "accept" ? acceptModeEntered : rejectModeEntered,
      });
    };
    $[16] = acceptModeEntered;
    $[17] = isMcp;
    $[18] = rejectModeEntered;
    $[19] = toolName;
    $[20] = logSubmitted;
  } else logSubmitted = $[20];
  let logSubmitted_2 = logSubmitted;
  let logEscape;
  if ($[21] !== setAppState) {
    logEscape = () => {
      logEvent("tengu_permission_request_escape", {});
      setAppState(incrementEscapeCount);
    };
    $[21] = setAppState;
    $[22] = logEscape;
  } else logEscape = $[22];
  let logEscape_2 = logEscape;
  let showHint =
    !setAppState_2 &&
    ((focusedType_2 === "accept" && !acceptInputMode) || (focusedType_2 === "reject" && !rejectInputMode));
  let hintNode;
  if ($[23] !== showHint) {
    hintNode =
      showHint &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: "amend",
      });
    $[23] = showHint;
    $[24] = hintNode;
  } else hintNode = $[24];
  let hintNode_2 = hintNode;
  let api;
  if (
    $[25] !== acceptFeedback ||
    $[26] !== acceptInputMode ||
    $[27] !== handleFocus_2 ||
    $[28] !== handleInputModeToggle_2 ||
    $[29] !== hintNode_2 ||
    $[30] !== logEscape_2 ||
    $[31] !== logSubmitted_2 ||
    $[32] !== rejectFeedback ||
    $[33] !== rejectInputMode
  ) {
    api = {
      acceptFeedback,
      rejectFeedback,
      setAcceptFeedback,
      setRejectFeedback,
      acceptInputMode,
      rejectInputMode,
      handleInputModeToggle: handleInputModeToggle_2,
      handleFocus: handleFocus_2,
      logSubmitted: logSubmitted_2,
      logEscape: logEscape_2,
      hintNode: hintNode_2,
    };
    $[25] = acceptFeedback;
    $[26] = acceptInputMode;
    $[27] = handleFocus_2;
    $[28] = handleInputModeToggle_2;
    $[29] = hintNode_2;
    $[30] = logEscape_2;
    $[31] = logSubmitted_2;
    $[32] = rejectFeedback;
    $[33] = rejectInputMode;
    $[34] = api;
  } else api = $[34];
  return api;
}
//@ chunk-8prszgkd.js:37422-37512 fingerprint (2.1.88 match: DEFAULT_PLACEHOLDERS, 1)
var DEFAULT_PLACEHOLDERS = {
  accept: "tell Claude what to do next",
  reject: "tell Claude what to do differently",
};
//@ chunk-8prszgkd.js:37512-39530 placement
/**
 * 权限选择提示：Select 列出选项，选中带 input 的选项时展开反馈输入框（默认占位 "tell Claude what to do differently"）；Esc 视为拒绝。
 */
function permissionChoicePrompt({
  options,
  onSelect,
  onCancel,
  question = "Do you want to proceed?",
  toolAnalyticsContext,
  defaultFocusValue,
  hideIndexes,
  requestSource,
  frameTitle,
  children,
  frameHints = [],
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
  } = PermissionPrompt({
    feedbackTypeOf,
    toolName: toolAnalyticsContext?.toolName,
    isMcp: toolAnalyticsContext?.isMcp ?? false,
  });
  let killAgentsConfirm = KillAgentsConfirm(requestSource);
  let options_2 = useMemo(
    () =>
      options.map((option) => {
        let { value: optionValue, label, feedbackConfig } = option;
        if (!feedbackConfig)
          return {
            label,
            value: optionValue,
            description: option.description,
            disabled: option.disabled,
          };
        let { type: feedbackKind, placeholder } = feedbackConfig;
        let isActiveInputMode = feedbackKind === "accept" ? acceptInputMode : rejectInputMode;
        let onChange = feedbackKind === "accept" ? setAcceptFeedback : setRejectFeedback;
        let defaultPlaceholder = DEFAULT_PLACEHOLDERS[feedbackKind];
        if (isActiveInputMode)
          return {
            type: "input",
            label,
            value: optionValue,
            placeholder: placeholder ?? defaultPlaceholder,
            onChange,
            allowEmptySubmitToCancel: true,
          };
        return {
          label,
          value: optionValue,
          description: option.description,
          disabled: option.disabled,
        };
      }),
    [options, acceptInputMode, rejectInputMode],
  );
  let onChange = useCallback(
    (value) => {
      let found = options.find((option) => option.value === value);
      if (!found || found.disabled) return;
      let feedbackConfig = found.feedbackConfig;
      let onSubmit;
      let typedFeedback = "";
      if (feedbackConfig) {
        typedFeedback = (feedbackConfig.type === "accept" ? acceptFeedback : rejectFeedback).trim();
        if (typedFeedback) onSubmit = typedFeedback;
      }
      if (onSelect(value, onSubmit) === false) return false;
      if (feedbackConfig) logSubmitted(feedbackConfig.type, typedFeedback);
    },
    [options, acceptFeedback, rejectFeedback, onSelect, logSubmitted],
  );
  let feedbackEffect = useMemo(() => {
    let found = options.find(
      (option) =>
        (option.feedbackConfig?.type === "accept" && acceptInputMode) ||
        (option.feedbackConfig?.type === "reject" && rejectInputMode),
    );
    let keybindingHandlers = {};
    for (let option of options)
      if (option.keybinding)
        keybindingHandlers[option.keybinding] = () =>
          found ? handleInputModeToggle(found.value) : onChange(option.value);
    return keybindingHandlers;
  }, [options, acceptInputMode, rejectInputMode, handleInputModeToggle, onChange]);
  MessageActionsKeybindings(feedbackEffect, {
    context: "Confirmation",
  });
  let onCancel_2 = useCallback(() => {
    if (onCancel?.() === false) return;
    logEscape();
  }, [onCancel, logEscape]);
  let selector = jsxProd_default(ModelSelector, {
    selectedValue: NO_COMMITTED_ROW,
    options: options_2,
    defaultFocusValue: selectedValue,
    hideIndexes,
    inlineDescriptions: true,
    onChange,
    onCancel: onCancel_2,
    onFocus: handleFocus,
    onInputModeToggle: handleInputModeToggle,
  });
  if (frameTitle !== undefined)
    return jsxProd_default_2(PermissionDialog_2, {
      title: frameTitle,
      requestSource,
      frame: {
        onCancel: onCancel_2,
        hints: [
          hintNode &&
            jsxProd_default(
              KeyboardShortcutHint,
              {
                chord: "tab",
                action: "amend",
                terse: true,
                format: {
                  keyCase: "lower",
                },
              },
              "amend",
            ),
          ...frameHints,
          killAgentsConfirm,
        ],
      },
      children: [children, selector],
    });
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      typeof question === "string"
        ? jsxProd_default(Text, {
            children: question,
          })
        : question,
      selector,
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
export { permissionChoicePrompt, PermissionPrompt };
