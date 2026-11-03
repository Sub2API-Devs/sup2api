/**
 * utils/swarm/teammateEnvForwarding.ts
 *
 * 2.1.316 新增：队友进程环境变量与模型参数转发
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cne5hsvz.js (10)
 * attribution: placement 10
 */
import { caCertEnvVars, caCertEnvVarList } from "../settings/managedSettingsKeys.js";
import { TLS_CERT_ENV_VARS, getHostManagedProviderConflicts } from "../managedEnvConstants.js";
import { withHostOwnedEnv, withHostEnvRestored_2 } from "../settings/managedSettingsFiles.js";
import { swarmHostState } from "./hostState.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";
import { isProviderManagedByHost } from "../entrypointKinds.js";
import { withLaunchValuesOfHybridConnection } from "../managedEnvApply.js";
import { env } from "../env.js";
import { isEnvTruthy } from "../envUtils.js";
import { isAcceptableModelArg } from "../../services/daemon/processLiveness.js";
import { getMainLoopModel } from "../model/model.js";
import { isModelAllowed } from "../model/modelAllowlist.js";
import { modelMatchesFamilyAlias, getDefaultSubagentModel } from "../model/agent.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { stepDownRestrictedFamilyAliasPick } from "../model/planModeModel.js";
import { modelFamilyOf } from "../model/providers.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";

//@ chunk-cne5hsvz.js:14913-16602 placement
var FORWARDED_TEAMMATE_ENV = [
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "CLAUDE_CODE_USE_FOUNDRY",
  "CLAUDE_CODE_USE_ANTHROPIC_AWS",
  "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD",
  "CLAUDE_CODE_USE_MANTLE",
  "CLAUDE_CODE_USE_GATEWAY",
  "ANTHROPIC_AWS_WORKSPACE_ID",
  "ANTHROPIC_AWS_BASE_URL",
  "ANTHROPIC_AWS_API_KEY",
  "CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH",
  "ANTHROPIC_GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT",
  "ANTHROPIC_GOOGLE_CLOUD_LOCATION",
  "ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID",
  "ANTHROPIC_GOOGLE_CLOUD_BASE_URL",
  "CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH",
  "AWS_BEARER_TOKEN_BEDROCK",
  "ANTHROPIC_BEDROCK_MANTLE_BASE_URL",
  "CLAUDE_CODE_SKIP_MANTLE_AUTH",
  "AWS_REGION",
  "AWS_DEFAULT_REGION",
  "AWS_PROFILE",
  "AWS_CONFIG_FILE",
  "AWS_SHARED_CREDENTIALS_FILE",
  "ANTHROPIC_BEDROCK_SERVICE_TIER",
  "CLAUDE_CODE_AUTO_MODE_SERVER",
  "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
  "CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS",
  "ANTHROPIC_BEDROCK_REGION_PREFIX",
  "CLAUDE_CODE_SUBAGENT_EFFORT",
  "CLAUDE_CODE_SUBAGENT_MODEL",
  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
  "CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL",
  "CLAUDE_CODE_DISABLE_PROACTIVITY",
  "CLAUDE_CODE_DISABLE_FILE_MENTIONS",
  "CLAUDE_CODE_DISABLE_WEB_FETCH",
  "CLAUDE_CODE_DISABLE_ULTRATHINK",
  "DISABLE_COMPACT",
  "CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG",
  "CLAUDE_CODE_PERSONAL_CONFIG_FIX",
  "CLAUDE_CODE_MODEL_CATALOG",
  "ANTHROPIC_BASE_URL",
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_CODE_REMOTE",
  "CLAUDE_CODE_REMOTE_MEMORY_DIR",
  "HTTPS_PROXY",
  "https_proxy",
  "HTTP_PROXY",
  "http_proxy",
  "NO_PROXY",
  "no_proxy",
  ...caCertEnvVars,
  ...Object.keys(caCertEnvVarList),
  ...TLS_CERT_ENV_VARS,
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
  "CLAUDE_CODE_HOST_CREDS_FILE",
  "CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST",
  "DISABLE_ERROR_REPORTING",
  "DISABLE_GROWTHBOOK",
  "DISABLE_TELEMETRY",
  "DO_NOT_TRACK",
];
//@ chunk-cne5hsvz.js:16602-16629 placement
function teammateEnvArgs() {
  return withHostOwnedEnv(buildTeammateEnv);
}
//@ chunk-cne5hsvz.js:16629-17597 placement
function buildTeammateEnv() {
  let e = ["CLAUDECODE=1", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"];
  let { sessionListId } = swarmHostState().taskList;
  if (sessionListId) e.push(`CLAUDE_CODE_TASK_LIST_ID=${shellQuoteArgs([sessionListId])}`);
  if (isProviderManagedByHost()) e.push("CLAUDE_CODE_HOST_GATEWAY_LINEAGE=1");
  let a = new Set(getHostManagedProviderConflicts(process.env));
  a.delete("CLAUDE_CODE_HOST_CREDS_FILE");
  let l = withLaunchValuesOfHybridConnection(process.env);
  for (let o of new Set(FORWARDED_TEAMMATE_ENV)) {
    if (a.has(o)) continue;
    let h =
      o === "CLAUDE_CODE_AUTO_MODE_SERVER" && env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && isEnvTruthy(l[o])
        ? withHostEnvRestored_2(() => env.CLAUDE_CODE_AUTO_MODE_SERVER)
        : l[o];
    if (h !== undefined && h !== "") e.push(`${o}=${shellQuoteArgs([h])}`);
    else if (process.env[o] !== h) e.push(`${o}=''`);
  }
  let envClaudeSecurestorageConfigDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  if (envClaudeSecurestorageConfigDir !== undefined)
    e.push(`CLAUDE_SECURESTORAGE_CONFIG_DIR=${shellQuoteArgs([envClaudeSecurestorageConfigDir])}`);
  let CLAUDE_CODE_AUTO_MODE_TIER = env.CLAUDE_CODE_AUTO_MODE_TIER;
  if (CLAUDE_CODE_AUTO_MODE_TIER !== undefined)
    e.push(`CLAUDE_CODE_AUTO_MODE_TIER=${shellQuoteArgs([CLAUDE_CODE_AUTO_MODE_TIER])}`);
  e.push(`CLAUDE_CODE_ATTRIBUTION_PROJECT=${shellQuoteArgs([env.CLAUDE_CODE_ATTRIBUTION_PROJECT ?? ""])}`);
  e.push("CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS=");
  return e.join(" ");
}
//@ chunk-cne5hsvz.js:17597-17663 placement
function envAssignment(e, n) {
  return isAcceptableModelArg(n) ? `${e} ${shellQuoteArgs([n])}` : `${e}=${shellQuoteArgs([n])}`;
}
//@ chunk-cne5hsvz.js:17663-17692 placement
function resolveInheritedModel(agent) {
  return agent ?? getMainLoopModel();
}
//@ chunk-cne5hsvz.js:17692-17950 placement
function resolveTeammateModel(e, n) {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) e = undefined;
  if (e === "inherit") return resolveInheritedModel(n);
  if (e !== undefined) {
    if (!isModelAllowed(e)) return fallbackModelForTeammate(e, n);
    if (n !== null && modelMatchesFamilyAlias(e, n)) return n;
    return e;
  }
  let defaultSubagentModel = getDefaultSubagentModel();
  if (defaultSubagentModel !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(defaultSubagentModel);
    if (isModelAllowed(userSpecifiedModel)) return userSpecifiedModel;
    return fallbackModelForTeammate(defaultSubagentModel, n);
  }
  return resolveInheritedModel(n);
}
//@ chunk-cne5hsvz.js:17950-18009 placement
/**
 * 队友模型：显式模型可解析则用之，否则取默认子代理模型。
 */
