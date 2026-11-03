/**
 * types/ids.ts
 *
 * 2.1.316 新增：id 类型辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/ids.ts
 * pieces: chunk-1sq3634h.js (2), chunk-e6aww6q8.js (2)
 * attribution: placement 4
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
import { Um } from "../utils/agentId.js";

//@ chunk-1sq3634h.js:191-216 placement
function GPn(e) {
  return e;
}
//@ chunk-1sq3634h.js:216-240 placement
function oa(e) {
  return e;
}
/**
 * 技能名与 forked 技能标记/作用域 schema。
 */
//@ chunk-e6aww6q8.js:128044-128392 placement
var SKILL_NAME_SCHEMA = DoctorLazy(() =>
    create_2()
      .min(1)
      .max(256)
      .refine((e) => !/[\r\n]/.test(e), { message: "invalid skill name" }),
  ),
  FORKED_SKILL_MARKER_SCHEMA = DoctorLazy(() =>
    create({ forkedSkill: create_25(!0), skillName: SKILL_NAME_SCHEMA().optional() }),
  ),
  FORKED_SKILL_SCOPING_SCHEMA = DoctorLazy(() => {
    let e = SKILL_NAME_SCHEMA();
    return create({
      skillName: e,
      attributionName: e,
      effort: create_16([create_26(EFFORT_LEVELS), create_3().int().min(1).max(1000)]).optional(),
      frozenCommandDenies: create_15(create_2().max(1024)).max(1000).optional(),
    });
  });
/**
 * 描述长度上限与 agent 技能引用 schema。
 */
//@ chunk-e6aww6q8.js:128392-128547 placement
var MAX_DESCRIPTION_LENGTH = 4096,
  AGENT_SKILL_REF_SCHEMA = DoctorLazy(() =>
    create({
      agentId: create_2()
        .min(1)
        .max(256)
        .refine((e) => Um(e) !== null, { message: "invalid agentId" }),
      skillName: SKILL_NAME_SCHEMA(),
      description: create_2().max(MAX_DESCRIPTION_LENGTH),
    }),
  );

export {
  FORKED_SKILL_SCOPING_SCHEMA,
  GPn,
  oa,
  MAX_DESCRIPTION_LENGTH,
  AGENT_SKILL_REF_SCHEMA,
  FORKED_SKILL_MARKER_SCHEMA,
};
