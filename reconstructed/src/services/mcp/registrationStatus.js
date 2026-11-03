/**
 * services/mcp/registrationStatus.ts
 *
 * 2.1.316 新增：MCP 注册状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cyj440je.js (8)
 * attribution: placement 8
 */
import { usesNonOAuthAuth, getServerKey } from "./auth.js";
import { readMcpOAuthStore } from "./credentialStoreRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-cyj440je.js:9454-9481 placement
/**
 * 允许的时钟偏差（60000 毫秒）。
 */
var MAX_REGISTRATION_AGE_MS = 2592000000;
var CLOCK_SKEW_MS = 60000;
//@ chunk-cyj440je.js:9481-9559 placement
/**
 * 判断时间戳是否新鲜（在偏差与最大年龄之间）。
 */
function isFreshTimestamp(registrationNotOfferedAt) {
  if (registrationNotOfferedAt === undefined) return false;
  let r = Date.now() - registrationNotOfferedAt;
  return r > -CLOCK_SKEW_MS && r <= MAX_REGISTRATION_AGE_MS;
}
//@ chunk-cyj440je.js:9559-9669 placement
/**
 * 判断 OAuth 存储条目是否处于"已发现元数据、尚无令牌"的待注册状态。
 */
function isRegistrationPendingEntry(e) {
  return (
    e !== undefined && !e.accessToken && !e.refreshToken && e.discoveryState?.oauthMetadataFound === true
  );
}
//@ chunk-cyj440je.js:9669-9764 placement
/**
 * 判断服务器是否记为“不提供客户端注册”。
 */
function registrationNotOffered(e) {
  return !e.oauth?.clientId && !e.oauth?.authServerMetadataUrl && !e.oauth?.xaa && !usesNonOAuthAuth(e);
}
//@ chunk-cyj440je.js:9764-9924 placement
/**
 * 判断服务器最近是否被记为不提供客户端注册。
 */
function registrationNotOffered_2(e, r, o, n = 0) {
  if (!registrationNotOffered(r)) return false;
  let a = o?.[getServerKey(e, r)];
  let registrationNotOfferedAt = a?.discoveryState?.registrationNotOfferedAt;
  return (
    isRegistrationPendingEntry(a) &&
    !a.clientId &&
    registrationNotOfferedAt !== undefined &&
    registrationNotOfferedAt >= n &&
    isFreshTimestamp(registrationNotOfferedAt)
  );
}
//@ chunk-cyj440je.js:9924-10345 placement
/**
 * 为 MCP 状态行计算"客户端注册不可用"标记（读取凭据存储失败时记录并跳过）。
 */
async function registrationStatusFields(name, serverRef, o = 0) {
  if ((serverRef.type !== "http" && serverRef.type !== "sse") || !registrationNotOffered(serverRef))
    return {};
  let n = await readMcpOAuthStore().catch((error) => {
    logForDebugging(
      `Could not read the credentials store to check whether ${name} offers client registration, so its status row will not say: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    logFeatureSad("mcp_status_registration_mark", "store_read_failed");
    return;
  });
  if (!registrationNotOffered_2(name, serverRef, n, o)) return {};
  logFeatureOk("mcp_status_registration_mark");
  return {
    clientRegistrationUnavailable: true,
  };
}
//@ chunk-cyj440je.js:10345-10530 placement
/**
 * 判断 MCP 服务器是否需要客户端注册（待注册状态，且未处于重新学习注册的冷却期）。
 */
function needsClientRegistration(e, r, o) {
  if (usesNonOAuthAuth(r)) return false;
  let n = o?.[getServerKey(e, r)];
  let registrationNotOfferedAt = n?.discoveryState?.registrationNotOfferedAt;
  if (
    r.redialToRelearnRegistration === true &&
    registrationNotOfferedAt !== undefined &&
    !isFreshTimestamp(registrationNotOfferedAt)
  )
    return false;
  return isRegistrationPendingEntry(n);
}
//@ chunk-cyj440je.js:10530-10685 placement
/**
 * 判断 MCP 服务器只有已过期的访问令牌而没有刷新令牌。
 */
function hasExpiredAccessTokenOnly(e, r, o) {
  if (usesNonOAuthAuth(r)) return false;
  let n = o?.[getServerKey(e, r)];
  return (
    n !== undefined &&
    !!n.accessToken &&
    !n.refreshToken &&
    n.expiresAt !== undefined &&
    n.expiresAt < Date.now()
  );
}
export {
  needsClientRegistration,
  hasExpiredAccessTokenOnly,
  isRegistrationPendingEntry,
  isFreshTimestamp,
  registrationStatusFields,
  MAX_REGISTRATION_AGE_MS,
  registrationNotOffered_2,
};
