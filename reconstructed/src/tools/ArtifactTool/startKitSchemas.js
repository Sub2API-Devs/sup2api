/**
 * tools/ArtifactTool/startKitSchemas.ts
 *
 * 2.1.316 新增：Artifact 起步套件结构
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q0w816c5.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, E, M, array } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-q0w816c5.js:269-351 placement
/**
 * 初始参考页面条目的 schema（路径、正文、字数、是否截断）。
 */
var initReferenceDocSchema = DoctorLazy(() =>
  u({
    path: string(),
    text: string(),
    chars: E().int().min(0),
    clipped: M().optional(),
  }),
);
//@ chunk-q0w816c5.js:351-466 placement
function initReferencesSchema() {
  return {
    init_references: u({
      docs: array(initReferenceDocSchema()),
      unavailable: array(
        u({
          path: string(),
          why: string(),
        }),
      ).optional(),
    }).optional(),
  };
}
//@ chunk-q0w816c5.js:466-653 placement
function designSystemSchema() {
  return {
    design_system: u({
      url: string().optional(),
      default: string().optional(),
      title: string().optional(),
      store: M().optional(),
      docs: array(initReferenceDocSchema()).optional(),
      unavailable: string().optional(),
    }).optional(),
  };
}
//@ chunk-q0w816c5.js:653-900 placement
/**
 * 起步套件结构 schema（类型目录、设计系统、技能与 REPL 标记）。
 */
var startKitDirSchema = DoctorLazy(() =>
  u({
    dir: string(),
    files: array(
      u({
        path: string(),
        bytes: E(),
      }),
    ),
    skipped: array(
      u({
        path: string(),
        reason: string(),
      }),
    ),
  }),
);
var startKitSchema = DoctorLazy(() =>
  u({
    type: startKitDirSchema().optional(),
    system_url: string().optional(),
    system: startKitDirSchema().optional(),
    skill_in_result: M(),
    capabilities_skill: M(),
    repl_tool: M().optional(),
  }),
);
export { initReferencesSchema, designSystemSchema, startKitSchema };
