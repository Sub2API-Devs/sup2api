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
import { u, o, E, M, A } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-q0w816c5.js:269-351 placement
var e = DoctorLazy(() => u({ path: o(), text: o(), chars: E().int().min(0), clipped: M().optional() }));
//@ chunk-q0w816c5.js:351-466 placement
function initReferencesSchema() {
  return {
    init_references: u({ docs: A(e()), unavailable: A(u({ path: o(), why: o() })).optional() }).optional(),
  };
}
//@ chunk-q0w816c5.js:466-653 placement
function designSystemSchema() {
  return {
    design_system: u({
      url: o().optional(),
      default: o().optional(),
      title: o().optional(),
      store: M().optional(),
      docs: A(e()).optional(),
      unavailable: o().optional(),
    }).optional(),
  };
}
//@ chunk-q0w816c5.js:653-900 placement
var startKitDirSchema = DoctorLazy(() =>
    u({ dir: o(), files: A(u({ path: o(), bytes: E() })), skipped: A(u({ path: o(), reason: o() })) }),
  ),
  SWn = DoctorLazy(() =>
    u({
      type: startKitDirSchema().optional(),
      system_url: o().optional(),
      system: startKitDirSchema().optional(),
      skill_in_result: M(),
      capabilities_skill: M(),
      repl_tool: M().optional(),
    }),
  );

export { initReferencesSchema, designSystemSchema, SWn };
