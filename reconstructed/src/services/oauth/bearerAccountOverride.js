/**
 * services/oauth/bearerAccountOverride.ts
 *
 * 2.1.316 新增：bearer 令牌对应账号的覆盖记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n96d6ab0.js (2)
 * attribution: placement 2
 */
import { identity } from "../../utils/identity.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { claimedCredential, envDriftDetected } from "../../entrypoints/warmSpare/claimCredentials.js";
import { computeContentHash } from "../../utils/commitAttribution.js";

//@ chunk-n96d6ab0.js:376-410 placement
/**
 * 保存 bootstrap 返回的账号覆盖（可重置）。
 */
var bearerAccountOverride = identity(pu(), (e) => e.set(null));
//@ chunk-n96d6ab0.js:410-514 placement
/**
 * 托管设置使用 bearer 令牌且哈希匹配时，记录 bootstrap 返回的账号覆盖。
 */
function recordBearerAccountOverride(fingerprint, o) {
  let r = hasManagedSettings() ? claimedCredential() : null;
  if (r?.kind === "bearer" && computeContentHash(r.token) === fingerprint && !envDriftDetected())
    bearerAccountOverride.set(o ?? null);
}
export { recordBearerAccountOverride, bearerAccountOverride };
