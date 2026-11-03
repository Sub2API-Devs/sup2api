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
var BEDROCK_AUTH_ERROR_NAMES = [
    "UnrecognizedClientException",
    "ExpiredTokenException",
    "InvalidSignatureException",
    "RequestTimeTooSkewed",
    "TokenRefreshRequired",
    "CredentialsProviderError",
  ],
  n$ = "you don't have access to the model with the specified model id",
  o$ = /\banthropic\.\S+ is not available for this account/,
  s$ = "marketplace subscription for this model cannot be completed",
  i$ = "the provided model identifier is invalid",
  a$ = "on-demand throughput",
  l$ = /is not authorized to perform: bedrock:InvokeModel/i,
  c$ = "is not servable in region",
  u$ = "model does not serve requests restricted by vpcsc";
//@ chunk-s61vbvea.js:515803-516024 placement
function readProviderErrorFacts(e) {
  let n = e,
    r = typeof n?.status === "number" ? n.status : void 0,
    s = typeof n?.message === "string" ? n.message : "",
    h;
  try {
    h = n?.headers?.get?.("x-amzn-errortype") ?? void 0;
  } catch {
    h = void 0;
  }
  return { status: r, message: s, errorType: h };
}
//@ chunk-s61vbvea.js:516024-516193 placement
function isBedrockAuthError(e, n) {
  let r = String(e?.name ?? "");
  return (
    isAwsCredentialsProviderError(e) ||
    isAwsCredentialError(n.errorType, n.message) ||
    BEDROCK_AUTH_ERROR_NAMES.some(
      (s) => r.includes(s) || n.message.includes(s) || (n.errorType?.includes(s) ?? !1),
    )
  );
}
/**
 * Bedrock/Mantle 凭据、令牌过期、时钟偏差等错误的分类与提示
 */
//@ chunk-s61vbvea.js:516193-516936 placement
function classifyProviderModelError(e, n) {
  let r = readProviderErrorFacts(n);
  if ((e === "bedrock" || e === "mantle") && isBedrockAuthError(n, r)) return "credential";
  if (r.status === 401) return "credential";
  if (isClientVersionRejected(n)) return "outdated";
  let lower = r.message.toLowerCase();
  if (e === "bedrock") {
    if (r.status === 403 && (lower.includes(n$) || o$.test(lower) || lower.includes(s$))) return "refused";
    if (r.status === 400 && lower.includes(i$) && !lower.includes(a$)) return "refused";
    if (r.status === 403 && l$.test(r.message)) return "denied";
    return "unknown";
  }
  if (e === "vertex") {
    if (r.status === 404 && lower.includes("publisher model") && lower.includes("not found"))
      return "refused";
    if (
      r.status === 400 &&
      lower.includes("failed_precondition") &&
      ((lower.includes("publisher model") && lower.includes(c$)) || lower.includes(u$))
    )
      return "refused";
    return "unknown";
  }
  if (e === "foundry") return isAzureDeploymentNotFound(n) ? "refused" : "unknown";
  return "unknown";
}

export { classifyProviderModelError };
