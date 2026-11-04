/**
 * remote/tools/serve/servedPermissionDecision.ts
 *
 * 2.1.316 新增：服务端调用的权限决定（询问升级、自动模式白名单、会话规则）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (43)
 * attribution: placement 43
 */
import { isDeepStrictEqual } from "util";
import { getToolRemoteExecution, getEmptyToolPermissionContext, safeParseToolInput } from "../../../Tool.js";
import {
  DEFAULT_SERVING_POLICY,
  resolveRemoteFilePathInput,
} from "../../../services/remoteTools/pathMapping.js";
import { permissionModeTitle } from "../../../utils/permissions/PermissionMode.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../consentText.js";
import { autoModeRefusedForServedCalls, autoModeRefusedForServedCallsWhy } from "./servedAutoMode.js";
import {
  getUseAutoModeDuringPlan,
  projectSettingsAliasesUserSettings,
} from "../../../utils/settings/settings.js";
import { isServedSettingRefused, applyHeldUserRules } from "../servedOwnerSettings.js";
import {
  shouldAllowManagedPermissionRulesOnly,
  loadAllPermissionRulesFromDisk,
  getPermissionRulesForSource,
  shouldShowAlwaysAllowOptions,
} from "../../../utils/permissions/permissionsLoader.js";
import { getLaunchPermissions, launchDenyRules } from "../../../utils/teleport/dirSync.js";
import { isAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";
import { getEnabledSettingSources } from "../../../utils/settings/constants.js";
import {
  overlyBroadShellAllowsStrippedByEverySession,
  isDangerousClassifierPermission,
  getHostCredentialDenyRule,
} from "../../../utils/permissions/permissionSetup.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import {
  applyPermissionRulesToPermissionContext,
  isAllowRuleIgnoredInAutoMode,
  checkRuleBasedPermissions,
  hasPermissionsToUseTool,
  PERMISSION_CHECK_CRASHED_REASON,
  isFileMutationTool,
  shouldClassifyEdits,
  isServerPolicyAskUnderPlanFloor,
  scriptAsksToRunUnsandboxed,
  carriesAskRuleIntent,
  isServerPolicyAskReason,
  findSafetyCheckReason,
} from "../../../utils/permissions/permissions.js";
import { realpathOrSpelling, launchedFromHome } from "../../../services/remoteTools/servingGates.js";
import {
  hasBlockReadsOutsideWorkingDirectories,
  isWriteBlockOn,
} from "../../../utils/permissions/readBlock.js";
import {
  useSecurityParser,
  shouldBypassAskForReadOnly,
  isServedLineWriting,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
} from "../../../tools/BashTool/readOnlyShellCheck.js";
import { isStrictSandboxFullyConfigured } from "../../../utils/hooks/servedHooks/hookSandbox.js";
import { applyPermissionUpdates } from "../../../utils/permissions/PermissionUpdate.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  HOST_CREDENTIAL_RULE_SOURCE,
  hostCredentialDenyRules,
  isUnderUserProfiles,
} from "./credentialPathGuards.js";
import { classifyToolError } from "../../../services/tools/toolExecution.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { setPermissionPromptHostProbe } from "../../../utils/permissions/permissionPromptHost.js";
import { TOOL_CHECK } from "../../../plugins/functionHooks/toolCheckHooks.js";
import {
  permissionCheckFailedMessage,
  credentialRefusalMessage,
  settingsDirRefusalMessage,
  settingsFileRefusalMessage,
} from "../../../services/remoteTools/hostRefusals.js";
import {
  readServedBackgroundOverride,
  isServedNutEnabled,
  isServedNeckEnabled,
  isServedFrogEnabled,
} from "./backgroundCommands.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { logError } from "../../../utils/log.js";
import {
  judgeServedMcpPaths,
  hostCredentialRuleOf,
  stripDoubleSlashPrefix,
  isMountPointRule,
} from "./servedPathJudgement.js";
import {
  credentialRuleKind,
  isViolinPurflingEnabled,
  isViolinCamberEnabled,
  isViolinArchingEnabled,
  isViolinEbonyEnabled,
  isViolinPurflingGateEnabled,
  isViolinTailgutEnabled,
  isRefactoredGadgetEnabled,
  isDefenseInDepthAsk,
  readsNetworkPath,
  isAutoOrPlanMode,
  runServedSafetyCheck,
  classifierBudgetMs,
  ownCheckMessage,
  joinSentences,
  MAY_ANSWER,
  servedVerdictKind,
  mayNotAnswer,
  unattendedStanceKind,
  unanswerableAskKind,
  hookAskKind,
  safetyCheckKind,
} from "./servedSafetyChecks.js";
import { isNonMcpShellTool } from "../../../tools/shared/textSearchTools.js";
import { getCwd } from "../../../utils/cwd.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { parseServedShellLine, isServedHairEnabled, isServedFerruleEnabled } from "./servedShellReading.js";
import { checkServedShellSettingsWrite } from "./servedSettingsFileCheck.js";
import { logEvent } from "../../../services/analytics/index.js";
import { settingsFileCertainty } from "../../../utils/permissions/filesystem.js";
import { getPathsForPermissionCheck } from "../../../utils/fsOperations.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { isDestructiveCommand } from "../../../utils/hooks/servedHooks/destructiveCommands.js";
import {
  isHostWordedAsk,
  forwardHostWordedAsk,
  isUnforwardedHostAsk,
} from "../../../services/tools/hostWordedAsks.js";
import { isBrowserToolAutoAllowed } from "../../../utils/permissions/browserComputerUseTools.js";
import { createChildAbortController } from "../../../utils/abortController.js";
import { isAbortError } from "../../../utils/errors.js";
import { isPlainObject as isPlainObject_2 } from "../../../utils/objectUtils.js";
import { unattendedServingAllowedByHostFlag } from "../../../services/remoteTools/unattendedConsentStore.js";
import {
  isSandboxOverrideUnderReadBlock,
  isHostPersonOnlyCircuitBreaker,
} from "../../../types/permissions.js";
import { ASK_ENDED_REASON } from "./pendingAsks.js";

//@ chunk-tr0s0d0k.js:51445-51756 placement
/**
 * 远程工具权限判定原因常量：会话答复、破坏性询问、分类器询问、本机设置写入/编辑、无法确认的 shell 写入等，以及每条最多保留 16 条。
 */
var SERVED_DECISION_REASONS = 16;
var REMOTE_CALL_SESSION_ANSWER = "remote_call_session_answer";
var REMOTE_CALL_DESTRUCTIVE_ASK = "remote_call_destructive_ask";
var REMOTE_CALL_CLASSIFIER_ASK = "remote_call_classifier_ask";
var REMOTE_CALL_SERVED_MCP_ASK = "remote_call_served_mcp_ask";
var REMOTE_CALL_HOST_SETTINGS_SHELL_WRITE = "remote_call_host_settings_shell_write";
var REMOTE_CALL_HOST_SETTINGS_EDIT = "remote_call_host_settings_edit";
var REMOTE_CALL_UNRESOLVED_SHELL_WRITE_ASK = "remote_call_unresolved_shell_write_ask";
var REMOTE_CALL_SETTINGS_FILE_NAMED_ASK = "remote_call_settings_file_named_ask";
var FORCE_NOT_REMOTELY_EXECUTABLE = false;
//@ chunk-tr0s0d0k.js:51756-51809 placement
function isNotRemotelyExecutable(tool) {
  return tool.isMcp === true || !getToolRemoteExecution(tool).supported;
}
//@ chunk-tr0s0d0k.js:51809-51945 placement
function destructiveCommandAskMessage(targetName) {
  return `This command is flagged as destructive. ${targetName} asks before running destructive commands sent from a cloud session.`;
}
//@ chunk-tr0s0d0k.js:51945-52439 placement
/**
 * 远程调用的拒绝模板：确认失败、回答前被停止，以及允许直接执行的权限模式集合（default/plan/dontAsk/acceptEdits）。
 */
