/**
 * cli/transports/sdkUrlValidation.ts
 *
 * 2.1.316 新增：--sdk-url 的解析与校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1wpnxx5r.js (3)
 * attribution: placement 3
 */
import { E, ALLOWED_API_HOSTS } from "../../utils/model/providers.js";
import { getCcrSessionUrl } from "../../bootstrap/state.js";
import { eagerParseCliFlagAll } from "../../utils/cliArgs.js";

//@ chunk-1wpnxx5r.js:952-1395 placement
function validateSdkUrlFlag(e) {
  let r = resolveSdkUrl();
  if (!e) {
    if (r.status === "absent") return null;
    return r.status === "rejected"
      ? { code: r.code, reason: r.reason }
      : {
          code: "view_mismatch",
          reason: "the eager argv scan sees a --sdk-url value commander did not bind",
        };
  }
  if (r.status === "rejected") return { code: r.code, reason: r.reason };
  if (r.status === "absent" || r.url !== e)
    return {
      code: "view_mismatch",
      reason: "the --sdk-url value commander bound disagrees with the eager argv scan",
    };
  return null;
}
//@ chunk-1wpnxx5r.js:1395-1831 placement
function checkSdkUrl(e) {
  let r;
  try {
    r = new URL(e);
  } catch {
    return { code: "unparseable", reason: `could not parse ${E(e)} as a URL` };
  }
  if (ALLOWED_API_HOSTS.has(r.hostname)) {
    if (r.protocol !== "wss:" && r.protocol !== "https:")
      return {
        code: "bad_scheme",
        reason: `scheme ${E(r.protocol)} is not permitted for host ${E(r.hostname)}; only wss:// and https:// are accepted`,
      };
    return null;
  }
  return { code: "not_allowlisted", reason: `host ${E(r.hostname)} is not an approved Anthropic endpoint` };
}
//@ chunk-1wpnxx5r.js:1831-2162 placement
function resolveSdkUrl() {
  let e = getCcrSessionUrl();
  if (e !== void 0) return { status: "ok", url: e };
  let r = eagerParseCliFlagAll("--sdk-url"),
    at = r.filter(Boolean).at(-1);
  if (!at) return { status: "absent" };
  if (new Set(r).size > 1)
    return { status: "rejected", code: "conflicting", reason: "conflicting --sdk-url occurrences" };
  let t = checkSdkUrl(at);
  if (t) return { status: "rejected", ...t };
  return { status: "ok", url: at };
}

export { resolveSdkUrl, validateSdkUrlFlag, checkSdkUrl };
