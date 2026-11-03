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
import { isAbsolute, basename } from "path";
import { MAX_PDF_PAGES, MAX_PDF_BYTES } from "../../utils/truncateGraphemes.js";
import { formatFileSize, formatDurationCoarse } from "../../utils/format.js";
import {
  getIsNonInteractiveSession,
  isLongContext1mCreditsBlocked,
  setLongContext1mCreditsBlocked,
  setUsageCreditsRequired,
  isDisklessProcess,
  getDisableSlashCommands,
} from "../../bootstrap/state.js";
import { getModelCatalog, getCatalogEntry as getCatalogEntry_2 } from "../../utils/model/modelCatalog.js";
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
import { u, literal, discriminatedUnion, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  concatSafe,
  joinSafe,
  lit,
} from "../analytics/safeMetadata.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { tildify } from "../../utils/path.js";
import {
  APIError,
  APIConnectionTimeoutError,
  APIConnectionError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isAwsCredentialsProviderError } from "../../utils/aws.js";
import {
  isGoogleCloudProvider,
  isGoogleCredentialLoadError,
  isOAuthTokenRevokedError,
  is529Error,
  getRetryDelay,
} from "./withRetry.js";
import { createApiErrorMessage, getAssistantMessageText } from "../../utils/messages.js";
import { MESSAGE_MARK_SYMBOLS_2 } from "../../utils/messageKinds.js";
import { classifyMediaError, buildMediaRemovedError } from "./mediaErrors.js";
import {
  includesWholeWord,
  isContextLimitExceeded,
  isPlainInputTooLong,
  mentionsAnthropicBeta,
  isBetaHeaderNamed,
  isUnsupportedRoleError,
  parseMidConvSystemRejection,
  isCacheControlError,
  isOutputFormatExtraInputsError,
  isThinkingSignatureError,
  rejectedThinkingType,
  isContextWindowError,
} from "./badRequestClassifier.js";
import {
  effectiveErrorStatus,
  amazonRequestId,
  apiErrorCode,
  formatAPIError,
  sanitizeAPIError,
  extractNestedErrorMessage,
  extractConnectionErrorDetails,
  STRICT_SSL_ERROR_CODES,
  isStreamSuspendedError,
  isConnectionError,
  CONNECTION_DROPPED_MESSAGE,
  TRANSIENT_SOCKET_CODES,
  UNREACHABLE_ERROR_CODES,
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { isKnownContentBlockType, InvalidRequestHeaderValueError } from "./requestHeaders.js";
import { logEvent } from "../analytics/index.js";
import {
  BETA_AFK_MODE,
  BETA_DANGEROUS_TOOL_USE,
  BETA_MESSAGE_THREADS,
  BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT,
  BETA_ADVISOR_TOOL,
  BETA_CACHE_KEEPALIVE,
  BETA_THINKING_RESUMPTION,
  BETA_THINKING_BINDING_CONTROLS,
  BETA_LONG_CONTEXT,
  BETA_CACHE_DIAGNOSIS,
  BETA_CONTEXT_MANAGEMENT,
  BETA_PROMPT_CACHING_EVICT,
  BETA_THINKING_DISPLAY_UPDATES,
  BETA_THINKING_TOKEN_COUNT,
  BETA_INLINE_TOOLS,
  BETA_MID_CONV_TOOL_CHANGE,
  BETA_TOOL_SEARCH_ADVANCED,
  BETA_TOOL_SEARCH,
  lls,
  KNOWN_BETAS,
  BETA_SERVER_SIDE_FALLBACK_CATEGORY,
  MID_CONVERSATION_SYSTEM_2026_04_07,
  BETA_PER_MESSAGE_EFFORT,
  BETA_PER_TURN_TIMING,
  BETA_EFFORT,
  BETA_STRUCTURED_OUTPUTS,
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
  isLimitsDisplayEnabled,
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
  parseRequestTooLargeError,
  formatRequestTooLarge,
  requestTooLargeDebug,
  formatRequestTooLargeMedia,
  requestTooLargeWithLimitText,
  mediaBytesInMessages,
  requestTooLargeText,
  measureRejectedRequest,
} from "./requestTooLarge.js";
import { isOfficialFirstPartyEndpoint, getApiBaseUrl } from "../../utils/model/firstPartyBaseUrl.js";
import { isNonCustomOpusModel } from "../../utils/model/smallFastModel.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { OAuthRefreshDeadError, OAuthRefreshLockTimeoutError } from "../oauth/errors.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { OAuthAccountOnHoldError, withOnHoldDetails } from "../oauth/oauthErrors.js";
import {
  getWIFAccountOnHold,
  WorkloadIdentityError,
} from "../../../vendor/@anthropic-ai/sdk/lib/credentials/types.mjs";
import { isWIFUserOAuthDeadError, wouldWIFProfileYieldToClaudeAILogin } from "../../utils/wifProfile.js";
import { printableName } from "../../utils/printableName.js";
import { errorMessage } from "../../utils/errors.js";
import { findStreamNoResponseError, StreamNoEventsError } from "./streamErrors.js";
import { getProxyUrlWithSource, shouldBypassProxy as shouldBypassProxy_2 } from "../../utils/proxy.js";
import { FoundryCapabilityError } from "./foundryCapabilities.js";
import { logForDebugging } from "../../utils/debug.js";
import { getEntrypointKind, isHostEntrypoint } from "../../utils/entrypointKinds.js";
import { normalizeApiErrorTypeDiag } from "./responseDiagnostics.js";
import {
  normalizeRefusalCategory,
  hasRefusalFallbackTarget,
  getSafeguardsArticleUrl,
  buildSafeguardsLearnMore,
  isHardRefusalCategory,
} from "./refusalFallback.js";
import { hasConvoluteArcadesFlag, getFallbackLatchKind } from "./refusalFallbackHeaders.js";
import {
  formatSafeguardLead,
  SAFEGUARD_CATEGORY_LEADS,
  CYBER_SAFEGUARDS_URL,
  SAFEGUARDS_BROAD_NOTE,
  formatRefusalDetails,
} from "./safeguardMessages.js";
import { firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import { isConsumerPlan } from "../../utils/planTiers.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { parseAdvisorResult } from "../../utils/advisor.js";
import { getConnectionTimeoutMs } from "../mcp/client.js";
import { SdkError, SdkErrorCode } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-e6aww6q8.js:123593-123865 fingerprint = getPdfTooLargeErrorMessage (1)
/**
 * PDF 过大提示（页数/字节上限）；SDK/非交互与交互模式文案不同。
 */
function getPdfTooLargeErrorMessage() {
  let limits = `max ${MAX_PDF_PAGES} pages, ${formatFileSize(MAX_PDF_BYTES)}`;
  return getIsNonInteractiveSession()
    ? `PDF too large (${limits}). Try reading the file a different way (e.g., extract text with pdftotext).`
    : `PDF too large (${limits}). Double press esc to go back and try again, or use pdftotext to convert to text first.`;
}
//@ chunk-e6aww6q8.js:123865-124062 fingerprint = getPdfPasswordProtectedErrorMessage (1)
/**
 * PDF 有密码保护提示。
 */
function getPdfPasswordProtectedErrorMessage() {
  return getIsNonInteractiveSession()
    ? "PDF is password protected. Try using a CLI tool to extract or convert the PDF."
    : "PDF is password protected. Please double press esc to edit your message and try again.";
}
//@ chunk-e6aww6q8.js:124062-124265 fingerprint = getPdfInvalidErrorMessage (1)
/**
 * PDF 无效提示。
 */
function getPdfInvalidErrorMessage() {
  return getIsNonInteractiveSession()
    ? "The PDF file was not valid. Try converting it to text first (e.g., pdftotext)."
    : "The PDF file was not valid. Double press esc to go back and try again with a different file.";
}
//@ chunk-e6aww6q8.js:124265-124455 fingerprint = getImageTooLargeErrorMessage (1)
/**
 * 图片过大提示。
 */
function getImageTooLargeErrorMessage() {
  return getIsNonInteractiveSession()
    ? "Image was too large. Try resizing the image or using a different approach."
    : "Image was too large. Double press esc to go back and try again with a smaller image.";
}
//@ chunk-e6aww6q8.js:1554437-1555950 placement
/**
 * 生成组织支出上限已达或组织被停用时的错误文案。
 */
function formatOrgSpendCapError(
  e,
  {
    includeOverageInUse: n = true,
    unifiedWindows: r,
    overageEnabled: s,
    usageCreditOffer: h,
    adminRequestOffer: y,
  } = {},
) {
  if (!e) return;
  return {
    status: e.status,
    ...(e.resetsAt !== undefined && {
      resetsAt: e.resetsAt,
    }),
    ...(e.rateLimitType !== undefined && {
      rateLimitType: e.rateLimitType,
    }),
    ...(e.utilization !== undefined && {
      utilization: e.utilization,
    }),
    ...(e.overageStatus !== undefined && {
      overageStatus: e.overageStatus,
    }),
    ...(e.overageResetsAt !== undefined && {
      overageResetsAt: e.overageResetsAt,
    }),
    ...(e.overageDisabledReason !== undefined && {
      overageDisabledReason:
        e.overageDisabledReason === "org_spend_cap_reached"
          ? "org_level_disabled_until"
          : e.overageDisabledReason,
    }),
    ...(e.overageScope !== undefined &&
      e.overageScope !== "organization" && {
        limitScope: e.overageScope,
      }),
    ...(e.isUsingOverage !== undefined && {
      isUsingOverage: e.isUsingOverage,
    }),
    ...(e.overageInUse !== undefined &&
      n && {
        overageInUse: e.overageInUse,
      }),
    ...(e.surpassedThreshold !== undefined && {
      surpassedThreshold: e.surpassedThreshold,
    }),
    ...(e.rateLimitGraceActive === true && {
      rateLimitGraceActive: true,
    }),
    ...(e.overagePeriodMonthly !== undefined && {
      overagePeriodMonthly: e.overagePeriodMonthly,
    }),
    ...(e.overagePeriodChannel !== undefined && {
      overagePeriodChannel: e.overagePeriodChannel,
    }),
    ...(e.errorCode !== undefined && {
      errorCode: e.errorCode,
    }),
    ...(e.canUserPurchaseCredits !== undefined && {
      canUserPurchaseCredits: e.canUserPurchaseCredits,
    }),
    ...(e.hasChargeableSavedPaymentMethod !== undefined && {
      hasChargeableSavedPaymentMethod: e.hasChargeableSavedPaymentMethod,
    }),
    ...(r !== undefined && {
      unifiedWindows: r,
    }),
    ...(s !== undefined && {
      overageEnabled: s,
    }),
    ...(h !== undefined && {
      usageCreditOffer: h,
    }),
    ...(y !== undefined && {
      adminRequestOffer: y,
    }),
  };
}
//@ chunk-e6aww6q8.js:1555950-1555984 placement
var MODEL_FAMILY_ORDER = ["fable", "opus", "sonnet"];
//@ chunk-e6aww6q8.js:1555984-1556162 placement
function compareVersionParts(e, n) {
  let mapped = e.split("-").map(Number);
  let mapped_2 = n.split("-").map(Number);
  for (let idx = 0; idx < Math.max(mapped.length, mapped_2.length); idx++) {
    let y = (mapped_2[idx] ?? -1) - (mapped[idx] ?? -1);
    if (y !== 0) return y;
  }
  return 0;
}
//@ chunk-e6aww6q8.js:1556162-1556635 placement
/**
 * 列出有 3P 回退 id 的模型目录条目，按家族顺序与版本号排序，返回用于在错误文本中匹配的 needle 与回退 id。
 */
function thirdPartyFallbackModels() {
  return getModelCatalog()
    .models.filter((model) => model.fallback_3p !== undefined)
    .sort((e, n) => {
      let r = (family) => {
        let index = MODEL_FAMILY_ORDER.indexOf(family);
        return index === -1 ? MODEL_FAMILY_ORDER.length : index;
      };
      let s = (id, family) =>
        id
          .replace(/^claude-/, "")
          .replace(family, "")
          .replace(/^-|-$/g, "");
      return (
        r(e.family) - r(n.family) ||
        (e.family < n.family ? -1 : e.family > n.family ? 1 : 0) ||
        compareVersionParts(s(e.id, e.family), s(n.id, n.family))
      );
    })
    .map((model) => {
      let replaced = model.id.replace(/^claude-/, "");
      return {
        needle: replaced,
        needleUnderscore: replaced.replace(/-/g, "_"),
        fallbackId: model.fallback_3p,
        family: model.family,
      };
    });
}
//@ chunk-e6aww6q8.js:1556635-1556748 placement
function providerModelString(fallbackId) {
  let firstParty = getCatalogEntry_2(fallbackId)?.provider_ids.first_party;
  let r = firstParty !== undefined ? MODEL_KEY_BY_FIRST_PARTY_ID[firstParty] : undefined;
  return r !== undefined ? getModelStrings()[r] : undefined;
}
//@ chunk-e6aww6q8.js:1556748-1557033 placement
/**
 * 非第一方模型 id 环境下，从错误文本中识别出被拒的模型，返回当前提供方对应的可用模型 id（Fable 回退到 Opus 时优先 ANTHROPIC_DEFAULT_OPUS_MODEL）。
 */
function suggestThirdPartyModel(errorText) {
  if (usesFirstPartyModelIds()) return;
  let lower = errorText.toLowerCase();
  let found = thirdPartyFallbackModels().find(
    (s) => lower.includes(s.needle) || lower.includes(s.needleUnderscore),
  );
  if (found === undefined) return;
  if (found.family === "fable" && getCatalogEntry_2(found.fallbackId)?.family === "opus")
    return env.ANTHROPIC_DEFAULT_OPUS_MODEL ?? providerModelString(found.fallbackId);
  return providerModelString(found.fallbackId);
}
//@ chunk-e6aww6q8.js:1557033-1557102 placement
var ADVISOR_20260301 = "advisor_20260301";
var replaced = "advisor_20260301".replace(/\d+$/, "");
//@ chunk-e6aww6q8.js:1557102-1557476 placement
/**
 * 网络安全拦截的申诉链接、访问层级名称，以及 cyber_verification 错误详情的结构。
 */
var CYBER_APPEAL_URL = "https://claude.com/form/cyber-block-false-positive-report-cvp-rejection-appeal";
var CYBER_ACCESS_TIERS = {
  a: "Specialized Access",
  b: "Red Team Access",
  c: "Defense Access",
};
var CYBER_VERIFICATION_SCHEMA = DoctorLazy(() =>
  u({
    category: literal("cyber"),
    cyber_verification: discriminatedUnion("type", [
      u({
        type: literal("active"),
        tier: _enum(["a", "b", "c"]),
      }),
      u({
        type: literal("inactive"),
        reason: _enum(["not_assigned_but_organization_approved", "organization_not_approved"]),
      }),
    ]),
  }),
);
//@ chunk-e6aww6q8.js:1557476-1558563 placement
/**
 * 生成网络安全验证计划相关的拒绝文案，并引导用户反馈。
 */
function formatCyberVerificationRefusal(e, n, r) {
  if (!usesFirstPartyModelIds()) return e;
  let s = CYBER_VERIFICATION_SCHEMA().safeParse(r);
  if (!s.success) return e;
  logFeatureOk("refusal_cyber_verification_status");
  let cyberVerification = s.data.cyber_verification;
  switch (cyberVerification.type) {
    case "active": {
      let y = `You have ${CYBER_ACCESS_TIERS[cyberVerification.tier]} in the Cyber Verification Program, and your last message was still flagged.`;
      if (!isFeedbackAllowed()) return `${y} ${e}`;
      return getIsNonInteractiveSession()
        ? `${y} If it's legitimate security work, send feedback so we can improve: ${CYBER_APPEAL_URL}. It won't unblock your last message. ${e}`
        : `${y} If it's legitimate security work, send feedback with /feedback so we can improve. It won't unblock your last message. Learn more: ${n}`;
    }
    case "inactive":
      switch (cyberVerification.reason) {
        case "not_assigned_but_organization_approved":
          return `Ask your admin for Defense Access in the Cyber Verification Program to reduce these interruptions. An admin can check your role in Organization settings. ${e}`;
        case "organization_not_approved":
          return `Your organization doesn't have Cyber Verification Program access in effect for this model. Your admin can check your organization's status in the Verification Portal (https://portal.anthropic.com). ${e}`;
      }
  }
}
//@ chunk-e6aww6q8.js:1558563-1558616 placement
/**
 * 遥测用的安全键/路径键正则（小写字母数字下划线，路径版允许斜杠）与对应脱敏函数。
 */
var SAFE_EVENT_KEY_RE = /^[a-z0-9_]{1,48}$/;
var SAFE_PATH_KEY_RE = /^[a-z0-9_/]{1,48}$/;
//@ chunk-e6aww6q8.js:1558616-1558691 placement
/**
 * 导出函数 `sanitizeEventKey`：参数 e，返回 typeof e === "string" && x6o.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit_2("unknown")。
 */
function sanitizeEventKey(e) {
  return typeof e === "string" && SAFE_EVENT_KEY_RE.test(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : lit("unknown");
}
//@ chunk-e6aww6q8.js:1558691-1558738 placement
/**
 * 导出函数 `asSafePathKey`：参数 e，返回 P6o.test(e) ? e : "unknown"。
 */
function asSafePathKey(e) {
  return SAFE_PATH_KEY_RE.test(e) ? e : "unknown";
}
//@ chunk-e6aww6q8.js:1558790-1558827 placement
var CLAUDE_BG_GATEWAY_WITHHELD = "CLAUDE_BG_GATEWAY_WITHHELD";
//@ chunk-e6aww6q8.js:1558827-1558916 placement
/**
 * 导出函数 `isWithheldGatewayBgSession`：返回 isBgSession() && Boolean(env.CLAUDE_BG_GATEWAY_WITHHELD) && !env.ANTHROPIC_BASE_URL。
 */
function isWithheldGatewayBgSession() {
  return isBgSession() && Boolean(env.CLAUDE_BG_GATEWAY_WITHHELD) && !env.ANTHROPIC_BASE_URL;
}
//@ chunk-e6aww6q8.js:1558916-1558969 placement
/**
 * 后台网关被扣留时的环境变量值长度上限与安全字符集校验。
 */
var MAX_WITHHELD_GATEWAY_CHARS = 1024;
var SAFE_GATEWAY_VALUE_RE = /^[\p{L}\p{M}\p{N}/\\._~+@,:=-]+$/u;
//@ chunk-e6aww6q8.js:1558969-1559077 placement
function withheldGatewayFolder() {
  let CLAUDE_BG_GATEWAY_WITHHELD = env.CLAUDE_BG_GATEWAY_WITHHELD;
  return CLAUDE_BG_GATEWAY_WITHHELD &&
    CLAUDE_BG_GATEWAY_WITHHELD.length <= MAX_WITHHELD_GATEWAY_CHARS &&
    isAbsolute(CLAUDE_BG_GATEWAY_WITHHELD) &&
    SAFE_GATEWAY_VALUE_RE.test(CLAUDE_BG_GATEWAY_WITHHELD)
    ? tildify(CLAUDE_BG_GATEWAY_WITHHELD)
    : undefined;
}
//@ chunk-e6aww6q8.js:1559077-1559261 placement
function respawnCommandHint() {
  let e = env.CLAUDE_JOB_DIR && basename(env.CLAUDE_JOB_DIR);
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
/**
 * 导出函数 `isNoGatewayHint`：参数 e，返回 e.startsWith(`${NO_GATEWAY_MESSAGE} To fix, run `)。
 */
function isNoGatewayHint(text) {
  return text.startsWith(`${NO_GATEWAY_MESSAGE} To fix, run `);
}
//@ chunk-e6aww6q8.js:1559660-1559771 placement
/**
 * 生成"未使用 LLM 网关：从其他目录打开"的提示文字。
 */
function noGatewayNotice() {
  return `No LLM gateway: opened from another folder \xB7 respawn from ${withheldGatewayFolder() ?? "its own folder"}`;
}
//@ chunk-e6aww6q8.js:1571107-1571244 placement
/**
 * 非 HTTP 错误中的云凭证错误归属：AWS 或 Google Cloud，否则 null。
 */
function getCloudCredentialErrorProvider(error) {
  if (error instanceof APIError && error.status !== undefined) return null;
  if (isAwsCredentialsProviderError(error)) return "AWS";
  if (isGoogleCloudProvider() && isGoogleCredentialLoadError(error)) return "Google Cloud";
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
//@ chunk-e6aww6q8.js:1571519-1571867 placement
/**
 * 各云提供方（AWS、Google Cloud、Microsoft Foundry、网关）认证失败的错误前缀，以及凭证由环境管理时的附加说明。
 */
var AWS_CREDENTIALS_INVALID = "AWS credentials expired or invalid";
var AWS_AUTH_FAILED = "AWS authentication failed";
var GCP_CREDENTIALS_INVALID = "Google Cloud credentials expired or invalid";
var GCP_AUTH_FAILED = "Google Cloud authentication failed";
var FOUNDRY_AUTH_FAILED = "Microsoft Foundry authentication failed";
var GATEWAY_REFUSED = "Gateway refused the request";
var MANAGED_CREDENTIALS_SUFFIX =
  " \xB7 credentials are managed by this environment \u2014 retry, or contact your administrator";
//@ chunk-e6aww6q8.js:1571867-1571945 placement
/**
 * 导出函数 `hasInvalidCredentialPrefix`：参数 e，返回 [ INVALID_API_KEY_MESSAGE, INVALID_AUTH_TOKEN_MESSAGE, INVALID_CUSTOM_HEADERS_MESSAGE, INVALID_ENV_HEADER_MESS…。
 */
function hasInvalidCredentialPrefix(text) {
  return [
    INVALID_API_KEY_MESSAGE,
    INVALID_AUTH_TOKEN_MESSAGE,
    INVALID_CUSTOM_HEADERS_MESSAGE,
    INVALID_ENV_HEADER_MESSAGE,
  ].some((n) => text.startsWith(`${n} \xB7 `));
}
//@ chunk-e6aww6q8.js:1571945-1572145 fingerprint = startsWithApiErrorPrefix (1)
/**
 * 文本以 "API Error"、"Please run /login · API Error" 或 AWS/Google Cloud 凭证错误前缀开头。
 */
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
//@ chunk-e6aww6q8.js:1572145-1572319 fingerprint = parsePromptTooLongTokenCounts (1)
/**
 * 从 "prompt is too long: N tokens > M" 解析实际与上限 token 数。
 */
function parsePromptTooLongTokenCounts(rawMessage) {
  let match = rawMessage.match(/prompt is too long[^0-9]*(\d+)\s*tokens?\s*>\s*(\d+)/i);
  return {
    actualTokens: match ? parseInt(match[1], 10) : undefined,
    limitTokens: match ? parseInt(match[2], 10) : undefined,
  };
}
//@ chunk-e6aww6q8.js:1572319-1572501 fingerprint = getPromptTooLongTokenGap (0.781)
/**
 * 提示词过长错误消息的超出量 {gap, actual}。
 */
function getPromptTooLongTokenGap(msg) {
  if (!isPromptTooLongMessage_2(msg) || !msg.errorDetails) return;
  let { actualTokens, limitTokens } = parsePromptTooLongTokenCounts(msg.errorDetails);
  if (actualTokens === undefined || limitTokens === undefined) return;
  let gap = actualTokens - limitTokens;
  return gap > 0
    ? {
        gap,
        actual: actualTokens,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:1572501-1572536 layout
/**
 * 提示词过长超出的 token 数。
 */
function getPromptTooLongGap(msg) {
  return getPromptTooLongTokenGap(msg)?.gap;
}
//@ chunk-e6aww6q8.js:1572536-1572548 layout
/**
 * 0.8：会话内容占请求 80% 以上时提示"本会话内容占大头"。
 */
var SINGLE_EXCHANGE_CONTENT_RATIO = 0.8;
//@ chunk-e6aww6q8.js:1572548-1573355 layout
/**
 * 单轮会话无法压缩时的提示词过长文案：区分无法解析、会话内容占大头、系统提示词/工具/附件占大头三种情况。
 */
function formatSingleExchangePromptTooLong(e) {
  let { actualTokens, limitTokens, conversationTokensEstimate } = e;
  if (actualTokens === undefined || limitTokens === undefined)
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
//@ chunk-e6aww6q8.js:1573355-1573675 layout
/**
 * 用新文案重建 API 错误消息，保留 requestId、apiErrorStatus/Code 等元数据。
 */
function rebuildApiErrorMessage(e, content, deps) {
  return {
    ...createApiErrorMessage({
      content,
      error: "invalid_request",
      apiError: e.apiError,
      apiErrorParams: e.apiErrorParams,
      errorDetails: e.errorDetails,
      now: deps.now,
      uuid: deps.uuid,
    }),
    requestId: e.requestId,
    apiErrorStatus: e.apiErrorStatus,
    ...(e.apiErrorCode !== undefined && {
      apiErrorCode: e.apiErrorCode,
    }),
    ...(e[MESSAGE_MARK_SYMBOLS_2] !== undefined && {
      [MESSAGE_MARK_SYMBOLS_2]: e[MESSAGE_MARK_SYMBOLS_2],
    }),
  };
}
//@ chunk-e6aww6q8.js:1573675-1573747 layout
/**
 * 错误详情含 request_too_large 或可识别的媒体错误。
 */
function isRequestTooLargeOrMediaDetail(errorDetails) {
  return errorDetails.includes("request_too_large") || classifyMediaError(errorDetails) !== undefined;
}
//@ chunk-e6aww6q8.js:1573747-1573830 layout
/**
 * 400 错误里的媒体错误位置/类型（classifyMediaError）。
 */
function getMediaErrorFromApiError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return;
  return classifyMediaError(e.message);
}
//@ chunk-e6aww6q8.js:1573830-1573924 fingerprint = isMediaSizeErrorMessage (1)
/**
 * API 错误消息的详情是请求过大或媒体错误。
 */
function isMediaSizeErrorMessage(msg) {
  return (
    msg.isApiErrorMessage === true &&
    msg.errorDetails !== undefined &&
    isRequestTooLargeOrMediaDetail(msg.errorDetails)
  );
}
//@ chunk-e6aww6q8.js:1573924-1573960 fingerprint = CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE (1)
/**
 * "Credit balance is too low"。
 */
var CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE = "Credit balance is too low";
//@ chunk-e6aww6q8.js:1573960-1574064 placement
function isPromptTooLongError(error) {
  if (!(error instanceof Error)) return false;
  return isPromptTooLongMessage(error.message) || includesWholeWord(error.message, "prompt_too_long");
}
//@ chunk-e6aww6q8.js:1574064-1574168 placement
function isMaxTokensContextOverflow(error) {
  return (
    error instanceof Error &&
    (isContextLimitExceeded(error.message) || includesWholeWord(error.message, "max_tokens_context_overflow"))
  );
}
//@ chunk-e6aww6q8.js:1574168-1574221 placement
var CONTENT_FILTER_MESSAGE = "Output blocked by content filtering policy";
//@ chunk-e6aww6q8.js:1574221-1574433 placement
function isRequestTooLargeError_2(error) {
  if (!(error instanceof Error) || !error.message.includes(CONTENT_FILTER_MESSAGE)) return false;
  let n = "originalError" in error && error.originalError instanceof Error ? error.originalError : error;
  let r = n instanceof APIError ? effectiveErrorStatus(n) : undefined;
  return r === undefined || r === 400;
}
//@ chunk-e6aww6q8.js:1574433-1574548 placement
var UNPROCESSABLE_REQUEST_MESSAGE =
  "Request rejected as unprocessable by the model (too many or oversized images, or unsupported parameters)";
//@ chunk-e6aww6q8.js:1574548-1574657 placement
function isUnprocessableRequest(e) {
  if (!(e instanceof APIError)) return false;
  let n = effectiveErrorStatus(e);
  return (n === undefined || n === 400) && getApiErrorFirstLine(e).includes(UNPROCESSABLE_REQUEST_MESSAGE);
}
//@ chunk-e6aww6q8.js:1574657-1574761 placement
function isCreditBalanceTooLow(e) {
  return e instanceof Error && e.message.toLowerCase().includes("credit balance is too low");
}
//@ chunk-e6aww6q8.js:1574761-1574871 placement
function isOrganizationDisabled(error) {
  return error instanceof Error && error.message.toLowerCase().includes("organization has been disabled");
}
//@ chunk-e6aww6q8.js:1574871-1574972 placement = _temp2 (1)
/**
 * 判断错误是超时类：特定超时错误类型，或消息里含 timeout 的另一类错误。
 */
function isTimeoutError(res) {
  return (
    res instanceof APIConnectionTimeoutError ||
    (res instanceof APIConnectionError && res.message.toLowerCase().includes("timeout"))
  );
}
//@ chunk-e6aww6q8.js:1574972-1575039 layout
/**
 * 错误消息含重复 529 提示（Ike）。
 */
function isRepeated529Error(error) {
  return error instanceof Error && error.message.includes(REPEATED_529_MESSAGE);
}
//@ chunk-e6aww6q8.js:1575039-1575125 layout
/**
 * "maximum of N PDF pages"。
 */
function isPdfPageLimitError(error) {
  return error instanceof Error && /maximum of \d+ PDF pages/.test(error.message);
}
//@ chunk-e6aww6q8.js:1575125-1575230 layout
/**
 * "The PDF specified is password protected"。
 */
function isPdfPasswordProtectedError(error) {
  return error instanceof Error && error.message.includes("The PDF specified is password protected");
}
//@ chunk-e6aww6q8.js:1575230-1575353 layout
/**
 * 400 "image exceeds ... maximum"。
 */
function isImageTooLargeError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes("image exceeds") &&
    error.message.includes("maximum")
  );
}
//@ chunk-e6aww6q8.js:1575353-1575489 fingerprint = isMediaSizeError (0.692)
/**
 * 400 多图模式下尺寸超限。旧版名 isMediaSizeError 近似。
 */
function isManyImageDimensionError(raw) {
  return (
    raw instanceof APIError &&
    raw.status === 400 &&
    raw.message.includes("image dimensions exceed") &&
    raw.message.includes("many-image")
  );
}
//@ chunk-e6aww6q8.js:1575489-1575544 layout
/**
 * HTTP 413。
 */
function isRequestTooLargeError(error) {
  return error instanceof APIError && error.status === 413;
}
//@ chunk-e6aww6q8.js:1575544-1575640 layout
/**
 * 400 消息为 "input is too long"（G7s 判定）。
 */
function isInputTooLongError(error) {
  return (
    error instanceof Error &&
    (!(error instanceof APIError) || error.status === 400) &&
    isPlainInputTooLong(error.message)
  );
}
//@ chunk-e6aww6q8.js:1575640-1575791 layout
/**
 * 400 "`tool_use` ids were found without `tool_result` blocks immediately after"。
 */
function isToolUseWithoutResultError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes("`tool_use` ids were found without `tool_result` blocks immediately after")
  );
}
//@ chunk-e6aww6q8.js:1575791-1575917 layout
/**
 * 400 "unexpected `tool_use_id` found in `tool_result`"。
 */
function isUnexpectedToolResultError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes("unexpected `tool_use_id` found in `tool_result`")
  );
}
//@ chunk-e6aww6q8.js:1575917-1576025 layout
/**
 * 400 "`tool_use` ids must be unique"。
 */
function isDuplicateToolUseIdError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes("`tool_use` ids must be unique")
  );
}
//@ chunk-e6aww6q8.js:1576025-1576136 layout
/**
 * 400 "invalid model name"。
 */
