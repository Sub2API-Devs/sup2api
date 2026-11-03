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
import { u, o, E, M } from "../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";

//@ chunk-e6aww6q8.js:329597-329917 placement
var HOOK_SUMMARY_FIELDS = [
    "hookCount",
    "hookInfos",
    "hookErrors",
    "hookAdditionalContext",
    "preventedContinuation",
    "stopReason",
    "hookLabel",
    "totalDurationMs",
  ],
  Gfo = DoctorLazy(() => u({ command: o(), promptText: o().optional(), durationMs: E().optional() })),
  gce = DoctorLazy(() => o()),
  zfo = DoctorLazy(() => o().min(1)),
  qfo = DoctorLazy(() => E().int().nonnegative()),
  Kfo = DoctorLazy(() => E()),
  Vfo = DoctorLazy(() => M());
/**
 * 校验 hook 汇总附件字段（hookCount、hookInfos、hookErrors、stopReason 等），丢弃非法值后重建对象。
 */
//@ chunk-e6aww6q8.js:329917-330797 placement = collapseHookSummaries (0.799)
function normalizeHookSummary(messages) {
  if (collapseHookSummaries_2(messages))
    return {
      hookCount: messages.hookCount,
      hookInfos: messages.hookInfos,
      hookErrors: messages.hookErrors,
      ...(messages.hookAdditionalContext !== void 0 && {
        hookAdditionalContext: messages.hookAdditionalContext,
      }),
      preventedContinuation: messages.preventedContinuation,
      ...(messages.stopReason !== void 0 && { stopReason: messages.stopReason }),
      ...(messages.hookLabel !== void 0 && { hookLabel: messages.hookLabel }),
      ...(messages.totalDurationMs !== void 0 && { totalDurationMs: messages.totalDurationMs }),
    };
  let n = filterValidArrayItems(messages.hookInfos, Gfo()),
    r = getValidHookLabel(messages);
  return {
    hookCount: matchesSchema(messages.hookCount, qfo()) ? messages.hookCount : n.length,
    hookInfos: n,
    hookErrors: filterValidArrayItems(messages.hookErrors, gce()),
    ...(Array.isArray(messages.hookAdditionalContext) && {
      hookAdditionalContext: filterValidArrayItems(messages.hookAdditionalContext, gce()),
    }),
    preventedContinuation:
      matchesSchema(messages.preventedContinuation, Vfo()) && messages.preventedContinuation,
    ...(matchesSchema(messages.stopReason, gce()) && { stopReason: messages.stopReason }),
    ...(r !== void 0 && { hookLabel: r }),
    ...(matchesSchema(messages.totalDurationMs, Kfo()) && { totalDurationMs: messages.totalDurationMs }),
  };
}
//@ chunk-e6aww6q8.js:330797-330861 placement
function getValidHookLabel(e) {
  return matchesSchema(e.hookLabel, zfo()) ? e.hookLabel : void 0;
}
//@ chunk-e6aww6q8.js:330861-330897 placement
function getValidStringArray(e) {
  return filterValidArrayItems(e, gce());
}
//@ chunk-e6aww6q8.js:330897-330944 placement
function matchesSchema(e, n) {
  return n.safeParse(e).success;
}
//@ chunk-e6aww6q8.js:330944-331389 placement = collapseHookSummaries (0.762)
function collapseHookSummaries_2(messages) {
  let {
    hookCount: hookCount,
    hookInfos: hookInfos,
    hookErrors: hookErrors,
    hookAdditionalContext: hookAdditionalContext,
    preventedContinuation: preventedContinuation,
    stopReason: stopReason,
    hookLabel: hookLabel,
    totalDurationMs: totalDurationMs,
  } = messages;
  return (
    typeof hookCount === "number" &&
    Number.isSafeInteger(hookCount) &&
    hookCount >= 0 &&
    Array.isArray(hookInfos) &&
    hookInfos.every(isHookInfo) &&
    Array.isArray(hookErrors) &&
    hookErrors.every(isString) &&
    (hookAdditionalContext === void 0 ||
      (Array.isArray(hookAdditionalContext) && hookAdditionalContext.every(isString))) &&
    typeof preventedContinuation === "boolean" &&
    (stopReason === void 0 || typeof stopReason === "string") &&
    (hookLabel === void 0 || (typeof hookLabel === "string" && hookLabel.length > 0)) &&
    (totalDurationMs === void 0 || isFiniteNumber(totalDurationMs))
  );
}
//@ chunk-e6aww6q8.js:331389-331547 placement
function isHookInfo(e) {
  return (
    isPlainObject_4(e) &&
    typeof e.command === "string" &&
    (e.promptText === void 0 || typeof e.promptText === "string") &&
    (e.durationMs === void 0 || isFiniteNumber(e.durationMs))
  );
}
//@ chunk-e6aww6q8.js:331547-331590 placement
function isString(e) {
  return typeof e === "string";
}
//@ chunk-e6aww6q8.js:331590-331653 placement
function isFiniteNumber(e) {
  return typeof e === "number" && Number.isFinite(e);
}
/**
 * 非数组返回空数组；否则只保留通过 schema 校验的元素（全部合法时原样返回）。
 */
//@ chunk-e6aww6q8.js:331653-331756 placement
function filterValidArrayItems(e, n) {
  if (!Array.isArray(e)) return [];
  let r = e,
    s = (h) => matchesSchema(h, n);
  return r.every(s) ? r : r.filter(s);
}
//@ chunk-ag5x7vhf.js:119609-119699 fingerprint = isLabeledHookSummary (0.773)
function isLabeledHookSummary(msg) {
  return msg.type === "system" && msg.subtype === "stop_hook_summary" && getValidHookLabel(msg) !== void 0;
}
//@ chunk-ag5x7vhf.js:119699-120290 fingerprint = collapseHookSummaries (0.853)
function collapseHookSummaries(messages) {
  let h = [],
    x = 0;
  while (x < messages.length) {
    let T = messages[x];
    if (isLabeledHookSummary(T)) {
      let k = getValidHookLabel(T),
        _ = [];
      while (x < messages.length) {
        let I = messages[x];
        if (!isLabeledHookSummary(I) || getValidHookLabel(I) !== k) break;
        (_.push(I), x++);
      }
      if (_.length === 1) h.push(T);
      else {
        let mapped = _.map(normalizeHookSummary);
        h.push({
          ...T,
          hookCount: mapped.reduce((sum, A) => sum + A.hookCount, 0),
          hookInfos: mapped.flatMap((D) => D.hookInfos),
          hookErrors: mapped.flatMap((D) => D.hookErrors),
          hookAdditionalContext: mapped.flatMap((D) => D.hookAdditionalContext ?? []),
          preventedContinuation: mapped.some((D) => D.preventedContinuation),
          hasOutput: _.some((D) => D.hasOutput),
          totalDurationMs: Math.max(...mapped.map((D) => D.totalDurationMs ?? 0)),
        });
      }
    } else (h.push(T), x++);
  }
  return h;
}

export {
  getValidHookLabel,
  collapseHookSummaries,
  getValidStringArray,
  normalizeHookSummary,
  isFiniteNumber,
  HOOK_SUMMARY_FIELDS,
};
