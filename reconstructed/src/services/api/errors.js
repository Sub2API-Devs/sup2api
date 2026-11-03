/**
 * services/api/errors.ts
 *
 * API 错误的识别与文案：一批按状态码/消息片段识别错误的判定函数（beta 被拒、thinking/effort/advisor/媒体/工具配对等），getAssistantMessageFromError 把异常转成面向用户的 assistant 错误消息，classifyAPIError 给遥测分类，以及提示词过长/额度/拒答提示文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/errors.ts
 * pieces: chunk-8t8n4kdh.js (1), chunk-e6aww6q8.js (149), chunk-gr2vfhah.js (21), chunk-s61vbvea.js (2)
 * attribution: fingerprint 18, placement 63, layout 90, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { sOi, vSr } from "../../utils/truncateGraphemes.js";
import { formatFileSize, formatDurationCoarse } from "../../utils/format.js";
import {
  getIsNonInteractiveSession,
  isLongContext1mCreditsBlocked,
  setLongContext1mCreditsBlocked,
  setUsageCreditsRequired,
  isDisklessProcess,
  getDisableSlashCommands,
} from "../../bootstrap/state.js";
import { WK, getCatalogEntry as getCatalogEntry_2 } from "../../utils/model/modelCatalog.js";
import { MODEL_KEY_BY_FIRST_PARTY_ID } from "../../utils/model/configs.js";
import { getModelStrings } from "../../utils/model/modelStrings.js";
import {
  usesFirstPartyModelIds,
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
  THIRD_PARTY_PROVIDER_LABELS,
  getProviderForModel,
  configuredApiProxyHost,
} from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, Ir, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit as lit_2,
  fromEnum,
  concatSafe,
  joinSafe,
  lit,
} from "../analytics/safeMetadata.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { tildify } from "../../utils/path.js";
import { Ot, fT, ef } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isAwsCredentialsProviderError } from "../../utils/aws.js";
import {
  isGoogleCloudProvider,
  isGoogleCredentialLoadError,
  isOAuthTokenRevokedError,
  is529Error,
  getRetryDelay,
} from "./withRetry.js";
import { createApiErrorMessage, getAssistantMessageText } from "../../utils/messages.js";
import { MESSAGE_MARK_SYMBOLS } from "../../utils/messageKinds.js";
import { classifyMediaError, buildMediaRemovedError } from "./mediaErrors.js";
import {
  includesWholeWord,
  isContextLimitExceeded,
  isPlainInputTooLong,
  wyn,
  z7s,
  isUnsupportedRoleError,
  parseMidConvSystemRejection,
  isCacheControlError,
  isOutputFormatExtraInputsError,
  isThinkingSignatureError,
  rejectedThinkingType,
  pqr,
} from "./badRequestClassifier.js";
import {
  effectiveErrorStatus,
  rqe,
  Loo,
  formatAPIError,
  sanitizeAPIError,
  extractNestedErrorMessage,
  extractConnectionErrorDetails,
  EAi,
  isStreamSuspendedError,
  isConnectionError,
  CONNECTION_DROPPED_MESSAGE,
  LK,
  PU,
  getApiErrorCode,
  hasNestedError,
} from "./errorUtils.js";
import { isArtifactMountMode } from "../artifacts/artifactMount.js";
import {
  getSubscriptionType,
  isClaudeAISubscriber,
  getUsageCreditsCommand,
  getTurnOnUsageCreditsStep,
  getAnthropicApiKeyWithSource,
  hasStoredOAuthToken,
  isApiKeyHelperTheActiveCredential,
  getApiKeyHelperLastFailure,
  isAwsAuthRefreshFromProjectSettings,
  getConfiguredAwsAuthRefresh,
  isHostManagedProviderAuth,
  isGcpAuthRefreshFromProjectSettings,
  getConfiguredGcpAuthRefresh,
  HostManagedNoCredsError,
  isExtraUsageAllowed,
} from "../../utils/auth.js";
import { SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE } from "../sessionStatus/sessionStateClassifier.js";
import { ye } from "../../utils/startupMarks.js";
import { isKnownContentBlockType, InvalidRequestHeaderValueError } from "./requestHeaders.js";
import { logEvent } from "../analytics/index.js";
import {
  tj,
  qT,
  PG,
  MK,
  d3e,
  DO,
  l3e,
  xG,
  yv,
  VPt,
  sle,
  qlt,
  Rge,
  AU,
  tb,
  Lb,
  a9t,
  Vlt,
  freeze as freeze_24,
  uoo,
  jw,
  MID_CONVERSATION_SYSTEM_2026_04_07,
  CG,
  Z4,
  Cge,
  n8,
} from "../../utils/betas.js";
import { classifyFirstPartyRequest } from "./fetchOptions.js";
import { ImageSizeError } from "../../utils/imageValidation.js";
import { ImageResizeError } from "../../utils/imageResizer.js";
import {
  parseVerificationRequired,
  logVerificationShown,
  isVerificationRequiredError,
} from "./verificationRequired.js";
import {
  yhn,
  extractQuotaStatusFromErrorHeaders,
  creditsRequiredDetails,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  USAGE_SETTINGS_URL,
} from "../claudeAiLimits.js";
import {
  isUsageCreditsOnlyModel,
  renderUsageCreditsOnlyModelName,
  renderModelName,
} from "../../utils/model/modelDisplay.js";
import { getRateLimitErrorMessage, isRateLimitErrorMessage } from "../rateLimitMessages.js";
import { applyMockHeaders } from "../mockRateLimits.js";
import { NO_RESPONSE_REQUESTED } from "../../constants/messages.js";
import { getGlobalConfig, isProjectScopeTrustAccepted } from "../../utils/config.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { shouldEnableThinkingByDefault } from "../../utils/thinking.js";
import {
  Avt,
  formatRequestTooLarge,
  requestTooLargeDebug,
  formatRequestTooLargeMedia,
  Sue,
  mediaBytesInMessages,
  Ivt,
  measureRejectedRequest,
} from "./requestTooLarge.js";
import { isOfficialFirstPartyEndpoint, getApiBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { isNonCustomOpusModel } from "../../utils/model/smallFastModel.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { OAuthRefreshDeadError, OAuthRefreshLockTimeoutError } from "../oauth/errors.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { OAuthAccountOnHoldError, jgs } from "../oauth/oauthErrors.js";
import { getWIFAccountOnHold, rp } from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { isWIFUserOAuthDeadError, wouldWIFProfileYieldToClaudeAILogin } from "../../utils/wifProfile.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage } from "../../utils/errors.js";
import { Yxn, StreamNoEventsError } from "./streamErrors.js";
import { getProxyUrlWithSource, shouldBypassProxy as shouldBypassProxy_2 } from "../../utils/proxy.js";
import { FoundryCapabilityError } from "./foundryCapabilities.js";
import { logForDebugging } from "../../utils/debug.js";
import { getEntrypointKind, isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { LJ } from "./responseDiagnostics.js";
import {
  normalizeRefusalCategory,
  hasRefusalFallbackTarget,
  getSafeguardsArticleUrl,
  buildSafeguardsLearnMore,
  isHardRefusalCategory,
} from "./refusalFallback.js";
import { AEn, getFallbackLatchKind } from "./refusalFallbackHeaders.js";
import {
  formatSafeguardLead,
  SAFEGUARD_CATEGORY_LEADS,
  CYBER_SAFEGUARDS_URL,
  gci,
  formatRefusalDetails,
} from "./safeguardMessages.js";
import { firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { parseAdvisorResult } from "../../utils/advisor.js";
import { getConnectionTimeoutMs } from "../mcp/client.js";
import { SdkError, Ti } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

/**
 * PDF 过大提示（页数/字节上限）；SDK/非交互与交互模式文案不同。
 */
//@ chunk-e6aww6q8.js:123593-123865 fingerprint = getPdfTooLargeErrorMessage (1)
function getPdfTooLargeErrorMessage() {
  let limits = `max ${sOi} pages, ${formatFileSize(vSr)}`;
  return getIsNonInteractiveSession()
    ? `PDF too large (${limits}). Try reading the file a different way (e.g., extract text with pdftotext).`
    : `PDF too large (${limits}). Double press esc to go back and try again, or use pdftotext to convert to text first.`;
}
/**
 * PDF 有密码保护提示。
 */
//@ chunk-e6aww6q8.js:123865-124062 fingerprint = getPdfPasswordProtectedErrorMessage (1)
function getPdfPasswordProtectedErrorMessage() {
  return getIsNonInteractiveSession()
    ? "PDF is password protected. Try using a CLI tool to extract or convert the PDF."
    : "PDF is password protected. Please double press esc to edit your message and try again.";
}
/**
 * PDF 无效提示。
 */
//@ chunk-e6aww6q8.js:124062-124265 fingerprint = getPdfInvalidErrorMessage (1)
function getPdfInvalidErrorMessage() {
  return getIsNonInteractiveSession()
    ? "The PDF file was not valid. Try converting it to text first (e.g., pdftotext)."
    : "The PDF file was not valid. Double press esc to go back and try again with a different file.";
}
/**
 * 图片过大提示。
 */
//@ chunk-e6aww6q8.js:124265-124455 fingerprint = getImageTooLargeErrorMessage (1)
function getImageTooLargeErrorMessage() {
  return getIsNonInteractiveSession()
    ? "Image was too large. Try resizing the image or using a different approach."
    : "Image was too large. Double press esc to go back and try again with a smaller image.";
}
/**
 * 生成组织支出上限已达或组织被停用时的错误文案。
 */
//@ chunk-e6aww6q8.js:1554437-1555950 placement
function formatOrgSpendCapError(
  e,
  {
    includeOverageInUse: n = !0,
    unifiedWindows: r,
    overageEnabled: s,
    usageCreditOffer: h,
    adminRequestOffer: y,
  } = {},
) {
  if (!e) return;
  return {
    status: e.status,
    ...(e.resetsAt !== void 0 && { resetsAt: e.resetsAt }),
    ...(e.rateLimitType !== void 0 && { rateLimitType: e.rateLimitType }),
    ...(e.utilization !== void 0 && { utilization: e.utilization }),
    ...(e.overageStatus !== void 0 && { overageStatus: e.overageStatus }),
    ...(e.overageResetsAt !== void 0 && { overageResetsAt: e.overageResetsAt }),
    ...(e.overageDisabledReason !== void 0 && {
      overageDisabledReason:
        e.overageDisabledReason === "org_spend_cap_reached"
          ? "org_level_disabled_until"
          : e.overageDisabledReason,
    }),
    ...(e.overageScope !== void 0 && e.overageScope !== "organization" && { limitScope: e.overageScope }),
    ...(e.isUsingOverage !== void 0 && { isUsingOverage: e.isUsingOverage }),
    ...(e.overageInUse !== void 0 && n && { overageInUse: e.overageInUse }),
    ...(e.surpassedThreshold !== void 0 && { surpassedThreshold: e.surpassedThreshold }),
    ...(e.rateLimitGraceActive === !0 && { rateLimitGraceActive: !0 }),
    ...(e.overagePeriodMonthly !== void 0 && { overagePeriodMonthly: e.overagePeriodMonthly }),
    ...(e.overagePeriodChannel !== void 0 && { overagePeriodChannel: e.overagePeriodChannel }),
    ...(e.errorCode !== void 0 && { errorCode: e.errorCode }),
    ...(e.canUserPurchaseCredits !== void 0 && { canUserPurchaseCredits: e.canUserPurchaseCredits }),
    ...(e.hasChargeableSavedPaymentMethod !== void 0 && {
      hasChargeableSavedPaymentMethod: e.hasChargeableSavedPaymentMethod,
    }),
    ...(r !== void 0 && { unifiedWindows: r }),
    ...(s !== void 0 && { overageEnabled: s }),
    ...(h !== void 0 && { usageCreditOffer: h }),
    ...(y !== void 0 && { adminRequestOffer: y }),
  };
}
//@ chunk-e6aww6q8.js:1555950-1555984 placement
var _Qt = ["fable", "opus", "sonnet"];
//@ chunk-e6aww6q8.js:1555984-1556162 placement
function compareVersionParts(e, n) {
  let mapped = e.split("-").map(Number),
    mapped_2 = n.split("-").map(Number);
  for (let h = 0; h < Math.max(mapped.length, mapped_2.length); h++) {
    let y = (mapped_2[h] ?? -1) - (mapped[h] ?? -1);
    if (y !== 0) return y;
  }
  return 0;
}
/**
 * 列出有 3P 回退 id 的模型目录条目，按家族顺序与版本号排序，返回用于在错误文本中匹配的 needle 与回退 id。
 */
//@ chunk-e6aww6q8.js:1556162-1556635 placement
function thirdPartyFallbackModels() {
  return WK()
    .models.filter((model) => model.fallback_3p !== void 0)
    .sort((e, n) => {
      let r = (h) => {
          let index = _Qt.indexOf(h);
          return index === -1 ? _Qt.length : index;
        },
        s = (h, y) =>
          h
            .replace(/^claude-/, "")
            .replace(y, "")
            .replace(/^-|-$/g, "");
      return (
        r(e.family) - r(n.family) ||
        (e.family < n.family ? -1 : e.family > n.family ? 1 : 0) ||
        compareVersionParts(s(e.id, e.family), s(n.id, n.family))
      );
    })
    .map((e) => {
      let replaced = e.id.replace(/^claude-/, "");
      return {
        needle: replaced,
        needleUnderscore: replaced.replace(/-/g, "_"),
        fallbackId: e.fallback_3p,
        family: e.family,
      };
    });
}
//@ chunk-e6aww6q8.js:1556635-1556748 placement
function providerModelString(e) {
  let n = getCatalogEntry_2(e)?.provider_ids.first_party,
    r = n !== void 0 ? MODEL_KEY_BY_FIRST_PARTY_ID[n] : void 0;
  return r !== void 0 ? getModelStrings()[r] : void 0;
}
/**
 * 非第一方模型 id 环境下，从错误文本中识别出被拒的模型，返回当前提供方对应的可用模型 id（Fable 回退到 Opus 时优先 ANTHROPIC_DEFAULT_OPUS_MODEL）。
 */
//@ chunk-e6aww6q8.js:1556748-1557033 placement
function suggestThirdPartyModel(errorText) {
  if (usesFirstPartyModelIds()) return;
  let lower = errorText.toLowerCase(),
    found = thirdPartyFallbackModels().find(
      (s) => lower.includes(s.needle) || lower.includes(s.needleUnderscore),
    );
  if (found === void 0) return;
  if (found.family === "fable" && getCatalogEntry_2(found.fallbackId)?.family === "opus")
    return env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? providerModelString(found.fallbackId);
  return providerModelString(found.fallbackId);
}
//@ chunk-e6aww6q8.js:1557033-1557102 placement
var ADVISOR_20260301 = "advisor_20260301",
  replaced = "advisor_20260301".replace(/\d+$/, "");
/**
 * 网络安全拦截的申诉链接、访问层级名称，以及 cyber_verification 错误详情的结构。
 */
//@ chunk-e6aww6q8.js:1557102-1557476 placement
var CYBER_APPEAL_URL = "https://claude.com/form/cyber-block-false-positive-report-cvp-rejection-appeal",
  CYBER_ACCESS_TIERS = { a: "Specialized Access", b: "Red Team Access", c: "Defense Access" },
  CYBER_VERIFICATION_SCHEMA = DoctorLazy(() =>
    u({
      category: T("cyber"),
      cyber_verification: Ir("type", [
        u({ type: T("active"), tier: U(["a", "b", "c"]) }),
        u({
          type: T("inactive"),
          reason: U(["not_assigned_but_organization_approved", "organization_not_approved"]),
        }),
      ]),
    }),
  );
/**
 * 生成网络安全验证计划相关的拒绝文案，并引导用户反馈。
 */
//@ chunk-e6aww6q8.js:1557476-1558563 placement
function formatCyberVerificationRefusal(e, n, r) {
  if (!usesFirstPartyModelIds()) return e;
  let safeParse = CYBER_VERIFICATION_SCHEMA().safeParse(r);
  if (!safeParse.success) return e;
  logFeatureOk("refusal_cyber_verification_status");
  let cyber_verification = safeParse.data.cyber_verification;
  switch (cyber_verification.type) {
    case "active": {
      let y = `You have ${CYBER_ACCESS_TIERS[cyber_verification.tier]} in the Cyber Verification Program, and your last message was still flagged.`;
      if (!isFeedbackAllowed()) return `${y} ${e}`;
      return getIsNonInteractiveSession()
        ? `${y} If it's legitimate security work, send feedback so we can improve: ${CYBER_APPEAL_URL}. It won't unblock your last message. ${e}`
        : `${y} If it's legitimate security work, send feedback with /feedback so we can improve. It won't unblock your last message. Learn more: ${n}`;
    }
    case "inactive":
      switch (cyber_verification.reason) {
        case "not_assigned_but_organization_approved":
          return `Ask your admin for Defense Access in the Cyber Verification Program to reduce these interruptions. An admin can check your role in Organization settings. ${e}`;
        case "organization_not_approved":
          return `Your organization doesn't have Cyber Verification Program access in effect for this model. Your admin can check your organization's status in the Verification Portal (https://portal.anthropic.com). ${e}`;
      }
  }
}
//@ chunk-e6aww6q8.js:1558563-1558616 placement
var x6o = /^[a-z0-9_]{1,48}$/,
  P6o = /^[a-z0-9_/]{1,48}$/;