function isInvalidModelNameError(error) {
  return (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.toLowerCase().includes("invalid model name")
  );
}
//@ chunk-e6aww6q8.js:1576136-1576225 layout
/**
 * 消息提到 x-api-key。
 */
function isApiKeyHeaderError(error) {
  return error instanceof Error && error.message.toLowerCase().includes("x-api-key");
}
//@ chunk-e6aww6q8.js:1576225-1576389 layout
/**
 * 401/403 "OAuth authentication is currently not allowed for this organization"。
 */
function isOAuthOrgNotAllowedError(error) {
  return (
    error instanceof APIError &&
    (error.status === 401 || error.status === 403) &&
    error.message.includes("OAuth authentication is currently not allowed for this organization")
  );
}
//@ chunk-e6aww6q8.js:1576389-1576495 layout
/**
 * Bedrock 上消息含 "model id"。
 */
function isBedrockModelIdError(error) {
  return (
    getAPIProvider() === "bedrock" &&
    error instanceof Error &&
    error.message.toLowerCase().includes("model id")
  );
}
//@ chunk-e6aww6q8.js:1576495-1576542 fingerprint = INVALID_API_KEY_ERROR_MESSAGE (1)
/**
 * "Not logged in · Please run /login"。
 */
var INVALID_API_KEY_ERROR_MESSAGE = "Not logged in \xB7 Please run /login";
//@ chunk-e6aww6q8.js:1576542-1579306 layout
/**
 * 认证与过载类面向用户的错误文案常量组（以下同组）。
 */
