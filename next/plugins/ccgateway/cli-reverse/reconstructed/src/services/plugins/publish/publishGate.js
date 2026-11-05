/**
 * services/plugins/publish/publishGate.ts
 *
 * 2.1.316 新增：插件发布开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4ecjsaj6.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";

//@ chunk-4ecjsaj6.js:226-255 placement
var TENGU_COPPER_GAZETTE = "tengu_copper_gazette";
//@ chunk-4ecjsaj6.js:255-264 placement
/**
 * 插件发布开关的默认值（false）。
 */
var PLUGIN_PUBLISH_DEFAULT = false;
//@ chunk-4ecjsaj6.js:264-288 placement
var isPluginPublishAllowed = () =>
  getFeatureValue_CACHED_MAY_BE_STALE(TENGU_COPPER_GAZETTE, PLUGIN_PUBLISH_DEFAULT) === true;
//@ chunk-4ecjsaj6.js:288-319 placement
var ALLOW_PLUGIN_PUBLISH_KEY = "allow_plugin_publish";
export { isPluginPublishAllowed, ALLOW_PLUGIN_PUBLISH_KEY };
