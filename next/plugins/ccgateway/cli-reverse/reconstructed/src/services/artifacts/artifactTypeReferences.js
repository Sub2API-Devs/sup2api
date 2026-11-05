/**
 * services/artifacts/artifactTypeReferences.ts
 *
 * 2.1.316 新增：各 Artifact 类型（design、slides 等）的参考文档列表与用途（创建时内联、打印、由套件读取）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mzeyg7fv.js (7)
 * attribution: placement 7
 */

//@ chunk-mzeyg7fv.js:191-323 placement
function typeReference(typeSlug, inlinedByCreate, printed, readByKit = false, needsDesignSystem = false) {
  return {
    path: `artifact-type/reference/${typeSlug}`,
    inlinedByCreate,
    printed,
    readByKit,
    needsDesignSystem,
  };
}
//@ chunk-mzeyg7fv.js:323-720 placement
/**
 * 各 artifact 类型（design、migrated-design、slides）的参考文档清单：路径、创建时是否内联、是否打印、是否由套件读取、是否需要设计系统；DEFAULT_TYPE_REFERENCES 为其他类型的默认清单。
 */
var ARTIFACT_TYPE_REFERENCES = new Map([
  [
    "design",
    [
      typeReference("format.md", true, true, true),
      typeReference("design-system-components.md", true, false, true, true),
      typeReference("fonts.md", false, true),
      typeReference("craft.md", false, true),
    ],
  ],
  [
    "migrated-design",
    [
      typeReference("format.md", true, true),
      typeReference("fonts.md", false, true),
      typeReference("craft.md", false, true),
    ],
  ],
  [
    "slides",
    [
      typeReference("format.md", true, true, true),
      typeReference("fonts.md", true, true, true),
      typeReference("craft.md", false, true),
      typeReference("deck-files.md", false, false, true),
    ],
  ],
]);
var DEFAULT_TYPE_REFERENCES = [
  typeReference("format.md", false, true),
  typeReference("fonts.md", false, true),
  typeReference("craft.md", false, true),
];
//@ chunk-mzeyg7fv.js:720-774 placement
/**
 * 按 artifact 类型取参考文件清单，并按“创建时内联/需要设计系统/打印/kit 读取”筛选的四个辅助函数。
 */
function typeReferencesFor(typeSlug) {
  return (
    (typeSlug === undefined ? undefined : ARTIFACT_TYPE_REFERENCES.get(typeSlug)) ?? DEFAULT_TYPE_REFERENCES
  );
}
//@ chunk-mzeyg7fv.js:774-850 placement
/**
 * 导出函数 `inlinedByCreatePaths`：参数 r，返回 n(r) .filter((e) => e.inlinedByCreate) .map((e) => e.path)。
 */
function inlinedByCreatePaths(types) {
  return typeReferencesFor(types)
    .filter((reference) => reference.inlinedByCreate)
    .map((reference) => reference.path);
}
//@ chunk-mzeyg7fv.js:850-947 placement
/**
 * 导出函数 `inlinedByCreateDesignPaths`：参数 r，返回 n(r) .filter((e) => e.inlinedByCreate && e.needsDesignSystem) .map((e) => e.path)。
 */
function inlinedByCreateDesignPaths(types) {
  return typeReferencesFor(types)
    .filter((reference) => reference.inlinedByCreate && reference.needsDesignSystem)
    .map((reference) => reference.path);
}
//@ chunk-mzeyg7fv.js:947-1015 placement
/**
 * 导出函数 `printedTypePaths`：参数 r，返回 n(r) .filter((e) => e.printed) .map((e) => e.path)。
 */
function printedTypePaths(types) {
  return typeReferencesFor(types)
    .filter((reference) => reference.printed)
    .map((reference) => reference.path);
}
//@ chunk-mzeyg7fv.js:1015-1085 placement
/**
 * 导出函数 `kitReadTypePaths`：参数 r，返回 n(r) .filter((e) => e.readByKit) .map((e) => e.path); } export { NMr, F$s, ARTIFACT_TYPE_REFERENCES, N$s, $$s …。
 */
function kitReadTypePaths(typeKey) {
  return typeReferencesFor(typeKey)
    .filter((reference) => reference.readByKit)
    .map((reference) => reference.path);
}
export {
  printedTypePaths,
  kitReadTypePaths,
  ARTIFACT_TYPE_REFERENCES,
  inlinedByCreatePaths,
  inlinedByCreateDesignPaths,
};
