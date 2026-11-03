/**
 * tools/ProjectsTool/projectsAuth.ts
 *
 * 2.1.316 新增：Projects 工具的登录权限范围升级与前置条件错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-eg496hkq.js (5)
 * attribution: placement 5
 */
import { policyKeyLabel, policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { policyUnverifiedMessage } from "../../services/policyLimits/policyMessages.js";
import { ensureProjectsAccessToken } from "../../services/oauth/projectsScope.js";
import { env } from "../../utils/env.js";

//@ chunk-eg496hkq.js:19652-21165 placement
function scopeUpgradeRefusalText(e) {
  switch (e) {
    case "custom_client":
      return 'The claude.ai login uses a custom OAuth client, which cannot be granted project scopes. Run /login with the standard "Claude account with subscription" flow to use Projects.';
    case "save_failed":
      return "Could not save the refreshed claude.ai credentials (secure storage was unavailable), and the server has already consumed the stored ones. Run /login to reconnect, then retry.";
    case "no_token":
      return 'Run /login and select "Claude account with subscription", then retry \u2014 the "Anthropic Console account" option does not provide claude.ai credentials.';
    case "no_refresh":
      return "The claude.ai login cannot be refreshed in this session \u2014 the token was supplied via CLAUDE_CODE_OAUTH_TOKEN, or its refresh token has expired or was revoked. Run /login to reconnect.";
    case "expand_failed":
      return 'Could not add project scopes to the token. Run /login, select "Claude account with subscription", and retry.';
    case "lock_contended":
      return "Another Claude Code process is refreshing the OAuth token. Retry in a moment.";
    case "wrong_provider":
      return "Projects is only available with claude.ai authentication. It is not supported through Bedrock, Vertex, or other third-party providers.";
    case "essential_traffic_only":
      return "Projects is unavailable while nonessential network traffic is restricted (CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC is set).";
    case "policy_disabled": {
      let { featureLabel: featureLabel, verb: verb } = policyKeyLabel("allow_projects_tool");
      return (
        policyDeniedReason("allow_projects_tool", featureLabel, verb) ?? policyUnverifiedMessage(featureLabel)
      );
    }
  }
}
//@ chunk-eg496hkq.js:21165-21353 placement
var SCOPE_UPGRADED_NOTE =
  "Upgraded your claude.ai login to include project access (user:projects:read, user:projects:write). This lets the session read and write the project's knowledge docs on claude.ai.";
//@ chunk-eg496hkq.js:21353-21469 placement
class ProjectsPreconditionError extends Error {
  reasonCode;
  constructor(e, n) {
    super(e);
    this.reasonCode = n;
    this.name = "ProjectsPreconditionError";
  }
}
//@ chunk-eg496hkq.js:21469-21867 placement
async function ensureProjectsScope(e) {
  let n = await ensureProjectsAccessToken(e);
  if (!n.ok) {
    let r =
        n.reason === "wrong_provider" ||
        n.reason === "essential_traffic_only" ||
        n.reason === "policy_disabled" ||
        n.reason === "lock_contended" ||
        n.reason === "custom_client" ||
        n.reason === "save_failed"
          ? ""
          : "Projects needs a claude.ai login. ",
      s = n.detail ? ` (${n.detail})` : "";
    throw new ProjectsPreconditionError(`${r}${scopeUpgradeRefusalText(n.reason)}${s}`);
  }
  return { accessToken: n.accessToken, expanded: n.expanded };
}
//@ chunk-eg496hkq.js:21867-21910 placement
function getAttachedProjectUuid() {
  return env.CLAUDE_PROJECT_UUID;
}

export { getAttachedProjectUuid, ProjectsPreconditionError, ensureProjectsScope, SCOPE_UPGRADED_NOTE };
