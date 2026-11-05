/**
 * utils/teleport/repositoriesTrusted.ts
 *
 * 2.1.316 新增：可信仓库
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 5
 */
import { isTrustedRepositoriesHeaderEnabled } from "./cloudEnvironments.js";
import { isPathPersistedTrusted } from "../config.js";
import { trustedDeviceHeaders } from "./api.js";
import { securityTierErrorSchema } from "./securityTier.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-5xgkngpb.js:1959968-1960340 placement
/**
 * 决定是否发送可信仓库头：需开关开启、启动检出已信任且有令牌。
 */
async function planTrustedRepositoriesHeader(attaches) {
  if (!isTrustedRepositoriesHeaderEnabled() || !attaches.anything)
    return {
      kind: "off",
    };
  if (attaches.launchCheckout === null)
    return {
      kind: "not_sent",
      why: "other_content",
    };
  if (!isPathPersistedTrusted(attaches.launchCheckout.root))
    return {
      kind: "not_sent",
      why: "folder_not_trusted",
    };
  let headers = await trustedDeviceHeaders().catch(() => ({}));
  return Object.keys(headers).length > 0
    ? {
        kind: "send",
        covers: attaches.launchCheckout.covers,
        proofHeaders: headers,
      }
    : {
        kind: "not_sent",
        why: "no_token",
      };
}
//@ chunk-5xgkngpb.js:1960340-1960371 placement
var REPOSITORIES_TRUSTED = "repositories_trusted";
//@ chunk-5xgkngpb.js:1960371-1960909 placement
function requestRepositoriesTrusted(body) {
  let parsed = securityTierErrorSchema().safeParse(body);
  if (!parsed.success) return "unnamed";
  let { reason, resource, sub_reason: subReason } = parsed.data.error;
  if (reason === "repositories_trusted_not_covered") return "not_covered";
  if (resource === "repositories_trusted_request_forbidden") return "forbidden_caller";
  if (subReason === "repositories_trusted_request")
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
  return [reason, resource, subReason].some((value) => value?.startsWith(REPOSITORIES_TRUSTED))
    ? "other"
    : "unnamed";
}
//@ chunk-5xgkngpb.js:1960909-1961244 placement
/**
 * 上报可信仓库头的发送结果（已发送、被拒后重试等）。
 */
function logTrustedRepositoriesOutcome(outcome) {
  switch (outcome.kind) {
    case "sent":
      logFeatureOk("cloud_repositories_trusted_create", {
        covers: fromEnum(outcome.covers),
      });
      return;
    case "refused_then_retried":
      logFeatureSad("cloud_repositories_trusted_create", outcome.kind, {
        reason: fromEnum(outcome.refusal),
        covers: fromEnum(outcome.covers),
      });
      return;
    case "not_sent":
      logFeatureSad("cloud_repositories_trusted_create", outcome.kind, {
        reason: fromEnum(outcome.why),
      });
      return;
    default: {
      let unreachable = outcome;
    }
  }
}
//@ chunk-5xgkngpb.js:1961338-1961349 placement
var CHANGED_FILE_SCAN_CONCURRENCY = 64;
export {
  CHANGED_FILE_SCAN_CONCURRENCY,
  planTrustedRepositoriesHeader,
  requestRepositoriesTrusted,
  logTrustedRepositoriesOutcome,
};
