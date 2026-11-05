/**
 * utils/model/agent.ts
 *
 * 子代理模型解析（frontmatter model、Agent 工具参数、CLAUDE_CODE_SUBAGENT_MODEL、inherit），以及第三方提供商固定旧版本档位默认值的检测；另混入了 /model 选项构建的若干函数（chunk-hwmsct5x）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/agent.ts
 * pieces: chunk-5xgkngpb.js (11)
 * attribution: placement 6, callgraph-witnessed 1, fingerprint 1, layout 2, file-local 1
 */
import { EXPLORE_AGENT } from "../../tools/AgentTool/built-in/exploreAgent.js";
import { modelIdsAreOpaque, getProviderForModel, modelFamilyOf } from "./providers.js";
import { env } from "../env.js";
import {
  modelFamilyOf as modelFamilyOf_2,
  strip1mSuffix,
  isBaseModelKey,
  isModelKeyAlias,
} from "./modelIds.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { getModelCatalog_2 } from "./modelCatalog.js";
import { includesAnyIgnoreCase } from "../toolErrors.js";
import { getRuntimeMainLoopModel, stepDownRestrictedFamilyAliasPick } from "./planModeModel.js";
import { getBedrockRegionPrefix_2, withBedrockRegionPrefix, identityModelId } from "./bedrock.js";
import { parseUserSpecifiedModel, opus1mMergeAddsTagTo } from "./modelDisplay.js";
import { isModelAllowed } from "./modelAllowlist.js";
import { getWorkflowSubagentModel } from "../../services/workflows/workflowSubagentModel.js";
import { getCanonicalName } from "./canonicalModelName.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { has1mSuffix_2 } from "./contextWindow1m.js";
import { isDefaultOpusModelAdminSteered } from "./smallFastModel.js";
import { isOpusAliasCandidate } from "./model.js";

//@ chunk-5xgkngpb.js:183226-183439 placement
/**
 * 决定 Explore 代理的模型：内置 Explore 默认继承，存在比 Opus 更新的族时继承上限为 Opus。
 */
function getExploreAgentModel(agent, requestedModel) {
  if (agent.agentType !== EXPLORE_AGENT.agentType || agent.source !== "built-in") return agent.model;
  if (modelIdsAreOpaque()) return "inherit";
  if (env.CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP) return "inherit";
  return hasNewerFamilyThanOpus(requestedModel)
    ? {
        inheritCap: OPUS,
      }
    : "inherit";
}
//@ chunk-5xgkngpb.js:183439-183454 placement
var OPUS = "opus";
//@ chunk-5xgkngpb.js:183454-183573 placement
function hasNewerFamilyThanOpus(modelList) {
  let opusFamily = modelFamilyOf_2(OPUS) ?? 1 / 0;
  let filtered = normalizeCaseForComparison_2(getModelCatalog_2().models.map((model) => model.family)).filter(
    (family) => (modelFamilyOf_2(family) ?? -1 / 0) > opusFamily,
  );
  return includesAnyIgnoreCase(modelList, filtered);
}
//@ chunk-5xgkngpb.js:1425655-1425741 callgraph-witnessed (2.1.88 match: getDefaultSubagentModel, 0.711)
/**
 * CLAUDE_CODE_SUBAGENT_MODEL（未设或 inherit 时为 "inherit"）。
 */
function getDefaultSubagentModel() {
  let CLAUDE_CODE_SUBAGENT_MODEL = env.CLAUDE_CODE_SUBAGENT_MODEL;
  return CLAUDE_CODE_SUBAGENT_MODEL && CLAUDE_CODE_SUBAGENT_MODEL !== "inherit"
    ? CLAUDE_CODE_SUBAGENT_MODEL
    : "inherit";
}
//@ chunk-5xgkngpb.js:1425741-1426701 fingerprint (2.1.88 match: getAgentModel, 0.609)
/**
 * 子代理模型：工作流环境模型优先；Agent 工具参数 model，其次 frontmatter model，再次 CLAUDE_CODE_SUBAGENT_MODEL，否则继承主模型（plan 模式按 opusplan 规则）；别名与父模型同族时直接用父模型；Bedrock 继承父模型区域前缀；不被允许时降档或回落继承并回调原因。
 */
