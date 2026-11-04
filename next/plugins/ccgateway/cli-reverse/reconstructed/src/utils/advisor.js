/**
 * utils/advisor.ts
 *
 * Advisor（服务器端顾问工具 advisor_20260301）：/advisor 命令、开关条件（第一方类提供商、实验开关）、按 catalog 的 advisor_rank 判定谁能当顾问、被 API 拒绝后按进程或按 base URL 熔断，以及 usage.iterations 里的顾问用量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/advisor.ts
 * pieces: chunk-9b6702jm.js (5), chunk-s61vbvea.js (42)
 * attribution: placement 14, layout 29, fingerprint 3, file-local 1
 */
import { getErrorMessageIfRefusal } from "../services/api/errors.js";
import { env } from "./env.js";
import { getAPIProvider, isClaudePlatformProvider } from "./model/providers.js";
import { canSendFirstPartyBetas } from "./betas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getCatalogEntry } from "./model/modelCatalog.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import {
  parseUserSpecifiedModel,
  renderUsageCreditsOnlyModelName,
  renderDefaultModelSetting,
} from "./model/modelDisplay.js";
import {
  getIsNonInteractiveSession,
  getStickyBetas,
  setFlagSettingsInline,
  getFlagSettingsInline,
} from "../bootstrap/state.js";
import { isFableModelValue, isFableAvailable, isMythosModelValue, isMythosAvailable } from "./model/model.js";
import { getModelUnavailabilityReason } from "./model/classifierModel.js";
import {
  stripAnyVersatileSuffix,
  isBaseModelKey,
  parseModelId,
  isStandardVersion,
} from "./model/modelIds.js";
import { isModelAllowed } from "./model/modelAllowlist.js";
import { needsConsentOrCredits, isModelBlockedByOverride } from "./planTiers.js";
import { firstWord } from "./model/thirdPartyModelDefaults.js";
import { logForDebugging } from "./debug.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { getInitialSettings_2, updateSettingsForSource } from "./settings/settings.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  discriminatedUnion,
  objectSchema,
  literal,
  stringSchema,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { isRemoteControlChannelAvailable, getRemoteCaps } from "../remote/remoteMode.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logError } from "./log.js";
import { stripAnsi } from "./stripAnsi.js";
import { advisorAttachmentToHeld } from "./advisor/advisorState.js";
import { canDeclareToolChangeAhead } from "../services/api/declaredToolSet.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:58930-59050 placement
var ADVISOR_ERROR_CODES = [
  "max_uses_exceeded",
  "too_many_requests",
  "overloaded",
  "prompt_too_long",
  "execution_time_exceeded",
  "unavailable",
];
//@ chunk-s61vbvea.js:59050-59172 placement (2.1.88 match: isToolResultBlockWithContent, 1)
function getObjectContent(obj) {
  if (!("content" in obj)) return;
  let content = obj.content;
  if (typeof content !== "object" || content === null || !("type" in content)) return;
  return content;
}
//@ chunk-s61vbvea.js:59172-59387 placement
function parseAdvisorToolError(contentBlock) {
  let objectContent = getObjectContent(contentBlock);
  if (objectContent === undefined || objectContent.type !== "advisor_tool_result_error") return;
  if (!("error_code" in objectContent) || typeof objectContent.error_code !== "string") return "unknown";
  let errorCode = objectContent.error_code;
  return ADVISOR_ERROR_CODES.find((code) => code === errorCode) ?? "unknown";
}
//@ chunk-s61vbvea.js:59387-59543 placement
var STOP_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STOP_REASON_KEYS;
deferInit("chunk-s61vbvea.js:59387", () => {
  STOP_REASONS = {
    end_turn: true,
    max_tokens: true,
    stop_sequence: true,
    tool_use: true,
    pause_turn: true,
    compaction: true,
    refusal: true,
    model_context_window_exceeded: true,
  };
  STOP_REASON_KEYS = Object.keys(STOP_REASONS);
});
//@ chunk-s61vbvea.js:59543-59778 placement
function parseAdvisorResult(contentBlock) {
  let objectContent = getObjectContent(contentBlock);
  if (
    objectContent === undefined ||
    (objectContent.type !== "advisor_result" && objectContent.type !== "advisor_redacted_result")
  )
    return;
  if (!("stop_reason" in objectContent) || typeof objectContent.stop_reason !== "string") return;
  let stopReason = objectContent.stop_reason;
  return STOP_REASON_KEYS.find((reason) => reason === stopReason) ?? "unknown";
}
//@ chunk-s61vbvea.js:59820-59970 placement
/**
 * 当错误是拒绝时，取出 advisor 结果中的文本。
 */
