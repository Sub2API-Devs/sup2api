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
function isNotRemotelyExecutable(e) {
  return e.isMcp === true || !getToolRemoteExecution(e).supported;
}
//@ chunk-tr0s0d0k.js:51809-51945 placement
function destructiveCommandAskMessage(e) {
  return `This command is flagged as destructive. ${e} asks before running destructive commands sent from a cloud session.`;
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
function effectiveServedMode(e) {
  if (e.stance.mode !== "session")
    return {
      mode: e.stance.mode,
      capped: false,
      autoRefusedHere: false,
    };
  let n = e.call ?? DEFAULT_SERVING_POLICY;
  let sessionMode = e.sessionMode ?? "default";
  let autoRefusedHere = e.sessionMode === "auto" || e.sessionMode === "bypassPermissions";
  if (isUnattendedAutoAllowed(e.stance, e.sessionMode, n))
    return {
      mode: "acceptEdits",
      capped: sessionMode === "bypassPermissions",
      autoRefusedHere: false,
    };
  return {
    mode:
      (e.stance.unattended === "own_record" ||
        (e.stance.unattended === "conveyed" && n.modeDecidedByHost === true)) &&
      MODES_THAT_ALLOW_SERVED_CALLS.has(sessionMode)
        ? sessionMode
        : "default",
    capped: sessionMode === "bypassPermissions",
    autoRefusedHere,
  };
}
//@ chunk-tr0s0d0k.js:52938-53263 placement
function servedModeRelation(e) {
  if (e.stance.mode !== "session") return "fixed_stance";
  if (e.sessionMode === undefined) return "mode_absent";
  if (e.sessionMode === e.evaluatedMode) return "as_claimed";
  if (e.sessionMode === "auto" || e.sessionMode === "bypassPermissions")
    return e.evaluatedMode === "acceptEdits" ? "auto_fast_path" : "auto_refused_here";
  return "mode_unknown";
}
//@ chunk-tr0s0d0k.js:53263-53448 placement
function servedModeTelemetry(e) {
  let n = servedModeRelation(e);
  let session = e.sessionMode ?? "absent";
  return n === "auto_fast_path"
    ? {
        session,
        evaluated: "auto",
        step: "accept_edits_fast_path",
      }
    : {
        session,
        evaluated: e.evaluatedMode,
        why: n,
      };
}
//@ chunk-tr0s0d0k.js:53448-53912 placement
function servedModeNote(e, n = "none") {
  switch (e) {
    case "fixed_stance":
    case "as_claimed":
    case "auto_fast_path":
      return;
    case "auto_refused_here":
      return n === "none"
        ? `This computer is not accepting auto mode from cloud sessions right now, so it checked this in ${permissionModeTitle("default").toLowerCase()} mode.`
        : REMOTE_TOOLS_CONSENT_TEXT[`auto_off.reason.${n}`];
    case "mode_absent":
    case "mode_unknown":
      return `This computer could not tell which mode the session is in, so it checked this in ${permissionModeTitle("default").toLowerCase()} mode.`;
  }
}
//@ chunk-tr0s0d0k.js:53912-53953 placement
var REMOTE_CALL_AUTO_MODE_ALLOWLIST = "remote_call_auto_mode_allowlist";
//@ chunk-tr0s0d0k.js:53953-54157 placement
function isUnattendedAutoAllowed(stance, sessionMode, o) {
  if (sessionMode !== "auto" && sessionMode !== "bypassPermissions") return false;
  switch (stance.unattended) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return o.modeDecidedByHost === true;
    default: {
      let unattended = stance.unattended;
      return false;
    }
  }
}
//@ chunk-tr0s0d0k.js:54157-54265 placement
function isUnattendedOwnRecord(e) {
  switch (e) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return false;
    default: {
      let n = e;
      return false;
    }
  }
}
//@ chunk-tr0s0d0k.js:54265-54330 placement
function isPlanFloor(sessionMode, unattended = "own_record") {
  return sessionMode === "plan" && planModeUnattendedRefusal(unattended) === undefined;
}
//@ chunk-tr0s0d0k.js:54330-54443 placement
function planModeUnattendedRefusal(e) {
  if (!isUnattendedOwnRecord(e)) return "answers_refused";
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
function servedPermissionContext(e) {
  let n = e.call ?? DEFAULT_SERVING_POLICY;
  let { mode } = effectiveServedMode({
    stance: e.stance,
    sessionMode: e.sessionMode,
    call: n,
  });
  let r =
    isUnattendedAutoAllowed(e.stance, e.sessionMode, n) || isPlanFloor(e.sessionMode, e.stance.unattended);
  let s = shouldAllowManagedPermissionRulesOnly();
  let launchPermissions = getLaunchPermissions();
  let u = launchPermissions.launchedInAutoMode || isAutoModeActive();
  let p = e.userSettings?.held === true && projectSettingsAliasesUserSettings();
  let h = e.stance.honorLocalRules
    ? [
        ...applyHeldUserRules(loadAllPermissionRulesFromDisk(), e.userSettings, s).filter(
          (A) => !p || A.source !== "projectSettings" || A.ruleBehavior !== "allow",
        ),
        ...(s
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
              (A) =>
                !SESSION_RULE_SOURCES.has(A) &&
                !(A === "userSettings" && projectSettingsAliasesUserSettings()),
            )
            .flatMap((A) => getPermissionRulesForSource(A)),
          projectSettingsAliasesUserSettings() ? undefined : e.userSettings,
          false,
        ),
        ...launchDenyRules(launchPermissions),
      ].filter((A) => !SESSION_RULE_SOURCES.has(A.source) && A.ruleBehavior === "deny");
  let _ = new Set(
    overlyBroadShellAllowsStrippedByEverySession(h).map((A) => formatPermissionRule(A.ruleValue)),
  );
  let filtered = h.filter(
    (A) =>
      !isDangerousAllowRule(A.ruleBehavior, A.ruleValue, r || (A.source === "cliArg" && u)) &&
      !(A.ruleBehavior === "allow" && _.has(formatPermissionRule(A.ruleValue))),
  );
  let R = applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), filtered, {
    announce: false,
  });
  let honorLocalRules = e.stance.honorLocalRules;
  let L = {
    ...R,
    alwaysDenyRules: withHostCredentialDenyRules(
      R.alwaysDenyRules,
      e.stance.honorLocalRules && launchPermissions.toolsNarrowingDenyRules.length > 0
        ? {
            toolsNarrowing: [...launchPermissions.toolsNarrowingDenyRules],
          }
        : {},
    ),
    additionalWorkingDirectories: new Map([
      ...(e.stance.honorLocalRules
        ? [...launchPermissions.additionalWorkingDirectories].flatMap(([, A]) => {
            let O = {
              ...A,
              path: realpathOrSpelling(A.path),
            };
            if (launchedFromHome(A.path) || !notLaunchedFromHome(O)) return [];
            return [[O.path, O]];
          })
        : []),
      [
        e.launchDir,
        {
          path: e.launchDir,
          source: "session",
        },
      ],
    ]),
    mode,
    isBypassPermissionsModeAvailable: mode === "bypassPermissions",
    shouldAvoidPermissionPrompts: false,
    servedCall: true,
    ...(e.stance.honorLocalRules &&
      (hasBlockReadsOutsideWorkingDirectories() || isServedSettingRefused("read_block")) && {
        blockReadsOutsideWorkingDirectories: true,
      }),
    ...(e.stance.honorLocalRules &&
      (isWriteBlockOn() || isServedSettingRefused("write_block")) && {
        blockWritesOutsideWorkingDirectories: true,
      }),
    ...((!honorLocalRules ||
      useSecurityParser() ||
      !isStrictSandboxFullyConfigured() ||
      e.sandboxTurnedOnByHeldFile === true) && {
      sandboxAutoAllowSuspended: true,
    }),
  };
  if (e.stance.honorLocalRules) {
    let cliargAllows = launchPermissions.allowRules.length;
    logDroppedServedRules({
      cliarg_allows: cliargAllows,
      cliarg_allows_kept: (L.alwaysAllowRules.cliArg ?? []).length,
      startup_dirs: launchPermissions.additionalWorkingDirectories.size,
      startup_dirs_kept: L.additionalWorkingDirectories.size - 1,
    });
  }
  let filtered_2 = (e.sessionUpdates ?? []).filter(
    (A) =>
      A.type === "addRules" &&
      !(s && A.behavior === "allow") &&
      !A.rules.some((rule) => isDangerousAllowRule(A.behavior, rule, r)) &&
      !(
        A.behavior === "allow" &&
        overlyBroadShellAllowsStrippedByEverySession(
          A.rules.map((ruleValue) => ({
            source: "session",
            ruleBehavior: "allow",
            ruleValue,
          })),
        ).length > 0
      ),
  );
  return filtered_2.length > 0
    ? {
        ...applyPermissionUpdates(L, filtered_2),
        mode,
      }
    : L;
}
//@ chunk-tr0s0d0k.js:56752-56786 placement
function notLaunchedFromHome(e) {
  return !launchedFromHome(e.path);
}
//@ chunk-tr0s0d0k.js:56786-56801 placement
var LOGGED_DROPPED_RULE_SETS = new Set();
//@ chunk-tr0s0d0k.js:56801-57055 placement
function logDroppedServedRules(e) {
  if (e.cliarg_allows === e.cliarg_allows_kept && e.startup_dirs === e.startup_dirs_kept) return;
  let joined = Object.entries(e)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  if (LOGGED_DROPPED_RULE_SETS.has(joined)) return;
  LOGGED_DROPPED_RULE_SETS.add(joined);
  logForDebugging(`[remote-tools] served-context screens dropped rules ${joined}`);
}
//@ chunk-tr0s0d0k.js:57055-57109 placement
function withHostCredentialDenyRules(alwaysDenyRules, n) {
  return {
    ...alwaysDenyRules,
    ...n,
    [HOST_CREDENTIAL_RULE_SOURCE]: hostCredentialDenyRules().map(formatPermissionRule),
  };
}
//@ chunk-tr0s0d0k.js:57109-57200 placement
function isDangerousAllowRule(e, n, o) {
  return (
    e === "allow" &&
    o &&
    (isDangerousClassifierPermission(n.toolName, n.ruleContent) || isAllowRuleIgnoredInAutoMode(n.toolName))
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
function createServedCallPermissionCheck(e) {
  return setPermissionPromptHostProbe(
    "servedCall",
    async (tool, r, s, d, u, p) => {
      let h = 0;
      let _ = false;
      let S;
      let R;
      let B = Object.create(tool, {
        checkPermissions: {
          value: async (...se) => {
            h += 1;
            try {
              let ee = await tool.checkPermissions(...se);
              h -= 1;
              return ee;
            } catch (error) {
              S = classifyToolErrorSafely(error);
              throw error;
            }
          },
        },
        inputSchema: {
          get: () =>
            Object.create(tool.inputSchema, {
              parse: {
                value: (...se) => {
                  _ = true;
                  try {
                    let ee = tool.inputSchema.parse(...se);
                    _ = false;
                    return ee;
                  } catch (error) {
                    R = classifyToolErrorSafely(error);
                    throw error;
                  }
                },
              },
            }),
        },
      });
      let L = p?.behavior === "ask" ? await checkRuleBasedPermissions(B, r, s) : null;
      let V = p?.decisionReason?.type === "hook" && p.decisionReason.hookName === TOOL_CHECK;
      let A =
        p === undefined || p.behavior === "allow"
          ? await hasPermissionsToUseTool(B, r, s, d, u)
          : L?.behavior === "deny" && !V
            ? L
            : p;
      if (h > 0 || _) {
        e.onOutcome({
          kind: "denied_by_rule",
          raisedToAsk: false,
          rulesCheckCrashed: {
            inputParseThrew: _,
            crashClass: (_ ? R : S) ?? lit("UnknownError"),
          },
        });
        return {
          behavior: "deny",
          message: permissionCheckFailedMessage({
            targetName: e.targetName,
            toolName: tool.name,
          }),
          decisionReason: {
            type: "other",
            reason: PERMISSION_CHECK_CRASHED_REASON,
          },
        };
      }
      let O = (se) => {
        if (e.permissionContextNow === undefined || !readServedBackgroundOverride()) return;
        if (se === "asked") return getToolPermissionContext(s);
        try {
          return e.permissionContextNow();
        } catch (error) {
          logError(
            Error("the rules a served MCP relative name is judged again under could not be read", {
              cause: error,
            }),
          );
          return;
        }
      };
      let X = judgeServedMcpPaths(tool, r, O("asked"));
      let J = X?.kind === "ask";
      let K = X?.kind === "web_address";
      let j = X?.kind === "relative_path";
      let G =
        A.behavior === "deny"
          ? hostCredentialRuleOf(A.decisionReason)
          : ((await getHostCredentialDenyRule(tool, r)) ?? (X?.kind === "deny" ? X.rule : undefined));
      let M = A;
      if (G !== undefined) {
        let se = credentialRuleKind(G);
        let message = credentialRefusalMessage({
          targetName: e.targetName,
          kind: se,
          subject: se === "keychain" && typeof r.command === "string" ? r.command : stripDoubleSlashPrefix(G),
        });
        M =
          A.behavior === "deny"
            ? {
                ...A,
                message,
              }
            : {
                behavior: "deny",
                decisionReason: {
                  type: "rule",
                  rule: G,
                },
                message,
              };
      }
      let Z = "updatedInput" in M && M.updatedInput !== undefined ? M.updatedInput : r;
      let ce =
        M.behavior !== "deny" && isNonMcpShellTool(tool) && isViolinPurflingEnabled()
          ? await shouldBypassAskForReadOnly(tool, Z, M, getCwd())
          : "none";
      let command = Z.command;
      let re =
        isViolinCamberEnabled() &&
        ce === "uncertain" &&
        tool.name === BASH_TOOL_NAME &&
        typeof command === "string"
          ? await parseServedShellLine(command)
          : undefined;
      let U =
        re === undefined
          ? undefined
          : {
              ...Z,
              command: re,
            };
      let Y = U === undefined ? ce : await shouldBypassAskForReadOnly(tool, U, M, getCwd());
      let ie = Y === "uncertain";
      let y = isViolinArchingEnabled();
      let E = isViolinEbonyEnabled();
      let P = M.behavior !== "deny" && isViolinPurflingGateEnabled();
      let w =
        y &&
        P &&
        isNonMcpShellTool(tool) &&
        ((await isServedLineWriting(tool, Z, s)) ||
          (U !== undefined && (await isServedLineWriting(tool, U, s))));
      let D = y && ie && isViolinTailgutEnabled();
      let T =
        w || D ? await checkServedShellSettingsWrite(tool.name, Z, getCwd(), e.stopSignal, E) : undefined;
      let W =
        T !== undefined && U !== undefined
          ? await checkServedShellSettingsWrite(tool.name, U, getCwd(), e.stopSignal, E)
          : undefined;
      let q =
        T === undefined || W === undefined
          ? T
          : {
              file: T.file !== "none" ? T.file : W.file,
              fileOrFolder: T.fileOrFolder !== "none" ? T.fileOrFolder : W.fileOrFolder,
            };
      let Q = y
        ? w && q?.file !== "none"
        : P &&
          ((await servedLineTouchesProtectedPath(tool, Z, s, E)) ||
            (U !== undefined && (await servedLineTouchesProtectedPath(tool, U, s, E))));
      let te = isRefactoredGadgetEnabled()
        ? Q &&
          (touchesProtectedPath(Z, "own_file") || (U !== undefined && touchesProtectedPath(U, "own_file")))
        : Q ||
          (ie &&
            (y
              ? !D || q?.fileOrFolder !== "none"
              : !isViolinTailgutEnabled() ||
                touchesProtectedPath(Z, "file_or_folder") ||
                (U !== undefined && touchesProtectedPath(U, "file_or_folder"))));
      let Ae = Q ? (q?.file ?? "error") : D ? (q?.fileOrFolder ?? "error") : "none";
      if (Y !== "none" || Q)
        logEvent("tengu_served_shell_settings_hold", {
          verdict: fromEnum(Y),
          tool: fromEnum(tool.name === BASH_TOOL_NAME ? "bash" : "powershell"),
          person_only: te,
          ...(y && {
            cause: fromEnum(Ae),
          }),
        });
      if (Y === "settings")
        M = {
          behavior: "deny",
          message: settingsDirRefusalMessage({
            targetName: e.targetName,
          }),
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_HOST_SETTINGS_SHELL_WRITE,
          },
        };
      else if (
        M.behavior !== "deny" &&
        !isNonMcpShellTool(tool) &&
        isViolinPurflingGateEnabled() &&
        typeof tool.getPath === "function" &&
        !tool.isReadOnly(Z, s) &&
        settingsFileCertainty(getPathsForPermissionCheck(tool.getPath(Z))) === "certain"
      ) {
        logEvent("tengu_served_settings_edit_refused", {
          tool: fromEnum(
            tool.name === FILE_EDIT_TOOL_NAME
              ? "edit"
              : tool.name === FILE_WRITE_TOOL_NAME
                ? "write"
                : "other",
          ),
          engine: fromEnum(M.behavior),
        });
        M = {
          behavior: "deny",
          message: settingsFileRefusalMessage({
            targetName: e.targetName,
          }),
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_HOST_SETTINGS_EDIT,
          },
        };
      }
      if (s.remoteCall === undefined)
        logError(
          Error(
            "served permission step ran with no call record: a PreToolUse hook's refusal or question cannot be held",
          ),
        );
      let strictestHookAnswer = s.remoteCall?.strictestHookAnswer;
      if (strictestHookAnswer?.behavior === "deny") {
        logForDebugging(
          `[remote-tools call=${u}] refused by a PreToolUse hook here; ${M.behavior} after it set aside tool=${tool.name}`,
        );
        return strictestHookAnswer;
      }
      if (strictestHookAnswer !== undefined && M.behavior === "allow") {
        logForDebugging(
          `[remote-tools call=${u}] asked about by a PreToolUse hook here; allow after it raised back to that question tool=${tool.name}`,
        );
        M = {
          ...strictestHookAnswer,
          updatedInput: M.updatedInput,
        };
      }
      let ge =
        e.stance.askOnDestructive &&
        tool.name === BASH_TOOL_NAME &&
        typeof r.command === "string" &&
        r.command !== "" &&
        isDestructiveCommand(r.command);
      let Be = isNotRemotelyExecutable(tool) && (FORCE_NOT_REMOTELY_EXECUTABLE || J);
      let He = isUnattendedAutoAllowed(e.stance, e.sessionMode, e.call ?? DEFAULT_SERVING_POLICY);
      let An =
        e.sessionModel !== undefined &&
        He &&
        M.behavior === "allow" &&
        M.decisionReason?.type === "mode" &&
        M.decisionReason.mode === "acceptEdits" &&
        isFileMutationTool(tool.name) &&
        shouldClassifyEdits(e.sessionModel);
      let wo = (He || isPlanFloor(e.sessionMode, e.stance.unattended)) && isNeverDestructiveTool(tool.name);
      let _e = (ge || Be || K || j || An || wo || ie || Q) && M.behavior === "allow";
      let bn = M.behavior === "ask" && M.personOnly === true;
      let Rn =
        ge ||
        Be ||
        K ||
        j ||
        Q ||
        (ie && tool.name === BASH_TOOL_NAME) ||
        strictestHookAnswer !== undefined ||
        bn;
      let En = An && !Rn;
      let bo = M.behavior === "allow" && M.decisionReason?.type === "classifier";
      let he =
        _e || bo
          ? escalateToAsk(
              M,
              e.targetName,
              Be
                ? J
                  ? "served_mcp_path"
                  : "served_mcp"
                : ge
                  ? "destructive"
                  : Q && !ie
                    ? "settings_file_named"
                    : te
                      ? "unresolved_shell_write"
                      : ie
                        ? "unreadable_shell_line"
                        : j
                          ? "served_mcp_relative_path"
                          : K
                            ? "served_mcp_web_address"
                            : "classifier",
            )
          : M;
      let Ue = (p !== undefined && M === p) || strictestHookAnswer !== undefined || bn;
      let oe =
        J &&
        he.behavior === "ask" &&
        !Ue &&
        he.decisionReason?.type !== "hook" &&
        !(he.decisionReason?.type === "other" && he.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK)
          ? {
              ...he,
              decisionReason: {
                type: "other",
                reason: REMOTE_CALL_SERVED_MCP_ASK,
              },
            }
          : he;
      let Pn =
        oe.behavior === "ask" &&
        (isDefenseInDepthAsk(M) || readsNetworkPath(tool, Z, getToolPermissionContext(s)));
      let Tn = oe.behavior === "ask" && isServerPolicyAskUnderPlanFloor(oe.decisionReason, tool, Z, s);
      if (
        !e.stopSignal.aborted &&
        He &&
        !K &&
        !j &&
        oe.behavior === "ask" &&
        !isHostWordedAsk(oe) &&
        decideServedAskAnswerability(
          oe,
          tool,
          Ue || s.hookAskFloor === true,
          getToolPermissionContext(s),
          te,
          Pn,
          Tn,
          e.stance.unattended,
          En,
        ).may &&
        isBrowserToolAutoAllowed(tool, r)
      ) {
        let se = {
          behavior: "allow",
          updatedInput: "updatedInput" in oe && oe.updatedInput !== undefined ? oe.updatedInput : r,
          decisionReason: {
            type: "other",
            reason: REMOTE_CALL_AUTO_MODE_ALLOWLIST,
          },
        };
        let ee = notifyAllowLanded(e, tool, se, r);
        let Ye =
          ee !== undefined && (await ee, e.stopSignal.aborted)
            ? STOPPED_BEFORE_ANSWER_DECISION
            : refusalAsAllowLandsDecision(e);
        if (Ye !== undefined) {
          e.onOutcome({
            kind: servedDecisionOutcome(Ye, se),
            raisedToAsk: _e,
          });
          return Ye;
        }
        e.onOutcome({
          kind: servedDecisionOutcome(se, se),
          raisedToAsk: _e,
          allowBasis: "auto_allowlist",
        });
        return se;
      }
      let servedAsk = await resolveServedAsk(oe, e, r, s, {
        raisedToAsk: _e,
        tool,
        forcedByHook: Ue,
        callId: u,
        unresolvedShellWrite: te,
        networkPath: Pn,
        serverAskUnderPlanFloor: Tn,
        fastPathEdit: En,
        raisedWhateverAllows: Rn,
        mcpPathWhy: X?.kind === "ask" ? X.why : j ? "relieved" : undefined,
      });
      let we =
        j &&
        servedAsk.behavior === "allow" &&
        judgeServedMcpPaths(tool, servedAsk.updatedInput ?? r, O("answered"))?.kind !== "relative_path"
          ? CONFIRMATION_FAILED_DECISION
          : servedAsk;
      let Mn = notifyAllowLanded(e, tool, we, r);
      if (Mn !== undefined) await Mn;
      let aborted = we.behavior === "allow" && e.stopSignal.aborted;
      if (aborted)
        logEvent("tengu_remote_tool_allow_after_stop", {
          road: fromEnum(oe.behavior === "allow" ? "decided_here" : "ask_path"),
          is_mcp: tool.mcpInfo !== undefined,
        });
      let Ro = we.behavior === "allow" && !aborted ? refusalAsAllowLandsDecision(e) : undefined;
      let Ze = aborted ? STOPPED_BEFORE_ANSWER_DECISION : (Ro ?? we);
      e.onOutcome({
        kind: servedDecisionOutcome(Ze, oe),
        raisedToAsk: _e,
        ...(G !== undefined && {
          throughSecondRootMount: isMountPointRule(G),
        }),
        ...(A === L && {
          deniedUnderForcedAsk: true,
        }),
        ...(oe.behavior === "allow" &&
          Ze.behavior === "allow" && {
            allowBasis: oe.decisionReason?.type ?? "unspecified",
          }),
        ...(oe.behavior === "deny" && {
          denySource: findDenyRuleSource(oe.decisionReason),
          hostCredentialRefusal: G && credentialRuleKind(G),
          underWindowsProfileGlob: G && isUnderUserProfiles(stripDoubleSlashPrefix(G)),
        }),
      });
      return Ze;
    },
    () => true,
  );
}
//@ chunk-tr0s0d0k.js:63626-64287 placement
function tryAutoModeAllowlist(e) {
  try {
    if (
      !isServedHairEnabled() ||
      e.stance.onAsk !== "session" ||
      !isNonMcpShellTool(e.tool) ||
      !isNeverDestructiveTool(e.tool.name) ||
      !isUnattendedOwnRecord(e.stance.unattended) ||
      !(
        isUnattendedAutoAllowed(e.stance, e.sessionMode, e.call ?? DEFAULT_SERVING_POLICY) ||
        isPlanFloor(e.sessionMode, e.stance.unattended)
      ) ||
      !isAutoOrPlanMode(e.sessionMode)
    )
      return;
    let input = normalizeForwardedInput(e.tool, e.forwardedInput);
    let childAbortController = createChildAbortController(e.callStop);
    return {
      input,
      check: runServedSafetyCheck({
        tool: e.tool,
        input,
        permissionContext: e.permissionContext,
        serviceWrittenSessionMode: e.serviceWrittenSessionMode,
        stopSignal: childAbortController.signal,
        callId: e.callId,
        capMs: classifierBudgetMs(e.legDeadlineAt),
        again: {
          legDeadlineAt: e.legDeadlineAt,
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
    logUnlessStopped(error, e.callStop.signal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:64287-64331 placement
function logUnlessStopped(error, n) {
  if (!n.aborted && !isAbortError(error)) logError(error);
}
//@ chunk-tr0s0d0k.js:64331-64475 placement
function normalizeForwardedInput(tool, forwardedInput, o) {
  let r = safeParseToolInput(tool, forwardedInput);
  if (!r.success) return forwardedInput;
  let s = {
    ...r.data,
  };
  if (o !== undefined) return resolveRemoteFilePathInput(s, o);
  tool.backfillObservableInput?.(s);
  return s;
}
//@ chunk-tr0s0d0k.js:64475-64626 placement
function isSameDefinedFields(e, n) {
  let o = (s) => Object.keys(s).filter((key) => s[key] !== undefined);
  let r = o(e);
  return r.length === o(n).length && r.every((s) => n[s] !== undefined && isDeepStrictEqual(e[s], n[s]));
}
//@ chunk-tr0s0d0k.js:64626-66050 placement
function escalateToAsk(e, targetName, o = "destructive") {
  if (e.behavior !== "allow") return e;
  let r = {
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
  let s = {
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
    message: r[o],
    updatedInput: e.updatedInput,
    decisionReason: {
      type: "other",
      reason: s[o],
    },
  };
}
//@ chunk-tr0s0d0k.js:66050-68726 placement
async function resolveServedAsk(result, n, o, r, s) {
  if (result.behavior !== "ask") return result;
  let d = "updatedInput" in result && result.updatedInput !== undefined ? result.updatedInput : o;
  let u = normalizeForwardedInput(s.tool, n.forwardedInput);
  let p = !isSameDefinedFields(d, u);
  let hookRewrites = r.remoteCall?.hookRewrites;
  let _ = !p
    ? "none"
    : hookRewrites !== undefined &&
        hookRewrites.every(
          (hookRewrite) =>
            hookRewrite.byOwnHook &&
            isPlainObject_2(hookRewrite.handed) &&
            isSameDefinedFields(hookRewrite.handed, u),
        ) &&
        hookRewrites.some((hookRewrite) => isSameDefinedFields(hookRewrite.proposed, d))
      ? "own_hooks_alone"
      : "unvouched";
  if (p)
    logForDebugging(
      `[remote-tools call=${s.callId}] ask input rewritten by a hook here; prior answer${_ === "unvouched" ? " and classifier" : ""} set aside tool=${s.tool.name}`,
    );
  if (n.stance.onAsk === "allow")
    return {
      behavior: "allow",
      updatedInput: d,
      decisionReason: result.decisionReason,
    };
  if (n.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  if (result.behavior === "ask" && isHostWordedAsk(result))
    return forwardHostWordedAsk(s.tool.name, "a cloud session", {
      hostWorded: result.hostDisplay !== undefined,
      forMcpSkill: result.metadata?.mcpSkill !== undefined,
    });
  let { classifierEligible, vetoed, ownCheck, askClass } = await runServedClassifier({
    mayAnswer: () => classifierRewriteVerdict(result, r, s, _, n.sessionMode, n.stance.unattended),
    checkAhead: n.ownCheckAhead,
    tool: s.tool,
    input: d,
    permissionContext: getToolPermissionContext(r),
    serviceWrittenSessionMode: n.serviceWrittenSessionMode,
    stopSignal: n.stopSignal,
    callId: r.remoteCall?.origin.callId ?? s.callId,
    legDeadlineAt: n.legDeadlineAt,
  });
  if (n.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  let promise = new Promise((resolve, reject) => {
    try {
      let J = s.forcedByHook || r.hookAskFloor === true;
      let priorAnswerOk =
        !s.raisedToAsk &&
        !vetoed &&
        !s.unresolvedShellWrite &&
        !isServedMcpAsk(result, s.tool) &&
        !p &&
        !s.networkPath &&
        isEscalatableAsk(result, s.tool, J, d);
      let j = !p && !s.raisedWhateverAllows && offersAlwaysAllowRule(result);
      let G =
        !classifierEligible &&
        !s.raisedToAsk &&
        !p &&
        isAskEscalatable(result, s.tool, J, d) &&
        mayAnswerServedAsk(
          result,
          s.tool,
          J,
          getToolPermissionContext(r),
          s.unresolvedShellWrite,
          s.networkPath,
          s.serverAskUnderPlanFloor,
        ).may
          ? servedModeNote(
              servedModeRelation({
                stance: n.stance,
                sessionMode: n.sessionMode,
                evaluatedMode: getToolPermissionContext(r).mode,
              }),
              n.stance.unattended === "own_record" && isServedNutEnabled()
                ? autoModeRefusedForServedCallsWhy()
                : "none",
            )
          : undefined;
      let M =
        result.decisionReason?.type === "hook"
          ? `PreToolUse hook on ${n.targetName}: ${result.message}`
          : s.unresolvedShellWrite &&
              result.decisionReason?.type === "other" &&
              result.decisionReason.bashMissKind === "no-rule-match" &&
              result.message === result.decisionReason.reason
            ? REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
            : result.message;
      let Z =
        !classifierEligible &&
        result.decisionReason?.type !== "sandboxOverride" &&
        isNonMcpShellTool(s.tool) &&
        scriptAsksToRunUnsandboxed(s.tool, d)
          ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.outside_sandbox"]} `
          : "";
      let ce =
        s.unresolvedShellWrite &&
        result.decisionReason?.type !== "hook" &&
        M !== REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
          ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]} `
          : "";
      let ue =
        vetoed && ownCheck !== undefined && result.decisionReason?.type !== "hook"
          ? `${ownCheckMessage(ownCheck)} `
          : "";
      n.onAsk({
        message: Z + ce + ue + (G === undefined ? M : joinSentences(M, G)),
        input: d,
        decisionReason: result.decisionReason?.type,
        heldHook: result.decisionReason?.type === "hook" && result.decisionReason.heldForServedCall === true,
        raisedToAsk: s.raisedToAsk,
        classifierEligible,
        askClass,
        mcpPathWhy: s.mcpPathWhy,
        priorAnswerOk,
        standingRowOffered: j,
        suggestions: j ? getSuggestedRuleStrings(result) : [],
        answer: resolve,
      });
    } catch (error) {
      reject(error);
    }
  });
  let A = await raceWithAbort(
    promise.catch(() => {
      return;
    }),
    n.stopSignal,
  );
  if (A === undefined || n.stopSignal.aborted) return STOPPED_BEFORE_ANSWER_DECISION;
  return A;
}
//@ chunk-tr0s0d0k.js:68726-69341 placement
async function runServedClassifier(e) {
  let n = e.mayAnswer();
  let o = n.may ? e.checkAhead?.() : undefined;
  let r = n.may
    ? await (o !== undefined && isSameDefinedFields(o.input, e.input)
        ? o.check
        : runServedSafetyCheck({
            tool: e.tool,
            input: e.input,
            permissionContext: e.permissionContext,
            serviceWrittenSessionMode: e.serviceWrittenSessionMode,
            stopSignal: e.stopSignal,
            callId: e.callId,
            capMs: classifierBudgetMs(e.legDeadlineAt),
            ...(isServedHairEnabled() && {
              again: {
                legDeadlineAt: e.legDeadlineAt,
                besideHold: false,
              },
            }),
          }))
    : undefined;
  let s = n.may && r?.verdict !== "allow";
  let aborted = e.stopSignal.aborted;
  let u = n.may && !aborted ? e.mayAnswer() : MAY_ANSWER;
  return {
    classifierEligible: n.may && u.may && !s && !aborted,
    vetoed: s,
    ownCheck: r,
    askClass: servedVerdictKind({
      first: n,
      vetoed: s,
      ownCheck: r?.verdict,
      afterCheck: u,
      tool: e.tool,
    }),
  };
}
//@ chunk-tr0s0d0k.js:69341-69557 placement
function notifyAllowLanded(e, n, o, r) {
  if (o.behavior !== "allow" || e.onAllowLanded === undefined || e.stopSignal.aborted) return;
  try {
    return e.onAllowLanded(n, o.updatedInput ?? r)?.catch((error) => logUnlessStopped(error, e.stopSignal));
  } catch (error) {
    logUnlessStopped(error, e.stopSignal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:69557-69972 placement
function classifierRewriteVerdict(e, n, o, r, sessionMode, unattended) {
  if (r !== "none" && !(r === "own_hooks_alone" && isServedNeckEnabled()))
    return mayNotAnswer(r === "own_hooks_alone" ? "rewrite_own_hooks" : "rewrite_unvouched");
  if (!isAutoOrPlanMode(sessionMode)) return mayNotAnswer("not_auto");
  let u = sessionMode === "plan" ? planModeUnattendedRefusal(unattended) : undefined;
  if (u !== undefined)
    return mayNotAnswer(u === "plan_setting" ? "plan_unbacked" : unattendedStanceKind(unattended));
  return decideServedAskAnswerability(
    e,
    o.tool,
    o.forcedByHook || n.hookAskFloor === true,
    getToolPermissionContext(n),
    o.unresolvedShellWrite,
    o.networkPath,
    o.serverAskUnderPlanFloor,
    unattended,
    o.fastPathEdit,
  );
}
//@ chunk-tr0s0d0k.js:69972-70181 placement
function decideServedAskAnswerability(e, n, o, toolPermissionContext, s, d, u, p, h) {
  if (e.behavior !== "ask" || o || s) return mayNotAnswer(unanswerableAskKind(e, o));
  if (!isUnattendedOwnRecord(p)) return mayNotAnswer(unattendedStanceKind(p));
  if (
    p === "own_record" &&
    unattendedServingAllowedByHostFlag() &&
    !isNonMcpShellTool(n) &&
    !isBrowserToolAutoAllowed(n) &&
    !(h && isServedFrogEnabled())
  )
    return mayNotAnswer("consent");
  return mayAnswerServedAsk(e, n, o, toolPermissionContext, s, d, u);
}
//@ chunk-tr0s0d0k.js:70181-70968 placement
function mayAnswerServedAsk(e, n, o, r, s, d, u) {
  if (e.behavior !== "ask" || o || s) return mayNotAnswer(unanswerableAskKind(e, o));
  if (n.requiresUserInteraction?.() === true) return mayNotAnswer("requires_user_interaction");
  if (n.mcpInfo?.effectiveMaxPermission === "ask") return mayNotAnswer("org_ceiling");
  if (isServedMcpAsk(e, n)) return mayNotAnswer("mcp_path");
  if (e.decisionReason?.type === "hook") return mayNotAnswer(hookAskKind(e));
  if (u || (e.decisionReason?.type === "mode" && e.decisionReason.mode === "plan"))
    return mayNotAnswer("plan_floor");
  if (isSandboxOverrideUnderReadBlock(e.decisionReason, r))
    return mayNotAnswer("sandbox_override_read_block");
  let p = carriesAskRuleIntent(e);
  let h = isServerPolicyAskReason(e.decisionReason) || e.matchedAskRule?.source === "mcpServerPolicy";
  if (p && !h) return mayNotAnswer("ask_rule");
  let safetyCheckReason = findSafetyCheckReason(
    e.decisionReason,
    (S) =>
      (!S.classifierApprovable &&
        !(
          S.circuitBreaker === "backgroundOperator" &&
          (S.also ?? []).length === 0 &&
          isServedFerruleEnabled()
        )) ||
      (isHostPersonOnlyCircuitBreaker(S) && isViolinPurflingGateEnabled()),
  );
  if (safetyCheckReason !== undefined) return mayNotAnswer(safetyCheckKind(safetyCheckReason));
  return d ? mayNotAnswer("network_path") : MAY_ANSWER;
}
//@ chunk-tr0s0d0k.js:70968-71049 placement
function isEscalatableAsk(e, tool, o, r = {}) {
  return isAskEscalatable(e, tool, o, r) && findSafetyCheckReason(e.decisionReason, () => true) === undefined;
}
//@ chunk-tr0s0d0k.js:71049-71290 placement
function isAskEscalatable(e, n, o, r) {
  if (e.behavior !== "ask" || o) return false;
  if (r.dangerouslyDisableSandbox === true) return false;
  if (n.requiresUserInteraction?.() === true) return false;
  if (e.decisionReason?.type === "hook") return false;
  return e.decisionReason?.type !== "sandboxOverride";
}
//@ chunk-tr0s0d0k.js:71290-71389 placement
function isServedMcpAsk(e, n) {
  return (
    (FORCE_NOT_REMOTELY_EXECUTABLE && isNotRemotelyExecutable(n)) ||
    (e.decisionReason?.type === "other" && e.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK)
  );
}
//@ chunk-tr0s0d0k.js:71389-71598 placement
function offersAlwaysAllowRule(e) {
  return (
    shouldShowAlwaysAllowOptions() &&
    e.behavior === "ask" &&
    e.suggestions !== undefined &&
    e.suggestions.some((suggestion) => suggestion.type === "addRules") &&
    e.suppressAlwaysAllowRule !== true &&
    findSafetyCheckReason(e.decisionReason, (n) => !n.classifierApprovable) === undefined
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
function raceWithAbort(e, stopSignal) {
  return new Promise((resolve) => {
    if (stopSignal.aborted) {
      resolve(undefined);
      return;
    }
    let r = () => resolve(undefined);
    stopSignal.addEventListener("abort", r, {
      once: true,
    });
    e.then(resolve).finally(() => stopSignal.removeEventListener("abort", r));
  });
}
//@ chunk-tr0s0d0k.js:71953-72151 placement
function findDenyRuleSource(decisionReason) {
  if (decisionReason?.type === "rule") return decisionReason.rule.source;
  if (decisionReason?.type === "subcommandResults")
    for (let [, n] of decisionReason.reasons) {
      let o = n.behavior === "deny" ? findDenyRuleSource(n.decisionReason) : undefined;
      if (o !== undefined) return o;
    }
  return;
}
//@ chunk-tr0s0d0k.js:72151-72317 placement
function refusalAsAllowLandsDecision(e) {
  let n = e.refusalAsAllowLands?.();
  return n === undefined
    ? undefined
    : {
        behavior: "deny",
        message: n,
        decisionReason: {
          type: "other",
          reason: REMOTE_CALL_NOT_RUN_HERE,
        },
        decideLocation: "ask-path",
      };
}
//@ chunk-tr0s0d0k.js:72317-72684 placement
function servedDecisionOutcome(e, n) {
  let reason =
    e.behavior === "deny" && e.decisionReason.type === "other" ? e.decisionReason.reason : undefined;
  if (reason === SERVED_STOP_REASONS || reason === REMOTE_CALL_NOT_RUN_HERE) return "stopped";
  if (n.behavior !== "ask") return e.behavior === "allow" ? "allowed" : "denied_by_rule";
  if (e.behavior === "allow") return "approved_by_session";
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
