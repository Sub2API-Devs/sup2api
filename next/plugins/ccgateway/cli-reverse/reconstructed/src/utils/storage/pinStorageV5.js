/**
 * utils/storage/pinStorageV5.ts
 *
 * 2.1.316 新增。固定 v5 存储后端选择。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h833kgtd.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { recordHoverRestDecision, tryCreateV5Backend, adoptStorageV5EnvPin } from "./storageV5EnvPin.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isStorageV5Enabled } from "../hoverRest.js";

//@ chunk-h833kgtd.js:341-464 placement
/**
 * 固定 v5 存储后端选择。
 */
function pinStorageV5(pin) {
  recordHoverRestDecision(
    env.CLAUDE_CODE_HOVER_REST ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_hover_rest", false),
  );
  if (pin === undefined) return isStorageV5Enabled() ? tryCreateV5Backend() : undefined;
  return adoptStorageV5EnvPin(pin);
}
export { pinStorageV5 };