var AUTH_REQUIRED_MESSAGE = "Authentication required \xB7 Sign in again to continue";
var INVALID_API_KEY_MESSAGE = "Invalid API key \xB7 Fix external API key";
var INVALID_AUTH_TOKEN_MESSAGE = "Invalid auth token \xB7 Fix external auth token";
var INVALID_CUSTOM_HEADERS_MESSAGE = "Invalid ANTHROPIC_CUSTOM_HEADERS \xB7 Fix the environment variable";
var INVALID_ENV_HEADER_MESSAGE =
  "Invalid request header from the environment \xB7 Fix the environment variable";
var DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE =
  "Your ANTHROPIC_API_KEY belongs to a disabled organization \xB7 Unset the environment variable to use your subscription instead";
var DISABLED_ORG_API_KEY_MESSAGE =
  "Your ANTHROPIC_API_KEY belongs to a disabled organization \xB7 Update or unset the environment variable";
var API_KEY_AUTH_DISABLED_UNSET_ENV_MESSAGE =
  "Your organization has disabled API key authentication \xB7 Unset ANTHROPIC_API_KEY to use your claude.ai account instead";
var API_KEY_AUTH_DISABLED_UNSET_ENV_LOGIN_MESSAGE =
  "Your organization has disabled API key authentication \xB7 Unset ANTHROPIC_API_KEY and run /login to sign in with your claude.ai account";
var API_KEY_AUTH_DISABLED_UNSET_HELPER_MESSAGE =
  "Your organization has disabled API key authentication \xB7 Unset the apiKeyHelper setting and run /login to sign in with your claude.ai account";
var API_KEY_AUTH_DISABLED_LOGIN_MESSAGE =
  "Your organization has disabled API key authentication \xB7 Run /login to sign in with your claude.ai account";
var API_KEY_AUTH_DISABLED_SIGN_IN_MESSAGE =
  "Your organization has disabled API key authentication \xB7 Sign in again with your claude.ai account";
var TOKEN_REVOKED_MESSAGE = "OAuth token revoked \xB7 Please run /login";
var LOGIN_EXPIRED_MESSAGE = "Login expired \xB7 Please run /login";
var OAUTH_REFRESH_LOCK_TIMEOUT_MESSAGE =
  "Could not refresh your login because another Claude Code process is refreshing it (or exited mid-refresh) \xB7 Try again in a minute; if it keeps happening, close other Claude Code windows or sign in again with /login";
var OAUTH_REFRESH_DISK_FULL_MESSAGE =
  "Could not refresh your login: the disk that holds the Claude Code config directory (~/.claude by default), or your disk quota on it, is full \xB7 Delete files you no longer need on that disk, then try again \xB7 Signing in again won't help";
var ANTHROPIC_PROFILE_LOGIN_EXPIRED_MESSAGE =
  "Anthropic profile login expired \xB7 Re-authenticate your Anthropic profile";
var LOGIN_OR_PROFILE_EXPIRED_MESSAGE =
  "Login expired \xB7 Run /login to sign in again, or re-authenticate your Anthropic profile";
var AUTH_NETWORK_ERROR_MESSAGE =
  "Authentication error \xB7 This may be a temporary network issue, please try again";
var GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE =
  "Authentication error \xB7 The gateway could not authenticate with its upstream provider \u2014 contact your gateway administrator";
var API_KEY_HELPER_FAILING_MESSAGE =
  "Your apiKeyHelper script is failing \xB7 This usually means you need to re-authenticate with your provider \xB7 Run /status to see the script's error output";
var HTTPS_STATUS_CLAUDE_COM = "https://status.claude.com";
var REPEATED_529_MESSAGE = "Repeated 529 Overloaded errors";
var OPUS_HIGH_LOAD_MESSAGE = "Opus is experiencing high load, please use /model to switch to Sonnet";
var FABLE_HIGH_LOAD_MESSAGE = "Fable is experiencing high load, please use /model to switch to Sonnet";
var OPUS_HIGH_LOAD_SHORT_MESSAGE = "Opus is experiencing high load. Switch to Sonnet.";
var FABLE_HIGH_LOAD_SHORT_MESSAGE = "Fable is experiencing high load. Switch to Sonnet.";
var SERVER_RATE_LIMITED_MESSAGE = "Server is temporarily limiting requests (not your usage limit)";
var REQUEST_TIMED_OUT_MESSAGE = "Request timed out";
//@ chunk-e6aww6q8.js:1579306-1579735 layout
/**
 * 错误后缀 "If it persists, check …"：官方 API/AnthropicAws 指向 status.claude.com，自定义网关指向其主机，其余提供商指向对应服务状态。
 */
function getStatusPageHint() {
  let apiProvider = getAPIProvider();
  if (apiProvider === "firstParty") {
    if (isFirstPartyAnthropicBaseUrl()) return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM}.`;
    let ANTHROPIC_BASE_URL = env.ANTHROPIC_BASE_URL ?? "";
    return ` If it persists, check your inference gateway (${URL.parse(ANTHROPIC_BASE_URL)?.host || ANTHROPIC_BASE_URL}).`;
  }
  if (apiProvider === "anthropicAws") return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM}.`;
  if (apiProvider === "anthropicGoogleCloud")
    return ` If it persists, check ${HTTPS_STATUS_CLAUDE_COM} and Google Cloud's status page.`;
  return ` If it persists, check your ${THIRD_PARTY_PROVIDER_LABELS[apiProvider]} service status.`;
}
//@ chunk-e6aww6q8.js:1579735-1579893 layout
/**
 * 组织禁用了 Claude 订阅访问 Claude Code 的提示。
 */
var SUBSCRIPTION_ACCESS_DISABLED_MESSAGE =
  "Your organization has disabled Claude subscription access for Claude Code \xB7 Use an Anthropic API key instead, or ask your admin to enable access";
//@ chunk-e6aww6q8.js:1579893-1580022 layout
/**
 * OAuth 令牌被吊销的提示（交互/非交互不同文案）。
 */
function getTokenRevokedMessage() {
  return getIsNonInteractiveSession()
    ? "Failed to authenticate: OAuth token revoked. Please log in again or contact your administrator."
    : TOKEN_REVOKED_MESSAGE;
}
//@ chunk-e6aww6q8.js:1580022-1580057 layout
/**
 * 需要重新登录（某些托管登录场景）或 "Not logged in · Please run /login"。
 */
function getNotLoggedInMessage() {
  return isArtifactMountMode() ? AUTH_REQUIRED_MESSAGE : INVALID_API_KEY_ERROR_MESSAGE;
}
//@ chunk-e6aww6q8.js:1580057-1580129 layout = isConsumerPlan (1)
/**
 * pro/max 用户为付款问题提示，其他为组织禁用提示。旧版名 isConsumerPlan 为错配。
 */
function getSubscriptionUnavailableMessage() {
  let subscriptionType = getSubscriptionType();
  if (subscriptionType === "pro" || subscriptionType === "max") return SUBSCRIPTION_PAYMENT_ISSUE_MESSAGE;
  return SUBSCRIPTION_ACCESS_DISABLED_MESSAGE;
}
//@ chunk-e6aww6q8.js:1580129-1580172 layout
/**
 * CLAUDE_CODE_REMOTE。
 */
function isRemoteSession() {
  return env.CLAUDE_CODE_REMOTE;
}
//@ chunk-e6aww6q8.js:1580172-1582680 fingerprint = logToolUseToolResultMismatch (0.791)
/**
 * tool_use/tool_result 不匹配错误时，定位该 tool_use 在规范化前后消息中的位置并记录遥测（只记角色/块类型摘要）。
 */
function logToolUseToolResultMismatch(toolUseId, messages, messagesForAPI) {
  try {
    let s = (role) =>
      role === "user" || role === "assistant" || role === "system" ? fromEnum(role) : lit("unknown");
    let h = (block) => typeof block === "object" && block !== null;
    let normalizedIndex = -1;
    for (let i = 0; i < messagesForAPI.length; i++) {
      let msg = messagesForAPI[i];
      if (!msg) continue;
      let content = msg.message.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (h(block) && block.type === "tool_use" && "id" in block && block.id === toolUseId) {
            normalizedIndex = i;
            break;
          }
      }
      if (normalizedIndex !== -1) break;
    }
    let originalIndex = -1;
    for (let i = 0; i < messages.length; i++) {
      let msg = messages[i];
      if (!msg) continue;
      if (msg.type === "assistant" && "message" in msg) {
        let content = msg.message.content;
        if (Array.isArray(content)) {
          for (let block of content)
            if (h(block) && block.type === "tool_use" && "id" in block && block.id === toolUseId) {
              originalIndex = i;
              break;
            }
        }
      }
      if (originalIndex !== -1) break;
    }
    let w = (we, Ee) => concatSafe(fromEnum(we), lit(":"), sanitizeMarkName(Ee) ?? lit("nonconforming"));
    let L = (we) => {
      let Ee = s(we.message.role);
      let content = we.message.content;
      if (typeof content === "string") return [concatSafe(Ee, lit(":string_content"))];
      if (!Array.isArray(content)) return [];
      return content.map((Ie) =>
        concatSafe(
          Ee,
          lit(":"),
          !h(Ie)
            ? lit("unknown")
            : Ie.type === "tool_use" && "id" in Ie
              ? w("tool_use", Ie.id)
              : Ie.type === "tool_result" && "tool_use_id" in Ie
                ? w("tool_result", Ie.tool_use_id)
                : isKnownContentBlockType(Ie.type)
                  ? fromEnum(Ie.type)
                  : lit("unknown"),
        ),
      );
    };
    let flattened = messagesForAPI.slice(normalizedIndex + 1).flatMap((we) => (we ? L(we) : []));
    let q = [];
    for (let i = originalIndex + 1; i < messages.length; i++) {
      let Ee = messages[i];
      if (!Ee) continue;
      switch (Ee.type) {
        case "user":
        case "assistant":
          if ("message" in Ee) q.push(...L(Ee));
          break;
        case "attachment":
          if ("attachment" in Ee)
            q.push(concatSafe(lit("attachment:"), sanitizeEventKey(Ee.attachment.type)));
          break;
        case "system":
          if ("subtype" in Ee) q.push(concatSafe(lit("system:"), sanitizeEventKey(Ee.subtype)));
          break;
        case "progress": {
          let Ae = "data" in Ee ? Ee.data : undefined;
          let Ie = typeof Ae === "object" && Ae !== null && "type" in Ae ? Ae.type : undefined;
          q.push(concatSafe(lit("progress:"), sanitizeEventKey(Ie)));
          break;
        }
      }
    }
    let Z = (we) => {
      if (!we) return lit("<none>");
      let Ee = s(we.message.role);
      let content = we.message.content;
      if (!Array.isArray(content)) return concatSafe(Ee, lit(":string"));
      let mapped = content.map((Me) =>
        !h(Me)
          ? lit("unknown")
          : Me.type === "tool_use"
            ? w("tool_use", Me.id)
            : Me.type === "tool_result"
              ? w("tool_result", Me.tool_use_id)
              : isKnownContentBlockType(Me.type)
                ? fromEnum(Me.type)
                : lit("unknown"),
      );
      return concatSafe(Ee, lit(":["), joinSafe(mapped), lit("]"));
    };
    let Se = 0;
    let ke = 0;
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
      toolUseId: sanitizeMarkName(toolUseId),
      normalizedSequence: joinSafe(flattened, ", "),
      preNormalizedSequence: joinSafe(q, ", "),
      normalizedMessageCount: messagesForAPI.length,
      originalMessageCount: messages.length,
      normalizedToolUseIndex: normalizedIndex,
      originalToolUseIndex: originalIndex,
      offendingMessageBlocks: Z(messagesForAPI[normalizedIndex]),
      followingMessageBlocks: normalizedIndex === -1 ? lit("<none>") : Z(messagesForAPI[normalizedIndex + 1]),
      toolUseOccurrences: Se,
      toolResultOccurrences: ke,
    });
  } catch (error) {}
}
//@ chunk-e6aww6q8.js:1582680-1582854 fingerprint = isValidAPIMessage (1)
/**
 * 对象形如 API Message（content 数组、model 字符串、usage 对象）。
 */
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
//@ chunk-e6aww6q8.js:1582854-1582932 layout
/**
 * 400 拒绝 auto 模式的 afk-mode beta。
 */