//@ chunk-e6aww6q8.js:1558616-1558691 placement
function rpn(e) {
  return typeof e === "string" && x6o.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit_2("unknown");
}
//@ chunk-e6aww6q8.js:1558691-1558738 placement
function $Ys(e) {
  return P6o.test(e) ? e : "unknown";
}
//@ chunk-e6aww6q8.js:1558790-1558827 placement
var CLAUDE_BG_GATEWAY_WITHHELD = "CLAUDE_BG_GATEWAY_WITHHELD";
//@ chunk-e6aww6q8.js:1558827-1558916 placement
function j8n() {
  return isBgSession() && Boolean(env.CLAUDE_BG_GATEWAY_WITHHELD) && !env.ANTHROPIC_BASE_URL;
}
//@ chunk-e6aww6q8.js:1558916-1558969 placement
var I6o = 1024,
  D6o = /^[\p{L}\p{M}\p{N}/\\._~+@,:=-]+$/u;
//@ chunk-e6aww6q8.js:1558969-1559077 placement
function withheldGatewayFolder() {
  let CLAUDE_BG_GATEWAY_WITHHELD = env.CLAUDE_BG_GATEWAY_WITHHELD;
  return CLAUDE_BG_GATEWAY_WITHHELD &&
    CLAUDE_BG_GATEWAY_WITHHELD.length <= I6o &&
    isAbsolute_33(CLAUDE_BG_GATEWAY_WITHHELD) &&
    D6o.test(CLAUDE_BG_GATEWAY_WITHHELD)
    ? tildify(CLAUDE_BG_GATEWAY_WITHHELD)
    : void 0;
}
//@ chunk-e6aww6q8.js:1559077-1559261 placement
function respawnCommandHint() {
  let e = env.CLAUDE_JOB_DIR && basename_35(env.CLAUDE_JOB_DIR);
  return e && /^[A-Za-z0-9_-]{1,64}$/.test(e)
    ? `\`claude respawn ${e}\``
    : "`claude respawn <id>` (the id is in the agents view)";
}
//@ chunk-e6aww6q8.js:1559261-1559369 placement
var NO_GATEWAY_MESSAGE =
  "No LLM gateway: a gateway set in your shell isn't passed to a session opened from another folder.";
//@ chunk-e6aww6q8.js:1559369-1559601 placement
function noGatewayErrorMessage() {
  let e = withheldGatewayFolder() ?? "this session's own folder";
  return `${NO_GATEWAY_MESSAGE} To fix, run ${respawnCommandHint()} from ${e} in another terminal where your gateway is set, or set ANTHROPIC_BASE_URL and its API key or token in a settings file's env block.`;
}
//@ chunk-e6aww6q8.js:1559601-1559660 placement
function EUo(e) {
  return e.startsWith(`${NO_GATEWAY_MESSAGE} To fix, run `);
}
/**
 * 生成"未使用 LLM 网关：从其他目录打开"的提示文字。
 */
//@ chunk-e6aww6q8.js:1559660-1559771 placement
function noGatewayNotice() {
  return `No LLM gateway: opened from another folder \xB7 respawn from ${withheldGatewayFolder() ?? "its own folder"}`;
}
/**
 * 非 HTTP 错误中的云凭证错误归属：AWS 或 Google Cloud，否则 null。
 */
//@ chunk-e6aww6q8.js:1571107-1571244 placement
function getCloudCredentialErrorProvider(e) {
  if (e instanceof Ot && e.status !== void 0) return null;
  if (isAwsCredentialsProviderError(e)) return "AWS";
  if (isGoogleCloudProvider() && isGoogleCredentialLoadError(e)) return "Google Cloud";
  return null;
}
//@ chunk-e6aww6q8.js:1571244-1571519 placement
class OAuthRefreshDiskFullError extends Error {
  constructor() {
    super(
      "OAuth access token could not be refreshed: the disk that holds the Claude Code config directory, or the disk quota on it, is full; delete files you no longer need on that disk and try again",
    );
    this.name = "OAuthRefreshDiskFullError";
  }
}
/**
 * 各云提供方（AWS、Google Cloud、Microsoft Foundry、网关）认证失败的错误前缀，以及凭证由环境管理时的附加说明。
 */
//@ chunk-e6aww6q8.js:1571519-1571867 placement
var AWS_CREDENTIALS_INVALID = "AWS credentials expired or invalid",
  AWS_AUTH_FAILED = "AWS authentication failed",
  GCP_CREDENTIALS_INVALID = "Google Cloud credentials expired or invalid",
  GCP_AUTH_FAILED = "Google Cloud authentication failed",
  FOUNDRY_AUTH_FAILED = "Microsoft Foundry authentication failed",
  GATEWAY_REFUSED = "Gateway refused the request",
  MANAGED_CREDENTIALS_SUFFIX =
    " \xB7 credentials are managed by this environment \u2014 retry, or contact your administrator";
//@ chunk-e6aww6q8.js:1571867-1571945 placement
function TUo(e) {
  return [
    INVALID_API_KEY_MESSAGE,
    INVALID_AUTH_TOKEN_MESSAGE,
    INVALID_CUSTOM_HEADERS_MESSAGE,
    INVALID_ENV_HEADER_MESSAGE,
  ].some((n) => e.startsWith(`${n} \xB7 `));
}
/**
 * 文本以 "API Error"、"Please run /login · API Error" 或 AWS/Google Cloud 凭证错误前缀开头。
 */
//@ chunk-e6aww6q8.js:1571945-1572145 fingerprint = startsWithApiErrorPrefix (1)
function startsWithApiErrorPrefix(text) {
  return (
    text.startsWith(API_ERROR_MESSAGE_PREFIX) ||
    text.startsWith(`Please run /login \xB7 ${API_ERROR_MESSAGE_PREFIX}`) ||
    text.startsWith(AWS_CREDENTIALS_INVALID) ||
    text.startsWith(AWS_AUTH_FAILED) ||
    text.startsWith(GCP_CREDENTIALS_INVALID) ||
    text.startsWith(GCP_AUTH_FAILED) ||
    text.startsWith(FOUNDRY_AUTH_FAILED) ||
    text.startsWith(GATEWAY_REFUSED)
  );
}
/**
 * 从 "prompt is too long: N tokens > M" 解析实际与上限 token 数。
 */
//@ chunk-e6aww6q8.js:1572145-1572319 fingerprint = parsePromptTooLongTokenCounts (1)
function parsePromptTooLongTokenCounts(rawMessage) {
  let match = rawMessage.match(/prompt is too long[^0-9]*(\d+)\s*tokens?\s*>\s*(\d+)/i);
  return {
    actualTokens: match ? parseInt(match[1], 10) : void 0,
    limitTokens: match ? parseInt(match[2], 10) : void 0,
  };
}
/**
 * 提示词过长错误消息的超出量 {gap, actual}。
 */
//@ chunk-e6aww6q8.js:1572319-1572501 fingerprint = getPromptTooLongTokenGap (0.781)
function getPromptTooLongTokenGap(msg) {
  if (!isPromptTooLongMessage_2(msg) || !msg.errorDetails) return;
  let { actualTokens: actualTokens, limitTokens: limitTokens } = parsePromptTooLongTokenCounts(
    msg.errorDetails,
  );
  if (actualTokens === void 0 || limitTokens === void 0) return;
  let gap = actualTokens - limitTokens;
  return gap > 0 ? { gap: gap, actual: actualTokens } : void 0;
}
/**
 * 提示词过长超出的 token 数。
 */
//@ chunk-e6aww6q8.js:1572501-1572536 layout
function getPromptTooLongGap(e) {
  return getPromptTooLongTokenGap(e)?.gap;
}
/**
 * 0.8：会话内容占请求 80% 以上时提示"本会话内容占大头"。
 */
//@ chunk-e6aww6q8.js:1572536-1572548 layout
var SINGLE_EXCHANGE_CONTENT_RATIO = 0.8;
/**
 * 单轮会话无法压缩时的提示词过长文案：区分无法解析、会话内容占大头、系统提示词/工具/附件占大头三种情况。
 */
//@ chunk-e6aww6q8.js:1572548-1573355 layout
function formatSingleExchangePromptTooLong(e) {
  let {
    actualTokens: actualTokens,
    limitTokens: limitTokens,
    conversationTokensEstimate: conversationTokensEstimate,
  } = e;
  if (actualTokens === void 0 || limitTokens === void 0)
    return (
      `${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 this conversation is a single ` +
      "exchange and cannot be compacted \u2014 the request size comes mostly " +
      "from system prompt, tool definitions, or attachments."
    );
  if (conversationTokensEstimate >= actualTokens * SINGLE_EXCHANGE_CONTENT_RATIO)
    return `${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 the request is ~${actualTokens} tokens (limit ${limitTokens}) and this conversation's own content is most of it. A single-exchange conversation cannot be compacted; start with less content (smaller files or pasted text).`;
  return (
    `${PROMPT_TOO_LONG_ERROR_MESSAGE} \xB7 the request is ~${actualTokens} tokens (limit ${limitTokens}) but this conversation is only ~${conversationTokensEstimate} tokens \u2014 the rest is system prompt, ` +
    "tool definitions, and attachment content. A single-exchange conversation cannot be compacted; reduce attached files/tools or start with less context."
  );
}
/**
 * 用新文案重建 API 错误消息，保留 requestId、apiErrorStatus/Code 等元数据。
 */
//@ chunk-e6aww6q8.js:1573355-1573675 layout
function rebuildApiErrorMessage(e, n, r) {
  return {
    ...createApiErrorMessage({
      content: n,
      error: "invalid_request",
      apiError: e.apiError,
      apiErrorParams: e.apiErrorParams,
      errorDetails: e.errorDetails,
      now: r.now,
      uuid: r.uuid,
    }),
    requestId: e.requestId,
    apiErrorStatus: e.apiErrorStatus,
    ...(e.apiErrorCode !== void 0 && { apiErrorCode: e.apiErrorCode }),
    ...(e[MESSAGE_MARK_SYMBOLS] !== void 0 && { [MESSAGE_MARK_SYMBOLS]: e[MESSAGE_MARK_SYMBOLS] }),
  };
}
/**
 * 错误详情含 request_too_large 或可识别的媒体错误。
 */
//@ chunk-e6aww6q8.js:1573675-1573747 layout
function isRequestTooLargeOrMediaDetail(e) {
  return e.includes("request_too_large") || classifyMediaError(e) !== void 0;
}
/**
 * 400 错误里的媒体错误位置/类型（classifyMediaError）。
 */
//@ chunk-e6aww6q8.js:1573747-1573830 layout
function getMediaErrorFromApiError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return;
  return classifyMediaError(e.message);
}
/**
 * API 错误消息的详情是请求过大或媒体错误。
 */
//@ chunk-e6aww6q8.js:1573830-1573924 fingerprint = isMediaSizeErrorMessage (1)
function isMediaSizeErrorMessage(msg) {
  return (
    msg.isApiErrorMessage === !0 &&
    msg.errorDetails !== void 0 &&
    isRequestTooLargeOrMediaDetail(msg.errorDetails)
  );
}
/**
 * "Credit balance is too low"。
 */
//@ chunk-e6aww6q8.js:1573924-1573960 fingerprint = CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE (1)
var CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = "Credit balance is too low";
//@ chunk-e6aww6q8.js:1573960-1574064 placement
function isPromptTooLongError(e) {
  if (!(e instanceof Error)) return !1;
  return isPromptTooLongMessage(e.message) || includesWholeWord(e.message, "prompt_too_long");
}
//@ chunk-e6aww6q8.js:1574064-1574168 placement
function isMaxTokensContextOverflow(e) {
  return (
    e instanceof Error &&
    (isContextLimitExceeded(e.message) || includesWholeWord(e.message, "max_tokens_context_overflow"))
  );
}
//@ chunk-e6aww6q8.js:1574168-1574221 placement
var _5o = "Output blocked by content filtering policy";
//@ chunk-e6aww6q8.js:1574221-1574433 placement
function isRequestTooLargeError_2(e) {
  if (!(e instanceof Error) || !e.message.includes(_5o)) return !1;
  let n = "originalError" in e && e.originalError instanceof Error ? e.originalError : e,
    r = n instanceof Ot ? effectiveErrorStatus(n) : void 0;
  return r === void 0 || r === 400;
}
//@ chunk-e6aww6q8.js:1574433-1574548 placement
var UNPROCESSABLE_REQUEST_MESSAGE =
  "Request rejected as unprocessable by the model (too many or oversized images, or unsupported parameters)";
//@ chunk-e6aww6q8.js:1574548-1574657 placement
function isUnprocessableRequest(e) {
  if (!(e instanceof Ot)) return !1;
  let n = effectiveErrorStatus(e);
  return (n === void 0 || n === 400) && getApiErrorFirstLine(e).includes(UNPROCESSABLE_REQUEST_MESSAGE);
}
//@ chunk-e6aww6q8.js:1574657-1574761 placement
function isCreditBalanceTooLow(e) {
  return e instanceof Error && e.message.toLowerCase().includes("credit balance is too low");
}
//@ chunk-e6aww6q8.js:1574761-1574871 placement
function isOrganizationDisabled(e) {
  return e instanceof Error && e.message.toLowerCase().includes("organization has been disabled");
}
/**
 * 判断错误是超时类：特定超时错误类型，或消息里含 timeout 的另一类错误。
 */
//@ chunk-e6aww6q8.js:1574871-1574972 placement = _temp2 (1)
function isTimeoutError(res) {
  return res instanceof fT || (res instanceof ef && res.message.toLowerCase().includes("timeout"));
}
/**
 * 错误消息含重复 529 提示（Ike）。
 */
//@ chunk-e6aww6q8.js:1574972-1575039 layout
function isRepeated529Error(e) {
  return e instanceof Error && e.message.includes(REPEATED_529_MESSAGE);
}
/**
 * "maximum of N PDF pages"。
 */
//@ chunk-e6aww6q8.js:1575039-1575125 layout
function isPdfPageLimitError(e) {
  return e instanceof Error && /maximum of \d+ PDF pages/.test(e.message);
}
/**
 * "The PDF specified is password protected"。
 */
//@ chunk-e6aww6q8.js:1575125-1575230 layout
function isPdfPasswordProtectedError(e) {
  return e instanceof Error && e.message.includes("The PDF specified is password protected");
}
/**
 * 400 "image exceeds ... maximum"。
 */
//@ chunk-e6aww6q8.js:1575230-1575353 layout
function isImageTooLargeError(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    e.message.includes("image exceeds") &&
    e.message.includes("maximum")
  );
}
/**
 * 400 多图模式下尺寸超限。旧版名 isMediaSizeError 近似。
 */
//@ chunk-e6aww6q8.js:1575353-1575489 fingerprint = isMediaSizeError (0.692)
function isManyImageDimensionError(raw) {
  return (
    raw instanceof Ot &&
    raw.status === 400 &&
    raw.message.includes("image dimensions exceed") &&
    raw.message.includes("many-image")
  );
}
/**
 * HTTP 413。
 */
//@ chunk-e6aww6q8.js:1575489-1575544 layout
function isRequestTooLargeError(e) {
  return e instanceof Ot && e.status === 413;
}
/**
 * 400 消息为 "input is too long"（G7s 判定）。
 */
//@ chunk-e6aww6q8.js:1575544-1575640 layout
function isInputTooLongError(e) {
  return e instanceof Error && (!(e instanceof Ot) || e.status === 400) && isPlainInputTooLong(e.message);
}
/**
 * 400 "`tool_use` ids were found without `tool_result` blocks immediately after"。
 */
//@ chunk-e6aww6q8.js:1575640-1575791 layout
function isToolUseWithoutResultError(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    e.message.includes("`tool_use` ids were found without `tool_result` blocks immediately after")
  );
}
/**
 * 400 "unexpected `tool_use_id` found in `tool_result`"。
 */
//@ chunk-e6aww6q8.js:1575791-1575917 layout
function isUnexpectedToolResultError(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    e.message.includes("unexpected `tool_use_id` found in `tool_result`")
  );
}
/**
 * 400 "`tool_use` ids must be unique"。
 */
