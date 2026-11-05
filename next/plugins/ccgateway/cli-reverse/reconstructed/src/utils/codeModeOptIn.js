/**
 * utils/codeModeOptIn.ts
 *
 * code mode 选择流程：前提检查、托管/本机设置来源判定、询问对话框回答与重启标记（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ee72ms70.js (40)
 * attribution: placement 40
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "./identity.js";
import { isEnvDefinedFalsy, isEnvTruthy } from "./envUtils.js";
import { CLAUDE_CODE_EXPERIMENTAL_CODE_MODE } from "../constants/codeMode.js";
import { isSettingSourceEnabled, SETTING_SOURCES } from "./settings/constants.js";
import {
  getSettingsForSource,
  isMachineAdminDocumentUnreadable,
  getAllPolicyTierSettings,
} from "./settings/settings.js";
import { getAppliedGlobalConfigEnv, getPreSettingsEnvSnapshot } from "./managedEnvApply.js";
import { codeModeEnv } from "./env/codeModeEnv.js";
import { isOpus55FamilyModel, isSonnet55FamilyModel, getMainLoopModel } from "./model/model.js";
import {
  getAPIProvider,
  isActualFirstPartyAnthropicBaseUrl,
  isFirstPartyAnthropicHost,
} from "./model/providers.js";
import { PROVIDER_ENV_FLAGS } from "./model/modelIds.js";
import { isStandaloneExecutable } from "./slowOperations.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
} from "../services/analytics/growthbook.js";
import { computeRemoteSettingsEligibility } from "../services/cloudSessions/eligibility.js";
import { isRemoteManagedSettingsVerified } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { complianceTaintsSettled, isPolicyVerdictAbsent } from "../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import {
  getConfiguredApiKeyHelper,
  effectiveAuthTokenEnv,
  getOauthAccountInfo,
  getSubscriptionType,
  getRateLimitTier,
  sameOwnerAccount,
} from "./auth.js";
import { hasCustomApiKeyHeader, hasCustomAuthorizationHeader } from "../services/api/customHeaders.js";
import { isBetaTracingEnabled } from "./telemetry/betaSessionTracing.js";
import { getGlobalConfig, saveGlobalConfigDurably } from "./config.js";
import { settleForesight, reopenIfUnsettled, isForesightOpen, getForesightState } from "./foresightStatus.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { parseRuleString, hasWildcard, matchRulePattern } from "./permissions/permissionRuleParser.js";
import { isEvalToolName, REPL_TOOL_NAME } from "../tools/REPLTool/constants.js";
import { getBaseToolsPreset, splitToolExclusions } from "./permissions/permissionSetup.js";
import { splitRuleList } from "./permissions/disallowedToolsFlag.js";
import { isBashAvailable } from "./shell/shellToolUtils.js";
import { env } from "./env.js";
import { getSessionEntrypoint } from "./sessionShape.js";
import { getIsNonInteractiveSession, getSessionId } from "../bootstrap/state.js";
import { isBgSession } from "./concurrentSessions.js";
import { isEngineCheckDone, engineCheckResult } from "./bunEngineProbe.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { isOn } from "./codeMode/accepted.js";
import { withTimeout } from "./sleep.js";
import { waitForInitialize } from "./startupFlagWait.js";
import { waitForRemoteManagedSettingsFetchToSettle } from "../services/remoteManagedSettings/loader.js";
import { awaitPolicyLimitsColdStartVerdict } from "../services/policyLimits/PolicyLimitsClient.js";
import { drainRegisteredWriteQueues } from "./settings/writeQueues.js";
import { getPolicyPrincipalIdentity } from "../services/policyLimits/policyEvidence.js";

//@ chunk-ee72ms70.js:1578-1897 placement
/**
 * code mode 选择的开关键与超时状态槽位（上次检查、已复核、被拒原因、登录身份、重启标记）。
 */
