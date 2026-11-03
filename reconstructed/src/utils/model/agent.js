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
import { modelFamilyOf as modelFamilyOf_2, Lt, I_, Nb } from "./modelIds.js";
import { uniq } from "../collections.js";
import { getModelCatalog } from "./modelCatalog.js";
import { includesAnyIgnoreCase } from "../toolErrors.js";
import { getRuntimeMainLoopModel, stepDownRestrictedFamilyAliasPick } from "./planModeModel.js";
import { getBedrockRegionPrefix_2, withBedrockRegionPrefix, nI } from "./bedrock.js";
import { parseUserSpecifiedModel, opus1mMergeAddsTagTo } from "./modelDisplay.js";
import { isModelAllowed } from "./modelAllowlist.js";
import { getWorkflowSubagentModel } from "../../services/workflows/workflowSubagentModel.js";
import { getCanonicalName } from "./canonicalModelName.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./telemetryModelName.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../debug.js";
import { has1mSuffix } from "./contextWindow1m.js";
import { isDefaultOpusModelAdminSteered } from "./smallFastModel.js";
import { isOpusAliasCandidate } from "./model.js";
import { catalogDefaultKeyForFamily } from "./classifierModel.js";
import { tierConfig } from "./stalePins.js";

/**
 * 决定 Explore 代理的模型：内置 Explore 默认继承，存在比 Opus 更新的族时继承上限为 Opus。
 */
//@ chunk-e6aww6q8.js:183116-183329 placement
function getExploreAgentModel(e, n) {
  if (e.agentType !== EXPLORE_AGENT.agentType || e.source !== "built-in") return e.model;
  if (modelIdsAreOpaque()) return "inherit";
  if (env.CLAUDE_CODE_DISABLE_EXPLORE_INHERIT_CAP) return "inherit";
  return hasNewerFamilyThanOpus(n) ? { inheritCap: OPUS } : "inherit";
}
//@ chunk-e6aww6q8.js:183329-183344 placement
var OPUS = "opus";
//@ chunk-e6aww6q8.js:183344-183463 placement
function hasNewerFamilyThanOpus(e) {
  let n = modelFamilyOf_2(OPUS) ?? 1 / 0,
    filtered = uniq(getModelCatalog().models.map((model) => model.family)).filter(
      (s) => (modelFamilyOf_2(s) ?? -1 / 0) > n,
    );
  return includesAnyIgnoreCase(e, filtered);
}
/**
 * CLAUDE_CODE_SUBAGENT_MODEL（未设或 inherit 时为 "inherit"）。
 */
//@ chunk-e6aww6q8.js:1426182-1426268 callgraph-witnessed = getDefaultSubagentModel (0.711)
function getDefaultSubagentModel() {
  let CLAUDE_CODE_SUBAGENT_MODEL = env.CLAUDE_CODE_SUBAGENT_MODEL;
  return CLAUDE_CODE_SUBAGENT_MODEL && CLAUDE_CODE_SUBAGENT_MODEL !== "inherit"
    ? CLAUDE_CODE_SUBAGENT_MODEL
    : "inherit";
}
/**
 * 子代理模型：工作流环境模型优先；Agent 工具参数 model，其次 frontmatter model，再次 CLAUDE_CODE_SUBAGENT_MODEL，否则继承主模型（plan 模式按 opusplan 规则）；别名与父模型同族时直接用父模型；Bedrock 继承父模型区域前缀；不被允许时降档或回落继承并回调原因。
 */
//@ chunk-e6aww6q8.js:1426268-1427225 fingerprint = getAgentModel (0.609)
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
        exceeds200kTokens: !1,
      }),
    parentRegionPrefix = getBedrockRegionPrefix_2(parentModel),
    applyParentRegionPrefix = (resolvedModel, originalSpec) => {
      if (parentRegionPrefix && getProviderForModel(resolvedModel) === "bedrock") {
        if (getBedrockRegionPrefix_2(originalSpec)) return resolvedModel;
        return withBedrockRegionPrefix(resolvedModel, parentRegionPrefix);
      }
      return resolvedModel;
    },
    G = () => {
      let we = getDefaultSubagentModel();
      if (we === "inherit") return S();
      let Ee = applyParentRegionPrefix(parseUserSpecifiedModel(we), we);
      if (isModelAllowed(Ee)) return Ee;
      return stepDownRestrictedFamilyAliasPick(we) ?? S();
    },
    q = (we, Ee, Ae = we) => {
      let model = stepDownRestrictedFamilyAliasPick(we);
      warnSubagentModelNotAllowed(we, model !== null);
      let Me = model !== null ? (Ee ? isOpus1mUnavailable(nI(model)) : model) : G();
      if (Lt(parseUserSpecifiedModel(Ae)).toLowerCase() !== Lt(parseUserSpecifiedModel(Me)).toLowerCase())
        onModelAdjusted?.(we, Me, model !== null ? "family_step_down" : "parent_inherit");
      return Me;
    },
    Z = options?.inWorkflowRun ? getWorkflowSubagentModel() : void 0;
  if (
    (([agentModel, toolSpecifiedModel] =
      Z !== void 0 ? [void 0, void 0] : resolveAgentModelInputs(agentModel, toolSpecifiedModel)),
    toolSpecifiedModel)
  ) {
    if (toolSpecifiedModel === "inherit") return S();
    if (modelMatchesFamilyAlias(toolSpecifiedModel, parentModel)) return parentModel;
    let we = applyParentRegionPrefix(
      isOpus1mUnavailable(parseUserSpecifiedModel(toolSpecifiedModel)),
      toolSpecifiedModel,
    );
    if (!isModelAllowed(we)) return q(toolSpecifiedModel, !0, we);
    return we;
  }
  if (agentModel !== void 0 && agentModel !== "inherit") {
    if (modelMatchesFamilyAlias(agentModel, parentModel)) return parentModel;
    let we = applyParentRegionPrefix(isOpus1mUnavailable(parseUserSpecifiedModel(agentModel)), agentModel);
    if (!isModelAllowed(we)) return q(agentModel, !0, we);
    return we;
  }
  if (agentModel === "inherit") return S();
  let agentModelWithExp = Z ?? getDefaultSubagentModel();
  if (agentModelWithExp === "inherit") return S();
  let ke = applyParentRegionPrefix(parseUserSpecifiedModel(agentModelWithExp), agentModelWithExp);
  if (!isModelAllowed(ke)) return q(agentModelWithExp, !1);
  return ke;
}
/**
 * 带来源统计的 getAgentModel：记录 subagent_model_resolve（来源、优先级、请求/解析族、降档或丢弃）。
 */