//@ chunk-e6aww6q8.js:1575917-1576025 layout
function isDuplicateToolUseIdError(e) {
  return e instanceof Ot && e.status === 400 && e.message.includes("`tool_use` ids must be unique");
}
/**
 * 400 "invalid model name"。
 */
//@ chunk-e6aww6q8.js:1576025-1576136 layout
function isInvalidModelNameError(e) {
  return e instanceof Ot && e.status === 400 && e.message.toLowerCase().includes("invalid model name");
}
/**
 * 消息提到 x-api-key。
 */
//@ chunk-e6aww6q8.js:1576136-1576225 layout
function isApiKeyHeaderError(e) {
  return e instanceof Error && e.message.toLowerCase().includes("x-api-key");
}
/**
 * 401/403 "OAuth authentication is currently not allowed for this organization"。
 */
//@ chunk-e6aww6q8.js:1576225-1576389 layout
function isOAuthOrgNotAllowedError(e) {
  return (
    e instanceof Ot &&
    (e.status === 401 || e.status === 403) &&
    e.message.includes("OAuth authentication is currently not allowed for this organization")
  );
}
/**
 * Bedrock 上消息含 "model id"。
 */
//@ chunk-e6aww6q8.js:1576389-1576495 layout
function isBedrockModelIdError(e) {
  return getAPIProvider() === "bedrock" && e instanceof Error && e.message.toLowerCase().includes("model id");
}
/**
 * "Not logged in · Please run /login"。
 */
//@ chunk-e6aww6q8.js:1576495-1576542 fingerprint = INVALID_API_KEY_ERROR_MESSAGE (1)
var INVALID_API_KEY_ERROR_MESSAGE = "Not logged in \xB7 Please run /login";
/**
 * 认证与过载类面向用户的错误文案常量组（以下同组）。
 */
//@ chunk-e6aww6q8.js:1576542-1579306 layout
var AUTH_REQUIRED_MESSAGE = "Authentication required \xB7 Sign in again to continue",
  INVALID_API_KEY_MESSAGE = "Invalid API key \xB7 Fix external API key",
  INVALID_AUTH_TOKEN_MESSAGE = "Invalid auth token \xB7 Fix external auth token",
  INVALID_CUSTOM_HEADERS_MESSAGE = "Invalid ANTHROPIC_CUSTOM_HEADERS \xB7 Fix the environment variable",
  INVALID_ENV_HEADER_MESSAGE =
    "Invalid request header from the environment \xB7 Fix the environment variable",
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE =
    "Your ANTHROPIC_API_KEY belongs to a disabled organization \xB7 Unset the environment variable to use your subscription instead",
  DISABLED_ORG_API_KEY_MESSAGE =
    "Your ANTHROPIC_API_KEY belongs to a disabled organization \xB7 Update or unset the environment variable",
  API_KEY_AUTH_DISABLED_UNSET_ENV_MESSAGE =
    "Your organization has disabled API key authentication \xB7 Unset ANTHROPIC_API_KEY to use your claude.ai account instead",
  API_KEY_AUTH_DISABLED_UNSET_ENV_LOGIN_MESSAGE =
    "Your organization has disabled API key authentication \xB7 Unset ANTHROPIC_API_KEY and run /login to sign in with your claude.ai account",
  API_KEY_AUTH_DISABLED_UNSET_HELPER_MESSAGE =
    "Your organization has disabled API key authentication \xB7 Unset the apiKeyHelper setting and run /login to sign in with your claude.ai account",
  API_KEY_AUTH_DISABLED_LOGIN_MESSAGE =
    "Your organization has disabled API key authentication \xB7 Run /login to sign in with your claude.ai account",
  API_KEY_AUTH_DISABLED_SIGN_IN_MESSAGE =
    "Your organization has disabled API key authentication \xB7 Sign in again with your claude.ai account",
  TOKEN_REVOKED_MESSAGE = "OAuth token revoked \xB7 Please run /login",
  LOGIN_EXPIRED_MESSAGE = "Login expired \xB7 Please run /login",
  OAUTH_REFRESH_LOCK_TIMEOUT_MESSAGE =
    "Could not refresh your login because another Claude Code process is refreshing it (or exited mid-refresh) \xB7 Try again in a minute; if it keeps happening, close other Claude Code windows or sign in again with /login",
  OAUTH_REFRESH_DISK_FULL_MESSAGE =
    "Could not refresh your login: the disk that holds the Claude Code config directory (~/.claude by default), or your disk quota on it, is full \xB7 Delete files you no longer need on that disk, then try again \xB7 Signing in again won't help",
  ANTHROPIC_PROFILE_LOGIN_EXPIRED_MESSAGE =
    "Anthropic profile login expired \xB7 Re-authenticate your Anthropic profile",
  LOGIN_OR_PROFILE_EXPIRED_MESSAGE =
    "Login expired \xB7 Run /login to sign in again, or re-authenticate your Anthropic profile",
  AUTH_NETWORK_ERROR_MESSAGE =
    "Authentication error \xB7 This may be a temporary network issue, please try again",
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE =
    "Authentication error \xB7 The gateway could not authenticate with its upstream provider \u2014 contact your gateway administrator",
  API_KEY_HELPER_FAILING_MESSAGE =
    "Your apiKeyHelper script is failing \xB7 This usually means you need to re-authenticate with your provider \xB7 Run /status to see the script's error output",
  HTTPS_STATUS_CLAUDE_COM = "https://status.claude.com",
  REPEATED_529_MESSAGE = "Repeated 529 Overloaded errors",
  OPUS_HIGH_LOAD_MESSAGE = "Opus is experiencing high load, please use /model to switch to Sonnet",
  FABLE_HIGH_LOAD_MESSAGE = "Fable is experiencing high load, please use /model to switch to Sonnet",
  OPUS_HIGH_LOAD_SHORT_MESSAGE = "Opus is experiencing high load. Switch to Sonnet.",
  FABLE_HIGH_LOAD_SHORT_MESSAGE = "Fable is experiencing high load. Switch to Sonnet.",
  SERVER_RATE_LIMITED_MESSAGE = "Server is temporarily limiting requests (not your usage limit)",
  REQUEST_TIMED_OUT_MESSAGE = "Request timed out";
/**
 * 错误后缀 "If it persists, check …"：官方 API/AnthropicAws 指向 status.claude.com，自定义网关指向其主机，其余提供商指向对应服务状态。
 */
//@ chunk-e6aww6q8.js:1579306-1579735 layout
function getStatusPageHint() {
  let e = getAPIProvider();
  if (e === "firstParty") {
    if (isFirstPartyAnthropicBaseUrl()) return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM}.`;
    let n = env.ANTHROPIC_BASE_URL ?? "";
    return ` If it persists, check your inference gateway (${URL.parse(n)?.host || n}).`;
  }
  if (e === "anthropicAws") return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM}.`;
  if (e === "anthropicGoogleCloud")
    return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM} and Google Cloud's status page.`;
  return ` If it persists, check your ${THIRD_PARTY_PROVIDER_LABELS[e]} service status.`;
}
/**
 * 组织禁用了 Claude 订阅访问 Claude Code 的提示。
 */
//@ chunk-e6aww6q8.js:1579735-1579893 layout
var SUBSCRIPTION_ACCESS_DISABLED_MESSAGE =
  "Your organization has disabled Claude subscription access for Claude Code \xB7 Use an Anthropic API key instead, or ask your admin to enable access";
/**
 * OAuth 令牌被吊销的提示（交互/非交互不同文案）。
 */
//@ chunk-e6aww6q8.js:1579893-1580022 layout
function getTokenRevokedMessage() {
  return getIsNonInteractiveSession()
    ? "Failed to authenticate: OAuth token revoked. Please log in again or contact your administrator."
    : TOKEN_REVOKED_MESSAGE;
}
/**
 * 需要重新登录（某些托管登录场景）或 "Not logged in · Please run /login"。
 */
//@ chunk-e6aww6q8.js:1580022-1580057 layout
function getNotLoggedInMessage() {
  return isArtifactMountMode() ? AUTH_REQUIRED_MESSAGE : INVALID_API_KEY_ERROR_MESSAGE;
}
/**
 * pro/max 用户为付款问题提示，其他为组织禁用提示。旧版名 isConsumerPlan 为错配。
 */
//@ chunk-e6aww6q8.js:1580057-1580129 layout = isConsumerPlan (1)
function getSubscriptionUnavailableMessage() {
  let e = getSubscriptionType();
  if (e === "pro" || e === "max") return SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE;
  return SUBSCRIPTION_ACCESS_DISABLED_MESSAGE;
}
/**
 * CLAUDE_CODE_REMOTE。
 */
//@ chunk-e6aww6q8.js:1580129-1580172 layout
function isRemoteSession() {
  return env.CLAUDE_CODE_REMOTE;
}
/**
 * tool_use/tool_result 不匹配错误时，定位该 tool_use 在规范化前后消息中的位置并记录遥测（只记角色/块类型摘要）。
 */
//@ chunk-e6aww6q8.js:1580172-1582680 fingerprint = logToolUseToolResultMismatch (0.791)
function logToolUseToolResultMismatch(toolUseId, messages, messagesForAPI) {
  try {
    let s = (we) =>
        we === "user" || we === "assistant" || we === "system" ? fromEnum(we) : lit_2("unknown"),
      h = (we) => typeof we === "object" && we !== null,
      normalizedIndex = -1;
    for (let we = 0; we < messagesForAPI.length; we++) {
      let Ee = messagesForAPI[we];
      if (!Ee) continue;
      let content = Ee.message.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (h(block) && block.type === "tool_use" && "id" in block && block.id === toolUseId) {
            normalizedIndex = we;
            break;
          }
      }
      if (normalizedIndex !== -1) break;
    }
    let originalIndex = -1;
    for (let we = 0; we < messages.length; we++) {
      let Ee = messages[we];
      if (!Ee) continue;
      if (Ee.type === "assistant" && "message" in Ee) {
        let content = Ee.message.content;
        if (Array.isArray(content)) {
          for (let block of content)
            if (h(block) && block.type === "tool_use" && "id" in block && block.id === toolUseId) {
              originalIndex = we;
              break;
            }
        }
      }
      if (originalIndex !== -1) break;
    }
    let w = (we, Ee) => concatSafe(fromEnum(we), lit_2(":"), ye(Ee) ?? lit_2("nonconforming")),
      L = (we) => {
        let Ee = s(we.message.role),
          content = we.message.content;
        if (typeof content === "string") return [concatSafe(Ee, lit_2(":string_content"))];
        if (!Array.isArray(content)) return [];
        return content.map((Ie) =>
          concatSafe(
            Ee,
            lit_2(":"),
            !h(Ie)
              ? lit_2("unknown")
              : Ie.type === "tool_use" && "id" in Ie
                ? w("tool_use", Ie.id)
                : Ie.type === "tool_result" && "tool_use_id" in Ie
                  ? w("tool_result", Ie.tool_use_id)
                  : isKnownContentBlockType(Ie.type)
                    ? fromEnum(Ie.type)
                    : lit_2("unknown"),
          ),
        );
      },
      flattened = messagesForAPI.slice(normalizedIndex + 1).flatMap((we) => (we ? L(we) : [])),
      q = [];
    for (let we = originalIndex + 1; we < messages.length; we++) {
      let Ee = messages[we];
      if (!Ee) continue;
      switch (Ee.type) {
        case "user":
        case "assistant":
          if ("message" in Ee) q.push(...L(Ee));
          break;
        case "attachment":
          if ("attachment" in Ee) q.push(concatSafe(lit_2("attachment:"), rpn(Ee.attachment.type)));
          break;
        case "system":
          if ("subtype" in Ee) q.push(concatSafe(lit_2("system:"), rpn(Ee.subtype)));
          break;
        case "progress": {
          let Ae = "data" in Ee ? Ee.data : void 0,
            Ie = typeof Ae === "object" && Ae !== null && "type" in Ae ? Ae.type : void 0;
          q.push(concatSafe(lit_2("progress:"), rpn(Ie)));
          break;
        }
      }
    }
    let Z = (we) => {
        if (!we) return lit_2("<none>");
        let Ee = s(we.message.role),
          content = we.message.content;
        if (!Array.isArray(content)) return concatSafe(Ee, lit_2(":string"));
        let mapped = content.map((Me) =>
          !h(Me)
            ? lit_2("unknown")
            : Me.type === "tool_use"
              ? w("tool_use", Me.id)
              : Me.type === "tool_result"
                ? w("tool_result", Me.tool_use_id)
                : isKnownContentBlockType(Me.type)
                  ? fromEnum(Me.type)
                  : lit_2("unknown"),
        );
        return concatSafe(Ee, lit_2(":["), joinSafe(mapped), lit_2("]"));
      },
      Se = 0,
      ke = 0;
    for (let block of messagesForAPI) {
      let content = block.message.content;
      if (!Array.isArray(content)) continue;
      for (let block of content) {
        if (!h(block)) continue;
        if (block.type === "tool_use" && block.id === toolUseId) Se++;
        if (block.type === "tool_result" && block.tool_use_id === toolUseId) ke++;
      }
    }
    logEvent("tengu_tool_use_tool_result_mismatch_error", {
      toolUseId: ye(toolUseId),
      normalizedSequence: joinSafe(flattened, ", "),
      preNormalizedSequence: joinSafe(q, ", "),
      normalizedMessageCount: messagesForAPI.length,
      originalMessageCount: messages.length,
      normalizedToolUseIndex: normalizedIndex,
      originalToolUseIndex: originalIndex,
      offendingMessageBlocks: Z(messagesForAPI[normalizedIndex]),
      followingMessageBlocks:
        normalizedIndex === -1 ? lit_2("<none>") : Z(messagesForAPI[normalizedIndex + 1]),
      toolUseOccurrences: Se,
      toolResultOccurrences: ke,
    });
  } catch (error) {}
}
/**
 * 对象形如 API Message（content 数组、model 字符串、usage 对象）。
 */
//@ chunk-e6aww6q8.js:1582680-1582854 fingerprint = isValidAPIMessage (1)
function isValidAPIMessage(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    "model" in value &&
    "usage" in value &&
    Array.isArray(value.content) &&
    typeof value.model === "string" &&
    typeof value.usage === "object"
  );
}
/**
 * 400 拒绝 auto 模式的 afk-mode beta。
 */
//@ chunk-e6aww6q8.js:1582854-1582932 layout
function isAfkModeBetaRejected(e) {
  return !!tj && e instanceof Ot && e.status === 400 && messageMentionsBeta(e.message, tj);
}
/**
 * safeguards 字段路径正则（messages.N.content.M…safeguards），用于区分内容块里的 safeguards 与顶层字段。
 */
//@ chunk-e6aww6q8.js:1582932-1582995 layout
var SAFEGUARDS_CONTENT_PATH_REGEX = /^messages\.\d+\.content\.\d+(?:\.\w+)*\.safeguards\b/;
/**
 * 取错误消息（优先 error.error.message）去掉状态码前缀后的第一行。
 */
//@ chunk-e6aww6q8.js:1582995-1583142 layout
function getApiErrorFirstLine(e) {
  let r = e.error?.error?.message,
    s = typeof r === "string" ? r : e.message.replace(/^\d{3} /, ""),
    index = s.indexOf(`
`);
  return index === -1 ? s : s.slice(0, index);
}
/**
 * 422 错误转成等价的 400 错误对象（统一走 400 判定）。
 */
//@ chunk-e6aww6q8.js:1583142-1583266 layout
function normalize422To400(e) {
  return e instanceof Ot && e.status === 422
    ? new Ot(400, e.error, e.message.replace(/^422 /, ""), e.headers, e.type)
    : e;
}
/**
 * 400 拒绝 safeguards 字段/对应 beta。
 */
//@ chunk-e6aww6q8.js:1583266-1583393 layout
function isSafeguardsRejected(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    (messageMentionsBeta(e.message, qT) ||
      (/\bsafeguards\b/.test(e.message) && !SAFEGUARDS_CONTENT_PATH_REGEX.test(getApiErrorFirstLine(e))))
  );
}
/**
 * 400 拒绝 PG（tether/thread）beta。
 */
//@ chunk-e6aww6q8.js:1583393-1583471 layout
function isTetherBetaRejected(e) {
  return !!PG && e instanceof Ot && e.status === 400 && messageMentionsBeta(e.message, PG);
}
/**
 * 中途 system 消息 / clear_at 被拒的消息路径正则。
 */
