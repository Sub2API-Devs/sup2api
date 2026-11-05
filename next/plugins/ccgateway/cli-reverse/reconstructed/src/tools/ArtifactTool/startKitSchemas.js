/**
 * tools/ArtifactTool/startKitSchemas.ts
 *
 * 2.1.316 新增：Artifact 起步套件结构
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-azrvbw2f.js (4)
 * attribution: placement 4
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
  array,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-azrvbw2f.js:269-351 placement
/**
 * 初始参考页面条目的 schema（路径、正文、字数、是否截断）。
 */
var initReferenceDocSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-azrvbw2f.js:269", () => {
  initReferenceDocSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      text: stringSchema(),
      chars: numberSchema().int().min(0),
      clipped: booleanSchema().optional(),
    }),
  );
});
//@ chunk-azrvbw2f.js:351-466 placement
function initReferencesSchema() {
  return {
    init_references: objectSchema({
      docs: array(initReferenceDocSchema()),
      unavailable: array(
        objectSchema({
          path: stringSchema(),
          why: stringSchema(),
        }),
      ).optional(),
    }).optional(),
  };
}
//@ chunk-azrvbw2f.js:466-653 placement
function designSystemSchema() {
  return {
    design_system: objectSchema({
      url: stringSchema().optional(),
      default: stringSchema().optional(),
      title: stringSchema().optional(),
      store: booleanSchema().optional(),
      docs: array(initReferenceDocSchema()).optional(),
      unavailable: stringSchema().optional(),
    }).optional(),
  };
}
//@ chunk-azrvbw2f.js:653-900 placement
/**
 * 起步套件结构 schema（类型目录、设计系统、技能与 REPL 标记）。
 */
var startKitDirSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var startKitSchema;
deferInit("chunk-azrvbw2f.js:653", () => {
  startKitDirSchema = DoctorLazy(() =>
    objectSchema({
      dir: stringSchema(),
      files: array(
        objectSchema({
          path: stringSchema(),
          bytes: numberSchema(),
        }),
      ),
      skipped: array(
        objectSchema({
          path: stringSchema(),
          reason: stringSchema(),
        }),
      ),
    }),
  );
  startKitSchema = DoctorLazy(() =>
    objectSchema({
      type: startKitDirSchema().optional(),
      system_url: stringSchema().optional(),
      system: startKitDirSchema().optional(),
      skill_in_result: booleanSchema(),
      capabilities_skill: booleanSchema(),
      repl_tool: booleanSchema().optional(),
    }),
  );
});
export { initReferencesSchema, designSystemSchema, startKitSchema };