function getAdvisorRefusalText(contentBlock) {
  if (!getErrorMessageIfRefusal(contentBlock)) return;
  let objectContent = getObjectContent(contentBlock);
  if (objectContent?.type !== "advisor_result" || !("text" in objectContent)) return;
  let text = objectContent.text;
  return typeof text === "string" && text ? text : undefined;
}
//@ chunk-s61vbvea.js:59970-59994 fingerprint (2.1.88 match: isAdvisorBlock, 0.55)
/**
 * API 判定进程级拒绝顾问后置真。
 */
var ADVISOR_TOOL_NAME = "advisor";
var advisorRefusedForProcess = false;
//@ chunk-s61vbvea.js:59994-60015 layout
/**
 * API 以进程级原因拒绝顾问时调用（queryModel 400 恢复里）。
 */
function markAdvisorRefusedForProcess() {
  advisorRefusedForProcess = true;
}
//@ chunk-s61vbvea.js:60015-60038 layout
/**
 * 被拒顾问的 base URL 集合；同句 Um 为当前 base URL 的取值函数。
 */
var advisorRefusedHosts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var advisorBaseUrlGetter;
deferInit("chunk-s61vbvea.js:60015", () => {
  advisorRefusedHosts = new Set();
  advisorBaseUrlGetter = null;
});
//@ chunk-s61vbvea.js:60038-60059 layout
/**
 * 注册当前 API base URL 的取值函数（启动时传 getDefaultApiBaseUrl）。
 */
function setAdvisorBaseUrlGetter(getApiBaseUrl) {
  advisorBaseUrlGetter = getApiBaseUrl;
}
//@ chunk-s61vbvea.js:60059-60125 layout
/**
 * 当前 base URL，出错或未设置为 "default"。
 */
function getAdvisorHostKey() {
  try {
    return advisorBaseUrlGetter?.() ?? "default";
  } catch {
    return "default";
  }
}
//@ chunk-s61vbvea.js:60125-60153 layout
/**
 * 把当前 base URL 记入被拒集合。
 */
function markAdvisorRefusedForHost() {
  advisorRefusedHosts.add(getAdvisorHostKey());
}
//@ chunk-s61vbvea.js:60153-60202 layout
/**
 * 进程级或当前 host 已被拒绝顾问。
 */
function isAdvisorRefused() {
  return (
    advisorRefusedForProcess || (advisorRefusedHosts.size > 0 && advisorRefusedHosts.has(getAdvisorHostKey()))
  );
}
//@ chunk-s61vbvea.js:60202-60319 file-local
/**
 * 顾问功能是否可用：未设 CLAUDE_CODE_DISABLE_ADVISOR_TOOL、未被拒、第一方类提供商且允许实验 beta。
 */
function isAdvisorEnabled() {
  if (env.CLAUDE_CODE_DISABLE_ADVISOR_TOOL || isAdvisorRefused()) return false;
  let apiProvider = getAPIProvider();
  return (apiProvider === "firstParty" || isClaudePlatformProvider(apiProvider)) && canSendFirstPartyBetas();
}
//@ chunk-s61vbvea.js:60319-60474 layout
/**
 * 在上面基础上：CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL 或 GrowthBook tengu_sage_compass2.enabled。
 */
