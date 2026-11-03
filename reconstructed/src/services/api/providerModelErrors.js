/**
 * services/api/providerModelErrors.ts
 *
 * Bedrock/Vertex/Mantle 错误分类（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (4)
 * attribution: placement 4
 */
import { isAwsCredentialsProviderError, isAwsCredentialError } from "../../utils/aws.js";
import { isClientVersionRejected } from "./errors.js";
import { isAzureDeploymentNotFound } from "./withRetry.js";

//@ chunk-s61vbvea.js:515236-515803 placement
/**
 * Bedrock 鉴权/模型访问错误的名称与消息特征表，用于把 403/400 归类为 refused 或 denied。
 */
var BEDROCK_AUTH_ERROR_NAMES = [
  "UnrecognizedClientException",
  "ExpiredTokenException",
  "InvalidSignatureException",
  "RequestTimeTooSkewed",
  "TokenRefreshRequired",
  "CredentialsProviderError",
];
var NO_MODEL_ACCESS_TEXT = "you don't have access to the model with the specified model id";
var MODEL_NOT_AVAILABLE_RE = /\banthropic\.\S+ is not available for this account/;
var MARKETPLACE_SUBSCRIPTION_TEXT = "marketplace subscription for this model cannot be completed";
var INVALID_MODEL_ID_TEXT = "the provided model identifier is invalid";
var ON_DEMAND_THROUGHPUT_TEXT = "on-demand throughput";
var INVOKE_MODEL_DENIED_RE = /is not authorized to perform: bedrock:InvokeModel/i;
var NOT_SERVABLE_IN_REGION_TEXT = "is not servable in region";
var VPCSC_RESTRICTED_TEXT = "model does not serve requests restricted by vpcsc";
//@ chunk-s61vbvea.js:515803-516024 placement
function readProviderErrorFacts(e) {
  let n = e;
  let status = typeof n?.status === "number" ? n.status : undefined;
  let message = typeof n?.message === "string" ? n.message : "";
  let h;
  try {
    h = n?.headers?.get?.("x-amzn-errortype") ?? undefined;
  } catch {
    h = undefined;
  }
  return {
    status,
    message,
    errorType: h,
  };
}
//@ chunk-s61vbvea.js:516024-516193 placement
function isBedrockAuthError(e, providerErrorFacts) {
  let r = String(e?.name ?? "");
  return (
    isAwsCredentialsProviderError(e) ||
    isAwsCredentialError(providerErrorFacts.errorType, providerErrorFacts.message) ||
    BEDROCK_AUTH_ERROR_NAMES.some(
      (s) =>
        r.includes(s) ||
        providerErrorFacts.message.includes(s) ||
        (providerErrorFacts.errorType?.includes(s) ?? false),
    )
  );
}
//@ chunk-s61vbvea.js:516193-516936 placement
/**
 * Bedrock/Mantle 凭据、令牌过期、时钟偏差等错误的分类与提示
 */
function classifyProviderModelError(e, error) {
  let providerErrorFacts = readProviderErrorFacts(error);
  if ((e === "bedrock" || e === "mantle") && isBedrockAuthError(error, providerErrorFacts))
    return "credential";
  if (providerErrorFacts.status === 401) return "credential";
  if (isClientVersionRejected(error)) return "outdated";
  let lower = providerErrorFacts.message.toLowerCase();
  if (e === "bedrock") {
    if (
      providerErrorFacts.status === 403 &&
      (lower.includes(NO_MODEL_ACCESS_TEXT) ||
        MODEL_NOT_AVAILABLE_RE.test(lower) ||
        lower.includes(MARKETPLACE_SUBSCRIPTION_TEXT))
    )
      return "refused";
    if (
      providerErrorFacts.status === 400 &&
      lower.includes(INVALID_MODEL_ID_TEXT) &&
      !lower.includes(ON_DEMAND_THROUGHPUT_TEXT)
    )
      return "refused";
    if (providerErrorFacts.status === 403 && INVOKE_MODEL_DENIED_RE.test(providerErrorFacts.message))
      return "denied";
    return "unknown";
  }
  if (e === "vertex") {
    if (providerErrorFacts.status === 404 && lower.includes("publisher model") && lower.includes("not found"))
      return "refused";
    if (
      providerErrorFacts.status === 400 &&
      lower.includes("failed_precondition") &&
      ((lower.includes("publisher model") && lower.includes(NOT_SERVABLE_IN_REGION_TEXT)) ||
        lower.includes(VPCSC_RESTRICTED_TEXT))
    )
      return "refused";
    return "unknown";
  }
  if (e === "foundry") return isAzureDeploymentNotFound(error) ? "refused" : "unknown";
  return "unknown";
}
export { classifyProviderModelError };
