/**
 * components/permissions/BashPermissionRequest/BashPermissionRequest.tsx
 *
 * Bash 工具权限请求：显示命令与说明、复合命令各子命令结果、规则建议（前缀/目录），选项"允许一次/不再询问/拒绝并反馈"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/BashPermissionRequest/BashPermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-pw933apk.js (1)
 * attribution: fingerprint 2
 */
import { Opn } from "../../../utils/Shell.js";
import { useHost } from "../../../context/session.js";
import { Q, y, R, ce, P } from "../../../../vendor/react/cjs/react.production.js";
import {
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  needsGutter,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  CommandDisplay,
  Kft,
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
import {
  parseBashConsentSuggestions,
  powershellToolUseOptions_2,
  bashToolUseOptions,
} from "./bashToolUseOptions.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { useShellPermissionFeedback } from "../useShellPermissionFeedback.js";
import { ShowInIDEPrompt } from "../../ShowInIDEPrompt.js";
import { KillAgentsConfirm } from "../../KillAgentsConfirm.js";
import { extractRules } from "../../../utils/permissions/PermissionUpdate.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { safeDisplayText } from "../consentRows.js";
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
import { n5s } from "../../../tools/BashTool/destructiveTargets.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { shouldUseSandbox } from "../../../tools/BashTool/shouldUseSandbox.js";
import { useSettingsErrors } from "../../../hooks/notifs/useSettingsErrors.js";
import { useRefusableAnswer } from "../../../hooks/useRefusableAnswer.js";
import { logEvent } from "../../../services/analytics/index.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { ASK_FIRST_REASON_TEXTS } from "../../../utils/permissions/askFirstReasons.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { Jn } from "../../../remote/remoteMode.js";
import { CloudTasksDialog } from "../../tasks/CloudTasksDialog.js";
import { BackgroundTasksDialog } from "../../tasks/BackgroundTasksDialog.js";

/**
 * Bash 权限对话框主体：显示命令（可编辑前缀）、说明、复合命令子结果、沙箱信息与规则解释；选项来自 bashToolUseOptions，反馈模式由 useShellPermissionFeedback 管理；accept/reject 时调用 onAllow/onReject 并可持久化规则。
 */
//@ chunk-18hwfzwa.js:1327894-1333385 fingerprint = BashPermissionRequestInner (0.378)
function BashPermissionRequestInner({ payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer }) {
  let of = Opn.of(useHost()),
    command = payload.command,
    decisionReason = payload.permissionResult.decisionReason,
    Re = Q(
      () => serializeApprovalPayload(payload.input.command, { maxUnits: MAX_PAYLOAD_UNITS }),
      [payload.input.command],
    ),
    Be = Re.kind === "withheld" || typeof payload.input.command !== "string",
    [He, We] = y(),
    toolPermissionContext = CommandDisplay({
      commandDisplay: Re,
      description: payload.description,
      refinedPrefix: He,
    }),
    Xe = Be || !toolPermissionContext.body.offersStanding,
    isStandingHeld = toolPermissionContext.body.isStandingHeld,
    { requestedMachine: requestedMachine, runsOnMachine: runsOnMachine } = Q(
      () => getRequestedMachineForPrompt(payload.input),
      [payload.input],
    ),
    It = findSafetyCheckReason(decisionReason, (pr) => !pr.classifierApprovable) !== void 0,
    Ot = payload.permissionResult.inPlaceOfClassifier === !0,
    Et =
      payload.isAskCappedByOrg ||
      Ot ||
      payload.permissionResult.oneTimeAnswersOnly === !0 ||
      isRemoteOrPluginAgent(payload.requestSource),
    Dt = It || Et,
    Lt = requestedMachine !== void 0,
    oo = Q(
      () =>
        Be || Et
          ? null
          : parseBashConsentSuggestions(
              It
                ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
                : payload.permissionResult.suggestions,
              Lt ? (runsOnMachine ?? "the attached computer") : void 0,
            ),
      [Be, Et, It, payload.permissionResult.suggestions, Lt, runsOnMachine],
    ),
    Xt = Xe ? null : oo,
    io = !Dt && !Xe && runsOnMachine !== void 0 && Xt === null,
    so = Q(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]),
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
      toolName: so,
      isMcp: payload.isMcp,
      initialFocusedType: Ot ? "reject" : "accept",
    }),
    Cn = KillAgentsConfirm(payload.requestSource),
    No = decisionReason?.type === "subcommandResults",
    [vo, Yo] = y(() => {
      if (Be) return;
      if (No) {
        let backendBashRules = extractRules([...(oo?.applies ?? [])]).filter(
          (Ir) => Ir.toolName === BASH_TOOL_NAME && Ir.ruleContent,
        );
        if (backendBashRules.length === 1) return safeDisplayText(backendBashRules[0].ruleContent);
        if (backendBashRules.length > 1) return;
      }
      let two = getSubcommandPrefix(command);
      if (two) return safeDisplayText(`${two} *`);
      let one = getBareCommandPrefix(command);
      if (one) return safeDisplayText(`${one} *`);
      return safeDisplayText(command);
    }),
    hasUserEditedPrefix = R(void 0),
    Fn = R(!1);
  if (!Fn.current) ((Fn.current = !0), (hasUserEditedPrefix.current = safeDisplayText(vo)));
  let bn = R(!1),
    onEditablePrefixChange = ce((value) => {
      ((bn.current = !0), Yo(value));
    }, []);
  P(() => {
    if (No || Be) return;
    let pr = !1;
    return (
      getCompoundCommandPrefixesStatic_2(of, command, () => !1)
        .then(async (subcmd) => {
          if (pr || bn.current) return;
          if (subcmd.length === 0 || !subcmd[0]) return;
          let ur = await stripEnvVarPrefix(command, subcmd[0]);
          if (pr || bn.current) return;
          if (!startsWithBareShell(ur)) {
            let Ir = safeDisplayText(`${subcmd[0]} *`);
            if (Ir !== void 0) ((hasUserEditedPrefix.current = Ir), Yo(Ir), We(Ir));
          }
        })
        .catch(() => {}),
      () => {
        pr = !0;
      }
    );
  }, [of, command, No, Be]);
  let {
      destructiveWarning: destructiveWarning_0,
      sandboxingEnabled: sandboxingEnabled_0,
      isSandboxed: isSandboxed_0,
    } = Q(() => {
      let pr = typeof payload.input.command === "string" ? payload.input.command : command,
        Qn =
          !Be && getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", !1)
            ? n5s(pr)
            : null,
        sandboxingEnabled = SandboxManager.isSandboxingEnabled(),
        Ir =
          sandboxingEnabled &&
          payload.requestSource?.type !== "remote-agent" &&
          typeof payload.input.command === "string" &&
          requestedMachine === void 0 &&
          shouldUseSandbox(payload.input);
      return { destructiveWarning: Qn, sandboxingEnabled: sandboxingEnabled, isSandboxed: Ir };
    }, [command, payload.input, payload.requestSource, Be, requestedMachine]),
    {
      offered: offered,
      canOfferAutoMode: canOfferAutoMode,
      enableAutoMode: enableAutoMode,
    } = useSettingsErrors(payload.requestSource),
    _o =
      isAskRuleDrivenReason(decisionReason) ||
      payload.permissionResult.matchedAskRule?.ruleBehavior === "ask" ||
      decisionReason?.type === "hook",
    cn = canOfferAutoMode && !_o,
    unaryEvent = Q(
      () =>
        powershellToolUseOptions_2({
          suggestionsRow: Xt,
          hasBackendSuggestions: !Xe && !Dt && !Lt && (payload.permissionResult.suggestions?.length ?? 0) > 0,
          decisionReason: decisionReason,
          onRejectFeedbackChange: setRejectFeedback,
          onAcceptFeedbackChange: setAcceptFeedback,
          yesInputMode: acceptInputMode,
          noInputMode: rejectInputMode,
          editablePrefix: Xe || Dt || Lt ? void 0 : vo,
          onEditablePrefixChange: onEditablePrefixChange,
          showEnableAutoModeOption: !Xe && !Dt && !Lt && cn,
          enableAutoModeDescription: !offered ? Kft : void 0,
        }),
      [
        Xt,
        Xe,
        Dt,
        Lt,
        payload.permissionResult.suggestions,
        decisionReason,
        acceptInputMode,
        rejectInputMode,
        vo,
        onEditablePrefixChange,
        offered,
        cn,
      ],
    ),
    existingAllowDescriptions = Q(
      () => (Ot ? preferValueFirst(unaryEvent, "no") : unaryEvent),
      [Ot, unaryEvent],
    ),
    fieldLeftOpen = toolPermissionContext.fieldLeftOpen,
    options = Q(
      () => freezeOptionsAfterAnswer(existingAllowDescriptions, fieldLeftOpen),
      [existingAllowDescriptions, fieldLeftOpen],
    ),
    Wn = useRefusableAnswer(
      ce(
        (prev) => {
          if (!wouldTakeAnswer() || (isStandingHeld && isNotYesNo(prev))) return !1;
          if (
            (logEvent("tengu_permission_request_option_selected", {
              option_index: existingAllowDescriptions.findIndex((value_0) => value_0.value === prev) + 1,
            }),
            prev === "yes")
          ) {
            let trimmedPrefix = acceptFeedback.trim();
            (logSubmitted("accept", trimmedPrefix),
              answer(bashToolUseOptions("yes", payload, Xt, { feedback: trimmedPrefix || void 0 })));
            return;
          }
          if (prev === "no") {
            let trimmedDescription = rejectFeedback.trim();
            (logSubmitted("reject", trimmedDescription),
              answer(bashToolUseOptions("no", payload, Xt, { feedback: trimmedDescription || void 0 })));
            return;
          }
          if (prev === "yes-prefix-edited") {
            answer(
              bashToolUseOptions("yes-prefix-edited", payload, Xt, {
                editablePrefix: vo,
                editablePrefixSeed: hasUserEditedPrefix.current,
              }),
            );
            return;
          }
          if (prev === "yes-enable-auto-mode") {
            (enableAutoMode(!offered ? "bash_permission_prompt_upsell" : "workflow_permission_prompt"),
              answer(bashToolUseOptions("yes", payload, Xt)));
            return;
          }
          answer(bashToolUseOptions(prev, payload, Xt));
        },
        [
          answer,
          wouldTakeAnswer,
          isStandingHeld,
          payload,
          Xt,
          acceptFeedback,
          rejectFeedback,
          vo,
          logSubmitted,
          enableAutoMode,
          offered,
          existingAllowDescriptions,
        ],
      ),
    ),
    Fr = Wn.refused === null ? void 0 : Wn.refused === "yes" && !Ot ? "yes" : "no",
    Zn = ce(() => {
      if (!wouldTakeAnswer()) return;
      (logEscape(), answer({ behavior: "deny" }));
    }, [answer, wouldTakeAnswer, logEscape]),
    Un = Q(() => (cn && !Xe && !Dt && !Lt ? e(AutoModeTip, {}) : void 0), [cn, Xe, Dt, Lt]),
    dr =
      runsOnMachine !== void 0
        ? `runs on ${runsOnMachine}`
        : sandboxingEnabled_0 && !isSandboxed_0
          ? "unsandboxed"
          : void 0,
    or = toolPermissionContext.isFitted ? 0 : 1;
  return e(FittedBodyKeybindings, {
    fitted: toolPermissionContext,
    children: r(PermissionDialog_2, {
      title: toolPermissionContext.isFitted
        ? "Run command"
        : dr === void 0
          ? "Bash command"
          : `Bash command (${dr})`,
      subtitle: Un,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      frame: toolPermissionContext.isFitted
        ? {
            onCancel: Zn,
            titleSuffix: dr,
            hints: [
              hintNode &&
                e(
                  KeyboardShortcutHint,
                  { chord: "tab", action: "amend", terse: !0, format: { keyCase: "lower" } },
                  "amend",
                ),
              Cn,
            ],
          }
        : void 0,
      children: [
        e(Box, {
          flexDirection: "column",
          paddingX: or,
          children: e(Blockquote, {
            multiline: needsGutter(toolPermissionContext.description),
            children: e(Text, { dimColor: !0, children: toolPermissionContext.description }),
          }),
        }),
        e(CommandPreviewFrame, { commandDisplay: Re, fitted: toolPermissionContext, inset: or }),
        r(Box, {
          flexDirection: "column",
          paddingX: or,
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
              rowBudget: toolPermissionContext.isCut || Ot ? MAX_EXPLANATION_LINES : void 0,
              rowColumns: toolPermissionContext.isCut ? toolPermissionContext.reasonColumns : void 0,
            }),
            destructiveWarning_0 &&
              e(Box, {
                marginBottom: 1,
                children: e(Text, { color: "warning", children: destructiveWarning_0 }),
              }),
            !toolPermissionContext.isFitted && e(Text, { children: "Do you want to proceed?" }),
            io &&
              e(Text, {
                dimColor: !0,
                children: ASK_FIRST_REASON_TEXTS["card.standing_unavailable"]({
                  name: runsOnMachine,
                  kind: "command",
                }),
              }),
            e(
              ModelSelector,
              {
                defaultFocusValue: Fr,
                hideIndexes: Ot,
                selectedValue: NO_COMMITTED_ROW,
                options: options,
                inlineDescriptions: !0,
                onChange: (pr) => (isStandingHeld && isNotYesNo(pr) ? !1 : Wn.answer(pr)),
                onCancel: Zn,
                onFocus: (pr) => {
                  (toolPermissionContext.noteFocus(pr), handleFocus(pr));
                },
                onInputModeToggle: handleInputModeToggle,
              },
              Wn.attempts,
            ),
          ],
        }),
        !toolPermissionContext.isFitted &&
          e(Box, {
            justifyContent: "space-between",
            marginTop: 1,
            paddingX: 1,
            children: e(Text, {
              dimColor: !0,
              wrap: Cn ? "truncate" : void 0,
              children: r(Byline, {
                children: [e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }), hintNode, Cn],
              }),
            }),
          }),
      ],
    }),
  });
}
/**
 * /tasks 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-pw933apk.js:17859-18119 fingerprint = BashPermissionRequest (0.311)
async function BashPermissionRequest(onDone, context) {
  if (Jn()) return e(CloudTasksDialog, { onDone: onDone });
  return e(BackgroundTasksDialog, {
    storageV5: context.storageV5,
    session: context.session,
    messageQueue: context.messageQueue,
    tools: context.options.tools,
    commands: context.options.commands,
    verbose: context.options.verbose,
    onDone: onDone,
    promptVisibleBelow: context.isMidTurn === !0,
  });
}

export { BashPermissionRequestInner };
