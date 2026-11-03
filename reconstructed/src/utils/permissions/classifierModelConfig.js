/**
 * utils/permissions/classifierModelConfig.ts
 *
 * 2.1.316 新增：分类器模型配置与工具集
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gz7b768t.js (4)
 * attribution: placement 4
 */

//@ chunk-gz7b768t.js:680-686 placement
var c;
//@ chunk-gz7b768t.js:686-729 placement
function initClassifierToolSet(e) {
  if (c === void 0) c = new Set(e);
}
//@ chunk-gz7b768t.js:729-775 placement
function classifierToolSet() {
  if (c === void 0) c = new Set();
  return c;
}
//@ chunk-gz7b768t.js:775-1257 placement
var CLASSIFIER_FEATURE_DEFAULTS = Object.freeze({
    twoStageClassifier: !0,
    sameTurnSiblingContext: !0,
    editRemovalVisibility: !0,
    editRemovalCap: 3000,
    outcomeVisibility: !1,
    repoVisibility: !0,
    gitStatusType: !0,
    gitStatusUploads: !1,
    tagConnectorWrites: !1,
    envOnboarding: !0,
    severityByModel: Object.freeze({
      "claude-sonnet-5[1m]": Object.freeze({ t1: 25, t2: 35 }),
      "claude-opus-4-8[1m]": Object.freeze({ t1: 45, t2: 35 }),
      "claude-sonnet-5": Object.freeze({ t1: 25, t2: 35 }),
      "claude-opus-4-8": Object.freeze({ t1: 45, t2: 35 }),
    }),
  }),
  freeze = Object.freeze({});

export { initClassifierToolSet, CLASSIFIER_FEATURE_DEFAULTS, freeze, classifierToolSet };
