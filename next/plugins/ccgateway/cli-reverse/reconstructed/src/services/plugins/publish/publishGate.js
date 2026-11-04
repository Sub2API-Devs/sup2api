/**
 * services/plugins/publish/publishGate.ts
 *
 * 2.1.316 新增：插件发布开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-27k1q7mc.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";

//@ chunk-27k1q7mc.js:226-255 placement
var TENGU_COPPER_GAZETTE = "tengu_copper_gazette";
//@ chunk-27k1q7mc.js:255-264 placement
/**
 * 插件发布开关的默认值（false）。
 */
var PLUGIN_PUBLISH_DEFAULT = false;
//@ chunk-27k1q7mc.js:264-288 placement
var isPluginPublishAllowed = () =>
  getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COPPER_GAZETTE, PLUGIN_PUBLISH_DEFAULT) === true;
//@ chunk-27k1q7mc.js:288-319 placement
var ALLOW_PLUGIN_PUBLISH_KEY = "allow_plugin_publish";
export { ALLOW_PLUGIN_PUBLISH_KEY, isPluginPublishAllowed };