function isAdvisorToolEnabled() {
  if (!isAdvisorEnabled()) return false;
  if (env.CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL) return true;
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_sage_compass2", {
      enabled: isClaudePlatformProvider(getAPIProvider()),
    }).enabled ?? false
  );
}
//@ chunk-s61vbvea.js:60474-60542 layout
/**
 * CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL（跳过 rank 检查）。
 */
function isExperimentalAdvisorForced() {
  return env.CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL;
}
//@ chunk-s61vbvea.js:60542-60551 layout
/**
 * 2：顾问模型 advisor_rank 至少为 2。
 */
var MIN_ADVISOR_RANK = 2;
//@ chunk-s61vbvea.js:60551-60601 layout
/**
 * 被顾问模型（base）的 catalog advisor_rank。
 */
function getBaseModelAdvisorRank(modelSpec) {
  return getCatalogEntry(getCanonicalName(parseUserSpecifiedModel(modelSpec)))?.advisor_rank;
}
//@ chunk-s61vbvea.js:60601-60736 layout
/**
 * 顾问模型的 advisor_rank；交互会话里 Fable/Mythos 未开放时返回 undefined。
 */
function getAdvisorModelRank(modelSpec) {
  let model = getCanonicalName(parseUserSpecifiedModel(modelSpec));
  if (!getIsNonInteractiveSession()) {
    if (isFableModelValue(model) && (!isFableAvailable() || getModelUnavailabilityReason(modelSpec) !== null))
      return;
    if (isMythosModelValue(model) && !isMythosAvailable(model)) return;
  }
  return getCatalogEntry(model)?.advisor_rank;
}
//@ chunk-s61vbvea.js:60736-60790 layout
/**
 * 被顾问模型有 advisor_rank（或实验强制）。
 */
function baseModelSupportsAdvisor(modelSpec) {
  if (isExperimentalAdvisorForced()) return true;
  return getBaseModelAdvisorRank(modelSpec) !== undefined;
}
//@ chunk-s61vbvea.js:60790-60823 layout
/**
 * 可作顾问的别名：fable、opus、sonnet。
 */
var ADVISOR_ALIAS_CANDIDATES = ["fable", "opus", "sonnet"];
//@ chunk-s61vbvea.js:60823-60861 layout
/**
 * 模型（去后缀、解析别名）可直接当顾问。
 */
function isValidAdvisorModel(modelArg) {
  return canUseAsAdvisor(stripAnyVersatileSuffix(parseUserSpecifiedModel(modelArg)));
}
//@ chunk-s61vbvea.js:60861-60938 layout
/**
 * 可直接使用或需同意（额度）的顾问别名列表。
 */
function getValidAdvisorAliases() {
  return ADVISOR_ALIAS_CANDIDATES.filter((alias) => {
    let canonicalAlias = stripAnyVersatileSuffix(parseUserSpecifiedModel(alias));
    return isValidAdvisorModel(alias) || isAdvisorPendingConsent(canonicalAlias);
  });
}
//@ chunk-s61vbvea.js:60938-61007 layout
/**
 * 顾问 rank ≥ MIN_ADVISOR_RANK（实验强制时总为真）。
 */
function hasSufficientAdvisorRank(modelSpec) {
  if (isExperimentalAdvisorForced()) return true;
  let advisorModelRank = getAdvisorModelRank(modelSpec);
  return advisorModelRank !== undefined && advisorModelRank >= MIN_ADVISOR_RANK;
}
//@ chunk-s61vbvea.js:61007-61086 layout
/**
 * 在可用模型内、不需同意/额度、rank 足够。
 */
function canUseAsAdvisor(modelSpec) {
  let userSpecifiedModel = parseUserSpecifiedModel(modelSpec);
  if (!isModelAllowed(modelSpec)) return false;
  if (needsConsentOrCredits(userSpecifiedModel)) return false;
  return hasSufficientAdvisorRank(modelSpec);
}
//@ chunk-s61vbvea.js:61086-61189 layout
/**
 * 需要同意或额度但其他条件满足。
 */