//@ chunk-e6aww6q8.js:1583471-1583605 layout
var TURN_SCOPED_SYSTEM_REGEX =
  /^messages\.\d+(?:\.content\.\d+)?(?:\.clear_at:|: .*(?:turn-scoped system message|\(clear_at: |clear_at is only permitted))/;
/**
 * 400 拒绝 clear_at 或 turn-scoped system 消息。
 */
//@ chunk-e6aww6q8.js:1583605-1583755 layout
function isKeptReminderClearAtRejected(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  let n = getApiErrorFirstLine(e);
  return (n.startsWith("Unexpected value(s) ") && wyn(n, MK.header)) || TURN_SCOPED_SYSTEM_REGEX.test(n);
}
/**
 * 400 advisor_tool_result 内容无法处理。
 */
//@ chunk-e6aww6q8.js:1583755-1583945 layout
function isAdvisorResultUnprocessable(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    (e.message.includes("Advisor tool result content could not be processed") ||
      e.message.includes("found in advisor_tool_result blocks"))
  );
}
/**
 * 历史中 web search 加密内容无法解密的错误片段；a3o 为代码执行结果加密错误。
 */
//@ chunk-e6aww6q8.js:1583945-1584164 layout
var WEB_SEARCH_DECRYPT_ERRORS = [
    "invalid encrypted_content in search_result block",
    "invalid encrypted_index in text block",
    "failed to decrypt web search result content",
  ],
  CODE_EXECUTION_DECRYPT_ERROR = "invalid encrypted_stdout in encrypted_code_execution_result block";
/**
 * 小写并去反引号。
 */
//@ chunk-e6aww6q8.js:1584164-1584222 layout
function normalizeErrorText(e) {
  return e.toLowerCase().replaceAll("`", "");
}
/**
 * 400 历史 web search 内容解密失败（触发 retry:web-search-strip）。
 */
//@ chunk-e6aww6q8.js:1584222-1584341 layout
function isWebSearchContentRejected(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  let n = normalizeErrorText(e.message);
  return WEB_SEARCH_DECRYPT_ERRORS.some((r) => n.includes(r));
}
/**
 * 400 历史中代码执行结果加密内容无法解密。
 */
//@ chunk-e6aww6q8.js:1584341-1584425 layout
function isCodeExecutionOutputRejected(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    normalizeErrorText(e.message).includes(CODE_EXECUTION_DECRYPT_ERROR)
  );
}
/**
 * advisor 模型与请求模型不匹配的错误片段。
 */
//@ chunk-e6aww6q8.js:1584425-1584490 layout
var ADVISOR_MODEL_MISMATCH_MESSAGE = "cannot be used as an advisor when the request model is";
/**
 * 400 advisor 模型不能为当前请求模型提供建议。
 */
//@ chunk-e6aww6q8.js:1584490-1584569 layout
function isAdvisorModelMismatchError(e) {
  return e instanceof Ot && e.status === 400 && e.message.includes(ADVISOR_MODEL_MISMATCH_MESSAGE);
}
/**
 * advisor 工具不可用/模型不能做 advisor/advisor beta 被拒。
 */
//@ chunk-e6aww6q8.js:1584569-1584850 layout
function isAdvisorUnavailableError(e) {
  if (!(e instanceof Ot)) return !1;
  if (e.status === 400)
    return (
      e.message.includes("the advisor tool is not available") ||
      e.message.includes("cannot be used as an advisor") ||
      /tools\.\d+\.model: /.test(e.message) ||
      isAdvisorBlockTypeUnknown(e.message) ||
      isAdvisorBetaRejected(e)
    );
  return e.status === 422 && isAdvisorBlockTypeUnknown(e.message);
}
/**
 * 400 拒绝 advisor beta。
 */
//@ chunk-e6aww6q8.js:1584850-1584924 layout
function isAdvisorBetaRejected(e) {
  return e instanceof Ot && e.status === 400 && messageMentionsBeta(e.message, d3e);
}
/**
 * 错误里的 Input tag 是 advisor 引入的块类型（服务端不认识）。
 */
//@ chunk-e6aww6q8.js:1584924-1584957 layout
function isAdvisorBlockTypeUnknown(e) {
  return hasRejectedInputTag(d3e, e);
}
/**
 * advisor 被拒的范围：组织不可用→process，block 类型未知/beta 拒→host，否则 conversation。
 */
//@ chunk-e6aww6q8.js:1584957-1585102 layout
function getAdvisorRefusalScope(e) {
  if (e.message.includes("not available for this organization")) return "process";
  return isAdvisorBlockTypeUnknown(e.message) || isAdvisorBetaRejected(e) ? "host" : "conversation";
}
/**
 * 400 拒绝 DO（缓存保活）beta。
 */
//@ chunk-e6aww6q8.js:1585102-1585175 layout
function isCacheKeepaliveBetaRejected(e) {
  return e instanceof Ot && e.status === 400 && messageMentionsBeta(e.message, DO);
}
/**
 * 400 拒绝 l3e beta。
 */
//@ chunk-e6aww6q8.js:1585175-1585249 layout
function isThinkingResumptionBetaRejected(e) {
  return e instanceof Ot && e.status === 400 && messageMentionsBeta(e.message, l3e);
}
/**
 * thinking.display 输入校验失败的正则。
 */
//@ chunk-e6aww6q8.js:1585249-1585315 layout
var THINKING_DISPLAY_INPUT_REGEX = /thinking\.(adaptive|enabled)\.display: Input should be /;
/**
 * 400 "thinking.(adaptive|enabled).display: Input should be"。
 */
//@ chunk-e6aww6q8.js:1585315-1585391 layout
function isThinkingDisplayRejected(e) {
  return e instanceof Ot && e.status === 400 && THINKING_DISPLAY_INPUT_REGEX.test(e.message);
}
/**
 * 400 拒绝 thinking-binding-controls beta 或 block_binding 字段。
 */
//@ chunk-e6aww6q8.js:1585391-1585606 layout
function isThinkingBindingRejected(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    !isInvalidThinkingSignatureError(e) &&
    !isConversationBindingError(e) &&
    (messageMentionsBeta(e.message, xG) ||
      /thinking\.(adaptive|enabled)\.block_binding(\.prefix_mismatch_behavior)?: Extra inputs are not permitted/.test(
        e.message,
      ))
  );
}
/**
 * 400 消息提到 thinking-binding-controls beta 头。
 */
//@ chunk-e6aww6q8.js:1585606-1585708 layout
function mentionsThinkingBindingBeta(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    !isInvalidThinkingSignatureError(e) &&
    !isConversationBindingError(e) &&
    e.message.includes(xG.header)
  );
}
/**
 * 400 "invalid beta flag"。
 */
//@ chunk-e6aww6q8.js:1585708-1585817 layout
function isInvalidBetaFlagError(e) {
  return e instanceof Ot && e.status === 400 && e.message.toLowerCase().includes("invalid beta flag");
}
/**
 * 400 提到 1M 上下文 beta 或 long context beta。
 */
//@ chunk-e6aww6q8.js:1585817-1585946 layout
function isContext1mBetaRejected(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    (e.message.includes(yv.header) || e.message.includes("long context beta"))
  );
}
/**
 * beta → 400 消息匹配器（context_management、evict_on_complete、thinking display、thinking-token-count 等）；OJt 是其键列表，d3o 是 beta → 输入标签名正则。
 */
//@ chunk-e6aww6q8.js:1585946-1586365 layout
var BETA_REJECTION_MATCHERS = new Map([
    [VPt, null],
    [sle, (e) => e.includes("context_management: Extra inputs are not permitted")],
    [qlt, (e) => e.includes("evict_on_complete") && e.includes("beta")],
    [Rge, (e) => THINKING_DISPLAY_INPUT_REGEX.test(e)],
    [AU, null],
  ]),
  BETA_REJECTION_MATCHER_KEYS = [...BETA_REJECTION_MATCHERS.keys()],
  BETA_INPUT_TAG_PATTERNS = new Map([
    [d3e, new RegExp(`^${replaced}\\d+$`)],
    [sle, /^clear_(thinking|tool_uses)_\d+$/],
    [tb, /^tool_definition$/],
    [Lb, /^tool_(addition|removal)$/],
    [a9t, /^tool_reference$/],
    [Vlt, /^tool_reference$/],
  ]);
/**
 * 消息里的 "Input tag 'x'" 是否属于该 beta 引入的块类型。
 */
//@ chunk-e6aww6q8.js:1586365-1586484 layout
function hasRejectedInputTag(e, n) {
  let r = BETA_INPUT_TAG_PATTERNS.get(e);
  return r !== void 0 && [...n.matchAll(/Input tag '([\w.-]+)'/g)].some(([, s]) => r.test(s));
}
/**
 * 错误首行以被拒的 Input tag 开头。
 */
//@ chunk-e6aww6q8.js:1586484-1586584 layout
function errorStartsWithRejectedInputTag(e, n) {
  let match = /^(?:[\w.]+: )?Input tag '[\w.-]+'/.exec(getApiErrorFirstLine(n));
  return match !== null && hasRejectedInputTag(e, match[0]);
}
/**
 * "Unexpected value(s) `a`, `b` for the `anthropic-beta`"。
 */
//@ chunk-e6aww6q8.js:1586584-1586666 layout
var UNEXPECTED_BETA_VALUES_REGEX = /Unexpected value\(s\) ((?:`[^`]+`(?:, )?)+) for the `anthropic[-_]beta`/;
/**
 * 400 中被拒的、本次发送了的 beta 列表（排除思考签名/会话绑定错误）。
 */
//@ chunk-e6aww6q8.js:1586666-1586870 layout
function getRejectedBetas(e, n) {
  if (!(e instanceof Ot) || isConversationBindingError(e) || isInvalidThinkingSignatureError(e)) return [];
  return freeze_24.filter(
    (r) =>
      r.header !== null &&
      !uoo.has(r) &&
      n.includes(r.header) &&
      (isBetaHeaderRejected(e, r) ||
        isBetaListedAsUnexpected(e, r) ||
        (BETA_REJECTION_MATCHERS.has(r) && e.status === 400 && messageMentionsBeta(e.message, r))),
  );
}
/**
 * 该 beta 出现在 "Unexpected value(s) ... for the anthropic-beta" 列表中。
 */
//@ chunk-e6aww6q8.js:1586870-1587017 layout
function isBetaListedAsUnexpected(e, n) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    e.message.includes(n.header) &&
    UNEXPECTED_BETA_VALUES_REGEX.exec(e.message)?.[1]?.includes(`\`${n.header}\``) === !0
  );
}
/**
 * 错误是否指向该 beta 被拒。
 */
//@ chunk-e6aww6q8.js:1587017-1587169 layout
function isBetaRejected(e, n) {
  return (
    e instanceof Ot &&
    !isConversationBindingError(e) &&
    !isInvalidThinkingSignatureError(e) &&
    (isBetaHeaderRejected(e, n) ||
      (e.status === 400 && messageMentionsBeta(e.message, n)) ||
      ((e.status === 400 || e.status === 422) && hasRejectedInputTag(n, e.message)))
  );
}
/**
 * beta 被拒：首行 Unexpected value(s) 列出该头、或 beta 专属匹配器命中、或 Input tag 属于该 beta。
 */
//@ chunk-e6aww6q8.js:1587169-1587297 layout
function isBetaHeaderRejected(e, n) {
  if (!(e instanceof Ot) || n.header === null) return !1;
  return (
    isBetaNamedInUnexpectedValues(e, n.header) ||
    BETA_REJECTION_MATCHERS.get(n)?.(e.message) === !0 ||
    errorStartsWithRejectedInputTag(n, e)
  );
}
/**
 * 错误首行 Unexpected value(s) 列出该头，或带 beta_header:<名> 诊断标记。
 */
//@ chunk-e6aww6q8.js:1587297-1587424 layout
function isBetaNamedInUnexpectedValues(e, n) {
  let match = UNEXPECTED_BETA_VALUES_REGEX.exec(getApiErrorFirstLine(e));
  return (
    (match?.index === 0 && match[1]?.includes(`\`${n}\``) === !0) ||
    includesWholeWord(e.message, `beta_header:${n}`)
  );
}
/**
 * 服务端拒答回退（fallbacks 参数/beta）相关 400 的子类：category_beta_header/beta_header/default_unconfigured/unsupported_primary/invalid_target/param_shape…
 */
//@ chunk-e6aww6q8.js:1587424-1588623 layout
function classifyServerFallbackError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return;
  let message = e.message;
  if (jw !== null && message.includes(`\`${jw.header}`) && message.includes("anthropic-beta"))
    return "category_beta_header";
  if (message.includes("`server-side-fallback-") && message.includes("anthropic-beta")) return "beta_header";
  if (message.includes("has no default fallback configuration")) return "default_unconfigured";
  if (/does not support the `fallbacks?` parameter/.test(message)) return "unsupported_primary";
  if (/The `fallbacks?` parameter is not supported/.test(message)) return "unsupported_primary";
  if (message.includes("is not a valid fallback target for")) return "invalid_target";
  if (message.includes("`fallback` and `fallbacks` cannot both be set")) return "param_shape";
  if (/`fallbacks?(\[\d+\])?\.[a-z_]+`?/.test(message)) return "param_shape";
  if (/target model '[^']*' is not compatible with/.test(message)) return "param_shape";
  if (message.includes("server-side fallback is not supported")) return "param_shape";
  if (/\bfallbacks?\.(messages|stream|fallback)\b is not supported/.test(message)) return "param_shape";
  if (/\bfallbacks?(\[\d+\])?: unknown field/.test(message)) return "param_shape";
  if (
    message.includes("Extra inputs are not permitted") &&
    /\bfallbacks?(\[\d+\])?((\.|\s*->\s*)\w+)*\s*:/.test(message)
  )
    return "extra_forbidden";
  return;
}
/**
 * fallback_credit_token 相关 400 子类：credit_beta_header/malformed/wrong_org/expired/invalid_model/extra_forbidden/other。
 */
//@ chunk-e6aww6q8.js:1588623-1589365 layout
function classifyFallbackCreditError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return;
  let message = e.message;
  if (
    message.includes("fallback-credit-") &&
    (message.includes("anthropic-beta") || message.includes("anthropic_beta"))
  )
    return "credit_beta_header";
  if (message.includes("fallback_credit_token: invalid or malformed")) return "credit_malformed";
  if (message.includes("fallback_credit_token: does not belong to this organization"))
    return "credit_wrong_org";
  if (message.includes("fallback_credit_token: has expired")) return "credit_expired";
  if (message.includes("fallback_credit_token: is not valid for model")) return "credit_invalid_model";
  if (message.includes("Extra inputs are not permitted") && /\bfallback_credit_token\s*:/.test(message))
    return "credit_extra_forbidden";
  if (/\bfallback_credit_token\s*:/.test(message)) return "credit_other";
  return;
}
/**
 * 消息是否提到该 beta 头。
 */
//@ chunk-e6aww6q8.js:1589365-1589405 layout
function messageMentionsBeta(e, n) {
  return z7s(e, n.header);
}
/**
 * 400/422 拒绝对话中途的 system 消息（mid_conv_system）。
 */
//@ chunk-e6aww6q8.js:1589405-1589646 layout
function isMidConversationSystemRejected(e) {
  if (
    !(e instanceof Ot) ||
    (e.status !== 400 &&
      e.status !== 422 &&
      (e.message.includes("cache_control") ||
        (wyn(e.message, MID_CONVERSATION_SYSTEM_2026_04_07) &&
          !isBetaNamedInUnexpectedValues(e, MID_CONVERSATION_SYSTEM_2026_04_07))))
  )
    return !1;
  return (
    isUnsupportedRoleError(e.message) ||
    includesWholeWord(e.message, "mid_conv_system") ||
    includesWholeWord(e.message, `beta_header:${MID_CONVERSATION_SYSTEM_2026_04_07}`)
  );
}
/**
 * 中途 system 消息被拒时解析出的具体原因。
 */
//@ chunk-e6aww6q8.js:1589646-1589732 layout
function getMidConvSystemRejection(e) {
  if (!(e instanceof Ot) || !isMidConversationSystemRejected(e)) return null;
  return parseMidConvSystemRejection(e.message) ?? null;
}
/**
 * tool_addition/removal 被拒（classifyToolChangeError 有结果）。
 */
//@ chunk-e6aww6q8.js:1589732-1589771 layout
function isToolChangeRejected(e) {
  return classifyToolChangeError(e) !== void 0;
}
/**
 * 消息内工具定义被拒（classifyInlineToolDefinitionError 有结果）。
 */
//@ chunk-e6aww6q8.js:1589771-1589810 layout
function isInlineToolDefinitionRejected(e) {
  return classifyInlineToolDefinitionError(e) !== void 0;
}
/**
 * 消息内工具定义（tool_definition）被拒原因：unsupported_on_platform/header_rejected/kind_not_enabled/name_conflict。
 */