var SERVED_STOP_REASONS = "remote_call_stopped";
var CONFIRMATION_FAILED_DECISION = {
  behavior: "deny",
  message: "The call could not be confirmed after the answer, so it did not run.",
  decisionReason: {
    type: "other",
    reason: "remote_call_relative_path_not_confirmed",
  },
  decideLocation: "ask-path",
};
var STOPPED_BEFORE_ANSWER_DECISION = {
  behavior: "deny",
  message: "The remote session's call was stopped before it was answered; it did not run.",
  decisionReason: {
    type: "other",
    reason: SERVED_STOP_REASONS,
  },
  decideLocation: "ask-path",
};
var REMOTE_CALL_NOT_RUN_HERE = "remote_call_not_run_here";
var MODES_THAT_ALLOW_SERVED_CALLS = new Set(["default", "plan", "dontAsk", "acceptEdits"]);
//@ chunk-tr0s0d0k.js:52439-52938 placement
function effectiveServedMode(params) {
  if (params.stance.mode !== "session")
    return {
      mode: params.stance.mode,
      capped: false,
      autoRefusedHere: false,
    };
  let call = params.call ?? DEFAULT_SERVING_POLICY;
  let sessionMode = params.sessionMode ?? "default";
  let autoRefusedHere = params.sessionMode === "auto" || params.sessionMode === "bypassPermissions";
  if (isUnattendedAutoAllowed(params.stance, params.sessionMode, call))
    return {
      mode: "acceptEdits",
      capped: sessionMode === "bypassPermissions",
      autoRefusedHere: false,
    };
  return {
    mode:
      (params.stance.unattended === "own_record" ||
        (params.stance.unattended === "conveyed" && call.modeDecidedByHost === true)) &&
      MODES_THAT_ALLOW_SERVED_CALLS.has(sessionMode)
        ? sessionMode
        : "default",
    capped: sessionMode === "bypassPermissions",
    autoRefusedHere,
  };
}
//@ chunk-tr0s0d0k.js:52938-53263 placement
function servedModeRelation(params) {
  if (params.stance.mode !== "session") return "fixed_stance";
  if (params.sessionMode === undefined) return "mode_absent";
  if (params.sessionMode === params.evaluatedMode) return "as_claimed";
  if (params.sessionMode === "auto" || params.sessionMode === "bypassPermissions")
    return params.evaluatedMode === "acceptEdits" ? "auto_fast_path" : "auto_refused_here";
  return "mode_unknown";
}
//@ chunk-tr0s0d0k.js:53263-53448 placement
function servedModeTelemetry(params) {
  let relation = servedModeRelation(params);
  let session = params.sessionMode ?? "absent";
  return relation === "auto_fast_path"
    ? {
        session,
        evaluated: "auto",
        step: "accept_edits_fast_path",
      }
    : {
        session,
        evaluated: params.evaluatedMode,
        why: relation,
      };
}
//@ chunk-tr0s0d0k.js:53448-53912 placement
function servedModeNote(relation, reason = "none") {
  switch (relation) {
    case "fixed_stance":
    case "as_claimed":
    case "auto_fast_path":
      return;
    case "auto_refused_here":
      return reason === "none"
        ? `This computer is not accepting auto mode from cloud sessions right now, so it checked this in ${permissionModeTitle("default").toLowerCase()} mode.`
        : REMOTE_TOOLS_CONSENT_TEXT[`auto_off.reason.${reason}`];
    case "mode_absent":
    case "mode_unknown":
      return `This computer could not tell which mode the session is in, so it checked this in ${permissionModeTitle("default").toLowerCase()} mode.`;
  }
}
//@ chunk-tr0s0d0k.js:53912-53953 placement
var REMOTE_CALL_AUTO_MODE_ALLOWLIST = "remote_call_auto_mode_allowlist";
//@ chunk-tr0s0d0k.js:53953-54157 placement
function isUnattendedAutoAllowed(stance, sessionMode, call) {
  if (sessionMode !== "auto" && sessionMode !== "bypassPermissions") return false;
  switch (stance.unattended) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return call.modeDecidedByHost === true;
    default: {
      let unattended = stance.unattended;
      return false;
    }
  }
}
//@ chunk-tr0s0d0k.js:54157-54265 placement
function isUnattendedOwnRecord(stanceValue) {
  switch (stanceValue) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return false;
    default: {
      let unattended = stanceValue;
      return false;
    }
  }
}
//@ chunk-tr0s0d0k.js:54265-54330 placement
function isPlanFloor(sessionMode, unattended = "own_record") {
  return sessionMode === "plan" && planModeUnattendedRefusal(unattended) === undefined;
}
//@ chunk-tr0s0d0k.js:54330-54443 placement
function planModeUnattendedRefusal(stanceValue) {
  if (!isUnattendedOwnRecord(stanceValue)) return "answers_refused";
  return getUseAutoModeDuringPlan() && !isServedSettingRefused("plan_asks_a_person")
    ? undefined
    : "plan_setting";
}
//@ chunk-tr0s0d0k.js:54443-54467 placement
function isNeverDestructiveTool(name) {
  return false;
}
//@ chunk-tr0s0d0k.js:54467-54529 placement
var SESSION_RULE_SOURCES = new Set(["projectSettings", "localSettings", "session"]);
//@ chunk-tr0s0d0k.js:54529-56752 placement
/**
 * 为远程调用构造本机权限上下文：按服务立场（session/fixed）合并会话模式、规则来源与 CLI 允许规则。
 */