function isAdvisorPendingConsent(modelSpec) {
  let userSpecifiedModel = parseUserSpecifiedModel(modelSpec);
  if (!needsConsentOrCredits(userSpecifiedModel)) return false;
  if (!isModelAllowed(modelSpec)) return false;
  if (isModelBlockedByOverride(getCanonicalName(userSpecifiedModel))) return false;
  return hasSufficientAdvisorRank(modelSpec);
}
//@ chunk-s61vbvea.js:61189-61307 layout
/**
 * "<模型> as the advisor bills to usage credits…"。
 */
function getAdvisorCreditsNotice(modelSpec) {
  return `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(modelSpec))} as the advisor bills to usage credits, which need to be set up for your account.`;
}
//@ chunk-s61vbvea.js:61307-61466 layout
/**
 * 建议的 /model 命令。
 */
function getAdvisorModelSwitchCommand(modelSpec) {
  let userSpecifiedModel = parseUserSpecifiedModel(modelSpec);
  let lower = firstWord(renderUsageCreditsOnlyModelName(userSpecifiedModel)).toLowerCase();
  if (!isBaseModelKey(lower)) return "/model";
  let modelId = parseModelId(userSpecifiedModel);
  return isStandardVersion(modelId) &&
    !needsConsentOrCredits(parseUserSpecifiedModel(lower)) &&
    needsConsentOrCredits(userSpecifiedModel)
    ? `/model ${modelId.base}`
    : `/model ${lower}`;
}
//@ chunk-s61vbvea.js:61466-61568 layout
/**
 * 顾问 rank 不低于被顾问模型（实验强制时总为真）。
 */
function canAdviseModel(baseModel, advisorModel) {
  if (isExperimentalAdvisorForced()) return true;
  let baseModelAdvisorRank = getBaseModelAdvisorRank(baseModel);
  let advisorModelRank = getAdvisorModelRank(advisorModel);
  if (baseModelAdvisorRank === undefined || advisorModelRank === undefined) return true;
  return baseModelAdvisorRank <= advisorModelRank;
}
//@ chunk-s61vbvea.js:61568-61653 layout
/**
 * 同上但不看实验开关，rank 缺失时为真。
 */
function canAdviseModelLenient(baseModel, advisorModel) {
  let baseModelAdvisorRank = getBaseModelAdvisorRank(baseModel);
  let advisorModelRank = getAdvisorModelRank(advisorModel);
  if (baseModelAdvisorRank === undefined || advisorModelRank === undefined) return true;
  return baseModelAdvisorRank <= advisorModelRank;
}
//@ chunk-s61vbvea.js:61653-61727 layout
/**
 * rank 都存在且顾问不低于被顾问模型。
 */
function canAdviseModelStrict(baseModel, advisorModel) {
  let baseModelAdvisorRank = getBaseModelAdvisorRank(baseModel);
  let advisorModelRank = getAdvisorModelRank(advisorModel);
  return (
    baseModelAdvisorRank !== undefined &&
    advisorModelRank !== undefined &&
    baseModelAdvisorRank <= advisorModelRank
  );
}
//@ chunk-s61vbvea.js:61727-61774 layout
/**
 * 两个模型规范化后相同。
 */
function isSameModelFamilyId(modelA, modelB) {
  return (
    getCanonicalName(parseUserSpecifiedModel(modelA)) === getCanonicalName(parseUserSpecifiedModel(modelB))
  );
}
//@ chunk-s61vbvea.js:61774-62503 layout
/**
 * 本次请求实际用的顾问模型：开关开、base 有 rank、顾问模型有效且不弱于 base，否则打日志返回 undefined。
 */
