/**
 * utils/storage/pinStorageV5.ts
 *
 * 2.1.316 新增。固定 v5 存储后端选择。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zxs3jrb9.js (1)
 * attribution: placement 1
 */
import { recordHoverRestDecision, tryCreateV5Backend, adoptStorageV5EnvPin } from "./storageV5EnvPin.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-zxs3jrb9.js:341-464 placement
/**
 * 固定 v5 存储后端选择。
 */
function pinStorageV5(e) {
  recordHoverRestDecision(
    env.CLAUDE_CODE_HOVER_REST ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_hover_rest", false),
  );
  if (e === undefined) return isStorageV5Enabled() ? tryCreateV5Backend() : undefined;
  return adoptStorageV5EnvPin(e);
}
export { pinStorageV5 };