function servedPermissionContext(params) {
  let call = params.call ?? DEFAULT_SERVING_POLICY;
  let { mode } = effectiveServedMode({
    stance: params.stance,
    sessionMode: params.sessionMode,
    call,
  });
  let autoAllowed =
    isUnattendedAutoAllowed(params.stance, params.sessionMode, call) ||
    isPlanFloor(params.sessionMode, params.stance.unattended);
  let managedOnly = shouldAllowManagedPermissionRulesOnly();
  let launchPermissions = getLaunchPermissions();
  let launchedAuto = launchPermissions.launchedInAutoMode || isAutoModeActive();
  let projectAliasesUser = params.userSettings?.held === true && projectSettingsAliasesUserSettings();
  let rules = params.stance.honorLocalRules
    ? [
        ...applyHeldUserRules(loadAllPermissionRulesFromDisk(), params.userSettings, managedOnly).filter(
          (rule) => !projectAliasesUser || rule.source !== "projectSettings" || rule.ruleBehavior !== "allow",
        ),
        ...(managedOnly
          ? []
          : launchPermissions.allowRules.map((allowRule) => ({
              source: "cliArg",
              ruleBehavior: "allow",
              ruleValue: permissionRuleValueFromString(allowRule),
            }))),
        ...launchDenyRules(launchPermissions),
      ]
    : [
        ...applyHeldUserRules(
          getEnabledSettingSources()
            .filter(
              (source) =>
                !SESSION_RULE_SOURCES.has(source) &&
                !(source === "userSettings" && projectSettingsAliasesUserSettings()),
            )
            .flatMap((source) => getPermissionRulesForSource(source)),
          projectSettingsAliasesUserSettings() ? undefined : params.userSettings,
          false,
        ),
        ...launchDenyRules(launchPermissions),
      ].filter((rule) => !SESSION_RULE_SOURCES.has(rule.source) && rule.ruleBehavior === "deny");
  let broadAllowKeySet = new Set(
    overlyBroadShellAllowsStrippedByEverySession(rules).map((rule) => formatPermissionRule(rule.ruleValue)),
  );
  let filtered = rules.filter(
    (rule) =>
      !isDangerousAllowRule(
        rule.ruleBehavior,
        rule.ruleValue,
        autoAllowed || (rule.source === "cliArg" && launchedAuto),
      ) && !(rule.ruleBehavior === "allow" && broadAllowKeySet.has(formatPermissionRule(rule.ruleValue))),
  );
  let context = applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), filtered, {
    announce: false,
  });
  let honorLocalRules = params.stance.honorLocalRules;
  let servedContext = {
    ...context,
    alwaysDenyRules: withHostCredentialDenyRules(
      context.alwaysDenyRules,
      params.stance.honorLocalRules && launchPermissions.toolsNarrowingDenyRules.length > 0
        ? {
            toolsNarrowing: [...launchPermissions.toolsNarrowingDenyRules],
          }
        : {},
    ),
    additionalWorkingDirectories: new Map([
      ...(params.stance.honorLocalRules
        ? [...launchPermissions.additionalWorkingDirectories].flatMap(([, dirEntry]) => {
            let entry = {
              ...dirEntry,
              path: realpathOrSpelling(dirEntry.path),
            };
            if (launchedFromHome(dirEntry.path) || !notLaunchedFromHome(entry)) return [];
            return [[entry.path, entry]];
          })
        : []),
      [
        params.launchDir,
        {
          path: params.launchDir,
          source: "session",
        },
      ],
    ]),
    mode,
    isBypassPermissionsModeAvailable: mode === "bypassPermissions",
    shouldAvoidPermissionPrompts: false,
    servedCall: true,
    ...(params.stance.honorLocalRules &&
      (hasBlockReadsOutsideWorkingDirectories() || isServedSettingRefused("read_block")) && {
        blockReadsOutsideWorkingDirectories: true,
      }),
    ...(params.stance.honorLocalRules &&
      (isWriteBlockOn() || isServedSettingRefused("write_block")) && {
        blockWritesOutsideWorkingDirectories: true,
      }),
    ...((!honorLocalRules ||
      useSecurityParser() ||
      !isStrictSandboxFullyConfigured() ||
      params.sandboxTurnedOnByHeldFile === true) && {
      sandboxAutoAllowSuspended: true,
    }),
  };
  if (params.stance.honorLocalRules) {
    let cliargAllows = launchPermissions.allowRules.length;
    logDroppedServedRules({
      cliarg_allows: cliargAllows,
      cliarg_allows_kept: (servedContext.alwaysAllowRules.cliArg ?? []).length,
      startup_dirs: launchPermissions.additionalWorkingDirectories.size,
      startup_dirs_kept: servedContext.additionalWorkingDirectories.size - 1,
    });
  }
  let filtered_2 = (params.sessionUpdates ?? []).filter(
    (update) =>
      update.type === "addRules" &&
      !(managedOnly && update.behavior === "allow") &&
      !update.rules.some((rule) => isDangerousAllowRule(update.behavior, rule, autoAllowed)) &&
      !(
        update.behavior === "allow" &&
        overlyBroadShellAllowsStrippedByEverySession(
          update.rules.map((ruleValue) => ({
            source: "session",
            ruleBehavior: "allow",
            ruleValue,
          })),
        ).length > 0
      ),
  );
  return filtered_2.length > 0
    ? {
        ...applyPermissionUpdates(servedContext, filtered_2),
        mode,
      }
    : servedContext;
}
//@ chunk-tr0s0d0k.js:56752-56786 placement
function notLaunchedFromHome(entry) {
  return !launchedFromHome(entry.path);
}
//@ chunk-tr0s0d0k.js:56786-56801 placement
var LOGGED_DROPPED_RULE_SETS = new Set();
//@ chunk-tr0s0d0k.js:56801-57055 placement
function logDroppedServedRules(fields) {
  if (fields.cliarg_allows === fields.cliarg_allows_kept && fields.startup_dirs === fields.startup_dirs_kept)
    return;
  let joined = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  if (LOGGED_DROPPED_RULE_SETS.has(joined)) return;
  LOGGED_DROPPED_RULE_SETS.add(joined);
  logForDebugging(`[remote-tools] served-context screens dropped rules ${joined}`);
}
//@ chunk-tr0s0d0k.js:57055-57109 placement
function withHostCredentialDenyRules(alwaysDenyRules, extra) {
  return {
    ...alwaysDenyRules,
    ...extra,
    [HOST_CREDENTIAL_RULE_SOURCE]: hostCredentialDenyRules().map(formatPermissionRule),
  };
}
//@ chunk-tr0s0d0k.js:57109-57200 placement
function isDangerousAllowRule(behavior, rule, treatAsAuto) {
  return (
    behavior === "allow" &&
    treatAsAuto &&
    (isDangerousClassifierPermission(rule.toolName, rule.ruleContent) ||
      isAllowRuleIgnoredInAutoMode(rule.toolName))
  );
}
//@ chunk-tr0s0d0k.js:57200-57265 placement
function classifyToolErrorSafely(error) {
  try {
    return classifyToolError(error);
  } catch {
    return lit("UnknownError");
  }
}
//@ chunk-tr0s0d0k.js:57265-63626 placement
/**
 * 为远程调用包装 canUseTool：本机钩子、分类器二次检查、破坏性命令询问、设置文件写入判定。
 */
