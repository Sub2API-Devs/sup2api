/**
 * commands/review/reviewModels.ts
 *
 * 2.1.316 新增：各审查等级使用的模型与代理数配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hantmvxa.js (7)
 * attribution: placement 7
 */
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import {
  buildLowEffortPrompt,
  buildLowEffortInlinePrompt,
  buildMediumReviewPrompt,
  buildHighEffortPrompt,
  buildXhighEffortPrompt,
  buildMaxEffortPrompt,
} from "./reviewPhases.js";
import {
  REVIEW_REUSE_ANGLE_LOW_EFFORT,
  REVIEW_ANGLE_E,
  REVIEW_MINIMAL_PROMPT,
  REVIEW_ANGLE_I,
  buildMinimalReviewPrompt,
} from "./cleanupAngles.js";

//@ chunk-hantmvxa.js:77878-77920 placement
function isKnownReviewModelKey(e) {
  return Object.hasOwn(REVIEW_LEVEL_TABLE_BY_MODEL, e);
}
//@ chunk-hantmvxa.js:77920-77988 placement
function normalizeReviewModelKey(e) {
  let n = e ? getCanonicalName(strip1mSuffix(e)) : undefined;
  return n && isKnownReviewModelKey(n) ? n : "default";
}
//@ chunk-hantmvxa.js:77988-78963 placement
/**
 * 按模型与 effort 档位查评审单元与 modelEffort 的映射表（default/sonnet5/opus4-8/opus5），含冻结。
 */
var REVIEW_LEVEL_TABLE = {
  cell: "low",
  modelEffort: "typed",
  finderBudgetHint: false,
};
var reviewLevel = (cell) => ({
  cell,
  modelEffort: "typed",
  finderBudgetHint: false,
});
var MODELS_WITH_MAX_CELL = new Set(["claude-opus-4-8", "claude-opus-5"]);
var REVIEW_CELL_OVERRIDES = {
  "claude-sonnet-5": "sonnet5",
  "claude-opus-4-8": "hc10",
};
var DEFAULT_REVIEW_LEVELS = {
  low: REVIEW_LEVEL_TABLE,
  medium: {
    ...reviewLevel("o48-high-v1"),
    measuredExternal: true,
  },
  high: {
    ...reviewLevel("o48-high-v1"),
    measuredExternal: true,
  },
  xhigh: {
    ...reviewLevel("o48-xhigh-v1"),
    measuredExternal: true,
  },
  max: reviewLevel("max"),
};
var OPUS5_REVIEW_LEVELS = {
  ...DEFAULT_REVIEW_LEVELS,
  medium: {
    ...reviewLevel("o5-bmin"),
    measuredExternal: true,
  },
  high: {
    ...reviewLevel("o5-bmin"),
    measuredExternal: true,
  },
};
var REVIEW_LEVEL_TABLE_BY_MODEL = {
  default: DEFAULT_REVIEW_LEVELS,
  "claude-sonnet-5": {
    low: {
      cell: "low-sonnet5",
      modelEffort: "medium",
      finderBudgetHint: false,
    },
    medium: reviewLevel("medium"),
    high: {
      ...reviewLevel("high"),
      finderBudgetHint: true,
    },
    xhigh: {
      ...reviewLevel("xhigh"),
      finderBudgetHint: true,
    },
    max: {
      ...reviewLevel("max"),
      finderBudgetHint: true,
    },
  },
  "claude-opus-4-8": {
    low: {
      ...reviewLevel("o48-low-v1"),
      measuredExternal: true,
    },
    medium: {
      ...reviewLevel("o48-med-v1"),
      measuredExternal: true,
    },
    high: {
      ...reviewLevel("o48-high-v1"),
      measuredExternal: true,
    },
    xhigh: {
      ...reviewLevel("o48-xhigh-v1"),
      measuredExternal: true,
    },
    max: reviewLevel("max"),
  },
  "claude-opus-5": OPUS5_REVIEW_LEVELS,
};
//@ chunk-hantmvxa.js:78963-79059 placement
for (let e of Object.values(REVIEW_LEVEL_TABLE_BY_MODEL)) {
  for (let n of Object.values(e)) Object.freeze(n);
  Object.freeze(e);
}
//@ chunk-hantmvxa.js:79059-79077 placement
Object.freeze(REVIEW_LEVEL_TABLE_BY_MODEL);
//@ chunk-hantmvxa.js:79077-79156 placement
function resolveLevelEffort(e, n) {
  let s = REVIEW_LEVEL_TABLE_BY_MODEL[e][n];
  return s.modelEffort === "typed" ? n : s.modelEffort;
}
//@ chunk-hantmvxa.js:79156-79524 placement
function buildReviewPromptForLevel(cell, n, s = true, r = false, stated) {
  switch (cell) {
    case "low":
      return buildLowEffortPrompt(r, stated);
    case "low-sonnet5":
      return buildLowEffortInlinePrompt(r);
    case "medium":
      return buildMediumReviewPrompt(n, s, stated);
    case "high":
      return buildHighEffortPrompt(n, s, stated);
    case "xhigh":
      return buildXhighEffortPrompt(n, s, stated);
    case "max":
      return buildMaxEffortPrompt(n, s, stated);
    case "o48-low-v1":
      return REVIEW_REUSE_ANGLE_LOW_EFFORT(r, stated);
    case "o48-med-v1":
      return REVIEW_ANGLE_E(n, stated);
    case "o48-high-v1":
      return REVIEW_MINIMAL_PROMPT(n, stated);
    case "o48-xhigh-v1":
      return REVIEW_ANGLE_I(n, stated);
    case "o5-bmin":
      return buildMinimalReviewPrompt(stated);
  }
}
export {
  normalizeReviewModelKey,
  MODELS_WITH_MAX_CELL,
  REVIEW_LEVEL_TABLE_BY_MODEL,
  REVIEW_CELL_OVERRIDES,
  resolveLevelEffort,
  buildReviewPromptForLevel,
};
