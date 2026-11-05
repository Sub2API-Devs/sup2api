/**
 * utils/settings/permissionRuleCarveOut.ts
 *
 * 2.1.316 新增：max effort 的说明文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-z20c443b.js:188625-188746 placement
/**
 * max effort 的说明文本。
 */
var MAX_EFFORT_DESCRIPTION =
  "May use excessive tokens resulting in long response times or overthinking. Use sparingly for the hardest tasks.";
//@ chunk-z20c443b.js:188746-188782 placement
var PATH_RULE_CARVE_OUT_RE = /^(?:Read|Edit)\((?:\.\/)?!/;
//@ chunk-z20c443b.js:188782-188829 placement
/**
 * normalizeCarveOutFlag：覆盖开关归一（undefined/false 保留）。
 */
function normalizeCarveOutFlag(disablePluginDirectory) {
  return disablePluginDirectory === undefined || disablePluginDirectory === false
    ? disablePluginDirectory
    : true;
}
export { PATH_RULE_CARVE_OUT_RE, MAX_EFFORT_DESCRIPTION, normalizeCarveOutFlag };