function resolveAdvisorModel(advisorModelSetting, baseModel) {
  if (!isAdvisorToolEnabled() || !advisorModelSetting) return;
  let advisorModel = stripAnyVersatileSuffix(parseUserSpecifiedModel(advisorModelSetting));
  if (!baseModelSupportsAdvisor(baseModel)) {
    logForDebugging(`[AdvisorTool] Skipping advisor - base model ${baseModel} does not support advisor`);
    if (claimOnce().claim("advisor_unranked_base_warning"))
      console.warn(
        `Warning: Advisor disabled \u2014 base model '${baseModel}' has no advisor rank in the model catalog. Switch to a public model alias (opus, sonnet, fable) or set CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL=1.`,
      );
    return;
  }
  if (!canUseAsAdvisor(advisorModel)) {
    logForDebugging(`[AdvisorTool] Skipping advisor - ${advisorModel} is not a valid advisor model`);
    return;
  }
  if (!canAdviseModel(baseModel, advisorModel)) {
    logForDebugging(
      `[AdvisorTool] Skipping advisor - ${advisorModel} cannot advise ${baseModel} (advisor must be at least as capable as the base model)`,
    );
    return;
  }
  logForDebugging(`[AdvisorTool] Server-side tool enabled with ${advisorModel} as the advisor model`);
  return advisorModel;
}
//@ chunk-s61vbvea.js:62503-62562 layout
/**
 * 顾问功能可用且 base 支持时返回给定顾问模型（queryModel 用来决定是否附加 advisor 工具）。
 */
function getAdvisorModelForQuery(advisorModel, effectiveModel) {
  return advisorModel !== undefined && isAdvisorEnabled() && baseModelSupportsAdvisor(effectiveModel)
    ? advisorModel
    : undefined;
}
//@ chunk-s61vbvea.js:62562-62610 layout
/**
 * 顾问开时读 settings.advisorModel。
 */
function getConfiguredAdvisorModel() {
  if (!isAdvisorToolEnabled()) return;
  return readAdvisorModelSetting(getInitialSettings_2());
}
//@ chunk-s61vbvea.js:62610-62709 layout (2.1.88 match: getExperimentAdvisorModels, 1)
/**
 * 设置对象中非空的 advisorModel。旧版名 getExperimentAdvisorModels_2 为错配。
 */
function readAdvisorModelSetting(settings) {
  return typeof settings.advisorModel === "string" && settings.advisorModel !== ""
    ? settings.advisorModel
    : undefined;
}
//@ chunk-s61vbvea.js:62709-62790 fingerprint (2.1.88 match: getAdvisorUsage, 1)
/**
 * 从 usage.iterations 取 type=advisor_message 的顾问用量（cost-tracker 单独计价）。
 */
function getAdvisorUsage(usage) {
  return (usage.iterations ?? []).filter((it) => it.type === "advisor_message");
}
//@ chunk-s61vbvea.js:62790-64819 placement
/**
 * advisor 工具的状态与提示文本
 */
var ADVISOR_TOOL_PROMPT = `# Advisor Tool

You have access to an \`advisor\` tool backed by a stronger reviewer model. It takes NO parameters -- when you call advisor(), your entire conversation history is automatically forwarded. They see the task, every tool call you've made, every result you've seen.

Call advisor BEFORE substantive work -- before writing, before committing to an interpretation, before building on an assumption. If the task requires orientation first (finding files, fetching a source, seeing what's there), do that, then call advisor. Orientation is not substantive work. Writing, editing, and declaring an answer are.

Also call advisor:
- When you believe the task is complete. BEFORE this call, make your deliverable durable: write the file, save the result, commit the change. The advisor call takes time; if the session ends during it, a durable result persists and an unwritten one doesn't.
- When stuck -- errors recurring, approach not converging, results that don't fit.
- When considering a change of approach.

On tasks longer than a few steps, call advisor at least once before committing to an approach and once before declaring done. On short reactive tasks where the next action is dictated by tool output you just read, you don't need to keep calling -- the advisor adds most of its value on the first call, before the approach crystallizes.

Give the advice serious weight. If you follow a step and it fails empirically, or you have primary-source evidence that contradicts a specific claim (the file says X, the paper states Y), adapt. A passing self-test is not evidence the advice is wrong -- it's evidence your test doesn't check what the advice is checking.

If you've already retrieved data pointing one way and the advisor points another: don't silently switch. Surface the conflict in one more advisor call -- "I found X, you suggest Y, which constraint breaks the tie?" The advisor saw your evidence but may have underweighted it; a reconcile call is cheaper than committing to the wrong branch.`;
//@ chunk-s61vbvea.js:64819-65217 placement
/**
 * 顾问工具已不再可用的说明（提示忽略前面的附件）。
 */
