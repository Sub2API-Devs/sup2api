/**
 * utils/collapseHookSummaries.ts
 *
 * hook 汇总附件的字段校验与合并（hookCount、hookInfos、hookErrors、stopReason 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/collapseHookSummaries.ts
 * pieces: chunk-ag5x7vhf.js (2), chunk-e6aww6q8.js (10)
 * attribution: fingerprint 2, placement 10
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, E, M } from "../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";

//@ chunk-e6aww6q8.js:329597-329917 placement
/**
 * hookInfos 数组项的校验 schema。
 */
var HOOK_SUMMARY_FIELDS = [
  "hookCount",
  "hookInfos",
  "hookErrors",
  "hookAdditionalContext",
  "preventedContinuation",
  "stopReason",
  "hookLabel",
  "totalDurationMs",
];
var hookInfosSchema = DoctorLazy(() =>
  u({
    command: string(),
    promptText: string().optional(),
    durationMs: E().optional(),
  }),
);
var hookErrorSchema = DoctorLazy(() => string());
var hookLabelSchema = DoctorLazy(() => string().min(1));
var hookCountSchema = DoctorLazy(() => E().int().nonnegative());
var totalDurationSchema = DoctorLazy(() => E());
var preventedContinuationSchema = DoctorLazy(() => M());
//@ chunk-e6aww6q8.js:329917-330797 placement = collapseHookSummaries (0.799)
/**
 * 校验 hook 汇总附件字段（hookCount、hookInfos、hookErrors、stopReason 等），丢弃非法值后重建对象。
 */
function normalizeHookSummary(messages) {
  if (collapseHookSummaries_2(messages))
    return {
      hookCount: messages.hookCount,
      hookInfos: messages.hookInfos,
      hookErrors: messages.hookErrors,
      ...(messages.hookAdditionalContext !== undefined && {
        hookAdditionalContext: messages.hookAdditionalContext,
      }),
      preventedContinuation: messages.preventedContinuation,
      ...(messages.stopReason !== undefined && {
        stopReason: messages.stopReason,
      }),
      ...(messages.hookLabel !== undefined && {
        hookLabel: messages.hookLabel,
      }),
      ...(messages.totalDurationMs !== undefined && {
        totalDurationMs: messages.totalDurationMs,
      }),
    };
  let n = filterValidArrayItems(messages.hookInfos, hookInfosSchema());
  let validHookLabel = getValidHookLabel(messages);
  return {
    hookCount: matchesSchema(messages.hookCount, hookCountSchema()) ? messages.hookCount : n.length,
    hookInfos: n,
    hookErrors: filterValidArrayItems(messages.hookErrors, hookErrorSchema()),
    ...(Array.isArray(messages.hookAdditionalContext) && {
      hookAdditionalContext: filterValidArrayItems(messages.hookAdditionalContext, hookErrorSchema()),
    }),
    preventedContinuation:
      matchesSchema(messages.preventedContinuation, preventedContinuationSchema()) &&
      messages.preventedContinuation,
    ...(matchesSchema(messages.stopReason, hookErrorSchema()) && {
      stopReason: messages.stopReason,
    }),
    ...(validHookLabel !== undefined && {
      hookLabel: validHookLabel,
    }),
    ...(matchesSchema(messages.totalDurationMs, totalDurationSchema()) && {
      totalDurationMs: messages.totalDurationMs,
    }),
  };
}
//@ chunk-e6aww6q8.js:330797-330861 placement
function getValidHookLabel(e) {
  return matchesSchema(e.hookLabel, hookLabelSchema()) ? e.hookLabel : undefined;
}
//@ chunk-e6aww6q8.js:330861-330897 placement
function getValidStringArray(e) {
  return filterValidArrayItems(e, hookErrorSchema());
}
//@ chunk-e6aww6q8.js:330897-330944 placement
function matchesSchema(e, n) {
  return n.safeParse(e).success;
}
//@ chunk-e6aww6q8.js:330944-331389 placement = collapseHookSummaries (0.762)
function collapseHookSummaries_2(messages) {
  let {
    hookCount,
    hookInfos,
    hookErrors,
    hookAdditionalContext,
    preventedContinuation,
    stopReason,
    hookLabel,
    totalDurationMs,
  } = messages;
  return (
    typeof hookCount === "number" &&
    Number.isSafeInteger(hookCount) &&
    hookCount >= 0 &&
    Array.isArray(hookInfos) &&
    hookInfos.every(isHookInfo) &&
    Array.isArray(hookErrors) &&
    hookErrors.every(isString) &&
    (hookAdditionalContext === undefined ||
      (Array.isArray(hookAdditionalContext) && hookAdditionalContext.every(isString))) &&
    typeof preventedContinuation === "boolean" &&
    (stopReason === undefined || typeof stopReason === "string") &&
    (hookLabel === undefined || (typeof hookLabel === "string" && hookLabel.length > 0)) &&
    (totalDurationMs === undefined || isFiniteNumber_2(totalDurationMs))
  );
}
//@ chunk-e6aww6q8.js:331389-331547 placement
function isHookInfo(e) {
  return (
    isPlainObject_5(e) &&
    typeof e.command === "string" &&
    (e.promptText === undefined || typeof e.promptText === "string") &&
    (e.durationMs === undefined || isFiniteNumber_2(e.durationMs))
  );
}
//@ chunk-e6aww6q8.js:331547-331590 placement
function isString(e) {
  return typeof e === "string";
}
//@ chunk-e6aww6q8.js:331590-331653 placement
function isFiniteNumber_2(e) {
  return typeof e === "number" && Number.isFinite(e);
}
//@ chunk-e6aww6q8.js:331653-331756 placement
/**
 * 非数组返回空数组；否则只保留通过 schema 校验的元素（全部合法时原样返回）。
 */
