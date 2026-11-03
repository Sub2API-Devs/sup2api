/**
 * components/PromptInput/promptFlags.ts
 *
 * 2.1.316 新增：输入框状态标志（如粘贴、队列）辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:3877861-3877910 placement
function Gfn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jiggly_mochi", !1);
}
//@ chunk-e6aww6q8.js:3877910-3877959 placement
function h8n() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_panda", !0);
}
//@ chunk-e6aww6q8.js:3877959-3878016 placement
function FFo() {
  return h8n() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bubbly_meteor", !0);
}

export { Gfn, h8n, FFo };