function isAfkModeBetaRejected(e) {
  return (
    !!BETA_AFK_MODE &&
    e instanceof APIError &&
    e.status === 400 &&
    messageMentionsBeta(e.message, BETA_AFK_MODE)
  );
}
//@ chunk-e6aww6q8.js:1582932-1582995 layout
/**
 * safeguards 字段路径正则（messages.N.content.M…safeguards），用于区分内容块里的 safeguards 与顶层字段。
 */
var SAFEGUARDS_CONTENT_PATH_REGEX = /^messages\.\d+\.content\.\d+(?:\.\w+)*\.safeguards\b/;
//@ chunk-e6aww6q8.js:1582995-1583142 layout
/**
 * 取错误消息（优先 error.error.message）去掉状态码前缀后的第一行。
 */
function getApiErrorFirstLine(e) {
  let message = e.error?.error?.message;
  let s = typeof message === "string" ? message : e.message.replace(/^\d{3} /, "");
  let index = s.indexOf(`
`);
  return index === -1 ? s : s.slice(0, index);
}
//@ chunk-e6aww6q8.js:1583142-1583266 layout
/**
 * 422 错误转成等价的 400 错误对象（统一走 400 判定）。
 */
function normalize422To400(e) {
  return e instanceof APIError && e.status === 422
    ? new APIError(400, e.error, e.message.replace(/^422 /, ""), e.headers, e.type)
    : e;
}
//@ chunk-e6aww6q8.js:1583266-1583393 layout
/**
 * 400 拒绝 safeguards 字段/对应 beta。
 */
function isSafeguardsRejected(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    (messageMentionsBeta(e.message, BETA_DANGEROUS_TOOL_USE) ||
      (/\bsafeguards\b/.test(e.message) && !SAFEGUARDS_CONTENT_PATH_REGEX.test(getApiErrorFirstLine(e))))
  );
}
//@ chunk-e6aww6q8.js:1583393-1583471 layout
/**
 * 400 拒绝 PG（tether/thread）beta。
 */
function isTetherBetaRejected(e) {
  return (
    !!BETA_MESSAGE_THREADS &&
    e instanceof APIError &&
    e.status === 400 &&
    messageMentionsBeta(e.message, BETA_MESSAGE_THREADS)
  );
}
//@ chunk-e6aww6q8.js:1583471-1583605 layout
/**
 * 中途 system 消息 / clear_at 被拒的消息路径正则。
 */
var TURN_SCOPED_SYSTEM_REGEX =
  /^messages\.\d+(?:\.content\.\d+)?(?:\.clear_at:|: .*(?:turn-scoped system message|\(clear_at: |clear_at is only permitted))/;
//@ chunk-e6aww6q8.js:1583605-1583755 layout
/**
 * 400 拒绝 clear_at 或 turn-scoped system 消息。
 */
function isKeptReminderClearAtRejected(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  let apiErrorFirstLine = getApiErrorFirstLine(e);
  return (
    (apiErrorFirstLine.startsWith("Unexpected value(s) ") &&
      mentionsAnthropicBeta(apiErrorFirstLine, BETA_MID_CONVERSATION_SYSTEM_CLEAR_AT.header)) ||
    TURN_SCOPED_SYSTEM_REGEX.test(apiErrorFirstLine)
  );
}
//@ chunk-e6aww6q8.js:1583755-1583945 layout
/**
 * 400 advisor_tool_result 内容无法处理。
 */
function isAdvisorResultUnprocessable(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    (e.message.includes("Advisor tool result content could not be processed") ||
      e.message.includes("found in advisor_tool_result blocks"))
  );
}
//@ chunk-e6aww6q8.js:1583945-1584164 layout
/**
 * 历史中 web search 加密内容无法解密的错误片段；a3o 为代码执行结果加密错误。
 */
var WEB_SEARCH_DECRYPT_ERRORS = [
  "invalid encrypted_content in search_result block",
  "invalid encrypted_index in text block",
  "failed to decrypt web search result content",
];
var CODE_EXECUTION_DECRYPT_ERROR = "invalid encrypted_stdout in encrypted_code_execution_result block";
//@ chunk-e6aww6q8.js:1584164-1584222 layout
/**
 * 小写并去反引号。
 */
function normalizeErrorText(message) {
  return message.toLowerCase().replaceAll("`", "");
}
//@ chunk-e6aww6q8.js:1584222-1584341 layout
/**
 * 400 历史 web search 内容解密失败（触发 retry:web-search-strip）。
 */
function isWebSearchContentRejected(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  let n = normalizeErrorText(e.message);
  return WEB_SEARCH_DECRYPT_ERRORS.some((r) => n.includes(r));
}
//@ chunk-e6aww6q8.js:1584341-1584425 layout
/**
 * 400 历史中代码执行结果加密内容无法解密。
 */
function isCodeExecutionOutputRejected(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    normalizeErrorText(e.message).includes(CODE_EXECUTION_DECRYPT_ERROR)
  );
}
//@ chunk-e6aww6q8.js:1584425-1584490 layout
/**
 * advisor 模型与请求模型不匹配的错误片段。
 */
var ADVISOR_MODEL_MISMATCH_MESSAGE = "cannot be used as an advisor when the request model is";
//@ chunk-e6aww6q8.js:1584490-1584569 layout
/**
 * 400 advisor 模型不能为当前请求模型提供建议。
 */
function isAdvisorModelMismatchError(e) {
  return e instanceof APIError && e.status === 400 && e.message.includes(ADVISOR_MODEL_MISMATCH_MESSAGE);
}
//@ chunk-e6aww6q8.js:1584569-1584850 layout
/**
 * advisor 工具不可用/模型不能做 advisor/advisor beta 被拒。
 */
function isAdvisorUnavailableError(e) {
  if (!(e instanceof APIError)) return false;
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
//@ chunk-e6aww6q8.js:1584850-1584924 layout
/**
 * 400 拒绝 advisor beta。
 */
function isAdvisorBetaRejected(e) {
  return e instanceof APIError && e.status === 400 && messageMentionsBeta(e.message, BETA_ADVISOR_TOOL);
}
//@ chunk-e6aww6q8.js:1584924-1584957 layout
/**
 * 错误里的 Input tag 是 advisor 引入的块类型（服务端不认识）。
 */
function isAdvisorBlockTypeUnknown(message) {
  return hasRejectedInputTag(BETA_ADVISOR_TOOL, message);
}
//@ chunk-e6aww6q8.js:1584957-1585102 layout
/**
 * advisor 被拒的范围：组织不可用→process，block 类型未知/beta 拒→host，否则 conversation。
 */
function getAdvisorRefusalScope(e) {
  if (e.message.includes("not available for this organization")) return "process";
  return isAdvisorBlockTypeUnknown(e.message) || isAdvisorBetaRejected(e) ? "host" : "conversation";
}
//@ chunk-e6aww6q8.js:1585102-1585175 layout
/**
 * 400 拒绝 DO（缓存保活）beta。
 */
function isCacheKeepaliveBetaRejected(e) {
  return e instanceof APIError && e.status === 400 && messageMentionsBeta(e.message, BETA_CACHE_KEEPALIVE);
}
//@ chunk-e6aww6q8.js:1585175-1585249 layout
/**
 * 400 拒绝 l3e beta。
 */
function isThinkingResumptionBetaRejected(e) {
  return (
    e instanceof APIError && e.status === 400 && messageMentionsBeta(e.message, BETA_THINKING_RESUMPTION)
  );
}
//@ chunk-e6aww6q8.js:1585249-1585315 layout
/**
 * thinking.display 输入校验失败的正则。
 */
var THINKING_DISPLAY_INPUT_REGEX = /thinking\.(adaptive|enabled)\.display: Input should be /;
//@ chunk-e6aww6q8.js:1585315-1585391 layout
/**
 * 400 "thinking.(adaptive|enabled).display: Input should be"。
 */
function isThinkingDisplayRejected(e) {
  return e instanceof APIError && e.status === 400 && THINKING_DISPLAY_INPUT_REGEX.test(e.message);
}
//@ chunk-e6aww6q8.js:1585391-1585606 layout
/**
 * 400 拒绝 thinking-binding-controls beta 或 block_binding 字段。
 */
function isThinkingBindingRejected(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    !isInvalidThinkingSignatureError(e) &&
    !isConversationBindingError(e) &&
    (messageMentionsBeta(e.message, BETA_THINKING_BINDING_CONTROLS) ||
      /thinking\.(adaptive|enabled)\.block_binding(\.prefix_mismatch_behavior)?: Extra inputs are not permitted/.test(
        e.message,
      ))
  );
}
//@ chunk-e6aww6q8.js:1585606-1585708 layout
/**
 * 400 消息提到 thinking-binding-controls beta 头。
 */
function mentionsThinkingBindingBeta(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    !isInvalidThinkingSignatureError(e) &&
    !isConversationBindingError(e) &&
    e.message.includes(BETA_THINKING_BINDING_CONTROLS.header)
  );
}
//@ chunk-e6aww6q8.js:1585708-1585817 layout
/**
 * 400 "invalid beta flag"。
 */
function isInvalidBetaFlagError(e) {
  return e instanceof APIError && e.status === 400 && e.message.toLowerCase().includes("invalid beta flag");
}
//@ chunk-e6aww6q8.js:1585817-1585946 layout
/**
 * 400 提到 1M 上下文 beta 或 long context beta。
 */
function isContext1mBetaRejected(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    (e.message.includes(BETA_LONG_CONTEXT.header) || e.message.includes("long context beta"))
  );
}
//@ chunk-e6aww6q8.js:1585946-1586365 layout
/**
 * beta → 400 消息匹配器（context_management、evict_on_complete、thinking display、thinking-token-count 等）；OJt 是其键列表，d3o 是 beta → 输入标签名正则。
 */
var BETA_REJECTION_MATCHERS = new Map([
  [BETA_CACHE_DIAGNOSIS, null],
  [BETA_CONTEXT_MANAGEMENT, (e) => e.includes("context_management: Extra inputs are not permitted")],
  [BETA_PROMPT_CACHING_EVICT, (e) => e.includes("evict_on_complete") && e.includes("beta")],
  [BETA_THINKING_DISPLAY_UPDATES, (e) => THINKING_DISPLAY_INPUT_REGEX.test(e)],
  [BETA_THINKING_TOKEN_COUNT, null],
]);
var BETA_REJECTION_MATCHER_KEYS = [...BETA_REJECTION_MATCHERS.keys()];
var BETA_INPUT_TAG_PATTERNS = new Map([
  [BETA_ADVISOR_TOOL, new RegExp(`^${replaced}\\d+$`)],
  [BETA_CONTEXT_MANAGEMENT, /^clear_(thinking|tool_uses)_\d+$/],
  [BETA_INLINE_TOOLS, /^tool_definition$/],
  [BETA_MID_CONV_TOOL_CHANGE, /^tool_(addition|removal)$/],
  [BETA_TOOL_SEARCH_ADVANCED, /^tool_reference$/],
  [BETA_TOOL_SEARCH, /^tool_reference$/],
]);
//@ chunk-e6aww6q8.js:1586365-1586484 layout
/**
 * 消息里的 "Input tag 'x'" 是否属于该 beta 引入的块类型。
 */
function hasRejectedInputTag(e, message) {
  let r = BETA_INPUT_TAG_PATTERNS.get(e);
  return r !== undefined && [...message.matchAll(/Input tag '([\w.-]+)'/g)].some(([, s]) => r.test(s));
}
//@ chunk-e6aww6q8.js:1586484-1586584 layout
/**
 * 错误首行以被拒的 Input tag 开头。
 */
function errorStartsWithRejectedInputTag(e, n) {
  let match = /^(?:[\w.]+: )?Input tag '[\w.-]+'/.exec(getApiErrorFirstLine(n));
  return match !== null && hasRejectedInputTag(e, match[0]);
}
//@ chunk-e6aww6q8.js:1586584-1586666 layout
/**
 * "Unexpected value(s) `a`, `b` for the `anthropic-beta`"。
 */
var UNEXPECTED_BETA_VALUES_REGEX = /Unexpected value\(s\) ((?:`[^`]+`(?:, )?)+) for the `anthropic[-_]beta`/;
//@ chunk-e6aww6q8.js:1586666-1586870 layout
/**
 * 400 中被拒的、本次发送了的 beta 列表（排除思考签名/会话绑定错误）。
 */
function getRejectedBetas(e, n) {
  if (!(e instanceof APIError) || isConversationBindingError(e) || isInvalidThinkingSignatureError(e))
    return [];
  return lls.filter(
    (r) =>
      r.header !== null &&
      !KNOWN_BETAS.has(r) &&
      n.includes(r.header) &&
      (isBetaHeaderRejected(e, r) ||
        isBetaListedAsUnexpected(e, r) ||
        (BETA_REJECTION_MATCHERS.has(r) && e.status === 400 && messageMentionsBeta(e.message, r))),
  );
}
//@ chunk-e6aww6q8.js:1586870-1587017 layout
/**
 * 该 beta 出现在 "Unexpected value(s) ... for the anthropic-beta" 列表中。
 */
function isBetaListedAsUnexpected(e, n) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    e.message.includes(n.header) &&
    UNEXPECTED_BETA_VALUES_REGEX.exec(e.message)?.[1]?.includes(`\`${n.header}\``) === true
  );
}
//@ chunk-e6aww6q8.js:1587017-1587169 layout
/**
 * 错误是否指向该 beta 被拒。
 */
function isBetaRejected(e, n) {
  return (
    e instanceof APIError &&
    !isConversationBindingError(e) &&
    !isInvalidThinkingSignatureError(e) &&
    (isBetaHeaderRejected(e, n) ||
      (e.status === 400 && messageMentionsBeta(e.message, n)) ||
      ((e.status === 400 || e.status === 422) && hasRejectedInputTag(n, e.message)))
  );
}
//@ chunk-e6aww6q8.js:1587169-1587297 layout
/**
 * beta 被拒：首行 Unexpected value(s) 列出该头、或 beta 专属匹配器命中、或 Input tag 属于该 beta。
 */
function isBetaHeaderRejected(e, n) {
  if (!(e instanceof APIError) || n.header === null) return false;
  return (
    isBetaNamedInUnexpectedValues(e, n.header) ||
    BETA_REJECTION_MATCHERS.get(n)?.(e.message) === true ||
    errorStartsWithRejectedInputTag(n, e)
  );
}
//@ chunk-e6aww6q8.js:1587297-1587424 layout
/**
 * 错误首行 Unexpected value(s) 列出该头，或带 beta_header:<名> 诊断标记。
 */
