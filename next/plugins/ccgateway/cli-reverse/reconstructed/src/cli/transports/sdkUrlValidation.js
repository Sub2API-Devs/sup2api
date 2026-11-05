/**
 * cli/transports/sdkUrlValidation.ts
 *
 * 2.1.316 新增：--sdk-url 的解析与校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hfc4cfnt.js (3)
 * attribution: placement 3
 */
import { jsonStringify, ALLOWED_API_HOSTS } from "../../utils/model/providers.js";
import { getCcrSessionUrl } from "../../bootstrap/state.js";
import { eagerParseCliFlagAll } from "../../utils/cliArgs.js";

//@ chunk-hfc4cfnt.js:958-1401 placement
function validateSdkUrlFlag(sdkUrl) {
  let sdkUrl_2 = resolveSdkUrl();
  if (!sdkUrl) {
    if (sdkUrl_2.status === "absent") return null;
    return sdkUrl_2.status === "rejected"
      ? {
          code: sdkUrl_2.code,
          reason: sdkUrl_2.reason,
        }
      : {
          code: "view_mismatch",
          reason: "the eager argv scan sees a --sdk-url value commander did not bind",
        };
  }
  if (sdkUrl_2.status === "rejected")
    return {
      code: sdkUrl_2.code,
      reason: sdkUrl_2.reason,
    };
  if (sdkUrl_2.status === "absent" || sdkUrl_2.url !== sdkUrl)
    return {
      code: "view_mismatch",
      reason: "the --sdk-url value commander bound disagrees with the eager argv scan",
    };
  return null;
}
//@ chunk-hfc4cfnt.js:1401-1837 placement
function checkSdkUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return {
      code: "unparseable",
      reason: `could not parse ${jsonStringify(url)} as a URL`,
    };
  }
  if (ALLOWED_API_HOSTS.has(parsed.hostname)) {
    if (parsed.protocol !== "wss:" && parsed.protocol !== "https:")
      return {
        code: "bad_scheme",
        reason: `scheme ${jsonStringify(parsed.protocol)} is not permitted for host ${jsonStringify(parsed.hostname)}; only wss:// and https:// are accepted`,
      };
    return null;
  }
  return {
    code: "not_allowlisted",
    reason: `host ${jsonStringify(parsed.hostname)} is not an approved Anthropic endpoint`,
  };
}
//@ chunk-hfc4cfnt.js:1837-2168 placement
function resolveSdkUrl() {
  let ccrSessionUrl = getCcrSessionUrl();
  if (ccrSessionUrl !== undefined)
    return {
      status: "ok",
      url: ccrSessionUrl,
    };
  let flags = eagerParseCliFlagAll("--sdk-url");
  let last = flags.filter(Boolean).at(-1);
  if (!last)
    return {
      status: "absent",
    };
  if (new Set(flags).size > 1)
    return {
      status: "rejected",
      code: "conflicting",
      reason: "conflicting --sdk-url occurrences",
    };
  let error = checkSdkUrl(last);
  if (error)
    return {
      status: "rejected",
      ...error,
    };
  return {
    status: "ok",
    url: last,
  };
}
export { resolveSdkUrl, checkSdkUrl, validateSdkUrlFlag };