var CODE_MODE_OPT_IN_GATE = "tengu_rustling_blossom";
var ASK_TIMEOUT_MS = 5000;
var RETRIED = "retried";
var optInState = identity(
  {
    lastCheck: undefined,
    reviewed: false,
    policyPrincipal: undefined,
    signedInAs: undefined,
    askedIn: undefined,
    restarted: false,
    restartedFrom: undefined,
  },
  (state) => {
    state.lastCheck = undefined;
    state.reviewed = false;
    state.policyPrincipal = undefined;
    state.signedInAs = undefined;
    state.askedIn = undefined;
    state.restarted = false;
    state.restartedFrom = undefined;
  },
);
//@ chunk-ee72ms70.js:1897-2015 placement
function parseEnvFlag(value) {
  if (value === undefined) return "unset";
  let trimmed = String(value).trim();
  if (trimmed === "" || isEnvDefinedFalsy(trimmed)) return "off";
  return isEnvTruthy(trimmed) ? "on" : "bad";
}
//@ chunk-ee72ms70.js:2015-2163 placement
function readEnvCi(env, name) {
  if (env === undefined) return;
  if (env[name] !== undefined) return env[name];
  let found = Object.keys(env).find((key) => key.toUpperCase() === name);
  return found === undefined ? undefined : env[found];
}
//@ chunk-ee72ms70.js:2163-2192 placement
function codeModeFlagOf(env) {
  return readEnvCi(env, CLAUDE_CODE_EXPERIMENTAL_CODE_MODE);
}
//@ chunk-ee72ms70.js:2192-2240 placement
function codeModeFlagInSource(source) {
  return isSettingSourceEnabled(source) ? codeModeFlagOf(getSettingsForSource(source)?.env) : undefined;
}
//@ chunk-ee72ms70.js:2240-2330 placement
function isCodeModeAdminOff() {
  return (
    isMachineAdminDocumentUnreadable() ||
    getAllPolicyTierSettings().some((tierSettings) => {
      let flag = parseEnvFlag(codeModeFlagOf(tierSettings.env));
      return flag === "off" || flag === "bad";
    })
  );
}
//@ chunk-ee72ms70.js:2330-2404 placement
function isCodeModeTurnedOn() {
  return (
    parseEnvFlag(codeModeFlagOf(getAppliedGlobalConfigEnv())) === "on" ||
    getAllPolicyTierSettings().some((tierSettings) => parseEnvFlag(codeModeFlagOf(tierSettings.env)) === "on")
  );
}
//@ chunk-ee72ms70.js:2404-3280 placement
function decideOptInState() {
  let sources = [
    {
      source: "flagSettings",
      kind: parseEnvFlag(codeModeFlagInSource("flagSettings")),
    },
    {
      source: "userSettings",
      kind: parseEnvFlag(codeModeFlagInSource("userSettings")),
    },
    {
      source: "shell",
      kind: parseEnvFlag(codeModeFlagOf(getPreSettingsEnvSnapshot())),
    },
  ];
  if (sources[2].kind === "off")
    return {
      state: "not_asked",
      turnedOffIn: isCodeModeAdminOff() ? "managed" : "shell",
    };
  if (
    sources.some((entry) => entry.kind === "off") ||
    parseEnvFlag(codeModeFlagOf(getAppliedGlobalConfigEnv())) === "off"
  )
    return {
      state: "not_asked",
      turnedOffIn: "settings",
    };
  let turnedOn = isCodeModeTurnedOn();
  let found = sources.find(
    (entry) => entry.kind !== "unset" && !(entry.source === "shell" && entry.kind === "on" && turnedOn),
  );
  let adminOff = isCodeModeAdminOff();
  if (found === undefined) {
    if (adminOff)
      return {
        state: "not_asked",
        turnedOffIn: "managed",
      };
    if (sources[2].kind !== "on")
      return {
        state: "not_asked",
      };
    optInState.askedIn = "shell";
    return {
      state: "refused",
      why: "own_settings",
    };
  }
  optInState.askedIn = found.source;
  if (adminOff)
    return {
      state: "refused",
      why: "admin",
    };
  let ownFlag = parseEnvFlag(codeModeEnv.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE);
  if (found.kind === "bad" || ownFlag === "bad")
    return {
      state: "refused",
      why: "bad_value",
    };
  if (ownFlag !== "on")
    return {
      state: "not_asked",
      turnedOffIn: "settings",
    };
  return {
    state: "asked",
    source: found.source,
  };
}
//@ chunk-ee72ms70.js:3280-3318 placement
/**
 * 判断模型是否可评估（走模型名规整后比对）。
 */
