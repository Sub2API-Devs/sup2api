/**
 * utils/teleport/cloudEnvironments.ts
 *
 * 2.1.316 新增：云环境
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { wIi, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isCcpoolId } from "./environmentSelection.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:1880538-1880604 placement
/**
 * 解析环境 id（正整数品牌类型）。
 */
function parsedEnvironmentId(maxTurns) {
  return wIi().positive().brand().safeParse(maxTurns).data;
}
//@ chunk-e6aww6q8.js:1880604-1880731 placement
function acceptsMaxTurns(e, n, maxTurns) {
  let s = u({
    max_turns: literal(maxTurns),
  });
  return (
    e === "v1alpha2"
      ? u({
          config: s,
        })
      : u({
          session_context: s,
        })
  ).safeParse(n).success;
}
//@ chunk-e6aww6q8.js:1880731-1880754 placement
function noEnvironmentOverride(e) {
  return;
}
//@ chunk-e6aww6q8.js:1880754-1880912 placement
function parseEnvironmentSelector(e) {
  let trimmed = e.trim();
  if (trimmed === "") return null;
  if (isCcpoolId(trimmed))
    return {
      kind: "pool",
      poolId: trimmed,
    };
  return trimmed.startsWith("env_")
    ? {
        kind: "id",
        id: trimmed,
      }
    : {
        kind: "name",
        name: trimmed,
      };
}
//@ chunk-e6aww6q8.js:1880912-1881056 placement
/**
 * 环境无法解析时的拒绝结果（需自托管 ccpool_ id）。
 */
async function environmentUnresolvedOutcome(environmentQuery, n, r) {
  return {
    ok: false,
    error: "--environment expects a self-hosted environment id (ccpool_...)",
    reason: "environment_unresolved",
  };
}
//@ chunk-e6aww6q8.js:1881056-1881091 placement
var TENGU_VIOLIN_FINGERBOARD = "tengu_violin_fingerboard";
//@ chunk-e6aww6q8.js:1881091-1881143 placement
function isTrustedRepositoriesHeaderEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_FINGERBOARD, false);
  } catch {
    return false;
  }
}
export {
  environmentUnresolvedOutcome,
  noEnvironmentOverride,
  acceptsMaxTurns,
  parsedEnvironmentId,
  parseEnvironmentSelector,
  isTrustedRepositoriesHeaderEnabled,
};
