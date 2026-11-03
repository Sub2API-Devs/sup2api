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
import { Opn } from "../../../utils/Shell.js";
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
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";

//@ chunk-18hwfzwa.js:1398571-1398594 sole-consumer
var i0o = (h) => ruleMatchesTool(h, POWERSHELL_TOOL_NAME);
//@ chunk-18hwfzwa.js:1398594-1398690 sole-consumer
function a0o(h) {
  return parseConsentSuggestions(h, {
    displayedTypes: CONSENT_UPDATE_TYPES,
    labelPredicate: i0o,
    renderLabel: (x) => parseSuggestionRows(x, POWERSHELL_TOOL_NAME),
  });
}
/**
 * 把 PowerShell 权限选项转换为结果：yes、应用建议、编辑过的前缀规则、no（带反馈）。
 */
//@ chunk-18hwfzwa.js:1398690-1399269 sole-consumer
function powerShellChoiceToResult(h, x, D, L = {}) {
  switch (h) {
    case "yes":
      return { behavior: "allow", updatedInput: x.input, ...(L.feedback && { feedback: L.feedback }) };
    case "yes-apply-suggestions": {
      if (D === null || !isConsentRow(D)) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: D.applies };
    }
    case "yes-prefix-edited": {
      let ee = directoryRow(L.editablePrefixSeed, L.editablePrefix, POWERSHELL_TOOL_NAME);
      if (ee === null) return { behavior: "allow", updatedInput: x.input };
      return { behavior: "allow", updatedInput: x.input, permissionUpdates: ee.applies };
    }
    case "no":
      return { behavior: "deny", ...(L.feedback && { feedback: L.feedback }) };
  }
}
/**
 * PowerShell 权限对话框（同 Bash 结构，选项来自 powershellToolUseOptions）。
 */
