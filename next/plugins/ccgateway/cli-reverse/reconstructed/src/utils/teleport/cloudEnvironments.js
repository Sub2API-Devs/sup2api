/**
 * utils/teleport/cloudEnvironments.ts
 *
 * 2.1.316 新增：云环境
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { int32Schema, objectSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isCcpoolId } from "./environmentSelection.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5xgkngpb.js:1959364-1959430 placement
/**
 * 解析环境 id（正整数品牌类型）。
 */
function parsedEnvironmentId(maxTurns) {
  return int32Schema().positive().brand().safeParse(maxTurns).data;
}
//@ chunk-5xgkngpb.js:1959430-1959557 placement
function acceptsMaxTurns(apiVersion, body, maxTurns) {
  let configShape = objectSchema({
    max_turns: literal(maxTurns),
  });
  return (
    apiVersion === "v1alpha2"
      ? objectSchema({
          config: configShape,
        })
      : objectSchema({
          session_context: configShape,
        })
  ).safeParse(body).success;
}
//@ chunk-5xgkngpb.js:1959557-1959580 placement
function noEnvironmentOverride(request) {
  return;
}
//@ chunk-5xgkngpb.js:1959580-1959737 placement
function parseEnvironmentSelector(selector) {
  let trimmed = selector.trim();
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
//@ chunk-5xgkngpb.js:1959737-1959881 placement
/**
 * 环境无法解析时的拒绝结果（需自托管 ccpool_ id）。
 */
async function environmentUnresolvedOutcome(environmentQuery, options, context) {
  return {
    ok: false,
    error: "--environment expects a self-hosted environment id (ccpool_...)",
    reason: "environment_unresolved",
  };
}
//@ chunk-5xgkngpb.js:1959881-1959916 placement
var TENGU_VIOLIN_FINGERBOARD = "tengu_violin_fingerboard";
//@ chunk-5xgkngpb.js:1959916-1959968 placement
function isTrustedRepositoriesHeaderEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_FINGERBOARD, false);
  } catch {
    return false;
  }
}
export {
  environmentUnresolvedOutcome,
  isTrustedRepositoriesHeaderEnabled,
  noEnvironmentOverride,
  acceptsMaxTurns,
  parsedEnvironmentId,
  parseEnvironmentSelector,
};
