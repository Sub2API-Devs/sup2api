/**
 * commands/claim-credit/index.ts
 *
 * 2.1.316 新增：/claim-credit 命令对象：领取赠送额度
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { CLAIM_CREDIT, readPromoConfigFromGate } from "../../services/promo/promoState.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPromoOffersBlocked } from "../../utils/planTiers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2105040-2105269 placement
/**
 * /claim-credit 命令对象（local）；描述：Open the page of the offer shown at start-up；isEnabled: ()=>vt()&&!Fie()&&ktr()!==null；isHidden: true；实现 chunk-ndsajhew.js 的 zt。
 */
var claimCreditCommandDefinition; // deferred: uses CLAIM_CREDIT (../../services/promo/promoState.js) of its import cycle while loading; runs once the cycle is complete
var claimCreditCommand;
deferInit("chunk-5xgkngpb.js:2105040", () => {
  claimCreditCommandDefinition = {
    type: "local",
    name: CLAIM_CREDIT,
    description: "Open the page of the offer shown at start-up",
    supportsNonInteractive: false,
    isEnabled: () => isClaudeAISubscriber() && !isPromoOffersBlocked() && readPromoConfigFromGate() !== null,
    isHidden: true,
    requires: {},
    load: () => import("../promo/call.lazy.js"),
  };
  claimCreditCommand = claimCreditCommandDefinition;
});
export { claimCreditCommand };
