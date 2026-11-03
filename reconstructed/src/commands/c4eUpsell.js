/**
 * commands/c4eUpsell.ts
 *
 * 2.1.316 新增：Claude for Enterprise 升级提示命令与文案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { isFirstPartyAnthropicBaseUrl } from "../utils/model/providers.js";
import {
  is1PApiCustomer,
  getAuthTokenSource,
  getAnthropicApiKeyWithSourceSafe,
  isClaudeAISubscriber,
} from "../utils/auth.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { Pri } from "./bridge/c4eUpsellRegistry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isRemoteControlHardDisabled } from "../bridge/bridgeEntitlement.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "../bridge/remoteControlPolicy.js";

/**
 * isApiKeyOnlyUser：Oi() 且 Slt()。
 */
//@ chunk-e6aww6q8.js:2035684-2035730 placement
function jwt() {
  if (!isFirstPartyAnthropicBaseUrl()) return !1;
  return is1PApiCustomer();
}
/**
 * isEnterpriseUpsellEnabled：tengu_c4e_slash_upsell。
 */
//@ chunk-e6aww6q8.js:2035730-2035804 placement
function isEnterpriseUpsellEnabled() {
  return (
    !Kor() &&
    jwt() &&
    !getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_c4e_slash_upsell", !1)
  );
}
//@ chunk-e6aww6q8.js:2035804-2035841 placement
Pri({ isC4EUpsellCommandEnabled: isEnterpriseUpsellEnabled });
/**
 * isSignedOut：无 OAuth 也无 API key。
 */
//@ chunk-e6aww6q8.js:2035841-2035964 placement = hasAnthropicApiKeyAuth (1)
function isSignedOut() {
  try {
    return (
      getAuthTokenSource().source === "none" &&
      getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }).source === "none"
    );
  } catch {
    return !1;
  }
}
/**
 * getEnterpriseUpsellMessage：policy_disabled / signed_out / c4e 三种文案。
 */
//@ chunk-e6aww6q8.js:2035964-2036363 placement
function getEnterpriseUpsellMessage(spec) {
  if (spec.managedDisabled?.isDisabled())
    return { variant: "policy_disabled", value: spec.managedDisabled.reason };
  if (isSignedOut())
    return {
      variant: "signed_out",
      value: `/${spec.name} requires a claude.ai subscription. Run /login to sign in with your claude.ai account.`,
    };
  return {
    variant: "c4e",
    value: `/${spec.name} is available with Claude for Enterprise \u2014 ask your admin about migrating from API-key access.`,
  };
}
/**
 * createEnterpriseUpsellCommand：隐藏 local 命令，提示需要 Claude for Enterprise。
 */
//@ chunk-e6aww6q8.js:2036363-2036726 placement
function createEnterpriseUpsellCommand(spec) {
  return {
    type: "local",
    name: spec.name,
    aliases: spec.aliases,
    description: `${spec.description} \u2014 available with Claude for Enterprise`,
    isEnabled: isEnterpriseUpsellEnabled,
    isHidden: !0,
    supportsNonInteractive: !1,
    load: () =>
      Promise.resolve({
        call: async () => {
          let { variant: variant, value: r } = getEnterpriseUpsellMessage(spec);
          return (
            logEvent("tengu_c4e_slash_upsell_shown", {
              command: fromEnum(spec.name),
              variant: fromEnum(variant),
            }),
            { type: "text", value: r }
          );
        },
      }),
  };
}
/**
 * isClaudeAiSubscriberForUpsell：vt()。
 */
//@ chunk-e6aww6q8.js:2036726-2036753 placement
function Kor() {
  return isClaudeAISubscriber();
}
/**
 * ENTERPRISE_UPSELL_COMMANDS：ultraplan/ultrareview/teleport/remote-control/schedule/autofix-pr 的升级提示存根。
 */
//@ chunk-e6aww6q8.js:2036753-2037425 placement
var ENTERPRISE_UPSELL_COMMANDS = [
  createEnterpriseUpsellCommand({
    name: "ultraplan",
    description: "A cloud session drafts a plan you can edit and approve",
  }),
  createEnterpriseUpsellCommand({
    name: "ultrareview",
    description: "Find and verify bugs in your branch using a cloud session",
  }),
  createEnterpriseUpsellCommand({
    name: "teleport",
    aliases: ["tp"],
    description: "Send this session to the cloud, or resume one from claude.ai",
  }),
  createEnterpriseUpsellCommand({
    name: "remote-control",
    aliases: ["rc"],
    description: "Control this session from your phone or claude.ai/code",
    managedDisabled: {
      isDisabled: () => isRemoteControlHardDisabled(),
      reason: REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE,
    },
  }),
  createEnterpriseUpsellCommand({
    name: "schedule",
    aliases: ["routines"],
    description: "Create and manage scheduled remote Claude Code agents",
  }),
  createEnterpriseUpsellCommand({
    name: "autofix-pr",
    description: "Monitor and autofix any issues with the current PR",
  }),
];
//@ chunk-e6aww6q8.js:2037425-2037476 placement = default (1)
var Crn = { isEnabled: () => !1, isHidden: !0, name: "stub" };

export { jwt, Crn, ENTERPRISE_UPSELL_COMMANDS };