function isEvaluatedModel(model) {
  return isOpus55FamilyModel(model) || isSonnet55FamilyModel(model);
}
//@ chunk-ee72ms70.js:3318-3364 placement (2.1.88 match: logEventTo1P, 1)
function logEventTo1P() {
  return getAPIProvider() === "firstParty" && isActualFirstPartyAnthropicBaseUrl();
}
//@ chunk-ee72ms70.js:3364-3511 placement
function isThirdPartyEnv() {
  return getAllPolicyTierSettings().some((tierSettings) => {
    let baseUrl = readEnvCi(tierSettings.env, "ANTHROPIC_BASE_URL");
    return (
      PROVIDER_ENV_FLAGS.some((providerFlag) => isEnvTruthy(readEnvCi(tierSettings.env, providerFlag))) ||
      (typeof baseUrl === "string" && baseUrl !== "" && !isFirstPartyAnthropicHost(baseUrl))
    );
  });
}
//@ chunk-ee72ms70.js:3511-3536 placement
function isStandaloneBuild() {
  return isStandaloneExecutable();
}
//@ chunk-ee72ms70.js:3536-3618 placement
function isOptInGateResolved() {
  let { value: gateValue, source: gateSource } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    CODE_MODE_OPT_IN_GATE,
    false,
  );
  return gateSource === "disabled" ? undefined : gateValue === true;
}
//@ chunk-ee72ms70.js:3618-3711 placement
function isOptInGateFromServer() {
  let { value: gateValue, source: gateSource } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    CODE_MODE_OPT_IN_GATE,
    false,
  );
  return gateValue === true && (gateSource === "payload" || gateSource === "override");
}
//@ chunk-ee72ms70.js:3711-3742 placement
function remoteSettingsReady() {
  return !computeRemoteSettingsEligibility() || isRemoteManagedSettingsVerified();
}
//@ chunk-ee72ms70.js:3742-3775 placement
function policySettled() {
  return complianceTaintsSettled() && !isPolicyVerdictAbsent();
}
//@ chunk-ee72ms70.js:3775-3818 placement
function hasComplianceRestriction() {
  return hasComplianceTaint("hipaa") || hasComplianceTaint("zdr");
}
//@ chunk-ee72ms70.js:3818-3865 placement
function hasCustomCredentials() {
  return (
    getConfiguredApiKeyHelper() !== undefined || hasCustomApiKeyHeader() || hasCustomAuthorizationHeader()
  );
}
//@ chunk-ee72ms70.js:3865-3993 placement (2.1.88 match: isTelemetryEnabled, 1)
function isTelemetryEnabled() {
  return (
    isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY) ||
    getAllPolicyTierSettings().some((tierSettings) =>
      isEnvTruthy(tierSettings.env?.CLAUDE_CODE_ENABLE_TELEMETRY),
    ) ||
    isBetaTracingEnabled()
  );
}
//@ chunk-ee72ms70.js:3993-4098 placement
function areCaveatsAccepted() {
  let config = getGlobalConfig();
  return config.codeModeCaveatsAcceptedV1 === true && config.codeModeAutoModeCaveatAcceptedV1 === true;
}
//@ chunk-ee72ms70.js:4098-4196 placement
async function recheckMods() {
  try {
    return optInState.lastCheck === undefined ? "mods" : await optInState.lastCheck();
  } catch {
    return "mods";
  }
}
//@ chunk-ee72ms70.js:4196-4245 placement
function reportOptInState(state) {
  settleForesight(state);
  if (state.state === "refused") reportRefusal(state);
}
//@ chunk-ee72ms70.js:4245-4521 placement
function reportRefusal(state) {
  logEvent("tengu_repl_mode_opt_in", {
    state: fromEnum(state.state),
    why: fromEnumOpt(state.state === "refused" ? state.why : undefined),
    source: fromEnumOpt(optInState.askedIn),
    restarted: optInState.restarted,
    restarted_from: sanitizeMarkName(optInState.restartedFrom),
  });
  if (state.state === "on") logFeatureOk("repl_mode_opt_in");
  else if (state.state === "refused") logFeatureSad("repl_mode_opt_in", state.why);
}
//@ chunk-ee72ms70.js:4521-4803 placement
function takeRestartFlag() {
  let restart = codeModeEnv.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTART;
  codeModeEnv.unset("CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTART");
  optInState.restartedFrom =
    restart === undefined ? undefined : codeModeEnv.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTARTED_FROM;
  codeModeEnv.unset("CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTARTED_FROM");
  return restart;
}
//@ chunk-ee72ms70.js:4803-4877 placement
function isRestrictedRule(rule) {
  let { toolName, ruleContent } = parseRuleString(rule);
  return ruleContent === undefined && isRestrictedToolName(toolName);
}
//@ chunk-ee72ms70.js:4877-4922 placement
function isRestrictedToolName(toolName) {
  return isEvalToolName(toolName) || (hasWildcard(toolName) && matchRulePattern(toolName, REPL_TOOL_NAME));
}
//@ chunk-ee72ms70.js:4922-5079 placement
function hasBashAccess(parts) {
  if (getBaseToolsPreset(parts.join(" ").trim()) !== null) return true;
  let { kept, excluded } = splitToolExclusions(splitRuleList(parts));
  return (
    (kept.some(isEvalToolName) || kept.includes("preset:default")) &&
    ![...excluded].some(isRestrictedToolName)
  );
}
//@ chunk-ee72ms70.js:5079-5242 placement
/**
 * 判断工具选项是否把 REPL 排除在外（受限、禁用工具、空工具集、deny 规则）。
 */
