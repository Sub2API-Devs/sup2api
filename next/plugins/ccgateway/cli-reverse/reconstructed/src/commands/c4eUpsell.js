/**
 * commands/c4eUpsell.ts
 *
 * 2.1.316 新增：Claude for Enterprise 升级提示命令与文案
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5xgkngpb.js:2091501-2091547 placement
/**
 * isApiKeyOnlyUser：Oi() 且 Slt()。
 */
function is1PApiCustomerOnFirstParty() {
  if (!isFirstPartyAnthropicBaseUrl()) return false;
  return is1PApiCustomer();
}
//@ chunk-5xgkngpb.js:2091547-2091621 placement
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
//@ chunk-5xgkngpb.js:2091621-2091658 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2091621", () => {
  registerC4EUpsellGate({
    isC4EUpsellCommandEnabled: isEnterpriseUpsellEnabled,
  });
});
//@ chunk-5xgkngpb.js:2091658-2091781 placement (2.1.88 match: hasAnthropicApiKeyAuth, 1)
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
//@ chunk-5xgkngpb.js:2091781-2092180 placement
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
//@ chunk-5xgkngpb.js:2092180-2092543 placement
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
//@ chunk-5xgkngpb.js:2092543-2092570 placement
/**
 * isClaudeAiSubscriberForUpsell：vt()。
 */
function isSubscriber() {
  return isClaudeAISubscriber();
}
//@ chunk-5xgkngpb.js:2092570-2093241 placement
/**
 * ENTERPRISE_UPSELL_COMMANDS：ultraplan/ultrareview/teleport/remote-control/schedule/autofix-pr 的升级提示存根。
 */
var ENTERPRISE_UPSELL_COMMANDS; // deferred: uses createEnterpriseUpsellCommand of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2092570", () => {
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
//@ chunk-5xgkngpb.js:2093241-2093292 placement (2.1.88 match: default, 1)
var stubC4EUpsellCommand = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
export { ENTERPRISE_UPSELL_COMMANDS, stubC4EUpsellCommand, is1PApiCustomerOnFirstParty };