var ADVISOR_AVAILABILITY_NOTICES; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ADVISOR_UNAVAILABLE_NOTICE;
var ADVISOR_ABBREVIATED_PROMPT;
deferInit("chunk-s61vbvea.js:64819", () => {
  ADVISOR_AVAILABILITY_NOTICES = DoctorLazy(() =>
    discriminatedUnion("available", [
      objectSchema({
        available: literal(true),
        model: stringSchema(),
        abbreviated: booleanSchema().optional(),
        toolChange: literal("add").optional(),
      }),
      objectSchema({
        available: literal(false),
        model: stringSchema().optional(),
        toolChange: literal("remove").optional(),
        byBase: literal(true).optional(),
      }),
    ]),
  );
  ADVISOR_UNAVAILABLE_NOTICE =
    "The advisor tool is no longer available; disregard the earlier advisor instructions.";
  ADVISOR_ABBREVIATED_PROMPT =
    "The advisor tool is available; the advisor instructions announced earlier apply.";
});
//@ chunk-s61vbvea.js:65217-65627 placement
function buildAdvisorToolAttachment(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message === undefined || message.type !== "attachment" || message.attachment.type !== "advisor_tool")
      continue;
    let noticeParse = ADVISOR_AVAILABILITY_NOTICES().safeParse(message.attachment);
    if (!noticeParse.success) continue;
    return noticeParse.data.available
      ? {
          available: true,
          model: noticeParse.data.model,
          toolChange: noticeParse.data.toolChange !== undefined,
          byBase: false,
        }
      : {
          available: false,
          model: noticeParse.data.model,
          toolChange: noticeParse.data.toolChange !== undefined,
          byBase: noticeParse.data.byBase === true,
        };
  }
  return;
}
//@ chunk-s61vbvea.js:65627-65831 placement
/**
 * 判断消息里是否有可用且非简略版的 advisor_tool 可用性附件。
 */
function hasFullAdvisorNotice(messages) {
  return messages.some((message) => {
    if (message.type !== "attachment" || message.attachment.type !== "advisor_tool") return false;
    let noticeParse = ADVISOR_AVAILABILITY_NOTICES().safeParse(message.attachment);
    return noticeParse.success && noticeParse.data.available && noticeParse.data.abbreviated !== true;
  });
}
//@ chunk-s61vbvea.js:65831-65885 placement
/**
 * 按是否可用与是否简略选择顾问工具提示词。
 */
function advisorPromptText(available, isAbbreviated) {
  if (!available) return ADVISOR_UNAVAILABLE_NOTICE;
  return isAbbreviated === true ? ADVISOR_ABBREVIATED_PROMPT : ADVISOR_TOOL_PROMPT;
}
//@ chunk-9b6702jm.js:666-814 placement
/**
 * 选的顾问模型需要 usage credits 时的提示（附 /model 指引）。
 */
function getAdvisorCreditsRequiredMessage(modelName, isInteractive = false) {
  return `${getAdvisorCreditsNotice(modelName)} Run ${getAdvisorModelSwitchCommand(modelName)}${isInteractive ? " in an interactive terminal session" : ""} to review and enable, then set it as the advisor.`;
}
//@ chunk-9b6702jm.js:814-2306 placement
/**
 * /advisor <模型|off> 的执行：远程/只读客户端拦截；off 清 advisorModel（用户设置或远程 apply_flag_settings）；校验模型可当顾问，否则列出可选项；写入 AppState 与用户设置，返回结果文案。
 */
