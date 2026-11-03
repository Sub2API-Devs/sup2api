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
var W9o = 1e4,
  Swe = { auth: "teleport-org", timeout: W9o, headers: { "anthropic-beta": OAUTH_BETA_HEADER } };
/**
 * isTeamOnboardingShareEnabled：tengu_flint_harbor_share 且 allow_team_onboarding。
 */
//@ chunk-e6aww6q8.js:1736547-1736678 placement
function isTeamOnboardingShareEnabled() {
  if (isEssentialTrafficOnly()) return !1;
  if (!isPolicyAllowed_3("allow_team_onboarding")) return !1;
  if (!hasStoredOAuthToken()) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_flint_harbor_share", !1);
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
/**
 * 上传团队入门指南（内容与名称），返回服务端结果。
 */
//@ chunk-e6aww6q8.js:1736912-1737122 placement
async function createOnboardingGuide(e, n, r) {
  assertOnboardingAllowed();
  let post = await apiClient.post(
      "/api/organizations/:orgUUID/claude_code/onboarding",
      { content: e, name: n },
      { ...Swe, credentials: r },
    ),
    h = unwrapOnboardingResult(post);
  return (logEvent("tengu_team_onboarding_share_created", {}), h);
}
/**
 * 更新指定 id 的团队入门指南内容。
 */
//@ chunk-e6aww6q8.js:1737122-1737349 placement
async function updateOnboardingGuide(e, n, r) {
  assertOnboardingAllowed();
  let put = await apiClient.put(
      `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,
      { content: n },
      { ...Swe, credentials: r },
    ),
    h = unwrapOnboardingResult(put);
  return (logEvent("tengu_team_onboarding_share_updated", {}), h);
}
/**
 * 删除指定 id 的团队入门指南。
 */
//@ chunk-e6aww6q8.js:1737349-1737561 placement
async function deleteOnboardingGuide(e, n) {
  assertOnboardingAllowed();
  let r = await apiClient.delete(
    `/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,
    void 0,
    { ...Swe, credentials: n },
  );
  (unwrapOnboardingResult(r), logEvent("tengu_team_onboarding_share_deleted", {}));
}
/**
 * 列出组织的团队入门指南。
 */
//@ chunk-e6aww6q8.js:1737561-1737706 placement
async function listOnboardingGuides(e) {
  assertOnboardingAllowed();
  let n = await apiClient.get("/api/organizations/:orgUUID/claude_code/onboarding", {
    ...Swe,
    credentials: e,
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
