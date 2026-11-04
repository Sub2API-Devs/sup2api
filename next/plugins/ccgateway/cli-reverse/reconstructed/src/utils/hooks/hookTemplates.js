/**
 * utils/hooks/hookTemplates.ts
 *
 * 2.1.316 新增：钩子模板查找
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tmxcy2qw.js (7)
 * attribution: placement 7
 */
//@ chunk-tmxcy2qw.js:191-199 placement
var cachedHookTemplates;
var cachedHookTemplatesSource;
//@ chunk-tmxcy2qw.js:199-278 placement
function externalHookTemplates() {
  if (cachedHookTemplates !== undefined && cachedHookTemplatesSource === "external")
    return cachedHookTemplates;
  cachedHookTemplatesSource = "external";
  cachedHookTemplates = [];
  return cachedHookTemplates;
}
//@ chunk-tmxcy2qw.js:278-319 placement
function hookTemplateIds() {
  return externalHookTemplates().map((template) => template.id);
}
//@ chunk-tmxcy2qw.js:319-438 placement
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
//@ chunk-tmxcy2qw.js:438-485 placement
function getHookTemplate(templateId) {
  return externalHookTemplates().find((template) => template.id === templateId);
}
//@ chunk-tmxcy2qw.js:485-531 placement
function isPreToolUseTemplate(template) {
  return template.event === "PreToolUse";
}
//@ chunk-tmxcy2qw.js:531-555 placement
function alwaysTrue() {
  return true;
}
export { isPreToolUseTemplate, alwaysTrue, getHookTemplate, findTemplateByDigest, hookTemplateIds };
