/**
 * utils/model/agent.ts
 *
 * 子代理模型解析（frontmatter model、Agent 工具参数、CLAUDE_CODE_SUBAGENT_MODEL、inherit），以及第三方提供商固定旧版本档位默认值的检测；另混入了 /model 选项构建的若干函数（chunk-hwmsct5x）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/agent.ts
 * pieces: chunk-4r745zza.js (1), chunk-e6aww6q8.js (10)
 * attribution: fingerprint 2, placement 6, callgraph-witnessed 1, layout 1, file-local 1
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
import { uniq } from "../collections.js";
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
import { catalogDefaultKeyForFamily } from "./classifierModel.js";
import { tierConfig } from "./stalePins.js";

//@ chunk-e6aww6q8.js:183116-183329 placement
/**
 * 决定 Explore 代理的模型：内置 Explore 默认继承，存在比 Opus 更新的族时继承上限为 Opus。
 */
function getExploreAgentModel(e, n) {
  if (e.agentType !== EXPLORE_AGENT.agentType || e.source !== "built-in") return e.model;
  if (modelIdsAreOpaque()) return "inherit";
  if (env.CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP) return "inherit";
  return hasNewerFamilyThanOpus(n)
    ? {
        inheritCap: OPUS,
      }
    : "inherit";
}
//@ chunk-e6aww6q8.js:183329-183344 placement
var OPUS = "opus";
//@ chunk-e6aww6q8.js:183344-183463 placement
function hasNewerFamilyThanOpus(e) {
  let n = modelFamilyOf_2(OPUS) ?? 1 / 0;
  let filtered = uniq(getModelCatalog_2().models.map((model) => model.family)).filter(
    (s) => (modelFamilyOf_2(s) ?? -1 / 0) > n,
  );
  return includesAnyIgnoreCase(e, filtered);
}
//@ chunk-e6aww6q8.js:1426182-1426268 callgraph-witnessed = getDefaultSubagentModel (0.711)
/**
 * CLAUDE_CODE_SUBAGENT_MODEL（未设或 inherit 时为 "inherit"）。
 */
function getDefaultSubagentModel() {
  let CLAUDE_CODE_SUBAGENT_MODEL = env.CLAUDE_CODE_SUBAGENT_MODEL;
  return CLAUDE_CODE_SUBAGENT_MODEL && CLAUDE_CODE_SUBAGENT_MODEL !== "inherit"
    ? CLAUDE_CODE_SUBAGENT_MODEL
    : "inherit";
}
//@ chunk-e6aww6q8.js:1426268-1427225 fingerprint = getAgentModel (0.609)
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
  let S = () =>
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
  let G = () => {
    let defaultSubagentModel = getDefaultSubagentModel();
    if (defaultSubagentModel === "inherit") return S();
    let Ee = applyParentRegionPrefix(parseUserSpecifiedModel(defaultSubagentModel), defaultSubagentModel);
    if (isModelAllowed(Ee)) return Ee;
    return stepDownRestrictedFamilyAliasPick(defaultSubagentModel) ?? S();
  };
  let q = (we, Ee, Ae = we) => {
    let model = stepDownRestrictedFamilyAliasPick(we);
    warnSubagentModelNotAllowed(we, model !== null);
    let Me = model !== null ? (Ee ? isOpus1mUnavailable(identityModelId(model)) : model) : G();
    if (
      strip1mSuffix(parseUserSpecifiedModel(Ae)).toLowerCase() !==
      strip1mSuffix(parseUserSpecifiedModel(Me)).toLowerCase()
    )
      onModelAdjusted?.(we, Me, model !== null ? "family_step_down" : "parent_inherit");
    return Me;
  };
  let Z = options?.inWorkflowRun ? getWorkflowSubagentModel() : undefined;
  [agentModel, toolSpecifiedModel] =
    Z !== undefined ? [undefined, undefined] : resolveAgentModelInputs(agentModel, toolSpecifiedModel);
  if (toolSpecifiedModel) {
    if (toolSpecifiedModel === "inherit") return S();
    if (modelMatchesFamilyAlias(toolSpecifiedModel, parentModel)) return parentModel;
    let we = applyParentRegionPrefix(
      isOpus1mUnavailable(parseUserSpecifiedModel(toolSpecifiedModel)),
      toolSpecifiedModel,
    );
    if (!isModelAllowed(we)) return q(toolSpecifiedModel, true, we);
    return we;
  }
  if (agentModel !== undefined && agentModel !== "inherit") {
    if (modelMatchesFamilyAlias(agentModel, parentModel)) return parentModel;
    let we = applyParentRegionPrefix(isOpus1mUnavailable(parseUserSpecifiedModel(agentModel)), agentModel);
    if (!isModelAllowed(we)) return q(agentModel, true, we);
    return we;
  }
  if (agentModel === "inherit") return S();
  let agentModelWithExp = Z ?? getDefaultSubagentModel();
  if (agentModelWithExp === "inherit") return S();
  let ke = applyParentRegionPrefix(parseUserSpecifiedModel(agentModelWithExp), agentModelWithExp);
  if (!isModelAllowed(ke)) return q(agentModelWithExp, false);
  return ke;
}
//@ chunk-e6aww6q8.js:1427225-1428132 layout
/**
 * 带来源统计的 getAgentModel：记录 subagent_model_resolve（来源、优先级、请求/解析族、降档或丢弃）。
 */
