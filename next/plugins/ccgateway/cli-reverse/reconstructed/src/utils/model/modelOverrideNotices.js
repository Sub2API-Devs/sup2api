/**
 * utils/model/modelOverrideNotices.ts
 *
 * 2.1.316 新增：模型来源覆盖提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (3)
 * attribution: placement 3
 */
import {
  getIsNonInteractiveSession,
  setMainLoopModelOverride,
  setInitialMainLoopModel,
  setInitialModelSettingLayer,
  setResolvedOrgDefault,
  setInitialEnvDefaultModel,
  isDiskless,
} from "../../bootstrap/state.js";
import { getSettings_DEPRECATED } from "../settings/settings.js";
import { resolveStartupModel } from "../permissions/permissionSetup.js";
import { reprobeEntitlementDeny } from "./validateModel.js";
import { logError } from "../log.js";
import { setSessionModelReprobe } from "./sessionModelRestriction.js";
import { getOrgModelDefault } from "./modelAllowlist.js";
import {
  isRecognizedOrgDefaultName,
  getResolvedOrgDefaultModel,
  resolveDefaultMainLoopModelSetting,
} from "./planModeModel.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { env } from "../env.js";
import { getEnvDefaultModel } from "./defaultModel.js";
import { syncRespawnFlag } from "../../services/daemon/jobState.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { isUnservedFamilySpelling } from "./model.js";
import { isSafeMode } from "../envUtils.js";
import { reportOnce } from "../reportOnce.js";
import {
  doesEnterpriseMcpConfigExist,
  filterMcpServersByPolicy,
  refuseReservedNamesForCarrier,
  addAgentModelOverrideNotice,
} from "../../services/mcp/config.js";
import { agentMcpSpecsToScopedConfigs } from "../../tools/AgentTool/loadAgentsDir.js";

//@ chunk-hjswk319.js:64005-65570 placement
/**
 * 汇总模型来源（命令行、环境变量、设置、代理定义），生成覆盖提示。
 */
async function collectModelOverrides(options) {
  let sources = {
    cli: {
      model: options.userSpecifiedModel,
      isNonInteractiveSession: getIsNonInteractiveSession(),
    },
    env: process.env,
    settings: getSettings_DEPRECATED() || {},
    agentFrontmatter:
      options.agentModel !== undefined
        ? {
            model: options.agentModel,
            modelSource: options.agentModelSource,
          }
        : undefined,
  };
  let startupModel = resolveStartupModel(sources, options.storageV5);
  let reprobeResult;
  if (startupModel.restrictedModel !== undefined)
    try {
      reprobeResult = await reprobeEntitlementDeny(
        startupModel.restrictedModel,
        options.storageV5,
        options.credentials,
      );
      if (reprobeResult === "overturned") startupModel = resolveStartupModel(sources, options.storageV5);
    } catch (error) {
      logError(error);
    }
  let {
    effectiveModel,
    initialMainLoopModel,
    resolvedInitialModel,
    rawModelRequest,
    restrictedModel,
    unservedModelSpelling,
    settingLayer,
  } = startupModel;
  setMainLoopModelOverride(effectiveModel);
  setInitialMainLoopModel(initialMainLoopModel);
  setInitialModelSettingLayer(settingLayer);
  setSessionModelReprobe((model) => reprobeEntitlementDeny(model, options.storageV5, options.credentials));
  let orgModelDefault = getOrgModelDefault();
  let orgDefaultUnrecognized = orgModelDefault !== null && !isRecognizedOrgDefaultName(orgModelDefault.name);
  if (orgDefaultUnrecognized) logFeatureSad("model_org_default", "unrecognized");
  else setResolvedOrgDefault(getResolvedOrgDefaultModel());
  setInitialEnvDefaultModel(env.ANTHROPIC_DEFAULT_MODEL ?? null);
  if (env.ANTHROPIC_DEFAULT_MODEL !== undefined)
    if (getEnvDefaultModel() === null) logFeatureSad("model_env_default", "inert");
    else if (orgDefaultUnrecognized) logFeatureSad("model_env_default", "org_default_unrecognized");
    else if (resolveDefaultMainLoopModelSetting().attribution === "org")
      logFeatureSad("model_env_default", "outranked_by_org_default");
    else logFeatureOk("model_env_default");
  if (!options.routineModelTransientlySkipped)
    syncRespawnFlag("--model", ["-m"], initialMainLoopModel, undefined, options.storageV5);
  if (restrictedModel !== undefined)
    logFeatureSad(
      "startup_resolve_model",
      reprobeResult === "probe_failed" ? "entitlement_probe_failed" : "requested_model_restricted",
      {
        model: telemetrySafeModelName(restrictedModel) ?? lit("nonconforming"),
      },
    );
  else if (unservedModelSpelling !== undefined)
    logFeatureSad(
      "startup_resolve_model",
      isUnservedFamilySpelling(unservedModelSpelling)
        ? "family_spelling_unserved"
        : "persisted_spelling_unserved",
    );
  else logFeatureOk("startup_resolve_model");
  return {
    effectiveModel,
    initialMainLoopModel,
    resolvedInitialModel,
    rawModelRequest,
    restrictedModel,
    unservedModelSpelling,
    settingLayer,
    modelWithoutStartupOverride: startupModel.modelWithoutStartupOverride,
  };
}
//@ chunk-hjswk319.js:65570-65963 placement
function applyAgentModelOverride(configs, agent, options) {
  if (!agent) return configs;
  if (isSafeMode()) return configs;
  if (isDiskless()) {
    if (agent.mcpServers?.length) reportOnce("main_agent_mcp_servers");
    return configs;
  }
  if ((options?.strictMcpConfig && agent.source !== "flagSettings") || doesEnterpriseMcpConfigExist())
    return configs;
  let agentSpecs = agentMcpSpecsToScopedConfigs(agent);
  if (Object.keys(agentSpecs).length === 0) return configs;
  let { allowed, blocked } = filterMcpServersByPolicy(agentSpecs);
  if (blocked.length > 0) options?.onBlocked?.(blocked);
  let { servers, refused } = refuseReservedNamesForCarrier(allowed, configs);
  for (let refusal of refused)
    addAgentModelOverrideNotice({
      ...refusal,
      scope: "agent",
    });
  return {
    ...servers,
    ...configs,
  };
}
//@ chunk-hjswk319.js:66000-66087 placement
/**
 * 模型 pin 格式正则、空白提示正则与提示文本长度上限。
 */
var MODEL_PIN_PATTERNS = /^v1:([1-9][0-9]{0,8}):([0-9a-f]{64})$/;
var BLANK_NOTICE_RE = /^[\s\u001c-\u001f\u0085]+$/;
var MAX_OVERRIDE_NOTICE_CHARS = 1024;
export {
  applyAgentModelOverride,
  collectModelOverrides,
  MODEL_PIN_PATTERNS,
  BLANK_NOTICE_RE,
  MAX_OVERRIDE_NOTICE_CHARS,
};