function isBetaNamedInUnexpectedValues(e, n) {
  let match = UNEXPECTED_BETA_VALUES_REGEX.exec(getApiErrorFirstLine(e));
  return (
    (match?.index === 0 && match[1]?.includes(`\`${n}\``) === true) ||
    includesWholeWord(e.message, `beta_header:${n}`)
  );
}
//@ chunk-e6aww6q8.js:1587424-1588623 layout
/**
 * 服务端拒答回退（fallbacks 参数/beta）相关 400 的子类：category_beta_header/beta_header/default_unconfigured/unsupported_primary/invalid_target/param_shape…
 */
function classifyServerFallbackError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return;
  let message = e.message;
  if (
    BETA_SERVER_SIDE_FALLBACK_CATEGORY !== null &&
    message.includes(`\`${BETA_SERVER_SIDE_FALLBACK_CATEGORY.header}`) &&
    message.includes("anthropic-beta")
  )
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
//@ chunk-e6aww6q8.js:1588623-1589365 layout
/**
 * fallback_credit_token 相关 400 子类：credit_beta_header/malformed/wrong_org/expired/invalid_model/extra_forbidden/other。
 */
function classifyFallbackCreditError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return;
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
//@ chunk-e6aww6q8.js:1589365-1589405 layout
/**
 * 消息是否提到该 beta 头。
 */
function messageMentionsBeta(message, n) {
  return isBetaHeaderNamed(message, n.header);
}
//@ chunk-e6aww6q8.js:1589405-1589646 layout
/**
 * 400/422 拒绝对话中途的 system 消息（mid_conv_system）。
 */
function isMidConversationSystemRejected(e) {
  if (
    !(e instanceof APIError) ||
    (e.status !== 400 &&
      e.status !== 422 &&
      (e.message.includes("cache_control") ||
        (mentionsAnthropicBeta(e.message, MID_CONVERSATION_SYSTEM_2026_04_07) &&
          !isBetaNamedInUnexpectedValues(e, MID_CONVERSATION_SYSTEM_2026_04_07))))
  )
    return false;
  return (
    isUnsupportedRoleError(e.message) ||
    includesWholeWord(e.message, "mid_conv_system") ||
    includesWholeWord(e.message, `beta_header:${MID_CONVERSATION_SYSTEM_2026_04_07}`)
  );
}
//@ chunk-e6aww6q8.js:1589646-1589732 layout
/**
 * 中途 system 消息被拒时解析出的具体原因。
 */
function getMidConvSystemRejection(e) {
  if (!(e instanceof APIError) || !isMidConversationSystemRejected(e)) return null;
  return parseMidConvSystemRejection(e.message) ?? null;
}
//@ chunk-e6aww6q8.js:1589732-1589771 layout
/**
 * tool_addition/removal 被拒（classifyToolChangeError 有结果）。
 */
function isToolChangeRejected(e) {
  return classifyToolChangeError(e) !== undefined;
}
//@ chunk-e6aww6q8.js:1589771-1589810 layout
/**
 * 消息内工具定义被拒（classifyInlineToolDefinitionError 有结果）。
 */
function isInlineToolDefinitionRejected(e) {
  return classifyInlineToolDefinitionError(e) !== undefined;
}
//@ chunk-e6aww6q8.js:1589810-1590322 layout
/**
 * 消息内工具定义（tool_definition）被拒原因：unsupported_on_platform/header_rejected/kind_not_enabled/name_conflict。
 */
function classifyInlineToolDefinitionError(e) {
  if (!(e instanceof APIError)) return;
  let message = e.message;
  if ((e.status === 400 || e.status === 422) && hasRejectedInputTag(BETA_INLINE_TOOLS, message))
    return "unsupported_on_platform";
  if (e.status !== 400) return;
  if (messageMentionsBeta(message, BETA_INLINE_TOOLS)) return "header_rejected";
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
//@ chunk-e6aww6q8.js:1590322-1590947 layout
/**
 * tool_addition/removal 块被拒原因：block_type_unknown/header_rejected/after_paused_turn/model_unsupported/too_many_definitions/pfc_only/unknown_tool_reference/other。
 */
function classifyToolChangeError(e) {
  if (!(e instanceof APIError)) return;
  let message = e.message;
  if ((e.status === 400 || e.status === 422) && hasRejectedInputTag(BETA_MID_CONV_TOOL_CHANGE, message))
    return "block_type_unknown";
  if (e.status !== 400) return;
  if (messageMentionsBeta(message, BETA_MID_CONV_TOOL_CHANGE)) return "header_rejected";
  if (!/\btool_addition\b/.test(message) || isCacheControlError(message)) return;
  if (message.includes("paused assistant turn")) return "after_paused_turn";
  if (message.includes("not supported on this model") || message.includes("requires a model that supports"))
    return "model_unsupported";
  if (message.includes("exceed")) return "too_many_definitions";
  if (message.includes("PFC-only")) return "pfc_only";
  if (message.includes("references") || message.includes("names a declared")) return "unknown_tool_reference";
  return "other";
}
//@ chunk-e6aww6q8.js:1590947-1591069 layout
/**
 * 400 拒绝某处 cache_control 字段。
 */
function isCacheControlFieldRejected(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  return isCacheControlError(e.message) || includesWholeWord(e.message, "cache_control_field");
}
//@ chunk-e6aww6q8.js:1591069-1591398 layout
/**
 * 400 拒绝 output_config（除 timing、结构化输出、effort 与 thinking 冲突等已单独处理的情况）。
 */
function isOutputConfigRejected(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  if (isStructuredOutputsUnsupported(e)) return false;
  if (
    getEffortRejectedWithoutThinking(e) !== null &&
    !/messages\.\d+:\s*output_config\.effort/.test(e.message)
  )
    return false;
  if (getMidConvSystemRejection(e) !== null) return false;
  let message = e.message;
  if (messageMentionsBeta(message, BETA_PER_MESSAGE_EFFORT)) return true;
  return (
    (message.includes("output_config") && !message.includes("output_config.timing")) ||
    includesWholeWord(message, "effort_unsupported")
  );
}
//@ chunk-e6aww6q8.js:1591398-1591607 layout
/**
 * 400 拒绝按轮 effort（per-turn effort）。
 */
function isPerTurnEffortRejected(e) {
  return (
    isOutputConfigRejected(e) &&
    e instanceof APIError &&
    (isBetaHeaderRejected(e, BETA_PER_MESSAGE_EFFORT) ||
      e.message.includes("requires a model that supports per-turn effort") ||
      /messages\.\d+\.output_config: Extra inputs are not permitted/.test(e.message))
  );
}
//@ chunk-e6aww6q8.js:1591607-1591726 layout
/**
 * 400 拒绝 per-turn timing beta 或 output_config.timing。
 */
function isOutputTimingRejected(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    (messageMentionsBeta(e.message, BETA_PER_TURN_TIMING) || e.message.includes("output_config.timing"))
  );
}
//@ chunk-e6aww6q8.js:1591726-1592075 layout
/**
 * 400 模型不支持 effort（effort parameter not supported / output_config.effort extra inputs）。
 */
function isEffortUnsupportedError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  if (getRejectedThinkingType(e) !== null) return false;
  let lower = e.message.toLowerCase();
  if (lower.includes("effort parameter") && lower.includes("not support")) return true;
  if (
    lower.includes("output_config") &&
    lower.includes("effort") &&
    lower.includes("extra inputs are not permitted")
  )
    return true;
  return includesWholeWord(e.message, "effort_unsupported") || isBetaHeaderRejected(e, BETA_EFFORT);
}
//@ chunk-e6aww6q8.js:1592075-1592216 layout
/**
 * 400 模型不支持结构化输出（output_config.format）。
 */
function isStructuredOutputsUnsupported(e) {
  return (
    e instanceof APIError &&
    e.status === 400 &&
    (isOutputFormatExtraInputsError(e.message) ||
      includesWholeWord(e.message, "structured_outputs_unsupported") ||
      isBetaHeaderRejected(e, BETA_STRUCTURED_OUTPUTS) ||
      isBetaListedAsUnexpected(e, BETA_STRUCTURED_OUTPUTS))
  );
}
//@ chunk-e6aww6q8.js:1592216-1592411 layout
/**
 * 400 "not created in this conversation"/"bound to a different conversation"（思考签名或缓存锚点绑定错误）。
 */
function isConversationBindingError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  let lower = e.message.toLowerCase();
  return (
    lower.includes("not created in this conversation") || lower.includes("bound to a different conversation")
  );
}
//@ chunk-e6aww6q8.js:1592411-1592472 layout
/**
 * 给错误打 prefixLockHealDeclined 标记（前缀锁自愈被放弃）。
 */
function markPrefixLockHealDeclined(e) {
  Object.assign(e, {
    prefixLockHealDeclined: true,
  });
}
//@ chunk-e6aww6q8.js:1592472-1592572 layout
/**
 * 错误带 prefixLockHealDeclined 标记。
 */
function isPrefixLockHealDeclined(e) {
  return e instanceof APIError && "prefixLockHealDeclined" in e && e.prefixLockHealDeclined === true;
}
//@ chunk-e6aww6q8.js:1592572-1593149 layout
/**
 * 解析 anthropic-thinking-prefix-mismatch 响应头为 {block:{messageIndex,blockIndex}, kind}。
 */
function parseThinkingPrefixMismatchHeader(e) {
  if (!(e instanceof APIError)) return;
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
  let match = /^messages\.(\d{1,6})\.content\.(\d{1,6})$/.exec(r.get("block") ?? "");
  let h = r.get("kind");
  let y = h !== undefined && /^[a-z_]{1,40}$/.test(h) ? h : undefined;
  if (!match && y === undefined) return;
  return {
    block: match
      ? {
          messageIndex: Number(match[1]),
          blockIndex: Number(match[2]),
        }
      : undefined,
    kind: y,
  };
}
//@ chunk-e6aww6q8.js:1593149-1593269 layout
/**
 * 400 thinking 块签名无效（触发 retry:thinking-signature-strip）。
 */
function isInvalidThinkingSignatureError(e) {
  if (!(e instanceof APIError) || e.status !== 400) return false;
  return isThinkingSignatureError(e.message) || includesWholeWord(e.message, "thinking_signature");
}
//@ chunk-e6aww6q8.js:1593269-1593498 layout
/**
 * 400 拒绝的 thinking 类型（enabled/adaptive）。
 */
function getRejectedThinkingType(e) {
  if (!(e instanceof APIError) || e.status !== 400) return null;
  let n = rejectedThinkingType(e.message);
  if (n) return n;
  if (includesWholeWord(e.message, "thinking_type:enabled")) return "enabled";
  if (includesWholeWord(e.message, "thinking_type:adaptive")) return "adaptive";
  return null;
}
//@ chunk-e6aww6q8.js:1593498-1593661 layout
/**
 * 400 "effort 'x' is not supported when thinking is disabled" 中的 effort。
 */
function getEffortRejectedWithoutThinking(e) {
  if (!(e instanceof APIError) || e.status !== 400) return null;
  return /effort '([a-z]+)' is not supported when thinking is disabled/i.exec(e.message)?.[1] ?? null;
}
//@ chunk-e6aww6q8.js:1593661-1594198 layout
/**
 * getAssistantMessageFromError 的包装：补 apiErrorStatus、requestId、apiErrorCode 与额外标注。
 */
function getAssistantMessageFromApiError(error, model, options) {
  let assistantMessageFromError = getAssistantMessageFromError(error, model, options);
  if (error instanceof APIError) {
    let L = isDlpRequestDenied(error) ? error.status : effectiveErrorStatus(error);
    if (L !== undefined) assistantMessageFromError.apiErrorStatus = L;
  } else if (error instanceof Error && error.cause instanceof APIError) {
    let L = effectiveErrorStatus(error.cause);
    if (L !== undefined) assistantMessageFromError.apiErrorStatus = L;
  }
  let h =
    error instanceof APIError
      ? error
      : error instanceof Error && error.cause instanceof APIError
        ? error.cause
        : undefined;
  let y =
    options?.requestId || (h ? amazonRequestId(h.requestID || h.error?.request_id, h.headers) : undefined);
  if (y) assistantMessageFromError.requestId = y;
  let S = apiErrorCode(h);
  if (S !== undefined) assistantMessageFromError.apiErrorCode = S;
  let w = classifyFirstPartyRequest(h, {
    model,
    text: `${getAssistantMessageText(assistantMessageFromError) ?? ""}
${assistantMessageFromError.errorDetails ?? ""}`,
  });
  if (w !== undefined) assistantMessageFromError[MESSAGE_MARK_SYMBOLS_2] = w;
  return assistantMessageFromError;
}
//@ chunk-e6aww6q8.js:1594198-1594272 layout
/**
 * 交互模式下附加 " Run /rewind to recover the conversation."。
 */
function getRewindHint() {
  return getIsNonInteractiveSession() ? "" : " Run /rewind to recover the conversation.";
}
//@ chunk-e6aww6q8.js:1594272-1610377 callgraph-witnessed = getAssistantMessageFromError (0.242)
/**
 * 把任意 API 异常转成 assistant 错误消息（Fs）：超时、图片/PDF、DLP、off-switch、额度与用量信用、1M 上下文需信用、提示词过长（可压缩时提示 /compact）、媒体、effort 与 thinking 冲突、工具配对错误、Opus 不可用、余额不足、各类认证（API key、OAuth 吊销、组织禁用、云凭证、网关）、模型不存在等，error 字段取 server_error/invalid_request/rate_limit/billing_error/authentication_failed/model_not_found/… 。
 */
