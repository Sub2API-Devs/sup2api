/**
 * components/permissions/PowerShellPermissionRequest/PowerShellPermissionRequest.tsx
 *
 * PowerShell 工具权限请求（与 Bash 类似）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PowerShellPermissionRequest/PowerShellPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: sole-consumer 3, fingerprint 1
 */
import {
  ruleMatchesTool,
  parseConsentSuggestions,
  CONSENT_UPDATE_TYPES,
  parseSuggestionRows,
  isConsentRow,
  directoryRow,
  safeDisplayText,
} from "../consentRows.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { figSpecRegistryByHost } from "../../../utils/Shell.js";
import { useHost } from "../../../context/session.js";
import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "../../../../vendor/react/cjs/react.production.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { useShellPermissionFeedback } from "../useShellPermissionFeedback.js";
import { ShowInIDEPrompt } from "../../ShowInIDEPrompt.js";
import { KillAgentsConfirm } from "../../KillAgentsConfirm.js";
import {
  MAX_PAYLOAD_UNITS,
  serializeApprovalPayload,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { getCommandPrefixStatic } from "../../../utils/powershell/staticPrefix.js";
import { isAllowlistedCommand } from "../../../tools/PowerShellTool/readOnlyValidation.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { shouldUseSandbox } from "../../../tools/BashTool/shouldUseSandbox.js";
import {
  CommandDisplay,
  freezeOptionsAfterAnswer,
  isNotYesNo,
  FittedBodyKeybindings,
  CommandPreviewFrame,
  sandboxHostsSummary,
} from "../BashPermissionRequest/commandDisplay.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { getDestructiveCommandWarning } from "../../../tools/PowerShellTool/destructiveCommandWarning.js";
import { findSafetyCheckReason } from "../../../utils/permissions/permissions.js";
import {
  isRemoteOrPluginAgent,
  filterAddDirectoriesUpdates,
  preferValueFirst,
} from "../../../utils/agentContext.js";
import { powershellToolUseOptions } from "./powershellToolUseOptions.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";

//@ chunk-18hwfzwa.js:1398571-1398594 sole-consumer
var powershellRuleLabelPredicate = (rule) => ruleMatchesTool(rule, POWERSHELL_TOOL_NAME);
//@ chunk-18hwfzwa.js:1398594-1398690 sole-consumer
function parsePowerShellConsentSuggestions(suggestions) {
  return parseConsentSuggestions(suggestions, {
    displayedTypes: CONSENT_UPDATE_TYPES,
    labelPredicate: powershellRuleLabelPredicate,
    renderLabel: (suggestion) => parseSuggestionRows(suggestion, POWERSHELL_TOOL_NAME),
  });
}
//@ chunk-18hwfzwa.js:1398690-1399269 sole-consumer
/**
 * 把 PowerShell 权限选项转换为结果：yes、应用建议、编辑过的前缀规则、no（带反馈）。
 */
function powerShellChoiceToResult(choice, payload, unaryEvent, extra = {}) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(extra.feedback && {
          feedback: extra.feedback,
        }),
      };
    case "yes-apply-suggestions": {
      if (unaryEvent === null || !isConsentRow(unaryEvent))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: unaryEvent.applies,
      };
    }
    case "yes-prefix-edited": {
      let dirRow = directoryRow(extra.editablePrefixSeed, extra.editablePrefix, POWERSHELL_TOOL_NAME);
      if (dirRow === null)
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: dirRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(extra.feedback && {
          feedback: extra.feedback,
        }),
      };
  }
}
//@ chunk-18hwfzwa.js:1399269-1403401 fingerprint = PowerShellPermissionRequest (0.473)
/**
 * PowerShell 权限对话框（同 Bash 结构，选项来自 powershellToolUseOptions）。
 */
