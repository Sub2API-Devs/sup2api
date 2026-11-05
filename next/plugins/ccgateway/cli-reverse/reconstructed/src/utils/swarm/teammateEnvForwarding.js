/**
 * utils/swarm/teammateEnvForwarding.ts
 *
 * 2.1.316 新增：队友进程环境变量与模型参数转发
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5j7d17eb.js (6), chunk-pgmbxgj8.js (4)
 * attribution: placement 10
 */
import { caCertEnvVars, caCertEnvVarList } from "../settings/managedSettingsKeys.js";
import { TLS_CERT_ENV_VARS, getHostManagedProviderConflicts } from "../managedEnvConstants.js";
import { withHostOwnedEnv, withHostEnvRestored_2 } from "../settings/hostEnvWrites.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pgmbxgj8.js:2079-3846 placement
var FORWARDED_TEAMMATE_ENV; // deferred: uses CA_CERT_ENV_VARS_2 (../settings/managedSettingsKeys.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pgmbxgj8.js:2079", () => {
  FORWARDED_TEAMMATE_ENV = [
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
    "CLAUDE_CODE_DISABLE_MCP_TASKS",
    "CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES",
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
});
//@ chunk-pgmbxgj8.js:3846-3874 placement
function teammateEnvArgs() {
  return withHostOwnedEnv(buildTeammateEnv);
}
//@ chunk-pgmbxgj8.js:3874-4840 placement
function buildTeammateEnv() {
  let pairs = ["CLAUDECODE=1", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"];
  let { sessionListId } = swarmHostState().taskList;
  if (sessionListId) pairs.push(`CLAUDE_CODE_TASK_LIST_ID=${shellQuoteArgs([sessionListId])}`);
  if (isProviderManagedByHost()) pairs.push("CLAUDE_CODE_HOST_GATEWAY_LINEAGE=1");
  let conflicts = new Set(getHostManagedProviderConflicts(process.env));
  conflicts.delete("CLAUDE_CODE_HOST_CREDS_FILE");
  let sourceEnv = withLaunchValuesOfHybridConnection(process.env);
  for (let name of new Set(FORWARDED_TEAMMATE_ENV)) {
    if (conflicts.has(name)) continue;
    let value =
      name === "CLAUDE_CODE_AUTO_MODE_SERVER" &&
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
      isEnvTruthy(sourceEnv[name])
        ? withHostEnvRestored_2(() => env.CLAUDE_CODE_AUTO_MODE_SERVER)
        : sourceEnv[name];
    if (value !== undefined && value !== "") pairs.push(`${name}=${shellQuoteArgs([value])}`);
    else if (process.env[name] !== value) pairs.push(`${name}=''`);
  }
  let envClaudeSecurestorageConfigDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  if (envClaudeSecurestorageConfigDir !== undefined)
    pairs.push(`CLAUDE_SECURESTORAGE_CONFIG_DIR=${shellQuoteArgs([envClaudeSecurestorageConfigDir])}`);
  let CLAUDE_CODE_AUTO_MODE_TIER = env.CLAUDE_CODE_AUTO_MODE_TIER;
  if (CLAUDE_CODE_AUTO_MODE_TIER !== undefined)
    pairs.push(`CLAUDE_CODE_AUTO_MODE_TIER=${shellQuoteArgs([CLAUDE_CODE_AUTO_MODE_TIER])}`);
  pairs.push(
    `CLAUDE_CODE_ATTRIBUTION_PROJECT=${shellQuoteArgs([env.CLAUDE_CODE_ATTRIBUTION_PROJECT ?? ""])}`,
  );
  pairs.push("CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS=");
  return pairs.join(" ");
}
//@ chunk-pgmbxgj8.js:4840-4908 placement
function envAssignment(flag, value) {
  return isAcceptableModelArg(value)
    ? `${flag} ${shellQuoteArgs([value])}`
    : `${flag}=${shellQuoteArgs([value])}`;
}
//@ chunk-5j7d17eb.js:15242-15271 placement
function resolveInheritedModel(agent) {
  return agent ?? getMainLoopModel();
}
//@ chunk-5j7d17eb.js:15271-15529 placement
function resolveTeammateModel(model, agent) {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) model = undefined;
  if (model === "inherit") return resolveInheritedModel(agent);
  if (model !== undefined) {
    if (!isModelAllowed(model)) return fallbackModelForTeammate(model, agent);
    if (agent !== null && modelMatchesFamilyAlias(model, agent)) return agent;
    return model;
  }
  let model_2 = getDefaultSubagentModel();
  if (model_2 !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(model_2);
    if (isModelAllowed(userSpecifiedModel)) return userSpecifiedModel;
    return fallbackModelForTeammate(model_2, agent);
  }
  return resolveInheritedModel(agent);
}
//@ chunk-5j7d17eb.js:15529-15588 placement
/**
 * 队友模型：显式模型可解析则用之，否则取默认子代理模型。
 */