function setAdvisorModelCommand(
  advisorModelArg,
  mainLoopModel,
  setAppState,
  storageV5,
  persistAsDefault = true,
  isInteractiveSession = false,
  conversationMessages = [],
) {
  let hasControlChannel = isRemoteControlChannelAvailable();
  let advisorModel = advisorModelArg === "off" ? undefined : stripAnyVersatileSuffix(advisorModelArg);
  let isModelValid = advisorModel === undefined || isValidAdvisorModel(advisorModel);
  logEvent("tengu_advisor_command", {
    advisor:
      advisorModel === undefined
        ? lit("off")
        : isModelValid
          ? telemetrySafeModelName(advisorModelArg)
          : isAdvisorPendingConsent(advisorModel)
            ? lit("consent_pending")
            : lit("invalid"),
    remote: hasControlChannel,
  });
  if (!hasControlChannel && getRemoteCaps())
    return "The advisor can't be changed from this client \u2014 this connection is view-only or has no control channel";
  let sessionScopeSuffix = hasControlChannel
    ? " (this session only)"
    : persistAsDefault
      ? ""
      : " for this session \u2014 run /advisor in the terminal to change your default";
  if (advisorModel === undefined) {
    setAppState((prevState) =>
      prevState.advisorModel === undefined
        ? prevState
        : {
            ...prevState,
            advisorModel: undefined,
          },
    );
    if (hasControlChannel)
      getRemoteCaps()
        ?.sendControlRequest({
          subtype: "apply_flag_settings",
          settings: {
            advisorModel: null,
          },
        })
        .catch(logError);
    else {
      persistAdvisorModelToGlobalConfig("");
      if (persistAsDefault)
        updateSettingsForSource(
          "userSettings",
          {
            advisorModel: undefined,
          },
          undefined,
          storageV5,
        );
    }
    return `Advisor disabled${sessionScopeSuffix}${describeAdvisorChangeForConversation(conversationMessages, undefined, mainLoopModel)}`;
  }
  if (!isModelValid) {
    if (isAdvisorPendingConsent(advisorModel))
      return getAdvisorCreditsRequiredMessage(advisorModel, isInteractiveSession);
    let joined = [...getValidAdvisorAliases(), "off"].join(", ");
    return `${stripAnsi(renderDefaultModelSetting(advisorModel))} cannot be used as an advisor. Valid options: ${joined}`;
  }
  setAppState((prevState) =>
    prevState.advisorModel === advisorModel
      ? prevState
      : {
          ...prevState,
          advisorModel,
        },
  );
  if (hasControlChannel)
    getRemoteCaps()
      ?.sendControlRequest({
        subtype: "apply_flag_settings",
        settings: {
          advisorModel,
        },
      })
      .catch(logError);
  else {
    persistAdvisorModelToGlobalConfig(advisorModel);
    if (persistAsDefault)
      updateSettingsForSource(
        "userSettings",
        {
          advisorModel,
        },
        undefined,
        storageV5,
      );
  }
  let advisorDisplayName = stripAnsi(renderDefaultModelSetting(advisorModel));
  let mainDisplayName = stripAnsi(renderDefaultModelSetting(mainLoopModel));
  let resultMessage = `Advisor set to ${advisorDisplayName}${sessionScopeSuffix}`;
  if (!baseModelSupportsAdvisor(mainLoopModel))
    resultMessage += `
Note: the current main model (${mainDisplayName}) does not support the advisor. It will activate when you switch to a supported main model.`;
  else if (!canAdviseModel(mainLoopModel, advisorModel))
    resultMessage += `
Note: ${advisorDisplayName} is less capable than the current main model (${mainDisplayName}), so the advisor will not activate. Choose a more capable advisor, or switch to a smaller main model.`;
  return (
    resultMessage + describeAdvisorChangeForConversation(conversationMessages, advisorModel, mainLoopModel)
  );
}
//@ chunk-9b6702jm.js:2306-3370 placement
/**
 * 说明顾问变更对当前对话的影响（API 已拒绝、已声明的工具保持到 /clear 或 /compact 等）。
 */
