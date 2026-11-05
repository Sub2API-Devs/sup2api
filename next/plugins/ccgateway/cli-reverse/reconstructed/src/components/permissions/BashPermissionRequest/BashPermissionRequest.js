/**
 * components/permissions/BashPermissionRequest/BashPermissionRequest.tsx
 *
 * Bash 工具权限请求：显示命令与说明、复合命令各子命令结果、规则建议（前缀/目录），选项"允许一次/不再询问/拒绝并反馈"。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/BashPermissionRequest/BashPermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (5), chunk-pc3qckdx.js (1)
 * attribution: sole-consumer 4, fingerprint 2
 */
import { WORKFLOW_HINT_TEXT, useSettingsErrors } from "../../../hooks/notifs/useSettingsErrors.js";
import { shouldShowAlwaysAllowOptions } from "../../../utils/permissions/permissionsLoader.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import {
  AUTO_MODE_ROW_LABELS,
  ruleMatchesTool,
  parseConsentSuggestions,
  CONSENT_UPDATE_TYPES,
  parseSuggestionRows,
  isConsentRow,
  directoryRow,
  safeDisplayText,
} from "../consentRows.js";
import { stripBashRedirections } from "./bashToolUseOptions.js";
import { figSpecRegistryByHost } from "../../../utils/Shell.js";
import { useHost } from "../../../context/session.js";
import {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "../../../../vendor/react/cjs/react.production.js";
import {
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  CommandDisplay,
  AUTO_MODE_TIP_TEXT,
  freezeOptionsAfterAnswer,
  isNotYesNo,
  AutoModeTip,
  FittedBodyKeybindings,
  CommandPreviewFrame,
  sandboxHostsSummary,
} from "./commandDisplay.js";
import { getRequestedMachineForPrompt } from "../../../bridge/deviceRegistration.js";
import { findSafetyCheckReason, isAskRuleDrivenReason } from "../../../utils/permissions/permissions.js";
import {
  isRemoteOrPluginAgent,
  filterAddDirectoriesUpdates,
  preferValueFirst,
} from "../../../utils/agentContext.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { PermissionPrompt } from "../PermissionPrompt.js";
import { ShowInIDEPrompt } from "../../ShowInIDEPrompt.js";
import { KillAgentsConfirm } from "../../KillAgentsConfirm.js";
import { extractRules } from "../../../utils/permissions/PermissionUpdate.js";
import {
  getSubcommandPrefix,
  getBareCommandPrefix,
  startsWithBareShell,
} from "../../../tools/BashTool/bashPermissions.js";
import {
  getCompoundCommandPrefixesStatic as getCompoundCommandPrefixesStatic_2,
  stripEnvVarPrefix,
} from "../../../utils/bash/prefix.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { getDestructiveTargetWarning } from "../../../tools/BashTool/destructiveTargets.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { shouldUseSandbox } from "../../../tools/BashTool/shouldUseSandbox.js";
import { useRefusableAnswer } from "../../../hooks/useRefusableAnswer.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { ASK_FIRST_REASON_TEXTS } from "../../../utils/permissions/askFirstReasons.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { getRemoteCaps } from "../../../remote/remoteMode.js";
import { CloudTasksDialog } from "../../tasks/CloudTasksDialog.js";
import { BackgroundTasksDialog } from "../../tasks/BackgroundTasksDialog.js";

//@ chunk-czq1j3j2.js:1348159-1349407 sole-consumer (2.1.88 match: powershellToolUseOptions, 0.838)
function powershellToolUseOptions_2({
  suggestionsRow = null,
  decisionReason,
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
  editablePrefix,
  onEditablePrefixChange,
  hasBackendSuggestions,
  showEnableAutoModeOption = false,
  enableAutoModeDescription = WORKFLOW_HINT_TEXT,
}) {
  let options = [];
  if (yesInputMode)
    options.push({
      type: "input",
      label: "Yes",
      value: "yes",
      placeholder: "and tell Claude what to do next",
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
    });
  else
    options.push({
      label: "Yes",
      value: "yes",
    });
  if (shouldShowAlwaysAllowOptions()) {
    let hasNonPowerShellSuggestions =
      suggestionsRow !== null &&
      suggestionsRow.applies.some(
        (update) =>
          update.type === "addDirectories" ||
          (update.type === "addRules" && update.rules.some((rule) => rule.toolName !== BASH_TOOL_NAME)),
      );
    if (
      editablePrefix !== undefined &&
      onEditablePrefixChange &&
      !hasNonPowerShellSuggestions &&
      (hasBackendSuggestions ?? suggestionsRow !== null)
    )
      options.push({
        type: "input",
        label: "Yes, and don\u2019t ask again for",
        value: "yes-prefix-edited",
        placeholder: "command prefix (e.g., npm run *)",
        initialValue: editablePrefix,
        onChange: onEditablePrefixChange,
        allowEmptySubmitToCancel: true,
        showLabelWithValue: true,
        labelValueSeparator: ": ",
        resetCursorOnUpdate: true,
      });
    else if (suggestionsRow !== null)
      options.push({
        label: suggestionsRow.node,
        value: "yes-apply-suggestions",
      });
  }
  if (showEnableAutoModeOption)
    options.push({
      label: AUTO_MODE_ROW_LABELS.workflow,
      description: enableAutoModeDescription,
      value: "yes-enable-auto-mode",
    });
  if (noInputMode)
    options.push({
      type: "input",
      label: "No",
      value: "no",
      placeholder: "and tell Claude what to do differently",
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
    });
  else
    options.push({
      label: "No",
      value: "no",
    });
  return options;
}
//@ chunk-czq1j3j2.js:1349407-1349434 sole-consumer
var bashRuleLabelPredicate = (rule) => ruleMatchesTool(rule, BASH_TOOL_NAME, stripBashRedirections);
//@ chunk-czq1j3j2.js:1349434-1349538 sole-consumer
/**
 * 把 Bash 权限建议解析为同意选项行（只显示特定更新类型，标签按 Bash 规则渲染并去掉重定向）。
 */
function parseBashConsentSuggestions(suggestions, options) {
  return parseConsentSuggestions(suggestions, {
    displayedTypes: CONSENT_UPDATE_TYPES,
    labelPredicate: bashRuleLabelPredicate,
    renderLabel: (suggestion) =>
      parseSuggestionRows(suggestion, BASH_TOOL_NAME, stripBashRedirections, options),
  });
}
//@ chunk-czq1j3j2.js:1349538-1350190 sole-consumer
/**
 * Bash 权限选项：允许一次；"Yes, and don't ask again for <前缀/命令>"（应用建议规则或编辑后的前缀）；可选开启 auto 模式；拒绝（可附反馈）。
 */
function buildAllowResult(choice, payload, selectedRow, extra = {}) {
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
      if (selectedRow === null || !isConsentRow(selectedRow))
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: selectedRow.applies,
      };
    }
    case "yes-prefix-edited": {
      let prefixRow = directoryRow(extra.editablePrefixSeed, extra.editablePrefix, BASH_TOOL_NAME);
      if (prefixRow === null)
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: prefixRow.applies,
      };
    }
    case "yes-enable-auto-mode":
      return {
        behavior: "allow",
        updatedInput: payload.input,
      };
    case "no":
      return {
        behavior: "deny",
        ...(extra.feedback && {
          feedback: extra.feedback,
        }),
      };
  }
}
//@ chunk-czq1j3j2.js:1350190-1355706 fingerprint (2.1.88 match: BashPermissionRequestInner, 0.375)
/**
 * Bash 权限对话框主体：显示命令（可编辑前缀）、说明、复合命令子结果、沙箱信息与规则解释；选项来自 bashToolUseOptions，反馈模式由 useShellPermissionFeedback 管理；accept/reject 时调用 onAllow/onReject 并可持久化规则。
 */