function getAgentModel(
  agentModel,
  parentModel,
  toolSpecifiedModel,
  permissionMode,
  onModelAdjusted,
  options,
) {
  let inheritMainLoopModel = () =>
    getRuntimeMainLoopModel({
      permissionMode: permissionMode ?? "default",
      mainLoopModel: parentModel,
      exceeds200kTokens: false,
    });
  let parentRegionPrefix = getBedrockRegionPrefix_2(parentModel);
  let applyParentRegionPrefix = (resolvedModel, originalSpec) => {
    if (parentRegionPrefix && getProviderForModel(resolvedModel) === "bedrock") {
      if (getBedrockRegionPrefix_2(originalSpec)) return resolvedModel;
      return withBedrockRegionPrefix(resolvedModel, parentRegionPrefix);
    }
    return resolvedModel;
  };
  let defaultSubagentResolution = () => {
    let defaultSubagentModel = getDefaultSubagentModel();
    if (defaultSubagentModel === "inherit") return inheritMainLoopModel();
    let resolvedDefault = applyParentRegionPrefix(
      parseUserSpecifiedModel(defaultSubagentModel),
      defaultSubagentModel,
    );
    if (isModelAllowed(resolvedDefault)) return resolvedDefault;
    return stepDownRestrictedFamilyAliasPick(defaultSubagentModel) ?? inheritMainLoopModel();
  };
  let stepDownOrInherit = (spec, checkOpus1m, originalSpec = spec) => {
    let model = stepDownRestrictedFamilyAliasPick(spec);
    warnSubagentModelNotAllowed(spec, model !== null);
    let resolvedModel =
      model !== null
        ? checkOpus1m
          ? isOpus1mUnavailable(identityModelId(model))
          : model
        : defaultSubagentResolution();
    if (
      strip1mSuffix(parseUserSpecifiedModel(originalSpec)).toLowerCase() !==
      strip1mSuffix(parseUserSpecifiedModel(resolvedModel)).toLowerCase()
    )
      onModelAdjusted?.(spec, resolvedModel, model !== null ? "family_step_down" : "parent_inherit");
    return resolvedModel;
  };
  let workflowModel = options?.inWorkflowRun ? getWorkflowSubagentModel() : undefined;
  [agentModel, toolSpecifiedModel] =
    workflowModel !== undefined
      ? [undefined, undefined]
      : resolveAgentModelInputs(agentModel, toolSpecifiedModel);
  if (toolSpecifiedModel) {
    if (toolSpecifiedModel === "inherit") return inheritMainLoopModel();
    if (modelMatchesFamilyAlias(toolSpecifiedModel, parentModel)) return parentModel;
    let resolvedToolModel = applyParentRegionPrefix(
      isOpus1mUnavailable(parseUserSpecifiedModel(toolSpecifiedModel)),
      toolSpecifiedModel,
    );
    if (!isModelAllowed(resolvedToolModel))
      return stepDownOrInherit(toolSpecifiedModel, true, resolvedToolModel);
    return resolvedToolModel;
  }
  if (agentModel !== undefined && agentModel !== "inherit") {
    if (modelMatchesFamilyAlias(agentModel, parentModel)) return parentModel;
    let resolvedAgentModel = applyParentRegionPrefix(
      isOpus1mUnavailable(parseUserSpecifiedModel(agentModel)),
      agentModel,
    );
    if (!isModelAllowed(resolvedAgentModel)) return stepDownOrInherit(agentModel, true, resolvedAgentModel);
    return resolvedAgentModel;
  }
  if (agentModel === "inherit") return inheritMainLoopModel();
  let agentModelWithExp = workflowModel ?? getDefaultSubagentModel();
  if (agentModelWithExp === "inherit") return inheritMainLoopModel();
  let resolvedDefaultModel = applyParentRegionPrefix(
    parseUserSpecifiedModel(agentModelWithExp),
    agentModelWithExp,
  );
  if (!isModelAllowed(resolvedDefaultModel)) return stepDownOrInherit(agentModelWithExp, false);
  return resolvedDefaultModel;
}
//@ chunk-5xgkngpb.js:1426701-1427611 layout
/**
 * 带来源统计的 getAgentModel：记录 subagent_model_resolve（来源、优先级、请求/解析族、降档或丢弃）。
 */
