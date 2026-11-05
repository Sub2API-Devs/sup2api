/**
 * utils/hooks/hookTemplates.ts
 *
 * 2.1.316 新增：钩子模板查找
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vt3ahd2r.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-vt3ahd2r.js:191-199 placement
var cachedHookTemplates;
var cachedHookTemplatesSource;
//@ chunk-vt3ahd2r.js:199-278 placement
function externalHookTemplates() {
  if (cachedHookTemplates !== undefined && cachedHookTemplatesSource === "external")
    return cachedHookTemplates;
  cachedHookTemplatesSource = "external";
  cachedHookTemplates = [];
  return cachedHookTemplates;
}
//@ chunk-vt3ahd2r.js:278-319 placement
function hookTemplateIds() {
  return externalHookTemplates().map((template) => template.id);
}
//@ chunk-vt3ahd2r.js:319-438 placement
function findTemplateByDigest(digest) {
  for (let template of externalHookTemplates()) {
    let found = template.digests.find((digest_2) => digest_2.sha256 === digest);
    if (found)
      return {
        template,
        label: found.label,
      };
  }
  return;
}
//@ chunk-vt3ahd2r.js:438-485 placement
function getHookTemplate(templateId) {
  return externalHookTemplates().find((template) => template.id === templateId);
}
//@ chunk-vt3ahd2r.js:485-531 placement
function isPreToolUseTemplate(template) {
  return template.event === "PreToolUse";
}
//@ chunk-vt3ahd2r.js:531-555 placement
function alwaysTrue() {
  return true;
}
export { findTemplateByDigest, hookTemplateIds, getHookTemplate, alwaysTrue, isPreToolUseTemplate };