function doToolOptionsLeaveReplOut({ restricted, disallowedTools, baseTools }) {
  return (
    restricted ||
    splitRuleList(disallowedTools).some(isRestrictedRule) ||
    (baseTools.length > 0 && !hasBashAccess(baseTools)) ||
    SETTING_SOURCES.some(
      (source) =>
        isSettingSourceEnabled(source) &&
        getSettingsForSource(source)?.permissions?.deny?.some(isRestrictedRule) === true,
    )
  );
}
//@ chunk-ee72ms70.js:5242-5910 placement
function rejectReasonFor(options, atStartup) {
  if (!isStandaloneBuild()) return "runtime";
  if (!isBashAvailable()) return "no_bash";
  if (env.CLAUDE_CODE_REMOTE) return "entrypoint";
  if (
    getSessionEntrypoint() !== "cli" ||
    getIsNonInteractiveSession() ||
    options.thinClient ||
    env.ANTHROPIC_UNIX_SOCKET !== undefined
  )
    return "entrypoint";
  if (
    isBgSession() ||
    options.teammate ||
    options.remoteControl ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined
  )
    return "unattended";
  if (isEnvTruthy(false) || env.IS_DEMO !== undefined || env.CLAUBBIT) return "no_setup";
  if (options.toolsLeaveReplOut) return "tools";
  if ((atStartup || isEngineCheckDone()) && engineCheckResult() !== "passed") return "engine";
  if (isAgentSwarmsEnabled()) return "agent_teams";
  if (!logEventTo1P()) return "provider";
  if (hasCustomCredentials()) return "credentials";
  if (hasComplianceRestriction()) return "compliance";
  if (isTelemetryEnabled()) return "otel";
  let model =
    options.cliModel === undefined
      ? getMainLoopModel()
      : options.cliModel === "default"
        ? getDefaultMainLoopModel()
        : parseUserSpecifiedModel(options.cliModel);
  return isEvaluatedModel(model) ? undefined : "model";
}
//@ chunk-ee72ms70.js:5910-6440 placement
/**
 * 启动时结算 code mode 选择：按重启标记、托管/本机设置、环境前提决定是否询问、拒绝或直接开启。
 */
