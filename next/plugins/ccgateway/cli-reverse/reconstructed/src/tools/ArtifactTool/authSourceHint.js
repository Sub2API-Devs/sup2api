/**
 * tools/ArtifactTool/authSourceHint.ts
 *
 * 2.1.316 新增：认证来源提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import {
  ARTIFACT_LOGIN_PROXIED_MESSAGE,
  ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE,
  artifactLoginBlockedByCredentialMessage,
  artifactLoginEnvQuadMessage,
  ARTIFACT_LOGIN_REQUIRED_MESSAGE,
} from "./constants.js";
import { authOverriddenBlock, authExpiredBlock } from "../../services/policyLimits/capabilityBlocks.js";
import {
  getAuthTokenSource,
  getAnthropicApiKeyWithSourceSafe,
  describeHowToDisableAuthTokenSource,
} from "../../utils/auth.js";
import {
  hasPossibleCredentialFromDescriptor,
  getApiKeyFromFileDescriptor,
} from "../../utils/authFileDescriptor.js";
import { getWIFPrecedenceSource } from "../../utils/wifProfile.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";

//@ chunk-xzmy9dn4.js:23556-24674 placement
/**
 * Artifact 需要 claude.ai 登录而当前认证来源会遮蔽登录时给出说明与补救：Unix socket 代理、宿主管理的文件描述符令牌、ANTHROPIC_API_KEY、apiKeyHelper 等。
 */
function artifactLoginBlockedReason() {
  if (env.ANTHROPIC_UNIX_SOCKET)
    return {
      message: ARTIFACT_LOGIN_PROXIED_MESSAGE,
      remedy: authOverriddenBlock(true),
    };
  let source = getAuthTokenSource().source;
  if (
    hasPossibleCredentialFromDescriptor("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR") ||
    (!env.ANTHROPIC_API_KEY && getApiKeyFromFileDescriptor() !== null) ||
    source === "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR" ||
    source === "CCR_OAUTH_TOKEN_FILE"
  )
    return {
      message: ARTIFACT_LOGIN_HOST_MANAGED_MESSAGE,
      remedy: authOverriddenBlock(true),
    };
  let { source: source_2 } = getAnthropicApiKeyWithSourceSafe({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  if (source_2 === "ANTHROPIC_API_KEY")
    return {
      message: artifactLoginBlockedByCredentialMessage(
        "the ANTHROPIC_API_KEY environment variable",
        'Unset the ANTHROPIC_API_KEY environment variable, or claude /logout then say "No" to the API key approval before login.',
      ),
      remedy: authOverriddenBlock(false),
    };
  if (source_2 === "apiKeyHelper")
    return {
      message: artifactLoginBlockedByCredentialMessage(
        "the apiKeyHelper setting",
        "Unset the apiKeyHelper setting.",
      ),
      remedy: authOverriddenBlock(false),
    };
  if (source === "profile" && source_2 === "/login managed key" && getWIFPrecedenceSource() === "env-quad")
    return {
      message: artifactLoginBlockedByCredentialMessage(
        "a Console API key saved by a previous /login",
        "Run /logout to clear the saved key.",
      ),
      remedy: authOverriddenBlock(false),
    };
  if (source === "profile" && getWIFPrecedenceSource() === "env-quad")
    return {
      message: artifactLoginEnvQuadMessage(
        Boolean(getSettingsForSource("policySettings")?.env?.ANTHROPIC_FEDERATION_RULE_ID),
      ),
      remedy: authExpiredBlock(),
    };
  if (source !== "none" && source !== "claude.ai")
    return {
      message: artifactLoginBlockedByCredentialMessage(source, describeHowToDisableAuthTokenSource(source)),
      remedy: authOverriddenBlock(false),
    };
  return {
    message: ARTIFACT_LOGIN_REQUIRED_MESSAGE,
    remedy: authExpiredBlock(),
  };
}
export { artifactLoginBlockedReason };
