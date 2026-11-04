/**
 * bridge/harborKiteCloud.ts
 *
 * 2.1.316 新增：云会话设备绑定相关的小型开关判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-96k5yyba.js (2)
 * attribution: placement 2
 */
import { isCrossSessionMessagingEnabled } from "../utils/crossSessionMessagingGate.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { isPolicyAllowed } from "../services/policyLimits/policyEvidence.js";
import { isClaudeAISubscriber, getOauthAccountInfo, hasProfileScope } from "../utils/auth.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-96k5yyba.js:3522-3726 placement
function isHarborKiteCloudEnabled() {
  if (!isCrossSessionMessagingEnabled()) return false;
  if (
    getAPIProvider() !== "firstParty" ||
    isEssentialTrafficOnly() ||
    !isPolicyAllowed("allow_remote_sessions")
  )
    return false;
  if (!isClaudeAISubscriber() || !hasOrganizationContext()) return false;
  return (
    Boolean(env.CLAUDE_CODE_HARBOR_KITE_CLOUD) ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_cloud", false)
  );
}
//@ chunk-96k5yyba.js:3726-3826 placement
function hasOrganizationContext() {
  return (
    Boolean(env.CLAUDE_CODE_ORGANIZATION_UUID) ||
    Boolean(getOauthAccountInfo()?.organizationUuid) ||
    hasProfileScope()
  );
}
export { isHarborKiteCloudEnabled };
