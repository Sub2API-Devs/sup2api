/**
 * hooks/useAfterFirstRender.ts
 *
 * 首帧渲染后执行一次回调的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useAfterFirstRender.ts
 * pieces: chunk-hjswk319.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../utils/env.js";
import { isBareMode } from "../utils/envUtils.js";

//@ chunk-hjswk319.js:100529-100594 fingerprint (2.1.88 match: useAfterFirstRender, 0.326)
function useAfterFirstRender() {
  return env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER || isBareMode();
}
export { useAfterFirstRender };
