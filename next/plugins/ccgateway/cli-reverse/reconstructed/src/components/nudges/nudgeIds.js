/**
 * components/nudges/nudgeIds.ts
 *
 * 2.1.316 新增：输入框提示（nudge）id 常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vr5v4gzz.js (4)
 * attribution: placement 4
 */
import { noBridgeControlContext } from "../../bridge/replBridgeControl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vr5v4gzz.js:15053-15350 placement
/**
 * 输入框提示（nudge）id 常量：effort_medium_nudge、auto_default_nudge、ultraplan_choice、cost_threshold、autocompact_offer 等。
 */
var EFFORT_MEDIUM_NUDGE = "effort_medium_nudge";
var PROGRAM_USE_CASE_QUESTION = "program_use_case_question";
var AUTO_DEFAULT_NUDGE = "auto_default_nudge";
var ULTRAPLAN_CHOICE = "ultraplan_choice";
var COST_THRESHOLD = "cost_threshold";
var AUTOCOMPACT_OFFER = "autocompact_offer";
var AUTO_MODE_SERVER_FALLBACK = "auto_mode_server_fallback";
var RESUME_RETURN = "resume_return";
var ENUM_PROMPT = "enum_prompt";
var COLD_RESUME_QUOTA = "cold_resume_quota";
var NEWER_MODEL_OFFER = "newer_model_offer";
var FULLSCREEN_UPSELL = "fullscreen_upsell";
//@ chunk-vr5v4gzz.js:15350-15363 placement
/**
 * 导出值：NUDGE_ID_A（空 nudge id 占位）。
 */
var NUDGE_ID_A = null;
//@ chunk-vr5v4gzz.js:15363-15386 placement
/**
 * 导出值：同一声明里的多个绑定：NUDGE_ID_B（空 nudge id 占位）；NUDGE_ID_C（空 nudge id 占位）。
 */
var NUDGE_ID_B; // deferred: uses noBridgeControlContext (../../bridge/replBridgeControl.js) of its import cycle while loading; runs once the cycle is complete
var hasNoBridgeControl;
deferInit("chunk-vr5v4gzz.js:15363", () => {
  NUDGE_ID_B = null;
  hasNoBridgeControl = noBridgeControlContext();
});
//@ chunk-vr5v4gzz.js:15413-15426 placement
var NUDGE_ID_C = null;
export {
  ENUM_PROMPT,
  AUTO_MODE_SERVER_FALLBACK,
  ULTRAPLAN_CHOICE,
  AUTOCOMPACT_OFFER,
  COLD_RESUME_QUOTA,
  AUTO_DEFAULT_NUDGE,
  FULLSCREEN_UPSELL,
  EFFORT_MEDIUM_NUDGE,
  PROGRAM_USE_CASE_QUESTION,
  NEWER_MODEL_OFFER,
  COST_THRESHOLD,
  RESUME_RETURN,
  NUDGE_ID_C,
  NUDGE_ID_B,
  NUDGE_ID_A,
  hasNoBridgeControl,
};