function getAssistantMessageFromError(error, model, options) {
  if (isTimeoutError(error))
    return createApiErrorMessage({
      content: REQUEST_TIMED_OUT_MESSAGE,
      error: "server_error",
    });
  if (error instanceof ImageSizeError || error instanceof ImageResizeError)
    return createApiErrorMessage({
      content: getImageTooLargeErrorMessage(),
      error: "invalid_request",
      errorDetails: error.message,
    });
  if (isDlpRequestDenied(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "invalid_request",
      apiError: DLP_REQUEST_DENIED,
    });
  if (isClaudeCodeVersionTooOld(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "invalid_request",
      apiError: CLAUDE_CODE_VERSION_TOO_OLD,
    });
  let s = error instanceof APIError ? parseVerificationRequired(error.status, error.error) : undefined;
  if (s !== undefined) {
    logVerificationShown(s);
    return createApiErrorMessage({
      error: "verification_required",
      content: `${API_ERROR_MESSAGE_PREFIX}: ${s}`,
    });
  }
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
  if (error instanceof APIError && error.status === 429) {
    let L = isLimitsDisplayEnabled(isClaudeAISubscriber());
    let limits = extractQuotaStatusFromErrorHeaders(error);
    let q = creditsRequiredDetails(error);
    let Z =
      L &&
      isUsageCreditsOnlyModel(model) &&
      !isLongContextCreditsRequired(error.message) &&
      (limits?.rateLimitType === "seven_day_overage_included" || q.errorCode === "credits_required");
    if (L && limits && !Z) {
      let specificErrorMessage = getRateLimitErrorMessage(limits, model);
      if (specificErrorMessage)
        return createApiErrorMessage({
          content: specificErrorMessage,
          error: "rate_limit",
          ...(isRateLimitErrorMessage(specificErrorMessage) && {
            apiError: "usage_limit_reached",
            apiErrorParams: {
              rate_limit_info: formatOrgSpendCapError(limits),
            },
          }),
          quotaLimits: applyMockHeaders(error),
        });
      return createApiErrorMessage({
        content: NO_RESPONSE_REQUESTED,
        error: "rate_limit",
      });
    }
    if (L && isLongContextCreditsRequired(error.message) && !isLongContext1mCreditsBlocked()) {
      setLongContext1mCreditsBlocked(true);
      logEvent("tengu_1m_credits_clamp_activated", {});
      logFeatureSad("context_1m_entitlement", "credits_clamp_200k");
    }
    if (Z) {
      let Me =
        error.headers?.get?.("anthropic-ratelimit-unified-overage-disabled-reason") ??
        q.overageDisabledReason;
      let We = Me ?? getGlobalConfig().cachedExtraUsageDisabledReason;
      let ze = limits?.rateLimitType === "seven_day_overage_included";
      if (!ze && limits?.rateLimitType === undefined && Me !== "fetch_error" && Me !== "unknown")
        setUsageCreditsRequired(true);
      return createApiErrorMessage({
        content: getUsageCreditsRequiredMessage(
          We,
          ze,
          renderUsageCreditsOnlyModelName(model),
          limits?.overageScope,
        ),
        error: "rate_limit",
        apiError: "model_requires_usage_credits",
        apiErrorParams: {
          rate_limit_info: formatOrgSpendCapError({
            status: "rejected",
            unifiedRateLimitFallbackAvailable: false,
            isUsingOverage: false,
            ...q,
            ...limits,
          }),
        },
        errorDetails: error.message,
      });
    }
    if (L && isLongContextCreditsRequired(error.message)) {
      let modelSwitchHint = getModelSwitchHint();
      let usageCreditsCommand = getUsageCreditsCommand();
      let ze = getIsNonInteractiveSession()
        ? "they take effect in a new session"
        : "they take effect after you restart Claude Code";
      let lt =
        canSuggestSlashCommands() && usageCreditsCommand
          ? `run ${usageCreditsCommand} to turn them on (${ze})${modelSwitchHint ? `, or ${modelSwitchHint} to switch to standard context` : ""}`
          : canSuggestSlashCommands() && modelSwitchHint
            ? `run ${modelSwitchHint} to switch to standard context`
            : `${getTurnOnUsageCreditsStep()} (${ze})${modelSwitchHint ? `, or use ${modelSwitchHint} to switch to standard context` : ""}`;
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: Usage credits required for 1M context \xB7 ${lt}`,
        error: "rate_limit",
        apiError: "long_context_credits_required",
        errorDetails: error.message,
      });
    }
    let stripped = error.message.replace(/^429\s+/, "");
    let ke;
    let we;
    try {
      let Me = jsonParse(stripped);
      let message = Me?.error?.message ?? Me?.message;
      if (typeof message === "string") ke = message;
    } catch {
      let Me = sanitizeAPIError(error);
      if (Me !== error.message) we = Me.replace(/^429(\s+|$)/, "");
    }
    let Ee = we ?? (ke || stripped);
    if (L && error.headers?.get?.("anthropic-ratelimit-unified-overage-disabled-reason")) {
      let Me = `${API_ERROR_MESSAGE_PREFIX}: Request rejected (429)${we ? ` \xB7 ${we}` : ""}`;
      return createApiErrorMessage({
        content: we === undefined ? Ee : Me,
        error: "rate_limit",
      });
    }
    let Ae = L ? SERVER_RATE_LIMITED_MESSAGE : "Request rejected (429)";
    let baseMessage = `this may be a temporary capacity issue.${getStatusPageHint()}`;
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
    let effortRejectedWithoutThinking = getEffortRejectedWithoutThinking(error);
    if (effortRejectedWithoutThinking !== null && error instanceof Error) {
      let G = isArtifactMountMode()
        ? "you can lower effort to High"
        : getIsNonInteractiveSession()
          ? "use --effort high (or the effortLevel setting)"
          : "run /effort high to continue";
      let q = shouldEnableThinkingByDefault();
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: Effort '${effortRejectedWithoutThinking}' isn't available with thinking turned off on this model \xB7 ${G}, or turn thinking back on (${q === "MAX_THINKING_TOKENS" ? "unset MAX_THINKING_TOKENS=0" : q === "alwaysThinkingEnabled" ? 'remove "alwaysThinkingEnabled": false from settings' : "start the session without thinking disabled"})`,
        error: "invalid_request",
        apiError: "effort_requires_thinking",
        apiErrorParams: {
          effort: effortRejectedWithoutThinking,
        },
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
    let mediaErrorFromApiError = getMediaErrorFromApiError(error);
    if (mediaErrorFromApiError && error instanceof Error)
      return createApiErrorMessage({
        ...buildMediaRemovedError(mediaErrorFromApiError.kind, error.message),
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
    if (isContextWindowError(error.message) || includesWholeWord(error.message, "prompt_too_long"))
      return createApiErrorMessage({
        content: PROMPT_TOO_LONG_ERROR_MESSAGE,
        error: "invalid_request",
        errorDetails: error.message,
      });
    if (parseRequestTooLargeError(error.error) && options?.messagesForAPI && isOfficialFirstPartyEndpoint()) {
      let G = measureRejectedConversation({
        messagesForAPI: options.messagesForAPI,
      });
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
      content: requestTooLargeWithLimitText(),
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
      content: requestTooLargeText(),
      error: "invalid_request",
      errorDetails: `request_too_large: ${error.message}`,
    });
  }
  if (isToolUseWithoutResultError(error)) {
    if (options?.messages && options?.messagesForAPI) {
      let match = error.message.match(/toolu_[A-Za-z0-9_]+/);
      let toolUseId = match ? match[0] : null;
      if (toolUseId) logToolUseToolResultMismatch(toolUseId, options.messages, options.messagesForAPI);
    }
    return createApiErrorMessage({
      content: `API Error: 400 due to tool use concurrency issues.${getRewindHint()}`,
      error: "invalid_request",
      apiError: "tool_history_mismatch",
    });
  }
  if (isUnexpectedToolResultError(error)) {
    logEvent("tengu_unexpected_tool_result", {});
    return createApiErrorMessage({
      content: `API Error: 400 orphaned tool_result in conversation history.${getRewindHint()}`,
      error: "invalid_request",
      apiError: "tool_history_mismatch",
      errorDetails: error.message,
    });
  }
  if (isDuplicateToolUseIdError(error)) {
    logEvent("tengu_duplicate_tool_use_id", {});
    return createApiErrorMessage({
      content: `API Error: 400 duplicate tool_use ID in conversation history.${getRewindHint()}`,
      error: "invalid_request",
      apiError: "tool_history_mismatch",
      errorDetails: error.message,
    });
  }
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
    return createApiErrorMessage({
      content: CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
      error: "billing_error",
    });
  if (error instanceof APIError && error.status === 400 && isOrganizationDisabled(error)) {
    let { source } = getAnthropicApiKeyWithSource();
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
    error instanceof APIError &&
    (error.status === 401 || error.status === 403) &&
    getAPIProvider() === "firstParty" &&
    isApiKeyHelperTheActiveCredential()
  ) {
    if (getApiKeyHelperLastFailure())
      return createApiErrorMessage({
        error: "invalid_request",
        content: API_KEY_HELPER_FAILING_MESSAGE,
      });
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
      apiError: error.isUserSupplied && error.header !== "other" ? "invalid_credential_header" : undefined,
      content: `${L} \xB7 ${error.message}`,
    });
  }
  if (isApiKeyHeaderError(error)) {
    if (isRemoteSession())
      return createApiErrorMessage({
        error: "authentication_failed",
        content: AUTH_NETWORK_ERROR_MESSAGE,
      });
    if (getAPIProvider() === "gateway")
      return createApiErrorMessage({
        error: "invalid_request",
        content: GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
      });
    if (isWithheldGatewayBgSession())
      return createApiErrorMessage({
        error: "invalid_request",
        content: noGatewayErrorMessage(),
      });
    let { source } = getAnthropicApiKeyWithSource();
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
      oauthRefreshDiskFull: true,
    };
  if (error instanceof StoredLoginHeldBackError)
    return createApiErrorMessage({
      error: "invalid_request",
      apiError: "stored_login_refused",
      content: error.message,
    });
  let h = error instanceof OAuthAccountOnHoldError ? error : getWIFAccountOnHold(error);
  if (h)
    return createApiErrorMessage({
      error: "account_on_hold",
      content: withOnHoldDetails(h.url),
    });
  if (isWIFUserOAuthDeadError(error))
    return createApiErrorMessage({
      error: "invalid_request",
      content: wouldWIFProfileYieldToClaudeAILogin()
        ? LOGIN_OR_PROFILE_EXPIRED_MESSAGE
        : ANTHROPIC_PROFILE_LOGIN_EXPIRED_MESSAGE,
    });
  if (isOAuthTokenRevokedError(error))
    return createApiErrorMessage({
      error: "authentication_failed",
      content: getTokenRevokedMessage(),
    });
  if (isOAuthOrgNotAllowedError(error))
    return createApiErrorMessage({
      error: "oauth_org_not_allowed",
      content: getSubscriptionUnavailableMessage(),
    });
  if (
    error instanceof APIError &&
    error.status === 403 &&
    error.message.toLowerCase().includes("api key authentication is disabled")
  ) {
    let { source } = getAnthropicApiKeyWithSource();
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
  if (error instanceof APIError && (error.status === 401 || error.status === 403)) {
    if (isRemoteSession()) {
      let q = error.status === 403 ? extractNestedErrorMessage(error) : null;
      let Z = `${error.status} `;
      let baseMsg = `${API_ERROR_MESSAGE_PREFIX}: ${Z}`;
      let ke = q && printableName(q, API_ERROR_CONST_1000 - baseMsg.length - 1);
      return createApiErrorMessage({
        error: "authentication_failed",
        content: ke ? baseMsg + (ke.startsWith(Z) ? ke.slice(Z.length) : ke) : AUTH_NETWORK_ERROR_MESSAGE,
      });
    }
    let L = formatAPIError(error);
    let apiProvider = getAPIProvider();
    if (apiProvider === "bedrock" || apiProvider === "anthropicAws" || apiProvider === "mantle") {
      let q =
        !isAwsAuthRefreshFromProjectSettings() || isProjectScopeTrustAccepted()
          ? getConfiguredAwsAuthRefresh()
          : undefined;
      let providerForModel = getProviderForModel(model);
      let Se = error.status === 401 && (providerForModel === "anthropicAws" || providerForModel === "mantle");
      let ke = Se ? AWS_CREDENTIALS_INVALID : AWS_AUTH_FAILED;
      let we = isBedrockModelIdError(error);
      let Ee;
      let Ae;
      if (we) {
        let modelSwitchHint = getModelSwitchHint();
        Ee = ` \xB7 enable this model for your account and region in the Amazon Bedrock console${modelSwitchHint ? `, or run ${modelSwitchHint} to pick another model` : ""}`;
        Ae = "model_access";
      } else if (isHostManagedProviderAuth()) {
        Ee = MANAGED_CREDENTIALS_SUFFIX;
        Ae = "host_managed";
      } else if (q) {
        Ee = getIsNonInteractiveSession()
          ? ` \xB7 run \`${q}\` and retry`
          : ` \xB7 run /login and select "${THIRD_PARTY_PROVIDER_LABELS.anthropicAws} \xB7 refresh credentials", or run \`${q}\` in another terminal`;
        Ae = "refresh_command";
      } else {
        Ee =
          " \xB7 refresh your AWS credentials (SSO sign-in, access keys, API key or proxy token) and retry";
        Ae = "refresh_credentials";
      }
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: {
          provider: providerForModel === "mantle" ? "mantle" : apiProvider,
          remedy: Ae,
        },
        content: `${ke}${Ee}${Se || we ? "" : " \xB7 if credentials are current, check AWS permissions and model access"} \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (apiProvider === "anthropicGoogleCloud" || apiProvider === "vertex") {
      let Z =
        !(apiProvider === "vertex"
          ? env.CLAUDE_CODE_SKIP_VERTEX_AUTH
          : env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH) && !isHostManagedProviderAuth();
      let Se =
        Z && (!isGcpAuthRefreshFromProjectSettings() || isProjectScopeTrustAccepted())
          ? getConfiguredGcpAuthRefresh()
          : undefined;
      let ke = error.status === 401;
      let we = ke ? GCP_CREDENTIALS_INVALID : GCP_AUTH_FAILED;
      let Ee;
      let Ae;
      if (Se) {
        Ee = ` \xB7 run \`${Se}\` and retry`;
        Ae = "refresh_command";
      } else if (Z) {
        Ee =
          " \xB7 refresh your Google Cloud credentials (application default sign-in, or the key file in GOOGLE_APPLICATION_CREDENTIALS) and retry";
        Ae = "adc";
      } else if (isHostManagedProviderAuth()) {
        Ee = MANAGED_CREDENTIALS_SUFFIX;
        Ae = "host_managed";
      } else {
        Ee =
          " \xB7 refresh the gateway token provided via ANTHROPIC_AUTH_TOKEN/ANTHROPIC_CUSTOM_HEADERS and retry";
        Ae = "gateway_token";
      }
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: {
          provider: apiProvider,
          remedy: Ae,
        },
        content: `${we}${Ee}${ke ? "" : apiProvider === "vertex" ? " \xB7 if credentials are current, check GCP IAM permissions and Vertex AI model access" : " \xB7 if credentials are current, check GCP IAM permissions and workspace access"} \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (apiProvider === "foundry") {
      let q = isHostManagedProviderAuth();
      return createApiErrorMessage({
        error: "authentication_failed",
        apiError: "provider_credentials",
        apiErrorParams: {
          provider: apiProvider,
          remedy: q ? "host_managed" : "refresh_credentials",
        },
        content: `${FOUNDRY_AUTH_FAILED}${q ? MANAGED_CREDENTIALS_SUFFIX : " \xB7 refresh your Foundry credential (ANTHROPIC_FOUNDRY_AUTH_TOKEN, ANTHROPIC_FOUNDRY_API_KEY, Azure sign-in for Entra, or your proxy token) and retry"} \xB7 if credentials are current, check access to the Foundry resource \xB7 ${API_ERROR_MESSAGE_PREFIX}: ${L}`,
      });
    }
    if (apiProvider === "gateway" && error.status === 403)
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
    let modelSwitchHint = getModelSwitchHint();
    let fallbackSuggestion = suggestThirdPartyModel(model);
    return createApiErrorMessage({
      content: fallbackSuggestion
        ? `${API_ERROR_MESSAGE_PREFIX} (${model}): ${error.message}.${modelSwitchHint ? ` Try ${modelSwitchHint} to switch to ${fallbackSuggestion}.` : ` Try switching to ${fallbackSuggestion}.`}`
        : `${API_ERROR_MESSAGE_PREFIX} (${model}): ${error.message}.${modelSwitchHint ? ` Run ${modelSwitchHint} to pick a different model.` : ""}`,
      error: "model_not_found",
    });
  }
  if (error instanceof APIError && error.status === 404) {
    let modelSwitchHint = getModelSwitchHint();
    let G = suggestThirdPartyModel(model);
    return createApiErrorMessage({
      content: G
        ? `The model ${model} is not available on your ${getAPIProvider()} deployment. ${modelSwitchHint ? `Try ${modelSwitchHint} to switch to ${G}` : `Try switching to ${G}`}, or ask your admin to enable this model.`
        : `There's an issue with the selected model (${model}). It may not exist or you may not have access to it.${modelSwitchHint ? ` Run ${modelSwitchHint} to pick a different model.` : ""}`,
      error: "model_not_found",
    });
  }
  let statusPageHint = getStatusPageHint();
  if (isRepeated529Error(error))
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${REPEATED_529_MESSAGE}. The API is at capacity \u2014 this is usually temporary. Try again in a moment.${statusPageHint}`,
      error: "server_error",
    });
  if (error instanceof APIError && typeof error.status === "number" && error.status >= 500) {
    let replaced = formatAPIError(error).replace(/[.!?\u2026]+$/, "");
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${replaced}. This is a server-side issue, usually temporary \u2014 try again in a moment.${statusPageHint}`,
      error: "server_error",
    });
  }
  let cloudCredentialErrorProvider = getCloudCredentialErrorProvider(error);
  if (cloudCredentialErrorProvider !== null) {
    let replaced = (error instanceof APIError ? formatAPIError(error) : errorMessage(error))
      .trimEnd()
      .replace(/[.!?\u2026]+$/, "");
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: Could not load ${cloudCredentialErrorProvider} credentials \xB7 ${replaced}. Check or refresh your ${cloudCredentialErrorProvider} credentials and try again.`,
      error: "cloud_credential_error",
      apiErrorIsTransient: true,
    });
  }
  if (error instanceof APIConnectionError) {
    let streamNoResponseError = findStreamNoResponseError(error);
    if (streamNoResponseError) {
      let { escalated, firstWindowMs, retryWindowMs } = streamNoResponseError.deadline;
      let Ae = escalated
        ? `waited ${formatDurationCoarse(firstWindowMs)}, then ${formatDurationCoarse(retryWindowMs)} on the retry`
        : `waited ${formatDurationCoarse(firstWindowMs)}`;
      return createApiErrorMessage({
        content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)} (${Ae})${isDisklessProcess() ? "" : ". If a proxy or gateway on your network holds responses until they complete, raise API_TIMEOUT_MS or CLAUDE_STREAM_FIRST_BYTE_TIMEOUT_MS to wait longer."}`,
        error: "server_error",
        apiError: "no_response",
      });
    }
    let code = extractConnectionErrorDetails(error)?.code ?? "";
    let q;
    if (STRICT_SSL_ERROR_CODES.has(code)) q = "tls_untrusted_ca";
    else if (code === "BedrockUnexpectedContentType") q = "gateway_content_type";
    else if (isStreamSuspendedError(error)) q = isDisklessProcess() ? undefined : "computer_slept";
    else if (isConnectionError(error)) q = "connection_failed";
    let fallbackSuggestion = formatAPIError(error);
    let Se = "";
    if (
      fallbackSuggestion === `${CONNECTION_DROPPED_MESSAGE} (${code})` &&
      !isRemoteSession() &&
      getAPIProvider() === "firstParty" &&
      env.ANTHROPIC_UNIX_SOCKET === undefined
    ) {
      let proxyUrlWithSource = getProxyUrlWithSource();
      let we = [
        ...(proxyUrlWithSource && !shouldBypassProxy_2(getApiBaseUrl())
          ? [`the proxy set in ${proxyUrlWithSource.source}`]
          : []),
        ...(configuredApiProxyHost() !== undefined ? ["the gateway set in ANTHROPIC_BASE_URL"] : []),
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
  if (error instanceof APIError)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${formatAPIError(error)}`,
      error: "unknown",
    });
  let connectionErrorDetails = extractConnectionErrorDetails(error);
  if (
    connectionErrorDetails &&
    (TRANSIENT_SOCKET_CODES.has(connectionErrorDetails.code) ||
      UNREACHABLE_ERROR_CODES.has(connectionErrorDetails.code))
  )
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: Connection to the API was lost (${connectionErrorDetails.code}). This is usually temporary \u2014 try again.`,
      error: "server_error",
      apiError:
        isStreamSuspendedError(error) && !isDisklessProcess()
          ? "computer_slept"
          : isConnectionError(error)
            ? "connection_failed"
            : undefined,
    });
  if (error instanceof FoundryCapabilityError)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
      apiError: error.reason === "signin_required" ? "gateway_signin_required" : "gateway_session_expired",
      ...(error.reason === "token_expired" && {
        apiErrorParams: {
          provider: "gateway",
          remedy: "gateway_token",
        },
      }),
    });
  if (error instanceof HostManagedNoCredsError) {
    let providerForModel = getProviderForModel(model);
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
      ...(providerForModel !== "firstParty" && {
        apiError: "provider_credentials",
        apiErrorParams: {
          provider: providerForModel,
          remedy: "host_managed",
        },
      }),
    });
  }
  if (error instanceof Error)
    return createApiErrorMessage({
      content: `${API_ERROR_MESSAGE_PREFIX}: ${error.message}`,
      error: "unknown",
    });
  return createApiErrorMessage({
    content: API_ERROR_MESSAGE_PREFIX,
    error: "unknown",
  });
}
//@ chunk-e6aww6q8.js:1610377-1610419 layout
/**
 * 交互或允许斜杠命令时可提示 /compact 等。
 */
