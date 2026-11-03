/**
 * services/teleport/relayMarker.ts
 *
 * 2.1.316 新增：teleport 中继标记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rr1dnehg.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../utils/slowOperations.js";

//@ chunk-rr1dnehg.js:563-598 placement
var _ = 1,
  UPGRADE_RELAY_MARKER = "upgrade_relay_marker";
//@ chunk-rr1dnehg.js:598-627 placement
function k(e) {
  return e === UPGRADE_RELAY_MARKER;
}
/**
 * UUID 正则、teleport 标记 schema 与大小上限。
 */
//@ chunk-rr1dnehg.js:627-932 placement
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  RELAY_MARKER_SCHEMA = DoctorLazy(() =>
    u({
      schema_version: E().int(),
      conversation_uuid: o().regex(UUID_RE),
      anchor_line_uuid: o().regex(UUID_RE),
      anthropic_version: o().regex(/^\d{4}-\d{2}-\d{2}$/),
      model: o().min(1).optional(),
      automation_tools: M()
        .optional()
        .catch(void 0),
    }),
  ),
  MAX_MARKER_BYTES = 16384;
/**
 * 解析 teleport 中继标记（大小、JSON、schema_version 范围、字段校验）。
 */
//@ chunk-rr1dnehg.js:932-1663 placement
function parseRelayMarker(e) {
  if (Buffer.byteLength(e, "utf8") > MAX_MARKER_BYTES)
    return { ok: !1, reason: `marker exceeds the ${MAX_MARKER_BYTES}-byte cap` };
  let i;
  try {
    i = jsonParse(e);
  } catch {
    return { ok: !1, reason: "marker is not valid JSON" };
  }
  let safeParse = u({ schema_version: E().int() }).loose().safeParse(i);
  if (!safeParse.success) return { ok: !1, reason: "marker has no integer schema_version" };
  if (safeParse.data.schema_version > _)
    return {
      ok: !1,
      reason: `marker schema_version ${safeParse.data.schema_version} exceeds this consumer's ceiling ${_}`,
    };
  if (safeParse.data.schema_version < 1)
    return {
      ok: !1,
      reason: `marker schema_version ${safeParse.data.schema_version} is below the producer's floor of 1`,
    };
  let safeParse_2 = RELAY_MARKER_SCHEMA().safeParse(i);
  if (!safeParse_2.success)
    return {
      ok: !1,
      reason: `marker shape invalid: ${safeParse_2.error.issues[0]?.message ?? "unknown issue"}`,
    };
  return { ok: !0, marker: safeParse_2.data };
}
/**
 * 种子 transcript 行的宽松 schema 与“未处于 inactive”拒绝结果。
 */
//@ chunk-rr1dnehg.js:1663-1854 placement
var SEED_LINE_SCHEMA = DoctorLazy(() =>
    u({
      type: o().optional(),
      subtype: o().optional(),
      uuid: o().optional(),
      content: o().optional(),
    }).loose(),
  ),
  NOT_INACTIVE_RESULT = { armed: !1, code: "latch_not_inactive", reason: "teleport state is not inactive" };

export { SEED_LINE_SCHEMA, NOT_INACTIVE_RESULT, k, parseRelayMarker, UPGRADE_RELAY_MARKER };
