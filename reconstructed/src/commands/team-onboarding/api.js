/**
 * commands/team-onboarding/api.ts
 *
 * 2.1.316 新增：/team-onboarding 的服务端接口（上传与分享入门指南）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../services/policyLimits/policyEvidence.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:1736467-1736547 placement
var TEAM_ONBOARDING_TIMEOUT_MS = 1e4;
var TEAM_ONBOARDING_FETCH_OPTIONS = {
  auth: "teleport-org",
  timeout: TEAM_ONBOARDING_TIMEOUT_MS,
  headers: {
    "anthropic-beta": OAUTH_BETA_HEADER,
  },
};
//@ chunk-e6aww6q8.js:1736547-1736678 placement
/**
 * isTeamOnboardingShareEnabled：tengu_flint_harbor_share 且 allow_team_onboarding。
 */
function isTeamOnboardingShareEnabled() {
  if (isEssentialTrafficOnly()) return false;
  if (!isPolicyAllowed_3("allow_team_onboarding")) return false;
  if (!hasStoredOAuthToken()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_flint_harbor_share", false);
}
//@ chunk-e6aww6q8.js:1736678-1736804 placement
function unwrapOnboardingResult(e) {
  if (!e.ok) throw Error(e.reason === "no-auth" ? e.detail : `Onboarding guide unavailable: ${e.reason}`);
  return e.data;
}
//@ chunk-e6aww6q8.js:1736804-1736912 placement
function assertOnboardingAllowed() {
  if (!isPolicyAllowed_3("allow_team_onboarding"))
    throw Error("Onboarding guide unavailable: policy-disabled");
}
//@ chunk-e6aww6q8.js:1736912-1737122 placement
/**
 * 上传团队入门指南（内容与名称），返回服务端结果。
 */
async function createOnboardingGuide(content, name, credentials) {
  assertOnboardingAllowed();
  let s = await apiClient.post(
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
  let h = unwrapOnboardingResult(s);
  logEvent("tengu_team_onboarding_share_created", {});
  return h;
}
//@ chunk-e6aww6q8.js:1737122-1737349 placement
/**
 * 更新指定 id 的团队入门指南内容。
 */
async function updateOnboardingGuide(e, content, credentials) {
  assertOnboardingAllowed();
  let s = await apiClient.put(
    `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,
    {
      content,
    },
    {
      ...TEAM_ONBOARDING_FETCH_OPTIONS,
      credentials,
    },
  );
  let h = unwrapOnboardingResult(s);
  logEvent("tengu_team_onboarding_share_updated", {});
  return h;
}
//@ chunk-e6aww6q8.js:1737349-1737561 placement
/**
 * 删除指定 id 的团队入门指南。
 */
async function deleteOnboardingGuide(e, credentials) {
  assertOnboardingAllowed();
  let r = await apiClient.delete(
    `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,
    undefined,
    {
      ...TEAM_ONBOARDING_FETCH_OPTIONS,
      credentials,
    },
  );
  unwrapOnboardingResult(r);
  logEvent("tengu_team_onboarding_share_deleted", {});
}
//@ chunk-e6aww6q8.js:1737561-1737706 placement
/**
 * 列出组织的团队入门指南。
 */
async function listOnboardingGuides(credentials) {
  assertOnboardingAllowed();
  let n = await apiClient.get("/api/organizations/:orgUUID/claude_code/onboarding", {
    ...TEAM_ONBOARDING_FETCH_OPTIONS,
    credentials,
  });
  return unwrapOnboardingResult(n).guides;
}
export {
  isTeamOnboardingShareEnabled,
  deleteOnboardingGuide,
  listOnboardingGuides,
  updateOnboardingGuide,
  createOnboardingGuide,
};