function createServedCallPermissionCheck(params) {
  return setPermissionPromptHostProbe(
    "servedCall",
    async (tool, input, toolUseContext, canUseTool, callId, priorAnswer) => {
      let checkDepth = 0;
      let parseInFlight = false;
      let checkError;
      let parseError;
      let probedTool = Object.create(tool, {
        checkPermissions: {
          value: async (...args) => {
            checkDepth += 1;
            try {
              let answer = await tool.checkPermissions(...args);
              checkDepth -= 1;
              return answer;
            } catch (error) {
              checkError = classifyToolErrorSafely(error);
              throw error;
            }
          },
        },
        inputSchema: {
          get: () =>
            Object.create(tool.inputSchema, {
              parse: {
                value: (...args) => {
                  parseInFlight = true;
                  try {
                    let parsed = tool.inputSchema.parse(...args);
                    parseInFlight = false;
                    return parsed;
                  } catch (error) {
                    parseError = classifyToolErrorSafely(error);
                    throw error;
                  }
                },
              },
            }),
        },
      });
      let ruleAnswer =
        priorAnswer?.behavior === "ask"
          ? await checkRuleBasedPermissions(probedTool, input, toolUseContext)
          : null;
      let hookAsked =
        priorAnswer?.decisionReason?.type === "hook" && priorAnswer.decisionReason.hookName === TOOL_CHECK;
      let decision =
        priorAnswer === undefined || priorAnswer.behavior === "allow"
          ? await hasPermissionsToUseTool(probedTool, input, toolUseContext, canUseTool, callId)
          : ruleAnswer?.behavior === "deny" && !hookAsked
            ? ruleAnswer
            : priorAnswer;
      if (checkDepth > 0 || parseInFlight) {
        params.onOutcome({
          kind: "denied_by_rule",
          raisedToAsk: false,
          rulesCheckCrashed: {
            inputParseThrew: parseInFlight,
            crashClass: (parseInFlight ? parseError : checkError) ?? lit("UnknownError"),
          },
        });
        return {
          behavior: "deny",
          message: permissionCheckFailedMessage({
            targetName: params.targetName,
            toolName: tool.name,
          }),
          decisionReason: {
            type: "other",
            reason: PERMISSION_CHECK_CRASHED_REASON,
          },
        };
      }
      let contextFor = (phase) => {
        if (params.permissionContextNow === undefined || !readServedBackgroundOverride()) return;
        if (phase === "asked") return getToolPermissionContext(toolUseContext);
        try {
          return params.permissionContextNow();
        } catch (error) {
          logError(
            Error("the rules a served MCP relative name is judged again under could not be read", {
              cause: error,
            }),
          );
          return;
        }
      };
      let mcpJudge = judgeServedMcpPaths(tool, input, contextFor("asked"));
      let mcpAsk = mcpJudge?.kind === "ask";
      let webAddress = mcpJudge?.kind === "web_address";
      let relativePath = mcpJudge?.kind === "relative_path";
      let credentialRule =
        decision.behavior === "deny"
          ? hostCredentialRuleOf(decision.decisionReason)
          : ((await getHostCredentialDenyRule(tool, input)) ??
            (mcpJudge?.kind === "deny" ? mcpJudge.rule : undefined));
      let finalDecision = decision;
      if (credentialRule !== undefined) {
        let ruleKind = credentialRuleKind(credentialRule);
        let message = credentialRefusalMessage({
          targetName: params.targetName,
          kind: ruleKind,
          subject:
            ruleKind === "keychain" && typeof input.command === "string"
              ? input.command
              : stripDoubleSlashPrefix(credentialRule),
        });
        finalDecision =
          decision.behavior === "deny"
            ? {
                ...decision,
                message,
              }
            : {
                behavior: "deny",
                decisionReason: {
                  type: "rule",
                  rule: credentialRule,
                },
                message,
              };
      }
      let effectiveInput =
        "updatedInput" in finalDecision && finalDecision.updatedInput !== undefined
          ? finalDecision.updatedInput
          : input;
      let bypassAsk =
        finalDecision.behavior !== "deny" && isNonMcpShellTool(tool) && isViolinPurflingEnabled()
          ? await shouldBypassAskForReadOnly(tool, effectiveInput, finalDecision, getCwd())
          : "none";
      let command = effectiveInput.command;
      let parsedLine =
        isViolinCamberEnabled() &&
        bypassAsk === "uncertain" &&
        tool.name === BASH_TOOL_NAME &&
        typeof command === "string"
          ? await parseServedShellLine(command)
          : undefined;
      let parsedInput =
        parsedLine === undefined
          ? undefined
          : {
              ...effectiveInput,
              command: parsedLine,
            };
      let parsedBypassAsk =
        parsedInput === undefined
          ? bypassAsk
          : await shouldBypassAskForReadOnly(tool, parsedInput, finalDecision, getCwd());
      let isUncertain = parsedBypassAsk === "uncertain";
      let writesSettingGate = isViolinArchingEnabled();
      let checkProtected = isViolinEbonyEnabled();
      let gateEnabled = finalDecision.behavior !== "deny" && isViolinPurflingGateEnabled();
      let lineWrites =
        writesSettingGate &&
        gateEnabled &&
        isNonMcpShellTool(tool) &&
        ((await isServedLineWriting(tool, effectiveInput, toolUseContext)) ||
          (parsedInput !== undefined && (await isServedLineWriting(tool, parsedInput, toolUseContext))));
      let uncertainUnderGate = writesSettingGate && isUncertain && isViolinTailgutEnabled();
      let writeCheck =
        lineWrites || uncertainUnderGate
          ? await checkServedShellSettingsWrite(
              tool.name,
              effectiveInput,
              getCwd(),
              params.stopSignal,
              checkProtected,
            )
          : undefined;
      let parsedWriteCheck =
        writeCheck !== undefined && parsedInput !== undefined
          ? await checkServedShellSettingsWrite(
              tool.name,
              parsedInput,
              getCwd(),
              params.stopSignal,
              checkProtected,
            )
          : undefined;
      let combinedWriteCheck =
        writeCheck === undefined || parsedWriteCheck === undefined
          ? writeCheck
          : {
              file: writeCheck.file !== "none" ? writeCheck.file : parsedWriteCheck.file,
              fileOrFolder:
                writeCheck.fileOrFolder !== "none" ? writeCheck.fileOrFolder : parsedWriteCheck.fileOrFolder,
            };
      let touchesProtected = writesSettingGate
        ? lineWrites && combinedWriteCheck?.file !== "none"
        : gateEnabled &&
          ((await servedLineTouchesProtectedPath(tool, effectiveInput, toolUseContext, checkProtected)) ||
            (parsedInput !== undefined &&
              (await servedLineTouchesProtectedPath(tool, parsedInput, toolUseContext, checkProtected))));
      let unresolvedShellWrite = isRefactoredGadgetEnabled()
        ? touchesProtected &&
          (touchesProtectedPath(effectiveInput, "own_file") ||
            (parsedInput !== undefined && touchesProtectedPath(parsedInput, "own_file")))
        : touchesProtected ||
          (isUncertain &&
            (writesSettingGate
              ? !uncertainUnderGate || combinedWriteCheck?.fileOrFolder !== "none"
              : !isViolinTailgutEnabled() ||
                touchesProtectedPath(effectiveInput, "file_or_folder") ||
                (parsedInput !== undefined && touchesProtectedPath(parsedInput, "file_or_folder"))));
      let settingsCause = touchesProtected
        ? (combinedWriteCheck?.file ?? "error")
        : uncertainUnderGate
          ? (combinedWriteCheck?.fileOrFolder ?? "error")
          : "none";
      if (parsedBypassAsk !== "none" || touchesProtected)
        logEvent("tengu_served_shell_settings_hold", {
          verdict: fromEnum(parsedBypassAsk),
          tool: fromEnum(tool.name === BASH_TOOL_NAME ? "bash" : "powershell"),
          person_only: unresolvedShellWrite,
          ...(writesSettingGate && {
            cause: fromEnum(settingsCause),
          }),
        });
      if (parsedBypassAsk === "settings")
        finalDecision = {
          behavior: "deny",
          message: settingsDirRefusalMessage({
            targetName: params.targetName,
          }),
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_HOST_SETTINGS_SHELL_WRITE,
          },
        };
      else if (
        finalDecision.behavior !== "deny" &&
        !isNonMcpShellTool(tool) &&
        isViolinPurflingGateEnabled() &&
        typeof tool.getPath === "function" &&
        !tool.isReadOnly(effectiveInput, toolUseContext) &&
        settingsFileCertainty(getPathsForPermissionCheck(tool.getPath(effectiveInput))) === "certain"
      ) {
        logEvent("tengu_served_settings_edit_refused", {
          tool: fromEnum(
            tool.name === FILE_EDIT_TOOL_NAME
              ? "edit"
              : tool.name === FILE_WRITE_TOOL_NAME
                ? "write"
                : "other",
          ),
          engine: fromEnum(finalDecision.behavior),
        });
        finalDecision = {
          behavior: "deny",
          message: settingsFileRefusalMessage({
            targetName: params.targetName,
          }),
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_HOST_SETTINGS_EDIT,
          },
        };
      }
      if (toolUseContext.remoteCall === undefined)
        logError(
          Error(
            "served permission step ran with no call record: a PreToolUse hook's refusal or question cannot be held",
          ),
        );
      let strictestHookAnswer = toolUseContext.remoteCall?.strictestHookAnswer;
      if (strictestHookAnswer?.behavior === "deny") {
        logForDebugging(
          `[remote-tools call=${callId}] refused by a PreToolUse hook here; ${finalDecision.behavior} after it set aside tool=${tool.name}`,
        );
        return strictestHookAnswer;
      }
      if (strictestHookAnswer !== undefined && finalDecision.behavior === "allow") {
        logForDebugging(
          `[remote-tools call=${callId}] asked about by a PreToolUse hook here; allow after it raised back to that question tool=${tool.name}`,
        );
        finalDecision = {
          ...strictestHookAnswer,
          updatedInput: finalDecision.updatedInput,
        };
      }
      let isDestructive =
        params.stance.askOnDestructive &&
        tool.name === BASH_TOOL_NAME &&
        typeof input.command === "string" &&
        input.command !== "" &&
        isDestructiveCommand(input.command);
      let notRemotelyExecutable = isNotRemotelyExecutable(tool) && (FORCE_NOT_REMOTELY_EXECUTABLE || mcpAsk);
      let autoAllowed = isUnattendedAutoAllowed(
        params.stance,
        params.sessionMode,
        params.call ?? DEFAULT_SERVING_POLICY,
      );
      let classifyEdit =
        params.sessionModel !== undefined &&
        autoAllowed &&
        finalDecision.behavior === "allow" &&
        finalDecision.decisionReason?.type === "mode" &&
        finalDecision.decisionReason.mode === "acceptEdits" &&
        isFileMutationTool(tool.name) &&
        shouldClassifyEdits(params.sessionModel);
      let neverDestructive =
        (autoAllowed || isPlanFloor(params.sessionMode, params.stance.unattended)) &&
        isNeverDestructiveTool(tool.name);
      let raisedToAskFlag =
        (isDestructive ||
          notRemotelyExecutable ||
          webAddress ||
          relativePath ||
          classifyEdit ||
          neverDestructive ||
          isUncertain ||
          touchesProtected) &&
        finalDecision.behavior === "allow";
      let personOnlyAsk = finalDecision.behavior === "ask" && finalDecision.personOnly === true;
      let raisedWhateverAllows =
        isDestructive ||
        notRemotelyExecutable ||
        webAddress ||
        relativePath ||
        touchesProtected ||
        (isUncertain && tool.name === BASH_TOOL_NAME) ||
        strictestHookAnswer !== undefined ||
        personOnlyAsk;
      let fastPathEdit = classifyEdit && !raisedWhateverAllows;
      let classifierAllowed =
        finalDecision.behavior === "allow" && finalDecision.decisionReason?.type === "classifier";
      let asked =
        raisedToAskFlag || classifierAllowed
          ? escalateToAsk(
              finalDecision,
              params.targetName,
              notRemotelyExecutable
                ? mcpAsk
                  ? "served_mcp_path"
                  : "served_mcp"
                : isDestructive
                  ? "destructive"
                  : touchesProtected && !isUncertain
                    ? "settings_file_named"
                    : unresolvedShellWrite
                      ? "unresolved_shell_write"
                      : isUncertain
                        ? "unreadable_shell_line"
                        : relativePath
                          ? "served_mcp_relative_path"
                          : webAddress
                            ? "served_mcp_web_address"
                            : "classifier",
            )
          : finalDecision;
      let forcedByHook =
        (priorAnswer !== undefined && finalDecision === priorAnswer) ||
        strictestHookAnswer !== undefined ||
        personOnlyAsk;
      let taggedAsk =
        mcpAsk &&
        asked.behavior === "ask" &&
        !forcedByHook &&
        asked.decisionReason?.type !== "hook" &&
        !(
          asked.decisionReason?.type === "other" && asked.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK
        )
          ? {
              ...asked,
              decisionReason: {
                type: "other",
                reason: REMOTE_CALL_SERVED_MCP_ASK,
              },
            }
          : asked;
      let networkPath =
        taggedAsk.behavior === "ask" &&
        (isDefenseInDepthAsk(finalDecision) ||
          readsNetworkPath(tool, effectiveInput, getToolPermissionContext(toolUseContext)));
      let serverAskUnderPlanFloor =
        taggedAsk.behavior === "ask" &&
        isServerPolicyAskUnderPlanFloor(taggedAsk.decisionReason, tool, effectiveInput, toolUseContext);
      if (
        !params.stopSignal.aborted &&
        autoAllowed &&
        !webAddress &&
        !relativePath &&
        taggedAsk.behavior === "ask" &&
        !isHostWordedAsk(taggedAsk) &&
        decideServedAskAnswerability(
          taggedAsk,
          tool,
          forcedByHook || toolUseContext.hookAskFloor === true,
          getToolPermissionContext(toolUseContext),
          unresolvedShellWrite,
          networkPath,
          serverAskUnderPlanFloor,
          params.stance.unattended,
          fastPathEdit,
        ).may &&
        isBrowserToolAutoAllowed(tool, input)
      ) {
        let allowDecision = {
          behavior: "allow",
          updatedInput:
            "updatedInput" in taggedAsk && taggedAsk.updatedInput !== undefined
              ? taggedAsk.updatedInput
              : input,
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_AUTO_MODE_ALLOWLIST,
          },
        };
        let allowLanded = notifyAllowLanded(params, tool, allowDecision, input);
        let refusal =
          allowLanded !== undefined && (await allowLanded, params.stopSignal.aborted)
            ? STOPPED_BEFORE_ANSWER_DECISION
            : refusalAsAllowLandsDecision(params);
        if (refusal !== undefined) {
          params.onOutcome({
            kind: servedDecisionOutcome(refusal, allowDecision),
            raisedToAsk: raisedToAskFlag,
          });
          return refusal;
        }
        params.onOutcome({
          kind: servedDecisionOutcome(allowDecision, allowDecision),
          raisedToAsk: raisedToAskFlag,
          allowBasis: "auto_allowlist",
        });
        return allowDecision;
      }
      let servedAsk = await resolveServedAsk(taggedAsk, params, input, toolUseContext, {
        raisedToAsk: raisedToAskFlag,
        tool,
        forcedByHook,
        callId,
        unresolvedShellWrite,
        networkPath,
        serverAskUnderPlanFloor,
        fastPathEdit,
        raisedWhateverAllows,
        mcpPathWhy: mcpJudge?.kind === "ask" ? mcpJudge.why : relativePath ? "relieved" : undefined,
      });
      let confirmedAsk =
        relativePath &&
        servedAsk.behavior === "allow" &&
        judgeServedMcpPaths(tool, servedAsk.updatedInput ?? input, contextFor("answered"))?.kind !==
          "relative_path"
          ? CONFIRMATION_FAILED_DECISION
          : servedAsk;
      let landed = notifyAllowLanded(params, tool, confirmedAsk, input);
      if (landed !== undefined) await landed;
      let aborted = confirmedAsk.behavior === "allow" && params.stopSignal.aborted;
      if (aborted)
        logEvent("tengu_remote_tool_allow_after_stop", {
          road: fromEnum(taggedAsk.behavior === "allow" ? "decided_here" : "ask_path"),
          is_mcp: tool.mcpInfo !== undefined,
        });
      let lateRefusal =
        confirmedAsk.behavior === "allow" && !aborted ? refusalAsAllowLandsDecision(params) : undefined;
      let answer = aborted ? STOPPED_BEFORE_ANSWER_DECISION : (lateRefusal ?? confirmedAsk);
      params.onOutcome({
        kind: servedDecisionOutcome(answer, taggedAsk),
        raisedToAsk: raisedToAskFlag,
        ...(credentialRule !== undefined && {
          throughSecondRootMount: isMountPointRule(credentialRule),
        }),
        ...(decision === ruleAnswer && {
          deniedUnderForcedAsk: true,
        }),
        ...(taggedAsk.behavior === "allow" &&
          answer.behavior === "allow" && {
            allowBasis: taggedAsk.decisionReason?.type ?? "unspecified",
          }),
        ...(taggedAsk.behavior === "deny" && {
          denySource: findDenyRuleSource(taggedAsk.decisionReason),
          hostCredentialRefusal: credentialRule && credentialRuleKind(credentialRule),
          underWindowsProfileGlob:
            credentialRule && isUnderUserProfiles(stripDoubleSlashPrefix(credentialRule)),
        }),
      });
      return answer;
    },
    () => true,
  );
}
//@ chunk-tr0s0d0k.js:63626-64287 placement
function tryAutoModeAllowlist(params) {
  try {
    if (
      !isServedHairEnabled() ||
      params.stance.onAsk !== "session" ||
      !isNonMcpShellTool(params.tool) ||
      !isNeverDestructiveTool(params.tool.name) ||
      !isUnattendedOwnRecord(params.stance.unattended) ||
      !(
        isUnattendedAutoAllowed(params.stance, params.sessionMode, params.call ?? DEFAULT_SERVING_POLICY) ||
        isPlanFloor(params.sessionMode, params.stance.unattended)
      ) ||
      !isAutoOrPlanMode(params.sessionMode)
    )
      return;
    let input = normalizeForwardedInput(params.tool, params.forwardedInput);
    let childAbortController = createChildAbortController(params.callStop);
    return {
      input,
      check: runServedSafetyCheck({
        tool: params.tool,
        input,
        permissionContext: params.permissionContext,
        serviceWrittenSessionMode: params.serviceWrittenSessionMode,
        stopSignal: childAbortController.signal,
        callId: params.callId,
        capMs: classifierBudgetMs(params.legDeadlineAt),
        again: {
          legDeadlineAt: params.legDeadlineAt,
          besideHold: true,
        },
      }).catch((error) => {
        logUnlessStopped(error, childAbortController.signal);
        return {
          verdict: "no_verdict",
          why: "threw",
          ms: 0,
        };
      }),
      giveUp: () => childAbortController.abort(),
    };
  } catch (error) {
    logUnlessStopped(error, params.callStop.signal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:64287-64331 placement
function logUnlessStopped(error, signal) {
  if (!signal.aborted && !isAbortError(error)) logError(error);
}
//@ chunk-tr0s0d0k.js:64331-64475 placement
function normalizeForwardedInput(tool, forwardedInput, cwd) {
  let parsed = safeParseToolInput(tool, forwardedInput);
  if (!parsed.success) return forwardedInput;
  let copy = {
    ...parsed.data,
  };
  if (cwd !== undefined) return resolveRemoteFilePathInput(copy, cwd);
  tool.backfillObservableInput?.(copy);
  return copy;
}
//@ chunk-tr0s0d0k.js:64475-64626 placement
function isSameDefinedFields(left, right) {
  let definedKeys = (object) => Object.keys(object).filter((key) => object[key] !== undefined);
  let leftKeys = definedKeys(left);
  return (
    leftKeys.length === definedKeys(right).length &&
    leftKeys.every((key) => right[key] !== undefined && isDeepStrictEqual(left[key], right[key]))
  );
}
//@ chunk-tr0s0d0k.js:64626-66050 placement
function escalateToAsk(decision, targetName, cause = "destructive") {
  if (decision.behavior !== "allow") return decision;
  let messages = {
    destructive: destructiveCommandAskMessage(targetName),
    classifier: `${targetName} would not decide this one on its own \u2014 it needs approval in this session.`,
    unresolved_shell_write: REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"],
    unreadable_shell_line: `${targetName} could not work out everything this command writes, so it cannot rule out a change to its own Claude Code settings files. The command needs approval in this session.`,
    settings_file_named: REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"],
    served_mcp: `${targetName} asks before one of its own MCP tools runs for a cloud session.`,
    served_mcp_path: `${targetName} asks before one of its own MCP tools runs with a path it cannot vouch for from here (a relative path, a pattern, a variable, an encoded or quoted spelling, or a directory above its Claude credentials) \u2014 check it does not reach this machine's Claude credentials before approving.`,
    served_mcp_web_address: `This call gives one of ${targetName}'s own MCP tools a web address, so it is checked before it runs.`,
    served_mcp_relative_path: `This call gives one of ${targetName}'s own MCP tools a name with a slash in it, so it is checked before it runs.`,
  };
  let reasons = {
    destructive: REMOTE_CALL_DESTRUCTIVE_ASK,
    classifier: REMOTE_CALL_CLASSIFIER_ASK,
    unresolved_shell_write: REMOTE_CALL_UNRESOLVED_SHELL_WRITE_ASK,
    unreadable_shell_line: REMOTE_CALL_UNRESOLVED_SHELL_WRITE_ASK,
    settings_file_named: REMOTE_CALL_SETTINGS_FILE_NAMED_ASK,
    served_mcp: REMOTE_CALL_SERVED_MCP_ASK,
    served_mcp_path: REMOTE_CALL_SERVED_MCP_ASK,
    served_mcp_web_address: REMOTE_CALL_CLASSIFIER_ASK,
    served_mcp_relative_path: REMOTE_CALL_CLASSIFIER_ASK,
  };
  return {
    behavior: "ask",
    message: messages[cause],
    updatedInput: decision.updatedInput,
    decisionReason: {
      type: "other",
      reason: reasons[cause],
    },
  };
}
//@ chunk-tr0s0d0k.js:66050-68726 placement
async function resolveServedAsk(decision, params, input, toolUseContext, extras) {
  if (decision.behavior !== "ask") return decision;
  let askedInput =
    "updatedInput" in decision && decision.updatedInput !== undefined ? decision.updatedInput : input;
  let forwardedInput = normalizeForwardedInput(extras.tool, params.forwardedInput);
  let inputRewritten = !isSameDefinedFields(askedInput, forwardedInput);
  let hookRewrites = toolUseContext.remoteCall?.hookRewrites;
  let rewriteKind = !inputRewritten
    ? "none"
    : hookRewrites !== undefined &&
        hookRewrites.every(
          (hookRewrite) =>
            hookRewrite.byOwnHook &&
            isPlainObject_2(hookRewrite.handed) &&
            isSameDefinedFields(hookRewrite.handed, forwardedInput),
        ) &&
        hookRewrites.some((hookRewrite) => isSameDefinedFields(hookRewrite.proposed, askedInput))
      ? "own_hooks_alone"
      : "unvouched";
  if (inputRewritten)
    logForDebugging(
      `[remote-tools call=${extras.callId}] ask input rewritten by a hook here; prior answer${rewriteKind === "unvouched" ? " and classifier" : ""} set aside tool=${extras.tool.name}`,
    );
  if (params.stance.onAsk === "allow")
    return {
      behavior: "allow",
      updatedInput: askedInput,
      decisionReason: decision.decisionReason,
    };
  if (params.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  if (decision.behavior === "ask" && isHostWordedAsk(decision))
    return forwardHostWordedAsk(extras.tool.name, "a cloud session", {
      hostWorded: decision.hostDisplay !== undefined,
      forMcpSkill: decision.metadata?.mcpSkill !== undefined,
    });
  let { classifierEligible, vetoed, ownCheck, askClass } = await runServedClassifier({
    mayAnswer: () =>
      classifierRewriteVerdict(
        decision,
        toolUseContext,
        extras,
        rewriteKind,
        params.sessionMode,
        params.stance.unattended,
      ),
    checkAhead: params.ownCheckAhead,
    tool: extras.tool,
    input: askedInput,
    permissionContext: getToolPermissionContext(toolUseContext),
    serviceWrittenSessionMode: params.serviceWrittenSessionMode,
    stopSignal: params.stopSignal,
    callId: toolUseContext.remoteCall?.origin.callId ?? extras.callId,
    legDeadlineAt: params.legDeadlineAt,
  });
  if (params.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  let promise = new Promise((resolve, reject) => {
    try {
      let forcedByHook = extras.forcedByHook || toolUseContext.hookAskFloor === true;
      let priorAnswerOk =
        !extras.raisedToAsk &&
        !vetoed &&
        !extras.unresolvedShellWrite &&
        !isServedMcpAsk(decision, extras.tool) &&
        !inputRewritten &&
        !extras.networkPath &&
        isEscalatableAsk(decision, extras.tool, forcedByHook, askedInput);
      let offersRule = !inputRewritten && !extras.raisedWhateverAllows && offersAlwaysAllowRule(decision);
      let modeNote =
        !classifierEligible &&
        !extras.raisedToAsk &&
        !inputRewritten &&
        isAskEscalatable(decision, extras.tool, forcedByHook, askedInput) &&
        mayAnswerServedAsk(
          decision,
          extras.tool,
          forcedByHook,
          getToolPermissionContext(toolUseContext),
          extras.unresolvedShellWrite,
          extras.networkPath,
          extras.serverAskUnderPlanFloor,
        ).may
          ? servedModeNote(
              servedModeRelation({
                stance: params.stance,
                sessionMode: params.sessionMode,
                evaluatedMode: getToolPermissionContext(toolUseContext).mode,
              }),
              params.stance.unattended === "own_record" && isServedNutEnabled()
                ? autoModeRefusedForServedCallsWhy()
                : "none",
            )
          : undefined;
      let message =
        decision.decisionReason?.type === "hook"
          ? `PreToolUse hook on ${params.targetName}: ${decision.message}`
          : extras.unresolvedShellWrite &&
              decision.decisionReason?.type === "other" &&
              decision.decisionReason.bashMissKind === "no-rule-match" &&
              decision.message === decision.decisionReason.reason
            ? REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
            : decision.message;
      let outsideSandboxPrefix =
        !classifierEligible &&
        decision.decisionReason?.type !== "sandboxOverride" &&
        isNonMcpShellTool(extras.tool) &&
        scriptAsksToRunUnsandboxed(extras.tool, askedInput)
          ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.outside_sandbox"]} `
          : "";
      let settingsPrefix =
        extras.unresolvedShellWrite &&
        decision.decisionReason?.type !== "hook" &&
        message !== REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
          ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]} `
          : "";
      let ownCheckPrefix =
        vetoed && ownCheck !== undefined && decision.decisionReason?.type !== "hook"
          ? `${ownCheckMessage(ownCheck)} `
          : "";
      params.onAsk({
        message:
          outsideSandboxPrefix +
          settingsPrefix +
          ownCheckPrefix +
          (modeNote === undefined ? message : joinSentences(message, modeNote)),
        input: askedInput,
        decisionReason: decision.decisionReason?.type,
        heldHook:
          decision.decisionReason?.type === "hook" && decision.decisionReason.heldForServedCall === true,
        raisedToAsk: extras.raisedToAsk,
        classifierEligible,
        askClass,
        mcpPathWhy: extras.mcpPathWhy,
        priorAnswerOk,
        standingRowOffered: offersRule,
        suggestions: offersRule ? getSuggestedRuleStrings(decision) : [],
        answer: resolve,
      });
    } catch (error) {
      reject(error);
    }
  });
  let answer = await raceWithAbort(
    promise.catch(() => {
      return;
    }),
    params.stopSignal,
  );
  if (answer === undefined || params.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  return answer;
}
//@ chunk-tr0s0d0k.js:68726-69341 placement
async function runServedClassifier(params) {
  let eligibility = params.mayAnswer();
  let ahead = eligibility.may ? params.checkAhead?.() : undefined;
  let ownCheck = eligibility.may
    ? await (ahead !== undefined && isSameDefinedFields(ahead.input, params.input)
        ? ahead.check
        : runServedSafetyCheck({
            tool: params.tool,
            input: params.input,
            permissionContext: params.permissionContext,
            serviceWrittenSessionMode: params.serviceWrittenSessionMode,
            stopSignal: params.stopSignal,
            callId: params.callId,
            capMs: classifierBudgetMs(params.legDeadlineAt),
            ...(isServedHairEnabled() && {
              again: {
                legDeadlineAt: params.legDeadlineAt,
                besideHold: false,
              },
            }),
          }))
    : undefined;
  let vetoed = eligibility.may && ownCheck?.verdict !== "allow";
  let aborted = params.stopSignal.aborted;
  let afterCheck = eligibility.may && !aborted ? params.mayAnswer() : MAY_ANSWER;
  return {
    classifierEligible: eligibility.may && afterCheck.may && !vetoed && !aborted,
    vetoed,
    ownCheck,
    askClass: servedVerdictKind({
      first: eligibility,
      vetoed,
      ownCheck: ownCheck?.verdict,
      afterCheck,
      tool: params.tool,
    }),
  };
}
//@ chunk-tr0s0d0k.js:69341-69557 placement
function notifyAllowLanded(params, tool, decision, input) {
  if (decision.behavior !== "allow" || params.onAllowLanded === undefined || params.stopSignal.aborted)
    return;
  try {
    return params
      .onAllowLanded(tool, decision.updatedInput ?? input)
      ?.catch((error) => logUnlessStopped(error, params.stopSignal));
  } catch (error) {
    logUnlessStopped(error, params.stopSignal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:69557-69972 placement
function classifierRewriteVerdict(decision, toolUseContext, extras, rewriteKind, sessionMode, unattended) {
  if (rewriteKind !== "none" && !(rewriteKind === "own_hooks_alone" && isServedNeckEnabled()))
    return mayNotAnswer(rewriteKind === "own_hooks_alone" ? "rewrite_own_hooks" : "rewrite_unvouched");
  if (!isAutoOrPlanMode(sessionMode)) return mayNotAnswer("not_auto");
  let planRefusal = sessionMode === "plan" ? planModeUnattendedRefusal(unattended) : undefined;
  if (planRefusal !== undefined)
    return mayNotAnswer(planRefusal === "plan_setting" ? "plan_unbacked" : unattendedStanceKind(unattended));
  return decideServedAskAnswerability(
    decision,
    extras.tool,
    extras.forcedByHook || toolUseContext.hookAskFloor === true,
    getToolPermissionContext(toolUseContext),
    extras.unresolvedShellWrite,
    extras.networkPath,
    extras.serverAskUnderPlanFloor,
    unattended,
    extras.fastPathEdit,
  );
}
//@ chunk-tr0s0d0k.js:69972-70181 placement
function decideServedAskAnswerability(
  decision,
  tool,
  forcedByHook,
  toolPermissionContext,
  unresolvedShellWrite,
  networkPath,
  serverAskUnderPlanFloor,
  unattended,
  fastPathEdit,
) {
  if (decision.behavior !== "ask" || forcedByHook || unresolvedShellWrite)
    return mayNotAnswer(unanswerableAskKind(decision, forcedByHook));
  if (!isUnattendedOwnRecord(unattended)) return mayNotAnswer(unattendedStanceKind(unattended));
  if (
    unattended === "own_record" &&
    unattendedServingAllowedByHostFlag() &&
    !isNonMcpShellTool(tool) &&
    !isBrowserToolAutoAllowed(tool) &&
    !(fastPathEdit && isServedFrogEnabled())
  )
    return mayNotAnswer("consent");
  return mayAnswerServedAsk(
    decision,
    tool,
    forcedByHook,
    toolPermissionContext,
    unresolvedShellWrite,
    networkPath,
    serverAskUnderPlanFloor,
  );
}
//@ chunk-tr0s0d0k.js:70181-70968 placement
function mayAnswerServedAsk(
  decision,
  tool,
  forcedByHook,
  toolPermissionContext,
  unresolvedShellWrite,
  networkPath,
  serverAskUnderPlanFloor,
) {
  if (decision.behavior !== "ask" || forcedByHook || unresolvedShellWrite)
    return mayNotAnswer(unanswerableAskKind(decision, forcedByHook));
  if (tool.requiresUserInteraction?.() === true) return mayNotAnswer("requires_user_interaction");
  if (tool.mcpInfo?.effectiveMaxPermission === "ask") return mayNotAnswer("org_ceiling");
  if (isServedMcpAsk(decision, tool)) return mayNotAnswer("mcp_path");
  if (decision.decisionReason?.type === "hook") return mayNotAnswer(hookAskKind(decision));
  if (
    serverAskUnderPlanFloor ||
    (decision.decisionReason?.type === "mode" && decision.decisionReason.mode === "plan")
  )
    return mayNotAnswer("plan_floor");
  if (isSandboxOverrideUnderReadBlock(decision.decisionReason, toolPermissionContext))
    return mayNotAnswer("sandbox_override_read_block");
  let carriesAskIntent = carriesAskRuleIntent(decision);
  let serverPolicyAsk =
    isServerPolicyAskReason(decision.decisionReason) || decision.matchedAskRule?.source === "mcpServerPolicy";
  if (carriesAskIntent && !serverPolicyAsk) return mayNotAnswer("ask_rule");
  let safetyCheckReason = findSafetyCheckReason(
    decision.decisionReason,
    (safetyReason) =>
      (!safetyReason.classifierApprovable &&
        !(
          safetyReason.circuitBreaker === "backgroundOperator" &&
          (safetyReason.also ?? []).length === 0 &&
          isServedFerruleEnabled()
        )) ||
      (isHostPersonOnlyCircuitBreaker(safetyReason) && isViolinPurflingGateEnabled()),
  );
  if (safetyCheckReason !== undefined) return mayNotAnswer(safetyCheckKind(safetyCheckReason));
  return networkPath ? mayNotAnswer("network_path") : MAY_ANSWER;
}
//@ chunk-tr0s0d0k.js:70968-71049 placement
function isEscalatableAsk(decision, tool, forcedByHook, input = {}) {
  return (
    isAskEscalatable(decision, tool, forcedByHook, input) &&
    findSafetyCheckReason(decision.decisionReason, () => true) === undefined
  );
}
//@ chunk-tr0s0d0k.js:71049-71290 placement
function isAskEscalatable(decision, tool, forcedByHook, input) {
  if (decision.behavior !== "ask" || forcedByHook) return false;
  if (input.dangerouslyDisableSandbox === true) return false;
  if (tool.requiresUserInteraction?.() === true) return false;
  if (decision.decisionReason?.type === "hook") return false;
  return decision.decisionReason?.type !== "sandboxOverride";
}
//@ chunk-tr0s0d0k.js:71290-71389 placement
function isServedMcpAsk(decision, tool) {
  return (
    (FORCE_NOT_REMOTELY_EXECUTABLE && isNotRemotelyExecutable(tool)) ||
    (decision.decisionReason?.type === "other" &&
      decision.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK)
  );
}
//@ chunk-tr0s0d0k.js:71389-71598 placement
function offersAlwaysAllowRule(decision) {
  return (
    shouldShowAlwaysAllowOptions() &&
    decision.behavior === "ask" &&
    decision.suggestions !== undefined &&
    decision.suggestions.some((suggestion) => suggestion.type === "addRules") &&
    decision.suppressAlwaysAllowRule !== true &&
    findSafetyCheckReason(decision.decisionReason, (reason) => !reason.classifierApprovable) === undefined
  );
}
//@ chunk-tr0s0d0k.js:71598-71762 placement = extractRules (0.851)
function getSuggestedRuleStrings(result) {
  if (result.behavior !== "ask" || result.suggestions === undefined) return [];
  return result.suggestions
    .flatMap((update) =>
      update.type === "addRules" ? update.rules.map((rule) => formatPermissionRule(rule)) : [],
    )
    .slice(0, SERVED_DECISION_REASONS);
}
//@ chunk-tr0s0d0k.js:71762-71953 placement
function raceWithAbort(promise, stopSignal) {
  return new Promise((resolve) => {
    if (stopSignal.aborted) {
      resolve(undefined);
      return;
    }
    let onAbort = () => resolve(undefined);
    stopSignal.addEventListener("abort", onAbort, {
      once: true,
    });
    promise.then(resolve).finally(() => stopSignal.removeEventListener("abort", onAbort));
  });
}
//@ chunk-tr0s0d0k.js:71953-72151 placement
function findDenyRuleSource(decisionReason) {
  if (decisionReason?.type === "rule") return decisionReason.rule.source;
  if (decisionReason?.type === "subcommandResults")
    for (let [, result] of decisionReason.reasons) {
      let source = result.behavior === "deny" ? findDenyRuleSource(result.decisionReason) : undefined;
      if (source !== undefined) return source;
    }
  return;
}
//@ chunk-tr0s0d0k.js:72151-72317 placement
function refusalAsAllowLandsDecision(params) {
  let message = params.refusalAsAllowLands?.();
  return message === undefined
    ? undefined
    : {
        behavior: "deny",
        message,
        decisionReason: {
          type: "other",
          reason: REMOTE_CALL_NOT_RUN_HERE,
        },
        decideLocation: "ask-path",
      };
}
//@ chunk-tr0s0d0k.js:72317-72684 placement
function servedDecisionOutcome(answer, asked) {
  let reason =
    answer.behavior === "deny" && answer.decisionReason.type === "other"
      ? answer.decisionReason.reason
      : undefined;
  if (reason === SERVED_STOP_REASONS || reason === REMOTE_CALL_NOT_RUN_HERE) return "stopped";
  if (asked.behavior !== "ask") return answer.behavior === "allow" ? "allowed" : "denied_by_rule";
  if (answer.behavior === "allow") return "approved_by_session";
  if (reason !== undefined && isUnforwardedHostAsk(reason)) return "ask_refused_no_surface";
  return reason === ASK_ENDED_REASON ? "stopped" : "denied_by_session";
}
export {
  REMOTE_CALL_SESSION_ANSWER,
  isPlanFloor,
  servedPermissionContext,
  servedModeTelemetry,
  tryAutoModeAllowlist,
  effectiveServedMode,
  isUnattendedOwnRecord,
  createServedCallPermissionCheck,
  FORCE_NOT_REMOTELY_EXECUTABLE,
};
