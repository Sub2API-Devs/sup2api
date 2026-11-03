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
import { Gle, wve } from "../settings/managedSettingsKeys.js";
import { nbr, getHostManagedProviderConflicts } from "../managedEnvConstants.js";
import { withHostOwnedEnv, withHostEnvRestored } from "../settings/managedSettingsFiles.js";
import { ci } from "./hostState.js";
import { shellQuoteArgs } from "../bash/bashPipeCommand.js";
import { isProviderManagedByHost } from "../entrypointKinds.js";
import { withLaunchValuesOfHybridConnection } from "../managedEnvApply.js";
import { env } from "../env.js";
import { isEnvTruthy } from "../envUtils.js";
import { Xse } from "../../services/daemon/processLiveness.js";
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
  ...Gle,
  ...Object.keys(wve),
  ...nbr,
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
  let e = ["CLAUDECODE=1", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"],
    { sessionListId: sessionListId } = ci().taskList;
  if (sessionListId) e.push(`CLAUDE_CODE_TASK_LIST_ID=${shellQuoteArgs([sessionListId])}`);
  if (isProviderManagedByHost()) e.push("CLAUDE_CODE_HOST_GATEWAY_LINEAGE=1");
  let a = new Set(getHostManagedProviderConflicts(process.env));
  a.delete("CLAUDE_CODE_HOST_CREDS_FILE");
  let l = withLaunchValuesOfHybridConnection(process.env);
  for (let o of new Set(FORWARDED_TEAMMATE_ENV)) {
    if (a.has(o)) continue;
    let h =
      o === "CLAUDE_CODE_AUTO_MODE_SERVER" && env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST && isEnvTruthy(l[o])
        ? withHostEnvRestored(() => env.CLAUDE_CODE_AUTO_MODE_SERVER)
        : l[o];
    if (h !== void 0 && h !== "") e.push(`${o}=${shellQuoteArgs([h])}`);
    else if (process.env[o] !== h) e.push(`${o}=''`);
  }
  let envClaudeSecurestorageConfigDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  if (envClaudeSecurestorageConfigDir !== void 0)
    e.push(`CLAUDE_SECURESTORAGE_CONFIG_DIR=${shellQuoteArgs([envClaudeSecurestorageConfigDir])}`);
  let CLAUDE_CODE_AUTO_MODE_TIER = env.CLAUDE_CODE_AUTO_MODE_TIER;
  if (CLAUDE_CODE_AUTO_MODE_TIER !== void 0)
    e.push(`CLAUDE_CODE_AUTO_MODE_TIER=${shellQuoteArgs([CLAUDE_CODE_AUTO_MODE_TIER])}`);
  return (
    e.push(`CLAUDE_CODE_ATTRIBUTION_PROJECT=${shellQuoteArgs([env.CLAUDE_CODE_ATTRIBUTION_PROJECT ?? ""])}`),
    e.push("CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS="),
    e.join(" ")
  );
}
//@ chunk-cne5hsvz.js:17597-17663 placement
function envAssignment(e, n) {
  return Xse(n) ? `${e} ${shellQuoteArgs([n])}` : `${e}=${shellQuoteArgs([n])}`;
}
//@ chunk-cne5hsvz.js:17663-17692 placement
function B(e) {
  return e ?? getMainLoopModel();
}
//@ chunk-cne5hsvz.js:17692-17950 placement
function resolveTeammateModel(e, n) {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) e = void 0;
  if (e === "inherit") return B(n);
  if (e !== void 0) {
    if (!isModelAllowed(e)) return z(e, n);
    if (n !== null && modelMatchesFamilyAlias(e, n)) return n;
    return e;
  }
  let a = getDefaultSubagentModel();
  if (a !== "inherit") {
    let l = parseUserSpecifiedModel(a);
    if (isModelAllowed(l)) return l;
    return z(a, n);
  }
  return B(n);
}
/**
 * 队友模型：显式模型可解析则用之，否则取默认子代理模型。
 */
//@ chunk-cne5hsvz.js:17950-18009 placement
function z(e, n) {
  let a = stepDownRestrictedFamilyAliasPick(e);
  return (logTeammateModelNotAllowed(e, a !== null), a ?? resolveAgentModelDisplay(n));
}
/**
 * 默认队友模型：默认子代理模型不是 inherit 且有效时用之，否则回退。
 */
//@ chunk-cne5hsvz.js:18009-18115 placement = resolveAgentModelDisplay (1)
function resolveAgentModelDisplay(agent) {
  let n = getDefaultSubagentModel();
  if (n !== "inherit") {
    let a = parseUserSpecifiedModel(n);
    if (isModelAllowed(a)) return a;
    return stepDownRestrictedFamilyAliasPick(n) ?? B(agent);
  }
  return B(agent);
}
//@ chunk-cne5hsvz.js:18115-18877 placement
function teammateModelFlags(e, n, a = "tool") {
  if (env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) e = void 0;
  let l = resolveTeammateModel(e, n),
    E = getDefaultSubagentModel(),
    p = e === void 0 && E !== "inherit" ? E : void 0,
    [o, h] =
      e === "inherit"
        ? [n ?? l, "inherit"]
        : e !== void 0
          ? [e, a]
          : p !== void 0
            ? [p, "env"]
            : [l, "default"],
    r =
      p !== void 0
        ? !isModelAllowed(parseUserSpecifiedModel(p))
        : (h === "tool" || h === "frontmatter") && !isModelAllowed(o),
    T = r && stepDownRestrictedFamilyAliasPick(o) !== null,
    _ = r && !T,
    u = modelFamilyOf(o, getCanonicalName(o)),
    w = modelFamilyOf(l, getCanonicalName(l)),
    A = {
      source: lit("teammate_spawn"),
      precedence: fromEnum(h),
      requested_family: fromEnum(u),
      resolved_family: fromEnum(w),
      requested_model: telemetrySafeModelName(o) ?? lit("none"),
      resolved_model: telemetrySafeModelName(l) ?? lit("none"),
    };
  if (T) logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", A);
  else if (_) logFeatureSad("subagent_model_resolve", "override_dropped", A);
  else if (h !== "default" && u !== "other" && w !== "other" && u !== w)
    logFeatureSad("subagent_model_resolve", "family_mismatch", A);
  else logFeatureOk("subagent_model_resolve", A);
  return l;
}
//@ chunk-cne5hsvz.js:18877-19054 placement
function logTeammateModelNotAllowed(e, n) {
  logForDebugging(
    `Teammate model "${e}" is not in the availableModels allowlist; using the ${n ? "newest allowed model in its family" : "leader's model"} instead`,
    { level: "warn" },
  );
}

export { envAssignment, teammateModelFlags, teammateEnvArgs };
