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
import { Lt } from "../../utils/model/modelIds.js";
import { Vt, Kt, buildMediumReviewPrompt, Jt, Zt, to } from "./reviewPhases.js";
import { no, lo, co, ho, buildMinimalReviewPrompt } from "./cleanupAngles.js";

//@ chunk-hantmvxa.js:77878-77920 placement
function Is(e) {
  return Object.hasOwn(de, e);
}
//@ chunk-hantmvxa.js:77920-77988 placement
function Ae(e) {
  let n = e ? getCanonicalName(Lt(e)) : void 0;
  return n && Is(n) ? n : "default";
}
//@ chunk-hantmvxa.js:77988-78963 placement
var REVIEW_LEVEL_TABLE = { cell: "low", modelEffort: "typed", finderBudgetHint: !1 },
  F = (e) => ({ cell: e, modelEffort: "typed", finderBudgetHint: !1 }),
  Rs = new Set(["claude-opus-4-8", "claude-opus-5"]),
  Ls = { "claude-sonnet-5": "sonnet5", "claude-opus-4-8": "hc10" },
  po = {
    low: REVIEW_LEVEL_TABLE,
    medium: { ...F("o48-high-v1"), measuredExternal: !0 },
    high: { ...F("o48-high-v1"), measuredExternal: !0 },
    xhigh: { ...F("o48-xhigh-v1"), measuredExternal: !0 },
    max: F("max"),
  },
  Os = {
    ...po,
    medium: { ...F("o5-bmin"), measuredExternal: !0 },
    high: { ...F("o5-bmin"), measuredExternal: !0 },
  },
  de = {
    default: po,
    "claude-sonnet-5": {
      low: { cell: "low-sonnet5", modelEffort: "medium", finderBudgetHint: !1 },
      medium: F("medium"),
      high: { ...F("high"), finderBudgetHint: !0 },
      xhigh: { ...F("xhigh"), finderBudgetHint: !0 },
      max: { ...F("max"), finderBudgetHint: !0 },
    },
    "claude-opus-4-8": {
      low: { ...F("o48-low-v1"), measuredExternal: !0 },
      medium: { ...F("o48-med-v1"), measuredExternal: !0 },
      high: { ...F("o48-high-v1"), measuredExternal: !0 },
      xhigh: { ...F("o48-xhigh-v1"), measuredExternal: !0 },
      max: F("max"),
    },
    "claude-opus-5": Os,
  };
//@ chunk-hantmvxa.js:78963-79059 placement
for (let e of Object.values(de)) {
  for (let n of Object.values(e)) Object.freeze(n);
  Object.freeze(e);
}
//@ chunk-hantmvxa.js:79059-79077 placement
Object.freeze(de);
//@ chunk-hantmvxa.js:79077-79156 placement
function tt(e, n) {
  let s = de[e][n];
  return s.modelEffort === "typed" ? n : s.modelEffort;
}
//@ chunk-hantmvxa.js:79156-79524 placement
function buildReviewPromptForLevel(e, n, s = !0, r = !1, h) {
  switch (e) {
    case "low":
      return Vt(r, h);
    case "low-sonnet5":
      return Kt(r);
    case "medium":
      return buildMediumReviewPrompt(n, s, h);
    case "high":
      return Jt(n, s, h);
    case "xhigh":
      return Zt(n, s, h);
    case "max":
      return to(n, s, h);
    case "o48-low-v1":
      return no(r, h);
    case "o48-med-v1":
      return lo(n, h);
    case "o48-high-v1":
      return co(n, h);
    case "o48-xhigh-v1":
      return ho(n, h);
    case "o5-bmin":
      return buildMinimalReviewPrompt(h);
  }
}

export { Ae, Rs, de, Ls, tt, buildReviewPromptForLevel };