async function settleCodeModeOptInAtStartup(deps) {
  let restarted = takeRestartFlag();
  optInState.restarted = restarted !== undefined;
  let refuse = (why) =>
    reportOptInState({
      state: "refused",
      why,
    });
  let decision = decideOptInState();
  let envSet = codeModeEnv.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE !== undefined;
  let isRetried = restarted === RETRIED;
  if (restarted !== undefined && restarted !== RETRIED && envSet) return refuse(restarted);
  if (decision.state !== "asked") return reportOptInState(decision);
  let reason = rejectReasonFor(deps, true);
  if (reason !== undefined) {
    if (reason === "engine")
      logFeatureSad("repl_engine_check", engineCheckResult(), {
        held: true,
      });
    return refuse(reason);
  }
  let gateValue = isOptInGateResolved();
  if (gateValue === undefined) return refuse("no_flags");
  optInState.lastCheck = deps.lastCheck;
  if (!gateValue || !areCaveatsAccepted()) {
    if (isRetried) return refuse(gateValue ? "unsaved" : "gate");
    return reopenIfUnsettled();
  }
  let modReason = await recheckMods();
  if (modReason !== undefined) return refuse(modReason);
  reportOptInState({
    state: "on",
    source: decision.source,
  });
  isOn();
}
//@ chunk-ee72ms70.js:6440-6597 placement
/**
 * 预判拒绝原因（托管设置、本机设置、环境、模型），可用于提前提示。
 */
function refusalForeseen(options) {
  if (isCodeModeAdminOff()) return "admin";
  if (isCodeModeTurnedOn()) return "own_settings";
  let reason = rejectReasonFor(options, false);
  if (reason !== undefined) return reason;
  let gateValue = isOptInGateResolved();
  return gateValue === undefined ? "no_flags" : gateValue ? undefined : "gate";
}
//@ chunk-ee72ms70.js:6597-7008 placement
/**
 * 并行检查各前提（凭据、合规、遥测、提供商、模型、开关、门值），返回第一个拒绝原因。
 */
async function runOptInWait() {
  let waitFor = (work) => withTimeout(work, ASK_TIMEOUT_MS, "opt-in wait").catch(() => {});
  await Promise.all([
    waitForInitialize({
      initialize: initializeGrowthBook,
      budgetMs: ASK_TIMEOUT_MS,
    }),
    waitFor(waitForRemoteManagedSettingsFetchToSettle()),
    awaitPolicyLimitsColdStartVerdict(),
  ]);
  if (!complianceTaintsSettled() && effectiveAuthTokenEnv() !== undefined) return "credentials";
  if (!remoteSettingsReady() || !policySettled()) return "admin_unread";
  if (isCodeModeAdminOff()) return "admin";
  if (hasComplianceRestriction()) return "compliance";
  if (isTelemetryEnabled()) return "otel";
  if (!logEventTo1P()) return "provider";
  if (!isEvaluatedModel(getMainLoopModel())) return "model";
  if (isOptInGateResolved() === undefined) return "no_flags";
  if (!isOptInGateFromServer()) return "gate";
  return isForesightOpen() ? recheckMods() : undefined;
}
//@ chunk-ee72ms70.js:7008-7297 placement
/**
 * setup 流程里的 code mode 复核：已开启时看是否要重启关闭，未开启时决定询问还是直接重启开启。
 */
async function reviewCodeModeOptInInSetup() {
  let codeModeOn = getForesightState().state === "on";
  if (!codeModeOn && !isForesightOpen()) return "none";
  let reason = await runOptInWait();
  optInState.reviewed = true;
  optInState.policyPrincipal = readPolicyPrincipal();
  if (reason !== undefined) {
    if (codeModeOn) return setRestartFlags(reason, "restart_without_mode");
    reportOptInState({
      state: "refused",
      why: reason,
    });
    return "none";
  }
  if (codeModeOn) {
    reportRefusal(getForesightState());
    return "none";
  }
  return areCaveatsAccepted() ? setRestartFlags(RETRIED, "restart_into_mode") : "ask";
}
//@ chunk-ee72ms70.js:7297-7589 placement
/**
 * 用户回答 code mode 对话框：拒绝则记录，接受则保存两个警告确认标记并请求重启。
 */