//@ chunk-e6aww6q8.js:1589810-1590322 layout
function classifyInlineToolDefinitionError(e) {
  if (!(e instanceof Ot)) return;
  let message = e.message;
  if ((e.status === 400 || e.status === 422) && hasRejectedInputTag(tb, message))
    return "unsupported_on_platform";
  if (e.status !== 400) return;
  if (messageMentionsBeta(message, tb)) return "header_rejected";
  if (
    message.includes("are not available on this platform") &&
    /tool definitions|tool_addition/.test(message)
  )
    return "unsupported_on_platform";
  if (message.includes("cannot yet be defined in a message")) return "kind_not_enabled";
  if (message.includes("is already used by a") && /tool\.definition|tool_addition/.test(message))
    return "name_conflict";
  return;
}
/**
 * tool_addition/removal 块被拒原因：block_type_unknown/header_rejected/after_paused_turn/model_unsupported/too_many_definitions/pfc_only/unknown_tool_reference/other。
 */
//@ chunk-e6aww6q8.js:1590322-1590947 layout
function classifyToolChangeError(e) {
  if (!(e instanceof Ot)) return;
  let message = e.message;
  if ((e.status === 400 || e.status === 422) && hasRejectedInputTag(Lb, message)) return "block_type_unknown";
  if (e.status !== 400) return;
  if (messageMentionsBeta(message, Lb)) return "header_rejected";
  if (!/\btool_addition\b/.test(message) || isCacheControlError(message)) return;
  if (message.includes("paused assistant turn")) return "after_paused_turn";
  if (message.includes("not supported on this model") || message.includes("requires a model that supports"))
    return "model_unsupported";
  if (message.includes("exceed")) return "too_many_definitions";
  if (message.includes("PFC-only")) return "pfc_only";
  if (message.includes("references") || message.includes("names a declared")) return "unknown_tool_reference";
  return "other";
}
/**
 * 400 拒绝某处 cache_control 字段。
 */
//@ chunk-e6aww6q8.js:1590947-1591069 layout
function isCacheControlFieldRejected(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  return isCacheControlError(e.message) || includesWholeWord(e.message, "cache_control_field");
}
/**
 * 400 拒绝 output_config（除 timing、结构化输出、effort 与 thinking 冲突等已单独处理的情况）。
 */
//@ chunk-e6aww6q8.js:1591069-1591398 layout
function isOutputConfigRejected(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  if (isStructuredOutputsUnsupported(e)) return !1;
  if (
    getEffortRejectedWithoutThinking(e) !== null &&
    !/messages\.\d+:\s*output_config\.effort/.test(e.message)
  )
    return !1;
  if (getMidConvSystemRejection(e) !== null) return !1;
  let message = e.message;
  if (messageMentionsBeta(message, CG)) return !0;
  return (
    (message.includes("output_config") && !message.includes("output_config.timing")) ||
    includesWholeWord(message, "effort_unsupported")
  );
}
/**
 * 400 拒绝按轮 effort（per-turn effort）。
 */
//@ chunk-e6aww6q8.js:1591398-1591607 layout
function isPerTurnEffortRejected(e) {
  return (
    isOutputConfigRejected(e) &&
    e instanceof Ot &&
    (isBetaHeaderRejected(e, CG) ||
      e.message.includes("requires a model that supports per-turn effort") ||
      /messages\.\d+\.output_config: Extra inputs are not permitted/.test(e.message))
  );
}
/**
 * 400 拒绝 per-turn timing beta 或 output_config.timing。
 */
//@ chunk-e6aww6q8.js:1591607-1591726 layout
function isOutputTimingRejected(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    (messageMentionsBeta(e.message, Z4) || e.message.includes("output_config.timing"))
  );
}
/**
 * 400 模型不支持 effort（effort parameter not supported / output_config.effort extra inputs）。
 */
//@ chunk-e6aww6q8.js:1591726-1592075 layout
function isEffortUnsupportedError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  if (getRejectedThinkingType(e) !== null) return !1;
  let lower = e.message.toLowerCase();
  if (lower.includes("effort parameter") && lower.includes("not support")) return !0;
  if (
    lower.includes("output_config") &&
    lower.includes("effort") &&
    lower.includes("extra inputs are not permitted")
  )
    return !0;
  return includesWholeWord(e.message, "effort_unsupported") || isBetaHeaderRejected(e, Cge);
}
/**
 * 400 模型不支持结构化输出（output_config.format）。
 */
//@ chunk-e6aww6q8.js:1592075-1592216 layout
function isStructuredOutputsUnsupported(e) {
  return (
    e instanceof Ot &&
    e.status === 400 &&
    (isOutputFormatExtraInputsError(e.message) ||
      includesWholeWord(e.message, "structured_outputs_unsupported") ||
      isBetaHeaderRejected(e, n8) ||
      isBetaListedAsUnexpected(e, n8))
  );
}
/**
 * 400 "not created in this conversation"/"bound to a different conversation"（思考签名或缓存锚点绑定错误）。
 */
//@ chunk-e6aww6q8.js:1592216-1592411 layout
function isConversationBindingError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  let lower = e.message.toLowerCase();
  return (
    lower.includes("not created in this conversation") || lower.includes("bound to a different conversation")
  );
}
/**
 * 给错误打 prefixLockHealDeclined 标记（前缀锁自愈被放弃）。
 */
//@ chunk-e6aww6q8.js:1592411-1592472 layout
function markPrefixLockHealDeclined(e) {
  Object.assign(e, { prefixLockHealDeclined: !0 });
}
/**
 * 错误带 prefixLockHealDeclined 标记。
 */
//@ chunk-e6aww6q8.js:1592472-1592572 layout
function isPrefixLockHealDeclined(e) {
  return e instanceof Ot && "prefixLockHealDeclined" in e && e.prefixLockHealDeclined === !0;
}
/**
 * 解析 anthropic-thinking-prefix-mismatch 响应头为 {block:{messageIndex,blockIndex}, kind}。
 */
//@ chunk-e6aww6q8.js:1592572-1593149 layout
function parseThinkingPrefixMismatchHeader(e) {
  if (!(e instanceof Ot)) return;
  let n;
  try {
    n = e.headers?.get?.("anthropic-thinking-prefix-mismatch");
  } catch {
    return;
  }
  if (typeof n !== "string" || n.length === 0 || n.length > 2048) return;
  let r = new Map();
  for (let S of n.split(";")) {
    let index = S.indexOf("=");
    if (index <= 0) continue;
    let trimmed = S.slice(0, index).trim();
    if (!r.has(trimmed)) r.set(trimmed, S.slice(index + 1).trim());
  }
  let match = /^messages\.(\d{1,6})\.content\.(\d{1,6})$/.exec(r.get("block") ?? ""),
    h = r.get("kind"),
    y = h !== void 0 && /^[a-z_]{1,40}$/.test(h) ? h : void 0;
  if (!match && y === void 0) return;
  return {
    block: match ? { messageIndex: Number(match[1]), blockIndex: Number(match[2]) } : void 0,
    kind: y,
  };
}
/**
 * 400 thinking 块签名无效（触发 retry:thinking-signature-strip）。
 */
//@ chunk-e6aww6q8.js:1593149-1593269 layout
function isInvalidThinkingSignatureError(e) {
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  return isThinkingSignatureError(e.message) || includesWholeWord(e.message, "thinking_signature");
}
/**
 * 400 拒绝的 thinking 类型（enabled/adaptive）。
 */
//@ chunk-e6aww6q8.js:1593269-1593498 layout
function getRejectedThinkingType(e) {
  if (!(e instanceof Ot) || e.status !== 400) return null;
  let n = rejectedThinkingType(e.message);
  if (n) return n;
  if (includesWholeWord(e.message, "thinking_type:enabled")) return "enabled";
  if (includesWholeWord(e.message, "thinking_type:adaptive")) return "adaptive";
  return null;
}
/**
 * 400 "effort 'x' is not supported when thinking is disabled" 中的 effort。
 */
//@ chunk-e6aww6q8.js:1593498-1593661 layout
function getEffortRejectedWithoutThinking(e) {
  if (!(e instanceof Ot) || e.status !== 400) return null;
  return /effort '([a-z]+)' is not supported when thinking is disabled/i.exec(e.message)?.[1] ?? null;
}
/**
 * getAssistantMessageFromError 的包装：补 apiErrorStatus、requestId、apiErrorCode 与额外标注。
 */
//@ chunk-e6aww6q8.js:1593661-1594198 layout
function getAssistantMessageFromApiError(e, n, r) {
  let s = getAssistantMessageFromError(e, n, r);
  if (e instanceof Ot) {
    let L = adt(e) ? e.status : effectiveErrorStatus(e);
    if (L !== void 0) s.apiErrorStatus = L;
  } else if (e instanceof Error && e.cause instanceof Ot) {
    let L = effectiveErrorStatus(e.cause);
    if (L !== void 0) s.apiErrorStatus = L;
  }
  let h = e instanceof Ot ? e : e instanceof Error && e.cause instanceof Ot ? e.cause : void 0,
    y = r?.requestId || (h ? rqe(h.requestID || h.error?.request_id, h.headers) : void 0);
  if (y) s.requestId = y;
  let S = Loo(h);
  if (S !== void 0) s.apiErrorCode = S;
  let w = classifyFirstPartyRequest(h, {
    model: n,
    text: `${getAssistantMessageText(s) ?? ""}
${s.errorDetails ?? ""}`,
  });
  if (w !== void 0) s[MESSAGE_MARK_SYMBOLS] = w;
  return s;
}
/**
 * 交互模式下附加 " Run /rewind to recover the conversation."。
 */
//@ chunk-e6aww6q8.js:1594198-1594272 layout
function getRewindHint() {
  return getIsNonInteractiveSession() ? "" : " Run /rewind to recover the conversation.";
}
/**
 * 把任意 API 异常转成 assistant 错误消息（Fs）：超时、图片/PDF、DLP、off-switch、额度与用量信用、1M 上下文需信用、提示词过长（可压缩时提示 /compact）、媒体、effort 与 thinking 冲突、工具配对错误、Opus 不可用、余额不足、各类认证（API key、OAuth 吊销、组织禁用、云凭证、网关）、模型不存在等，error 字段取 server_error/invalid_request/rate_limit/billing_error/authentication_failed/model_not_found/… 。
 */