function BashPermissionRequestInner({ payload, answer, wouldTakeAnswer }) {
  let command = figSpecRegistryByHost.of(useHost());
  let command_2 = payload.command;
  let decisionReason = payload.permissionResult.decisionReason;
  let commandDisplay = useMemo(
    () =>
      serializeApprovalPayload(payload.input.command, {
        maxUnits: MAX_PAYLOAD_UNITS,
      }),
    [payload.input.command],
  );
  let isCommandWithheld = commandDisplay.kind === "withheld" || typeof payload.input.command !== "string";
  let [refinedPrefix, setRefinedPrefix] = useState();
  let toolPermissionContext = CommandDisplay({
    commandDisplay,
    description: payload.description,
    refinedPrefix,
  });
  let isStandingUnavailable = isCommandWithheld || !toolPermissionContext.body.offersStanding;
  let isStandingHeld = toolPermissionContext.body.isStandingHeld;
  let { requestedMachine, runsOnMachine } = useMemo(
    () => getRequestedMachineForPrompt(payload.input),
    [payload.input],
  );
  let hasNonApprovableCheck =
    findSafetyCheckReason(decisionReason, (safetyCheck) => !safetyCheck.classifierApprovable) !== undefined;
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let oneTimeOnly =
    payload.isAskCappedByOrg ||
    hideIndexes ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource);
  let noStanding = hasNonApprovableCheck || oneTimeOnly;
  let runsRemote = requestedMachine !== undefined;
  let suggestions = useMemo(
    () =>
      isCommandWithheld || oneTimeOnly
        ? null
        : parseBashConsentSuggestions(
            hasNonApprovableCheck
              ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
              : payload.permissionResult.suggestions,
            runsRemote ? (runsOnMachine ?? "the attached computer") : undefined,
          ),
    [
      isCommandWithheld,
      oneTimeOnly,
      hasNonApprovableCheck,
      payload.permissionResult.suggestions,
      runsRemote,
      runsOnMachine,
    ],
  );
  let suggestionsRow = isStandingUnavailable ? null : suggestions;
  let standingUnavailable =
    !noStanding && !isStandingUnavailable && runsOnMachine !== undefined && suggestionsRow === null;
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
  } = PermissionPrompt({
    feedbackTypeOf: ShowInIDEPrompt,
    toolName,
    isMcp: payload.isMcp,
    initialFocusedType: hideIndexes ? "reject" : "accept",
  });
  let killAgentsNotice = KillAgentsConfirm(payload.requestSource);
  let hasSubcommandResults = decisionReason?.type === "subcommandResults";
  let [editablePrefix, setEditablePrefix] = useState(() => {
    if (isCommandWithheld) return;
    if (hasSubcommandResults) {
      let backendBashRules = extractRules([...(suggestions?.applies ?? [])]).filter(
        (rule) => rule.toolName === BASH_TOOL_NAME && rule.ruleContent,
      );
      if (backendBashRules.length === 1) return safeDisplayText(backendBashRules[0].ruleContent);
      if (backendBashRules.length > 1) return;
    }
    let two = getSubcommandPrefix(command_2);
    if (two) return safeDisplayText(`${two} *`);
    let one = getBareCommandPrefix(command_2);
    if (one) return safeDisplayText(`${one} *`);
    return safeDisplayText(command_2);
  });
  let hasUserEditedPrefix = useRef(undefined);
  let seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    hasUserEditedPrefix.current = safeDisplayText(editablePrefix);
  }
  let userEditedRef = useRef(false);
  let onEditablePrefixChange = useCallback((value) => {
    userEditedRef.current = true;
    setEditablePrefix(value);
  }, []);
  useEffect(() => {
    if (hasSubcommandResults || isCommandWithheld) return;
    let cancelled = false;
    getCompoundCommandPrefixesStatic_2(command, command_2, () => false)
      .then(async (subcmd) => {
        if (cancelled || userEditedRef.current) return;
        if (subcmd.length === 0 || !subcmd[0]) return;
        let strippedCommand = await stripEnvVarPrefix(command_2, subcmd[0]);
        if (cancelled || userEditedRef.current) return;
        if (!startsWithBareShell(strippedCommand)) {
          let nextPrefix = safeDisplayText(`${subcmd[0]} *`);
          if (nextPrefix !== undefined) {
            hasUserEditedPrefix.current = nextPrefix;
            setEditablePrefix(nextPrefix);
            setRefinedPrefix(nextPrefix);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [command, command_2, hasSubcommandResults, isCommandWithheld]);
  let {
    destructiveWarning: destructiveWarning_0,
    sandboxingEnabled: sandboxingEnabled_0,
    isSandboxed: isSandboxed_0,
  } = useMemo(() => {
    let commandText = typeof payload.input.command === "string" ? payload.input.command : command_2;
    let destructiveWarning =
      !isCommandWithheld && getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", false)
        ? getDestructiveTargetWarning(commandText)
        : null;
    let sandboxingEnabled = SandboxManager.isSandboxingEnabled();
    let isSandboxed =
      sandboxingEnabled &&
      payload.requestSource?.type !== "remote-agent" &&
      typeof payload.input.command === "string" &&
      requestedMachine === undefined &&
      shouldUseSandbox(payload.input);
    return {
      destructiveWarning,
      sandboxingEnabled,
      isSandboxed,
    };
  }, [command_2, payload.input, payload.requestSource, isCommandWithheld, requestedMachine]);
  let { offered, canOfferAutoMode, enableAutoMode } = useSettingsErrors(payload.requestSource);
  let isAskRuleDriven =
    isAskRuleDrivenReason(decisionReason) ||
    payload.permissionResult.matchedAskRule?.ruleBehavior === "ask" ||
    decisionReason?.type === "hook";
  let showAutoModeOption = canOfferAutoMode && !isAskRuleDriven;
  let unaryEvent = useMemo(
    () =>
      powershellToolUseOptions_2({
        suggestionsRow,
        hasBackendSuggestions:
          !isStandingUnavailable &&
          !noStanding &&
          !runsRemote &&
          (payload.permissionResult.suggestions?.length ?? 0) > 0,
        decisionReason,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        editablePrefix: isStandingUnavailable || noStanding || runsRemote ? undefined : editablePrefix,
        onEditablePrefixChange,
        showEnableAutoModeOption: !isStandingUnavailable && !noStanding && !runsRemote && showAutoModeOption,
        enableAutoModeDescription: !offered ? AUTO_MODE_TIP_TEXT : undefined,
      }),
    [
      suggestionsRow,
      isStandingUnavailable,
      noStanding,
      runsRemote,
      payload.permissionResult.suggestions,
      decisionReason,
      acceptInputMode,
      rejectInputMode,
      editablePrefix,
      onEditablePrefixChange,
      offered,
      showAutoModeOption,
    ],
  );
  let existingAllowDescriptions = useMemo(
    () => (hideIndexes ? preferValueFirst(unaryEvent, "no") : unaryEvent),
    [hideIndexes, unaryEvent],
  );
  let fieldLeftOpen = toolPermissionContext.fieldLeftOpen;
  let options = useMemo(
    () => freezeOptionsAfterAnswer(existingAllowDescriptions, fieldLeftOpen),
    [existingAllowDescriptions, fieldLeftOpen],
  );
  let refusableAnswer = useRefusableAnswer(
    useCallback(
      (prev) => {
        if (!wouldTakeAnswer() || (isStandingHeld && isNotYesNo(prev))) return false;
        logEvent("tengu_permission_request_option_selected", {
          option_index: existingAllowDescriptions.findIndex((value_0) => value_0.value === prev) + 1,
        });
        if (prev === "yes") {
          let trimmedPrefix = acceptFeedback.trim();
          logSubmitted("accept", trimmedPrefix);
          answer(
            buildAllowResult("yes", payload, suggestionsRow, {
              feedback: trimmedPrefix || undefined,
            }),
          );
          return;
        }
        if (prev === "no") {
          let trimmedDescription = rejectFeedback.trim();
          logSubmitted("reject", trimmedDescription);
          answer(
            buildAllowResult("no", payload, suggestionsRow, {
              feedback: trimmedDescription || undefined,
            }),
          );
          return;
        }
        if (prev === "yes-prefix-edited") {
          answer(
            buildAllowResult("yes-prefix-edited", payload, suggestionsRow, {
              editablePrefix,
              editablePrefixSeed: hasUserEditedPrefix.current,
            }),
          );
          return;
        }
        if (prev === "yes-enable-auto-mode") {
          enableAutoMode(!offered ? "bash_permission_prompt_upsell" : "workflow_permission_prompt");
          answer(buildAllowResult("yes", payload, suggestionsRow));
          return;
        }
        answer(buildAllowResult(prev, payload, suggestionsRow));
      },
      [
        answer,
        wouldTakeAnswer,
        isStandingHeld,
        payload,
        suggestionsRow,
        acceptFeedback,
        rejectFeedback,
        editablePrefix,
        logSubmitted,
        enableAutoMode,
        offered,
        existingAllowDescriptions,
      ],
    ),
  );
  let defaultFocusValue =
    refusableAnswer.refused === null
      ? undefined
      : refusableAnswer.refused === "yes" && !hideIndexes
        ? "yes"
        : "no";
  let onCancel = useCallback(() => {
    if (!wouldTakeAnswer()) return;
    logEscape();
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, logEscape]);
  let subtitle = useMemo(
    () =>
      showAutoModeOption && !isStandingUnavailable && !noStanding && !runsRemote
        ? jsxProd_default(AutoModeTip, {})
        : undefined,
    [showAutoModeOption, isStandingUnavailable, noStanding, runsRemote],
  );
  let runLabel =
    runsOnMachine !== undefined
      ? `runs on ${runsOnMachine}`
      : sandboxingEnabled_0 && !isSandboxed_0
        ? "unsandboxed"
        : undefined;
  let inset = toolPermissionContext.isFitted ? 0 : 1;
  return jsxProd_default(FittedBodyKeybindings, {
    fitted: toolPermissionContext,
    children: jsxProd_default_2(PermissionDialog_2, {
      title: toolPermissionContext.isFitted
        ? "Run command"
        : runLabel === undefined
          ? "Bash command"
          : `Bash command (${runLabel})`,
      subtitle,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      frame: toolPermissionContext.isFitted
        ? {
            onCancel,
            titleSuffix: runLabel,
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
              killAgentsNotice,
            ],
          }
        : undefined,
      children: [
        jsxProd_default(Box, {
          flexDirection: "column",
          paddingX: inset,
          children: jsxProd_default(Blockquote, {
            multiline: needsGutter(toolPermissionContext.description),
            children: jsxProd_default(Text, {
              dimColor: true,
              children: toolPermissionContext.description,
            }),
          }),
        }),
        jsxProd_default(CommandPreviewFrame, {
          commandDisplay,
          fitted: toolPermissionContext,
          inset,
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          paddingX: inset,
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
              rowBudget: toolPermissionContext.isCut || hideIndexes ? MAX_EXPLANATION_LINES : undefined,
              rowColumns: toolPermissionContext.isCut ? toolPermissionContext.reasonColumns : undefined,
              framed: toolPermissionContext.isFitted,
            }),
            destructiveWarning_0 &&
              jsxProd_default(Box, {
                marginBottom: 1,
                children: jsxProd_default(Text, {
                  color: "warning",
                  children: destructiveWarning_0,
                }),
              }),
            !toolPermissionContext.isFitted &&
              jsxProd_default(Text, {
                children: "Do you want to proceed?",
              }),
            standingUnavailable &&
              jsxProd_default(Text, {
                dimColor: true,
                children: ASK_FIRST_REASON_TEXTS["card.standing_unavailable"]({
                  name: runsOnMachine,
                  kind: "command",
                }),
              }),
            jsxProd_default(
              ModelSelector,
              {
                defaultFocusValue,
                hideIndexes,
                selectedValue: NO_COMMITTED_ROW,
                options,
                inlineDescriptions: true,
                onChange: (choice) =>
                  isStandingHeld && isNotYesNo(choice) ? false : refusableAnswer.answer(choice),
                onCancel,
                onFocus: (choice) => {
                  toolPermissionContext.noteFocus(choice);
                  handleFocus(choice);
                },
                onInputModeToggle: handleInputModeToggle,
              },
              refusableAnswer.attempts,
            ),
          ],
        }),
        !toolPermissionContext.isFitted &&
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
//@ chunk-pc3qckdx.js:19147-19407 fingerprint (2.1.88 match: BashPermissionRequest, 0.312)
/**
 * /tasks 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
async function BashPermissionRequest(onDone, context) {
  if (getRemoteCaps())
    return jsxProd_default(CloudTasksDialog, {
      onDone,
    });
  return jsxProd_default(BackgroundTasksDialog, {
    storageV5: context.storageV5,
    session: context.session,
    messageQueue: context.messageQueue,
    tools: context.options.tools,
    commands: context.options.commands,
    verbose: context.options.verbose,
    onDone,
    promptVisibleBelow: context.isMidTurn === true,
  });
}
export { BashPermissionRequestInner, BashPermissionRequest };