//@ chunk-e6aww6q8.js:1427225-1428132 layout
function getAgentModelWithTelemetry(e, n, r, s, h, y, S) {
  if (y === void 0) return getAgentModel(e, n, r, s, h, S);
  let w,
    L = getAgentModel(
      e,
      n,
      r,
      s,
      (We, ze, lt) => {
        ((w = lt), h?.(We, ze));
      },
      S,
    ),
    [G, q] = resolveAgentModelInputs(e, r),
    Z = getDefaultSubagentModel(),
    Se = q
      ? q === "inherit"
        ? [n, "inherit"]
        : [q, "tool"]
      : G && G !== "inherit"
        ? [G, "frontmatter"]
        : G !== "inherit" && Z !== "inherit"
          ? [Z, "env"]
          : [n, "inherit"],
    ke = S?.inWorkflowRun ? getWorkflowSubagentModel() : void 0,
    [we, Ee] = ke !== void 0 ? [ke, "workflow_env"] : Se,
    Ae = modelFamilyOf(we, getCanonicalName(we)),
    Ie = modelFamilyOf(L, getCanonicalName(L)),
    Me = {
      source: fromEnum(y),
      precedence: fromEnum(Ee),
      requested_family: fromEnum(Ae),
      resolved_family: fromEnum(Ie),
      requested_model: telemetrySafeModelName(we) ?? lit_2("none"),
      resolved_model: telemetrySafeModelName(L) ?? lit_2("none"),
    };
  if (w === "family_step_down") logFeatureSad("subagent_model_resolve", "family_alias_stepped_down", Me);
  else if (w === "parent_inherit") logFeatureSad("subagent_model_resolve", "override_dropped", Me);
  else if (Ae !== "other" && Ie !== "other" && Ae !== Ie)
    if (Ee === "inherit") logFeatureSad("subagent_model_resolve", "inherit_family_mismatch", Me);
    else logFeatureSad("subagent_model_resolve", "family_mismatch", Me);
  else logFeatureOk("subagent_model_resolve", Me);
  return L;
}
/**
 * CLAUDE_CODE_SUBAGENT_MODEL_FORCE 时只保留 inherit 上限与 inherit 参数，忽略 frontmatter/工具参数。auto 名 getAgentModelDisplay 不准确。
 */
//@ chunk-e6aww6q8.js:1428132-1428315 file-local
function resolveAgentModelInputs(e, n) {
  let r = typeof e === "object",
    s = r ? e.inheritCap : e;
  if (!env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE) return [s, n];
  return [r && getDefaultSubagentModel() === "inherit" ? s : void 0, n === "inherit" ? "inherit" : void 0];
}
//@ chunk-e6aww6q8.js:1428315-1428506 placement
function warnSubagentModelNotAllowed(e, n) {
  logForDebugging(
    `Subagent model "${e}" is not in the availableModels allowlist; ${n ? "using the newest allowed model in its family" : "inheriting the parent model"} instead`,
    { level: "warn" },
  );
}
//@ chunk-e6aww6q8.js:1428506-1428591 placement = isOpus1mUnavailable (1)
function isOpus1mUnavailable(model) {
  if (
    modelFamilyOf(model, getCanonicalName(model)) === "opus" &&
    !has1mSuffix(model) &&
    opus1mMergeAddsTagTo(model)
  )
    return nI(model + "[1m]");
  return model;
}
/**
 * 判断模型是否匹配族别名（如 opus），包括模型 id 不透明时的 Opus 别名候选。
 */
//@ chunk-e6aww6q8.js:1428591-1428769 placement
function modelMatchesFamilyAlias(e, n) {
  let lower = e.toLowerCase();
  if (!I_(lower)) return !1;
  let s = Lt(n);
  if (Nb(s) && !I_(s)) return !1;
  let h = getCanonicalName(n);
  if (h.includes(lower)) return !0;
  return (
    lower === "opus" && modelIdsAreOpaque() && !isDefaultOpusModelAdminSteered() && isOpusAliasCandidate(n, h)
  );
}
/**
 * 用当前提供商 catalog 别名的 sonnet/opus/haiku 键构造档位默认表（srt），任一缺失返回 undefined。
 */
//@ chunk-4r745zza.js:639-768 fingerprint = aliasMatchesParentTier (1)
function buildProviderTierDefaults(o) {
  let l = catalogDefaultKeyForFamily("sonnet", o),
    f = catalogDefaultKeyForFamily("opus", o),
    r = catalogDefaultKeyForFamily("haiku", o);
  return l === void 0 || f === void 0 || r === void 0 ? void 0 : tierConfig(f, l, r);
}

export {
  getAgentModel,
  getAgentModelWithTelemetry,
  getExploreAgentModel,
  getDefaultSubagentModel,
  buildProviderTierDefaults,
  modelMatchesFamilyAlias,
};