async function answerCodeModeOptInDialog(accepted, options) {
  if (!isForesightOpen() || !optInState.reviewed) return "none";
  if (!accepted) {
    reportOptInState({
      state: "refused",
      why: "declined",
    });
    return "none";
  }
  if (
    !(await saveGlobalConfigDurably(
      (config) => ({
        ...config,
        codeModeCaveatsAcceptedV1: true,
        codeModeAutoModeCaveatAcceptedV1: true,
      }),
      options,
    ))
  ) {
    reportOptInState({
      state: "refused",
      why: "unsaved",
    });
    return "none";
  }
  return setRestartFlags(RETRIED, "restart_into_mode");
}
//@ chunk-ee72ms70.js:7589-7820 placement
async function setRestartFlags(reason, options) {
  codeModeEnv.set("CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTART", reason);
  codeModeEnv.set("CLAUDE_CODE_EXPERIMENTAL_CODE_MODE_RESTARTED_FROM", getSessionId());
  await withTimeout(drainRegisteredWriteQueues(), 2000, "write queue drain timeout (opt-in restart)").catch(
    () => {},
  );
  return options;
}
//@ chunk-ee72ms70.js:7820-7885 placement
function readPolicyPrincipal() {
  try {
    return {
      read: true,
      id: getPolicyPrincipalIdentity(),
    };
  } catch {
    return {
      read: false,
    };
  }
}
//@ chunk-ee72ms70.js:7885-8041 placement
function policyPrincipalChange() {
  let principal = optInState.policyPrincipal;
  if (principal === undefined) return;
  if (!principal.read) return "unread";
  let current = readPolicyPrincipal();
  if (!current.read) return "unread";
  return current.id === principal.id ? undefined : "changed";
}
//@ chunk-ee72ms70.js:8041-8436 placement
/**
 * setup 结束后按当前状态与登录身份再次判定，需要时写入重启标记。
 */
async function closeCodeModeOptInAfterSetup() {
  if (getForesightState().state !== "on") {
    reportOptInState(
      isForesightOpen()
        ? {
            state: "refused",
            why: "no_setup",
          }
        : {
            state: "not_asked",
          },
    );
    return "none";
  }
  let change = policyPrincipalChange();
  let reason = !optInState.reviewed
    ? "no_setup"
    : !remoteSettingsReady() || !policySettled() || change === "unread"
      ? "admin_unread"
      : change === "changed"
        ? "credential_changed"
        : isCodeModeAdminOff()
          ? "admin"
          : hasComplianceRestriction()
            ? "compliance"
            : isTelemetryEnabled()
              ? "otel"
              : !logEventTo1P() || isThirdPartyEnv()
                ? "provider"
                : !isEvaluatedModel(getMainLoopModel())
                  ? "model"
                  : undefined;
  if (reason === undefined) {
    optInState.signedInAs = principalFields();
    return "none";
  }
  return setRestartFlags(reason, "restart_without_mode");
}
//@ chunk-ee72ms70.js:8436-8573 placement
function principalFields() {
  let account = getOauthAccountInfo();
  return {
    accountUuid: account?.accountUuid,
    organizationUuid: account?.organizationUuid,
    subscriptionType: getSubscriptionType(),
    rateLimitTier: getRateLimitTier(),
  };
}
//@ chunk-ee72ms70.js:8573-8731 placement
/**
 * 判断当前登录身份与记录的身份是否一致（用于发现换号）。
 */
function isSignedInAsWhenModeKept() {
  let previous = optInState.signedInAs;
  if (previous === undefined) return false;
  let current = principalFields();
  return (
    sameOwnerAccount(previous, current) &&
    previous.subscriptionType === current.subscriptionType &&
    previous.rateLimitTier === current.rateLimitTier
  );
}
export {
  answerCodeModeOptInDialog,
  isEvaluatedModel,
  CODE_MODE_OPT_IN_GATE,
  closeCodeModeOptInAfterSetup,
  doToolOptionsLeaveReplOut,
  isSignedInAsWhenModeKept,
  refusalForeseen,
  reviewCodeModeOptInInSetup,
  settleCodeModeOptInAtStartup,
};
