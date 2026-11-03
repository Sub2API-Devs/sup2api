/**
 * hooks/useAfterFirstRender.ts
 *
 * 首帧渲染后执行一次回调的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useAfterFirstRender.ts
 * pieces: chunk-3wek6r2k.js (1)
 * attribution: fingerprint 1
 */
import { env } from "../utils/env.js";
import { isBareMode } from "../utils/envUtils.js";

//@ chunk-3wek6r2k.js:101113-101178 fingerprint = useAfterFirstRender (0.326)
function useAfterFirstRender() {
  return env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER || isBareMode();
}

export { useAfterFirstRender };