//@ chunk-e6aww6q8.js:1594272-1610377 callgraph-witnessed = getAssistantMessageFromError (0.242)
function getAssistantMessageFromError(error, model, options) {
  if (isTimeoutError(error))
    return createApiErrorMessage({ content: REQUEST_TIMED_OUT_MESSAGE, error: "server_error" });
  if (error instanceof ImageSizeError || error instanceof ImageResizeError)
    return createApiErrorMessage({
      content: getImageTooLargeErrorMessage(),
      error: "invalid_request",
      errorDetails: error.message,
    });
  if (adt(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "invalid_request",
      apiError: DLP_REQUEST_DENIED,
    });
  if (Doo(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "invalid_request",
      apiError: CLAUDE_CODE_VERSION_TOO_OLD,
    });
  let s = error instanceof Ot ? parseVerificationRequired(error.status, error.error) : void 0;
  if (s !== void 0)
    return (
      logVerificationShown(s),
      createApiErrorMessage({ error: "verification_required", content: `${API_ERROR_MESSAGE_PREFIX}: ${s}` })
    );
  if (error instanceof Error && error.message.includes(OPUS_HIGH_LOAD_MESSAGE))
    return createApiErrorMessage({
      content: isArtifactMountMode() ? OPUS_HIGH_LOAD_SHORT_MESSAGE : OPUS_HIGH_LOAD_MESSAGE,
      error: "rate_limit",
    });
  if (error instanceof Error && error.message.includes(FABLE_HIGH_LOAD_MESSAGE))
    return createApiErrorMessage({
      content: isArtifactMountMode() ? FABLE_HIGH_LOAD_SHORT_MESSAGE : FABLE_HIGH_LOAD_MESSAGE,
      error: "rate_limit",
    });
  if (error instanceof Ot && error.status === 429) {
    let L = yhn(isClaudeAISubscriber()),
      G = extractQuotaStatusFromErrorHeaders(error),
      q = creditsRequiredDetails(error),
      Z =
        L &&
        isUsageCreditsOnlyModel(model) &&
        !isLongContextCreditsRequired(error.message) &&
        (G?.rateLimitType === "seven_day_overage_included" || q.errorCode === "credits_required");
    if (L && G && !Z) {
      let specificErrorMessage = getRateLimitErrorMessage(G, model);
      if (specificErrorMessage)
        return createApiErrorMessage({
          content: specificErrorMessage,
          error: "rate_limit",
          ...(isRateLimitErrorMessage(specificErrorMessage) && {
            apiError: "usage_limit_reached",
            apiErrorParams: { rate_limit_info: formatOrgSpendCapError(G) },
          }),
          quotaLimits: applyMockHeaders(error),
        });
      return createApiErrorMessage({ content: NO_RESPONSE_REQUESTED, error: "rate_limit" });
    }
    if (L && isLongContextCreditsRequired(error.message) && !isLongContext1mCreditsBlocked())
      (setLongContext1mCreditsBlocked(!0),
        logEvent("tengu_1m_credits_clamp_activated", {}),
        logFeatureSad("context_1m_entitlement", "credits_clamp_200k"));
    if (Z) {
      let Me =
          error.headers?.get?.("anthropic-ratelimit-unified-overage-disabled-reason") ??
          q.overageDisabledReason,
        We = Me ?? getGlobalConfig().cachedExtraUsageDisabledReason,
        ze = G?.rateLimitType === "seven_day_overage_included";
      if (!ze && G?.rateLimitType === void 0 && Me !== "fetch_error" && Me !== "unknown")
        setUsageCreditsRequired(!0);
      return createApiErrorMessage({
        content: getUsageCreditsRequiredMessage(
          We,
          ze,
          renderUsageCreditsOnlyModelName(model),
          G?.overageScope,
        ),
        error: "rate_limit",
        apiError: "model_requires_usage_credits",
        apiErrorParams: {
          rate_limit_info: formatOrgSpendCapError({
            status: "rejected",
            unifiedRateLimitFallbackAvailable: !1,
            isUsingOverage: !1,
            ...q,
            ...G,
          }),
        },
        errorDetails: error.message,
      });
    }
    if (L && isLongContextCreditsRequired(error.message)) {
      let Me = getModelSwitchHint(),
        We = getUsageCreditsCommand(),
        ze = getIsNonInteractiveSession()
          ? "they take effect in a new session"
          : "they take effect after you restart Claude Code",
        lt =
          canSuggestSlashCommands() && We
            ? `run ${We} to turn them on (${ze})${Me ? `, or ${Me} to switch to standard context` : ""}`
            : canSuggestSlashCommands() && Me
              ? `run ${Me} to switch to standard context`
              : `${getTurnOnUsageCreditsStep()} (${ze})${Me ? `, or use ${Me} to switch to standard context` : ""}`;
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: Usage credits required for 1M context \xB7 ${lt}`,
        error: "rate_limit",
        apiError: "long_context_credits_required",
        errorDetails: error.message,
      });
    }
    let stripped = error.message.replace(/^429\s+/, ""),
      ke,
      we;
    try {
      let Me = jsonParse(stripped),
        We = Me?.error?.message ?? Me?.message;
      if (typeof We === "string") ke = We;
    } catch {
      let Me = sanitizeAPIError(error);
      if (Me !== error.message) we = Me.replace(/^429(\s+|$)/, "");
    }
    let Ee = we ?? (ke || stripped);
    if (L && error.headers?.get?.("anthropic-ratelimit-unified-overage-disabled-reason")) {
      let Me = `${API_ERROR_MESSAGE_PREFIX}: Request rejected (429)${we ? ` \xB7 ${we}` : ""}`;
      return createApiErrorMessage({ content: we === void 0 ? Ee : Me, error: "rate_limit" });
    }
    let Ae = L ? SERVER_RATE_LIMITED_MESSAGE : "Request rejected (429)",
      baseMessage = `this may be a temporary capacity issue.${getStatusPageHint()}`;
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${Ae} \xB7 ${Ee || baseMessage}`,
      error: "rate_limit",
      apiErrorIsTransient: L,
    });
  }
  if (isPromptTooLongError(error) || isMaxTokensContextOverflow(error))
    return createApiErrorMessage({
      content: PROMPT_TOO_LONG_ERROR_MESSAGE,
      error: "invalid_request",
      errorDetails: error.message,
    });
  if (isPdfPageLimitError(error))
    return createApiErrorMessage({
      content: getPdfTooLargeErrorMessage(),
      error: "invalid_request",
      apiError: "pdf_too_large",
      errorDetails: error.message,
    });
  if (isPdfPasswordProtectedError(error))
    return createApiErrorMessage({
      content: getPdfPasswordProtectedErrorMessage(),
      error: "invalid_request",
      apiError: "pdf_password_protected",
      errorDetails: error.message,
    });
  if (error instanceof Error && error.message.includes("The PDF specified was not valid"))
    return createApiErrorMessage({
      content: getPdfInvalidErrorMessage(),
      error: "invalid_request",
      errorDetails: error.message,
    });
  if (isImageTooLargeError(error))
    return createApiErrorMessage({
      content: getImageTooLargeErrorMessage(),
      error: "invalid_request",
      errorDetails: error.message,
    });
  if (isManyImageDimensionError(error))
    return createApiErrorMessage({
      content:
        canSuggestSlashCommands() && !isEnvTruthy(process.env.DISABLE_COMPACT)
          ? "An image in the conversation exceeds the dimension limit for many-image requests (2000px). Run /compact to remove old images from context, or start a new session."
          : "An image in the conversation exceeds the dimension limit for many-image requests (2000px). Start a new session with fewer images.",
      error: "invalid_request",
      errorDetails: error.message,
    });
  {
    let L = getEffortRejectedWithoutThinking(error);
    if (L !== null && error instanceof Error) {
      let G = isArtifactMountMode()
          ? "you can lower effort to High"
          : getIsNonInteractiveSession()
            ? "use --effort high (or the effortLevel setting)"
            : "run /effort high to continue",
        q = shouldEnableThinkingByDefault();
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: Effort '${L}' isn't available with thinking turned off on this model \xB7 ${G}, or turn thinking back on (${q === "MAX_THINKING_TOKENS" ? "unset MAX_THINKING_TOKENS=0" : q === "alwaysThinkingEnabled" ? 'remove "alwaysThinkingEnabled": false from settings' : "start the session without thinking disabled"})`,
        error: "invalid_request",
        apiError: "effort_requires_thinking",
        apiErrorParams: { effort: L },
        errorDetails: error.message,
      });
    }
  }
  if (isAdvisorModelMismatchError(error)) {
    let L = getIsNonInteractiveSession()
      ? "change or unset the advisorModel setting (or the --advisor flag)"
      : "run /advisor to change or disable the advisor";
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message.replace(/^400\s+/, "")} \xB7 The configured advisor model is not compatible with this request model \u2014 ${L}`,
      error: "invalid_request",
      apiError: "advisor_incompatible",
      errorDetails: error.message,
    });
  }
  {
    let L = getMediaErrorFromApiError(error);
    if (L && error instanceof Error)
      return createApiErrorMessage({
        ...buildMediaRemovedError(L.kind, error.message),
        error: "invalid_request",
        errorDetails: error.message,
      });
  }
  if (isAfkModeBetaRejected(error))
    return createApiErrorMessage({
      content: "Auto mode is unavailable for your plan",
      error: "invalid_request",
    });
  if (isRequestTooLargeError(error)) {
    if (pqr(error.message) || includesWholeWord(error.message, "prompt_too_long"))
      return createApiErrorMessage({
        content: PROMPT_TOO_LONG_ERROR_MESSAGE,
        error: "invalid_request",
        errorDetails: error.message,
      });
    if (Avt(error.error) && options?.messagesForAPI && isOfficialFirstPartyEndpoint()) {
      let G = measureRejectedConversation({ messagesForAPI: options.messagesForAPI });
      if (G?.kind === "unrecoverable")
        return createApiErrorMessage({
          content: formatRequestTooLarge(G),
          error: "invalid_request",
          errorDetails: requestTooLargeDebug(G),
        });
      if (G?.kind === "strippable_media")
        return createApiErrorMessage({
          content: formatRequestTooLargeMedia(G),
          error: "invalid_request",
          errorDetails: `request_too_large: ${error.message}`,
        });
    }
    return createApiErrorMessage({
      content: Sue(),
      error: "invalid_request",
      errorDetails: `request_too_large: ${error.message}`,
    });
  }
  if (isInputTooLongError(error)) {
    if (options?.messagesForAPI && mediaBytesInMessages(options.messagesForAPI) === 0)
      return createApiErrorMessage({
        content: PROMPT_TOO_LONG_ERROR_MESSAGE,
        error: "invalid_request",
        errorDetails: error.message,
      });
    return createApiErrorMessage({
      content: Ivt(),
      error: "invalid_request",
      errorDetails: `request_too_large: ${error.message}`,
    });
  }
  if (isToolUseWithoutResultError(error)) {
    if (options?.messages && options?.messagesForAPI) {
      let match = error.message.match(/toolu_[A-Za-z0-9_]+/),
        G = match ? match[0] : null;
      if (G) logToolUseToolResultMismatch(G, options.messages, options.messagesForAPI);
    }
    return createApiErrorMessage({
      content: `API Error: 400 due to tool use concurrency issues.${getRewindHint()}`,
      error: "invalid_request",
      apiError: "tool_history_mismatch",
    });
  }
  if (isUnexpectedToolResultError(error))
    return (
      logEvent("tengu_unexpected_tool_result", {}),
      createApiErrorMessage({
        content: `API Error: 400 orphaned tool_result in conversation history.${getRewindHint()}`,
        error: "invalid_request",
        apiError: "tool_history_mismatch",
        errorDetails: error.message,
      })
    );
  if (isDuplicateToolUseIdError(error))
    return (
      logEvent("tengu_duplicate_tool_use_id", {}),
      createApiErrorMessage({
        content: `API Error: 400 duplicate tool_use ID in conversation history.${getRewindHint()}`,
        error: "invalid_request",
        apiError: "tool_history_mismatch",
        errorDetails: error.message,
      })
    );
  if (
    isClaudeAISubscriber() &&
    isInvalidModelNameError(error) &&
    (isNonCustomOpusModel(getCanonicalName(model)) || model === "opus")
  )
    return createApiErrorMessage({
      content: `Claude Opus is not available with the Claude Pro plan. If you have updated your subscription plan recently, ${isArtifactMountMode() ? "sign out and sign in again" : "run /logout and /login"} for the plan to take effect.`,
      error: "invalid_request",
    });
  if (isCreditBalanceTooLow(error))
    return createApiErrorMessage({ content: CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE, error: "billing_error" });
  if (error instanceof Ot && error.status === 400 && isOrganizationDisabled(error)) {
    let { source: source } = getAnthropicApiKeyWithSource();
    if (source === "ANTHROPIC_API_KEY" && env.ANTHROPIC_API_KEY && !isClaudeAISubscriber()) {
      let G = hasStoredOAuthToken();
      return createApiErrorMessage({
        error: "invalid_request",
        apiError: "org_disabled_credential",
        content: G ? DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE : DISABLED_ORG_API_KEY_MESSAGE,
      });
    }
  }
  if (
    error instanceof Ot &&
    (error.status === 401 || error.status === 403) &&
    getAPIProvider() === "firstParty" &&
    isApiKeyHelperTheActiveCredential()
  ) {
    if (getApiKeyHelperLastFailure())
      return createApiErrorMessage({ error: "invalid_request", content: API_KEY_HELPER_FAILING_MESSAGE });
  }
  if (error instanceof InvalidRequestHeaderValueError) {
    if (error.source === "/login managed key" || error.source === "claude.ai")
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "invalid_credential_header",
        content: getNotLoggedInMessage(),
      });
    let L = INVALID_AUTH_TOKEN_MESSAGE;
    if (error.source === "ANTHROPIC_CUSTOM_HEADERS") L = INVALID_CUSTOM_HEADERS_MESSAGE;
    else if (!error.isUserSupplied) L = API_ERROR_MESSAGE_PREFIX;
    else if (error.header === "other") L = INVALID_ENV_HEADER_MESSAGE;
    else if (error.header === "X-Api-Key") L = INVALID_API_KEY_MESSAGE;
    return createApiErrorMessage({
      error: "invalid_request",
      apiError: error.isUserSupplied && error.header !== "other" ? "invalid_credential_header" : void 0,
      content: `${L} \xB7 ${error.message}`,
    });
  }
  if (isApiKeyHeaderError(error)) {
    if (isRemoteSession())
      return createApiErrorMessage({ error: "authentication_failed", content: AUTH_NETWORK_ERROR_MESSAGE });
    if (getAPIProvider() === "gateway")
      return createApiErrorMessage({
        error: "invalid_request",
        content: GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
      });
    if (j8n()) return createApiErrorMessage({ error: "invalid_request", content: noGatewayErrorMessage() });
    let { source: source } = getAnthropicApiKeyWithSource();
    return createApiErrorMessage({
      error: "authentication_failed",
      content:
        source === "ANTHROPIC_API_KEY" || source === "apiKeyHelper"
          ? INVALID_API_KEY_MESSAGE
          : getNotLoggedInMessage(),
    });
  }
  if (error instanceof OAuthRefreshDeadError)
    return createApiErrorMessage({
      error: "authentication_failed",
      content: getIsNonInteractiveSession()
        ? "Failed to authenticate: OAuth session expired and could not be refreshed"
        : LOGIN_EXPIRED_MESSAGE,
    });
  if (error instanceof OAuthRefreshLockTimeoutError)
    return createApiErrorMessage({
      error: "server_error",
      content: getIsNonInteractiveSession()
        ? "Failed to refresh OAuth token: another Claude Code process is refreshing it or exited mid-refresh. This is usually transient; retry in a minute, and if it persists close other Claude Code processes or sign in again"
        : OAUTH_REFRESH_LOCK_TIMEOUT_MESSAGE,
    });
  if (error instanceof OAuthRefreshDiskFullError)
    return {
      ...createApiErrorMessage({
        error: "invalid_request",
        content: getIsNonInteractiveSession()
          ? "Failed to refresh OAuth token: the disk that holds the Claude Code config directory (~/.claude by default), or your disk quota on it, is full. Delete files you no longer need on that disk and retry; signing in again won't help"
          : OAUTH_REFRESH_DISK_FULL_MESSAGE,
      }),
      oauthRefreshDiskFull: !0,
    };
  if (error instanceof StoredLoginHeldBackError)
    return createApiErrorMessage({
      error: "invalid_request",
      apiError: "stored_login_refused",
      content: error.message,
    });
  let h = error instanceof OAuthAccountOnHoldError ? error : getWIFAccountOnHold(error);
  if (h) return createApiErrorMessage({ error: "account_on_hold", content: jgs(h.url) });
  if (isWIFUserOAuthDeadError(error))
    return createApiErrorMessage({
      error: "invalid_request",
      content: wouldWIFProfileYieldToClaudeAILogin()
        ? LOGIN_OR_PROFILE_EXPIRED_MESSAGE
        : ANTHROPIC_PROFILE_LOGIN_EXPIRED_MESSAGE,
    });
  if (isOAuthTokenRevokedError(error))
    return createApiErrorMessage({ error: "authentication_failed", content: getTokenRevokedMessage() });
  if (isOAuthOrgNotAllowedError(error))
    return createApiErrorMessage({
      error: "oauth_org_not_allowed",
      content: getSubscriptionUnavailableMessage(),
    });
  if (
    error instanceof Ot &&
    error.status === 403 &&
    error.message.toLowerCase().includes("api key authentication is disabled")
  ) {
    let { source: source } = getAnthropicApiKeyWithSource();
    if (source === "ANTHROPIC_API_KEY" && env.ANTHROPIC_API_KEY)
      return createApiErrorMessage({
        error: "invalid_request",
        apiError: "api_key_auth_disabled",
        content: hasStoredOAuthToken()
          ? API_KEY_AUTH_DISABLED_UNSET_ENV_MESSAGE
          : API_KEY_AUTH_DISABLED_UNSET_ENV_LOGIN_MESSAGE,
      });
    if (source === "apiKeyHelper")
      return createApiErrorMessage({
        error: "invalid_request",
        apiError: "api_key_auth_disabled",
        content: API_KEY_AUTH_DISABLED_UNSET_HELPER_MESSAGE,
      });
    if (source === "/login managed key")
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "api_key_auth_disabled",
        content: isArtifactMountMode()
          ? API_KEY_AUTH_DISABLED_SIGN_IN_MESSAGE
          : API_KEY_AUTH_DISABLED_LOGIN_MESSAGE,
      });
  }
  if (error instanceof Ot && (error.status === 401 || error.status === 403)) {
    if (isRemoteSession()) {
      let q = error.status === 403 ? extractNestedErrorMessage(error) : null,
        Z = `${error.status} `,
        baseMsg = `${API_ERROR_MESSAGE_PREFIX}: ${Z}`,
        ke = q && printableName(q, API_ERROR_CONST_1000 - baseMsg.length - 1);
      return createApiErrorMessage({
        error: "authentication_failed",
        content: ke ? baseMsg + (ke.startsWith(Z) ? ke.slice(Z.length) : ke) : AUTH_NETWORK_ERROR_MESSAGE,
      });
    }
    let L = formatAPIError(error),
      G = getAPIProvider();
    if (G === "bedrock" || G === "anthropicAws" || G === "mantle") {
      let q =
          !isAwsAuthRefreshFromProjectSettings() || isProjectScopeTrustAccepted()
            ? getConfiguredAwsAuthRefresh()
            : void 0,
        Z = getProviderForModel(model),
        Se = error.status === 401 && (Z === "anthropicAws" || Z === "mantle"),
        ke = Se ? AWS_CREDENTIALS_INVALID : AWS_AUTH_FAILED,
        we = isBedrockModelIdError(error),
        Ee,
        Ae;
      if (we) {
        let Me = getModelSwitchHint();
        ((Ee = ` \xB7 enable this model for your account and region in the Amazon Bedrock console${Me ? `, or run ${Me} to pick another model` : ""}`),
          (Ae = "model_access"));
      } else if (isHostManagedProviderAuth()) ((Ee = MANAGED_CREDENTIALS_SUFFIX), (Ae = "host_managed"));
      else if (q)
        ((Ee = getIsNonInteractiveSession()
          ? ` \xB7 run \`${q}\` and retry`
          : ` \xB7 run /login and select "${THIRD_PARTY_PROVIDER_LABELS.anthropicAws} \xB7 refresh credentials", or run \`${q}\` in another terminal`),
          (Ae = "refresh_command"));
      else
        ((Ee =
          " \xB7 refresh your AWS credentials (SSO sign-in, access keys, API key or proxy token) and retry"),
          (Ae = "refresh_credentials"));
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: { provider: Z === "mantle" ? "mantle" : G, remedy: Ae },
        content: `${ke}${Ee}${Se || we ? "" : " \xB7 if credentials are current, check AWS permissions and model access"} \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (G === "anthropicGoogleCloud" || G === "vertex") {
      let Z =
          !(G === "vertex"
            ? env.CLAUDE_CODE_SKIP_VERTEX_AUTH
            : env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH) && !isHostManagedProviderAuth(),
        Se =
          Z && (!isGcpAuthRefreshFromProjectSettings() || isProjectScopeTrustAccepted())
            ? getConfiguredGcpAuthRefresh()
            : void 0,
        ke = error.status === 401,
        we = ke ? GCP_CREDENTIALS_INVALID : GCP_AUTH_FAILED,
        Ee,
        Ae;
      if (Se) ((Ee = ` \xB7 run \`${Se}\` and retry`), (Ae = "refresh_command"));
      else if (Z)
        ((Ee =
          " \xB7 refresh your Google Cloud credentials (application default sign-in, or the key file in GOOGLE_APPLICATION_CREDENTIALS) and retry"),
          (Ae = "adc"));
      else if (isHostManagedProviderAuth()) ((Ee = MANAGED_CREDENTIALS_SUFFIX), (Ae = "host_managed"));
      else
        ((Ee =
          " \xB7 refresh the gateway token provided via ANTHROPIC_AUTH_TOKEN/ANTHROPIC_CUSTOM_HEADERS and retry"),
          (Ae = "gateway_token"));
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: { provider: G, remedy: Ae },
        content: `${we}${Ee}${ke ? "" : G === "vertex" ? " \xB7 if credentials are current, check GCP IAM permissions and Vertex AI model access" : " \xB7 if credentials are current, check GCP IAM permissions and workspace access"} \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (G === "foundry") {
      let q = isHostManagedProviderAuth();
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: { provider: G, remedy: q ? "host_managed" : "refresh_credentials" },
        content: `${FOUNDRY_AUTH_FAILED}${q ? MANAGED_CREDENTIALS_SUFFIX : " \xB7 refresh your Foundry credential (ANTHROPIC_FOUNDRY_AUTH_TOKEN, ANTHROPIC_FOUNDRY_API_KEY, Azure sign-in for Entra, or your proxy token) and retry"} \xB7 if credentials are current, check access to the Foundry resource \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (G === "gateway" && error.status === 403)
      return createApiErrorMessage({
        error: "authentication_failed",
        content: `${GATEWAY_REFUSED} \xB7 signing in again won't change this \u2014 check with your gateway administrator \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    return createApiErrorMessage({
      error: "authentication_failed",
      content: getIsNonInteractiveSession()
        ? `Failed to authenticate. ${API_ERROR_MESSAGE_PREFIX}: ${L}`
        : `Please run /login \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
    });
  }
  if (isBedrockModelIdError(error)) {
    let L = getModelSwitchHint(),
      fallbackSuggestion = suggestThirdPartyModel(model);
    return createApiErrorMessage({
      content: fallbackSuggestion
        ? `${API_ERROR_MESSAGE_PREFIX} (${model}): ${error.message}.${L ? ` Try ${L} to switch to ${fallbackSuggestion}.` : ` Try switching to ${fallbackSuggestion}.`}`
        : `${API_ERROR_MESSAGE_PREFIX} (${model}): ${error.message}.${L ? ` Run ${L} to pick a different model.` : ""}`,
      error: "model_not_found",
    });
  }
  if (error instanceof Ot && error.status === 404) {
    let L = getModelSwitchHint(),
      G = suggestThirdPartyModel(model);
    return createApiErrorMessage({
      content: G
        ? `The model ${model} is not available on your ${getAPIProvider()} deployment. ${L ? `Try ${L} to switch to ${G}` : `Try switching to ${G}`}, or ask your admin to enable this model.`
        : `There's an issue with the selected model (${model}). It may not exist or you may not have access to it.${L ? ` Run ${L} to pick a different model.` : ""}`,
      error: "model_not_found",
    });
  }
  let y = getStatusPageHint();
  if (isRepeated529Error(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${REPEATED_529_MESSAGE}. The API is at capacity \u2014 this is usually temporary. Try again in a moment.${y}`,
      error: "server_error",
    });
  if (error instanceof Ot && typeof error.status === "number" && error.status >= 500) {
    let replaced = formatAPIError(error).replace(/[.!?\u2026]+$/, "");
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${replaced}. This is a server-side issue, usually temporary \u2014 try again in a moment.${y}`,
      error: "server_error",
    });
  }
  let S = getCloudCredentialErrorProvider(error);
  if (S !== null) {
    let replaced = (error instanceof Ot ? formatAPIError(error) : errorMessage(error))
      .trimEnd()
      .replace(/[.!?\u2026]+$/, "");
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: Could not load ${S} credentials \xB7 ${replaced}. Check or refresh your ${S} credentials and try again.`,
      error: "cloud_credential_error",
      apiErrorIsTransient: !0,
    });
  }
  if (error instanceof ef) {
    let L = Yxn(error);
    if (L) {
      let { escalated: escalated, firstWindowMs: firstWindowMs, retryWindowMs: retryWindowMs } = L.deadline,
        Ae = escalated
          ? `waited ${formatDurationCoarse(firstWindowMs)}, then ${formatDurationCoarse(retryWindowMs)} on the retry`
          : `waited ${formatDurationCoarse(firstWindowMs)}`;
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)} (${Ae})${isDisklessProcess() ? "" : ". If a proxy or gateway on your network holds responses until they complete, raise API_TIMEOUT_MS or CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS to wait longer."}`,
        error: "server_error",
        apiError: "no_response",
      });
    }
    let G = extractConnectionErrorDetails(error)?.code ?? "",
      q;
    if (EAi.has(G)) q = "tls_untrusted_ca";
    else if (G === "BedrockUnexpectedContentType") q = "gateway_content_type";
    else if (isStreamSuspendedError(error)) q = isDisklessProcess() ? void 0 : "computer_slept";
    else if (isConnectionError(error)) q = "connection_failed";
    let fallbackSuggestion = formatAPIError(error),
      Se = "";
    if (
      fallbackSuggestion === `${CONNECTION_DROPPED_MESSAGE} (${G})` &&
      !isRemoteSession() &&
      getAPIProvider() === "firstParty" &&
      env.ANTHROPIC_UNIX_SOCKET === void 0
    ) {
      let ke = getProxyUrlWithSource(),
        we = [
          ...(ke && !shouldBypassProxy_2(getApiBaseUrl()) ? [`the proxy set in ${ke.source}`] : []),
          ...(configuredApiProxyHost() !== void 0 ? ["the gateway set in ANTHROPIC_BASE_URL"] : []),
        ];
      Se =
        we.length > 0
          ? `. Check ${we.join(" and ")}, then try again.`
          : ". A VPN, firewall, or security software can cause this. Check those or switch networks, then try again.";
    }
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${fallbackSuggestion}${Se}`,
      error: "server_error",
      apiError: q,
    });
  }
  if (error instanceof Ot)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "unknown",
    });
  let w = extractConnectionErrorDetails(error);
  if (w && (LK.has(w.code) || PU.has(w.code)))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: Connection to the API was lost (${w.code}). This is usually temporary \u2014 try again.`,
      error: "server_error",
      apiError:
        isStreamSuspendedError(error) && !isDisklessProcess()
          ? "computer_slept"
          : isConnectionError(error)
            ? "connection_failed"
            : void 0,
    });
  if (error instanceof FoundryCapabilityError)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
      apiError: error.reason === "signin_required" ? "gateway_signin_required" : "gateway_session_expired",
      ...(error.reason === "token_expired" && {
        apiErrorParams: { provider: "gateway", remedy: "gateway_token" },
      }),
    });
  if (error instanceof HostManagedNoCredsError) {
    let L = getProviderForModel(model);
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
      ...(L !== "firstParty" && {
        apiError: "provider_credentials",
        apiErrorParams: { provider: L, remedy: "host_managed" },
      }),
    });
  }
  if (error instanceof Error)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
    });
  return createApiErrorMessage({ content: API_ERROR_MESSAGE_PREFIX, error: "unknown" });
}
/**
 * 交互或允许斜杠命令时可提示 /compact 等。
 */
