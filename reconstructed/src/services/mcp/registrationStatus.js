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
var Gls = 2592000000,
  q = 60000;
//@ chunk-cyj440je.js:9481-9559 placement
function D9t(e) {
  if (e === void 0) return !1;
  let r = Date.now() - e;
  return r > -q && r <= Gls;
}
/**
 * 判断 OAuth 存储条目是否处于"已发现元数据、尚无令牌"的待注册状态。
 */
//@ chunk-cyj440je.js:9559-9669 placement
function isRegistrationPendingEntry(e) {
  return e !== void 0 && !e.accessToken && !e.refreshToken && e.discoveryState?.oauthMetadataFound === !0;
}
//@ chunk-cyj440je.js:9669-9764 placement
function N(e) {
  return !e.oauth?.clientId && !e.oauth?.authServerMetadataUrl && !e.oauth?.xaa && !usesNonOAuthAuth(e);
}
/**
 * 判断服务器最近是否被记为不提供客户端注册。
 */
//@ chunk-cyj440je.js:9764-9924 placement
function registrationNotOffered(e, r, o, n = 0) {
  if (!N(r)) return !1;
  let a = o?.[getServerKey(e, r)],
    c = a?.discoveryState?.registrationNotOfferedAt;
  return isRegistrationPendingEntry(a) && !a.clientId && c !== void 0 && c >= n && D9t(c);
}
/**
 * 为 MCP 状态行计算"客户端注册不可用"标记（读取凭据存储失败时记录并跳过）。
 */
//@ chunk-cyj440je.js:9924-10345 placement
async function registrationStatusFields(e, r, o = 0) {
  if ((r.type !== "http" && r.type !== "sse") || !N(r)) return {};
  let n = await readMcpOAuthStore().catch((a) => {
    (logForDebugging(
      `Could not read the credentials store to check whether ${e} offers client registration, so its status row will not say: ${errorMessage(a)}`,
      { level: "error" },
    ),
      logFeatureSad("mcp_status_registration_mark", "store_read_failed"));
    return;
  });
  if (!registrationNotOffered(e, r, n, o)) return {};
  return (logFeatureOk("mcp_status_registration_mark"), { clientRegistrationUnavailable: !0 });
}
/**
 * 判断 MCP 服务器是否需要客户端注册（待注册状态，且未处于重新学习注册的冷却期）。
 */
//@ chunk-cyj440je.js:10345-10530 placement
function needsClientRegistration(e, r, o) {
  if (usesNonOAuthAuth(r)) return !1;
  let n = o?.[getServerKey(e, r)],
    a = n?.discoveryState?.registrationNotOfferedAt;
  if (r.redialToRelearnRegistration === !0 && a !== void 0 && !D9t(a)) return !1;
  return isRegistrationPendingEntry(n);
}
/**
 * 判断 MCP 服务器只有已过期的访问令牌而没有刷新令牌。
 */
//@ chunk-cyj440je.js:10530-10685 placement
function hasExpiredAccessTokenOnly(e, r, o) {
  if (usesNonOAuthAuth(r)) return !1;
  let n = o?.[getServerKey(e, r)];
  return (
    n !== void 0 && !!n.accessToken && !n.refreshToken && n.expiresAt !== void 0 && n.expiresAt < Date.now()
  );
}

export {
  needsClientRegistration,
  hasExpiredAccessTokenOnly,
  isRegistrationPendingEntry,
  D9t,
  registrationStatusFields,
  Gls,
  registrationNotOffered,
};