function getAgentModelWithTelemetry(
  agentSpec,
  parentModel,
  toolSpec,
  permissionMode,
  onModelRestricted,
  source,
  options,
) {
  if (source === undefined)
    return getAgentModel(agentSpec, parentModel, toolSpec, permissionMode, onModelRestricted, options);
  let restrictedReason;
  let agentModel = getAgentModel(
    agentSpec,
    parentModel,
    toolSpec,
    permissionMode,
    (spec, resolved, reason) => {
      restrictedReason = reason;
      onModelRestricted?.(spec, resolved);
    },
    options,
  );
  let [agentSpec_2, toolSpec_2] = resolveAgentModelInputs(agentSpec, toolSpec);
  let defaultSubagentModel = getDefaultSubagentModel();
  let requestedPair = toolSpec_2
    ? toolSpec_2 === "inherit"
      ? [parentModel, "inherit"]
      : [toolSpec_2, "tool"]
    : agentSpec_2 && agentSpec_2 !== "inherit"
      ? [agentSpec_2, "frontmatter"]
      : agentSpec_2 !== "inherit" && defaultSubagentModel !== "inherit"
        ? [defaultSubagentModel, "env"]
        : [parentModel, "inherit"];
  let workflowModel = options?.inWorkflowRun ? getWorkflowSubagentModel() : undefined;
  let [requestedModel, precedence] =
    workflowModel !== undefined ? [workflowModel, "workflow_env"] : requestedPair;
  let requestedFamily = modelFamilyOf(requestedModel, getCanonicalName(requestedModel));
  let resolvedFamily = modelFamilyOf(agentModel, getCanonicalName(agentModel));
  let eventFields = {
    source: fromEnum(source),
    precedence: fromEnum(precedence),
    requested_family: fromEnum(requestedFamily),
    resolved_family: fromEnum(resolvedFamily),
    requested_model: telemetrySafeModelName(requestedModel) ?? lit_2("none"),
    resolved_model: telemetrySafeModelName(agentModel) ?? lit_2("none"),
  };
  if (restrictedReason === "family_step_down")
    logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", eventFields);
  else if (restrictedReason === "parent_inherit")
    logFeatureSad("subagent_model_resolve", "override_dropped", eventFields);
  else if (requestedFamily !== "other" && resolvedFamily !== "other" && requestedFamily !== resolvedFamily) {
    if (precedence === "inherit")
      logFeatureSad("subagent_model_resolve", "inherit_family_mismatch", eventFields);
    else logFeatureSad("subagent_model_resolve", "family_mismatch", eventFields);
  } else logFeatureOk("subagent_model_resolve", eventFields);
  return agentModel;
}
//@ chunk-5xgkngpb.js:1427611-1427794 file-local
/**
 * CLAUDE_CODE_SUBAGENT_MODEL_FORCE 时只保留 inherit 上限与 inherit 参数，忽略 frontmatter/工具参数。auto 名 getAgentModelDisplay 不准确。
 */
function resolveAgentModelInputs(agentSpec, toolSpec) {
  let hasInheritCap = typeof agentSpec === "object";
  let spec = hasInheritCap ? agentSpec.inheritCap : agentSpec;
  if (!env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) return [spec, toolSpec];
  return [
    hasInheritCap && getDefaultSubagentModel() === "inherit" ? spec : undefined,
    toolSpec === "inherit" ? "inherit" : undefined,
  ];
}
//@ chunk-5xgkngpb.js:1427794-1427885 layout (2.1.88 match: resolveAgentModelDisplay, 1)
function resolveAgentModelDisplay(agent, toolSpec) {
  let [model, explicitModel] = resolveAgentModelInputs(agent, toolSpec);
  if (explicitModel) return explicitModel === "inherit";
  return (model ?? getDefaultSubagentModel()) === "inherit";
}
//@ chunk-5xgkngpb.js:1427885-1428076 placement
function warnSubagentModelNotAllowed(spec, steppedDown) {
  logForDebugging(
    `Subagent model "${spec}" is not in the availableModels allowlist; ${steppedDown ? "using the newest allowed model in its family" : "inheriting the parent model"} instead`,
    {
      level: "warn",
    },
  );
}
//@ chunk-5xgkngpb.js:1428076-1428161 placement (2.1.88 match: isOpus1mUnavailable, 1)
function isOpus1mUnavailable(model) {
  if (
    modelFamilyOf(model, getCanonicalName(model)) === "opus" &&
    !has1mSuffix_2(model) &&
    opus1mMergeAddsTagTo(model)
  )
    return identityModelId(model + "[1m]");
  return model;
}
//@ chunk-5xgkngpb.js:1428161-1428339 placement
/**
 * 判断模型是否匹配族别名（如 opus），包括模型 id 不透明时的 Opus 别名候选。
 */
function modelMatchesFamilyAlias(spec, model) {
  let lower = spec.toLowerCase();
  if (!isBaseModelKey(lower)) return false;
  let parentKey = strip1mSuffix(model);
  if (isModelKeyAlias(parentKey) && !isBaseModelKey(parentKey)) return false;
  let canonicalName = getCanonicalName(model);
  if (canonicalName.includes(lower)) return true;
  return (
    lower === "opus" &&
    modelIdsAreOpaque() &&
    !isDefaultOpusModelAdminSteered() &&
    isOpusAliasCandidate(model, canonicalName)
  );
}
export {
  modelMatchesFamilyAlias,
  getDefaultSubagentModel,
  getAgentModel,
  getExploreAgentModel,
  getAgentModelWithTelemetry,
  resolveAgentModelDisplay,
};
