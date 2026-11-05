/**
 * commands/goal/goalCommand.ts
 *
 * `/goal` 命令实现：查看、设置、清除目标条件并给出越界/校验文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fq92ancp.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  GOAL_RELAYED_MESSAGE,
  isGoalClearKeyword,
  clearSessionGoal,
  MAX_GOAL_CONDITION_CHARS,
  setSessionGoal,
  buildGoalSetMessage,
} from "./goal.js";
import { plural, getFirstLine } from "../../utils/stringUtils.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-fq92ancp.js:4108-4942 placement
/**
 * `/goal` 命令实现：查看当前目标、设置/清除目标条件，处理长度与非法条件。
 */
var goalCommand = async (argText, context) => {
  if (
    context.dispatchedOverBridge === true &&
    context.submissionVerifiedSlackHumanTurn === true &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_mellow_sunset", true)
  )
    return {
      type: "text",
      value: GOAL_RELAYED_MESSAGE,
    };
  let condition = argText.trim();
  if (condition === "") {
    let activeGoal = context.options.activeGoal;
    if (!activeGoal)
      return {
        type: "text",
        value: "No goal set. Usage: `/goal <condition>`",
      };
    let iterationsText =
      activeGoal.iterations === 0
        ? "not yet evaluated"
        : `${activeGoal.iterations} ${plural(activeGoal.iterations, "turn")}`;
    let lastCheckText = activeGoal.lastReason
      ? `
Last check: ${getFirstLine(activeGoal.lastReason.trim())}`
      : "";
    return {
      type: "text",
      value: `Goal active: ${activeGoal.condition} (${iterationsText})${lastCheckText}`,
    };
  }
  if (isGoalClearKeyword(condition)) {
    let cleared = clearSessionGoal(context);
    return {
      type: "text",
      value: cleared === null ? "No goal set" : `Goal cleared: ${cleared}`,
    };
  }
  if (condition.length > MAX_GOAL_CONDITION_CHARS) {
    logFeatureSad("goal_set", "too_long");
    return {
      type: "text",
      value: `Goal condition is limited to ${MAX_GOAL_CONDITION_CHARS} characters (got ${condition.length})`,
    };
  }
  let error = setSessionGoal(condition, context);
  if (error !== null)
    return {
      type: "text",
      value: error,
    };
  return {
    type: "query",
    value: `Goal set: ${condition}`,
    prompt: buildGoalSetMessage(condition),
  };
};
export { goalCommand };