function fallbackModelForTeammate(e, agent) {
  let a = stepDownRestrictedFamilyAliasPick(e);
  logTeammateModelNotAllowed(e, a !== null);
  return a ?? resolveAgentModelDisplay(agent);
}
//@ chunk-cne5hsvz.js:18009-18115 placement = resolveAgentModelDisplay (1)
/**
 * 默认队友模型：默认子代理模型不是 inherit 且有效时用之，否则回退。
 */
function resolveAgentModelDisplay(agent) {
  let defaultSubagentModel = getDefaultSubagentModel();
  if (defaultSubagentModel !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(defaultSubagentModel);
    if (isModelAllowed(userSpecifiedModel)) return userSpecifiedModel;
    return stepDownRestrictedFamilyAliasPick(defaultSubagentModel) ?? resolveInheritedModel(agent);
  }
  return resolveInheritedModel(agent);
}
//@ chunk-cne5hsvz.js:18115-18877 placement
function teammateModelFlags(model, mainLoopModel, modelSource = "tool") {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) model = undefined;
  let teammateModel = resolveTeammateModel(model, mainLoopModel);
  let defaultSubagentModel = getDefaultSubagentModel();
  let p = model === undefined && defaultSubagentModel !== "inherit" ? defaultSubagentModel : undefined;
  let [o, h] =
    model === "inherit"
      ? [mainLoopModel ?? teammateModel, "inherit"]
      : model !== undefined
        ? [model, modelSource]
        : p !== undefined
          ? [p, "env"]
          : [teammateModel, "default"];
  let r =
    p !== undefined
      ? !isModelAllowed(parseUserSpecifiedModel(p))
      : (h === "tool" || h === "frontmatter") && !isModelAllowed(o);
  let T = r && stepDownRestrictedFamilyAliasPick(o) !== null;
  let _ = r && !T;
  let u = modelFamilyOf(o, getCanonicalName(o));
  let w = modelFamilyOf(teammateModel, getCanonicalName(teammateModel));
  let A = {
    source: lit("teammate_spawn"),
    precedence: fromEnum(h),
    requested_family: fromEnum(u),
    resolved_family: fromEnum(w),
    requested_model: telemetrySafeModelName(o) ?? lit("none"),
    resolved_model: telemetrySafeModelName(teammateModel) ?? lit("none"),
  };
  if (T) logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", A);
  else if (_) logFeatureSad("subagent_model_resolve", "override_dropped", A);
  else if (h !== "default" && u !== "other" && w !== "other" && u !== w)
    logFeatureSad("subagent_model_resolve", "family_mismatch", A);
  else logFeatureOk("subagent_model_resolve", A);
  return teammateModel;
}
//@ chunk-cne5hsvz.js:18877-19054 placement
function logTeammateModelNotAllowed(e, n) {
  logForDebugging(
    `Teammate model "${e}" is not in the availableModels allowlist; using the ${n ? "newest allowed model in its family" : "leader's model"} instead`,
    {
      level: "warn",
    },
  );
}
export { envAssignment, teammateModelFlags, teammateEnvArgs };
