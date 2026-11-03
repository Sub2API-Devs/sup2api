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
import { RTe, resolveRemoteFilePathInput } from "../../../services/remoteTools/pathMapping.js";
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
import { OWt, launchDenyRules } from "../../../utils/teleport/dirSync.js";
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
  swt,
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
  nLe,
  shouldBypassAskForReadOnly,
  isServedLineWriting,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
} from "../../../tools/BashTool/readOnlyShellCheck.js";
import { n4s } from "../../../utils/hooks/servedHooks/hookSandbox.js";
import { applyPermissionUpdates } from "../../../utils/permissions/PermissionUpdate.js";
import { logForDebugging } from "../../../utils/debug.js";
import {
  HOST_CREDENTIAL_RULE_SOURCE,
  hostCredentialDenyRules,
  isUnderUserProfiles,
} from "./credentialPathGuards.js";
import { classifyToolError } from "../../../services/tools/toolExecution.js";
import { lit, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { Fet } from "../../../utils/permissions/permissionPromptHost.js";
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
  Ht,
  zt,
  Vt,
  jt,
  Ie,
  _n,
  Ut,
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
import { FL } from "../../../tools/shared/textSearchTools.js";
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
var SERVED_DECISION_REASONS = 16,
  REMOTE_CALL_SESSION_ANSWER = "remote_call_session_answer",
  REMOTE_CALL_DESTRUCTIVE_ASK = "remote_call_destructive_ask",
  REMOTE_CALL_CLASSIFIER_ASK = "remote_call_classifier_ask",
  REMOTE_CALL_SERVED_MCP_ASK = "remote_call_served_mcp_ask",
  REMOTE_CALL_HOST_SETTINGS_SHELL_WRITE = "remote_call_host_settings_shell_write",
  REMOTE_CALL_HOST_SETTINGS_EDIT = "remote_call_host_settings_edit",
  REMOTE_CALL_UNRESOLVED_SHELL_WRITE_ASK = "remote_call_unresolved_shell_write_ask",
  REMOTE_CALL_SETTINGS_FILE_NAMED_ASK = "remote_call_settings_file_named_ask",
  Exr = !1;
//@ chunk-tr0s0d0k.js:51756-51809 placement
function fo(e) {
  return e.isMcp === !0 || !getToolRemoteExecution(e).supported;
}
//@ chunk-tr0s0d0k.js:51809-51945 placement
function destructiveCommandAskMessage(e) {
  return `This command is flagged as destructive. ${e} asks before running destructive commands sent from a cloud session.`;
}
//@ chunk-tr0s0d0k.js:51945-52439 placement
var SERVED_STOP_REASONS = "remote_call_stopped",
  Ps = {
    behavior: "deny",
    message: "The call could not be confirmed after the answer, so it did not run.",
    decisionReason: { type: "other", reason: "remote_call_relative_path_not_confirmed" },
    decideLocation: "ask-path",
  },
  ke = {
    behavior: "deny",
    message: "The remote session's call was stopped before it was answered; it did not run.",
    decisionReason: { type: "other", reason: SERVED_STOP_REASONS },
    decideLocation: "ask-path",
  },
  REMOTE_CALL_NOT_RUN_HERE = "remote_call_not_run_here",
  Ts = new Set(["default", "plan", "dontAsk", "acceptEdits"]);
//@ chunk-tr0s0d0k.js:52439-52938 placement
function effectiveServedMode(e) {
  if (e.stance.mode !== "session") return { mode: e.stance.mode, capped: !1, autoRefusedHere: !1 };
  let n = e.call ?? RTe,
    o = e.sessionMode ?? "default",
    r = e.sessionMode === "auto" || e.sessionMode === "bypassPermissions";
  if (isUnattendedAutoAllowed(e.stance, e.sessionMode, n))
    return { mode: "acceptEdits", capped: o === "bypassPermissions", autoRefusedHere: !1 };
  return {
    mode:
      (e.stance.unattended === "own_record" ||
        (e.stance.unattended === "conveyed" && n.modeDecidedByHost === !0)) &&
      Ts.has(o)
        ? o
        : "default",
    capped: o === "bypassPermissions",
    autoRefusedHere: r,
  };
}
//@ chunk-tr0s0d0k.js:52938-53263 placement
function servedModeRelation(e) {
  if (e.stance.mode !== "session") return "fixed_stance";
  if (e.sessionMode === void 0) return "mode_absent";
  if (e.sessionMode === e.evaluatedMode) return "as_claimed";
  if (e.sessionMode === "auto" || e.sessionMode === "bypassPermissions")
    return e.evaluatedMode === "acceptEdits" ? "auto_fast_path" : "auto_refused_here";
  return "mode_unknown";
}
//@ chunk-tr0s0d0k.js:53263-53448 placement
function servedModeTelemetry(e) {
  let n = servedModeRelation(e),
    o = e.sessionMode ?? "absent";
  return n === "auto_fast_path"
    ? { session: o, evaluated: "auto", step: "accept_edits_fast_path" }
    : { session: o, evaluated: e.evaluatedMode, why: n };
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
function isUnattendedAutoAllowed(e, n, o) {
  if (n !== "auto" && n !== "bypassPermissions") return !1;
  switch (e.unattended) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return o.modeDecidedByHost === !0;
    default: {
      let unattended = e.unattended;
      return !1;
    }
  }
}
//@ chunk-tr0s0d0k.js:54157-54265 placement
function isUnattendedOwnRecord(e) {
  switch (e) {
    case "own_record":
      return !autoModeRefusedForServedCalls();
    case "conveyed":
      return !1;
    default: {
      let n = e;
      return !1;
    }
  }
}
//@ chunk-tr0s0d0k.js:54265-54330 placement
function isPlanFloor(e, n = "own_record") {
  return e === "plan" && planModeUnattendedRefusal(n) === void 0;
}
//@ chunk-tr0s0d0k.js:54330-54443 placement
function planModeUnattendedRefusal(e) {
  if (!isUnattendedOwnRecord(e)) return "answers_refused";
  return getUseAutoModeDuringPlan() && !isServedSettingRefused("plan_asks_a_person")
    ? void 0
    : "plan_setting";
}
//@ chunk-tr0s0d0k.js:54443-54467 placement
function _o(e) {
  return !1;
}
//@ chunk-tr0s0d0k.js:54467-54529 placement
var to = new Set(["projectSettings", "localSettings", "session"]);
/**
 * 为远程调用构造本机权限上下文：按服务立场（session/fixed）合并会话模式、规则来源与 CLI 允许规则。
 */
//@ chunk-tr0s0d0k.js:54529-56752 placement
function servedPermissionContext(e) {
  let n = e.call ?? RTe,
    { mode: mode } = effectiveServedMode({ stance: e.stance, sessionMode: e.sessionMode, call: n }),
    r =
      isUnattendedAutoAllowed(e.stance, e.sessionMode, n) || isPlanFloor(e.sessionMode, e.stance.unattended),
    s = shouldAllowManagedPermissionRulesOnly(),
    d = OWt(),
    u = d.launchedInAutoMode || isAutoModeActive(),
    p = e.userSettings?.held === !0 && projectSettingsAliasesUserSettings(),
    h = e.stance.honorLocalRules
      ? [
          ...applyHeldUserRules(loadAllPermissionRulesFromDisk(), e.userSettings, s).filter(
            (A) => !p || A.source !== "projectSettings" || A.ruleBehavior !== "allow",
          ),
          ...(s
            ? []
            : d.allowRules.map((allowRule) => ({
                source: "cliArg",
                ruleBehavior: "allow",
                ruleValue: permissionRuleValueFromString(allowRule),
              }))),
          ...launchDenyRules(d),
        ]
      : [
          ...applyHeldUserRules(
            getEnabledSettingSources()
              .filter((A) => !to.has(A) && !(A === "userSettings" && projectSettingsAliasesUserSettings()))
              .flatMap((A) => getPermissionRulesForSource(A)),
            projectSettingsAliasesUserSettings() ? void 0 : e.userSettings,
            !1,
          ),
          ...launchDenyRules(d),
        ].filter((A) => !to.has(A.source) && A.ruleBehavior === "deny"),
    _ = new Set(
      overlyBroadShellAllowsStrippedByEverySession(h).map((A) => formatPermissionRule(A.ruleValue)),
    ),
    filtered = h.filter(
      (A) =>
        !so(A.ruleBehavior, A.ruleValue, r || (A.source === "cliArg" && u)) &&
        !(A.ruleBehavior === "allow" && _.has(formatPermissionRule(A.ruleValue))),
    ),
    R = applyPermissionRulesToPermissionContext(getEmptyToolPermissionContext(), filtered, { announce: !1 }),
    honorLocalRules = e.stance.honorLocalRules,
    L = {
      ...R,
      alwaysDenyRules: xs(
        R.alwaysDenyRules,
        e.stance.honorLocalRules && d.toolsNarrowingDenyRules.length > 0
          ? { toolsNarrowing: [...d.toolsNarrowingDenyRules] }
          : {},
      ),
      additionalWorkingDirectories: new Map([
        ...(e.stance.honorLocalRules
          ? [...d.additionalWorkingDirectories].flatMap(([, A]) => {
              let O = { ...A, path: realpathOrSpelling(A.path) };
              if (launchedFromHome(A.path) || !Ns(O)) return [];
              return [[O.path, O]];
            })
          : []),
        [e.launchDir, { path: e.launchDir, source: "session" }],
      ]),
      mode: mode,
      isBypassPermissionsModeAvailable: mode === "bypassPermissions",
      shouldAvoidPermissionPrompts: !1,
      servedCall: !0,
      ...(e.stance.honorLocalRules &&
        (hasBlockReadsOutsideWorkingDirectories() || isServedSettingRefused("read_block")) && {
          blockReadsOutsideWorkingDirectories: !0,
        }),
      ...(e.stance.honorLocalRules &&
        (isWriteBlockOn() || isServedSettingRefused("write_block")) && {
          blockWritesOutsideWorkingDirectories: !0,
        }),
      ...((!honorLocalRules || nLe() || !n4s() || e.sandboxTurnedOnByHeldFile === !0) && {
        sandboxAutoAllowSuspended: !0,
      }),
    };
  if (e.stance.honorLocalRules) {
    let A = d.allowRules.length;
    logDroppedServedRules({
      cliarg_allows: A,
      cliarg_allows_kept: (L.alwaysAllowRules.cliArg ?? []).length,
      startup_dirs: d.additionalWorkingDirectories.size,
      startup_dirs_kept: L.additionalWorkingDirectories.size - 1,
    });
  }
  let filtered_2 = (e.sessionUpdates ?? []).filter(
    (A) =>
      A.type === "addRules" &&
      !(s && A.behavior === "allow") &&
      !A.rules.some((rule) => so(A.behavior, rule, r)) &&
      !(
        A.behavior === "allow" &&
        overlyBroadShellAllowsStrippedByEverySession(
          A.rules.map((rule) => ({ source: "session", ruleBehavior: "allow", ruleValue: rule })),
        ).length > 0
      ),
  );
  return filtered_2.length > 0 ? { ...applyPermissionUpdates(L, filtered_2), mode: mode } : L;
}
//@ chunk-tr0s0d0k.js:56752-56786 placement
function Ns(e) {
  return !launchedFromHome(e.path);
}
//@ chunk-tr0s0d0k.js:56786-56801 placement
var ro = new Set();
//@ chunk-tr0s0d0k.js:56801-57055 placement
function logDroppedServedRules(e) {
  if (e.cliarg_allows === e.cliarg_allows_kept && e.startup_dirs === e.startup_dirs_kept) return;
  let joined = Object.entries(e)
    .map(([o, r]) => `${o}=${r}`)
    .join(" ");
  if (ro.has(joined)) return;
  (ro.add(joined), logForDebugging(`[remote-tools] served-context screens dropped rules ${joined}`));
}
//@ chunk-tr0s0d0k.js:57055-57109 placement
function xs(e, n) {
  return { ...e, ...n, [HOST_CREDENTIAL_RULE_SOURCE]: hostCredentialDenyRules().map(formatPermissionRule) };
}
//@ chunk-tr0s0d0k.js:57109-57200 placement
function so(e, n, o) {
  return (
    e === "allow" &&
    o &&
    (isDangerousClassifierPermission(n.toolName, n.ruleContent) || isAllowRuleIgnoredInAutoMode(n.toolName))
  );
}
//@ chunk-tr0s0d0k.js:57200-57265 placement
function ao(e) {
  try {
    return classifyToolError(e);
  } catch {
    return lit("UnknownError");
  }
}
/**
 * 为远程调用包装 canUseTool：本机钩子、分类器二次检查、破坏性命令询问、设置文件写入判定。
 */
//@ chunk-tr0s0d0k.js:57265-63626 placement
function createServedCallPermissionCheck(e) {
  return Fet(
    "servedCall",
    async (o, r, s, d, u, p) => {
      let h = 0,
        _ = !1,
        S,
        R,
        create = Object.create(o, {
          checkPermissions: {
            value: async (...se) => {
              h += 1;
              try {
                let checkPermissions = await o.checkPermissions(...se);
                return ((h -= 1), checkPermissions);
              } catch (error) {
                throw ((S = ao(error)), error);
              }
            },
          },
          inputSchema: {
            get: () =>
              Object.create(o.inputSchema, {
                parse: {
                  value: (...se) => {
                    _ = !0;
                    try {
                      let parse = o.inputSchema.parse(...se);
                      return ((_ = !1), parse);
                    } catch (error) {
                      throw ((R = ao(error)), error);
                    }
                  },
                },
              }),
          },
        }),
        L = p?.behavior === "ask" ? await checkRuleBasedPermissions(create, r, s) : null,
        V = p?.decisionReason?.type === "hook" && p.decisionReason.hookName === TOOL_CHECK,
        A =
          p === void 0 || p.behavior === "allow"
            ? await hasPermissionsToUseTool(create, r, s, d, u)
            : L?.behavior === "deny" && !V
              ? L
              : p;
      if (h > 0 || _)
        return (
          e.onOutcome({
            kind: "denied_by_rule",
            raisedToAsk: !1,
            rulesCheckCrashed: { inputParseThrew: _, crashClass: (_ ? R : S) ?? lit("UnknownError") },
          }),
          {
            behavior: "deny",
            message: permissionCheckFailedMessage({ targetName: e.targetName, toolName: o.name }),
            decisionReason: { type: "other", reason: PERMISSION_CHECK_CRASHED_REASON },
          }
        );
      let O = (se) => {
          if (e.permissionContextNow === void 0 || !readServedBackgroundOverride()) return;
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
        },
        X = judgeServedMcpPaths(o, r, O("asked")),
        J = X?.kind === "ask",
        K = X?.kind === "web_address",
        j = X?.kind === "relative_path",
        G =
          A.behavior === "deny"
            ? hostCredentialRuleOf(A.decisionReason)
            : ((await getHostCredentialDenyRule(o, r)) ?? (X?.kind === "deny" ? X.rule : void 0)),
        M = A;
      if (G !== void 0) {
        let se = credentialRuleKind(G),
          ee = credentialRefusalMessage({
            targetName: e.targetName,
            kind: se,
            subject:
              se === "keychain" && typeof r.command === "string" ? r.command : stripDoubleSlashPrefix(G),
          });
        M =
          A.behavior === "deny"
            ? { ...A, message: ee }
            : { behavior: "deny", decisionReason: { type: "rule", rule: G }, message: ee };
      }
      let Z = "updatedInput" in M && M.updatedInput !== void 0 ? M.updatedInput : r,
        ce =
          M.behavior !== "deny" && FL(o) && Ht()
            ? await shouldBypassAskForReadOnly(o, Z, M, getCwd())
            : "none",
        command = Z.command,
        re =
          zt() && ce === "uncertain" && o.name === BASH_TOOL_NAME && typeof command === "string"
            ? await parseServedShellLine(command)
            : void 0,
        U = re === void 0 ? void 0 : { ...Z, command: re },
        Y = U === void 0 ? ce : await shouldBypassAskForReadOnly(o, U, M, getCwd()),
        ie = Y === "uncertain",
        y = Vt(),
        E = jt(),
        P = M.behavior !== "deny" && Ie(),
        w =
          y &&
          P &&
          FL(o) &&
          ((await isServedLineWriting(o, Z, s)) || (U !== void 0 && (await isServedLineWriting(o, U, s)))),
        D = y && ie && _n(),
        T = w || D ? await checkServedShellSettingsWrite(o.name, Z, getCwd(), e.stopSignal, E) : void 0,
        W =
          T !== void 0 && U !== void 0
            ? await checkServedShellSettingsWrite(o.name, U, getCwd(), e.stopSignal, E)
            : void 0,
        q =
          T === void 0 || W === void 0
            ? T
            : {
                file: T.file !== "none" ? T.file : W.file,
                fileOrFolder: T.fileOrFolder !== "none" ? T.fileOrFolder : W.fileOrFolder,
              },
        Q = y
          ? w && q?.file !== "none"
          : P &&
            ((await servedLineTouchesProtectedPath(o, Z, s, E)) ||
              (U !== void 0 && (await servedLineTouchesProtectedPath(o, U, s, E)))),
        te = Ut()
          ? Q &&
            (touchesProtectedPath(Z, "own_file") || (U !== void 0 && touchesProtectedPath(U, "own_file")))
          : Q ||
            (ie &&
              (y
                ? !D || q?.fileOrFolder !== "none"
                : !_n() ||
                  touchesProtectedPath(Z, "file_or_folder") ||
                  (U !== void 0 && touchesProtectedPath(U, "file_or_folder")))),
        Ae = Q ? (q?.file ?? "error") : D ? (q?.fileOrFolder ?? "error") : "none";
      if (Y !== "none" || Q)
        logEvent("tengu_served_shell_settings_hold", {
          verdict: fromEnum(Y),
          tool: fromEnum(o.name === BASH_TOOL_NAME ? "bash" : "powershell"),
          person_only: te,
          ...(y && { cause: fromEnum(Ae) }),
        });
      if (Y === "settings")
        M = {
          behavior: "deny",
          message: settingsDirRefusalMessage({ targetName: e.targetName }),
          decisionReason: { type: "other", reason: REMOTE_CALL_HOST_SETTINGS_SHELL_WRITE },
        };
      else if (
        M.behavior !== "deny" &&
        !FL(o) &&
        Ie() &&
        typeof o.getPath === "function" &&
        !o.isReadOnly(Z, s) &&
        settingsFileCertainty(getPathsForPermissionCheck(o.getPath(Z))) === "certain"
      )
        (logEvent("tengu_served_settings_edit_refused", {
          tool: fromEnum(
            o.name === FILE_EDIT_TOOL_NAME ? "edit" : o.name === FILE_WRITE_TOOL_NAME ? "write" : "other",
          ),
          engine: fromEnum(M.behavior),
        }),
          (M = {
            behavior: "deny",
            message: settingsFileRefusalMessage({ targetName: e.targetName }),
            decisionReason: { type: "other", reason: REMOTE_CALL_HOST_SETTINGS_EDIT },
          }));
      if (s.remoteCall === void 0)
        logError(
          Error(
            "served permission step ran with no call record: a PreToolUse hook's refusal or question cannot be held",
          ),
        );
      let pe = s.remoteCall?.strictestHookAnswer;
      if (pe?.behavior === "deny")
        return (
          logForDebugging(
            `[remote-tools call=${u}] refused by a PreToolUse hook here; ${M.behavior} after it set aside tool=${o.name}`,
          ),
          pe
        );
      if (pe !== void 0 && M.behavior === "allow")
        (logForDebugging(
          `[remote-tools call=${u}] asked about by a PreToolUse hook here; allow after it raised back to that question tool=${o.name}`,
        ),
          (M = { ...pe, updatedInput: M.updatedInput }));
      let ge =
          e.stance.askOnDestructive &&
          o.name === BASH_TOOL_NAME &&
          typeof r.command === "string" &&
          r.command !== "" &&
          isDestructiveCommand(r.command),
        Be = fo(o) && (Exr || J),
        He = isUnattendedAutoAllowed(e.stance, e.sessionMode, e.call ?? RTe),
        An =
          e.sessionModel !== void 0 &&
          He &&
          M.behavior === "allow" &&
          M.decisionReason?.type === "mode" &&
          M.decisionReason.mode === "acceptEdits" &&
          swt(o.name) &&
          shouldClassifyEdits(e.sessionModel),
        wo = (He || isPlanFloor(e.sessionMode, e.stance.unattended)) && _o(o.name),
        _e = (ge || Be || K || j || An || wo || ie || Q) && M.behavior === "allow",
        bn = M.behavior === "ask" && M.personOnly === !0,
        Rn = ge || Be || K || j || Q || (ie && o.name === BASH_TOOL_NAME) || pe !== void 0 || bn,
        En = An && !Rn,
        bo = M.behavior === "allow" && M.decisionReason?.type === "classifier",
        he =
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
            : M,
        Ue = (p !== void 0 && M === p) || pe !== void 0 || bn,
        oe =
          J &&
          he.behavior === "ask" &&
          !Ue &&
          he.decisionReason?.type !== "hook" &&
          !(he.decisionReason?.type === "other" && he.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK)
            ? { ...he, decisionReason: { type: "other", reason: REMOTE_CALL_SERVED_MCP_ASK } }
            : he,
        Pn =
          oe.behavior === "ask" &&
          (isDefenseInDepthAsk(M) || readsNetworkPath(o, Z, getToolPermissionContext(s))),
        Tn = oe.behavior === "ask" && isServerPolicyAskUnderPlanFloor(oe.decisionReason, o, Z, s);
      if (
        !e.stopSignal.aborted &&
        He &&
        !K &&
        !j &&
        oe.behavior === "ask" &&
        !isHostWordedAsk(oe) &&
        decideServedAskAnswerability(
          oe,
          o,
          Ue || s.hookAskFloor === !0,
          getToolPermissionContext(s),
          te,
          Pn,
          Tn,
          e.stance.unattended,
          En,
        ).may &&
        isBrowserToolAutoAllowed(o, r)
      ) {
        let se = {
            behavior: "allow",
            updatedInput: "updatedInput" in oe && oe.updatedInput !== void 0 ? oe.updatedInput : r,
            decisionReason: { type: "other", reason: REMOTE_CALL_AUTO_MODE_ALLOWLIST },
          },
          ee = notifyAllowLanded(e, o, se, r),
          Ye = ee !== void 0 && (await ee, e.stopSignal.aborted) ? ke : refusalAsAllowLandsDecision(e);
        if (Ye !== void 0) return (e.onOutcome({ kind: servedDecisionOutcome(Ye, se), raisedToAsk: _e }), Ye);
        return (
          e.onOutcome({ kind: servedDecisionOutcome(se, se), raisedToAsk: _e, allowBasis: "auto_allowlist" }),
          se
        );
      }
      let je = await resolveServedAsk(oe, e, r, s, {
          raisedToAsk: _e,
          tool: o,
          forcedByHook: Ue,
          callId: u,
          unresolvedShellWrite: te,
          networkPath: Pn,
          serverAskUnderPlanFloor: Tn,
          fastPathEdit: En,
          raisedWhateverAllows: Rn,
          mcpPathWhy: X?.kind === "ask" ? X.why : j ? "relieved" : void 0,
        }),
        we =
          j &&
          je.behavior === "allow" &&
          judgeServedMcpPaths(o, je.updatedInput ?? r, O("answered"))?.kind !== "relative_path"
            ? Ps
            : je,
        Mn = notifyAllowLanded(e, o, we, r);
      if (Mn !== void 0) await Mn;
      let ze = we.behavior === "allow" && e.stopSignal.aborted;
      if (ze)
        logEvent("tengu_remote_tool_allow_after_stop", {
          road: fromEnum(oe.behavior === "allow" ? "decided_here" : "ask_path"),
          is_mcp: o.mcpInfo !== void 0,
        });
      let Ro = we.behavior === "allow" && !ze ? refusalAsAllowLandsDecision(e) : void 0,
        Ze = ze ? ke : (Ro ?? we);
      return (
        e.onOutcome({
          kind: servedDecisionOutcome(Ze, oe),
          raisedToAsk: _e,
          ...(G !== void 0 && { throughSecondRootMount: isMountPointRule(G) }),
          ...(A === L && { deniedUnderForcedAsk: !0 }),
          ...(oe.behavior === "allow" &&
            Ze.behavior === "allow" && { allowBasis: oe.decisionReason?.type ?? "unspecified" }),
          ...(oe.behavior === "deny" && {
            denySource: findDenyRuleSource(oe.decisionReason),
            hostCredentialRefusal: G && credentialRuleKind(G),
            underWindowsProfileGlob: G && isUnderUserProfiles(stripDoubleSlashPrefix(G)),
          }),
        }),
        Ze
      );
    },
    () => !0,
  );
}
//@ chunk-tr0s0d0k.js:63626-64287 placement
function tryAutoModeAllowlist(e) {
  try {
    if (
      !isServedHairEnabled() ||
      e.stance.onAsk !== "session" ||
      !FL(e.tool) ||
      !_o(e.tool.name) ||
      !isUnattendedOwnRecord(e.stance.unattended) ||
      !(
        isUnattendedAutoAllowed(e.stance, e.sessionMode, e.call ?? RTe) ||
        isPlanFloor(e.sessionMode, e.stance.unattended)
      ) ||
      !isAutoOrPlanMode(e.sessionMode)
    )
      return;
    let n = normalizeForwardedInput(e.tool, e.forwardedInput),
      o = createChildAbortController(e.callStop);
    return {
      input: n,
      check: runServedSafetyCheck({
        tool: e.tool,
        input: n,
        permissionContext: e.permissionContext,
        serviceWrittenSessionMode: e.serviceWrittenSessionMode,
        stopSignal: o.signal,
        callId: e.callId,
        capMs: classifierBudgetMs(e.legDeadlineAt),
        again: { legDeadlineAt: e.legDeadlineAt, besideHold: !0 },
      }).catch((r) => ($e(r, o.signal), { verdict: "no_verdict", why: "threw", ms: 0 })),
      giveUp: () => o.abort(),
    };
  } catch (error) {
    $e(error, e.callStop.signal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:64287-64331 placement
function $e(e, n) {
  if (!n.aborted && !isAbortError(e)) logError(e);
}
//@ chunk-tr0s0d0k.js:64331-64475 placement
function normalizeForwardedInput(e, n, o) {
  let r = safeParseToolInput(e, n);
  if (!r.success) return n;
  let s = { ...r.data };
  if (o !== void 0) return resolveRemoteFilePathInput(s, o);
  return (e.backfillObservableInput?.(s), s);
}
//@ chunk-tr0s0d0k.js:64475-64626 placement
function isSameDefinedFields(e, n) {
  let o = (s) => Object.keys(s).filter((d) => s[d] !== void 0),
    r = o(e);
  return r.length === o(n).length && r.every((s) => n[s] !== void 0 && isDeepStrictEqual(e[s], n[s]));
}
//@ chunk-tr0s0d0k.js:64626-66050 placement
function escalateToAsk(e, n, o = "destructive") {
  if (e.behavior !== "allow") return e;
  let r = {
      destructive: destructiveCommandAskMessage(n),
      classifier: `${n} would not decide this one on its own \u2014 it needs approval in this session.`,
      unresolved_shell_write: REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"],
      unreadable_shell_line: `${n} could not work out everything this command writes, so it cannot rule out a change to its own Claude Code settings files. The command needs approval in this session.`,
      settings_file_named: REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"],
      served_mcp: `${n} asks before one of its own MCP tools runs for a cloud session.`,
      served_mcp_path: `${n} asks before one of its own MCP tools runs with a path it cannot vouch for from here (a relative path, a pattern, a variable, an encoded or quoted spelling, or a directory above its Claude credentials) \u2014 check it does not reach this machine's Claude credentials before approving.`,
      served_mcp_web_address: `This call gives one of ${n}'s own MCP tools a web address, so it is checked before it runs.`,
      served_mcp_relative_path: `This call gives one of ${n}'s own MCP tools a name with a slash in it, so it is checked before it runs.`,
    },
    s = {
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
    decisionReason: { type: "other", reason: s[o] },
  };
}
//@ chunk-tr0s0d0k.js:66050-68726 placement
async function resolveServedAsk(e, n, o, r, s) {
  if (e.behavior !== "ask") return e;
  let d = "updatedInput" in e && e.updatedInput !== void 0 ? e.updatedInput : o,
    u = normalizeForwardedInput(s.tool, n.forwardedInput),
    p = !isSameDefinedFields(d, u),
    h = r.remoteCall?.hookRewrites,
    _ = !p
      ? "none"
      : h !== void 0 &&
          h.every((O) => O.byOwnHook && isPlainObject_2(O.handed) && isSameDefinedFields(O.handed, u)) &&
          h.some((O) => isSameDefinedFields(O.proposed, d))
        ? "own_hooks_alone"
        : "unvouched";
  if (p)
    logForDebugging(
      `[remote-tools call=${s.callId}] ask input rewritten by a hook here; prior answer${_ === "unvouched" ? " and classifier" : ""} set aside tool=${s.tool.name}`,
    );
  if (n.stance.onAsk === "allow")
    return { behavior: "allow", updatedInput: d, decisionReason: e.decisionReason };
  if (n.stopSignal.aborted) return ke;
  if (e.behavior === "ask" && isHostWordedAsk(e))
    return forwardHostWordedAsk(s.tool.name, "a cloud session", {
      hostWorded: e.hostDisplay !== void 0,
      forMcpSkill: e.metadata?.mcpSkill !== void 0,
    });
  let {
    classifierEligible: classifierEligible,
    vetoed: vetoed,
    ownCheck: ownCheck,
    askClass: askClass,
  } = await runServedClassifier({
    mayAnswer: () => classifierRewriteVerdict(e, r, s, _, n.sessionMode, n.stance.unattended),
    checkAhead: n.ownCheckAhead,
    tool: s.tool,
    input: d,
    permissionContext: getToolPermissionContext(r),
    serviceWrittenSessionMode: n.serviceWrittenSessionMode,
    stopSignal: n.stopSignal,
    callId: r.remoteCall?.origin.callId ?? s.callId,
    legDeadlineAt: n.legDeadlineAt,
  });
  if (n.stopSignal.aborted) return ke;
  let promise = new Promise((O, X) => {
      try {
        let J = s.forcedByHook || r.hookAskFloor === !0,
          K =
            !s.raisedToAsk &&
            !vetoed &&
            !s.unresolvedShellWrite &&
            !Co(e, s.tool) &&
            !p &&
            !s.networkPath &&
            Bs(e, s.tool, J, d),
          j = !p && !s.raisedWhateverAllows && offersAlwaysAllowRule(e),
          G =
            !classifierEligible &&
            !s.raisedToAsk &&
            !p &&
            isAskEscalatable(e, s.tool, J, d) &&
            mayAnswerServedAsk(
              e,
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
              : void 0,
          M =
            e.decisionReason?.type === "hook"
              ? `PreToolUse hook on ${n.targetName}: ${e.message}`
              : s.unresolvedShellWrite &&
                  e.decisionReason?.type === "other" &&
                  e.decisionReason.bashMissKind === "no-rule-match" &&
                  e.message === e.decisionReason.reason
                ? REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
                : e.message,
          Z =
            !classifierEligible &&
            e.decisionReason?.type !== "sandboxOverride" &&
            FL(s.tool) &&
            scriptAsksToRunUnsandboxed(s.tool, d)
              ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.outside_sandbox"]} `
              : "",
          ce =
            s.unresolvedShellWrite &&
            e.decisionReason?.type !== "hook" &&
            M !== REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]
              ? `${REMOTE_TOOLS_CONSENT_TEXT["ask.settings_person_only"]} `
              : "",
          ue =
            vetoed && ownCheck !== void 0 && e.decisionReason?.type !== "hook"
              ? `${ownCheckMessage(ownCheck)} `
              : "";
        n.onAsk({
          message: Z + ce + ue + (G === void 0 ? M : joinSentences(M, G)),
          input: d,
          decisionReason: e.decisionReason?.type,
          heldHook: e.decisionReason?.type === "hook" && e.decisionReason.heldForServedCall === !0,
          raisedToAsk: s.raisedToAsk,
          classifierEligible: classifierEligible,
          askClass: askClass,
          mcpPathWhy: s.mcpPathWhy,
          priorAnswerOk: K,
          standingRowOffered: j,
          suggestions: j ? getSuggestedRuleStrings(e) : [],
          answer: O,
        });
      } catch (error) {
        X(error);
      }
    }),
    A = await raceWithAbort(
      promise.catch(() => {
        return;
      }),
      n.stopSignal,
    );
  if (A === void 0 || n.stopSignal.aborted) return ke;
  return A;
}
//@ chunk-tr0s0d0k.js:68726-69341 placement
async function runServedClassifier(e) {
  let mayAnswer = e.mayAnswer(),
    o = mayAnswer.may ? e.checkAhead?.() : void 0,
    r = mayAnswer.may
      ? await (o !== void 0 && isSameDefinedFields(o.input, e.input)
          ? o.check
          : runServedSafetyCheck({
              tool: e.tool,
              input: e.input,
              permissionContext: e.permissionContext,
              serviceWrittenSessionMode: e.serviceWrittenSessionMode,
              stopSignal: e.stopSignal,
              callId: e.callId,
              capMs: classifierBudgetMs(e.legDeadlineAt),
              ...(isServedHairEnabled() && { again: { legDeadlineAt: e.legDeadlineAt, besideHold: !1 } }),
            }))
      : void 0,
    s = mayAnswer.may && r?.verdict !== "allow",
    aborted = e.stopSignal.aborted,
    u = mayAnswer.may && !aborted ? e.mayAnswer() : MAY_ANSWER;
  return {
    classifierEligible: mayAnswer.may && u.may && !s && !aborted,
    vetoed: s,
    ownCheck: r,
    askClass: servedVerdictKind({
      first: mayAnswer,
      vetoed: s,
      ownCheck: r?.verdict,
      afterCheck: u,
      tool: e.tool,
    }),
  };
}
//@ chunk-tr0s0d0k.js:69341-69557 placement
function notifyAllowLanded(e, n, o, r) {
  if (o.behavior !== "allow" || e.onAllowLanded === void 0 || e.stopSignal.aborted) return;
  try {
    return e.onAllowLanded(n, o.updatedInput ?? r)?.catch((s) => $e(s, e.stopSignal));
  } catch (error) {
    $e(error, e.stopSignal);
    return;
  }
}
//@ chunk-tr0s0d0k.js:69557-69972 placement
function classifierRewriteVerdict(e, n, o, r, s, d) {
  if (r !== "none" && !(r === "own_hooks_alone" && isServedNeckEnabled()))
    return mayNotAnswer(r === "own_hooks_alone" ? "rewrite_own_hooks" : "rewrite_unvouched");
  if (!isAutoOrPlanMode(s)) return mayNotAnswer("not_auto");
  let u = s === "plan" ? planModeUnattendedRefusal(d) : void 0;
  if (u !== void 0) return mayNotAnswer(u === "plan_setting" ? "plan_unbacked" : unattendedStanceKind(d));
  return decideServedAskAnswerability(
    e,
    o.tool,
    o.forcedByHook || n.hookAskFloor === !0,
    getToolPermissionContext(n),
    o.unresolvedShellWrite,
    o.networkPath,
    o.serverAskUnderPlanFloor,
    d,
    o.fastPathEdit,
  );
}
//@ chunk-tr0s0d0k.js:69972-70181 placement
function decideServedAskAnswerability(e, n, o, r, s, d, u, p, h) {
  if (e.behavior !== "ask" || o || s) return mayNotAnswer(unanswerableAskKind(e, o));
  if (!isUnattendedOwnRecord(p)) return mayNotAnswer(unattendedStanceKind(p));
  if (
    p === "own_record" &&
    unattendedServingAllowedByHostFlag() &&
    !FL(n) &&
    !isBrowserToolAutoAllowed(n) &&
    !(h && isServedFrogEnabled())
  )
    return mayNotAnswer("consent");
  return mayAnswerServedAsk(e, n, o, r, s, d, u);
}
//@ chunk-tr0s0d0k.js:70181-70968 placement
function mayAnswerServedAsk(e, n, o, r, s, d, u) {
  if (e.behavior !== "ask" || o || s) return mayNotAnswer(unanswerableAskKind(e, o));
  if (n.requiresUserInteraction?.() === !0) return mayNotAnswer("requires_user_interaction");
  if (n.mcpInfo?.effectiveMaxPermission === "ask") return mayNotAnswer("org_ceiling");
  if (Co(e, n)) return mayNotAnswer("mcp_path");
  if (e.decisionReason?.type === "hook") return mayNotAnswer(hookAskKind(e));
  if (u || (e.decisionReason?.type === "mode" && e.decisionReason.mode === "plan"))
    return mayNotAnswer("plan_floor");
  if (isSandboxOverrideUnderReadBlock(e.decisionReason, r))
    return mayNotAnswer("sandbox_override_read_block");
  let p = carriesAskRuleIntent(e),
    h = isServerPolicyAskReason(e.decisionReason) || e.matchedAskRule?.source === "mcpServerPolicy";
  if (p && !h) return mayNotAnswer("ask_rule");
  let _ = findSafetyCheckReason(
    e.decisionReason,
    (S) =>
      (!S.classifierApprovable &&
        !(
          S.circuitBreaker === "backgroundOperator" &&
          (S.also ?? []).length === 0 &&
          isServedFerruleEnabled()
        )) ||
      (isHostPersonOnlyCircuitBreaker(S) && Ie()),
  );
  if (_ !== void 0) return mayNotAnswer(safetyCheckKind(_));
  return d ? mayNotAnswer("network_path") : MAY_ANSWER;
}
//@ chunk-tr0s0d0k.js:70968-71049 placement
function Bs(e, n, o, r = {}) {
  return isAskEscalatable(e, n, o, r) && findSafetyCheckReason(e.decisionReason, () => !0) === void 0;
}
//@ chunk-tr0s0d0k.js:71049-71290 placement
function isAskEscalatable(e, n, o, r) {
  if (e.behavior !== "ask" || o) return !1;
  if (r.dangerouslyDisableSandbox === !0) return !1;
  if (n.requiresUserInteraction?.() === !0) return !1;
  if (e.decisionReason?.type === "hook") return !1;
  return e.decisionReason?.type !== "sandboxOverride";
}
//@ chunk-tr0s0d0k.js:71290-71389 placement
function Co(e, n) {
  return (
    (Exr && fo(n)) ||
    (e.decisionReason?.type === "other" && e.decisionReason.reason === REMOTE_CALL_SERVED_MCP_ASK)
  );
}
//@ chunk-tr0s0d0k.js:71389-71598 placement
function offersAlwaysAllowRule(e) {
  return (
    shouldShowAlwaysAllowOptions() &&
    e.behavior === "ask" &&
    e.suggestions !== void 0 &&
    e.suggestions.some((suggestion) => suggestion.type === "addRules") &&
    e.suppressAlwaysAllowRule !== !0 &&
    findSafetyCheckReason(e.decisionReason, (n) => !n.classifierApprovable) === void 0
  );
}
//@ chunk-tr0s0d0k.js:71598-71762 placement = extractRules (0.851)
function getSuggestedRuleStrings(result) {
  if (result.behavior !== "ask" || result.suggestions === void 0) return [];
  return result.suggestions
    .flatMap((update) =>
      update.type === "addRules" ? update.rules.map((rule) => formatPermissionRule(rule)) : [],
    )
    .slice(0, SERVED_DECISION_REASONS);
}
//@ chunk-tr0s0d0k.js:71762-71953 placement
function raceWithAbort(e, n) {
  return new Promise((o) => {
    if (n.aborted) {
      o(void 0);
      return;
    }
    let r = () => o(void 0);
    (n.addEventListener("abort", r, { once: !0 }),
      e.then(o).finally(() => n.removeEventListener("abort", r)));
  });
}
//@ chunk-tr0s0d0k.js:71953-72151 placement
function findDenyRuleSource(e) {
  if (e?.type === "rule") return e.rule.source;
  if (e?.type === "subcommandResults")
    for (let [, n] of e.reasons) {
      let o = n.behavior === "deny" ? findDenyRuleSource(n.decisionReason) : void 0;
      if (o !== void 0) return o;
    }
  return;
}
//@ chunk-tr0s0d0k.js:72151-72317 placement
function refusalAsAllowLandsDecision(e) {
  let n = e.refusalAsAllowLands?.();
  return n === void 0
    ? void 0
    : {
        behavior: "deny",
        message: n,
        decisionReason: { type: "other", reason: REMOTE_CALL_NOT_RUN_HERE },
        decideLocation: "ask-path",
      };
}
//@ chunk-tr0s0d0k.js:72317-72684 placement
function servedDecisionOutcome(e, n) {
  let o = e.behavior === "deny" && e.decisionReason.type === "other" ? e.decisionReason.reason : void 0;
  if (o === SERVED_STOP_REASONS || o === REMOTE_CALL_NOT_RUN_HERE) return "stopped";
  if (n.behavior !== "ask") return e.behavior === "allow" ? "allowed" : "denied_by_rule";
  if (e.behavior === "allow") return "approved_by_session";
  if (o !== void 0 && isUnforwardedHostAsk(o)) return "ask_refused_no_surface";
  return o === ASK_ENDED_REASON ? "stopped" : "denied_by_session";
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
  Exr,
};
