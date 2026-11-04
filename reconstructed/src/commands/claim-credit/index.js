/**
 * commands/claim-credit/index.ts
 *
 * 2.1.316 新增：/claim-credit 命令对象：领取赠送额度
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { CLAIM_CREDIT, readPromoConfigFromGate } from "../../services/promo/promoState.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPromoOffersBlocked } from "../../utils/planTiers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2048898-2049127 placement
/**
 * /claim-credit 命令对象（local）；描述：Open the page of the offer shown at start-up；isEnabled: ()=>vt()&&!Fie()&&ktr()!==null；isHidden: true；实现 chunk-ndsajhew.js 的 zt。
 */
var claimCreditCommandDefinition; // deferred: uses CLAIM_CREDIT (../../services/promo/promoState.js) of its import cycle while loading; runs once the cycle is complete
var claimCreditCommand;
deferInit("chunk-e6aww6q8.js:2048898", () => {
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