//@ chunk-e6aww6q8.js:1610377-1610419 layout
function canSuggestSlashCommands() {
  return (!getIsNonInteractiveSession() || isArtifactMountMode()) && !getDisableSlashCommands();
}
/**
 * 413 request_too_large 时尝试测量被拒会话大小，失败记日志。
 */
//@ chunk-e6aww6q8.js:1610419-1610598 layout
function measureRejectedConversation(e) {
  try {
    return measureRejectedRequest(e);
  } catch (error) {
    logForDebugging(
      `413 request_too_large: could not measure the rejected conversation (${errorMessage(error)}); keeping the generic handling`,
      { level: "error" },
    );
    return;
  }
}
/**
 * 换模型提示用 /model 或 --model（SDK/GitHub Action 场景）。
 */
//@ chunk-e6aww6q8.js:1610598-1610765 layout
function getModelSwitchHint() {
  if (!getIsNonInteractiveSession()) return getDisableSlashCommands() ? void 0 : "/model";
  let e = getEntrypointKind();
  if (e === "sdk-cli" || e === "claude-code-github-action") return "--model";
  if (isHostEntrypoint() && !isArtifactMountMode()) return "--model";
  return;
}
/**
 * "Not sent: no API attempts left"：本轮 API 尝试预算耗尽。
 */
//@ chunk-e6aww6q8.js:1610765-1610844 layout
class NoApiAttemptsLeftError extends Error {
  constructor() {
    super("Not sent: no API attempts left");
  }
}
/**
 * 遥测用 API 错误分类：aborted/api_timeout/repeated_529/rate_limit/server_overload/prompt_too_long/pdf_*\/image_*\/tool_use_mismatch/invalid_model/credit_balance_low/invalid_api_key/token_revoked/auth_error/ssl_cert_error/connection_error/unknown 等约 60 类。
 */
//@ chunk-e6aww6q8.js:1610844-1615671 fingerprint = classifyAPIError (0.405)
function classifyAPIError(error) {
  if (error instanceof Error && error.message === "Request was aborted.") return "aborted";
  if (error instanceof NoApiAttemptsLeftError) return "no_api_attempts_left";
  if (error instanceof InvalidRequestHeaderValueError && error.isUserSupplied)
    return error.header === "other" ? "invalid_request_header" : "invalid_api_key";
  if (isTimeoutError(error)) return "api_timeout";
  if (
    error instanceof Error &&
    (error.message.startsWith("Stream idle timeout") || error.name === "StreamIdleTimeoutError")
  )
    return "stream_idle_timeout";
  if (error instanceof StreamNoEventsError) return "stream_no_events";
  if (adt(error)) return DLP_REQUEST_DENIED;
  if (Doo(error)) return CLAUDE_CODE_VERSION_TOO_OLD;
  if (isVerificationRequiredError(error)) return "verification_required";
  if (isRepeated529Error(error)) return "repeated_529";
  if (
    error instanceof Error &&
    (error.message.includes(OPUS_HIGH_LOAD_MESSAGE) || error.message.includes(FABLE_HIGH_LOAD_MESSAGE))
  )
    return "capacity_off_switch";
  if (error instanceof Ot && error.status === 429) return "rate_limit";
  if (is529Error(error)) return "server_overload";
  if (
    error instanceof Error &&
    (error.message.toLowerCase().includes(PROMPT_TOO_LONG_ERROR_MESSAGE.toLowerCase()) ||
      isPromptTooLongError(error) ||
      isMaxTokensContextOverflow(error))
  )
    return "prompt_too_long";
  if (isPdfPageLimitError(error)) return "pdf_too_large";
  if (isPdfPasswordProtectedError(error)) return "pdf_password_protected";
  if (isImageTooLargeError(error)) return "image_too_large";
  if (isManyImageDimensionError(error)) return "image_too_large";
  if (error instanceof Ot && error.status === 400 && error.message.includes("Could not process image"))
    return "image_unprocessable";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    /\btools\.\d+\.(?:custom\.)?input_schema\b/.test(error.message)
  )
    return "tool_schema_invalid";
  if (error instanceof Ot && error.status === 400) {
    if (includesWholeWord(error.message, "image_block")) return "image_unprocessable";
    if (includesWholeWord(error.message, "document_block")) return "document_unprocessable";
    if (includesWholeWord(error.message, "media_budget")) return "media_budget_exceeded";
    if (includesWholeWord(error.message, "thinking_signature")) return "invalid_thinking_signature";
  }
  if (isRequestTooLargeError(error))
    return pqr(error.message) || includesWholeWord(error.message, "prompt_too_long")
      ? "prompt_too_long"
      : "request_too_large";
  if (isInputTooLongError(error)) return "request_too_large";
  if (isToolUseWithoutResultError(error)) return "tool_use_mismatch";
  if (isUnexpectedToolResultError(error)) return "unexpected_tool_result";
  if (isDuplicateToolUseIdError(error)) return "duplicate_tool_use_id";
  if (isInvalidModelNameError(error)) return "invalid_model";
  if (
    error instanceof Ot &&
    error.status === 404 &&
    error.message.includes("not_found_error") &&
    error.message.includes('"model: ')
  )
    return "model_not_found";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    /invalid `?signature`? in `?thinking`? block/i.test(error.message)
  )
    return "invalid_thinking_signature";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    (error.message.includes("text content blocks must be non-empty") ||
      error.message.includes("text content blocks must contain non-whitespace text"))
  )
    return "empty_text_block";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    error.message.includes("diagnostics.previous_message_id")
  )
    return "previous_message_id_invalid";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    error.message.includes(".tool_use_id") &&
    error.message.includes("String should match pattern")
  )
    return "tool_use_id_invalid";
  if (error instanceof Ot && error.status === 400 && error.message.includes("Grammar compilation"))
    return "grammar_compile_error";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    error.message.toLowerCase().includes("request body is not valid json")
  )
    return "request_body_invalid_json";
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes(CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE.toLowerCase())
  )
    return "credit_balance_low";
  if (
    isApiKeyHeaderError(error) ||
    (error instanceof Error && error.message.toLowerCase().includes("not a valid api key for this workspace"))
  )
    return "invalid_api_key";
  if (isOAuthTokenRevokedError(error)) return "token_revoked";
  if (isOAuthOrgNotAllowedError(error)) return "oauth_org_not_allowed";
  if (error instanceof Ot && (error.status === 401 || error.status === 403)) return "auth_error";
  if (isBedrockModelIdError(error)) return "bedrock_model_access";
  if (isRequestTooLargeError_2(error)) return "output_content_filtered";
  if (error instanceof rp) return "wif_credential_error";
  if (getCloudCredentialErrorProvider(error) !== null) return "cloud_credential_error";
  if (error instanceof OAuthRefreshDeadError || error instanceof OAuthAccountOnHoldError) return "auth_error";
  if (error instanceof OAuthRefreshLockTimeoutError) return "oauth_refresh_lock_timeout";
  if (error instanceof OAuthRefreshDiskFullError) return "oauth_refresh_disk_full";
  if (error instanceof StoredLoginHeldBackError) return "stored_login_refused";
  if (
    error instanceof Error &&
    error.message.toLowerCase().includes("domains are not accessible to our user agent")
  )
    return "webfetch_domain_blocked";
  if (error instanceof Error) {
    let lower = error.message.toLowerCase();
    if (isOrganizationDisabled(error)) return "org_disabled";
    if (lower.includes("updated our consumer terms")) return "terms_not_accepted";
    if (
      lower.includes("web search is not enabled for this organization") ||
      /is not enabled for (this|your) organization/.test(lower)
    )
      return "feature_not_enabled_for_org";
    if (/reached your specified[\w\s-]*?usage limits/.test(lower)) return "usage_cap_reached";
  }
  if (getMidConvSystemRejection(error) !== null) return "system_role_misplaced";
  if (isMidConversationSystemRejected(error)) return "system_role_unsupported";
  if (isWebSearchContentRejected(error)) return "web_search_content_rejected";
  if (isCodeExecutionOutputRejected(error)) return "code_execution_output_rejected";
  if (
    error instanceof Ot &&
    error.status === 400 &&
    /`?(thinking|redacted_thinking)`?\s+(or\s+`?redacted_thinking`?\s+)?blocks?\s+.{0,60}cannot be modified/i.test(
      error.message,
    )
  )
    return "thinking_blocks_modified";
  if (error instanceof Ot && error.status === void 0 && error.type) return `in_band_${LJ(error.type)}`;
  if (error instanceof Ot) {
    let status = error.status;
    if (status >= 500) return "server_error";
    if (status >= 400) return "client_error";
  }
  if (error instanceof ef) {
    if (extractConnectionErrorDetails(error)?.isSSLError) return "ssl_cert_error";
    return "connection_error";
  }
  let connectionDetails = extractConnectionErrorDetails(error);
  if (connectionDetails && (LK.has(connectionDetails.code) || PU.has(connectionDetails.code)))
    return "connection_error";
  return "unknown";
}
/**
 * 可重试错误的粗分类：overloaded/rate_limit/authentication_failed/server_error/cloud_credential_error/unknown。
 */
//@ chunk-e6aww6q8.js:1615671-1616007 fingerprint = categorizeRetryableAPIError (0.752)
function categorizeRetryableAPIError(error) {
  if (error.status === 529 || error.message?.includes('"type":"overloaded_error"')) return "overloaded";
  if (error.status === 429) return "rate_limit";
  if (error.status === 401 || error.status === 403) return "authentication_failed";
  if (error.status !== void 0 && error.status >= 408) return "server_error";
  if (error.isCloudCredentialError) return "cloud_credential_error";
  return "unknown";
}
/**
 * stop_reason=refusal 时生成拒答提示消息（安全策略链接、类别说明、换模型提示），记 tengu_refusal_api_response。
 */