function getAgentModelWithTelemetry(
  exploreAgentModel,
  parentModel,
  model,
  permissionMode,
  onModelRestricted,
  y,
  S,
) {
  if (y === undefined)
    return getAgentModel(exploreAgentModel, parentModel, model, permissionMode, onModelRestricted, S);
  let w;
  let agentModel = getAgentModel(
    exploreAgentModel,
    parentModel,
    model,
    permissionMode,
    (We, ze, lt) => {
      w = lt;
      onModelRestricted?.(We, ze);
    },
    S,
  );
  let [G, q] = resolveAgentModelInputs(exploreAgentModel, model);
  let defaultSubagentModel = getDefaultSubagentModel();
  let Se = q
    ? q === "inherit"
      ? [parentModel, "inherit"]
      : [q, "tool"]
    : G && G !== "inherit"
      ? [G, "frontmatter"]
      : G !== "inherit" && defaultSubagentModel !== "inherit"
        ? [defaultSubagentModel, "env"]
        : [parentModel, "inherit"];
  let ke = S?.inWorkflowRun ? getWorkflowSubagentModel() : undefined;
  let [we, Ee] = ke !== undefined ? [ke, "workflow_env"] : Se;
  let Ae = modelFamilyOf(we, getCanonicalName(we));
  let Ie = modelFamilyOf(agentModel, getCanonicalName(agentModel));
  let Me = {
    source: fromEnum(y),
    precedence: fromEnum(Ee),
    requested_family: fromEnum(Ae),
    resolved_family: fromEnum(Ie),
    requested_model: telemetrySafeModelName(we) ?? lit_2("none"),
    resolved_model: telemetrySafeModelName(agentModel) ?? lit_2("none"),
  };
  if (w === "family_step_down") logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", Me);
  else if (w === "parent_inherit") logFeatureSad("subagent_model_resolve", "override_dropped", Me);
  else if (Ae !== "other" && Ie !== "other" && Ae !== Ie) {
    if (Ee === "inherit") logFeatureSad("subagent_model_resolve", "inherit_family_mismatch", Me);
    else logFeatureSad("subagent_model_resolve", "family_mismatch", Me);
  } else logFeatureOk("subagent_model_resolve", Me);
  return agentModel;
}
//@ chunk-e6aww6q8.js:1428132-1428315 file-local
/**
 * CLAUDE_CODE_SUBAGENT_MODEL_FORCE 时只保留 inherit 上限与 inherit 参数，忽略 frontmatter/工具参数。auto 名 getAgentModelDisplay 不准确。
 */
function resolveAgentModelInputs(e, n) {
  let r = typeof e === "object";
  let s = r ? e.inheritCap : e;
  if (!env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) return [s, n];
  return [
    r && getDefaultSubagentModel() === "inherit" ? s : undefined,
    n === "inherit" ? "inherit" : undefined,
  ];
}
//@ chunk-e6aww6q8.js:1428315-1428506 placement
function warnSubagentModelNotAllowed(e, n) {
  logForDebugging(
    `Subagent model "${e}" is not in the availableModels allowlist; ${n ? "using the newest allowed model in its family" : "inheriting the parent model"} instead`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:1428506-1428591 placement = isOpus1mUnavailable (1)
function isOpus1mUnavailable(model) {
  if (
    modelFamilyOf(model, getCanonicalName(model)) === "opus" &&
    !has1mSuffix_2(model) &&
    opus1mMergeAddsTagTo(model)
  )
    return identityModelId(model + "[1m]");
  return model;
}
//@ chunk-e6aww6q8.js:1428591-1428769 placement
/**
 * 判断模型是否匹配族别名（如 opus），包括模型 id 不透明时的 Opus 别名候选。
 */
function modelMatchesFamilyAlias(e, parentModel) {
  let lower = e.toLowerCase();
  if (!isBaseModelKey(lower)) return false;
  let s = strip1mSuffix(parentModel);
  if (isModelKeyAlias(s) && !isBaseModelKey(s)) return false;
  let canonicalName = getCanonicalName(parentModel);
  if (canonicalName.includes(lower)) return true;
  return (
    lower === "opus" &&
    modelIdsAreOpaque() &&
    !isDefaultOpusModelAdminSteered() &&
    isOpusAliasCandidate(parentModel, canonicalName)
  );
}
//@ chunk-4r745zza.js:639-768 fingerprint = aliasMatchesParentTier (1)
/**
 * 用当前提供商 catalog 别名的 sonnet/opus/haiku 键构造档位默认表（srt），任一缺失返回 undefined。
 */
function buildProviderTierDefaults(o) {
  let l = catalogDefaultKeyForFamily("sonnet", o);
  let f = catalogDefaultKeyForFamily("opus", o);
  let r = catalogDefaultKeyForFamily("haiku", o);
  return l === undefined || f === undefined || r === undefined ? undefined : tierConfig(f, l, r);
}
export {
  getAgentModel,
  getAgentModelWithTelemetry,
  getExploreAgentModel,
  getDefaultSubagentModel,
  buildProviderTierDefaults,
  modelMatchesFamilyAlias,
};
