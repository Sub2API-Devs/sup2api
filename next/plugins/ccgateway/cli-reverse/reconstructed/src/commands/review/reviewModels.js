/**
 * commands/review/reviewModels.ts
 *
 * 2.1.316 新增：各审查等级使用的模型与代理数配置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ne2890fx.js (7)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:78052-78094 placement
function isKnownReviewModelKey(modelKey) {
  return Object.hasOwn(REVIEW_LEVEL_TABLE_BY_MODEL, modelKey);
}
//@ chunk-ne2890fx.js:78094-78162 placement
function normalizeReviewModelKey(model) {
  let canonical = model ? getCanonicalName(strip1mSuffix(model)) : undefined;
  return canonical && isKnownReviewModelKey(canonical) ? canonical : "default";
}
//@ chunk-ne2890fx.js:78162-79137 placement
/**
 * 按模型与 effort 档位查评审单元与 modelEffort 的映射表（default/sonnet5/opus4-8/opus5），含冻结。
 */
var REVIEW_LEVEL_TABLE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var reviewLevel;
var MODELS_WITH_MAX_CELL;
var REVIEW_CELL_OVERRIDES;
var DEFAULT_REVIEW_LEVELS;
var OPUS5_REVIEW_LEVELS;
var REVIEW_LEVEL_TABLE_BY_MODEL;
deferInit("chunk-ne2890fx.js:78162", () => {
  REVIEW_LEVEL_TABLE = {
    cell: "low",
    modelEffort: "typed",
    finderBudgetHint: false,
  };
  reviewLevel = (cell) => ({
    cell,
    modelEffort: "typed",
    finderBudgetHint: false,
  });
  MODELS_WITH_MAX_CELL = new Set(["claude-opus-4-8", "claude-opus-5"]);
  REVIEW_CELL_OVERRIDES = {
    "claude-sonnet-5": "sonnet5",
    "claude-opus-4-8": "hc10",
  };
  DEFAULT_REVIEW_LEVELS = {
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
  OPUS5_REVIEW_LEVELS = {
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
  REVIEW_LEVEL_TABLE_BY_MODEL = {
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
});
//@ chunk-ne2890fx.js:79137-79233 placement
// deferred: uses REVIEW_LEVEL_TABLE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ne2890fx.js:79137", () => {
  for (let byEffort of Object.values(REVIEW_LEVEL_TABLE_BY_MODEL)) {
    for (let entry of Object.values(byEffort)) Object.freeze(entry);
    Object.freeze(byEffort);
  }
});
//@ chunk-ne2890fx.js:79233-79251 placement
// deferred: uses REVIEW_LEVEL_TABLE of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ne2890fx.js:79233", () => {
  Object.freeze(REVIEW_LEVEL_TABLE_BY_MODEL);
});
//@ chunk-ne2890fx.js:79251-79330 placement
function resolveLevelEffort(modelKey, level) {
  let levelConfig = REVIEW_LEVEL_TABLE_BY_MODEL[modelKey][level];
  return levelConfig.modelEffort === "typed" ? level : levelConfig.modelEffort;
}
//@ chunk-ne2890fx.js:79330-79698 placement
function buildReviewPromptForLevel(cell, outputBuilder, canSpawn = true, hasReportTool = false, findingCap) {
  switch (cell) {
    case "low":
      return buildLowEffortPrompt(hasReportTool, findingCap);
    case "low-sonnet5":
      return buildLowEffortInlinePrompt(hasReportTool);
    case "medium":
      return buildMediumReviewPrompt(outputBuilder, canSpawn, findingCap);
    case "high":
      return buildHighEffortPrompt(outputBuilder, canSpawn, findingCap);
    case "xhigh":
      return buildXhighEffortPrompt(outputBuilder, canSpawn, findingCap);
    case "max":
      return buildMaxEffortPrompt(outputBuilder, canSpawn, findingCap);
    case "o48-low-v1":
      return REVIEW_REUSE_ANGLE_LOW_EFFORT(hasReportTool, findingCap);
    case "o48-med-v1":
      return REVIEW_ANGLE_E(outputBuilder, findingCap);
    case "o48-high-v1":
      return REVIEW_MINIMAL_PROMPT(outputBuilder, findingCap);
    case "o48-xhigh-v1":
      return REVIEW_ANGLE_I(outputBuilder, findingCap);
    case "o5-bmin":
      return buildMinimalReviewPrompt(findingCap);
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
