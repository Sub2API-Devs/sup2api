/**
 * utils/model/modelOverrideNotices.ts
 *
 * 2.1.316 新增：模型来源覆盖提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (3)
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

//@ chunk-3wek6r2k.js:64581-66146 placement
/**
 * 汇总模型来源（命令行、环境变量、设置、代理定义），生成覆盖提示。
 */
async function collectModelOverrides(e) {
  let o = {
    cli: {
      model: e.userSpecifiedModel,
      isNonInteractiveSession: getIsNonInteractiveSession(),
    },
    env: process.env,
    settings: getSettings_DEPRECATED() || {},
    agentFrontmatter:
      e.agentModel !== undefined
        ? {
            model: e.agentModel,
            modelSource: e.agentModelSource,
          }
        : undefined,
  };
  let startupModel = resolveStartupModel(o, e.storageV5);
  let r;
  if (startupModel.restrictedModel !== undefined)
    try {
      r = await reprobeEntitlementDeny(startupModel.restrictedModel, e.storageV5, e.credentials);
      if (r === "overturned") startupModel = resolveStartupModel(o, e.storageV5);
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
  setSessionModelReprobe((A) => reprobeEntitlementDeny(A, e.storageV5, e.credentials));
  let orgModelDefault = getOrgModelDefault();
  let P = orgModelDefault !== null && !isRecognizedOrgDefaultName(orgModelDefault.name);
  if (P) logFeatureSad("model_org_default", "unrecognized");
  else setResolvedOrgDefault(getResolvedOrgDefaultModel());
  setInitialEnvDefaultModel(env.ANTHROPIC_DEFAULT_MODEL ?? null);
  if (env.ANTHROPIC_DEFAULT_MODEL !== undefined)
    if (getEnvDefaultModel() === null) logFeatureSad("model_env_default", "inert");
    else if (P) logFeatureSad("model_env_default", "org_default_unrecognized");
    else if (resolveDefaultMainLoopModelSetting().attribution === "org")
      logFeatureSad("model_env_default", "outranked_by_org_default");
    else logFeatureOk("model_env_default");
  if (!e.routineModelTransientlySkipped)
    syncRespawnFlag("--model", ["-m"], initialMainLoopModel, undefined, e.storageV5);
  if (restrictedModel !== undefined)
    logFeatureSad(
      "startup_resolve_model",
      r === "probe_failed" ? "entitlement_probe_failed" : "requested_model_restricted",
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
//@ chunk-3wek6r2k.js:66146-66539 placement
function applyAgentModelOverride(dynamicMcpConfig, mainThreadAgentDefinition, n) {
  if (!mainThreadAgentDefinition) return dynamicMcpConfig;
  if (isSafeMode()) return dynamicMcpConfig;
  if (isDiskless()) {
    if (mainThreadAgentDefinition.mcpServers?.length) reportOnce("main_agent_mcp_servers");
    return dynamicMcpConfig;
  }
  if (
    (n?.strictMcpConfig && mainThreadAgentDefinition.source !== "flagSettings") ||
    doesEnterpriseMcpConfigExist()
  )
    return dynamicMcpConfig;
  let u = agentMcpSpecsToScopedConfigs(mainThreadAgentDefinition);
  if (Object.keys(u).length === 0) return dynamicMcpConfig;
  let { allowed, blocked } = filterMcpServersByPolicy(u);
  if (blocked.length > 0) n?.onBlocked?.(blocked);
  let { servers, refused } = refuseReservedNamesForCarrier(allowed, dynamicMcpConfig);
  for (let M of refused)
    addAgentModelOverrideNotice({
      ...M,
      scope: "agent",
    });
  return {
    ...servers,
    ...dynamicMcpConfig,
  };
}
//@ chunk-3wek6r2k.js:66576-66663 placement
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
