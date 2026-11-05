/**
 * types/ids.ts
 *
 * 2.1.316 新增：id 类型辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/ids.ts
 * pieces: chunk-5jk23f3v.js (2), chunk-5xgkngpb.js (2)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  create_2,
  create,
  create_25,
  create_16,
  create_26,
  create_3,
  create_15,
} from "../../vendor/zod/lib/index.mjs";
import { EFFORT_LEVELS } from "../utils/effort.js";
import { normalizeAgentIdOrNull } from "../utils/agentId.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5jk23f3v.js:191-216 placement
/**
 * 原样返回输入（某类 id 的占位校验）。
 */
function identityId(value) {
  return value;
}
//@ chunk-5jk23f3v.js:216-240 placement
/**
 * 原样返回输入（另一类 id 的占位校验）。
 */
function identityId2(client) {
  return client;
}
//@ chunk-5xgkngpb.js:134794-135142 placement
/**
 * 技能名与 forked 技能标记/作用域 schema。
 */
var SKILL_NAME_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FORKED_SKILL_MARKER_SCHEMA;
var FORKED_SKILL_SCOPING_SCHEMA;
deferInit("chunk-5xgkngpb.js:134794", () => {
  SKILL_NAME_SCHEMA = DoctorLazy(() =>
    create_2()
      .min(1)
      .max(256)
      .refine((skillName) => !/[\r\n]/.test(skillName), {
        message: "invalid skill name",
      }),
  );
  FORKED_SKILL_MARKER_SCHEMA = DoctorLazy(() =>
    create({
      forkedSkill: create_25(true),
      skillName: SKILL_NAME_SCHEMA().optional(),
    }),
  );
  FORKED_SKILL_SCOPING_SCHEMA = DoctorLazy(() => {
    let nameSchema = SKILL_NAME_SCHEMA();
    return create({
      skillName: nameSchema,
      attributionName: nameSchema,
      effort: create_16([create_26(EFFORT_LEVELS), create_3().int().min(1).max(1000)]).optional(),
      frozenCommandDenies: create_15(create_2().max(1024)).max(1000).optional(),
    });
  });
});
//@ chunk-5xgkngpb.js:135142-135297 placement
/**
 * 描述长度上限与 agent 技能引用 schema。
 */
var MAX_DESCRIPTION_LENGTH; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AGENT_SKILL_REF_SCHEMA;
deferInit("chunk-5xgkngpb.js:135142", () => {
  MAX_DESCRIPTION_LENGTH = 4096;
  AGENT_SKILL_REF_SCHEMA = DoctorLazy(() =>
    create({
      agentId: create_2()
        .min(1)
        .max(256)
        .refine((agentId) => normalizeAgentIdOrNull(agentId) !== null, {
          message: "invalid agentId",
        }),
      skillName: SKILL_NAME_SCHEMA(),
      description: create_2().max(MAX_DESCRIPTION_LENGTH),
    }),
  );
});
export {
  identityId,
  identityId2,
  MAX_DESCRIPTION_LENGTH,
  AGENT_SKILL_REF_SCHEMA,
  FORKED_SKILL_SCOPING_SCHEMA,
  FORKED_SKILL_MARKER_SCHEMA,
};