//@ chunk-18hwfzwa.js:1399269-1403401 fingerprint = PowerShellPermissionRequest (0.473)
function PowerShellPermissionRequest({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) {
  let of = Opn.of(useHost()),
    command = payload.command,
    ke = payload.permissionResult.inPlaceOfClassifier === !0,
    Re = Q(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]),
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
      feedbackTypeOf: ShowInIDEPrompt,
      toolName: Re,
      isMcp: payload.isMcp,
      initialFocusedType: ke ? "reject" : "accept",
    }),
    Dt = KillAgentsConfirm(payload.requestSource),
    Lt = typeof payload.input.command !== "string" || payload.input.command.length > MAX_PAYLOAD_UNITS,
    [oo, Xt] = y(() => (Lt ? void 0 : safeDisplayText(command))),
    [io, so] = y(),
    po = R(void 0),
    ao = R(!1);
  if (!ao.current) ((ao.current = !0), (po.current = safeDisplayText(oo)));
  let hasUserEditedPrefix = R(!1);
  P(() => {
    if (Lt) return;
    let Xo = !1;
    return (
      getCommandPrefixStatic(of, command, (Sn) => isAllowlistedCommand(Sn, Sn.text))
        .then((element) => {
          if (Xo || hasUserEditedPrefix.current) return;
          if (element.length > 0) {
            let $n = safeDisplayText(`${element[0]} *`);
            if ($n !== void 0) ((po.current = $n), Xt($n), so($n));
          }
        })
        .catch(() => {}),
      () => {
        Xo = !0;
      }
    );
  }, [of, command, Lt]);
  let bo = ce((prefixes) => {
      ((hasUserEditedPrefix.current = !0), Xt(prefixes));
    }, []),
    { sandboxingEnabled: sandboxingEnabled, isSandboxed: isSandboxed } = Q(() => {
      let isSandboxingEnabled = SandboxManager.isSandboxingEnabled(),
        Sn =
          isSandboxingEnabled &&
          payload.requestSource?.type !== "remote-agent" &&
          shouldUseSandbox({
            command: typeof payload.input.command === "string" ? payload.input.command : command,
            dangerouslyDisableSandbox: payload.input.dangerouslyDisableSandbox === !0,
            shellType: "powershell",
          });
      return { sandboxingEnabled: isSandboxingEnabled, isSandboxed: Sn };
    }, [command, payload.input, payload.requestSource]),
    onEditablePrefixChange = Q(
      () => serializeApprovalPayload(payload.input.command, { maxUnits: MAX_PAYLOAD_UNITS }),
      [payload.input.command],
    ),
    Ho = onEditablePrefixChange.kind === "withheld" || typeof payload.input.command !== "string",
    Io = CommandDisplay({
      commandDisplay: onEditablePrefixChange,
      description: payload.description,
      refinedPrefix: io,
    }),
    Wo = Ho || !Io.body.offersStanding,
    isStandingHeld = Io.body.isStandingHeld,
    Cn = Q(() => {
      if (Ho || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", !1)) return null;
      let Xo = typeof payload.input.command === "string" ? payload.input.command : command;
      return getDestructiveCommandWarning(Xo);
    }, [command, payload.input, Ho]),
    No =
      findSafetyCheckReason(
        payload.permissionResult.decisionReason,
        (value) => !value.classifierApprovable,
      ) !== void 0,
    vo =
      payload.isAskCappedByOrg ||
      ke ||
      payload.permissionResult.oneTimeAnswersOnly === !0 ||
      isRemoteOrPluginAgent(payload.requestSource),
    Yo = No || vo,
    unaryEvent = Q(
      () =>
        Wo || vo
          ? null
          : a0o(
              No
                ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
                : payload.permissionResult.suggestions,
            ),
      [Wo, vo, No, payload.permissionResult.suggestions],
    ),
    options = Q(
      () =>
        powershellToolUseOptions({
          suggestionsRow: unaryEvent,
          hasBackendSuggestions: !Wo && !Yo && (payload.permissionResult.suggestions?.length ?? 0) > 0,
          onRejectFeedbackChange: setRejectFeedback,
          onAcceptFeedbackChange: setAcceptFeedback,
          yesInputMode: acceptInputMode,
          noInputMode: rejectInputMode,
          editablePrefix: Wo || Yo ? void 0 : oo,
          onEditablePrefixChange: bo,
        }),
      [unaryEvent, Wo, Yo, payload.permissionResult.suggestions, acceptInputMode, rejectInputMode, oo, bo],
    ),
    fieldLeftOpen = Io.fieldLeftOpen,
    handleToggleDebug = Q(() => {
      let Xo = freezeOptionsAfterAnswer(options, fieldLeftOpen);
      return ke ? preferValueFirst(Xo, "no") : Xo;
    }, [options, fieldLeftOpen, ke]),
    hn = ce(
      (prev) => {
        if (!wouldTakeAnswer() || (isStandingHeld && isNotYesNo(prev))) return !1;
        if (
          (logEvent("tengu_permission_request_option_selected", {
            option_index: { yes: 1, "yes-apply-suggestions": 2, "yes-prefix-edited": 2, no: 3 }[prev],
          }),
          prev === "yes")
        ) {
          let trimmedPrefix = acceptFeedback.trim();
          (logSubmitted("accept", trimmedPrefix),
            answer(
              powerShellChoiceToResult("yes", payload, unaryEvent, { feedback: trimmedPrefix || void 0 }),
            ));
          return;
        }
        if (prev === "no") {
          let trimmedFeedback = rejectFeedback.trim();
          (logSubmitted("reject", trimmedFeedback),
            answer(
              powerShellChoiceToResult("no", payload, unaryEvent, { feedback: trimmedFeedback || void 0 }),
            ));
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
    ),
    Mn = ce(() => {
      if (!wouldTakeAnswer()) return;
      (logEscape(), answer({ behavior: "deny" }));
    }, [answer, wouldTakeAnswer, logEscape]);
  return e(FittedBodyKeybindings, {
    fitted: Io,
    children: r(PermissionDialog_2, {
      title: sandboxingEnabled && !isSandboxed ? "PowerShell command (unsandboxed)" : "PowerShell command",
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      children: [
        e(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: e(Blockquote, {
            multiline: needsGutter(Io.description),
            children: e(Text, { dimColor: !0, children: Io.description }),
          }),
        }),
        e(CommandPreviewFrame, { commandDisplay: onEditablePrefixChange, fitted: Io }),
        r(Box, {
          flexDirection: "column",
          paddingX: 1,
          children: [
            payload.networkAllowHosts !== void 0 &&
              payload.networkAllowHosts.length > 0 &&
              e(Box, {
                marginBottom: 1,
                children: e(sandboxHostsSummary, { hosts: payload.networkAllowHosts }),
              }),
            e(PermissionRuleExplanation, {
              permissionResult: payload.permissionResult,
              toolType: "command",
              rowBudget: Io.isCut || ke ? MAX_EXPLANATION_LINES : void 0,
              rowColumns: Io.isCut ? Io.reasonColumns : void 0,
            }),
            Cn && e(Box, { marginBottom: 1, children: e(Text, { color: "warning", children: Cn }) }),
            e(Text, { children: "Do you want to proceed?" }),
            e(ModelSelector, {
              hideIndexes: ke,
              selectedValue: NO_COMMITTED_ROW,
              options: handleToggleDebug,
              inlineDescriptions: !0,
              onChange: hn,
              onCancel: Mn,
              onFocus: (Xo) => {
                (Io.noteFocus(Xo), handleFocus(Xo));
              },
              onInputModeToggle: handleInputModeToggle,
            }),
          ],
        }),
        e(Box, {
          justifyContent: "space-between",
          marginTop: 1,
          paddingX: 1,
          children: e(Text, {
            dimColor: !0,
            wrap: Dt ? "truncate" : void 0,
            children: r(Byline, {
              children: [e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }), hintNode, Dt],
            }),
          }),
        }),
      ],
    }),
  });
}

export { PowerShellPermissionRequest };