function canSuggestSlashCommands() {
  return (!getIsNonInteractiveSession() || isArtifactMountMode()) && !getDisableSlashCommands();
}
//@ chunk-e6aww6q8.js:1610419-1610598 layout
/**
 * 413 request_too_large 时尝试测量被拒会话大小，失败记日志。
 */
function measureRejectedConversation(e) {
  try {
    return measureRejectedRequest(e);
  } catch (error) {
    logForDebugging(
      `413 request_too_large: could not measure the rejected conversation (${errorMessage(error)}); keeping the generic handling`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:1610598-1610765 layout
/**
 * 换模型提示用 /model 或 --model（SDK/GitHub Action 场景）。
 */
function getModelSwitchHint() {
  if (!getIsNonInteractiveSession()) return getDisableSlashCommands() ? undefined : "/model";
  let entrypointKind = getEntrypointKind();
  if (entrypointKind === "sdk-cli" || entrypointKind === "claude-code-github-action") return "--model";
  if (isHostEntrypoint() && !isArtifactMountMode()) return "--model";
  return;
}
//@ chunk-e6aww6q8.js:1610765-1610844 layout
/**
 * "Not sent: no API attempts left"：本轮 API 尝试预算耗尽。
 */
class NoApiAttemptsLeftError extends Error {
  constructor() {
    super("Not sent: no API attempts left");
  }
}
//@ chunk-e6aww6q8.js:1610844-1615671 fingerprint = classifyAPIError (0.405)
/**
 * 遥测用 API 错误分类：aborted/api_timeout/repeated_529/rate_limit/server_overload/prompt_too_long/pdf_*\/image_*\/tool_use_mismatch/invalid_model/credit_balance_low/invalid_api_key/token_revoked/auth_error/ssl_cert_error/connection_error/unknown 等约 60 类。
 */
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
  if (isDlpRequestDenied(error)) return DLP_REQUEST_DENIED;
  if (isClaudeCodeVersionTooOld(error)) return CLAUDE_CODE_VERSION_TOO_OLD;
  if (isVerificationRequiredError(error)) return "verification_required";
  if (isRepeated529Error(error)) return "repeated_529";
  if (
    error instanceof Error &&
    (error.message.includes(OPUS_HIGH_LOAD_MESSAGE) || error.message.includes(FABLE_HIGH_LOAD_MESSAGE))
  )
    return "capacity_off_switch";
  if (error instanceof APIError && error.status === 429) return "rate_limit";
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
  if (error instanceof APIError && error.status === 400 && error.message.includes("Could not process image"))
    return "image_unprocessable";
  if (
    error instanceof APIError &&
    error.status === 400 &&
    /\btools\.\d+\.(?:custom\.)?input_schema\b/.test(error.message)
  )
    return "tool_schema_invalid";
  if (error instanceof APIError && error.status === 400) {
    if (includesWholeWord(error.message, "image_block")) return "image_unprocessable";
    if (includesWholeWord(error.message, "document_block")) return "document_unprocessable";
    if (includesWholeWord(error.message, "media_budget")) return "media_budget_exceeded";
    if (includesWholeWord(error.message, "thinking_signature")) return "invalid_thinking_signature";
  }
  if (isRequestTooLargeError(error))
    return isContextWindowError(error.message) || includesWholeWord(error.message, "prompt_too_long")
      ? "prompt_too_long"
      : "request_too_large";
  if (isInputTooLongError(error)) return "request_too_large";
  if (isToolUseWithoutResultError(error)) return "tool_use_mismatch";
  if (isUnexpectedToolResultError(error)) return "unexpected_tool_result";
  if (isDuplicateToolUseIdError(error)) return "duplicate_tool_use_id";
  if (isInvalidModelNameError(error)) return "invalid_model";
  if (
    error instanceof APIError &&
    error.status === 404 &&
    error.message.includes("not_found_error") &&
    error.message.includes('"model: ')
  )
    return "model_not_found";
  if (
    error instanceof APIError &&
    error.status === 400 &&
    /invalid `?signature`? in `?thinking`? block/i.test(error.message)
  )
    return "invalid_thinking_signature";
  if (
    error instanceof APIError &&
    error.status === 400 &&
    (error.message.includes("text content blocks must be non-empty") ||
      error.message.includes("text content blocks must contain non-whitespace text"))
  )
    return "empty_text_block";
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes("diagnostics.previous_message_id")
  )
    return "previous_message_id_invalid";
  if (
    error instanceof APIError &&
    error.status === 400 &&
    error.message.includes(".tool_use_id") &&
    error.message.includes("String should match pattern")
  )
    return "tool_use_id_invalid";
  if (error instanceof APIError && error.status === 400 && error.message.includes("Grammar compilation"))
    return "grammar_compile_error";
  if (
    error instanceof APIError &&
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
  if (error instanceof APIError && (error.status === 401 || error.status === 403)) return "auth_error";
  if (isBedrockModelIdError(error)) return "bedrock_model_access";
  if (isRequestTooLargeError_2(error)) return "output_content_filtered";
  if (error instanceof WorkloadIdentityError) return "wif_credential_error";
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
    error instanceof APIError &&
    error.status === 400 &&
    /`?(thinking|redacted_thinking)`?\s+(or\s+`?redacted_thinking`?\s+)?blocks?\s+.{0,60}cannot be modified/i.test(
      error.message,
    )
  )
    return "thinking_blocks_modified";
  if (error instanceof APIError && error.status === undefined && error.type)
    return `in_band_${normalizeApiErrorTypeDiag(error.type)}`;
  if (error instanceof APIError) {
    let status = error.status;
    if (status >= 500) return "server_error";
    if (status >= 400) return "client_error";
  }
  if (error instanceof APIConnectionError) {
    if (extractConnectionErrorDetails(error)?.isSSLError) return "ssl_cert_error";
    return "connection_error";
  }
  let connectionDetails = extractConnectionErrorDetails(error);
  if (
    connectionDetails &&
    (TRANSIENT_SOCKET_CODES.has(connectionDetails.code) ||
      UNREACHABLE_ERROR_CODES.has(connectionDetails.code))
  )
    return "connection_error";
  return "unknown";
}
//@ chunk-e6aww6q8.js:1615671-1616007 fingerprint = categorizeRetryableAPIError (0.752)
/**
 * 可重试错误的粗分类：overloaded/rate_limit/authentication_failed/server_error/cloud_credential_error/unknown。
 */
function categorizeRetryableAPIError(error) {
  if (error.status === 529 || error.message?.includes('"type":"overloaded_error"')) return "overloaded";
  if (error.status === 429) return "rate_limit";
  if (error.status === 401 || error.status === 403) return "authentication_failed";
  if (error.status !== undefined && error.status >= 408) return "server_error";
  if (error.isCloudCredentialError) return "cloud_credential_error";
  return "unknown";
}
//@ chunk-e6aww6q8.js:1616007-1617851 placement
/**
 * stop_reason=refusal 时生成拒答提示消息（安全策略链接、类别说明、换模型提示），记 tengu_refusal_api_response。
 */
function getRefusalMessage(e, n, requestId, s, id) {
  if (e !== "refusal") return;
  let y = n?.explanation?.trimEnd() ?? null;
  logEvent("tengu_refusal_api_response", {
    has_explanation: Boolean(y),
    category: n?.category ? fromEnum(normalizeRefusalCategory(n.category)) : undefined,
    request_id: sanitizeMarkName(requestId) || undefined,
    convolute_arcades: hasConvoluteArcadesFlag(),
    arm_source: fromEnum(getFallbackLatchKind()),
    ...false,
  });
  let S = s != null && hasRefusalFallbackTarget(s) ? renderModelName(s) : undefined;
  let w;
  if (S !== undefined) {
    let isNonInteractiveSession = getIsNonInteractiveSession();
    let we = isNonInteractiveSession
      ? "Try rephrasing the request in a new session or change your model."
      : "Double press esc to edit your last message, or try a different model with /model.";
    let Ee = formatCyberVerificationRefusal(
      isNonInteractiveSession ? `Learn more: ${getSafeguardsArticleUrl(s)}` : buildSafeguardsLearnMore(s),
      getSafeguardsArticleUrl(s),
      n,
    );
    let Ae = formatSafeguardLead(S, s, n?.category, " (https://www.anthropic.com/legal/aup)");
    let Ie =
      Ae ??
      (isHardRefusalCategory(n?.category)
        ? `${S}'s safeguards flagged this message (https://www.anthropic.com/legal/aup). ${SAFEGUARD_CATEGORY_LEADS[n.category]}`
        : `${S}'s safeguards flagged this message (https://www.anthropic.com/legal/aup). This sometimes happens with safe, normal conversations.`);
    let Me = isDisklessProcess() ? "Claude" : "Claude Code";
    let We =
      Ae === undefined
        ? `${Me} can't respond to this message with ${S}.`
        : `${Me} can't respond to your last message with ${S}.`;
    w = `${API_ERROR_MESSAGE_PREFIX}: ${Ie} ${We}

${we}

${Ee}`;
  } else {
    let isNonInteractiveSession = getIsNonInteractiveSession();
    let we = s != null ? renderModelName(s) : "This model";
    if (n?.category === "cyber" && usesFirstPartyModelIds()) {
      let Ee = formatCyberVerificationRefusal(
        isNonInteractiveSession || !isFeedbackAllowed()
          ? `Learn more: ${CYBER_SAFEGUARDS_URL}`
          : `Send feedback with /feedback or learn more: ${CYBER_SAFEGUARDS_URL}`,
        CYBER_SAFEGUARDS_URL,
        n,
      );
      w = `${API_ERROR_MESSAGE_PREFIX}: ${we}'s safeguards flagged this message. ${SAFEGUARDS_BROAD_NOTE} ${Ee}`;
    } else {
      let Ee = s != null ? renderModelName(s) : "Claude";
      let Ae =
        isNonInteractiveSession || !isFeedbackAllowed()
          ? "Learn more: https://www.anthropic.com/legal/aup"
          : "Send feedback with /feedback or learn more: https://www.anthropic.com/legal/aup";
      w = `${API_ERROR_MESSAGE_PREFIX}: ${Ee} can't help with this. Start a new session to continue.

${Ae}`;
    }
  }
  let L = formatRefusalDetails(n?.category);
  let G = sanitizeRequestId(requestId);
  let q = sanitizeRequestId(id);
  let Z =
    (G !== undefined
      ? `

Request ID: ${G}`
      : "") +
    (q !== undefined
      ? `

Message ID: ${q}`
      : "");
  let apiErrorMessage = createApiErrorMessage({
    content: w + L + Z,
    error: "invalid_request",
  });
  apiErrorMessage.requestId = requestId ?? undefined;
  apiErrorMessage.refusedMessageId = q;
  apiErrorMessage.message.stop_reason = "refusal";
  apiErrorMessage.message.stop_details = n ?? null;
  return apiErrorMessage;
}
//@ chunk-e6aww6q8.js:1617851-1619647 placement
/**
 * 需要用量信用/达到消费上限时的文案（Fable 限额、组织/频道/团队预算），SDK 与交互模式不同。
 */
function getUsageCreditsRequiredMessage(e, n, r, overageScope) {
  let h = n && firstWord(r) === "Fable" ? "You've reached your Fable limit." : `${r} requires usage credits.`;
  let y =
    overageScope === "channel"
      ? "You've hit your channel's monthly spend limit."
      : "You've hit your monthly spend limit.";
  if (getIsNonInteractiveSession()) {
    let subscriptionType = getSubscriptionType();
    let G =
      subscriptionType === "team" || subscriptionType === "enterprise"
        ? HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE
        : USAGE_SETTINGS_URL;
    let q = isConsumerPlan() ? `, or manage usage credits at ${G},` : "";
    if (overageScope === "group_pool")
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
  if (overageScope === "group_pool")
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
//@ chunk-e6aww6q8.js:1619647-1619784 placement
/**
 * "Usage credits are required for long context"。
 */
function isLongContextCreditsRequired(message) {
  return (
    message.includes("Extra usage is required for long context") ||
    message.includes("Usage credits are required for long context")
  );
}
//@ chunk-e6aww6q8.js:1619784-1619885 placement = isMediaSizeErrorMessage (1)
/**
 * API 错误消息详情是长上下文需信用。旧版名错配。
 */
function isLongContextCreditsRequiredMessage(msg) {
  return (
    isLongContext1mCreditsBlocked() &&
    msg.isApiErrorMessage === true &&
    msg.errorDetails !== undefined &&
    isLongContextCreditsRequired(msg.errorDetails)
  );
}
//@ chunk-e6aww6q8.js:1619885-1619959 placement
/**
 * 只接受 [A-Za-z0-9_-]{1,255}。
 */
function sanitizeRequestId(e) {
  return e != null && /^[A-Za-z0-9_-]{1,255}$/.test(e) ? e : undefined;
}
//@ chunk-e6aww6q8.js:1619959-1619976 placement
/**
 * 导出常量或表 `RATE_LIMIT_RESET_MAX_MS`：值为 86400000。
 */
var RATE_LIMIT_RESET_MAX_MS = 86400000;
//@ chunk-e6aww6q8.js:1619976-1620114 placement
/**
 * 判断限流状态是否可自动恢复：已拒绝、有有效重置时间且未在使用超额。
 */
function isAutoResumableLimit(e) {
  return (
    e.status === "rejected" &&
    e.resetsAt !== undefined &&
    Number.isFinite(e.resetsAt) &&
    e.isUsingOverage !== true &&
    e.overageInUse !== true
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
    return this.#e?.() ?? false;
  }
}
//@ chunk-e6aww6q8.js:1620226-1620253 placement
/**
 * 导出函数 `intentProviderSlot`。
 */
var intentProviderSlot = new HostScoped(() => new IntentProvider());
//@ chunk-gr2vfhah.js:1029-1081 fingerprint = API_ERROR_MESSAGE_PREFIX (0.667)
/**
 * "API Error"；TBe=1000；d$="Prompt is too long"。
 */
var API_ERROR_MESSAGE_PREFIX = "API Error";
var API_ERROR_CONST_1000 = 1000;
var PROMPT_TOO_LONG_ERROR_MESSAGE = "Prompt is too long";
//@ chunk-gr2vfhah.js:1081-1242 callgraph-fingerprint = isPromptTooLongMessage (1)
/**
 * assistant API 错误消息的文本以 "Prompt is too long" 开头。
 */
function isPromptTooLongMessage_2(msg) {
  if (!msg.isApiErrorMessage) return false;
  let content = msg.message.content;
  if (!Array.isArray(content)) return false;
  return content.some(
    (block) => block.type === "text" && block.text.startsWith(PROMPT_TOO_LONG_ERROR_MESSAGE),
  );
}
//@ chunk-gr2vfhah.js:2086-2183 placement
function isHeaderlessDecline503(e) {
  return e instanceof APIError && e.status === 503 && e.headers?.get("x-should-retry") === "false";
}
//@ chunk-gr2vfhah.js:2183-2265 placement
/**
 * 导出函数 `headerlessDeclineKind`：参数 e，返回 d(e) ? lit("headerless_decline") : lit("headerless_retryable_503")。
 */
function headerlessDeclineKind(e) {
  return isHeaderlessDecline503(e) ? lit("headerless_decline") : lit("headerless_retryable_503");
}
//@ chunk-gr2vfhah.js:2265-2301 placement
/**
 * 导出函数 `headerlessDeclineRetryDelay`：参数 e，返回 d(e) ? 0 : getRetryDelay(1)。
 */
function headerlessDeclineRetryDelay(e) {
  return isHeaderlessDecline503(e) ? 0 : getRetryDelay(1);
}
//@ chunk-gr2vfhah.js:2301-2424 placement
function isRateLimitError(e) {
  if (!(e instanceof APIError)) return false;
  return e.status === 429 || (e.message?.includes('"type":"rate_limit_error"') ?? false);
}
//@ chunk-gr2vfhah.js:2424-2506 placement
/**
 * 导出函数 `isNonRetryable4xx`：参数 e，返回 e >= 400 && e < 500 && e !== 401 && e !== 408 && e !== 409 && e !== 429 && e !== 451。
 */
function isNonRetryable4xx(e) {
  return e >= 400 && e < 500 && e !== 401 && e !== 408 && e !== 409 && e !== 429 && e !== 451;
}
//@ chunk-gr2vfhah.js:2506-2535 placement
var DLP_REQUEST_DENIED = "dlp_request_denied";
//@ chunk-gr2vfhah.js:2535-2571 placement
/**
 * 导出函数 `isDlpRequestDenied`：参数 e，返回 getApiErrorCode(e) === DLP_REQUEST_DENIED。
 */
function isDlpRequestDenied(error) {
  return getApiErrorCode(error) === DLP_REQUEST_DENIED;
}
//@ chunk-gr2vfhah.js:2571-2606 placement
var EXTRA_USAGE_OUT_OF_CREDITS = "extra_usage_out_of_credits";
//@ chunk-gr2vfhah.js:2606-2640 placement
/**
 * 导出函数 `isExtraUsageOutOfCredits`：参数 e，返回 getApiErrorCode(e) === EXTRA_USAGE_OUT_OF_CREDITS。
 */
function isExtraUsageOutOfCredits(e) {
  return getApiErrorCode(e) === EXTRA_USAGE_OUT_OF_CREDITS;
}
//@ chunk-gr2vfhah.js:2640-2757 placement
/**
 * 判断错误是否为 400 policy_blocked。
 */
function isPolicyBlockedError(e) {
  if (!(e instanceof APIError) || e.status !== 400 || !hasNestedError(e)) return false;
  return e.error?.error?.type === "policy_blocked";
}
//@ chunk-gr2vfhah.js:2757-2795 placement
var CLAUDE_CODE_VERSION_TOO_OLD = "claude_code_version_too_old";
//@ chunk-gr2vfhah.js:2795-2831 placement
/**
 * 导出函数 `isClaudeCodeVersionTooOld`：参数 e，返回 getApiErrorCode(e) === CLAUDE_CODE_VERSION_TOO_OLD。
 */
function isClaudeCodeVersionTooOld(error) {
  return getApiErrorCode(error) === CLAUDE_CODE_VERSION_TOO_OLD;
}
//@ chunk-gr2vfhah.js:2831-2996 placement
var VERSION_TOO_OLD_PATTERN =
  /\bClaude Code \S+ (?:does not support this model; version \S+ or newer is required|is older than the minimum version required by your organization's policy)/;
//@ chunk-gr2vfhah.js:2996-3111 placement
/**
 * 判断错误是否为客户端版本被拒绝（400 且消息匹配版本过旧）。
 */
function isClientVersionRejected(e) {
  if (isClaudeCodeVersionTooOld(e)) return true;
  if (!(e instanceof APIError) || e.status !== 400) return false;
  return VERSION_TOO_OLD_PATTERN.test(extractNestedErrorMessage(e) ?? e.message);
}
//@ chunk-gr2vfhah.js:3111-3171 placement
var SAFETY_MONITOR_BLOCKED = "safety_monitor_blocked";
var CCS_NO_REQUEST_TOKEN = "ccs_no_request_token";
//@ chunk-gr2vfhah.js:3171-3196 placement
/**
 * 导出函数 `alwaysFalseErrors`：参数 e，返回 !1。
 */
function alwaysFalseErrors(error) {
  return false;
}
//@ chunk-gr2vfhah.js:3196-3221 placement
/**
 * 导出函数 `alwaysFalseB`：参数 e，返回 !1。
 */
function alwaysFalseB(error) {
  return false;
}
//@ chunk-gr2vfhah.js:3221-3336 placement
function isHipaaFeatureError(e) {
  return (
    isInvalidRequestStartingWith(e, "The requested features are not available for HIPAA-") &&
    e.status === 400 &&
    getApiErrorCode(e) === undefined
  );
}
//@ chunk-gr2vfhah.js:3336-3506 placement
function isInvalidRequestStartingWith(e, t) {
  if (!(e instanceof APIError) || !hasNestedError(e)) return false;
  let error = e.error?.error;
  return (
    error?.type === "invalid_request_error" &&
    typeof error.message === "string" &&
    error.message.startsWith(t)
  );
}
//@ chunk-s61vbvea.js:54508-54639 placement = detectPromptTooLong (0.667)
/**
 * 判断错误消息是否为“提示词过长”（prompt is too long / input is too long for requested model）。
 */
function isPromptTooLongMessage(message) {
  let lower = message.toLowerCase();
  return lower.includes("prompt is too long") || lower.includes("input is too long for requested model");
}
//@ chunk-s61vbvea.js:59778-59820 fingerprint = getErrorMessageIfRefusal (0.333)
/**
 * stop_reason 为 refusal。
 */
function getErrorMessageIfRefusal(e) {
  return parseAdvisorResult(e) === "refusal";
}
//@ chunk-8t8n4kdh.js:79910-80092 fingerprint = API_TIMEOUT_ERROR_MESSAGE (0.717)
/**
 * 给请求 promise 挂超时：到时用 RequestTimeout 错误中止控制器，完成后清计时器。旧版名 API_TIMEOUT_ERROR_MESSAGE 为错配；疑似第三方/其他 HTTP 客户端代码。
 */
function armRequestTimeout(e, n) {
  let connectionTimeoutMs = getConnectionTimeoutMs();
  let timer = setTimeout(
    (h, timeout) =>
      h.abort(
        new SdkError(SdkErrorCode.RequestTimeout, "Request timed out", {
          timeout,
        }),
      ),
    connectionTimeoutMs,
    n,
    connectionTimeoutMs,
  );
  timer.unref?.();
  e.then(
    () => clearTimeout(timer),
    () => clearTimeout(timer),
  );
}
export {
  getErrorMessageIfRefusal,
  getPdfTooLargeErrorMessage,
  getPdfPasswordProtectedErrorMessage,
  getPdfInvalidErrorMessage,
  getImageTooLargeErrorMessage,
  SAFETY_MONITOR_BLOCKED,
  asSafePathKey,
  API_ERROR_MESSAGE_PREFIX,
  formatOrgSpendCapError,
  isExtraUsageOutOfCredits,
  categorizeRetryableAPIError,
  isWithheldGatewayBgSession,
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
  headerlessDeclineKind,
  headerlessDeclineRetryDelay,
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
  isDlpRequestDenied,
  alwaysFalseErrors,
  isRequestTooLargeError_2,
  DLP_REQUEST_DENIED,
  alwaysFalseB,
  isPromptTooLongError,
  isMaxTokensContextOverflow,
  parsePromptTooLongTokenCounts,
  PROMPT_TOO_LONG_ERROR_MESSAGE,
  isPromptTooLongMessage_2,
  rebuildApiErrorMessage,
  formatSingleExchangePromptTooLong,
  getPromptTooLongTokenGap,
  getStatusPageHint,
  intentProviderSlot,
  RATE_LIMIT_RESET_MAX_MS,
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
  isNonRetryable4xx,
  suggestThirdPartyModel,
  getPromptTooLongGap,
  sanitizeEventKey,
  INVALID_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_MESSAGE,
  DISABLED_ORG_API_KEY_WITH_SUBSCRIPTION_MESSAGE,
  GATEWAY_UPSTREAM_AUTH_ERROR_MESSAGE,
  TOKEN_REVOKED_MESSAGE,
  INVALID_API_KEY_ERROR_MESSAGE,
  CREDIT_BALANCE_TOO_LOW_ERROR_MESSAGE,
  REQUEST_TIMED_OUT_MESSAGE,
  hasInvalidCredentialPrefix,
  isNoGatewayHint,
  CLAUDE_BG_GATEWAY_WITHHELD,
  isHipaaFeatureError,
  CLAUDE_CODE_VERSION_TOO_OLD,
  CCS_NO_REQUEST_TOKEN,
  isLongContextCreditsRequiredMessage,
  isMediaSizeErrorMessage,
  canSuggestSlashCommands,
  isPromptTooLongMessage,
};
