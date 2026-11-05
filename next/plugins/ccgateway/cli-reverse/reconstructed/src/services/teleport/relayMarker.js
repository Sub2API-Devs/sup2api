/**
 * services/teleport/relayMarker.ts
 *
 * 2.1.316 新增：teleport 中继标记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2yn1payk.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";

//@ chunk-2yn1payk.js:563-598 placement
var RELAY_MARKER_MAX_SCHEMA_VERSION = 1;
var UPGRADE_RELAY_MARKER = "upgrade_relay_marker";
//@ chunk-2yn1payk.js:598-627 placement
/**
 * 判断某个值是否就是「升级中继」标记。
 */
function isUpgradeRelayMarker(subtype) {
  return subtype === UPGRADE_RELAY_MARKER;
}
//@ chunk-2yn1payk.js:627-932 placement
/**
 * UUID 正则、teleport 标记 schema 与大小上限。
 */
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var RELAY_MARKER_SCHEMA = DoctorLazy(() =>
  objectSchema({
    schema_version: numberSchema().int(),
    conversation_uuid: stringSchema().regex(UUID_RE),
    anchor_line_uuid: stringSchema().regex(UUID_RE),
    anthropic_version: stringSchema().regex(/^\d{4}-\d{2}-\d{2}$/),
    model: stringSchema().min(1).optional(),
    automation_tools: booleanSchema().optional().catch(undefined),
  }),
);
var MAX_MARKER_BYTES = 16384;
//@ chunk-2yn1payk.js:932-1663 placement
/**
 * 解析 teleport 中继标记（大小、JSON、schema_version 范围、字段校验）。
 */
function parseRelayMarker(rawMarker) {
  if (Buffer.byteLength(rawMarker, "utf8") > MAX_MARKER_BYTES)
    return {
      ok: false,
      reason: `marker exceeds the ${MAX_MARKER_BYTES}-byte cap`,
    };
  let parsed;
  try {
    parsed = jsonParse(rawMarker);
  } catch {
    return {
      ok: false,
      reason: "marker is not valid JSON",
    };
  }
  let versionResult = objectSchema({
    schema_version: numberSchema().int(),
  })
    .loose()
    .safeParse(parsed);
  if (!versionResult.success)
    return {
      ok: false,
      reason: "marker has no integer schema_version",
    };
  if (versionResult.data.schema_version > RELAY_MARKER_MAX_SCHEMA_VERSION)
    return {
      ok: false,
      reason: `marker schema_version ${versionResult.data.schema_version} exceeds this consumer's ceiling ${RELAY_MARKER_MAX_SCHEMA_VERSION}`,
    };
  if (versionResult.data.schema_version < 1)
    return {
      ok: false,
      reason: `marker schema_version ${versionResult.data.schema_version} is below the producer's floor of 1`,
    };
  let schemaResult = RELAY_MARKER_SCHEMA().safeParse(parsed);
  if (!schemaResult.success)
    return {
      ok: false,
      reason: `marker shape invalid: ${schemaResult.error.issues[0]?.message ?? "unknown issue"}`,
    };
  return {
    ok: true,
    marker: schemaResult.data,
  };
}
//@ chunk-2yn1payk.js:1663-1854 placement
/**
 * 种子 transcript 行的宽松 schema 与“未处于 inactive”拒绝结果。
 */
var SEED_LINE_SCHEMA = DoctorLazy(() =>
  objectSchema({
    type: stringSchema().optional(),
    subtype: stringSchema().optional(),
    uuid: stringSchema().optional(),
    content: stringSchema().optional(),
  }).loose(),
);
var NOT_INACTIVE_RESULT = {
  armed: false,
  code: "latch_not_inactive",
  reason: "teleport state is not inactive",
};
export {
  SEED_LINE_SCHEMA,
  NOT_INACTIVE_RESULT,
  isUpgradeRelayMarker,
  parseRelayMarker,
  UPGRADE_RELAY_MARKER,
};