//@ chunk-e6aww6q8.js:1616007-1617851 placement
function getRefusalMessage(e, n, r, s, h) {
  if (e !== "refusal") return;
  let y = n?.explanation?.trimEnd() ?? null;
  logEvent("tengu_refusal_api_response", {
    has_explanation: Boolean(y),
    category: n?.category ? fromEnum(normalizeRefusalCategory(n.category)) : void 0,
    request_id: ye(r) || void 0,
    convolute_arcades: AEn(),
    arm_source: fromEnum(getFallbackLatchKind()),
    ...!1,
  });
  let S = s != null && hasRefusalFallbackTarget(s) ? renderModelName(s) : void 0,
    w;
  if (S !== void 0) {
    let ke = getIsNonInteractiveSession(),
      we = ke
        ? "Try rephrasing the request in a new session or change your model."
        : "Double press esc to edit your last message, or try a different model with /model.",
      Ee = formatCyberVerificationRefusal(
        ke ? `Learn more: ${getSafeguardsArticleUrl(s)}` : buildSafeguardsLearnMore(s),
        getSafeguardsArticleUrl(s),
        n,
      ),
      Ae = formatSafeguardLead(S, s, n?.category, " (https://www.anthropic.com/legal/aup)"),
      Ie =
        Ae ??
        (isHardRefusalCategory(n?.category)
          ? `${S}'s safeguards flagged this message (https://www.anthropic.com/legal/aup). ${SAFEGUARD_CATEGORY_LEADS[n.category]}`
          : `${S}'s safeguards flagged this message (https://www.anthropic.com/legal/aup). This sometimes happens with safe, normal conversations.`),
      Me = isDisklessProcess() ? "Claude" : "Claude Code",
      We =
        Ae === void 0
          ? `${Me} can't respond to this message with ${S}.`
          : `${Me} can't respond to your last message with ${S}.`;
    w = `${API_ERROR_MESSAGE_PREFIX}: ${Ie} ${We}

${we}

${Ee}`;
  } else {
    let ke = getIsNonInteractiveSession(),
      we = s != null ? renderModelName(s) : "This model";
    if (n?.category === "cyber" && usesFirstPartyModelIds()) {
      let Ee = formatCyberVerificationRefusal(
        ke || !isFeedbackAllowed()
          ? `Learn more: ${CYBER_SAFEGUARDS_URL}`
          : `Send feedback with /feedback or learn more: ${CYBER_SAFEGUARDS_URL}`,
        CYBER_SAFEGUARDS_URL,
        n,
      );
      w = `${API_ERROR_MESSAGE_PREFIX}: ${we}'s safeguards flagged this message. ${gci} ${Ee}`;
    } else {
      let Ee = s != null ? renderModelName(s) : "Claude",
        Ae =
          ke || !isFeedbackAllowed()
            ? "Learn more: https://www.anthropic.com/legal/aup"
            : "Send feedback with /feedback or learn more: https://www.anthropic.com/legal/aup";
      w = `${API_ERROR_MESSAGE_PREFIX}: ${Ee} can't help with this. Start a new session to continue.

${Ae}`;
    }
  }
  let L = formatRefusalDetails(n?.category),
    G = sanitizeRequestId(r),
    q = sanitizeRequestId(h),
    Z =
      (G !== void 0
        ? `

Request ID: ${G}`
        : "") +
      (q !== void 0
        ? `

Message ID: ${q}`
        : ""),
    Se = createApiErrorMessage({ content: w + L + Z, error: "invalid_request" });
  return (
    (Se.requestId = r ?? void 0),
    (Se.refusedMessageId = q),
    (Se.message.stop_reason = "refusal"),
    (Se.message.stop_details = n ?? null),
    Se
  );
}
/**
 * 需要用量信用/达到消费上限时的文案（Fable 限额、组织/频道/团队预算），SDK 与交互模式不同。
 */
//@ chunk-e6aww6q8.js:1617851-1619647 placement
function getUsageCreditsRequiredMessage(e, n, r, s) {
  let h = n && firstWord(r) === "Fable" ? "You've reached your Fable limit." : `${r} requires usage credits.`,
    y =
      s === "channel"
        ? "You've hit your channel's monthly spend limit."
        : "You've hit your monthly spend limit.";
  if (getIsNonInteractiveSession()) {
    let w = getSubscriptionType(),
      G = w === "team" || w === "enterprise" ? HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE : USAGE_SETTINGS_URL,
      q = isConsumerPlan() ? `, or manage usage credits at ${G},` : "";
    if (s === "group_pool")
      return `You've hit your team's shared budget. Switch to another model${q} to continue.`;
    switch (e) {
      case "out_of_credits":
        return `You're out of usage credits. Switch to another model${q} to continue.`;
      case "org_spend_cap_reached":
      case "org_level_disabled_until":
        return `${y} Switch to another model${q} to continue.`;
      default:
        return `${h} Switch to another model${q} to continue.`;
    }
  }
  let S = isConsumerPlan() && isExtraUsageAllowed();
  if (s === "group_pool")
    return S
      ? `You've hit your team's shared budget. Run /usage-credits to raise it and keep using ${r} or switch models to continue this chat.`
      : "You've hit your team's shared budget. /model to switch models.";
  switch (e) {
    case "out_of_credits":
      return S
        ? `You're out of usage credits. Run /usage-credits to keep using ${r} or /model to switch models.`
        : "You're out of usage credits. /model to switch models.";
    case "org_spend_cap_reached":
    case "org_level_disabled_until":
      return S
        ? `${y} Run /usage-credits to manage your limit and keep using ${r} or switch models to continue this chat.`
        : `${y} /model to switch models.`;
    case "org_level_disabled":
    case "org_service_level_disabled":
    case "seat_tier_level_disabled":
    case "seat_tier_zero_credit_limit":
    case "member_level_disabled":
    case "member_zero_credit_limit":
    case "group_zero_credit_limit":
      return S
        ? `${h} Run /usage-credits to continue or switch models with /model.`
        : `${h} /model to switch models.`;
    default:
      return S
        ? `${h} Run /usage-credits to continue or switch models with /model.`
        : `${h} /model to switch models.`;
  }
}
/**
 * "Usage credits are required for long context"。
 */
//@ chunk-e6aww6q8.js:1619647-1619784 placement
function isLongContextCreditsRequired(e) {
  return (
    e.includes("Extra usage is required for long context") ||
    e.includes("Usage credits are required for long context")
  );
}
/**
 * API 错误消息详情是长上下文需信用。旧版名错配。
 */
//@ chunk-e6aww6q8.js:1619784-1619885 placement = isMediaSizeErrorMessage (1)
function isLongContextCreditsRequiredMessage(msg) {
  return (
    isLongContext1mCreditsBlocked() &&
    msg.isApiErrorMessage === !0 &&
    msg.errorDetails !== void 0 &&
    isLongContextCreditsRequired(msg.errorDetails)
  );
}
/**
 * 只接受 [A-Za-z0-9_-]{1,255}。
 */
//@ chunk-e6aww6q8.js:1619885-1619959 placement
function sanitizeRequestId(e) {
  return e != null && /^[A-Za-z0-9_-]{1,255}$/.test(e) ? e : void 0;
}
//@ chunk-e6aww6q8.js:1619959-1619976 placement
var rWt = 86400000;
/**
 * 判断限流状态是否可自动恢复：已拒绝、有有效重置时间且未在使用超额。
 */
//@ chunk-e6aww6q8.js:1619976-1620114 placement
function isAutoResumableLimit(e) {
  return (
    e.status === "rejected" &&
    e.resetsAt !== void 0 &&
    Number.isFinite(e.resetsAt) &&
    e.isUsingOverage !== !0 &&
    e.overageInUse !== !0
  );
}
//@ chunk-e6aww6q8.js:1620114-1620226 placement
class IntentProvider {
  #e = null;
  get provided() {
    return this.#e !== null;
  }
  provide(e) {
    this.#e = e;
  }
  hasIntent() {
    return this.#e?.() ?? !1;
  }
}
//@ chunk-e6aww6q8.js:1620226-1620253 placement
var Y8n = new HostScoped(() => new IntentProvider());
/**
 * "API Error"；TBe=1000；d$="Prompt is too long"。
 */
//@ chunk-gr2vfhah.js:1029-1081 fingerprint = API_ERROR_MESSAGE_PREFIX (0.667)
var API_ERROR_MESSAGE_PREFIX = "API Error",
  API_ERROR_CONST_1000 = 1000,
  PROMPT_TOO_LONG_ERROR_MESSAGE = "Prompt is too long";
/**
 * assistant API 错误消息的文本以 "Prompt is too long" 开头。
 */
//@ chunk-gr2vfhah.js:1081-1242 callgraph-fingerprint = isPromptTooLongMessage (1)
function isPromptTooLongMessage_2(msg) {
  if (!msg.isApiErrorMessage) return !1;
  let content = msg.message.content;
  if (!Array.isArray(content)) return !1;
  return content.some(
    (block) => block.type === "text" && block.text.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE),
  );
}
//@ chunk-gr2vfhah.js:2086-2183 placement
function d(e) {
  return e instanceof Ot && e.status === 503 && e.headers?.get("x-should-retry") === "false";
}
//@ chunk-gr2vfhah.js:2183-2265 placement
function Ioo(e) {
  return d(e) ? lit("headerless_decline") : lit("headerless_retryable_503");
}
//@ chunk-gr2vfhah.js:2265-2301 placement
function Ooo(e) {
  return d(e) ? 0 : getRetryDelay(1);
}
//@ chunk-gr2vfhah.js:2301-2424 placement
function isRateLimitError(e) {
  if (!(e instanceof Ot)) return !1;
  return e.status === 429 || (e.message?.includes('"type":"rate_limit_error"') ?? !1);
}
//@ chunk-gr2vfhah.js:2424-2506 placement
function Moo(e) {
  return e >= 400 && e < 500 && e !== 401 && e !== 408 && e !== 409 && e !== 429 && e !== 451;
}
//@ chunk-gr2vfhah.js:2506-2535 placement
var DLP_REQUEST_DENIED = "dlp_request_denied";
//@ chunk-gr2vfhah.js:2535-2571 placement
function adt(e) {
  return getApiErrorCode(e) === DLP_REQUEST_DENIED;
}
//@ chunk-gr2vfhah.js:2571-2606 placement
var EXTRA_USAGE_OUT_OF_CREDITS = "extra_usage_out_of_credits";
//@ chunk-gr2vfhah.js:2606-2640 placement
function _Ai(e) {
  return getApiErrorCode(e) === EXTRA_USAGE_OUT_OF_CREDITS;
}
/**
 * 判断错误是否为 400 policy_blocked。
 */
//@ chunk-gr2vfhah.js:2640-2757 placement
function isPolicyBlockedError(e) {
  if (!(e instanceof Ot) || e.status !== 400 || !hasNestedError(e)) return !1;
  return e.error?.error?.type === "policy_blocked";
}
//@ chunk-gr2vfhah.js:2757-2795 placement
var CLAUDE_CODE_VERSION_TOO_OLD = "claude_code_version_too_old";
//@ chunk-gr2vfhah.js:2795-2831 placement
function Doo(e) {
  return getApiErrorCode(e) === CLAUDE_CODE_VERSION_TOO_OLD;
}
//@ chunk-gr2vfhah.js:2831-2996 placement
var VERSION_TOO_OLD_PATTERN =
  /\bClaude Code \S+ (?:does not support this model; version \S+ or newer is required|is older than the minimum version required by your organization's policy)/;
/**
 * 判断错误是否为客户端版本被拒绝（400 且消息匹配版本过旧）。
 */
//@ chunk-gr2vfhah.js:2996-3111 placement
function isClientVersionRejected(e) {
  if (Doo(e)) return !0;
  if (!(e instanceof Ot) || e.status !== 400) return !1;
  return VERSION_TOO_OLD_PATTERN.test(extractNestedErrorMessage(e) ?? e.message);
}
//@ chunk-gr2vfhah.js:3111-3171 placement
var SAFETY_MONITOR_BLOCKED = "safety_monitor_blocked",
  CCS_NO_REQUEST_TOKEN = "ccs_no_request_token";
//@ chunk-gr2vfhah.js:3171-3196 placement
function _3e(e) {
  return !1;
}
//@ chunk-gr2vfhah.js:3196-3221 placement
function U9t(e) {
  return !1;
}
//@ chunk-gr2vfhah.js:3221-3336 placement
function isHipaaFeatureError(e) {
  return (
    isInvalidRequestStartingWith(e, "The requested features are not available for HIPAA-") &&
    e.status === 400 &&
    getApiErrorCode(e) === void 0
  );
}
//@ chunk-gr2vfhah.js:3336-3506 placement
function isInvalidRequestStartingWith(e, t) {
  if (!(e instanceof Ot) || !hasNestedError(e)) return !1;
  let s = e.error?.error;
  return s?.type === "invalid_request_error" && typeof s.message === "string" && s.message.startsWith(t);
}
/**
 * 判断错误消息是否为“提示词过长”（prompt is too long / input is too long for requested model）。
 */
//@ chunk-s61vbvea.js:54508-54639 placement = detectPromptTooLong (0.667)
function isPromptTooLongMessage(message) {
  let lower = message.toLowerCase();
  return lower.includes("prompt is too long") || lower.includes("input is too long for requested model");
}
/**
 * stop_reason 为 refusal。
 */
//@ chunk-s61vbvea.js:59778-59820 fingerprint = getErrorMessageIfRefusal (0.333)
function getErrorMessageIfRefusal(e) {
  return parseAdvisorResult(e) === "refusal";
}
/**
 * 给请求 promise 挂超时：到时用 RequestTimeout 错误中止控制器，完成后清计时器。旧版名 API_TIMEOUT_ERROR_MESSAGE 为错配；疑似第三方/其他 HTTP 客户端代码。
 */
//@ chunk-8t8n4kdh.js:79910-80092 fingerprint = API_TIMEOUT_ERROR_MESSAGE (0.717)
function armRequestTimeout(e, n) {
  let r = getConnectionTimeoutMs(),
    s = setTimeout(
      (h, y) => h.abort(new SdkError(Ti.RequestTimeout, "Request timed out", { timeout: y })),
      r,
      n,
      r,
    );
  (s.unref?.(),
    e.then(
      () => clearTimeout(s),
      () => clearTimeout(s),
    ));
}

export {
  getErrorMessageIfRefusal,
  getPdfTooLargeErrorMessage,
  getPdfPasswordProtectedErrorMessage,
  getPdfInvalidErrorMessage,
  getImageTooLargeErrorMessage,
  SAFETY_MONITOR_BLOCKED,
  $Ys,
  API_ERROR_MESSAGE_PREFIX,
  formatOrgSpendCapError,
  _Ai,
  categorizeRetryableAPIError,
  j8n,
  noGatewayNotice,
  armRequestTimeout,
  isAutoResumableLimit,
  isValidAPIMessage,
  classifyAPIError,
  getAssistantMessageFromApiError,
  FABLE_HIGH_LOAD_MESSAGE,
  OPUS_HIGH_LOAD_MESSAGE,
  ADVISOR_20260301,
  isInvalidBetaFlagError,
  isSafeguardsRejected,
  normalize422To400,
  isBetaRejected,
  isBetaHeaderRejected,
  isThinkingDisplayRejected,
  isClientVersionRejected,
  classifyFallbackCreditError,
  classifyServerFallbackError,
  isKeptReminderClearAtRejected,
  isTetherBetaRejected,
  Ioo,
  Ooo,
  isAdvisorModelMismatchError,
  isMidConversationSystemRejected,
  isWebSearchContentRejected,
  isCodeExecutionOutputRejected,
  isAfkModeBetaRejected,
  isAdvisorResultUnprocessable,
  isAdvisorUnavailableError,
  getMediaErrorFromApiError,
  getRejectedBetas,
  BETA_REJECTION_MATCHER_KEYS,
  isCacheKeepaliveBetaRejected,
  isThinkingResumptionBetaRejected,
  isThinkingBindingRejected,
  getRejectedThinkingType,
  isInvalidThinkingSignatureError,
  isToolChangeRejected,
  isInlineToolDefinitionRejected,
  isCacheControlFieldRejected,
  isOutputConfigRejected,
  isOutputTimingRejected,
  isEffortUnsupportedError,
  isStructuredOutputsUnsupported,
  isAdvisorBetaRejected,
  getAdvisorRefusalScope,
  isUnprocessableRequest,
  classifyToolChangeError,
  classifyInlineToolDefinitionError,
  getMidConvSystemRejection,
  isPerTurnEffortRejected,
  mentionsThinkingBindingBeta,
  isBetaListedAsUnexpected,
  isContext1mBetaRejected,
  isConversationBindingError,
  parseThinkingPrefixMismatchHeader,
  markPrefixLockHealDeclined,
  getRefusalMessage,
  adt,
  _3e,
  isRequestTooLargeError_2,
  DLP_REQUEST_DENIED,
  U9t,
  isPromptTooLongError,
  isMaxTokensContextOverflow,
  parsePromptTooLongTokenCounts,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  isPromptTooLongMessage_2,
  rebuildApiErrorMessage,
  formatSingleExchangePromptTooLong,
  getPromptTooLongTokenGap,
  getStatusPageHint,
  Y8n,
  rWt,
  startsWithApiErrorPrefix,
  isRateLimitError,
  API_ERROR_CONST_1000,
  isPrefixLockHealDeclined,
  isInputTooLongError,
  isCreditBalanceTooLow,
  isOrganizationDisabled,
  isPolicyBlockedError,
  NoApiAttemptsLeftError,
  OAuthRefreshDiskFullError,
  REPEATED_529_MESSAGE,
  getCloudCredentialErrorProvider,
  Moo,
  suggestThirdPartyModel,
  getPromptTooLongGap,
  rpn,
  INVALID_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
  TOKEN_REVOKED_MESSAGE,
  INVALID_API_KEY_ERROR_MESSAGE,
  CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
  REQUEST_TIMED_OUT_MESSAGE,
  TUo,
  EUo,
  CLAUDE_BG_GATEWAY_WITHHELD,
  isHipaaFeatureError,
  CLAUDE_CODE_VERSION_TOO_OLD,
  CCS_NO_REQUEST_TOKEN,
  isLongContextCreditsRequiredMessage,
  isMediaSizeErrorMessage,
  canSuggestSlashCommands,
  isPromptTooLongMessage,
};
