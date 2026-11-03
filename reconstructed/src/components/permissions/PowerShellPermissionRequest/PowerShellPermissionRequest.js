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
import { Q, y, R, P, ce } from "../../../../vendor/react/cjs/react.production.js";
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
var powershellRuleLabelPredicate = (h) => ruleMatchesTool(h, POWERSHELL_TOOL_NAME);
//@ chunk-18hwfzwa.js:1398594-1398690 sole-consumer
function parsePowerShellConsentSuggestions(h) {
  return parseConsentSuggestions(h, {
    displayedTypes: CONSENT_UPDATE_TYPES,
    labelPredicate: powershellRuleLabelPredicate,
    renderLabel: (x) => parseSuggestionRows(x, POWERSHELL_TOOL_NAME),
  });
}
//@ chunk-18hwfzwa.js:1398690-1399269 sole-consumer
/**
 * 把 PowerShell 权限选项转换为结果：yes、应用建议、编辑过的前缀规则、no（带反馈）。
 */
function powerShellChoiceToResult(h, payload, unaryEvent, L = {}) {
  switch (h) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: payload.input,
        ...(L.feedback && {
          feedback: L.feedback,
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
      let ee = directoryRow(L.editablePrefixSeed, L.editablePrefix, POWERSHELL_TOOL_NAME);
      if (ee === null)
        return {
          behavior: "allow",
          updatedInput: payload.input,
        };
      return {
        behavior: "allow",
        updatedInput: payload.input,
        permissionUpdates: ee.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(L.feedback && {
          feedback: L.feedback,
        }),
      };
  }
}
//@ chunk-18hwfzwa.js:1399269-1403401 fingerprint = PowerShellPermissionRequest (0.473)
/**
 * PowerShell 权限对话框（同 Bash 结构，选项来自 powershellToolUseOptions）。
 */
function PowerShellPermissionRequest({ payload, answer, wouldTakeAnswer }) {
  let L = figSpecRegistryByHost.of(useHost());
  let command = payload.command;
  let ke = payload.permissionResult.inPlaceOfClassifier === true;
  let toolName = Q(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]);
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
    initialFocusedType: ke ? "reject" : "accept",
  });
  let Dt = KillAgentsConfirm(payload.requestSource);
  let Lt = typeof payload.input.command !== "string" || payload.input.command.length > MAX_PAYLOAD_UNITS;
  let [oo, Xt] = y(() => (Lt ? undefined : safeDisplayText(command)));
  let [io, so] = y();
  let po = R(undefined);
  let ao = R(false);
  if (!ao.current) {
    ao.current = true;
    po.current = safeDisplayText(oo);
  }
  let hasUserEditedPrefix = R(false);
  P(() => {
    if (Lt) return;
    let cancelled = false;
    getCommandPrefixStatic(L, command, (element) => isAllowlistedCommand(element, element.text))
      .then((prefixes) => {
        if (cancelled || hasUserEditedPrefix.current) return;
        if (prefixes.length > 0) {
          let $n = safeDisplayText(`${prefixes[0]} *`);
          if ($n !== undefined) {
            po.current = $n;
            Xt($n);
            so($n);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [L, command, Lt]);
  let bo = ce((prefixes) => {
    hasUserEditedPrefix.current = true;
    Xt(prefixes);
  }, []);
  let { sandboxingEnabled, isSandboxed } = Q(() => {
    let Xo = SandboxManager.isSandboxingEnabled();
    let isSandboxed =
      Xo &&
      payload.requestSource?.type !== "remote-agent" &&
      shouldUseSandbox({
        command: typeof payload.input.command === "string" ? payload.input.command : command,
        dangerouslyDisableSandbox: payload.input.dangerouslyDisableSandbox === true,
        shellType: "powershell",
      });
    return {
      sandboxingEnabled: Xo,
      isSandboxed,
    };
  }, [command, payload.input, payload.requestSource]);
  let onEditablePrefixChange = Q(
    () =>
      serializeApprovalPayload(payload.input.command, {
        maxUnits: MAX_PAYLOAD_UNITS,
      }),
    [payload.input.command],
  );
  let Ho = onEditablePrefixChange.kind === "withheld" || typeof payload.input.command !== "string";
  let Io = CommandDisplay({
    commandDisplay: onEditablePrefixChange,
    description: payload.description,
    refinedPrefix: io,
  });
  let Wo = Ho || !Io.body.offersStanding;
  let isStandingHeld = Io.body.isStandingHeld;
  let Cn = Q(() => {
    if (Ho || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", false)) return null;
    let command_2 = typeof payload.input.command === "string" ? payload.input.command : command;
    return getDestructiveCommandWarning(command_2);
  }, [command, payload.input, Ho]);
  let No =
    findSafetyCheckReason(payload.permissionResult.decisionReason, (value) => !value.classifierApprovable) !==
    undefined;
  let vo =
    payload.isAskCappedByOrg ||
    ke ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource);
  let Yo = No || vo;
  let unaryEvent = Q(
    () =>
      Wo || vo
        ? null
        : parsePowerShellConsentSuggestions(
            No
              ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
              : payload.permissionResult.suggestions,
          ),
    [Wo, vo, No, payload.permissionResult.suggestions],
  );
  let options = Q(
    () =>
      powershellToolUseOptions({
        suggestionsRow: unaryEvent,
        hasBackendSuggestions: !Wo && !Yo && (payload.permissionResult.suggestions?.length ?? 0) > 0,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        editablePrefix: Wo || Yo ? undefined : oo,
        onEditablePrefixChange: bo,
      }),
    [unaryEvent, Wo, Yo, payload.permissionResult.suggestions, acceptInputMode, rejectInputMode, oo, bo],
  );
  let fieldLeftOpen = Io.fieldLeftOpen;
  let handleToggleDebug = Q(() => {
    let Xo = freezeOptionsAfterAnswer(options, fieldLeftOpen);
    return ke ? preferValueFirst(Xo, "no") : Xo;
  }, [options, fieldLeftOpen, ke]);
  let onChange = ce(
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
            editablePrefix: oo,
            editablePrefixSeed: po.current,
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
      oo,
      logSubmitted,
    ],
  );
  let onCancel = ce(() => {
    if (!wouldTakeAnswer()) return;
    logEscape();
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, logEscape]);
  return jsxProd_default(FittedBodyKeybindings, {
    fitted: Io,
    children: jsxProd_default_2(PermissionDialog_2, {
      title: sandboxingEnabled && !isSandboxed ? "PowerShell command (unsandboxed)" : "PowerShell command",
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: [
        jsxProd_default(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: jsxProd_default(Blockquote, {
            multiline: needsGutter(Io.description),
            children: jsxProd_default(Text, {
              dimColor: true,
              children: Io.description,
            }),
          }),
        }),
        jsxProd_default(CommandPreviewFrame, {
          commandDisplay: onEditablePrefixChange,
          fitted: Io,
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
              rowBudget: Io.isCut || ke ? MAX_EXPLANATION_LINES : undefined,
              rowColumns: Io.isCut ? Io.reasonColumns : undefined,
            }),
            Cn &&
              jsxProd_default(Box, {
                marginBottom: 1,
                children: jsxProd_default(Text, {
                  color: "warning",
                  children: Cn,
                }),
              }),
            jsxProd_default(Text, {
              children: "Do you want to proceed?",
            }),
            jsxProd_default(ModelSelector, {
              hideIndexes: ke,
              selectedValue: NO_COMMITTED_ROW,
              options: handleToggleDebug,
              inlineDescriptions: true,
              onChange,
              onCancel,
              onFocus: (Xo) => {
                Io.noteFocus(Xo);
                handleFocus(Xo);
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
            wrap: Dt ? "truncate" : undefined,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                }),
                hintNode,
                Dt,
              ],
            }),
          }),
        }),
      ],
    }),
  });
}
export { PowerShellPermissionRequest };
