/**
 * tools/ShareOnboardingGuideTool/prompt.ts
 *
 * 2.1.316 新增。ShareOnboardingGuide 工具名与提示词（上传 ONBOARDING.md 并返回分享链接）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3h9nvmn3.js (1)
 * attribution: placement 1
 */
//@ chunk-3h9nvmn3.js:1238-1727 placement
var SHAREONBOARDINGGUIDE = "ShareOnboardingGuide";
var SHARE_ONBOARDING_GUIDE_PROMPT = `Upload the ONBOARDING.md in the current directory and return a share link teammates can open in Claude Code. Call this after the user has confirmed the final content.

When called with the default mode='check': if a local ONBOARDING.md is present, uploads it to the most-recently-updated org guide (or creates one if none exist) and returns a fresh link. If no local file is present, returns the existing link without uploading (status: has_existing).`;
export { SHAREONBOARDINGGUIDE, SHARE_ONBOARDING_GUIDE_PROMPT };
