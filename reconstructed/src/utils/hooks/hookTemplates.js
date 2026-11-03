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
  return externalHookTemplates().map((e) => e.id);
}
//@ chunk-tmxcy2qw.js:319-438 placement
function findTemplateByDigest(e) {
  for (let t of externalHookTemplates()) {
    let found = t.digests.find((digest) => digest.sha256 === e);
    if (found)
      return {
        template: t,
        label: found.label,
      };
  }
  return;
}
//@ chunk-tmxcy2qw.js:438-485 placement
function getHookTemplate(e) {
  return externalHookTemplates().find((t) => t.id === e);
}
//@ chunk-tmxcy2qw.js:485-531 placement
function isPreToolUseTemplate(e) {
  return e.event === "PreToolUse";
}
//@ chunk-tmxcy2qw.js:531-555 placement
function alwaysTrue() {
  return true;
}
export { isPreToolUseTemplate, alwaysTrue, getHookTemplate, findTemplateByDigest, hookTemplateIds };
