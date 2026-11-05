/**
 * services/oauth/bearerAccountOverride.ts
 *
 * 2.1.316 新增：bearer 令牌对应账号的覆盖记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-x8vqv0nj.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../utils/identity.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { claimedCredential, envDriftDetected } from "../../entrypoints/warmSpare/claimCredentials.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-x8vqv0nj.js:376-410 placement
/**
 * 保存 bootstrap 返回的账号覆盖（可重置）。
 */
var bearerAccountOverride; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-x8vqv0nj.js:376", () => {
  bearerAccountOverride = identity(subscribe(), (state) => state.set(null));
});
//@ chunk-x8vqv0nj.js:410-514 placement
/**
 * 托管设置使用 bearer 令牌且哈希匹配时，记录 bootstrap 返回的账号覆盖。
 */
function recordBearerAccountOverride(fingerprint, account) {
  let credential = hasManagedSettings() ? claimedCredential() : null;
  if (
    credential?.kind === "bearer" &&
    computeContentHash(credential.token) === fingerprint &&
    !envDriftDetected()
  )
    bearerAccountOverride.set(account ?? null);
}
export { bearerAccountOverride, recordBearerAccountOverride };
