/**
 * commands/team-onboarding/api.ts
 *
 * 2.1.316 新增：/team-onboarding 的服务端接口（上传与分享入门指南）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 8, layout 1
 */
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../services/policyLimits/policyEvidence.js";
import {
  hasStoredOAuthToken,
  isAnthropicAuthEnabled,
  isHostManagedProviderAuth,
  getStoredOauthAccountInfo,
} from "../../utils/auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logEvent } from "../../services/analytics/index.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { env } from "../../utils/env.js";
import { usableLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { getOAuthTokenFromFileDescriptor } from "../../utils/authFileDescriptor.js";
import { isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1811918-1811998 placement
var TEAM_ONBOARDING_TIMEOUT_MS; // deferred: uses ORG_CREATE_API_KEY (../../constants/oauth.js) of its import cycle while loading; runs once the cycle is complete
var TEAM_ONBOARDING_FETCH_OPTIONS;
deferInit("chunk-5xgkngpb.js:1811918", () => {
  TEAM_ONBOARDING_TIMEOUT_MS = 1e4;
  TEAM_ONBOARDING_FETCH_OPTIONS = {
    auth: "teleport-org",
    timeout: TEAM_ONBOARDING_TIMEOUT_MS,
    headers: {
      "anthropic-beta": OAUTH_BETA_HEADER,
    },
  };
});
//@ chunk-5xgkngpb.js:1811998-1812129 placement
/**
 * isTeamOnboardingShareEnabled：tengu_flint_harbor_share 且 allow_team_onboarding。
 */
function isTeamOnboardingShareEnabled() {
  if (isEssentialTrafficOnly()) return false;
  if (!isPolicyAllowed_3("allow_team_onboarding")) return false;
  if (!hasStoredOAuthToken()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_flint_harbor_share", false);
}
//@ chunk-5xgkngpb.js:1812129-1812255 placement
function unwrapOnboardingResult(result) {
  if (!result.ok)
    throw Error(
      result.reason === "no-auth" ? result.detail : `Onboarding guide unavailable: ${result.reason}`,
    );
  return result.data;
}
//@ chunk-5xgkngpb.js:1812255-1812363 placement
function assertOnboardingAllowed() {
  if (!isPolicyAllowed_3("allow_team_onboarding"))
    throw Error("Onboarding guide unavailable: policy-disabled");
}
//@ chunk-5xgkngpb.js:1812363-1812573 placement
/**
 * 上传团队入门指南（内容与名称），返回服务端结果。
 */
async function createOnboardingGuide(content, name, credentials) {
  assertOnboardingAllowed();
  let response = await apiClient.post(
    "/api/organizations/:orgUUID/claude_code/onboarding",
    {
      content,
      name,
    },
    {
      ...TEAM_ONBOARDING_FETCH_OPTIONS,
      credentials,
    },
  );
  let guide = unwrapOnboardingResult(response);
  logEvent("tengu_team_onboarding_share_created", {});
  return guide;
}
//@ chunk-5xgkngpb.js:1812573-1812800 placement
/**
 * 更新指定 id 的团队入门指南内容。
 */
async function updateOnboardingGuide(shareId, content, credentials) {
  assertOnboardingAllowed();
  let response = await apiClient.put(
    `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(shareId)}`,
    {
      content,
    },
    {
      ...TEAM_ONBOARDING_FETCH_OPTIONS,
      credentials,
    },
  );
  let guide = unwrapOnboardingResult(response);
  logEvent("tengu_team_onboarding_share_updated", {});
  return guide;
}
//@ chunk-5xgkngpb.js:1812800-1813212 layout
async function deleteOnboardingShare(shortCode, credentials) {
  assertOnboardingAllowed();
  let response = await apiClient.delete(
    `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(shortCode)}`,
    undefined,
    {
      ...TEAM_ONBOARDING_FETCH_OPTIONS,
      credentials,
    },
  );
  if (response.ok && response.status === 404) return "already_gone";
  if (response.ok && response.status >= 300)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Onboarding guide unavailable: status ${response.status}`,
      "Onboarding guide unavailable: the server refused",
    );
  unwrapOnboardingResult(response);
  logEvent("tengu_team_onboarding_share_deleted", {});
  return "deleted";
}
//@ chunk-5xgkngpb.js:1813212-1813357 placement
/**
 * 列出组织的团队入门指南。
 */
async function listOnboardingGuides(credentials) {
  assertOnboardingAllowed();
  let response = await apiClient.get("/api/organizations/:orgUUID/claude_code/onboarding", {
    ...TEAM_ONBOARDING_FETCH_OPTIONS,
    credentials,
  });
  return unwrapOnboardingResult(response).guides;
}
//@ chunk-5xgkngpb.js:1813357-1813529 placement
/**
 * 取本次会话的组织 uuid：本地 OAuth 令牌时用环境里的组织 id，否则用当前登录账号；未启用时返回 undefined。
 */
function getTelemetryOrganizationUuid() {
  if (!isAnthropicAuthEnabled()) return;
  return normalizeUuidOrNull(
    env.CLAUDE_CODE_OAUTH_TOKEN ||
      usableLauncherHostLoginToken() !== null ||
      (getOAuthTokenFromFileDescriptor() && (!isOauthTokenFromBgSnapshot() || isHostManagedProviderAuth()))
      ? env.CLAUDE_CODE_ORGANIZATION_UUID
      : getStoredOauthAccountInfo()?.organizationUuid,
  )?.toLowerCase();
}
export {
  getTelemetryOrganizationUuid,
  isTeamOnboardingShareEnabled,
  listOnboardingGuides,
  deleteOnboardingShare,
  updateOnboardingGuide,
  createOnboardingGuide,
};
