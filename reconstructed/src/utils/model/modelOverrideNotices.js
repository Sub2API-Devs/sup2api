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
import { GEi } from "./sessionModelRestriction.js";
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

/**
 * 汇总模型来源（命令行、环境变量、设置、代理定义），生成覆盖提示。
 */
//@ chunk-3wek6r2k.js:64581-66146 placement
async function collectModelOverrides(e) {
  let o = {
      cli: { model: e.userSpecifiedModel, isNonInteractiveSession: getIsNonInteractiveSession() },
      env: process.env,
      settings: getSettings_DEPRECATED() || {},
      agentFrontmatter:
        e.agentModel !== void 0 ? { model: e.agentModel, modelSource: e.agentModelSource } : void 0,
    },
    n = resolveStartupModel(o, e.storageV5),
    r;
  if (n.restrictedModel !== void 0)
    try {
      if (
        ((r = await reprobeEntitlementDeny(n.restrictedModel, e.storageV5, e.credentials)),
        r === "overturned")
      )
        n = resolveStartupModel(o, e.storageV5);
    } catch (error) {
      logError(error);
    }
  let {
    effectiveModel: effectiveModel,
    initialMainLoopModel: initialMainLoopModel,
    resolvedInitialModel: resolvedInitialModel,
    rawModelRequest: rawModelRequest,
    restrictedModel: restrictedModel,
    unservedModelSpelling: unservedModelSpelling,
    settingLayer: settingLayer,
  } = n;
  (setMainLoopModelOverride(effectiveModel),
    setInitialMainLoopModel(initialMainLoopModel),
    setInitialModelSettingLayer(settingLayer),
    GEi((A) => reprobeEntitlementDeny(A, e.storageV5, e.credentials)));
  let w = getOrgModelDefault(),
    P = w !== null && !isRecognizedOrgDefaultName(w.name);
  if (P) logFeatureSad("model_org_default", "unrecognized");
  else setResolvedOrgDefault(getResolvedOrgDefaultModel());
  if (
    (setInitialEnvDefaultModel(env.ANTHROPIC_DEFAULT_MODEL ?? null), env.ANTHROPIC_DEFAULT_MODEL !== void 0)
  )
    if (getEnvDefaultModel() === null) logFeatureSad("model_env_default", "inert");
    else if (P) logFeatureSad("model_env_default", "org_default_unrecognized");
    else if (resolveDefaultMainLoopModelSetting().attribution === "org")
      logFeatureSad("model_env_default", "outranked_by_org_default");
    else logFeatureOk("model_env_default");
  if (!e.routineModelTransientlySkipped)
    syncRespawnFlag("--model", ["-m"], initialMainLoopModel, void 0, e.storageV5);
  if (restrictedModel !== void 0)
    logFeatureSad(
      "startup_resolve_model",
      r === "probe_failed" ? "entitlement_probe_failed" : "requested_model_restricted",
      { model: telemetrySafeModelName(restrictedModel) ?? lit("nonconforming") },
    );
  else if (unservedModelSpelling !== void 0)
    logFeatureSad(
      "startup_resolve_model",
      isUnservedFamilySpelling(unservedModelSpelling)
        ? "family_spelling_unserved"
        : "persisted_spelling_unserved",
    );
  else logFeatureOk("startup_resolve_model");
  return {
    effectiveModel: effectiveModel,
    initialMainLoopModel: initialMainLoopModel,
    resolvedInitialModel: resolvedInitialModel,
    rawModelRequest: rawModelRequest,
    restrictedModel: restrictedModel,
    unservedModelSpelling: unservedModelSpelling,
    settingLayer: settingLayer,
    modelWithoutStartupOverride: n.modelWithoutStartupOverride,
  };
}
//@ chunk-3wek6r2k.js:66146-66539 placement
function applyAgentModelOverride(e, o, n) {
  if (!o) return e;
  if (isSafeMode()) return e;
  if (isDiskless()) {
    if (o.mcpServers?.length) reportOnce("main_agent_mcp_servers");
    return e;
  }
  if ((n?.strictMcpConfig && o.source !== "flagSettings") || doesEnterpriseMcpConfigExist()) return e;
  let u = agentMcpSpecsToScopedConfigs(o);
  if (Object.keys(u).length === 0) return e;
  let { allowed: allowed, blocked: blocked } = filterMcpServersByPolicy(u);
  if (blocked.length > 0) n?.onBlocked?.(blocked);
  let { servers: servers, refused: refused } = refuseReservedNamesForCarrier(allowed, e);
  for (let M of refused) addAgentModelOverrideNotice({ ...M, scope: "agent" });
  return { ...servers, ...e };
}
//@ chunk-3wek6r2k.js:66576-66663 placement
var MODEL_PIN_PATTERNS = /^v1:([1-9][0-9]{0,8}):([0-9a-f]{64})$/,
  Eu = /^[\s\u001c-\u001f\u0085]+$/,
  va = 1024;

export { applyAgentModelOverride, collectModelOverrides, MODEL_PIN_PATTERNS, Eu, va };
