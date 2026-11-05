/**
 * utils/permissions/classifierModelConfig.ts
 *
 * 2.1.316 新增：分类器模型配置与工具集
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c378z4w4.js (4)
 * attribution: placement 4
 */

//@ chunk-c378z4w4.js:680-686 placement
var classifierToolSetCache;
//@ chunk-c378z4w4.js:686-729 placement
function initClassifierToolSet(toolNames) {
  if (classifierToolSetCache === undefined) classifierToolSetCache = new Set(toolNames);
}
//@ chunk-c378z4w4.js:729-775 placement
function classifierToolSet() {
  if (classifierToolSetCache === undefined) classifierToolSetCache = new Set();
  return classifierToolSetCache;
}
//@ chunk-c378z4w4.js:775-1257 placement
var CLASSIFIER_FEATURE_DEFAULTS = Object.freeze({
  twoStageClassifier: true,
  sameTurnSiblingContext: true,
  editRemovalVisibility: true,
  editRemovalCap: 3000,
  outcomeVisibility: false,
  repoVisibility: true,
  gitStatusType: true,
  gitStatusUploads: false,
  tagConnectorWrites: false,
  envOnboarding: true,
  severityByModel: Object.freeze({
    "claude-sonnet-5[1m]": Object.freeze({
      t1: 25,
      t2: 35,
    }),
    "claude-opus-4-8[1m]": Object.freeze({
      t1: 45,
      t2: 35,
    }),
    "claude-sonnet-5": Object.freeze({
      t1: 25,
      t2: 35,
    }),
    "claude-opus-4-8": Object.freeze({
      t1: 45,
      t2: 35,
    }),
  }),
});
var defaultConfig = Object.freeze({});
export { defaultConfig, CLASSIFIER_FEATURE_DEFAULTS, initClassifierToolSet, classifierToolSet };
