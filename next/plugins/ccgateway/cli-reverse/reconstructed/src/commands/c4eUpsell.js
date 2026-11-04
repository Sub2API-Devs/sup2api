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
import { registerC4EUpsellGate } from "./bridge/c4eUpsellRegistry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isRemoteControlHardDisabled } from "../bridge/bridgeEntitlement.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "../bridge/remoteControlPolicy.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2035684-2035730 placement
/**
 * isApiKeyOnlyUser：Oi() 且 Slt()。
 */
function is1PApiCustomerOnFirstParty() {
  if (!isFirstPartyAnthropicBaseUrl()) return false;
  return is1PApiCustomer();
}
//@ chunk-e6aww6q8.js:2035730-2035804 placement
/**
 * isEnterpriseUpsellEnabled：tengu_c4e_slash_upsell。
 */
function isEnterpriseUpsellEnabled() {
  return (
    !isSubscriber() &&
    is1PApiCustomerOnFirstParty() &&
    !getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_c4e_slash_upsell", false)
  );
}
//@ chunk-e6aww6q8.js:2035804-2035841 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:2035804", () => {
  registerC4EUpsellGate({
    isC4EUpsellCommandEnabled: isEnterpriseUpsellEnabled,
  });
});
//@ chunk-e6aww6q8.js:2035841-2035964 placement (2.1.88 match: hasAnthropicApiKeyAuth, 1)
/**
 * isSignedOut：无 OAuth 也无 API key。
 */
function isSignedOut() {
  try {
    return (
      getAuthTokenSource().source === "none" &&
      getAnthropicApiKeyWithSourceSafe({
        skipRetrievingKeyFromApiKeyHelper: true,
      }).source === "none"
    );
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:2035964-2036363 placement
/**
 * getEnterpriseUpsellMessage：policy_disabled / signed_out / c4e 三种文案。
 */
function getEnterpriseUpsellMessage(spec) {
  if (spec.managedDisabled?.isDisabled())
    return {
      variant: "policy_disabled",
      value: spec.managedDisabled.reason,
    };
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
//@ chunk-e6aww6q8.js:2036363-2036726 placement
/**
 * createEnterpriseUpsellCommand：隐藏 local 命令，提示需要 Claude for Enterprise。
 */
function createEnterpriseUpsellCommand(spec) {
  return {
    type: "local",
    name: spec.name,
    aliases: spec.aliases,
    description: `${spec.description} \u2014 available with Claude for Enterprise`,
    isEnabled: isEnterpriseUpsellEnabled,
    isHidden: true,
    supportsNonInteractive: false,
    load: () =>
      Promise.resolve({
        call: async () => {
          let { variant, value: messageText } = getEnterpriseUpsellMessage(spec);
          logEvent("tengu_c4e_slash_upsell_shown", {
            command: fromEnum(spec.name),
            variant: fromEnum(variant),
          });
          return {
            type: "text",
            value: messageText,
          };
        },
      }),
  };
}
//@ chunk-e6aww6q8.js:2036726-2036753 placement
/**
 * isClaudeAiSubscriberForUpsell：vt()。
 */
function isSubscriber() {
  return isClaudeAISubscriber();
}
//@ chunk-e6aww6q8.js:2036753-2037425 placement
/**
 * ENTERPRISE_UPSELL_COMMANDS：ultraplan/ultrareview/teleport/remote-control/schedule/autofix-pr 的升级提示存根。
 */
var ENTERPRISE_UPSELL_COMMANDS; // deferred: uses createEnterpriseUpsellCommand of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:2036753", () => {
  ENTERPRISE_UPSELL_COMMANDS = [
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
});
//@ chunk-e6aww6q8.js:2037425-2037476 placement (2.1.88 match: default, 1)
var stubC4EUpsellCommand = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
export { is1PApiCustomerOnFirstParty, stubC4EUpsellCommand, ENTERPRISE_UPSELL_COMMANDS };
