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
import { figSpecRegistryByHost } from "../../../utils/Shell.js";
import { useHost } from "../../../context/session.js";
import { Q, y, R, ce, P } from "../../../../vendor/react/cjs/react.production.js";
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
import { getDestructiveTargetWarning } from "../../../tools/BashTool/destructiveTargets.js";
import { SandboxManager } from "../../../utils/sandbox/sandbox-adapter.js";
import { shouldUseSandbox } from "../../../tools/BashTool/shouldUseSandbox.js";
import { useSettingsErrors } from "../../../hooks/notifs/useSettingsErrors.js";
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

//@ chunk-18hwfzwa.js:1327894-1333385 fingerprint = BashPermissionRequestInner (0.378)
/**
 * Bash 权限对话框主体：显示命令（可编辑前缀）、说明、复合命令子结果、沙箱信息与规则解释；选项来自 bashToolUseOptions，反馈模式由 useShellPermissionFeedback 管理；accept/reject 时调用 onAllow/onReject 并可持久化规则。
 */
function BashPermissionRequestInner({ payload, answer, wouldTakeAnswer }) {
  let command = figSpecRegistryByHost.of(useHost());
  let command_2 = payload.command;
  let decisionReason = payload.permissionResult.decisionReason;
  let Re = Q(
    () =>
      serializeApprovalPayload(payload.input.command, {
        maxUnits: MAX_PAYLOAD_UNITS,
      }),
    [payload.input.command],
  );
  let Be = Re.kind === "withheld" || typeof payload.input.command !== "string";
  let [He, We] = y();
  let toolPermissionContext = CommandDisplay({
    commandDisplay: Re,
    description: payload.description,
    refinedPrefix: He,
  });
  let Xe = Be || !toolPermissionContext.body.offersStanding;
  let isStandingHeld = toolPermissionContext.body.isStandingHeld;
  let { requestedMachine, runsOnMachine } = Q(
    () => getRequestedMachineForPrompt(payload.input),
    [payload.input],
  );
  let It = findSafetyCheckReason(decisionReason, (pr) => !pr.classifierApprovable) !== undefined;
  let Ot = payload.permissionResult.inPlaceOfClassifier === true;
  let Et =
    payload.isAskCappedByOrg ||
    Ot ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource);
  let Dt = It || Et;
  let Lt = requestedMachine !== undefined;
  let oo = Q(
    () =>
      Be || Et
        ? null
        : parseBashConsentSuggestions(
            It
              ? filterAddDirectoriesUpdates(payload.permissionResult.suggestions)
              : payload.permissionResult.suggestions,
            Lt ? (runsOnMachine ?? "the attached computer") : undefined,
          ),
    [Be, Et, It, payload.permissionResult.suggestions, Lt, runsOnMachine],
  );
  let Xt = Xe ? null : oo;
  let io = !Dt && !Xe && runsOnMachine !== undefined && Xt === null;
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
    initialFocusedType: Ot ? "reject" : "accept",
  });
  let Cn = KillAgentsConfirm(payload.requestSource);
  let No = decisionReason?.type === "subcommandResults";
  let [vo, Yo] = y(() => {
    if (Be) return;
    if (No) {
      let backendBashRules = extractRules([...(oo?.applies ?? [])]).filter(
        (Ir) => Ir.toolName === BASH_TOOL_NAME && Ir.ruleContent,
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
  let hasUserEditedPrefix = R(undefined);
  let Fn = R(false);
  if (!Fn.current) {
    Fn.current = true;
    hasUserEditedPrefix.current = safeDisplayText(vo);
  }
  let bn = R(false);
  let onEditablePrefixChange = ce((value) => {
    bn.current = true;
    Yo(value);
  }, []);
  P(() => {
    if (No || Be) return;
    let cancelled = false;
    getCompoundCommandPrefixesStatic_2(command, command_2, () => false)
      .then(async (subcmd) => {
        if (cancelled || bn.current) return;
        if (subcmd.length === 0 || !subcmd[0]) return;
        let ur = await stripEnvVarPrefix(command_2, subcmd[0]);
        if (cancelled || bn.current) return;
        if (!startsWithBareShell(ur)) {
          let Ir = safeDisplayText(`${subcmd[0]} *`);
          if (Ir !== undefined) {
            hasUserEditedPrefix.current = Ir;
            Yo(Ir);
            We(Ir);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [command, command_2, No, Be]);
  let {
    destructiveWarning: destructiveWarning_0,
    sandboxingEnabled: sandboxingEnabled_0,
    isSandboxed: isSandboxed_0,
  } = Q(() => {
    let pr = typeof payload.input.command === "string" ? payload.input.command : command_2;
    let destructiveWarning =
      !Be && getFeatureValue_CACHED_MAY_BE_STALE("tengu_destructive_command_warning", false)
        ? getDestructiveTargetWarning(pr)
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
  }, [command_2, payload.input, payload.requestSource, Be, requestedMachine]);
  let { offered, canOfferAutoMode, enableAutoMode } = useSettingsErrors(payload.requestSource);
  let _o =
    isAskRuleDrivenReason(decisionReason) ||
    payload.permissionResult.matchedAskRule?.ruleBehavior === "ask" ||
    decisionReason?.type === "hook";
  let cn = canOfferAutoMode && !_o;
  let unaryEvent = Q(
    () =>
      powershellToolUseOptions_2({
        suggestionsRow: Xt,
        hasBackendSuggestions: !Xe && !Dt && !Lt && (payload.permissionResult.suggestions?.length ?? 0) > 0,
        decisionReason,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        editablePrefix: Xe || Dt || Lt ? undefined : vo,
        onEditablePrefixChange,
        showEnableAutoModeOption: !Xe && !Dt && !Lt && cn,
        enableAutoModeDescription: !offered ? AUTO_MODE_TIP_TEXT : undefined,
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
  );
  let existingAllowDescriptions = Q(
    () => (Ot ? preferValueFirst(unaryEvent, "no") : unaryEvent),
    [Ot, unaryEvent],
  );
  let fieldLeftOpen = toolPermissionContext.fieldLeftOpen;
  let options = Q(
    () => freezeOptionsAfterAnswer(existingAllowDescriptions, fieldLeftOpen),
    [existingAllowDescriptions, fieldLeftOpen],
  );
  let refusableAnswer = useRefusableAnswer(
    ce(
      (prev) => {
        if (!wouldTakeAnswer() || (isStandingHeld && isNotYesNo(prev))) return false;
        logEvent("tengu_permission_request_option_selected", {
          option_index: existingAllowDescriptions.findIndex((value_0) => value_0.value === prev) + 1,
        });
        if (prev === "yes") {
          let trimmedPrefix = acceptFeedback.trim();
          logSubmitted("accept", trimmedPrefix);
          answer(
            bashToolUseOptions("yes", payload, Xt, {
              feedback: trimmedPrefix || undefined,
            }),
          );
          return;
        }
        if (prev === "no") {
          let trimmedDescription = rejectFeedback.trim();
          logSubmitted("reject", trimmedDescription);
          answer(
            bashToolUseOptions("no", payload, Xt, {
              feedback: trimmedDescription || undefined,
            }),
          );
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
          enableAutoMode(!offered ? "bash_permission_prompt_upsell" : "workflow_permission_prompt");
          answer(bashToolUseOptions("yes", payload, Xt));
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
  );
  let defaultFocusValue =
    refusableAnswer.refused === null ? undefined : refusableAnswer.refused === "yes" && !Ot ? "yes" : "no";
  let onCancel = ce(() => {
    if (!wouldTakeAnswer()) return;
    logEscape();
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, logEscape]);
  let subtitle = Q(
    () => (cn && !Xe && !Dt && !Lt ? jsxProd_default(AutoModeTip, {}) : undefined),
    [cn, Xe, Dt, Lt],
  );
  let dr =
    runsOnMachine !== undefined
      ? `runs on ${runsOnMachine}`
      : sandboxingEnabled_0 && !isSandboxed_0
        ? "unsandboxed"
        : undefined;
  let or = toolPermissionContext.isFitted ? 0 : 1;
  return jsxProd_default(FittedBodyKeybindings, {
    fitted: toolPermissionContext,
    children: jsxProd_default_2(PermissionDialog_2, {
      title: toolPermissionContext.isFitted
        ? "Run command"
        : dr === undefined
          ? "Bash command"
          : `Bash command (${dr})`,
      subtitle,
      innerPaddingX: 0,
      requestSource: payload.requestSource,
      frame: toolPermissionContext.isFitted
        ? {
            onCancel,
            titleSuffix: dr,
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
              Cn,
            ],
          }
        : undefined,
      children: [
        jsxProd_default(Box, {
          flexDirection: "column",
          paddingX: or,
          children: jsxProd_default(Blockquote, {
            multiline: needsGutter(toolPermissionContext.description),
            children: jsxProd_default(Text, {
              dimColor: true,
              children: toolPermissionContext.description,
            }),
          }),
        }),
        jsxProd_default(CommandPreviewFrame, {
          commandDisplay: Re,
          fitted: toolPermissionContext,
          inset: or,
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          paddingX: or,
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
              rowBudget: toolPermissionContext.isCut || Ot ? MAX_EXPLANATION_LINES : undefined,
              rowColumns: toolPermissionContext.isCut ? toolPermissionContext.reasonColumns : undefined,
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
            io &&
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
                hideIndexes: Ot,
                selectedValue: NO_COMMITTED_ROW,
                options,
                inlineDescriptions: true,
                onChange: (pr) => (isStandingHeld && isNotYesNo(pr) ? false : refusableAnswer.answer(pr)),
                onCancel,
                onFocus: (pr) => {
                  toolPermissionContext.noteFocus(pr);
                  handleFocus(pr);
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
              wrap: Cn ? "truncate" : undefined,
              children: jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "cancel",
                  }),
                  hintNode,
                  Cn,
                ],
              }),
            }),
          }),
      ],
    }),
  });
}
//@ chunk-pw933apk.js:17859-18119 fingerprint = BashPermissionRequest (0.311)
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
export { BashPermissionRequestInner };
