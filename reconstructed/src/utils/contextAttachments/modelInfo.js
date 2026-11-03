/**
 * utils/contextAttachments/modelInfo.ts
 *
 * 2.1.316 新增：模型信息上下文附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getCatalogEntry as getCatalogEntry_2 } from "../model/modelCatalog.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { getMarketingNameForModel } from "../model/model.js";

//@ chunk-e6aww6q8.js:105191-105341 placement
var ENV_INFO_MODEL = "env_info_model",
  fFe = DoctorLazy(() => u({ modelId: o(), marketingName: o().nullable(), knowledgeCutoff: o().nullable() })),
  Eio = DoctorLazy(() => o().nullable().optional());
//@ chunk-e6aww6q8.js:105341-105398 placement
function Rio(e) {
  return getCatalogEntry_2(getCanonicalName(e))?.knowledge_cutoff ?? null;
}
//@ chunk-e6aww6q8.js:105398-105481 placement
function Pkt(e) {
  return { modelId: e, marketingName: getMarketingNameForModel(e) ?? null, knowledgeCutoff: Rio(e) };
}

export { ENV_INFO_MODEL, Eio, fFe, Pkt };
