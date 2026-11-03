/**
 * utils/teleport/repositoriesTrusted.ts
 *
 * 2.1.316 新增：可信仓库
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { EZo } from "./cloudEnvironments.js";
import { isPathPersistedTrusted } from "../config.js";
import { trustedDeviceHeaders } from "./api.js";
import { securityTierErrorSchema } from "./securityTier.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

/**
 * 决定是否发送可信仓库头：需开关开启、启动检出已信任且有令牌。
 */
//@ chunk-e6aww6q8.js:1881143-1881515 placement
async function planTrustedRepositoriesHeader(e) {
  if (!EZo() || !e.anything) return { kind: "off" };
  if (e.launchCheckout === null) return { kind: "not_sent", why: "other_content" };
  if (!isPathPersistedTrusted(e.launchCheckout.root)) return { kind: "not_sent", why: "folder_not_trusted" };
  let n = await trustedDeviceHeaders().catch(() => ({}));
  return Object.keys(n).length > 0
    ? { kind: "send", covers: e.launchCheckout.covers, proofHeaders: n }
    : { kind: "not_sent", why: "no_token" };
}
//@ chunk-e6aww6q8.js:1881515-1881546 placement
var REPOSITORIES_TRUSTED = "repositories_trusted";
//@ chunk-e6aww6q8.js:1881546-1882084 placement
function requestRepositoriesTrusted(e) {
  let safeParse = securityTierErrorSchema().safeParse(e);
  if (!safeParse.success) return "unnamed";
  let { reason: reason, resource: resource, sub_reason: sub_reason } = safeParse.data.error;
  if (reason === "repositories_trusted_not_covered") return "not_covered";
  if (resource === "repositories_trusted_request_forbidden") return "forbidden_caller";
  if (sub_reason === "repositories_trusted_request")
    switch (resource) {
      case "untrusted_device":
        return "untrusted_device";
      case "session_stale_relogin":
        return "session_stale";
      case "device_check_unavailable":
        return "unavailable";
      default:
        return "other";
    }
  return [reason, resource, sub_reason].some((y) => y?.startsWith(REPOSITORIES_TRUSTED))
    ? "other"
    : "unnamed";
}
/**
 * 上报可信仓库头的发送结果（已发送、被拒后重试等）。
 */
//@ chunk-e6aww6q8.js:1882084-1882419 placement
function logTrustedRepositoriesOutcome(e) {
  switch (e.kind) {
    case "sent":
      logFeatureOk("cloud_repositories_trusted_create", { covers: fromEnum(e.covers) });
      return;
    case "refused_then_retried":
      logFeatureSad("cloud_repositories_trusted_create", e.kind, {
        reason: fromEnum(e.refusal),
        covers: fromEnum(e.covers),
      });
      return;
    case "not_sent":
      logFeatureSad("cloud_repositories_trusted_create", e.kind, { reason: fromEnum(e.why) });
      return;
    default: {
      let n = e;
    }
  }
}
//@ chunk-e6aww6q8.js:1882513-1882524 placement
var xZo = 64;

export { planTrustedRepositoriesHeader, requestRepositoriesTrusted, logTrustedRepositoriesOutcome, xZo };