function filterValidArrayItems(e, n) {
  if (!Array.isArray(e)) return [];
  let r = e;
  let s = (h) => matchesSchema(h, n);
  return r.every(s) ? r : r.filter(s);
}
//@ chunk-ag5x7vhf.js:119609-119699 fingerprint = isLabeledHookSummary (0.773)
function isLabeledHookSummary(msg) {
  return msg.type === "system" && msg.subtype === "stop_hook_summary" && getValidHookLabel(msg) !== undefined;
}
//@ chunk-ag5x7vhf.js:119699-120290 fingerprint = collapseHookSummaries (0.853)
function collapseHookSummaries(messages) {
  let result = [];
  let i = 0;
  while (i < messages.length) {
    let msg = messages[i];
    if (isLabeledHookSummary(msg)) {
      let label = getValidHookLabel(msg);
      let _ = [];
      while (i < messages.length) {
        let next = messages[i];
        if (!isLabeledHookSummary(next) || getValidHookLabel(next) !== label) break;
        _.push(next);
        i++;
      }
      if (_.length === 1) result.push(msg);
      else {
        let mapped = _.map(normalizeHookSummary);
        result.push({
          ...msg,
          hookCount: mapped.reduce((sum, m) => sum + m.hookCount, 0),
          hookInfos: mapped.flatMap((m) => m.hookInfos),
          hookErrors: mapped.flatMap((m) => m.hookErrors),
          hookAdditionalContext: mapped.flatMap((D) => D.hookAdditionalContext ?? []),
          preventedContinuation: mapped.some((m) => m.preventedContinuation),
          hasOutput: _.some((m) => m.hasOutput),
          totalDurationMs: Math.max(...mapped.map((m) => m.totalDurationMs ?? 0)),
        });
      }
    } else {
      result.push(msg);
      i++;
    }
  }
  return result;
}
export {
  getValidHookLabel,
  collapseHookSummaries,
  getValidStringArray,
  normalizeHookSummary,
  isFiniteNumber_2,
  HOOK_SUMMARY_FIELDS,
};