function PowerShellPermissionRequest({ payload, answer, wouldTakeAnswer }) {
  let shellSpec = figSpecRegistryByHost.of(useHost());
  let command = payload.command;
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let toolName = useMemo(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]);
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
    feedbackTypeOf: ShowInIDEPrompt,
    toolName,
    isMcp: payload.isMcp,
    initialFocusedType: hideIndexes ? "reject" : "accept",
  });
  let killAgentsNotice = KillAgentsConfirm(payload.requestSource);
  let isCommandWithheld =
    typeof payload.input.command !== "string" || payload.input.command.length > MAX_PAYLOAD_UNITS;
  let [editablePrefix, setEditablePrefix] = useState(() =>
    isCommandWithheld ? undefined : safeDisplayText(command),
  );
  let [refinedPrefix, setRefinedPrefix] = useState();
  let seedPrefix = useRef(undefined);
  let seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    seedPrefix.current = safeDisplayText(editablePrefix);
  }
  let hasUserEditedPrefix = useRef(false);
  useEffect(() => {
    if (isCommandWithheld) return;
    let cancelled = false;
    getCommandPrefixStatic(shellSpec, command, (element) => isAllowlistedCommand(element, element.text))
      .then((prefixes) => {
        if (cancelled || hasUserEditedPrefix.current) return;
        if (prefixes.length > 0) {
          let nextPrefix = safeDisplayText(`${prefixes[0]} *`);
          if (nextPrefix !== undefined) {
            seedPrefix.current = nextPrefix;
            setEditablePrefix(nextPrefix);
            setRefinedPrefix(nextPrefix);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shellSpec, command, isCommandWithheld]);
  let onEditablePrefixChange = useCallback((prefixes) => {
    hasUserEditedPrefix.current = true;
    setEditablePrefix(prefixes);
  }, []);
  let { sandboxingEnabled, isSandboxed } = useMemo(() => {
    let sandboxOn = SandboxManager.isSandboxingEnabled();
    let isSandboxed =
      sandboxOn &&
      payload.requestSource?.type !== "remote-agent" &&
      shouldUseSandbox({
        command: typeof payload.input.command === "string" ? payload.input.command : command,
        dangerouslyDisableSandbox: payload.input.dangerouslyDisableSandbox === true,
        shellType: "powershell",
      });
    return {
      sandboxingEnabled: sandboxOn,
      isSandboxed,
    };
  }, [command, payload.input, payload.requestSource]);
  let onEditablePrefixChange_2 = useMemo(
    () =>
      serializeApprovalPayload(payload.input.command, {
        maxUnits: MAX_PAYLOAD_UNITS,
      }),
    [payload.input.command],
  );
  let isCommandWithheld_2 =
    onEditablePrefixChange_2.kind === "withheld" || typeof payload.input.command !== "string";
  let display = CommandDisplay({
    commandDisplay: onEditablePrefixChange_2,
    description: payload.description,
    refinedPrefix,
  });
  let standingUnavailable = isCommandWithheld_2 || !display.body.offersStanding;
  let isStandingHeld = display.body.isStandingHeld;
  let destructiveWarning = useMemo(() => {
    if (
      isCommandWithheld_2 ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", false)
    )
      return null;
    let command_2 = typeof payload.input.command === "string" ? payload.input.command : command;
    return getDestructiveCommandWarning(command_2);
  }, [command, payload.input, isCommandWithheld_2]);
  let hasSafetyCheck =
    findSafetyCheckReason(payload.permissionResult.decisionReason, (value) => !value.classifierApprovable) !==
    undefined;
  let noStanding =
    payload.isAskCappedByOrg ||
    hideIndexes ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource);
  let noStanding_2 = hasSafetyCheck || noStanding;
  let unaryEvent = useMemo(
    () =>
      standingUnavailable || noStanding
        ? null
        : parsePowerShellConsentSuggestions(
            hasSafetyCheck
              ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
              : payload.permissionResult.suggestions,
          ),
    [standingUnavailable, noStanding, hasSafetyCheck, payload.permissionResult.suggestions],
  );
  let options = useMemo(
    () =>
      powershellToolUseOptions({
        suggestionsRow: unaryEvent,
        hasBackendSuggestions:
          !standingUnavailable && !noStanding_2 && (payload.permissionResult.suggestions?.length ?? 0) > 0,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        editablePrefix: standingUnavailable || noStanding_2 ? undefined : editablePrefix,
        onEditablePrefixChange,
      }),
    [
      unaryEvent,
      standingUnavailable,
      noStanding_2,
      payload.permissionResult.suggestions,
      acceptInputMode,
      rejectInputMode,
      editablePrefix,
      onEditablePrefixChange,
    ],
  );
  let fieldLeftOpen = display.fieldLeftOpen;
  let handleToggleDebug = useMemo(() => {
    let frozenOptions = freezeOptionsAfterAnswer(options, fieldLeftOpen);
    return hideIndexes ? preferValueFirst(frozenOptions, "no") : frozenOptions;
  }, [options, fieldLeftOpen, hideIndexes]);
  let onChange = useCallback(
    (prev) => {
      if (!wouldTakeAnswer() || (isStandingHeld && isNotYesNo(prev))) return false;
      logEvent("tengu_permission_request_option_selected", {
        option_index: {
          yes: 1,
          "yes-apply-suggestions": 2,
          "yes-prefix-edited": 2,
          no: 3,
        }[prev],
      });
      if (prev === "yes") {
        let trimmedPrefix = acceptFeedback.trim();
        logSubmitted("accept", trimmedPrefix);
        answer(
          powerShellChoiceToResult("yes", payload, unaryEvent, {
            feedback: trimmedPrefix || undefined,
          }),
        );
        return;
      }
      if (prev === "no") {
        let trimmedFeedback = rejectFeedback.trim();
        logSubmitted("reject", trimmedFeedback);
        answer(
          powerShellChoiceToResult("no", payload, unaryEvent, {
            feedback: trimmedFeedback || undefined,
          }),
        );
        return;
      }
      if (prev === "yes-prefix-edited") {
        answer(
          powerShellChoiceToResult("yes-prefix-edited", payload, unaryEvent, {
            editablePrefix,
            editablePrefixSeed: seedPrefix.current,
          }),
        );
        return;
      }
      answer(powerShellChoiceToResult(prev, payload, unaryEvent));
    },
    [
      answer,
      wouldTakeAnswer,
      isStandingHeld,
      payload,
      unaryEvent,
      acceptFeedback,
      rejectFeedback,
      editablePrefix,
      logSubmitted,
    ],
  );
  let onCancel = useCallback(() => {
    if (!wouldTakeAnswer()) return;
    logEscape();
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, logEscape]);
  return jsxProd_default(FittedBodyKeybindings, {
    fitted: display,
    children: jsxProd_default_2(PermissionDialog_2, {
      title: sandboxingEnabled && !isSandboxed ? "PowerShell command (unsandboxed)" : "PowerShell command",
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: [
        jsxProd_default(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: jsxProd_default(Blockquote, {
            multiline: needsGutter(display.description),
            children: jsxProd_default(Text, {
              dimColor: true,
              children: display.description,
            }),
          }),
        }),
        jsxProd_default(CommandPreviewFrame, {
          commandDisplay: onEditablePrefixChange_2,
          fitted: display,
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: [
            payload.networkAllowHosts !== undefined &&
              payload.networkAllowHosts.length > 0 &&
              jsxProd_default(Box, {
                marginBottom: 1,
                children: jsxProd_default(sandboxHostsSummary, {
                  hosts: payload.networkAllowHosts,
                }),
              }),
            jsxProd_default(PermissionRuleExplanation, {
              permissionResult: payload.permissionResult,
              toolType: "command",
              rowBudget: display.isCut || hideIndexes ? MAX_EXPLANATION_LINES : undefined,
              rowColumns: display.isCut ? display.reasonColumns : undefined,
            }),
            destructiveWarning &&
              jsxProd_default(Box, {
                marginBottom: 1,
                children: jsxProd_default(Text, {
                  color: "warning",
                  children: destructiveWarning,
                }),
              }),
            jsxProd_default(Text, {
              children: "Do you want to proceed?",
            }),
            jsxProd_default(ModelSelector, {
              hideIndexes,
              selectedValue: NO_COMMITTED_ROW,
              options: handleToggleDebug,
              inlineDescriptions: true,
              onChange,
              onCancel,
              onFocus: (choice) => {
                display.noteFocus(choice);
                handleFocus(choice);
              },
              onInputModeToggle: handleInputModeToggle,
            }),
          ],
        }),
        jsxProd_default(Box, {
          justifyContent: "space-between",
          marginTop: 1,
          paddingX: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: killAgentsNotice ? "truncate" : undefined,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                }),
                hintNode,
                killAgentsNotice,
              ],
            }),
          }),
        }),
      ],
    }),
  });
}
export { PowerShellPermissionRequest };