function fallbackModelForTeammate(model, agent) {
  let steppedDown = stepDownRestrictedFamilyAliasPick(model);
  logTeammateModelNotAllowed(model, steppedDown !== null);
  return steppedDown ?? resolveAgentModelDisplay(agent);
}
//@ chunk-5j7d17eb.js:15588-15694 placement (2.1.88 match: resolveAgentModelDisplay, 1)
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
//@ chunk-5j7d17eb.js:15759-16521 placement
function teammateModelFlags(model, mainLoopModel, modelSource = "tool") {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) model = undefined;
  let teammateModel = resolveTeammateModel(model, mainLoopModel);
  let defaultSubagentModel = getDefaultSubagentModel();
  let envDefaultModel =
    model === undefined && defaultSubagentModel !== "inherit" ? defaultSubagentModel : undefined;
  let [requestedModel, precedence] =
    model === "inherit"
      ? [mainLoopModel ?? teammateModel, "inherit"]
      : model !== undefined
        ? [model, modelSource]
        : envDefaultModel !== undefined
          ? [envDefaultModel, "env"]
          : [teammateModel, "default"];
  let notAllowed =
    envDefaultModel !== undefined
      ? !isModelAllowed(parseUserSpecifiedModel(envDefaultModel))
      : (precedence === "tool" || precedence === "frontmatter") && !isModelAllowed(requestedModel);
  let steppedDown = notAllowed && stepDownRestrictedFamilyAliasPick(requestedModel) !== null;
  let dropped = notAllowed && !steppedDown;
  let requestedFamily = modelFamilyOf(requestedModel, getCanonicalName(requestedModel));
  let resolvedFamily = modelFamilyOf(teammateModel, getCanonicalName(teammateModel));
  let telemetryFields = {
    source: lit("teammate_spawn"),
    precedence: fromEnum(precedence),
    requested_family: fromEnum(requestedFamily),
    resolved_family: fromEnum(resolvedFamily),
    requested_model: telemetrySafeModelName(requestedModel) ?? lit("none"),
    resolved_model: telemetrySafeModelName(teammateModel) ?? lit("none"),
  };
  if (steppedDown) logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", telemetryFields);
  else if (dropped) logFeatureSad("subagent_model_resolve", "override_dropped", telemetryFields);
  else if (
    precedence !== "default" &&
    requestedFamily !== "other" &&
    resolvedFamily !== "other" &&
    requestedFamily !== resolvedFamily
  )
    logFeatureSad("subagent_model_resolve", "family_mismatch", telemetryFields);
  else logFeatureOk("subagent_model_resolve", telemetryFields);
  return teammateModel;
}
//@ chunk-5j7d17eb.js:16521-16698 placement
function logTeammateModelNotAllowed(model, steppedDown) {
  logForDebugging(
    `Teammate model "${model}" is not in the availableModels allowlist; using the ${steppedDown ? "newest allowed model in its family" : "leader's model"} instead`,
    {
      level: "warn",
    },
  );
}
export { envAssignment, teammateModelFlags, teammateEnvArgs };
