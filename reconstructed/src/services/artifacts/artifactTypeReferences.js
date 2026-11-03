/**
 * services/artifacts/artifactTypeReferences.ts
 *
 * 2.1.316 新增：各 Artifact 类型（design、slides 等）的参考文档列表与用途（创建时内联、打印、由套件读取）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-75vetdac.js (7)
 * attribution: placement 7
 */

//@ chunk-75vetdac.js:191-323 placement
function typeReference(r, e, a, i = !1, s = !1) {
  return {
    path: `artifact-type/reference/${r}`,
    inlinedByCreate: e,
    printed: a,
    readByKit: i,
    needsDesignSystem: s,
  };
}
/**
 * 各 artifact 类型（design、migrated-design、slides）的参考文档清单：路径、创建时是否内联、是否打印、是否由套件读取、是否需要设计系统；DEFAULT_TYPE_REFERENCES 为其他类型的默认清单。
 */
//@ chunk-75vetdac.js:323-720 placement
var ARTIFACT_TYPE_REFERENCES = new Map([
    [
      "design",
      [
        typeReference("format.md", !0, !0, !0),
        typeReference("design-system-components.md", !0, !1, !0, !0),
        typeReference("fonts.md", !1, !0),
        typeReference("craft.md", !1, !0),
      ],
    ],
    [
      "migrated-design",
      [
        typeReference("format.md", !0, !0),
        typeReference("fonts.md", !1, !0),
        typeReference("craft.md", !1, !0),
      ],
    ],
    [
      "slides",
      [
        typeReference("format.md", !0, !0, !0),
        typeReference("fonts.md", !0, !0, !0),
        typeReference("craft.md", !1, !0),
        typeReference("deck-files.md", !1, !1, !0),
      ],
    ],
  ]),
  DEFAULT_TYPE_REFERENCES = [
    typeReference("format.md", !1, !0),
    typeReference("fonts.md", !1, !0),
    typeReference("craft.md", !1, !0),
  ];
//@ chunk-75vetdac.js:720-774 placement
function n(r) {
  return (r === void 0 ? void 0 : ARTIFACT_TYPE_REFERENCES.get(r)) ?? DEFAULT_TYPE_REFERENCES;
}
//@ chunk-75vetdac.js:774-850 placement
function N$s(r) {
  return n(r)
    .filter((e) => e.inlinedByCreate)
    .map((e) => e.path);
}
//@ chunk-75vetdac.js:850-947 placement
function $$s(r) {
  return n(r)
    .filter((e) => e.inlinedByCreate && e.needsDesignSystem)
    .map((e) => e.path);
}
//@ chunk-75vetdac.js:947-1015 placement
function NMr(r) {
  return n(r)
    .filter((e) => e.printed)
    .map((e) => e.path);
}
//@ chunk-75vetdac.js:1015-1085 placement
function F$s(r) {
  return n(r)
    .filter((e) => e.readByKit)
    .map((e) => e.path);
}

export { NMr, F$s, ARTIFACT_TYPE_REFERENCES, N$s, $$s };