function describeAdvisorChangeForConversation(advisorModel, newAdvisorModel, mainLoopModel) {
  let stickyBetas = getStickyBetas();
  let heldAdvisor =
    stickyBetas.advisorHeld ?? advisorAttachmentToHeld(buildAdvisorToolAttachment(advisorModel));
  if (heldAdvisor === undefined) return "";
  if (heldAdvisor.refused)
    return newAdvisorModel === undefined
      ? ""
      : `
The API refused the advisor for the current conversation, so it runs without one until /clear or /compact; the setting applies from there and in new conversations.`;
  let canDeclareAhead = canDeclareToolChangeAhead(stickyBetas, mainLoopModel);
  if (heldAdvisor.model === undefined && canDeclareAhead) return "";
  if (
    heldAdvisor.viaToolChange &&
    (canDeclareAhead || (heldAdvisor.inFallback !== true && heldAdvisor.model !== undefined))
  )
    return heldAdvisor.model !== undefined &&
      newAdvisorModel !== undefined &&
      !isSameAdvisorModel(newAdvisorModel, heldAdvisor.model)
      ? `
The current conversation keeps ${stripAnsi(renderDefaultModelSetting(heldAdvisor.model))} as its advisor model until /clear or /compact, so the tool it has already declared stays unchanged; turning the advisor on or off applies right away.`
      : "";
  let advisorToolAttachment = buildAdvisorToolAttachment(advisorModel);
  let isToolChangeBlocked =
    advisorToolAttachment !== undefined &&
    !advisorToolAttachment.available &&
    advisorToolAttachment.toolChange &&
    !advisorToolAttachment.byBase;
  let isStandbyOnly = heldAdvisor.standby === true && advisorToolAttachment === undefined;
  let model = isToolChangeBlocked || isStandbyOnly ? undefined : heldAdvisor.model;
  if (
    model === newAdvisorModel ||
    (model !== undefined && newAdvisorModel !== undefined && isSameAdvisorModel(newAdvisorModel, model))
  )
    return "";
  return `
The current conversation ${model === undefined ? "runs without the advisor" : `keeps ${stripAnsi(renderDefaultModelSetting(model))} as its advisor`} until /clear or /compact, so the prompt it has already sent stays unchanged; the new setting applies from there and in new conversations.`;
}
//@ chunk-9b6702jm.js:3370-3402 layout
/**
 * 两个顾问模型规范化后相同。
 */
function isSameAdvisorModel(leftModel, model) {
  return isSameModelFamilyId(leftModel, model);
}
//@ chunk-9b6702jm.js:3402-3449 fingerprint (2.1.88 match: getExperimentAdvisorModels, 1)
/**
 * 把 advisorModel 写进全局配置。旧版名 getExperimentAdvisorModels 为错配。
 */
function persistAdvisorModelToGlobalConfig(advisorModel) {
  setFlagSettingsInline({
    ...(getFlagSettingsInline() ?? {}),
    advisorModel,
  });
}
export {
  ADVISOR_TOOL_NAME,
  ADVISOR_AVAILABILITY_NOTICES,
  advisorPromptText,
  getAdvisorRefusalText,
  isAdvisorToolEnabled,
  resolveAdvisorModel,
  getConfiguredAdvisorModel,
  baseModelSupportsAdvisor,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsNotice,
  getAdvisorModelSwitchCommand,
  canAdviseModel,
  isAdvisorEnabled,
  getAdvisorModelForQuery,
  markAdvisorRefusedForProcess,
  markAdvisorRefusedForHost,
  parseAdvisorToolError,
  parseAdvisorResult,
  setAdvisorBaseUrlGetter,
  isSameModelFamilyId,
  canAdviseModelLenient,
  getAdvisorUsage,
  getValidAdvisorAliases,
  isValidAdvisorModel,
  setAdvisorModelCommand,
  getAdvisorCreditsRequiredMessage,
  STOP_REASON_KEYS,
  buildAdvisorToolAttachment,
  canAdviseModelStrict,
  hasFullAdvisorNotice,
  readAdvisorModelSetting,
};
